<script>
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { SlideState } from "../lib/deck.svelte.js";
  import StepMarkers from "../lib/StepMarkers.svelte";

  const FROM = 1900;
  const TO = 1990;

  const places = [
    { from: 1901, to: 1910, name: "Cologne" },
    { from: 1910, to: 1938, name: "Vienna" },
    { from: 1938, to: 1958, name: "United States" },
    { from: 1958, to: 1969, name: "Munich" },
    { from: 1969, to: 1985, name: "Stanford" },
  ];

  const events = [
    { year: 1901, title: "Born in Cologne", text: "Raised in Vienna; studies under Kelsen and Spann, then travels to the United States and France." },
    { year: 1938, title: "Flight from Vienna", text: "After the Anschluss, dismissed by the University of Vienna; escapes the Gestapo via Switzerland." },
    { year: 1952, title: "The New Science of Politics", text: "Representation and truth; modernity read as the growth of Gnosticism." },
    { year: 1956, title: "Order and History I–III", text: "Israel and Revelation, The World of the Polis, Plato and Aristotle (1956–57)." },
    { year: 1966, title: "Anamnesis", text: "Theory of consciousness, grown out of the 1943 break with Husserl." },
    { year: 1974, title: "The Ecumenic Age", text: "Volume IV abandons the linear plan of the series: history is no single line." },
    { year: 1985, title: "Quod Deus Dicitur", text: "His last essay, worked on until his death in Stanford on 19 January." },
    { year: 1987, title: "In Search of Order", text: "Volume V, unfinished, published posthumously." },
  ];

  const W = 1696;
  const x = (year) => ((year - FROM) / (TO - FROM)) * W;

  const slide = new SlideState();
  const i = $derived(slide.shown(events.length - 1));
  const event = $derived(events[i]);
  const marker = new Tween(x(events[0].year), { duration: 600, easing: cubicInOut });
  $effect(() => {
    marker.set(x(event.year), { duration: slide.revealAll ? 0 : undefined });
  });
</script>

<div class="timeline" {@attach slide.track}>
  <StepMarkers count={events.length - 1} />
  <svg viewBox="0 -60 {W} 210" role="img" aria-label="Timeline of Voegelin's life and works">
    {#each places as p, k}
      <rect class="place" class:alt={k % 2} x={x(p.from)} y="0" width={x(p.to) - x(p.from)} height="44" />
      <text class="place-name" x={(x(p.from) + x(p.to)) / 2} y="31" text-anchor="middle">{p.name}</text>
    {/each}
    <line class="axis" x1="0" x2={W} y1="80" y2="80" />
    {#each [1900, 1920, 1940, 1960, 1980] as year}
      <text class="tick" x={x(year)} y="140" text-anchor="middle">{year}</text>
    {/each}
    {#each events as e, k}
      <circle class="event" class:past={k <= i} cx={x(e.year)} cy="80" r="10" />
    {/each}
    <g transform="translate({marker.current} 0)">
      <line class="needle" y1="-20" y2="80" />
      <circle class="current" cy="80" r="18" />
      <text class="year" y="-30" text-anchor="middle">{event.year}</text>
    </g>
  </svg>
  <div class="card">
    <h3>{event.title}</h3>
    <p>{event.text}</p>
  </div>
</div>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 48px;
  }
  svg {
    width: 100%;
    overflow: visible;
  }
  .place {
    fill: var(--deck-surface);
  }
  .place.alt {
    fill: color-mix(in srgb, var(--deck-surface) 60%, var(--deck-muted));
  }
  .place-name {
    fill: var(--deck-fg);
    font: 22px var(--deck-font-mono);
  }
  .axis {
    stroke: var(--deck-muted);
    stroke-width: 3;
  }
  .tick {
    fill: var(--deck-muted);
    font: 24px var(--deck-font-mono);
  }
  .event {
    fill: var(--deck-bg);
    stroke: var(--deck-muted);
    stroke-width: 4;
    transition: fill 300ms, stroke 300ms;
  }
  .event.past {
    fill: var(--deck-muted);
  }
  .needle {
    stroke: var(--deck-accent);
    stroke-width: 3;
  }
  .current {
    fill: var(--deck-accent);
  }
  .year {
    fill: var(--deck-accent);
    font: 600 34px var(--deck-font-mono);
  }
  .card {
    border-left: 6px solid var(--deck-accent);
    padding-left: 40px;
  }
  .card h3 {
    font-size: 64px;
    font-weight: 500;
    font-style: italic;
  }
  .card p {
    margin-top: 12px;
    color: var(--deck-muted);
    max-width: 30em;
  }
</style>
