<script>
  import { SlideState } from "../lib/deck.svelte.js";

  const W = 860;
  const H = 700;
  const me = { x: 300, y: 380 };
  const thing = { x: 640, y: 380 };
  // Upper half only, clear of the arrow and the caption.
  const rays = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2).filter(
    (a) => Math.sin(a) < -0.3,
  );

  const slide = new SlideState();
  const step = $derived(slide.shown(2));
</script>

<svg viewBox="0 0 {W} {H}" {@attach slide.track} role="img" aria-label="Intentionality and luminosity of consciousness">
  <defs>
    <radialGradient id="glow">
      <stop offset="0" stop-color="var(--deck-accent)" stop-opacity="0.55" />
      <stop offset="1" stop-color="var(--deck-accent)" stop-opacity="0" />
    </radialGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="var(--deck-fg)" />
    </marker>
  </defs>

  <g class="it" class:on={step >= 1}>
    <rect x="20" y="40" width={W - 40} height={H - 80} rx="48" />
    <text x="60" y="100">the It: the comprehending reality</text>
    {#each rays as a}
      <line
        x1={me.x + Math.cos(a) * 280}
        y1={me.y + Math.sin(a) * 240}
        x2={me.x + Math.cos(a) * 110}
        y2={me.y + Math.sin(a) * 110}
      />
    {/each}
    <circle cx={me.x} cy={me.y} r="170" fill="url(#glow)" />
  </g>

  <g class="intent" class:dim={step === 1}>
    <line class="arrow" x1={me.x + 80} y1={me.y} x2={thing.x - 90} y2={thing.y} marker-end="url(#arrow)" />
    <text x={(me.x + thing.x) / 2} y={me.y - 24} text-anchor="middle">intends</text>
    <rect class="thing" x={thing.x - 70} y={thing.y - 70} width="140" height="140" rx="8" />
    <text x={thing.x} y={thing.y + 120} text-anchor="middle">a thing</text>
  </g>

  <circle class="me" cx={me.x} cy={me.y} r="72" />
  <text class="me-label" x={me.x} y={me.y + 12} text-anchor="middle">I</text>
  <text class="caption" x={me.x} y={me.y + 130} text-anchor="middle">consciousness in a body</text>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
  }
  text {
    fill: var(--deck-muted);
    font: italic 30px var(--deck-font-heading);
  }
  .it {
    opacity: 0;
    transition: opacity 700ms;
  }
  .it.on {
    opacity: 1;
  }
  .it rect {
    fill: color-mix(in srgb, var(--deck-accent) 6%, transparent);
    stroke: var(--deck-accent);
    stroke-width: 3;
    stroke-dasharray: 12 10;
  }
  .it text {
    fill: var(--deck-accent);
  }
  .it line {
    stroke: var(--deck-accent);
    stroke-width: 2;
    stroke-opacity: 0.6;
  }
  .intent {
    transition: opacity 700ms;
  }
  .intent.dim {
    opacity: 0.25;
  }
  .arrow {
    stroke: var(--deck-fg);
    stroke-width: 4;
  }
  .thing {
    fill: var(--deck-surface);
    stroke: var(--deck-fg);
    stroke-width: 3;
  }
  .me {
    fill: var(--deck-bg);
    stroke: var(--deck-fg);
    stroke-width: 4;
  }
  .me-label {
    fill: var(--deck-fg);
    font: italic 500 44px var(--deck-font-heading);
  }
</style>
