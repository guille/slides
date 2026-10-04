package main

import (
	"fmt"
	"math"
	"runtime/metrics"
	"slices"
	"strings"
	"sync"
	"time"
)

const history = 60

var catalog = func() map[string]metrics.Description {
	m := map[string]metrics.Description{}
	for _, d := range metrics.All() {
		m[d.Name] = d
	}
	return m
}()

// sampler reads every runtime metric on a fixed tick and keeps a short
// history, so any fragment can draw a chart without asking the client.
type sampler struct {
	every   time.Duration
	mu      sync.Mutex
	samples []metrics.Sample
	at      []time.Time          // ring of sample times, oldest first
	scalars map[string][]float64 // ring of raw values per metric
	hists   map[string]*metrics.Float64Histogram
}

func newSampler(every time.Duration) *sampler {
	s := &sampler{every: every, scalars: map[string][]float64{}, hists: map[string]*metrics.Float64Histogram{}}
	for name := range catalog {
		s.samples = append(s.samples, metrics.Sample{Name: name})
	}
	s.sample()
	return s
}

func (s *sampler) run() {
	for range time.Tick(s.every) {
		s.sample()
	}
}

func (s *sampler) sample() {
	s.mu.Lock()
	defer s.mu.Unlock()
	metrics.Read(s.samples)
	s.at = keep(append(s.at, time.Now()))
	for _, sm := range s.samples {
		switch sm.Value.Kind() {
		case metrics.KindUint64:
			s.scalars[sm.Name] = keep(append(s.scalars[sm.Name], float64(sm.Value.Uint64())))
		case metrics.KindFloat64:
			s.scalars[sm.Name] = keep(append(s.scalars[sm.Name], sm.Value.Float64()))
		case metrics.KindFloat64Histogram:
			h := sm.Value.Float64Histogram()
			s.hists[sm.Name] = &metrics.Float64Histogram{Counts: slices.Clone(h.Counts), Buckets: h.Buckets}
		}
	}
}

func keep[T any](s []T) []T {
	if len(s) > history {
		return s[len(s)-history:]
	}
	return s
}

// series returns a metric's recent values. Cumulative metrics come back as
// per-second rates, which is what a chart of them should show.
func (s *sampler) series(name string) []float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	raw := s.scalars[name]
	if !catalog[name].Cumulative {
		return slices.Clone(raw)
	}
	at := s.at[len(s.at)-len(raw):]
	rates := make([]float64, 0, len(raw))
	for i := 1; i < len(raw); i++ {
		rates = append(rates, (raw[i]-raw[i-1])/at[i].Sub(at[i-1]).Seconds())
	}
	return rates
}

func (s *sampler) raw(name string) []float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.scalars[name])
}

func (s *sampler) histogram(name string) *metrics.Float64Histogram {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.hists[name]
}

// spark is a sparkline already projected into a W×H viewBox. The template
// only draws it.
type spark struct {
	W, H       int
	Line, Area string
	Value, Max string
	Empty      bool
}

func sparkline(values []float64, unit string, w, h int) spark {
	sp := spark{W: w, H: h, Empty: len(values) < 2}
	if sp.Empty {
		return sp
	}
	// Scale between the series' own extremes, so a counter's staircase or
	// a small wobble is visible.
	lo, top := slices.Min(values), slices.Max(values)
	span := cond(top > lo, top-lo, 1)
	// A fixed history width, so a young series grows in from the right.
	step := float64(w) / float64(history-1)
	x0 := float64(w) - step*float64(len(values)-1)
	var b strings.Builder
	for i, v := range values {
		y := float64(h) - (v-lo)/span*float64(h)*0.9
		fmt.Fprintf(&b, "%s%.1f,%.1f", cond(i == 0, "M", " L"), x0+step*float64(i), y)
	}
	sp.Line = b.String()
	sp.Area = fmt.Sprintf("%s L%d,%d L%.1f,%d Z", sp.Line, w, h, x0, h)
	sp.Value = format(values[len(values)-1], unit)
	sp.Max = format(top, unit)
	return sp
}

func cond[T any](c bool, a, b T) T {
	if c {
		return a
	}
	return b
}

// format renders a metric value for humans, using the unit suffix from the
// metric's name ("/gc/heap/allocs:bytes").
func format(v float64, unit string) string {
	switch unit {
	case "bytes", "bytes/s":
		return iec(v) + strings.TrimPrefix(unit, "bytes")
	case "seconds", "seconds/s":
		return duration(v) + strings.TrimPrefix(unit, "seconds")
	}
	return si(v) + cond(unit == "", "", " "+unit)
}

func iec(v float64) string {
	units := []string{"B", "KiB", "MiB", "GiB", "TiB"}
	i := 0
	for math.Abs(v) >= 1024 && i < len(units)-1 {
		v /= 1024
		i++
	}
	return trim(v) + " " + units[i]
}

func si(v float64) string {
	units := []string{"", "k", "M", "G", "T"}
	i := 0
	for math.Abs(v) >= 1000 && i < len(units)-1 {
		v /= 1000
		i++
	}
	return trim(v) + units[i]
}

func duration(sec float64) string {
	switch a := math.Abs(sec); {
	case a == 0:
		return "0 s"
	case a < 1e-6:
		return trim(sec*1e9) + " ns"
	case a < 1e-3:
		return trim(sec*1e6) + " µs"
	case a < 1:
		return trim(sec*1e3) + " ms"
	}
	return trim(sec) + " s"
}

// trim keeps three significant digits: 1.23, 12.3, 123.
func trim(v float64) string {
	switch a := math.Abs(v); {
	case a == math.Trunc(a) || a >= 100:
		return fmt.Sprintf("%.0f", v)
	case a < 0.01:
		return fmt.Sprintf("%.2g", v)
	case a >= 10:
		return fmt.Sprintf("%.1f", v)
	}
	return fmt.Sprintf("%.2f", v)
}

func unitOf(name string) string {
	_, unit, _ := strings.Cut(name, ":")
	return unit
}
