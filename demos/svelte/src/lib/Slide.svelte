<script>
  import { onMount } from "svelte";
  import { getDeckContext } from "./deck.svelte.js";

  let { layout, transition, number = true, notes, children, ...rest } = $props();

  const ctx = getDeckContext();
  onMount(() => {
    ctx?.sync();
    return () => ctx?.sync();
  });
</script>

<section
  data-layout={layout}
  data-transition={transition}
  data-no-number={number ? undefined : ""}
  {...rest}
>
  {@render children?.()}
  {#if notes}
    <aside class="notes">{@render notes()}</aside>
  {/if}
</section>
