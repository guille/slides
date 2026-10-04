package main

import (
	"bytes"
	"html/template"
	"net/http"
	"slices"
	"strings"
	"time"
)

type header struct{ Name, Value string }

type echoData struct {
	Method, Path string
	Headers      []header
	Name         string
	At           time.Time
}

// echo answers with what the server saw, followed by the source of that
// very answer.
func (s *server) echo(w http.ResponseWriter, r *http.Request) {
	d := echoData{Method: r.Method, Path: r.URL.Path, Name: r.FormValue("name"), At: time.Now()}
	for name, v := range r.Header {
		if strings.HasPrefix(name, "Hx-") {
			d.Headers = append(d.Headers, header{"HX-" + name[3:], v[0]})
		}
	}
	slices.SortFunc(d.Headers, func(a, b header) int { return strings.Compare(a.Name, b.Name) })

	var body bytes.Buffer
	if err := s.tmpl.ExecuteTemplate(&body, "echo-body", d); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	s.render(w, "echo", map[string]any{
		"Body":   template.HTML(body.String()),
		"Source": highlightHTML(body.String(), ""),
	})
}
