package main

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

var benchSizes = []int{100, 1_000, 10_000, 100_000}

type benchRow struct {
	ID      int
	Host    string
	Latency time.Duration
	OK      bool
}

type benchResult struct {
	Rows        string
	Took        time.Duration
	Bytes, Gzip string
	PerRow      string
	Width       float64
}

type counter int

func (c *counter) Write(p []byte) (int, error) {
	*c += counter(len(p))
	return len(p), nil
}

// bench renders a table of n rows through html/template, with full
// contextual escaping, once per size up to the deck's current step.
func (s *server) bench(w http.ResponseWriter, r *http.Request) {
	step, _ := strconv.Atoi(r.FormValue("step"))
	step = min(max(step, 0), len(benchSizes))

	results := make([]benchResult, 0, step)
	for _, n := range benchSizes[:step] {
		rows := make([]benchRow, n)
		for i := range rows {
			rows[i] = benchRow{i, fmt.Sprintf("edge-%03d.example", i%997), time.Duration(i%250) * time.Millisecond, i%17 != 0}
		}
		var html bytes.Buffer
		start := time.Now()
		if err := s.tmpl.ExecuteTemplate(&html, "bench-table", rows); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		took := time.Since(start)
		var zipped counter
		gz := gzip.NewWriter(&zipped)
		raw := html.Len()
		html.WriteTo(gz)
		gz.Close()
		results = append(results, benchResult{
			Rows:   si(float64(n)),
			Took:   took.Round(time.Microsecond),
			Bytes:  iec(float64(raw)),
			Gzip:   iec(float64(zipped)),
			PerRow: duration(took.Seconds() / float64(n)),
		})
	}
	var slowest time.Duration
	for _, res := range results {
		slowest = max(slowest, res.Took)
	}
	for i := range results {
		results[i].Width = 100 * float64(results[i].Took) / float64(slowest)
	}
	s.render(w, "bench", results)
}
