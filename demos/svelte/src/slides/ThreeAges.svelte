<script>
  import { fade } from "svelte/transition";

  // The New Science of Politics (1952), ch. IV: Joachim's speculation and its modern heirs.
  const versions = [
    { who: "Joachim of Fiore", ages: ["Age of the Father", "Age of the Son", "Age of the Spirit"] },
    { who: "Humanists", ages: ["Ancient", "Medieval", "Modern"] },
    { who: "Turgot & Comte", ages: ["Theological", "Metaphysical", "Positive"] },
    { who: "Hegel", ages: ["One is free", "Some are free", "All are free"] },
    { who: "Marx", ages: ["Primitive communism", "Class society", "Communism"] },
    { who: "National Socialism", ages: ["First Reich", "Second Reich", "Third Reich"] },
  ];
  const symbols = ["three ages, the third final", "the leader", "the prophet", "the brotherhood of autonomous persons"];

  let current = $state(0);
</script>

<div class="ages">
  <div class="picker" role="group" aria-label="Version of the three ages">
    {#each versions as v, i}
      <button type="button" class:on={current === i} aria-pressed={current === i} onclick={() => (current = i)}>
        {v.who}
      </button>
    {/each}
  </div>

  <div class="row">
    {#key current}
      {#each versions[current].ages as age, i}
        <div class="age" class:final={i === 2} in:fade={{ delay: i * 120, duration: 300 }}>
          <span class="n">{["I", "II", "III"][i]}</span>
          <span class="name">{age}</span>
        </div>
      {/each}
    {/key}
  </div>
  <p class="eschaton">
    <span>The third age is the end of history <em>within</em> history.</span>
  </p>

  <ul class="symbols">
    {#each symbols as s}
      <li>{s}</li>
    {/each}
  </ul>
</div>

<style>
  .ages {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  button {
    font: inherit;
    font-size: var(--deck-size-small);
    color: var(--deck-fg);
    background: transparent;
    border: 3px solid var(--deck-surface);
    border-radius: 999px;
    padding: 6px 28px;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--deck-muted);
  }
  button.on {
    background: var(--deck-accent);
    border-color: var(--deck-accent);
    color: var(--deck-accent-fg);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr 1.25fr;
    gap: 16px;
    height: 220px;
  }
  .age {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 28px 36px;
    background: var(--deck-surface);
    clip-path: polygon(0 0, calc(100% - 40px) 0, 100% 50%, calc(100% - 40px) 100%, 0 100%, 20px 50%);
  }
  .age.final {
    background: var(--deck-accent);
    color: var(--deck-accent-fg);
    clip-path: none;
    border-radius: 0 var(--deck-radius) var(--deck-radius) 0;
  }
  .n {
    font: 600 26px var(--deck-font-mono);
    opacity: 0.6;
  }
  .name {
    font-size: 48px;
    line-height: 1.1;
  }
  .eschaton {
    color: var(--deck-muted);
    text-align: right;
  }
  .symbols {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
    font-size: var(--deck-size-small);
  }
  .symbols li {
    padding: 4px 20px;
    border-left: 4px solid var(--deck-accent);
    color: var(--deck-muted);
  }
</style>
