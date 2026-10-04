#version 300 es
// Procedural bodies: one analytic sphere per draw, optional rings, no textures.
precision highp float;

uniform float u_time;
uniform float u_spin;
uniform int u_kind;
uniform vec2 u_center;
uniform float u_radius;
// Canvas pixels per stage pixel.
uniform float u_scale;
uniform float u_tilt;
uniform float u_pitch;
uniform vec3 u_light;
uniform vec4 u_atmosphere;
uniform vec3 u_rings;

out vec4 outColor;

const float PI = 3.14159265;

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 hex(int h) { return lin(vec3(float((h >> 16) & 255), float((h >> 8) & 255), float(h & 255)) / 255.0); }

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }

// ---------- noise (Gustavson simplex, Worley craters) ----------

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p, int octaves) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    s += a * snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

// Height of a field of bowl craters with raised rims. density: fraction of cells with one.
float craters(vec3 p, float density) {
  vec3 i = floor(p), f = fract(p);
  float h = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z);
    vec3 o = hash3(i + g);
    if (o.y > density) continue;
    float d = length(g + o - f) / (0.18 + 0.3 * o.x);
    h += (d < 1.0 ? d * d - 1.0 : 0.0) * 0.6 + exp(-pow((d - 1.0) * 5.0, 2.0)) * 0.3;
  }
  return h;
}

// ---------- surfaces ----------

struct Surface {
  vec3 albedo;
  float height;
  float spec;
  vec3 night;
  float clouds;
};

Surface mercury(vec3 q) {
  float base = fbm(q * 2.5, 5);
  float h = base * 0.25 + craters(q * 4.0, 0.7) * 0.5 + craters(q * 9.0, 0.6) * 0.25 + craters(q * 21.0, 0.5) * 0.1;
  vec3 c = mix(hex(0x5e5853), hex(0xa79f96), smoothstep(-0.5, 0.5, base + 0.4 * snoise(q * 6.0)));
  c *= 0.85 + 0.3 * smoothstep(-0.4, 0.2, h);
  return Surface(c, h, 0.0, vec3(0), 0.0);
}

Surface venus(vec3 q) {
  vec3 v = rotY(u_time * 0.015) * q;
  vec3 w = v * vec3(2.0, 4.5, 2.0);
  w += 1.1 * vec3(fbm(v * 2.5, 4), fbm(v * 2.5 + 4.0, 4), fbm(v * 2.5 + 8.0, 4));
  float c = fbm(w, 6);
  vec3 col = mix(hex(0xc28d4c), hex(0xf6e3b4), smoothstep(-0.8, 0.7, c));
  col = mix(col, hex(0xfff3d6), smoothstep(0.75, 1.0, abs(q.y)) * 0.6);
  return Surface(col, 0.0, 0.0, vec3(0), 0.0);
}

