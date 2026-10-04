<script>
  import { onMount } from "svelte";
  import { deck } from "@slides/deck";
  import { setDeckContext } from "./deck.svelte.js";

  let { transition = "none", progress = false, slideNumbers = false, children } = $props();

  let root;
  let api;
  let queued = false;

  const sections = () => [...root.children].filter((el) => el.tagName === "SECTION");

  // Slides call this on mount/unmount (e.g. {#if} around a slide).
  function sync() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!api || !root?.isConnected) return;
      const now = sections();
      if (now.length !== api.slides.length || now.some((el, i) => el !== api.slides[i])) api.refresh();
    });
  }

  setDeckContext({ sync });

  onMount(() => {
    api = deck(root);
    return () => {
      api?.destroy();
      api = null;
    };
  });
</script>

<main
  class="deck"
  bind:this={root}
  data-transition={transition}
  data-progress={progress ? "" : undefined}
  data-slide-numbers={slideNumbers ? "" : undefined}
>
  {@render children?.()}
</main>
