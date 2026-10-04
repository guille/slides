<script>
  // Invisible data-step elements for slides whose steps are driven purely by JS.
  let { count } = $props();
</script>

{#each { length: count }, i}
  <span data-step={i + 1} hidden></span>
{/each}
