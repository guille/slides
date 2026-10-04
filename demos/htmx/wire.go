package main

import (
	"bytes"
	"cmp"
	"html/template"
	"log"
	"net/http"
	"slices"
	"sync"
	"time"
)

type exchange struct {
	Method string
	Path   string
	Status int
	Bytes  int
	Took   time.Duration
}

// wire records every htmx exchange and reports the latest one back to the
// page in the same response.
type wire struct {
	mu  sync.Mutex
	log []exchange
}

type recorder struct {
	http.ResponseWriter
	buf    bytes.Buffer
	status int
}

func (r *recorder) WriteHeader(status int)      { r.status = status }
func (r *recorder) Write(p []byte) (int, error) { return r.buf.Write(p) }

// tap buffers the fragment, measures it, then appends an out-of-band swap
// that updates the #wire readout wherever it sits on the page.
func (wr *wire) tap(tmpl *template.Template, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &recorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(rec, r)
		took := time.Since(start)
		ex := exchange{r.Method, r.URL.Path, rec.status, rec.buf.Len(), took}

		total := wr.record(ex, r.Header.Get("Deck-Mode") != "main")
		w.WriteHeader(rec.status)
		rec.buf.WriteTo(w)
		data := map[string]any{"Last": ex, "Total": total}
		if err := tmpl.ExecuteTemplate(w, "wire", data); err != nil {
			log.Printf("wire: %v", err)
		}
	})
}

func (wr *wire) record(ex exchange, offstage bool) int {
	wr.mu.Lock()
	defer wr.mu.Unlock()
	if !offstage {
		wr.log = append(wr.log, ex)
	}
	return len(wr.log)
}

type endpoint struct {
	Route  string
	Count  int
	Bytes  int
	Median time.Duration
}

type receipt struct {
	Requests  int
	Bytes     int
	Median    time.Duration
	Slowest   exchange
	Endpoints []endpoint
	Since     time.Time
}

func (wr *wire) receipt() receipt {
	wr.mu.Lock()
	log := slices.Clone(wr.log)
	wr.mu.Unlock()

	rc := receipt{Requests: len(log), Since: started}
	byRoute := map[string][]exchange{}
	for _, ex := range log {
		rc.Bytes += ex.Bytes
		if ex.Took > rc.Slowest.Took {
			rc.Slowest = ex
		}
		route := ex.Method + " " + ex.Path
		byRoute[route] = append(byRoute[route], ex)
	}
	rc.Median = median(log)
	for route, exs := range byRoute {
		e := endpoint{Route: route, Count: len(exs), Median: median(exs)}
		for _, ex := range exs {
			e.Bytes += ex.Bytes
		}
		rc.Endpoints = append(rc.Endpoints, e)
	}
	slices.SortFunc(rc.Endpoints, func(a, b endpoint) int {
		return cmp.Or(cmp.Compare(b.Count, a.Count), cmp.Compare(a.Route, b.Route))
	})
	return rc
}

func median(exs []exchange) time.Duration {
	if len(exs) == 0 {
		return 0
	}
	d := make([]time.Duration, len(exs))
	for i, ex := range exs {
		d[i] = ex.Took
	}
	slices.Sort(d)
	return d[len(d)/2]
}

func (s *server) receipt(w http.ResponseWriter, r *http.Request) {
	s.render(w, "receipt", s.wire.receipt())
}
