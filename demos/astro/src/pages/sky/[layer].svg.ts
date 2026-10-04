import type { APIRoute, GetStaticPaths } from "astro";
import { layers, svg, type Layer } from "../../lib/sky";

export const getStaticPaths = (() => Object.keys(layers).map((layer) => ({ params: { layer } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(svg(params.layer as Layer), { headers: { "Content-Type": "image/svg+xml" } });
