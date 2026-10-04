<script>
  import { slide } from "../lib/deck.svelte.js";

  const W = 1696;
  const H = 520;
  const HOLD = 3500;

  // Voegelin, "Equivalences of Experience and Symbolization in History" (1970), and The Ecumenic Age.
  const poles = [
    ["immortality", "mortality"],
    ["perfection", "imperfection"],
    ["timelessness", "time"],
    ["order", "disorder"],
    ["truth", "untruth"],
    ["sense", "senselessness"],
    ["amor Dei", "amor sui"],
    ["l'âme ouverte", "l'âme close"],
    ["nous", "apeiron"],
  ];

  let pair = $state(0);
  let running = $state(false);

  // Existence never reaches either pole: each soul swings within the In-Between,
  // pulled upward a little more than it sinks.
  const souls = Array.from({ length: 180 }, (_, i) => ({
    x: (i * 9.42) % W,
    vx: 0.25 + ((i * 7) % 11) / 20,
    phase: (i * 2.399) % (Math.PI * 2),
    freq: 0.004 + ((i * 13) % 17) / 3000,
    amp: 0.15 + ((i * 31) % 23) / 100,
    size: 2 + (i % 4),
  }));

  function animate(canvas) {
    const ctx = canvas.getContext("2d");
    const style = getComputedStyle(canvas);
    const accent = style.getPropertyValue("--deck-accent");
    const muted = style.getPropertyValue("--deck-muted");
    let raf = 0;
    let elapsed = 0;
    let last = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = muted;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      for (const y of [24, H - 24]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (const s of souls) {
        const swing = Math.sin(s.phase + elapsed * s.freq * 0.06);
        const height = 0.5 + s.amp * swing + 0.06; // 0 = bottom pole, 1 = top
        ctx.globalAlpha = 0.35 + 0.65 * height;
        ctx.fillStyle = height > 0.62 ? accent : muted;
        ctx.beginPath();
        ctx.arc(s.x, H - height * H, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      elapsed += dt;
      for (const s of souls) s.x = (s.x + s.vx * (dt / 16)) % W;
      pair = Math.floor(elapsed / HOLD) % poles.length;
      draw();
      raf = requestAnimationFrame(loop);
    }

    draw();
    const stop = slide({
      enter: () => {
        running = true;
        last = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      },
      leave: () => {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
      },
    })(canvas);

    return () => {
      stop();
      cancelAnimationFrame(raf);
    };
  }
</script>

<div class="metaxy">
  <div class="stage">
    <canvas width={W} height={H} {@attach animate}></canvas>
    {#key pair}
      <span class="pole top">{poles[pair][0]}</span>
      <span class="pole bottom">{poles[pair][1]}</span>
    {/key}
  </div>
  <p class="status">
    <span class="dot" class:on={running}></span>
    <span>The tension, not either pole, is the reality of existence · <span class="mono">{pair + 1}/{poles.length}</span></span>
  </p>
</div>

<style>
  .metaxy {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 0;
  }
  .stage {
    position: relative;
  }
  canvas {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--deck-radius);
    background: var(--deck-surface);
  }
  .pole {
    position: absolute;
    left: 40px;
    padding: 0 16px;
    background: var(--deck-surface);
    font-style: italic;
    font-size: 44px;
    animation: appear 600ms ease both;
  }
  .top {
    top: 0;
    color: var(--deck-accent);
  }
  .bottom {
    bottom: 0;
    color: var(--deck-muted);
  }
  @keyframes appear {
    from { opacity: 0; }
  }
  .status {
    font-size: var(--deck-size-small);
    color: var(--deck-muted);
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .mono {
    font-family: var(--deck-font-mono);
    font-size: 26px;
    color: var(--deck-fg);
  }
  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--deck-muted);
  }
  .dot.on {
    background: var(--deck-accent);
    box-shadow: 0 0 16px var(--deck-accent);
  }
</style>
