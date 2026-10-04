<script>
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { SlideState } from "../lib/deck.svelte.js";

  let { value } = $props();

  const slide = new SlideState();
  // Rests on the final number (overview, print, previews of other slides);
  // counts up from zero each time the slide comes on stage.
  const n = new Tween(value, { duration: 1400, easing: cubicOut });
  $effect(() => {
    if (slide.active && !slide.revealAll) {
      n.set(0, { duration: 0 });
      n.target = value;
    } else n.set(value, { duration: 0 });
  });
</script>

<span class="count" {@attach slide.track}>{Math.round(n.current)}</span>

<style>
  .count {
    font: 800 360px / 1 var(--deck-font-heading);
    letter-spacing: -0.04em;
    color: var(--deck-accent);
    font-variant-numeric: tabular-nums;
  }
</style>
