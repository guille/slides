<script>
  let { as = "div", at, effect, children, ...rest } = $props();
</script>

<svelte:element this={as} data-step={at ?? ""} data-effect={effect} {...rest}>
  {@render children?.()}
</svelte:element>
