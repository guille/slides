<script>
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { SlideState } from "../lib/deck.svelte.js";

  const W = 1000;
  const H = 680;

  // Index = step: the four partners of the community of being, from fused to distinct.
  const layouts = [
    { god: [500, 300], man: [420, 380], society: [580, 380], world: [500, 460], cosmos: [500, 380, 210] },
    { god: [500, 70], man: [420, 400], society: [580, 400], world: [500, 500], cosmos: [500, 430, 210] },
    { god: [500, 70], man: [300, 380], society: [600, 420], world: [520, 540], cosmos: [500, 450, 250] },
    { god: [500, 70], man: [200, 360], society: [800, 360], world: [500, 620], cosmos: [500, 450, 0] },
  ];
  const names = { god: "God", man: "Man", society: "Society", world: "World" };
  const edges = [
    ["god", "man"],
    ["god", "society"],
    ["god", "world"],
    ["man", "society"],
    ["man", "world"],
    ["society", "world"],
  ];

  const slide = new SlideState();
  const step = $derived(slide.shown(layouts.length - 1));
  const pos = new Tween(layouts[0], { duration: 900, easing: cubicInOut });
  $effect(() => {
    pos.set(layouts[step], { duration: slide.revealAll ? 0 : undefined });
  });

  const [cx, cy, r] = $derived(pos.current.cosmos);
</script>

<svg viewBox="0 0 {W} {H}" {@attach slide.track} role="img" aria-label="The community of being, from compact to differentiated">
  <circle class="cosmos" {cx} {cy} r={Math.max(r, 0)} opacity={step < 3 ? 1 : 0} />
  <text class="cosmos-label" x={cx} y={cy + r + 44} text-anchor="middle" opacity={step < 3 ? 1 : 0}>
    {step === 0 ? "the cosmos, full of gods" : "the cosmos"}
  </text>

  {#each edges as [a, b]}
    {@const shown = step === 3 || (step === 2 && a === "god" && b === "man")}
    <line
      class="edge"
      class:cord={a === "god" && b === "man"}
      x1={pos.current[a][0]}
      y1={pos.current[a][1]}
      x2={pos.current[b][0]}
      y2={pos.current[b][1]}
      opacity={shown ? 1 : 0}
    />
  {/each}

  {#each Object.entries(names) as [key, name]}
    {@const [x, y] = pos.current[key]}
    <g class="partner" class:god={key === "god"} transform="translate({x} {y})">
      <circle r="62" />
      <text y="12" text-anchor="middle">{name}</text>
    </g>
  {/each}

  <text class="beyond" x="640" y="80" opacity={step >= 1 ? 1 : 0}>beyond the world</text>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cosmos {
    fill: color-mix(in srgb, var(--deck-accent) 8%, transparent);
    stroke: var(--deck-muted);
    stroke-width: 3;
    stroke-dasharray: 10 10;
    transition: opacity 600ms;
  }
  .cosmos-label,
  .beyond {
    fill: var(--deck-muted);
    font: italic 30px var(--deck-font-heading);
    transition: opacity 600ms;
  }
  .edge {
    stroke: var(--deck-muted);
    stroke-width: 3;
    transition: opacity 600ms;
  }
  .edge.cord {
    stroke: var(--deck-accent);
    stroke-width: 5;
  }
  .partner circle {
    fill: var(--deck-surface);
    stroke: var(--deck-fg);
    stroke-width: 3;
    fill-opacity: 0.92;
  }
  .partner.god circle {
    stroke: var(--deck-accent);
  }
  .partner text {
    fill: var(--deck-fg);
    font: 500 34px var(--deck-font-heading);
  }
</style>