Surface earth(vec3 q) {
  vec3 w = q * 1.7 + 0.45 * vec3(snoise(q * 2.2 + 3.0), snoise(q * 2.2 + 7.0), snoise(q * 2.2 + 11.0));
  float h = fbm(w, 7);
  float land = smoothstep(0.07, 0.1, h);
  float lat = abs(q.y);

  float dry = smoothstep(0.25, 0.0, abs(lat - 0.4) - 0.1 * snoise(q * 4.0)) * smoothstep(-0.2, 0.3, snoise(q * 3.0 + 20.0));
  vec3 ground = mix(hex(0x2f4f22), hex(0x4f6b30), smoothstep(-0.5, 0.5, snoise(q * 9.0)));
  ground = mix(ground, hex(0xb59a64), dry);
  ground = mix(ground, hex(0x6d5e4c), smoothstep(0.28, 0.5, h));
  vec3 ocean = mix(hex(0x041c45), hex(0x0d5a8a), smoothstep(-0.12, 0.09, h));
  vec3 c = mix(ocean, ground, land);

  float ice = smoothstep(0.84, 0.88, lat + 0.05 * snoise(q * 7.0));
  c = mix(c, hex(0xf2f6fa), ice);

  float coast = smoothstep(0.3, 0.1, h);
  float metro = smoothstep(0.1, 0.5, fbm(q * 5.0 + 30.0, 3)) * (0.4 + coast);
  float city = land * (1.0 - ice) * (1.0 - dry) * metro * pow(smoothstep(0.55, 1.0, snoise(q * 140.0) * 0.5 + 0.5), 2.0);
  vec3 night = vec3(1.0, 0.66, 0.32) * city * 1.6;

  vec3 cq = rotY(u_time * 0.012) * q;
  vec3 cw = cq * vec3(2.2, 3.6, 2.2) + 0.7 * vec3(fbm(cq * 3.0, 4), fbm(cq * 3.0 + 9.0, 4), 0.0);
  float cl = smoothstep(0.02, 0.55, fbm(cw, 6) + 0.05);
  cl *= 0.75 + 0.25 * smoothstep(0.0, 0.6, abs(lat - 0.1));

  return Surface(c, land * max(h, 0.0) * 0.5, (1.0 - land) * (1.0 - ice), night, cl);
}

Surface mars(vec3 q) {
  vec3 w = q * 2.4 + 0.15 * vec3(snoise(q * 3.0 + 1.0), snoise(q * 3.0 + 5.0), snoise(q * 3.0 + 9.0));
  float m = fbm(w, 6);
  vec3 c = mix(hex(0x8f4424), hex(0xd8915a), smoothstep(-0.45, 0.5, m));
  float dark = smoothstep(0.0, -0.3, fbm(q * 1.1 + 5.0 + 0.25 * snoise(q * 5.0), 5));
  c = mix(c, hex(0x4b2d22), dark * 0.7);
  float cap = smoothstep(0.86, 0.9, abs(q.y) + 0.04 * snoise(q * 8.0));
  c = mix(c, hex(0xf3ebe3), cap);
  float h = m * 0.35 + craters(q * 5.0, 0.45) * 0.25 + craters(q * 12.0, 0.4) * 0.12;
  return Surface(c, h, 0.0, vec3(0), 0.0);
}

Surface jupiter(vec3 q) {
  float t = u_time * 0.02;
  vec3 s = q * vec3(2.0, 12.0, 2.0);
  s += 1.4 * vec3(fbm(q * vec3(3, 18, 3) + t, 4), fbm(q * vec3(3, 18, 3) + 7.0 - t, 4), 0.0);
  float y = q.y + 0.03 * fbm(s, 5);

  float v = 0.55 * sin(y * 13.0 + 0.9) + 0.3 * sin(y * 29.0 + 1.3) + 0.15 * sin(y * 61.0 + 2.1);
  vec3 c = mix(hex(0xa9714a), hex(0xede1c9), smoothstep(-0.35, 0.35, v));
  c = mix(c, hex(0x6f4129), smoothstep(-0.55, -0.85, v) * 0.8);
  c = mix(c, hex(0xd9a77a), smoothstep(0.3, 0.0, abs(y + 0.05)) * 0.25);
  c = mix(c, hex(0x8d8a8c), smoothstep(0.65, 0.92, abs(y)) * 0.85);
  c *= 0.93 + 0.1 * snoise(q * vec3(1.5, 70.0, 1.5) + vec3(0, 0, t));

  // Great Red Spot, 22° south, with a pale collar.
  float lat = asin(clamp(q.y, -1.0, 1.0));
  float lon = atan(q.z, q.x);
  vec2 d = vec2(mod(lon - 1.9 + PI, 2.0 * PI) - PI, lat + 0.384);
  vec2 e = vec2(d.x * cos(0.384) / 0.2, d.y / 0.1);
  float r = length(e);
  float a = 3.0 * (1.0 - smoothstep(0.0, 1.4, r));
  vec2 sw = mat2(cos(a), sin(a), -sin(a), cos(a)) * e;
  float swirl = snoise(vec3(sw * 2.5, t * 3.0));
  vec3 spot = mix(hex(0xa8432a), hex(0xe39a72), smoothstep(-0.6, 0.8, swirl) * 0.5 + 0.35 * (1.0 - r));
  c = mix(c, hex(0xf6ede0), smoothstep(1.5, 1.15, r) * 0.85);
  c = mix(c, spot, smoothstep(1.05, 0.8, r));
  return Surface(c, 0.0, 0.0, vec3(0), 0.0);
}

