// Working out where the player can walk in a picture: used to check hand-made rooms, and to make
// sure generated ones can be crossed.

import { PH, PW, type Scene } from './scene';

/** Mark every ground pixel the player could stand on, starting from one point. */
export function reachable(sc: Scene, sx: number, sy: number): Uint8Array {
  const seen = new Uint8Array(PW * PH);
  // Exactly where the player's feet may be: below the top of the ground and above the foot of the
  // picture (stepping past either is leaving the room), and clear to either side.
  const free = (x: number, y: number): boolean => y > sc.walkTop && y < PH - 2 && !sc.blocked(x, y) && !sc.blocked(x - 4, y) && !sc.blocked(x + 4, y);
  const stack: number[] = [];
  // Start from the nearest free spot, as arriving players are nudged the same way.
  for (let r = 0; r < 60 && !stack.length; r += 2)
    for (let k = 0; k < 16 && !stack.length; k++) {
      const x = Math.round(sx + Math.cos((k / 16) * Math.PI * 2) * r);
      const y = Math.round(sy + Math.sin((k / 16) * Math.PI * 2) * r * 0.5);
      if (x >= 0 && x < PW && y >= 0 && y < PH && free(x, y)) stack.push(y * PW + x);
    }
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    seen[i] = 1;
    const x = i % PW;
    const y = (i / PW) | 0;
    for (const [dx, dy] of [[2, 0], [-2, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < PW && ny >= 0 && ny < PH && !seen[ny * PW + nx] && free(nx, ny)) stack.push(ny * PW + nx);
    }
  }
  return seen;
}

const mains = new WeakMap<Scene, Uint8Array>();

/**
 * The ground a room is really made of: everything that can be walked to from its middle. A patch
 * of free ground walled off from that (behind a tree at the edge, say) is not part of it, and
 * nobody should ever be put down there.
 */
export function mainGround(sc: Scene): Uint8Array {
  let seen = mains.get(sc);
  if (!seen) mains.set(sc, (seen = reachable(sc, PW / 2, Math.round((sc.walkTop + PH) / 2))));
  return seen;
}

/**
 * The nearest point of a room's real ground to somewhere, which may be that very point. `margin`
 * keeps the answer that far in from the side edges.
 */
export function nearestGround(sc: Scene, x: number, y: number, margin = 7): [number, number] {
  const ground = mainGround(sc);
  const good = (px: number, py: number): boolean => px >= margin && px < PW - margin && py > sc.walkTop && py < PH - 2 && ground[py * PW + px] === 1;
  const [rx, ry] = [Math.round(x), Math.round(y)];
  if (rx >= 0 && rx < PW && ry >= 0 && ry < PH && ground[ry * PW + rx] === 1) return [x, y];
  for (let r = 2; r < 220; r += 2)
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const px = Math.round(x + Math.cos(a) * r);
      const py = Math.round(y + Math.sin(a) * r * 0.5);
      if (good(px, py)) return [px, py];
    }
  return [x, y];
}

/** Could the player get within reach of a point? */
export function canReach(seen: Uint8Array, x: number, y: number, d: number): boolean {
  for (let py = Math.max(0, Math.floor(y - d / 2)); py <= Math.min(PH - 1, y + d / 2); py++)
    for (let px = Math.max(0, Math.floor(x - d)); px <= Math.min(PW - 1, x + d); px++)
      if (seen[py * PW + px] && Math.hypot(px - x, (py - y) * 2) <= d) return true;
  return false;
}


/** Which of a room's edges cannot be walked to from the ground reachable in `seen`. */
export function blockedEdges(seen: Uint8Array, walkTop: number, sides: string): string[] {
  const col = (x: number): boolean => {
    for (let y = walkTop; y < PH; y++) if (seen[y * PW + x]) return true;
    return false;
  };
  const row = (y: number): boolean => {
    for (let x = 0; x < PW; x++) if (seen[y * PW + x]) return true;
    return false;
  };
  const open: Record<string, boolean> = { w: col(7), e: col(PW - 8), n: row(walkTop + 1), s: row(PH - 3) };
  return [...sides].filter((side) => !open[side]);
}

/** One tick of walking: the direction held, and where it leaves the walker. */
export interface Pace {
  dx: number;
  dy: number;
  x: number;
  y: number;
}

/**
 * The way from one point to as near another as the ground allows, round whatever stands between:
 * one pace per tick, moving exactly as a walker does (two across, then one up or down, each only
 * if the ground is free). `shut` marks ground not to be set foot on. `side` is how far in from
 * the side edges a walker must stay.
 */
export function routeTo(sc: Scene, sx: number, sy: number, tx: number, ty: number, shut: (x: number, y: number) => boolean = () => false, side = 6): Pace[] {
  const free = (x: number, y: number): boolean =>
    x >= side && x <= PW - 1 - side && y > sc.walkTop && y < PH - 2 && !sc.blocked(x, y) && !sc.blocked(x - 4, y) && !sc.blocked(x + 4, y) && !shut(x, y);
  const [x0, y0] = [Math.round(sx), Math.round(sy)];
  // Where each point was reached from, and by which of the eight directions (0 is unvisited).
  const from = new Int32Array(PW * PH).fill(-1);
  const how = new Uint8Array(PW * PH);
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const start = y0 * PW + x0;
  from[start] = start;
  const queue = [start];
  let best = start;
  let bestD = Math.hypot(x0 - tx, (y0 - ty) * 2);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % PW;
    const y = (i / PW) | 0;
    const d = Math.hypot(x - tx, (y - ty) * 2);
    if (d < bestD) [best, bestD] = [i, d];
    for (let k = 0; k < 8; k++) {
      const [dx, dy] = DIRS[k];
      const nx = dx && free(x + dx * 2, y) ? x + dx * 2 : x;
      const ny = dy && free(nx, y + dy) ? y + dy : y;
      // A pace that is half refused (sliding along a wall) is left to the straight ones.
      if ((dx && nx === x) || (dy && ny === y)) continue;
      const n = ny * PW + nx;
      if (from[n] >= 0) continue;
      from[n] = i;
      how[n] = k;
      queue.push(n);
    }
  }
  const paces: Pace[] = [];
  for (let i = best; i !== start; i = from[i]) paces.push({ dx: DIRS[how[i]][0], dy: DIRS[how[i]][1], x: i % PW, y: (i / PW) | 0 });
  return paces.reverse();
}
