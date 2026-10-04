// How each body is drawn by globe.frag. `kind` selects the surface function.
export interface Body {
  kind: number;
  /** Default disk radius as a fraction of half the canvas' shorter side. */
  radius: number;
  /** Axis roll in the screen plane, and how far the north pole leans toward us (radians). */
  tilt: number;
  pitch: number;
  /** Visual spin in radians per second; nothing like the real rates. */
  spin: number;
  /** Atmosphere tint (sRGB) and strength. */
  atmosphere: [number, number, number, number];
  /** Inner and outer ring radii in planet radii, and ring opacity. */
  rings?: [number, number, number];
}

export const bodies: Record<string, Body> = {
  sun: { kind: 0, radius: 0.6, tilt: 0.12, pitch: 0.1, spin: 0.012, atmosphere: [1, 0.6, 0.2, 1] },
  mercury: { kind: 1, radius: 0.82, tilt: 0, pitch: 0.12, spin: 0.05, atmosphere: [0, 0, 0, 0] },
  venus: { kind: 2, radius: 0.8, tilt: -0.05, pitch: 0.1, spin: -0.02, atmosphere: [1, 0.86, 0.6, 0.9] },
  earth: { kind: 3, radius: 0.8, tilt: 0.41, pitch: 0.2, spin: 0.07, atmosphere: [0.38, 0.62, 1, 1] },
  mars: { kind: 4, radius: 0.82, tilt: 0.44, pitch: 0.18, spin: 0.07, atmosphere: [1, 0.62, 0.48, 0.35] },
  jupiter: { kind: 5, radius: 0.8, tilt: 0.05, pitch: 0.06, spin: 0.05, atmosphere: [0.95, 0.85, 0.7, 0.3] },
  saturn: { kind: 6, radius: 0.37, tilt: 0.38, pitch: 0.42, spin: 0.09, atmosphere: [0.98, 0.9, 0.7, 0.25], rings: [1.24, 2.27, 1] },
  uranus: { kind: 7, radius: 0.62, tilt: 1.62, pitch: 0.42, spin: -0.07, atmosphere: [0.62, 0.92, 1, 0.6], rings: [1.62, 2.0, 0.35] },
  neptune: { kind: 8, radius: 0.8, tilt: 0.49, pitch: 0.12, spin: 0.08, atmosphere: [0.4, 0.58, 1, 0.75] },
};