Surface saturn(vec3 q) {
  vec3 s = q * vec3(3.0, 20.0, 3.0) + 0.5 * vec3(fbm(q * vec3(3, 12, 3) + u_time * 0.01, 3), 0.0, 0.0);
  float y = q.y + 0.01 * fbm(s, 4);
  float b = sin(y * 22.0) * 0.5 + 0.5;
  float b2 = sin(y * 6.0 + 1.0) * 0.5 + 0.5;
  vec3 c = mix(hex(0xeedcb0), hex(0xc9a56b), smoothstep(0.3, 0.9, b) * (0.35 + 0.5 * b2));
  c = mix(c, hex(0xa98858), smoothstep(0.9, 1.0, b) * 0.4);
  c = mix(c, hex(0x8f9aa0), smoothstep(0.7, 0.95, y) * 0.8);
  return Surface(c, 0.0, 0.0, vec3(0), 0.0);
}

Surface uranus(vec3 q) {
  float y = q.y + 0.01 * snoise(q * vec3(3, 18, 3));
  vec3 c = mix(hex(0x9fd6de), hex(0xc4ecef), smoothstep(0.2, 0.9, y));
  c *= 0.97 + 0.04 * sin(y * 24.0);
  return Surface(c, 0.0, 0.0, vec3(0), 0.0);
}

Surface neptune(vec3 q) {
  float t = u_time * 0.03;
  vec3 s = q * vec3(3.0, 14.0, 3.0) + 0.6 * vec3(fbm(q * vec3(3, 10, 3) + t, 3), 0.0, 0.0);
  float y = q.y + 0.02 * fbm(s, 4);
  vec3 c = mix(hex(0x2448b8), hex(0x4775e6), sin(y * 11.0) * 0.5 + 0.5);
  c = mix(c, hex(0x1b3290), smoothstep(0.55, 0.95, abs(y)) * 0.5);

  float lat = asin(clamp(q.y, -1.0, 1.0));
  float lon = atan(q.z, q.x);
  vec2 e = vec2((mod(lon + 0.6 + PI, 2.0 * PI) - PI) * cos(0.35) / 0.2, (lat + 0.35) / 0.1);
  c = mix(c, hex(0x12205e), smoothstep(1.0, 0.6, length(e)) * 0.85);

  float streak = smoothstep(0.35, 0.75, fbm(q * vec3(2.0, 12.0, 2.0) + vec3(t * 2.0, 0, 0), 5));
  streak *= smoothstep(0.2, 0.05, abs(abs(y) - 0.45)) + smoothstep(0.12, 0.0, abs(y + 0.22 - 0.0));
  c = mix(c, hex(0xe6eeff), clamp(streak, 0.0, 1.0) * 0.9);
  return Surface(c, 0.0, 0.0, vec3(0), 0.0);
}

// ---------- rings ----------

