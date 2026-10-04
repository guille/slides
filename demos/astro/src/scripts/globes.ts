import { onSlide } from "@slides/deck";
import fragment from "./globe.frag?raw";
import { bodies, type Body } from "./bodies";

const vertex = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const LIGHTS: Record<string, [number, number, number]> = {
  left: [-0.8, 0.3, 0.5],
  right: [0.8, 0.3, 0.5],
  top: [-0.35, 0.8, 0.45],
  front: [-0.3, 0.25, 0.92],
};

// A single WebGL context draws every globe and copies the frame into the globe's
// own 2D canvas. Browsers cap live WebGL contexts at ~16 per page, and the
// overview and presenter previews would blow through that with one per globe.
interface View {
  body: Body;
  light: [number, number, number];
  /** Disk centre and radius in canvas pixels. */
  cx: number;
  cy: number;
  radius: number;
}

class Renderer {
  canvas = document.createElement("canvas");
  gl: WebGL2RenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor() {
    const gl = this.canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;

    const program = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (const name of ["center", "time", "spin", "kind", "radius", "tilt", "pitch", "light", "atmosphere", "rings"]) {
      this.uniforms[name] = gl.getUniformLocation(program, `u_${name}`);
    }
  }

  draw(target: HTMLCanvasElement, view: View, time: number) {
    const { gl, canvas, uniforms: u } = this;
    const { width: w, height: h } = target;
    const { body } = view;
    if (canvas.width < w || canvas.height < h) {
      canvas.width = Math.max(canvas.width, w);
      canvas.height = Math.max(canvas.height, h);
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // GL's y axis points up; the view's centre is measured from the top.
    gl.uniform2f(u.center, view.cx, h - view.cy);
    gl.uniform1f(u.time, time);
    gl.uniform1f(u.spin, time * body.spin);
    gl.uniform1i(u.kind, body.kind);
    gl.uniform1f(u.radius, view.radius);
    gl.uniform1f(u.tilt, body.tilt);
    gl.uniform1f(u.pitch, body.pitch);
    gl.uniform3fv(u.light, view.light);
    gl.uniform4fv(u.atmosphere, body.atmosphere);
    gl.uniform3fv(u.rings, body.rings ?? [0, 0, 0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    // The viewport sits at the bottom-left of the (possibly larger) GL canvas.
    ctx.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, w, h);
  }
}

let renderer: Renderer | null = null;
const running = new Set<PlanetGlobe>();
const pending = new Set<PlanetGlobe>();
let frame = 0;
const start = performance.now();
// Seconds since load, so every globe on screen shares one clock.
const now = () => (performance.now() - start) / 1000;

function tick() {
  frame = 0;
  // Still frames are drawn a couple per frame so a deck full of globes doesn't stall on load.
  let budget = 2;
  for (const globe of pending) {
    if (budget-- === 0) break;
    globe.render();
  }
  for (const globe of running) globe.render();
  if (running.size || pending.size) frame = requestAnimationFrame(tick);
}

const schedule = () => (frame ||= requestAnimationFrame(tick));

class PlanetGlobe extends HTMLElement {
  canvas!: HTMLCanvasElement;
  view!: View;
  // Rendering time, frozen while off-stage so a globe resumes where it stopped.
  offset = 0;
  stoppedAt = 0;
  stop?: () => void;

  connectedCallback() {
    this.canvas = this.querySelector("canvas")!;
    const { width, height } = this.canvas;
    const body = bodies[this.dataset.body!];
    const num = (v: string | undefined, fallback: number) => (v === undefined ? fallback : Number(v));
    this.view = {
      body,
      light: LIGHTS[this.dataset.light ?? "left"],
      cx: num(this.dataset.cx, width / 2),
      cy: num(this.dataset.cy, height / 2),
      radius: num(this.dataset.radius, (body.radius * Math.min(width, height)) / 2),
    };
    this.offset = -Number(this.dataset.phase ?? 0);
    pending.add(this);
    schedule();

    this.stop = onSlide(this, {
      enter: ({ mode }) => {
        if (mode !== "main" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        this.offset += now() - this.stoppedAt;
        running.add(this);
        schedule();
      },
      leave: () => {
        if (running.delete(this)) this.stoppedAt = now();
      },
    });
    this.stoppedAt = now();
  }

  disconnectedCallback() {
    this.stop?.();
    running.delete(this);
    pending.delete(this);
  }

  render() {
    pending.delete(this);
    renderer ??= new Renderer();
    const t = running.has(this) ? now() - this.offset : this.stoppedAt - this.offset;
    renderer.draw(this.canvas, this.view, t);
  }
}

customElements.define("planet-globe", PlanetGlobe);
