// Turns a room's SceneDef (plain data) into picture buffers.

import { LAYERS } from './layers';
import { PROPS } from './props';
import './scenery';
import { Scene, lightPass } from './scene';
import type { LightDef, PropDef, SceneDef } from './types';

/** `extra` is whatever conditional props and lights are active right now. */
export function buildScene(def: SceneDef, extra: { props?: PropDef[]; lights?: LightDef[] }[] = []): Scene {
  const sc = new Scene();
  sc.walkTop = def.walkTop;
  for (const l of def.layers) LAYERS[l.t]?.(sc, l, def);
  // Back to front, so nearer props overlap farther ones.
  const props = [...def.props, ...extra.flatMap((e) => e.props ?? [])].sort((a, b) => a.y - b.y);
  for (const p of props) PROPS[p.t]?.shadow?.(sc, p, def);
  for (const p of props) PROPS[p.t]?.draw(sc, p, def);
  const lights = [...(def.lights ?? []), ...extra.flatMap((e) => e.lights ?? [])];
  if (lights.length || def.ambient !== undefined) lightPass(sc, lights, def.ambient ?? 0.3);
  return sc;
}