// Ring opacity and colour at distance r (planet radii).
vec4 ringAt(float r) {
  float inner = u_rings.x, outer = u_rings.y;
  if (r < inner || r > outer) return vec4(0);
  float x = (r - inner) / (outer - inner);
  float fine = 0.65 + 0.35 * (snoise(vec3(r * 70.0, 0.5, 0.0)) * 0.6 + snoise(vec3(r * 260.0, 1.5, 0.0)) * 0.4);
  if (u_kind == 7) {
    // Uranus: a handful of thin dark rings, the outermost brightest.
    float k = smoothstep(0.03, 0.0, abs(fract(x * 6.0) - 0.5) - 0.42) * 0.35 + smoothstep(0.985, 1.0, x) * 0.9;
    return vec4(hex(0x9aa4a8), k * u_rings.z);
  }
  // Saturn: C ring, B ring, Cassini division, A ring with the Encke gap.
  float a = mix(0.18, 0.35, smoothstep(0.0, 0.27, x));
  a = mix(a, 0.95, smoothstep(0.26, 0.3, x));
  a *= 1.0 - smoothstep(0.62, 0.66, x) * smoothstep(0.73, 0.69, x) * 0.92;
  a = mix(a, 0.7, smoothstep(0.7, 0.74, x));
  a *= 1.0 - smoothstep(0.9, 0.905, x) * smoothstep(0.915, 0.91, x);
  a *= smoothstep(1.0, 0.985, x);
  vec3 c = mix(hex(0x6b5c4c), hex(0xe8d6b0), smoothstep(0.2, 0.45, x));
  c = mix(c, hex(0xc8b490), smoothstep(0.65, 0.75, x));
  return vec4(c * (0.8 + 0.3 * fine), clamp(a * fine, 0.0, 1.0) * u_rings.z);
}

// ---------- main ----------

vec3 tonemap(vec3 c) {
  c = c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

// Premultiplied colour from linear HDR colour and coverage.
vec4 pm(vec3 c, float a) { return vec4(tonemap(c), 1.0) * clamp(a, 0.0, 1.0); }
vec4 over(vec4 top, vec4 bottom) { return top + bottom * (1.0 - top.a); }

float worley(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z);
    d = min(d, length(g + hash3(i + g) - f));
  }
  return d;
}

