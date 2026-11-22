# Thane's Quest

An open-world action RPG inside an early typing-adventure shell. You walk a small frozen valley,
fight in real time, and do everything else by clicking, tapping or pressing a number. Or by
typing, which does all of that and a good deal more.

Everything in it is original: the world, names, characters, art, sound and text.

## Run it

```bash
npm install
npm run dev
```

Then open the address Vite prints (normally http://localhost:5173/).

A built copy is hosted at https://thanes-quest.daventry.io. Saves are kept by the browser, for
the address they were made at.

A push to `main` goes live by itself: Cloudflare runs the tests and builds it
(`npm test && npm run build`), then deploys it (`npx wrangler deploy`). A failing test stops the
deploy, and what is live stays. `npm run deploy` still publishes by hand, without the tests.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with debug commands enabled |
| `npm test` | Unit tests plus a headless play-through of the whole game |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run deploy` | Build and publish to Cloudflare (needs `wrangler login`) |

## How to play

- **Arrow keys** walk. (The menu can switch this to tap-to-start, tap-to-stop.) A click or a tap on
  the picture walks to that spot, round whatever is in the way; on a door it goes in, and at the
  edge of the picture it walks off into the next one. On somebody, it walks over and talks to
  them; on a thing, it takes it, or looks at it; on something hostile, it strikes if it is within
  the blow and closes with it if not. A mouse shows a hand over whatever a click would do more
  than walk to.
- **Nothing has to be typed.** Under the picture (or beside it, in a short window) is a row of
  numbered buttons offering what can be done where you stand: who to talk to, what to take or try,
  the runewords and spells you know, the map. Click one, or press its number on an empty typing
  line (1 to 9, then 0). Bag and Menu buttons sit at the end of the row.
- **Ctrl** swings your weapon, or looses an arrow if a bow is in hand. **Space** does the same
  when the typing line is empty.
- **Shift** (held) raises a guard: you cannot walk, but you can turn, and blows from the front
  mostly bounce.
- **Tab** opens your bag (so does typing `inventory`): a row for each thing carried with its
  weight, how full the pack is, and your silver. Choose a thing to read about it and to drink, eat,
  read, use, ready, wear, take off, drop, or put in a chest. The bag also lists what lies on the
  ground where you stand, and what is in the chest there, to take back.
  **Esc** opens the menu (bag, map, journal, character, deeds, save, restore, settings, how to
  play, start again; the settings are music, sound effects, how walking works, and whether fights
  are fair or gentle). Whatever the menu opens comes back to the menu when it is closed; Resume,
  or Esc on the menu itself, goes back to the game.
- **Typing is the richer way to play.** It reaches everything the buttons do and a great deal
  they do not: things to ask about that no menu lists, things to try that nothing offers, and
  most of the jokes. Enter sends the line; Enter on an empty line repeats the last one.
  Naming something across the picture (`talk to smith`, `read sign`) walks you over to it first,
  round whatever is in the way and never onto ground that would hurt you; an arrow key stops the
  walk. Looking is done from where you stand. Walking can be typed too: `go north` (or `n`) walks
  off that side of the picture, `go to the inn` or `enter hall` goes in at its door, `leave` goes
  back out, and `go to sigga` walks over to her.
- **F1** is help, **F2** turns sound on and off, **F3** brings back your last line to edit, **F4**
  is the map.
- **The mouse** also answers a message (click it), picks a row from a menu, and looks about the
  map: a click on a place names it, and a click off the map closes it.
- **Looking away pauses the game.** When the window or tab loses focus the world stops; any key,
  click or tap goes on.

Some things to type: `look`, `look at sign`, `take hatchet`, `equip hatchet`, `talk to woman`,
`ask elder about barrow`, `read tome`, `cast flame`, `buy sword`, `wear torc`, `swap` (changes
between your last two weapons), `map`, `exits`, `think`, `journal`, `skills` (the character
sheet), `deeds`, `time`, `save`, `help`.

**Carrying.** A pack holds 35 to begin with. A wolf pelt weighs 3, a bearskin 15, a draught 1, a
sword 6, mail 20; silver weighs nothing, and so does anything a story needs, which can never be
put down. What is in hand or worn is not in the pack. A full pack takes nothing more: loot that
will not fit stays where it fell, and sellers will not sell what will not fit. Eat, sell (Odd buys
back what he made; Fenn takes back books you have read), `drop` things (they stay where they are
put, to be taken again), or keep them in the chest at the inn (`put pelts in chest`, `take sword
from chest`). `weigh` tells what something weighs. Three things let you carry more: a pack Brekka
the trapper makes from six wolf pelts, every level put into Stamina, and something found far out
in the wild.

There are six skills, and they rise only by use: swing to raise Blade, shoot to raise Archery,
block to raise Block, cast to raise Sorcery, heal yourself to raise Mending, read runes and books
(and speak runewords) to raise Lore. Skill gains raise your level, and each level lets you add to
Health, Mana or Stamina. Runewords are learned from standing stones and spoken by typing the word.

Talking to someone opens a menu of things to say, buy or give; you can also type `ask <name>
about <thing>` for subjects the menu does not list.

On a phone or tablet the page adds a thumb pad, Hit / Guard / OK / Bag / Menu buttons, a command
field that uses the device's keyboard, and a row of buttons offering what can be done where you
stand. Held upright, the space between the picture and the controls shows the game's words in
large type: the open message or page (tap it to go on), the open menu as rows to tap, and with
nothing open, the last few things said. Add `?touch` to the address to see that layout on a
computer. Added to a phone's home
screen, the game opens full screen.

Fights reward timing. An enemy about to strike shows a gold `!`; raise your guard while it shows
and the blow is parried, leaving the attacker open. The health bar flashes when you are badly
hurt, and swinging with no breath left lands weak blows until you catch it. Each skill grants a
perk at three levels (the character sheet, `skills`, lists what you have earned). The line under the typing
line shows what is in your hands, the runewords you know, and any boon still on you (Ward, Might,
Light).

Eight hand-made outdoor screens are the valley, with a screen of road between each and the
next, so the valley is five screens by five. (The ninth, the old watchtower, stands two screens
beyond its mouth, on the south road.) The roads are generated, and
gentle: a path through, and its description says where it leads; by day perhaps a wolf, by night
nothing. Walk off the valley's edge and new country is generated a screen at a time: the same
place every time you return, and tougher the further you go. It comes in nine kinds (pinewoods,
open fells, frozen meres, ruins, reaver camps, crags, dead woods, shrines and lone steadings), with
their own creatures, people to trade with, and things to find. Near home much of it has nothing
living in it by day (the quieter music says so); further out, less and less does. Whatever is
hunting you follows you from one screen into the next, a little behind, until you are back in the
valley or at a haven (a shrine, or a steading where somebody lives).

Six screens out from the middle, past every place with a name, the land rises in a wall of rock
that rings the whole country: a march. It is crossed only at two passes on each side, each held by
reavers, a wolf pack or the dead, and nobody goes through while one of them stands. Once beaten, a
pass stays open. There are more marches further out (rings 10, 15, 21, 28, 36 and 45), each
tougher. On its north side the second is the last: it runs on east and west without end, and has
no passes, only a gate. `map` shows everywhere you have been, as one sheet of country with the places that have
names of their own drawn large, where you stand framed in red, anywhere you have been sent marked
with a gold pennant, and the walls of the marches with the gaps where passes go through; the
arrow keys look about it. There is a day and a night, it snows, and there is music (Esc opens the menu to
switch music or sound effects off).

The first story, The Cold Hearth, ends with a fire lit and a ring given. That does not finish
the game:

- **The forge.** With the hearth lit, Odd will temper your blade and armour, for more silver each time.
- **The Elder's work.** Marta sends a Thane to places in the wild that want dealing with, each
  further out and better paid than the last. They are marked on the map.
- **People.** Three live out at lone steadings (a trapper, an old hunter, a herb-wife). Each
  trades, tells what lies nearby, and has something they want and something worth having.
- **Vaults.** Ruined towers have dark vaults under them: take a light. Some hold trinkets, which
  are worn one at a time.
- **Things to find.** Eighteen small scenes written by hand stand once each somewhere in the
  generated country: a cold camp with a kettle, a signpost where no roads meet, a sledge, a sleeping
  bear, a ferry-horn by a frozen mere, a bread oven in a ruin, a door with no house round it.
  Each can be looked at and tried, and each shows something more to the word ORUN. Two of them send
  the finder back to the village with something for somebody.
- **Hunting.** By day there are deer in the woods and by the meres. They bolt if you come close;
  a bow does not have to.
- **Night.** It comes round every few minutes, and more walks in the wild after dark. `time`
  tells the hour; the line across the top shows a sun or a moon at its left-hand end, then the
  score, the silver you carry, and health, mana and stamina.
- **A second story, Where the Wind Stops**, which the Elder begins the morning after: it is
  still colder every day, and she can count. It goes south beyond the first wall for a word that
  shows only at night, and then north through a gate nobody living has passed, to where the snow
  hangs in the air. It can end in two ways. And three places with names of their own, a long way
  north, east and south.
- **The way home.** A new Thane is given a hearth-ember: `use ember` anywhere it is quiet.

`deeds` lists what you have done so far. It only ever grows.

The game saves itself each time you enter a room ("Last room" in the restore menu), keeps a
second save from the last place nothing was hunting you ("Last safe place"), and has three
manual slots. You can die. It is usually funny, and always your own fault.

### Debug commands (development server only)

`/tp <room>` jumps to a room, `/give <item>` adds an item, `/set <flag> [value]` sets a world flag,
`/pos` reports where you are.

## How it is built

No runtime dependencies: TypeScript, a 320x200 indexed framebuffer drawn to a canvas, and WebAudio.

```
src/main.ts          browser boot: canvas, keyboard, sound, frame loop
src/sound.ts         square-wave jingles
src/touch.ts         on-screen controls for phones and tablets; pointing at the picture, and
                     the numbered buttons, for a desktop
src/music.ts         synthesiser and sequencer that plays the tunes
src/engine/          the engine; nothing in here knows about this particular game
  sim.ts             the simulation: state, the tick, rooms, movement
  combat.ts magic.ts fighting, skills, spells, runewords
  commands.ts        what a typed line does
  parser.ts rules.ts the parser, and the condition/effect language rooms are written in
  shell.ts           the player's side: typing line, message boxes, menus, saving
  render.ts          draws a frame from simulation + shell state
  build.ts layers.ts props.ts scenery.ts indoors.ts scene.ts   pictures composed from data
  doll.ts icons.ts font.ts palette.ts               characters, item icons, text, colour
  frontier.ts walk.ts generates country beyond the hand-made map, on demand; what can be walked
  tune.ts            the notation tunes are written in
  noise.ts           seeded noise and hashing, for pictures and for generated country
  validate.ts        checks content before it is played
  types.ts           the data model
src/game/            the game itself, as data
  content.ts         items, enemies, spells, quests, global rules; assembles everything
  data/rooms/        the hand-made screens: the valley and the old watchtower (world.ts), their
                     interiors (inside.ts), three landmarks far out (far.ts), and the gate in
                     the north wall with the road beyond it (north.ts)
  data/cast.ts       characters and their dialogue
  data/vocab.ts      every word the parser knows
  data/text.ts       system messages, the help page and the opening words
  data/music.ts      nine original tunes, as data
  data/frontier.ts   where the hand-made places stand, settings and wording for generated country
                     (the valley's roads among it), and the hand-written sights that stand in it
  behaviours.ts      the few named behaviours data cannot express
tests/               engine tests and the walkthrough bot
tools/               QA scripts: screenshots without a browser, and measurements (see below);
                     icon.ts draws the home-screen icons
public/              the web app manifest, home-screen icons and link-preview picture (card.png,
                     drawn by `npm run shot -- public/card.png card village --night`), copied as they are
art-test/            the original three-style art comparison (reference only, not shipped)
```

Four rules shape the code, so that a larger, shared, growing world stays possible:

1. **The simulation is headless and deterministic.** No DOM, no clock, no `Math.random`; a seeded
   generator and a fixed 20 ticks per second. The same inputs always give the same game.
2. **Input is messages.** Keys become small intent records (`move`, `attack`, `say`, ...) that are
   queued into the simulation. They could as easily arrive over a network.
3. **State is plain data** in three parts: the player, each room, and world flags. That is the save
   file.
4. **Content is data, not code.** A room is one record: a picture described as layers and props,
   exits, doors, things, characters, enemies, and rules of the form "when the player types this,
   if these hold, do these". `validate.ts` checks every record (words exist, exits lead somewhere
   and back, everything can actually be walked to) before it is played.

### Adding an item

Items are in `src/game/content.ts`. Every item needs a `weight` (the validator says so if one is
missing): a pelt is 3, a sword 6, mail 20, a pack holds 35. Give `keep` (true, or the line said
when somebody tries to put it down) to anything a story needs: it must weigh 0, and can never be
dropped, stored or left behind. `carry` makes a kept item raise what can be carried. The limit
itself is `carry` in the same file. Give an item from a rule with `{ give: 'pelt', took: 'You take
the pelt.' }`: what will not fit is left on the ground, and `took` is said only if all of it was taken.
A rule that pays silver for an item is refused when it will not fit, in the seller's `full` line.

### Adding a room

1. Write a `RoomDef` in `src/game/data/rooms/`. Compose the picture from layer types in
   `layers.ts` and prop types in `props.ts` / `scenery.ts`; `indoors.ts` has roofs, hearths and
   furnishings for rooms with a roof on.
2. Add it to `roomList` in `src/game/content.ts` and link it with `exits` (both directions) or `doors`.
   An outdoor place goes on the map instead: a cell in `grid`, and the sides that open onto the
   country round it in `gates`, both in `src/game/data/frontier.ts`.
3. Add any new nouns to `src/game/data/vocab.ts`.
4. Run `npm test`. The validator will say what is unreachable, misspelled or missing.

### Adding something to find in the wild

The generated country holds "sights": small scenes written by hand, each standing once, in the
nearest country to home of a kind that suits it. They are the `sights` list in
`src/game/data/frontier.ts`, and one more is one more entry: where it may stand, the sentence that
gets it noticed, what is drawn, the thing itself, and its rules (written exactly as a room's are;
`near: '<its id>'` means standing by it). The engine places it, names the place after it and walks
the player to it. Give each something to read, something to try, and something only ORUN shows.

Two things to know. A sight gives no score: the walkthrough test must earn every score award the
content declares, and it does not go looking for these. And `npm test` checks every sight's words
against the vocabulary, tries what each offers, and walks to each from across its screen.

## QA tools

Four scripts stand in for hours of play. (Three are bundled with the esbuild that Vite brings. The
fourth drives a real browser on the development server, and needs Playwright and a Chromium, which
are not dependencies of the game.)

```
npm run shot -- out.png sheet village inn wild_2_1 --night   # screens as a PNG, no browser
npm run shot -- out.png room camp 200 150 --spawn bear --cmd "look" --keep

npm run play -- :new look ":go north" "talk to sigga" ":pick 2"   # play in text; tools/play.ts lists the commands

node tools/browser.cjs serve &                                     # play in a real browser: one kept open...
node tools/browser.cjs "talk to sigga" ":choose elder" ":shot hall"  # ...and driven a line at a time (the file lists the commands)

npm run qa -- fights     # how players of two skill levels fare in each fight, by kit
npm run qa -- campaign   # a mortal bot takes the Elder's work again and again: does growth keep pace?
npm run qa -- soak 80    # an unkillable bot walks 80 frontier screens looking for breakage
npm run qa -- run        # a new Thane who never fights runs for it each way: how far do they get?
npm run qa -- fuzz       # random keys and commands for 100,000 ticks: any crash is a bug
npm run qa -- country    # what the frontier generates: kinds of country, creatures, finds
npm run qa -- phrases    # plausible things to type that got no proper answer
npm run qa -- words      # words used in descriptions that the parser does not know
npm run qa -- menus      # every row of every conversation menu must get a real reply
npm run qa -- tries      # every command a thing offers, and LOOK at every thing, must be answered
npm run qa -- music      # clashing notes and loop lengths in each tune
npm run qa -- export wild_3_1 > room.json   # any room, as the plain data it is
npm run qa -- room room.json                # the gate a room from anywhere must pass
```

## Tests

`npm test` runs engine tests (parser, rules, combat, magic, saving, validation, the frontier),
`tests/valley.test.ts` (the roads between the valley's places, and where difficulty begins),
`tests/wild.test.ts` (pursuit, the marches and their passes, and quiet country), and
`tests/walkthrough.test.ts`, in which a pathfinding bot plays the game using only
keyboard-equivalent intents:

- the first story, twice, checking both runs end in identical state;
- the first story again with the game saved and restored every two seconds, which must change nothing;
- the first story with a deliberately slow hand that never guards, which must still survive;
- everything after it (the Elder's work, the forge, all three steading quests, all three landmarks,
  and the second story from Fenn's sum to the cup at the end of the bench), ending with every
  score award the content declares having been earned;
- a walk out into generated country, a fight there, and the walk back.

Every generated room within seven screens of the valley, and every vault under them, is also put
through the same validator as the hand-made rooms.

The last of those walkthroughs is a contract worth knowing about before adding to the story: it
ends by checking that every quest is finished and every score award anywhere in the content has
been earned. A new quest, or a new `score` effect, needs the bot in `tests/walkthrough.test.ts`
taught to do it. Things that are only there to be found should give no score.
