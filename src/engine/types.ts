// The data model. Everything a room, character, item or quest is made of is a plain record
// defined here: no functions, so content can be stored, sent, validated and generated.

import type { RampName } from './palette';
import type { TuneDef } from './tune';

export type Dir = 'down' | 'up' | 'left' | 'right';
export type Value = number | string | boolean;

// ---------------------------------------------------------------------------------------------
// Pictures

export interface LayerDef {
  t: string;
  pts?: number[][];
  [k: string]: Value | number[][] | undefined;
}

export interface PropDef {
  t: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  seed?: number;
  x1?: number;
  y1?: number;
  lit?: number;
  ramp?: RampName;
  /** Variant name, where a prop has several looks. */
  v?: string;
}

export interface LightDef {
  x: number;
  y: number;
  r: number;
  i: number;
  kind: 'warm' | 'glow';
}

export interface SceneDef {
  kind: 'outdoor' | 'indoor';
  horizon?: number;
  /** Highest (smallest y) line the ground can be walked on. */
  walkTop: number;
  layers: LayerDef[];
  props: PropDef[];
  lights?: LightDef[];
  ambient?: number;
  /** Extra props and lights present only while conditions hold (an opened door, a lit hearth). */
  when?: { if: Cond[]; props?: PropDef[]; lights?: LightDef[] }[];
}

