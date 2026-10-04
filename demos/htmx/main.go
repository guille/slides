// Command htmx serves a slide deck whose live parts are rendered by Go
// templates and swapped into place by htmx.
package main

import (
	"bytes"
	"compress/gzip"
	"embed"
	"flag"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"runtime"
	"time"
)

//go:embed templates static *.go
var files embed.FS

var started = time.Now()

var htmxSize = func() string {
	src, _ := files.ReadFile("static/htmx.min.js")
	var n counter
	gz := gzip.NewWriter(&n)
	gz.Write(src)
	gz.Close()
	return iec(float64(n))
}()

func main() {
	addr := flag.String("addr", "127.0.0.1:8090", "listen address")
	lib := flag.String("lib", "../../lib", "path to the deck library")
	flag.Parse()

	tmpl := template.Must(template.New("").Funcs(funcs).ParseFS(files, "templates/*.html"))
	// html/template escapes a template on its first execution; pay that
	// here, not inside the first benchmark.
	tmpl.ExecuteTemplate(io.Discard, "bench-table", []benchRow{{}})
	sampler := newSampler(time.Second)
	go sampler.run()
	s := &server{tmpl: tmpl, sampler: sampler, wire: &wire{}}

	static, _ := fs.Sub(files, "static")
	mux := http.NewServeMux()
	mux.Handle("GET /lib/", http.StripPrefix("/lib/", http.FileServer(http.Dir(*lib))))
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.FS(static))))
	mux.HandleFunc("GET /{$}", s.page)

	frag := func(pattern string, h http.HandlerFunc) { mux.Handle(pattern, s.wire.tap(tmpl, h)) }
	frag("GET /echo", s.echo)
	frag("POST /echo", s.echo)
	frag("GET /pulse", s.pulse)
	frag("POST /pulse/{action}", s.pulseAction)
	frag("GET /metrics/search", s.metricSearch)
	frag("GET /metrics/view", s.metricView)
	frag("GET /bench", s.bench)
	frag("GET /receipt", s.receipt)

	log.Printf("serving http://%s/", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}

type server struct {
	tmpl    *template.Template
	sampler *sampler
	wire    *wire
}

// render executes a named template into a buffer first, so a template error
// becomes a clean 500 instead of half a fragment.
func (s *server) render(w http.ResponseWriter, name string, data any) {
	var buf bytes.Buffer
	if err := s.tmpl.ExecuteTemplate(&buf, name, data); err != nil {
		log.Printf("render %s: %v", name, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	buf.WriteTo(w)
}

type pageData struct {
	Now       time.Time
	GoVersion string
	PID       int
	Host      string
	GOOS      string
	GOARCH    string
	CPUs      int
	HTMXSize  string
	Pulse     pulseData
	Search    searchData
	View      metricView
	Receipt   receipt
}

func (s *server) page(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	s.render(w, "deck", pageData{
		Now:       time.Now(),
		GoVersion: runtime.Version(),
		PID:       os.Getpid(),
		Host:      host,
		GOOS:      runtime.GOOS,
		GOARCH:    runtime.GOARCH,
		CPUs:      runtime.NumCPU(),
		HTMXSize:  htmxSize,
		Pulse:     s.pulseData(),
		Search:    search(""),
		View:      s.sampler.view(defaultMetric),
		Receipt:   s.wire.receipt(),
	})
}
