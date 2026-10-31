export interface RegionDef {
  id: "west1" | "wetlow";
  code: string;
  name: string;
  continent: string;
  desc: string;
  lon: number;
  lat: number;
  /* land bitmap slice bounding box [colStart,rowStart,colEnd,rowEnd] inclusive */
  box: { c0: number; r0: number; c1: number; r1: number };
}

export const REGIONS: RegionDef[] = [
  {
    id: "west1",
    code: "WEST1",
    name: "WESTERN-1",
    continent: "NORTH AMERICA",
    desc: "Primary western hemisphere grid. Dense relay mesh over the old telecom backbone.",
    lon: -100,
    lat: 41,
    box: { c0: 3, r0: 3, c1: 25, r1: 17 },
  },
  {
    id: "wetlow",
    code: "WETLOW",
    name: "WESTERN-LOW",
    continent: "SOUTH AMERICA",
    desc: "Southern hemisphere lowlands. River relays, contested jungle mesh, dying cape beacons.",
    lon: -60,
    lat: -13,
    box: { c0: 17, r0: 15, c1: 30, r1: 30 },
  },
];

/* decorative unreachable points on the world net */
export const DEAD_POINTS = [
  { code: "EU-LINK", name: "EUROPEAN TRUNK", lon: 12, lat: 50, note: "transatlantic trunk severed in this build" },
  { code: "EASTNET", name: "EASTERN NET", lon: 96, lat: 38, note: "no route announced from this terminal" },
  { code: "PAC-CABLE", name: "TRANS-PACIFIC", lon: -152, lat: 2, note: "cable repeater silent since '94" },
];

export const UPLINK = { code: "SAT-0", name: "SATELLITE UPLINK", lon: -24, lat: 18 };

/* ------------------------------------------------------------------ */
/* coarse land bitmap: 72 cols x 36 rows, 5-degree cells.              */
/* runs of land [row, colStart, colEnd]                                */
/* ------------------------------------------------------------------ */

export const GRID_COLS = 72;
export const GRID_ROWS = 36;

const RUNS: [number, number, number][] = [
  /* 72 x 36 cells, 5 degrees each.  col = (lon+180)/5, row = (90-lat)/5 */

  /* --- arctic rim + greenland --- */
  [2, 27, 31],
  [3, 10, 22], [3, 26, 32], [3, 44, 64],
  /* --- canada / alaska / siberia / scandinavia --- */
  [4, 8, 24], [4, 26, 32], [4, 38, 41], [4, 44, 66],
  [5, 4, 25], [5, 27, 31], [5, 37, 42], [5, 44, 66],
  [6, 4, 25], [6, 28, 30], [6, 34, 36], [6, 37, 43], [6, 43, 67],
  [7, 5, 24], [7, 34, 36], [7, 37, 43], [7, 43, 67],
  /* --- usa / europe / asia --- */
  [8, 7, 23], [8, 34, 36], [8, 37, 44], [8, 44, 67],
  [9, 9, 23], [9, 34, 44], [9, 44, 66],
  [10, 11, 23], [10, 34, 47], [10, 48, 65], [10, 67, 68],
  /* --- mediterranean sits here: no land between col 23 and col 46 --- */
  [11, 11, 22], [11, 46, 60], [11, 67, 68],
  /* --- mexico / north africa / arabia / china --- */
  [12, 12, 21], [12, 44, 48], [12, 50, 60],
  [13, 13, 20], [13, 33, 47], [13, 50, 53], [13, 55, 58],
  /* (africa's north coast starts here; the row above is the mediterranean) */
  /* --- central america / sahel / india / indochina --- */
  [14, 14, 19], [14, 33, 47], [14, 51, 53], [14, 55, 58],
  [15, 16, 19], [15, 33, 47], [15, 51, 53], [15, 56, 59],
  [16, 17, 20], [16, 33, 46], [16, 52, 53], [16, 57, 62],
  /* --- colombia / equatorial africa / indonesia --- */
  [17, 19, 22], [17, 34, 46], [17, 58, 63],
  [18, 19, 24], [18, 34, 46], [18, 59, 63],
  [19, 19, 26], [19, 35, 46], [19, 60, 64],
  /* --- brazil / southern africa / australia --- */
  [20, 20, 27], [20, 35, 45],
  [21, 20, 28], [21, 35, 44], [21, 59, 67],  /* australia begins */
  [22, 21, 28], [22, 35, 44], [22, 59, 67],
  [23, 21, 28], [23, 35, 43], [23, 59, 66],
  [24, 22, 27], [24, 36, 42], [24, 60, 65],
  [25, 22, 26], [25, 37, 41], [25, 61, 64], [25, 69, 70],
  /* --- southern cone --- */
  [26, 23, 25], [26, 69, 70],
  [27, 23, 25],
  [28, 23, 24],
  [29, 23, 24],
];

import { useMemo } from "react";

export interface LandGrid {
  cols: number;
  rows: number;
  land: Uint8Array;
}

const FULL: LandGrid = (() => {
  const land = new Uint8Array(GRID_COLS * GRID_ROWS);
  RUNS.forEach(([r, c0, c1]) => {
    for (let c = c0; c <= c1; c++) land[r * GRID_COLS + c] = 1;
  });
  return { cols: GRID_COLS, rows: GRID_ROWS, land };
})();

export function worldGrid(): LandGrid {
  return FULL;
}

/* slice for a region, padded with margin */
export function regionGrid(box: RegionDef["box"], margin = 1): LandGrid {
  const c0 = Math.max(0, box.c0 - margin);
  const r0 = Math.max(0, box.r0 - margin);
  const c1 = Math.min(GRID_COLS - 1, box.c1 + margin);
  const r1 = Math.min(GRID_ROWS - 1, box.r1 + margin);
  const cols = c1 - c0 + 1;
  const rows = r1 - r0 + 1;
  const land = new Uint8Array(cols * rows);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      land[(r - r0) * cols + (c - c0)] = FULL.land[r * GRID_COLS + c];
  return { cols, rows, land };
}

/* deterministic pseudo-random for stable dot brightness */
export const cellJitter = (c: number, r: number) => ((c * 73856093) ^ (r * 19349663)) >>> 0;

/* lon/lat helpers for the world view */
export const lonToX = (lon: number) => (lon + 180) / 360;
export const latToY = (lat: number) => (90 - lat) / 180;

export function useLandGrid(box: RegionDef["box"] | null): LandGrid {
  return useMemo(() => (box ? regionGrid(box) : worldGrid()), [box]);
}

export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
