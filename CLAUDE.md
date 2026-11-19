# Thane's Quest

An open-world action RPG inside an early typing-adventure shell. `README.md` says how it plays and
how it is built.

## How to work here

There is no backlog, on purpose. Play the game before changing it (`npm run dev`, or `npm run shot`
and `npm run qa` without a browser), decide for yourself what is weakest or most promising, and
work on that. What an earlier session thought is not an instruction.

## What must hold

- **Everything stays original.** The world, names, characters, art, sound and text are the game's
  own. Nothing is taken from, or recognisably modelled on, an existing game.
- **The four rules under "How it is built" in the README.** The simulation is headless and
  deterministic, input is messages, state is plain data, content is data.
- **`npm test` passes before anything is pushed.** Fix the game, or fix a test that is wrong; never
  skip or weaken one to get to green.
- **`main` is the live game.** A push there deploys to players. Work on a branch; the owner merges.
- **Players have saves.** Prefer changes that old saves still load under. When saved state has to
  change shape, raise `saveVersion` in `src/game/content.ts` so old saves read as empty instead of
  loading wrongly, and say so when handing the work over.
- **The README stays true.** When how the game plays or how it is built changes, change the README
  in the same piece of work.
