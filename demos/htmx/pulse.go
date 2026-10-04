package main

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"runtime"
	"sync"
	"time"
)

type tile struct {
	Label  string
	Metric string
	Spark  spark
}

type pulseData struct {
	Tiles  []tile
	Status string
}

// A counter shows as a rate unless total is set: GC cycles read better as a
// staircase than as a rate that is mostly zero.
var tiles = []struct {
	label, metric string
	total         bool
}{
	{"Goroutines", "/sched/goroutines:goroutines", false},
	{"Live heap", "/memory/classes/heap/objects:bytes", false},
	{"Allocation rate", "/gc/heap/allocs:bytes", false},
	{"GC cycles", "/gc/cycles/total:gc-cycles", true},
}

func (s *server) pulseData() pulseData {
	var p pulseData
	for _, t := range tiles {
		values, unit := s.sampler.series(t.metric), unitOf(t.metric)
		if t.total {
			values = s.sampler.raw(t.metric)
		} else if catalog[t.metric].Cumulative {
			unit += "/s"
		}
		// The metric name already says what is being counted.
		if unit != "bytes" && unit != "bytes/s" {
			unit = ""
		}
		p.Tiles = append(p.Tiles, tile{t.label, t.metric, sparkline(values, unit, 400, 240)})
	}
	return p
}

func (s *server) pulse(w http.ResponseWriter, r *http.Request) {
	s.render(w, "pulse", s.pulseData())
}

// ballast keeps a burst of allocations reachable for a few seconds, so the
// heap visibly grows before the collector takes it back.
var ballast struct {
	sync.Mutex
	chunks [][]byte
}

func (s *server) pulseAction(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	var status string
	switch r.PathValue("action") {
	case "spawn":
		const n = 10_000
		for range n {
			go time.Sleep(3*time.Second + rand.N(3*time.Second))
		}
		status = fmt.Sprintf("spawned %s goroutines in %s", si(n), time.Since(start).Round(time.Microsecond))
	case "alloc":
		const chunk, n = 1 << 10, 256 << 10
		chunks := make([][]byte, n)
		for i := range chunks {
			chunks[i] = make([]byte, chunk)
		}
		ballast.Lock()
		ballast.chunks = chunks
		ballast.Unlock()
		time.AfterFunc(4*time.Second, func() {
			ballast.Lock()
			ballast.chunks = nil
			ballast.Unlock()
		})
		status = fmt.Sprintf("allocated %s in %s, released in 4 s", iec(chunk*n), time.Since(start).Round(time.Microsecond))
	case "gc":
		runtime.GC()
		status = fmt.Sprintf("runtime.GC() took %s", time.Since(start).Round(time.Microsecond))
	default:
		http.NotFound(w, r)
		return
	}
	// Sample now, so the tiles that ride along in this response already
	// show the effect.
	s.sampler.sample()
	p := s.pulseData()
	p.Status = status
	s.render(w, "pulse-action", p)
}
