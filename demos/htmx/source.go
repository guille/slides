package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/scanner"
	"go/token"
	"html"
	"html/template"
	"regexp"
	"strings"
	"time"
	"unicode"
)

var funcs = template.FuncMap{
	"source":     source,
	"gofunc":     gofunc,
	"bytes":      func(n int) string { return iec(float64(n)) },
	"dur":        func(d time.Duration) string { return duration(d.Seconds()) },
	"clock":      func(t time.Time) string { return t.Format("15:04:05.000") },
	"benchSteps": func() int { return len(benchSizes) },
}

// source returns one of this program's own template files, highlighted.
// Lines matching the marker regexp become deck steps, lit in turn.
func source(path, marker string) (template.HTML, error) {
	src, err := files.ReadFile(path)
	if err != nil {
		return "", err
	}
	return highlightHTML(strings.TrimSpace(string(src)), marker), nil
}

// gofunc returns the source of a function in this program, doc comment
// included, found by parsing the embedded file.
func gofunc(path, name, marker string) (template.HTML, error) {
	src, err := files.ReadFile(path)
	if err != nil {
		return "", err
	}
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, path, src, parser.ParseComments)
	if err != nil {
		return "", err
	}
	for _, decl := range f.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Name.Name != name {
			continue
		}
		start := fn.Pos()
		if fn.Doc != nil {
			start = fn.Doc.Pos()
		}
		body := src[fset.Position(start).Offset:fset.Position(fn.End()).Offset]
		return lines(goTokens(body), marker), nil
	}
	return "", fmt.Errorf("gofunc: no func %s in %s", name, path)
}

type tok struct{ class, text string }

func goTokens(src []byte) []tok {
	fset := token.NewFileSet()
	var s scanner.Scanner
	s.Init(fset.AddFile("", fset.Base(), len(src)), src, nil, scanner.ScanComments)
	var toks []tok
	at := 0
	for {
		pos, t, lit := s.Scan()
		if t == token.EOF {
			break
		}
		off := fset.Position(pos).Offset
		// The scanner inserts semicolons that aren't in the source.
		if t == token.SEMICOLON && lit == "\n" {
			continue
		}
		toks = append(toks, tok{"", string(src[at:off])})
		text := t.String()
		if lit != "" {
			text = lit
		}
		class := ""
		switch {
		case t.IsKeyword():
			class = "k"
		case t == token.STRING || t == token.CHAR:
			class = "s"
		case t == token.COMMENT:
			class = "c"
		case t == token.INT || t == token.FLOAT:
			class = "n"
		}
		toks = append(toks, tok{class, text})
		at = off + len(text)
	}
	return append(toks, tok{"", string(src[at:])})
}

// highlightHTML tokenizes an html/template source: tags, attributes,
// strings, comments and {{actions}}.
func highlightHTML(src, marker string) template.HTML {
	var toks []tok
	inTag := false
	for i := 0; i < len(src); {
		rest := src[i:]
		var t tok
		switch {
		case strings.HasPrefix(rest, "{{"):
			t = tok{"act", upto(rest, "}}")}
		case !inTag && strings.HasPrefix(rest, "<!--"):
			t = tok{"c", upto(rest, "-->")}
		case !inTag && len(rest) > 1 && rest[0] == '<' && (rest[1] == '/' || unicode.IsLetter(rune(rest[1]))):
			n := 1 + strings.IndexFunc(rest[1:], func(r rune) bool { return unicode.IsSpace(r) || r == '>' })
			t, inTag = tok{"t", rest[:n]}, true
		case !inTag:
			n := strings.IndexAny(rest[1:], "<{")
			t = tok{"", rest[:cond(n < 0, len(rest), n+1)]}
		case strings.HasPrefix(rest, "/>") || rest[0] == '>':
			t, inTag = tok{"t", rest[:cond(rest[0] == '>', 1, 2)]}, false
		case rest[0] == '"' || rest[0] == '\'':
			t = tok{"s", rest[:1+strings.IndexByte(rest[1:], rest[0])+1]}
		case unicode.IsSpace(rune(rest[0])) || rest[0] == '=':
			t = tok{"", rest[:1]}
		default:
			n := strings.IndexFunc(rest, func(r rune) bool { return unicode.IsSpace(r) || strings.ContainsRune("=>/\"'", r) })
			switch n {
			case -1:
				n = len(rest)
			case 0:
				n = 1
			}
			t = tok{"a", rest[:n]}
		}
		toks = append(toks, t)
		i += len(t.text)
	}
	return lines(toks, marker)
}

func upto(s, end string) string {
	if n := strings.Index(s, end); n >= 0 {
		return s[:n+len(end)]
	}
	return s
}

// lines renders tokens as one span per line, so CSS and deck steps can
// address lines.
func lines(toks []tok, marker string) template.HTML {
	var re *regexp.Regexp
	if marker != "" {
		re = regexp.MustCompile(marker)
	}
	var out, line, plain strings.Builder
	flush := func() {
		attrs := ""
		if re != nil && re.MatchString(plain.String()) {
			attrs = ` data-step data-effect="highlight"`
		}
		fmt.Fprintf(&out, `<span class="line"%s>%s</span>`, attrs, line.String())
		line.Reset()
		plain.Reset()
	}
	for _, t := range toks {
		for i, part := range strings.Split(t.text, "\n") {
			if i > 0 {
				flush()
				out.WriteByte('\n')
			}
			if part == "" {
				continue
			}
			plain.WriteString(part)
			if t.class == "" {
				line.WriteString(html.EscapeString(part))
			} else {
				fmt.Fprintf(&line, `<span class="%s">%s</span>`, t.class, html.EscapeString(part))
			}
		}
	}
	flush()
	return template.HTML(out.String())
}
