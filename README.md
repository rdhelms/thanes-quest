# Thane's Quest

An open-world action RPG inside an early typing-adventure shell. You walk a small frozen valley
with the arrow keys, fight in real time, and do everything else by typing.

Everything in it is original: the world, names, characters, art, sound and text.

## Run it

```bash
npm install
npm run dev
```

Then open the address Vite prints (normally http://localhost:5173/).

A built copy is hosted at https://thanes-quest.daventry.io (and, as before, at
https://thanes-quest.<account>.workers.dev). Saves are kept by the browser for the address
they were made at, so a game saved at one is not seen at the other.

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
  edge of the picture it walks off into the next one.
- **Ctrl** swings your weapon, or looses an arrow if a bow is in hand. **Space** does the same
  when the typing line is empty.
- **Shift** (held) raises a guard: you cannot walk, but you can turn, and blows from the front
  mostly bounce.
- **Tab** shows what you carry. **Esc** opens the menu (map, journal, skills, deeds, save, restore,
  how to play, start again, and settings: music, sound effects, how walking works, and whether
  fights are fair or gentle).
- **Everything else is typed.** Enter sends the line; Enter on an empty line repeats the last one.
  Naming something across the picture (`talk to smith`, `read sign`) walks you over to it first,
  round whatever is in the way and never onto ground that would hurt you; an arrow key stops the
  walk. Looking is done from where you stand.
- **F1** is help, **F2** turns sound on and off, **F3** brings back your last line to edit, **F4**
  is the map.
- **The mouse** also answers a message (click it), picks a row from a menu, and looks about the
  map: a click on a square names it, and a click off the map closes it.
- **Looking away pauses the game.** When the window or tab loses focus the world stops; any key,
  click or tap goes on.

Some things to type: `look`, `look at sign`, `take hatchet`, `equip hatchet`, `talk to woman`,
`ask elder about barrow`, `read tome`, `cast flame`, `buy sword`, `wear torc`, `swap` (changes
between your last two weapons), `map`, `exits`, `think`, `journal`, `skills`, `deeds`, `time`,
`save`, `help`.

There are six skills, and they rise only by use: swing to raise Blade, shoot to raise Archery,
block to raise Block, cast to raise Sorcery, heal yourself to raise Mending, read runes and books
(and speak runewords) to raise Lore. Skill gains raise your level, and each level lets you add to
Health, Mana or Stamina. Runewords are learned from standing stones and spoken by typing the word.

Talking to someone opens a menu of things to say, buy or give; you can also type `ask <name>
about <thing>` for subjects the menu does not list.

On a phone or tablet the page adds a thumb pad, Hit / Guard / OK / Bag / Menu buttons, a command
field that uses the device's keyboard, and a row of buttons offering what can be done where you
stand. Add `?touch` to the address to see that layout on a computer. Added to a phone's home
screen, the game opens full screen.

Fights reward timing. An enemy about to strike shows a gold `!`; raise your guard while it shows
and the blow is parried, leaving the attacker open. The health bar flashes when you are badly
hurt, and swinging with no breath left lands weak blows until you catch it. Each skill grants a
perk at three levels (the `skills` page lists what you have earned). The line under the typing
line shows what is in your hands, the runewords you know, and any boon still on you (Ward, Might,
Light).

The nine hand-made outdoor screens are only the middle of the map. Walk off any open edge and
new country is generated a screen at a time: the same place every time you return, and tougher
the further you go. It comes in nine kinds (pinewoods, open fells, frozen meres, ruins, reaver
camps, crags, dead woods, shrines and lone steadings), with their own creatures, people to trade
with, and things to find. `map` shows everywhere you have been. There is a day and a night, it
snows, and there is music (Esc opens the menu to switch music or sound effects off).

Finishing the first saga does not finish the game:

- **The forge.** With the hearth lit, Odd will temper your blade and armour, for more silver each time.
- **The Elder's work.** Marta sends a Thane to places in the wild that want dealing with, each
  further out and better paid than the last. They are marked on the map.
- **People.** Three live out at lone steadings (a trapper, an old hunter, a herb-wife). Each
  trades, tells what lies nearby, and has something they want and something worth having.
- **Vaults.** Ruined towers have dark vaults under them: take a light. Some hold trinkets, which
  are worn one at a time.
- **Things to find.** Nine small scenes written by hand stand once each somewhere in the generated
  country: a cold camp with a kettle, a signpost where no roads meet, a sledge, a sleeping bear.
  Each can be looked at and tried, and each shows something more to the word ORUN. Two of them send
  the finder back to the village with something for somebody.
- **Hunting.** By day there are deer in the woods and by the meres. They bolt if you come close;
  a bow does not have to.
- **Night.** It comes round every few minutes, and more walks in the wild after dark. `time`
  tells the hour; the status line shows a sun or a moon.
- **A second saga**, for anyone still carrying the Barrow-King's crown once the Elder's first
  task is done. **And a third**, which the Elder begins when the second is over, and which has no
  fights in it. And three places with names of their own, a long way north, east and south; one
  of them holds a fourth runeword, for whoever is there at the right hour.
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
src/touch.ts         on-screen controls for phones and tablets
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
  data/rooms/        the hand-made screens: the valley, its interiors, and four places far out
  data/cast.ts       characters and their dialogue
  data/vocab.ts      every word the parser knows
  data/text.ts       system messages, the help page and the opening words
  data/music.ts      nine original tunes, as data
  data/frontier.ts   settings and wording for generated country, and the hand-written sights that stand in it
  behaviours.ts      the few named behaviours data cannot express
tests/               engine tests and the walkthrough bot
tools/               QA scripts: screenshots without a browser, and measurements (see below);
                     icon.ts draws the home-screen icons
public/              the web app manifest and home-screen icons, copied into the build as they are
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

### Adding a room

1. Write a `RoomDef` in `src/game/data/rooms/`. Compose the picture from layer types in
   `layers.ts` and prop types in `props.ts` / `scenery.ts`; `indoors.ts` has roofs, hearths and
   furnishings for rooms with a roof on.
2. Add it to `roomList` in `src/game/content.ts` and link it with `exits` (both directions) or `doors`.
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

`npm test` runs engine tests (parser, rules, combat, magic, saving, validation, the frontier) and
`tests/walkthrough.test.ts`, in which a pathfinding bot plays the game using only
keyboard-equivalent intents:

- the first saga, twice, checking both runs end in identical state;
- the first saga again with the game saved and restored every two seconds, which must change nothing;
- the first saga with a deliberately slow hand that never guards, which must still survive;
- everything after it (the Elder's work, the forge, all three steading quests, all three landmarks
  and the second saga), ending with every score award the content declares having been earned;
- a walk out into generated country, a fight there, and the walk back.

Every generated room within seven screens of the valley, and every vault under them, is also put
through the same validator as the hand-made rooms.

The last of those walkthroughs is a contract worth knowing about before adding to the story: it
ends by checking that every quest is finished and every score award anywhere in the content has
been earned. A new quest, or a new `score` effect, needs the bot in `tests/walkthrough.test.ts`
taught to do it. Things that are only there to be found should give no score.