export interface CharSpec {
  body?: 'human' | 'wolf' | 'bear' | 'deer';
  /** Drawn this many times life size (1 if absent). For beasts, `skin` is the colour of the coat. */
  size?: number;
  skin: RampName;
  hair: RampName;
  hairStyle: 'short' | 'long' | 'crown' | 'bald' | 'hood';
  beard?: boolean;
  tunic: RampName;
  legs: RampName;
  boots: RampName;
  collar?: RampName;
  cloak?: RampName;
  dress?: boolean;
  apron?: RampName;
  eyes?: RampName;
  hunch?: boolean;
  armed?: boolean;
  /** Shift every clothing tone (negative = darker). */
  bias?: number;
  outline?: RampName;
  ragged?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Rules: "when this happens, if these hold, do these"

export type Cond =
  | { flag: string; is?: Value; min?: number }
  | { has: string; n?: number }
  | { gold: number }
  | { near: string; d?: number }
  | { quest: string; is?: number; min?: number; max?: number }
  | { knows: string }
  | { skill: string; min: number }
  /** True after dark (or, with false, by day). */
  | { night: boolean }
  /** True when nothing hostile is left alive in the room (or, with false, when something is). */
  | { quiet: boolean }
  | { not: Cond }
  | { any: Cond[] };

export type Effect =
  | { say: string }
  /** A passing hint under the picture; does not stop play. */
  | { note: string }
  | { set: string; to?: Value }
  | { add: string; n: number }
  | { give: string; n?: number }
  | { lose: string; n?: number }
  | { gold: number }
  | { score: number; id: string }
  | { quest: string; stage: number }
  | { goto: string; x: number; y: number; dir?: Dir }
  | { die: string }
  | { teach: string }
  | { heal: number }
  | { hurt: number; why: string }
  | { hide: string }
  | { show: string }
  | { spawn: string; x: number; y: number; level?: number }
  /** Let the room's people come and go as things now stand, without the player having to leave and return. */
  | { muster: true }
  | { sound: string }
  | { run: string; arg?: Value }
  /** Carry on as if this line had been typed instead: one phrasing standing for another. */
  | { cmd: string }
  | { win: string }
  /** Run the effects only some of the time (0..1), by the game's seeded dice. */
  | { chance: number; do: Effect[] };

export interface Rule {
  /** Typed-command pattern(s): "verb noun noun", with * for any noun and a|b for alternatives. */
  on?: string | string[];
  /** Fires when the player enters the room. */
  enter?: boolean;
  /** Fires when the player steps into the named zone. */
  zone?: string;
  /** Fires when the last thing hostile in the room falls. Works in a room's rules and the game-wide ones. */
  cleared?: boolean;
  if?: Cond[];
  do: Effect[];
}

// ---------------------------------------------------------------------------------------------
// Rooms

export interface ThingDef {
  id: string;
  nouns: string[];
  x: number;
  y: number;
  /** How close the player must be to touch it. */
  reach?: number;
  look: string;
  /** Other descriptions, used instead while their conditions hold. The first that fits wins. */
  lookWhen?: LookWhen[];
  /** Item id gained by taking it. */
  take?: string;
  takeSay?: string;
  /** Not present until a rule shows it. */
  hidden?: boolean;
  /** Small picture drawn at its position. */
  icon?: string;
  /** Raise the picture this far, for things resting on furniture. */
  lift?: number;
  /** Commands worth offering when the player stands by it (shown as tappable suggestions). */
  try?: string[];
}

export interface LookWhen {
  if: Cond[];
  look: string;
}

export interface ZoneDef {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DoorDef {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  to: string;
  x: number;
  y: number;
  dir?: Dir;
  if?: Cond[];
  /** Said when the conditions fail. */
  locked?: string;
}

export interface NpcDef {
  char: string;
  x: number;
  y: number;
  dir?: Dir;
  /** Box to stroll around in: x0, y0, x1, y1. */
  wander?: [number, number, number, number];
  if?: Cond[];
}

export interface SpawnDef {
  id: string;
  kind: string;
  x: number;
  y: number;
  if?: Cond[];
  /** Ticks after its death before it is back. Never, if absent. */
  respawn?: number;
  /** How much tougher than usual: each level adds a quarter to its health and its blows. */
  level?: number;
  /** Only abroad after dark, or only by daylight. */
  when?: 'night' | 'day';
}

export interface RoomDef {
  id: string;
  name: string;
  look: string;
  lookWhen?: LookWhen[];
  scene: SceneDef;
  exits?: { n?: string; s?: string; e?: string; w?: string };
  doors?: DoorDef[];
  things?: ThingDef[];
  zones?: ZoneDef[];
  npcs?: NpcDef[];
  spawns?: SpawnDef[];
  rules?: Rule[];
  /** Pitch black unless the player carries light. */
  dark?: boolean;
  /** Which tune plays here. */
  music?: string;
  /** What to draw for this place on the map: wood, open, mere, water, village, farm, camp, tower, stone, barrow. */
  mark?: string;
  /** Extra nouns only this room needs: canonical word to synonyms. */
  vocab?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------------------------
// Everything else a game is made of

/**
 * What a character says: one line, or the first of several whose conditions hold. A `brief`
 * line is said in passing: no menu of things to ask follows it.
 */
export type Topic = string | { if?: Cond[]; say: string; do?: Effect[]; brief?: boolean }[];

export interface CharDef {
  id: string;
  name: string;
  nouns: string[];
  spec: CharSpec;
  look: string;
  lookWhen?: LookWhen[];
  talk: Topic;
  /** Answers to "ask <character> about <noun>", by canonical noun. */
  topics?: Record<string, Topic>;
  /** Said when asked about anything else. */
  shrug?: string;
  /** What the conversation menu offers: a label and the command it stands for. */
  menu?: { label: string; say: string; if?: Cond[] }[];
}

export interface ItemDef {
  id: string;
  name: string;
  nouns: string[];
  look: string;
  kind: 'misc' | 'weapon' | 'shield' | 'bow' | 'armor' | 'trinket' | 'potion' | 'tome' | 'key' | 'food';
  /**
   * What a trinket does for its wearer, in percent: harder blows (dmg), blows turned (armor),
   * faster mana (mana) or breath (stamina); or health returned per hundred seconds (regen).
   */
  mods?: Partial<Record<'dmg' | 'armor' | 'regen' | 'mana' | 'stamina', number>>;
  /** Damage for weapons; percent of harm turned aside for armour. */
  power?: number;
  /** What happens when it is used, drunk, read or eaten. */
  use?: Effect[];
  /** Used up by using it. */
  consumed?: boolean;
  /** What happens when somebody tries to put it on, for a thing that is not for wearing. */
  don?: Effect[];
  /** A ready-made command to offer (on touch screens) while this is carried and the conditions hold. */
  offer?: { label: string; say: string; if?: Cond[] };
}

export interface EnemyDef {
  id: string;
  name: string;
  nouns: string[];
  spec: CharSpec;
  look: string;
  hp: number;
  dmg: number;
  speed: number;
  /** How it behaves. Prey is not hostile: it grazes, and runs from anyone who comes near. */
  ai: 'wolf' | 'melee' | 'archer' | 'wight' | 'boss' | 'prey';
  /** How far its blows carry, if not the usual for its kind. Big things reach further. */
  reach?: number;
  /** One of the walking dead: there is a word that such things cannot abide. */
  undead?: boolean;
  /** What it hurls at anyone who keeps their distance, if anything. */
  throws?: 'arrow' | 'frost' | 'flame';
  /** The death message when it finishes the player. */
  kills: string;
  /** Effects run when it dies. */
  death?: Effect[];
}

export interface SpellDef {
  /** Also the noun typed after "cast". */
  id: string;
  name: string;
  cost: number;
  kind: 'bolt' | 'heal' | 'light' | 'ward';
  /** Damage, healing, or duration in ticks. */
  power: number;
  shot?: 'flame' | 'frost';
}

export interface WordDef {
  /** "word:" plus the verb. */
  id: string;
  /** The vocabulary verb that speaks it. */
  verb: string;
  /** What speaking it does. Smite strikes the dead and brings light. */
  kind: 'push' | 'freeze' | 'reveal' | 'smite';
  /** Ticks before it can be spoken again. */
  cooldown: number;
}

export interface PerkDef {
  id: string;
  skill: string;
  /** The skill level at which it is earned. */
  lv: number;
  name: string;
  text: string;
}

export interface QuestDef {
  id: string;
  name: string;
  /** Journal text per stage number. {flag.name} is filled in with that flag's value. */
  stages: Record<number, string>;
  done: number;
  /** Work that comes round again and is never finished for good. */
  repeats?: boolean;
}

export interface VocabDef {
  verbs: Record<string, string[]>;
  nouns: Record<string, string[]>;
  /** Words dropped before parsing. */
  ignore: string[];
}

/** Wording for one kind of generated country. */
export interface BiomeText {
  first: string[];
  second: string[];
  look: string[];
}

export interface FrontierDef {
  seed: number;
  /** Where each hand-made room sits on the map: x counts east, y counts south. */
  grid: Record<string, [number, number]>;
  /** Sides of hand-made rooms that open onto generated country, as letters from n, s, e, w. */
  gates: Record<string, string>;
  music: string;
  /** The tune for places where nothing is hunting you. */
  calm: string;
  /** The tune for the vaults under ruins. */
  under: string;
  /** How common each kind of country is, as weights. */
  odds: Record<string, number>;
  /** What is met in each kind of country: lists to draw from, the later ones further from home. */
  life: Record<string, string[][]>;
  /** Characters who live at lone steadings: one each, at the steadings nearest home, in this order. */
  folk: string[];
  /**
   * Creatures with a lair of their own: each is found in the country of the given kind nearest to
   * where one of the folk lives, while its conditions hold.
   */
  haunts?: { kind: string; near: string; biome: string; if?: Cond[] }[];
  /** The item gathered from the plants that grow out here, if any. */
  herb?: string;
  /** Game to be hunted, by kind of country: found there by day, some of the time. */
  game?: Record<string, string>;
  /** A rarer quarry that now and then stands in for the ordinary game, far enough from home. */
  rareGame?: { kind: string; odds: number; minDepth: number };
  /** Trinkets that may be found among the grave-goods in a vault. */
  trinkets?: string[];
  text: {
    pines: BiomeText;
    open: BiomeText;
    mere: BiomeText;
    ruin: BiomeText;
    camp: BiomeText;
    crags: BiomeText;
    deadwood: BiomeText;
    shrine: BiomeText;
    steading: BiomeText;
    /** The vaults under ruined towers. */
    crypt: BiomeText;
    snow: string[];
    sky: string[];
    trees: string[];
    /** Added to descriptions far from home. */
    deep: string;
    /** How a description ends: when every side can be walked out of, and when not all can. */
    waysAll: string;
    waysSome: string;
    // Descriptions of the things generated country can hold. %s is filled in where it appears.
    pond: string;
    tower: string;
    stones: string;
    tents: string;
    /** How a camp looks once nobody is left in it. */
    campQuiet: string;
    crag: string;
    deadtrees: string;
    shrineLook: string;
    shrineFar: string;
    hutLived: string;
    hutEmpty: string;
    hutDoorLived: string;
    hutDoorEmpty: string;
    waymark: string;
    chest: string;
    chestOpen: string;
    chestEmpty: string;
    herb: string;
    herbTake: string;
    bones: string;
    bonesSearch: string;
    bonesEmpty: string;
    wall: string;
    pillars: string;
    stairBelow: string;
    waymarkStone: string;
    shrineTake: string;
    /** Shown once, on first walking out into generated country. */
    firstStep: string;
    stair: string;
    stairWalk: string;
    cryptTreasure: string;
    cryptTake: string;
    cryptTaken: string;
    /** Said when taking the hoard wakes what was guarding it. */
    cryptWake: string;
    /** Said when a flagstone gives under the player's boot. */
    cryptTrap: string;
    /** %s is the trinket's name. */
    cryptTrinket: string;
    cryptRune: string;
    cryptRead: string;
    cryptReadAgain: string;
    cryptCoffins: string;
    cryptWayOut: string;
  };
}

export interface Content {
  title: string;
  /** One line under the title on the opening screen: 32 characters at most, to sit on a line. */
  tagline: string;
  /** Raise this when a change would make older saved games unsafe to load. */
  saveVersion: number;
  /** World flags as they stand before anything has happened. */
  flags?: Record<string, Value>;
  start: { room: string; x: number; y: number; dir: Dir };
  hero: CharSpec;
  vocab: VocabDef;
  rooms: Record<string, RoomDef>;
  chars: Record<string, CharDef>;
  items: Record<string, ItemDef>;
  enemies: Record<string, EnemyDef>;
  quests: Record<string, QuestDef>;
  spells: Record<string, SpellDef>;
  words: Record<string, WordDef>;
  perks: PerkDef[];
  /** Country beyond the hand-made map, generated as it is walked into. */
  frontier?: FrontierDef;
  /** Rules tried in every room, after the room's own. */
  rules: Rule[];
  /** System messages, by key. %s is replaced with a word. */
  text: Record<string, string>;
  /** Tunes by id, and which to play on the title screen and in a fight. */
  music: Record<string, TuneDef>;
  /**
   * `night`, if given, plays out of doors after dark in place of the room's own tune; `boss`, in
   * place of the battle tune while something of the boss kind is in the fight.
   */
  cues: { title: string; battle: string; fallback: string; night?: string; boss?: string };
  /** What THINK says when no task is open: the first whose conditions hold. */
  hints?: { if?: Cond[]; text: string }[];
  /** Things worth having done, listed (once done) by the DEEDS command. {flag.name} is filled in. */
  deeds?: { if?: Cond[]; text: string }[];
  /** Replies when nothing else understood the command. */
  fallbacks: string[];
  intro: string;
}

// ---------------------------------------------------------------------------------------------
// Saved state: plain data in three parts (player, rooms, world flags)

export type Act = 'idle' | 'walk' | 'swing' | 'block' | 'dead';

export interface ActorState {
  id: string;
  kind: 'npc' | 'enemy';
  /** Character or enemy id. */
  ref: string;
  x: number;
  y: number;
  dir: Dir;
  act: Act;
  frame: number;
  t: number;
  wait: number;
  tx: number;
  ty: number;
  hp: number;
  /** Scratch numbers for the actor's behaviour. */
  ai: Record<string, number>;
}

export interface RoomState {
  actors: ActorState[];
  /** Things taken or hidden. */
  gone: string[];
  /** Hidden things since revealed. */
  shown: string[];
  /** Spawn ids already defeated. */
  dead: string[];
  /** When each fell, for those that come back. */
  deadAt?: Record<string, number>;
  /** Arrows and bolts in flight. */
  shots: Shot[];
}

export interface Shot {
  x: number;
  y: number;
  dx: number;
  dy: number;
  from: 'player' | 'enemy';
  kind: 'arrow' | 'flame' | 'frost';
  dmg: number;
  life: number;
}

export interface Skill {
  lv: number;
  xp: number;
}

export interface PlayerState {
  x: number;
  y: number;
  dir: Dir;
  act: Act;
  frame: number;
  t: number;
  /** Direction currently being walked, from the last move intent. */
  mdx: number;
  mdy: number;
  blocking: boolean;
  hp: number;
  mp: number;
  sp: number;
  maxHp: number;
  maxMp: number;
  maxSp: number;
  level: number;
  xp: number;
  pendingLevels: number;
  skills: Record<string, Skill>;
  inv: Record<string, number>;
  weapon: string | null;
  shield: string | null;
  /** The weapon last put away, so the two can be swapped between without naming them. */
  other?: string | null;
  armor?: string | null;
  /** The one trinket worn. */
  trinket?: string | null;
  /** The tick at which the guard was last raised: a blow soon after is parried. */
  guardT?: number;
  /** How many times a smith has improved what is carried: each step sharpens the blade or thickens the mail. */
  temper?: { weapon: number; armor: number };
  spells: string[];
  words: string[];
  /** Ticks until each power can be used again. */
  cd: Record<string, number>;
  gold: number;
  /** Zones and doors the player is standing in, to fire them once on entry. */
  inside: string[];
  dead: boolean;
  /** Ticks of grace after being struck. */
  hurtT: number;
}

export interface GameState {
  v: 1;
  seed: number;
  rng: number;
  tick: number;
  room: string;
  player: PlayerState;
  rooms: Record<string, RoomState>;
  flags: Record<string, Value>;
  scored: string[];
  score: number;
  won: boolean;
}

// ---------------------------------------------------------------------------------------------
// Messages in and out of the simulation

export type Intent =
  | { t: 'move'; dx: number; dy: number }
  | { t: 'attack' }
  | { t: 'block'; on: boolean }
  /**
   * A typed line. `afoot` says the sender will walk the player over if the answer would otherwise
   * be that something is too far away: the simulation then asks for that walk instead of refusing.
   */
  | { t: 'say'; line: string; afoot?: boolean }
  | { t: 'level'; pool: 'hp' | 'mp' | 'sp' }
  /** How hard the world hits: gentle takes two fifths off every blow the player takes. */
  | { t: 'ease'; gentle: boolean };

export type SimEvent =
  /** Something to be read. `idle` marks news that keeps: it need not stop a fight to be told. */
  | { t: 'say'; text: string; who?: string; idle?: boolean }
  /** A conversation with this character has begun or continued. */
  | { t: 'talk'; char: string }
  /** A passing remark that does not stop play. */
  | { t: 'note'; text: string }
  | { t: 'sound'; id: string }
  | { t: 'room'; id: string }
  | { t: 'died'; text: string }
  | { t: 'won'; text: string }
  | { t: 'page'; title: string; lines: string[] }
  /** The player has asked to see the map. */
  | { t: 'map' }
  /** A typed line wants the player within `d` of a point first; the line is to be sent again there. */
  | { t: 'approach'; x: number; y: number; d: number; line: string };
