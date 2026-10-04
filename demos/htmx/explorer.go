package main

import (
	"math"
	"net/http"
	"runtime/metrics"
	"slices"
	"strings"
)

const defaultMetric = "/sched/latencies:seconds"

// segment is a run of text that did or didn't match the query, so the
// template can wrap hits in <mark> without building HTML strings.
type segment struct {
	Text string
	Hit  bool
}

type result struct {
	Name []segment
	Raw  string
	Kind string
	Desc string
}

type searchData struct {
	Query   string
	Results []result
	Total   int
	More    int
	All     int
}

const maxResults = 8

func search(q string) searchData {
	terms := strings.Fields(strings.ToLower(q))
	names := make([]string, 0, len(catalog))
	for name := range catalog {
		names = append(names, name)
	}
	slices.Sort(names)

	sd := searchData{Query: q, All: len(catalog)}
	for _, name := range names {
		d := catalog[name]
		hay := strings.ToLower(name + " " + d.Description)
		if !all(terms, func(t string) bool { return strings.Contains(hay, t) }) {
			continue
		}
		sd.Total++
		if len(sd.Results) < maxResults {
			sd.Results = append(sd.Results, result{highlight(name, terms), name, kind(d), d.Description})
		}
	}
	sd.More = sd.Total - len(sd.Results)
	return sd
}

func all[T any](xs []T, f func(T) bool) bool {
	for _, x := range xs {
		if !f(x) {
			return false
		}
	}
	return true
}

func highlight(s string, terms []string) []segment {
	lower := strings.ToLower(s)
	hit := make([]bool, len(s))
	for _, t := range terms {
		for i := 0; ; {
			j := strings.Index(lower[i:], t)
			if j < 0 {
				break
			}
			for k := i + j; k < i+j+len(t); k++ {
				hit[k] = true
			}
			i += j + 1
		}
	}
	var segs []segment
	for i := range s {
		if len(segs) == 0 || segs[len(segs)-1].Hit != hit[i] {
			segs = append(segs, segment{Hit: hit[i]})
		}
		segs[len(segs)-1].Text += s[i : i+1]
	}
	return segs
}

func kind(d metrics.Description) string {
	switch {
	case d.Kind == metrics.KindFloat64Histogram:
		return "histogram"
	case d.Cumulative:
		return "counter"
	}
	return "gauge"
}

func (s *server) metricSearch(w http.ResponseWriter, r *http.Request) {
	s.render(w, "results", search(r.FormValue("q")))
}

type bar struct {
	X, Y, W, H float64
}

type metricView struct {
	Name, Unit, Kind, Desc string
	Spark                  spark
	Bars                   []bar
	Low, High              string
	Quantiles              []quantile
	Count                  string
}

type quantile struct {
	Label, Value string
}

const histW, histH, maxBars = 1000, 300, 60

func (s *sampler) view(name string) metricView {
	d, ok := catalog[name]
	if !ok {
		return metricView{Name: name, Desc: "No such metric."}
	}
	v := metricView{Name: name, Unit: unitOf(name), Kind: kind(d), Desc: d.Description}
	if d.Kind != metrics.KindFloat64Histogram {
		v.Spark = sparkline(s.series(name), v.Unit+cond(d.Cumulative, "/s", ""), histW, histH)
		return v
	}
	h := s.histogram(name)
	if h == nil {
		return v
	}
	var total uint64
	first, last := -1, -1
	for i, c := range h.Counts {
		total += c
		if c > 0 {
			first = cond(first < 0, i, first)
			last = i
		}
	}
	v.Count = si(float64(total)) + " samples"
	if total == 0 {
		return v
	}

	// Merge the occupied bucket range into at most maxBars bars.
	counts := h.Counts[first : last+1]
	per := (len(counts) + maxBars - 1) / maxBars
	var merged []uint64
	for i := 0; i < len(counts); i += per {
		var sum uint64
		for _, c := range counts[i:min(i+per, len(counts))] {
			sum += c
		}
		merged = append(merged, sum)
	}
	top := float64(slices.Max(merged))
	w := float64(histW) / float64(len(merged))
	for i, c := range merged {
		bh := float64(c) / top * histH
		v.Bars = append(v.Bars, bar{X: float64(i) * w, Y: histH - bh, W: math.Max(w-2, 1), H: bh})
	}
	v.Low = format(finite(h.Buckets[first], h.Buckets[first+1]), v.Unit)
	v.High = format(finite(h.Buckets[last+1], h.Buckets[last]), v.Unit)
	for _, q := range []struct {
		label string
		q     float64
	}{{"p50", 0.5}, {"p90", 0.9}, {"p99", 0.99}} {
		v.Quantiles = append(v.Quantiles, quantile{q.label, format(quantileOf(h, total, q.q), v.Unit)})
	}
	return v
}

// quantileOf returns the upper bound of the bucket holding the q-th sample.
func quantileOf(h *metrics.Float64Histogram, total uint64, q float64) float64 {
	want := uint64(math.Ceil(q * float64(total)))
	var cum uint64
	for i, c := range h.Counts {
		cum += c
		if cum >= want {
			return finite(h.Buckets[i+1], h.Buckets[i])
		}
	}
	return 0
}

func finite(v, fallback float64) float64 {
	return cond(math.IsInf(v, 0), fallback, v)
}

func (s *server) metricView(w http.ResponseWriter, r *http.Request) {
	s.render(w, "view", s.sampler.view(r.FormValue("name")))
}