vec4 sun(vec2 p, float r, float z, vec3 q, float disk) {
  // Corona falloff in stage pixels (relative to a 400px Sun), so a huge Sun doesn't get a huge corona.
  float o = max(r - 1.0, 0.0) * u_radius / u_scale / 400.0;
  vec2 dir = p / max(r, 1e-4);
  float rays = 0.6 + 0.6 * fbm(vec3(dir * 3.5, o * 1.2 - u_time * 0.05), 4);
  float glow = exp(-o * 3.0) * 0.55 * rays + exp(-o * 13.0) * 0.9;
  vec3 corona = mix(vec3(1.0, 0.32, 0.06), vec3(1.6, 1.0, 0.55), exp(-o * 9.0)) * 1.4;
  vec4 halo = pm(corona, glow) * (1.0 - disk);
  if (disk <= 0.0) return halo;

  float t = u_time * 0.04;
  vec3 w = q * 5.0 + vec3(0, 0, t) + 0.6 * vec3(fbm(q * 3.0 - t, 4), fbm(q * 3.0 + 5.0 + t, 4), 0.0);
  float g = fbm(w, 6);
  float cells = smoothstep(0.1, 0.7, worley(q * 38.0 + vec3(t * 3.0)));
  float spots = smoothstep(-0.5, -0.62, fbm(q * 2.2 + 40.0, 3)) * smoothstep(0.65, 0.2, abs(q.y));
  vec3 c = mix(vec3(1.5, 0.42, 0.06), vec3(2.6, 1.35, 0.42), smoothstep(-0.45, 0.5, g));
  c *= 1.0 - 0.3 * cells;
  c = mix(c, vec3(0.35, 0.08, 0.01), spots * 0.9);
  c *= mix(vec3(0.45, 0.16, 0.05), vec3(1.0), pow(z, 0.45));
  return pm(c, disk) + halo;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_center) / u_radius;
  float r = length(p);
  float z = sqrt(max(1.0 - r * r, 0.0));
  vec3 n = vec3(p, z);
  float aa = 1.0 / u_radius;
  float disk = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);

  mat3 frame = rotX(u_pitch) * rotZ(u_tilt);
  // Prograde spin: the visible face moves west to east, left to right.
  vec3 q = rotY(-u_spin) * frame * n;

  if (u_kind == 0) {
    outColor = sun(p, r, z, q, disk);
    return;
  }

  Surface s;
  if (u_kind == 1) s = mercury(q);
  else if (u_kind == 2) s = venus(q);
  else if (u_kind == 3) s = earth(q);
  else if (u_kind == 4) s = mars(q);
  else if (u_kind == 5) s = jupiter(q);
  else if (u_kind == 6) s = saturn(q);
  else if (u_kind == 7) s = uranus(q);
  else s = neptune(q);

  // Bump from screen-space derivatives of the height field (Mikkelsen 2010).
  vec3 dpdx = dFdx(n), dpdy = dFdy(n);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dFdx(s.height) * r1 + dFdy(s.height) * r2);
  // Faded out toward the limb, where 2x2 derivative blocks start to show.
  float bump = (u_kind == 1 ? 0.05 : u_kind == 3 ? 0.01 : 0.025) * smoothstep(0.05, 0.35, z);
  vec3 nb = normalize(n - bump * grad / max(abs(det), 1e-12));

  vec3 L = normalize(u_light);
  vec3 atmo = lin(u_atmosphere.rgb);
  float atmoK = u_atmosphere.a;
  float ndl = dot(n, L);
  float day = smoothstep(-0.12, 0.2, ndl);
  float diff = u_kind >= 5
    ? pow(max(ndl, 0.0), 0.85) * (0.55 + 0.45 * pow(z, 0.4))
    : max(dot(nb, L), 0.0) * smoothstep(-0.08, 0.2, ndl);

  vec3 c = s.albedo * diff * 1.15;

  vec3 ringN = transpose(frame) * vec3(0, 1, 0);
  if (u_rings.z > 0.0) {
    float t = -dot(ringN, n) / dot(ringN, L);
    if (t > 0.0) c *= 1.0 - ringAt(length(n + t * L)).a * 0.85;
  }

  if (u_kind == 3) {
    vec3 H = normalize(L + vec3(0, 0, 1));
    float nh = max(dot(n, H), 0.0);
    c += vec3(1.0, 0.9, 0.75) * (pow(nh, 260.0) * 1.2 + pow(nh, 30.0) * 0.06) * s.spec * day;
    c += s.night * (1.0 - day) * (1.0 - s.clouds);
    c = mix(c, vec3(1.0) * pow(max(ndl, 0.0), 0.9) * 1.05, s.clouds * 0.92);
  }

  // Atmosphere: fresnel rim on the disk and a halo outside it, both on the lit side.
  float rim = pow(1.0 - z, 3.0);
  float lit = smoothstep(-0.35, 0.6, dot(normalize(p + 1e-5), L.xy) * 0.7 + ndl * 0.3);
  c += atmo * rim * lit * atmoK * 1.4;

  float o = max(r - 1.0, 0.0);
  float halo = (exp(-o * 38.0) * 0.9 + exp(-o * 9.0) * 0.12) * lit * atmoK;
  vec4 col = pm(c, disk) + pm(atmo * 1.6, halo) * (1.0 - disk);

  // Rings, in front of or behind the planet by depth.
  if (u_rings.z > 0.0 && abs(ringN.z) > 1e-3) {
    vec3 hp = vec3(p, -(ringN.x * p.x + ringN.y * p.y) / ringN.z);
    vec4 ring = ringAt(length(hp));
    if (ring.a > 0.0) {
      float b = dot(hp, L), disc = b * b - dot(hp, hp) + 1.0;
      float shadow = b < 0.0 ? smoothstep(0.0, 0.03, disc) : 0.0;
      vec4 rc = pm(ring.rgb * (0.3 + 0.8 * abs(dot(ringN, L))) * (1.0 - shadow * 0.92), ring.a);
      col = hp.z > z || disk < 0.5 ? over(rc, col) : over(col, rc);
    }
  }

  outColor = col;
}
