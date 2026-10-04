export interface Planet {
  id: string;
  name: string;
  order: number;
  tagline: string;
  blurb: string;
  color: string;
  diameterKm: number;
  /** Sidereal rotation in hours; negative is retrograde. */
  dayHours: number;
  yearDays: number;
  moons: number;
  au: number;
  meanTempC: number;
  /** Mean longitude at J2000, degrees. Positions the orrery on today's date. */
  l0: number;
}

export const planets: Planet[] = [
  {
    id: "mercury",
    name: "Mercury",
    order: 1,
    tagline: "The iron heart",
    blurb: "Mostly core under a thin, cratered crust. Sunrise to sunrise takes 176 Earth days, so a single day outlasts two of its years.",
    color: "#c9b8a6",
    diameterKm: 4879,
    dayHours: 1407.6,
    yearDays: 87.97,
    moons: 0,
    au: 0.387,
    meanTempC: 167,
    l0: 252.25,
  },
  {
    id: "venus",
    name: "Venus",
    order: 2,
    tagline: "Earth's evil twin",
    blurb: "Nearly our size, but buried under 90 atmospheres of CO₂ hot enough to melt lead. It spins backwards, slower than it orbits.",
    color: "#f0c97a",
    diameterKm: 12104,
    dayHours: -5832.5,
    yearDays: 224.7,
    moons: 0,
    au: 0.723,
    meanTempC: 464,
    l0: 181.98,
  },
  {
    id: "earth",
    name: "Earth",
    order: 3,
    tagline: "The one with the weather",
    blurb: "Liquid oceans, a magnetic shield, a moon that steadies its tilt. The only place we know where the rocks woke up and started asking questions.",
    color: "#5aa9ff",
    diameterKm: 12756,
    dayHours: 23.93,
    yearDays: 365.25,
    moons: 1,
    au: 1,
    meanTempC: 15,
    l0: 100.46,
  },
  {
    id: "mars",
    name: "Mars",
    order: 4,
    tagline: "The rust world",
    blurb: "Iron oxide dust over a frozen desert. Olympus Mons stands three Everests high, and Valles Marineris would span a continent.",
    color: "#ec6b3e",
    diameterKm: 6792,
    dayHours: 24.62,
    yearDays: 687,
    moons: 2,
    au: 1.524,
    meanTempC: -65,
    l0: 355.45,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    order: 5,
    tagline: "King of the planets",
    blurb: "Twice as massive as every other planet combined. The Great Red Spot is a storm wider than Earth that has raged for centuries.",
    color: "#e6b07a",
    diameterKm: 142984,
    dayHours: 9.93,
    yearDays: 4331,
    moons: 95,
    au: 5.203,
    meanTempC: -110,
    l0: 34.4,
  },
  {
    id: "saturn",
    name: "Saturn",
    order: 6,
    tagline: "Lord of the rings",
    blurb: "Its rings stretch 280,000 km yet are mostly ten metres thick. The planet itself is less dense than water.",
    color: "#ecd39a",
    diameterKm: 120536,
    dayHours: 10.66,
    yearDays: 10747,
    moons: 274,
    au: 9.537,
    meanTempC: -140,
    l0: 49.94,
  },
  {
    id: "uranus",
    name: "Uranus",
    order: 7,
    tagline: "Knocked on its side",
    blurb: "Tipped 98° by some ancient collision, each pole gets 42 years of sunlight followed by 42 years of night.",
    color: "#9fe6ec",
    diameterKm: 51118,
    dayHours: -17.24,
    yearDays: 30589,
    moons: 28,
    au: 19.19,
    meanTempC: -195,
    l0: 313.23,
  },
  {
    id: "neptune",
    name: "Neptune",
    order: 8,
    tagline: "The windy edge",
    blurb: "Supersonic winds over 2,000 km/h, powered by sunlight 900 times fainter than ours. Found with a pencil before a telescope.",
    color: "#5b7dff",
    diameterKm: 49528,
    dayHours: 16.11,
    yearDays: 59800,
    moons: 16,
    au: 30.07,
    meanTempC: -200,
    l0: 304.88,
  },
];

export const SUN_DIAMETER_KM = 1_392_700;
/** Light travel time for one astronomical unit, in seconds. */
export const LIGHT_SECONDS_PER_AU = 499.005;

const n = (v: number, digits = 0) =>
  v.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function stats(p: Planet) {
  const day = Math.abs(p.dayHours);
  return [
    { label: "Diameter", value: n(p.diameterKm), unit: "km" },
    { label: "Day", value: day < 48 ? n(day, 1) : n(day / 24, day > 2400 ? 0 : 1), unit: (day < 48 ? "h" : "d") + (p.dayHours < 0 ? " ↺" : "") },
    { label: "Year", value: p.yearDays < 1000 ? n(p.yearDays) : n(p.yearDays / 365.25, 1), unit: p.yearDays < 1000 ? "d" : "yr" },
    { label: "Moons", value: n(p.moons), unit: "" },
    { label: "From the Sun", value: n(p.au, p.au < 10 ? 2 : 1), unit: "AU" },
    { label: "Mean temp", value: n(p.meanTempC).replace("-", "−"), unit: "°C" },
  ];
}
