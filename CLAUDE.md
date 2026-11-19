# Thane's Quest

An open-world action RPG inside an early typing-adventure shell. `README.md` says how it plays and
how it is built.

## How to work here

There is no backlog, on purpose. Play the game before changing it (`npm run dev`, or `npm run shot`
and `npm run qa` without a browser), decide for yourself what is weakest or most promising, and
work on that. What an earlier session thought is not an instruction.

Nobody is playing the game yet, so merge your own work into `main` once it passes the checks below.
A push to `main` deploys the live game. This is to be revisited once real people are playing.

## What must hold

- **Everything stays original.** The world, names, characters, art, sound and text are the game's
  own. Nothing is taken from, or recognisably modelled on, an existing game.
- **The four rules under "How it is built" in the README.** The simulation is headless and
  deterministic, input is messages, state is plain data, content is data.
- **Every check the project has passes before anything is merged.** Today that is `npm test` and
  `npm run build`, which type-checks. Fix the code, or fix a check that is wrong; never skip or
  weaken one to get to green. Then see the change working in the game itself, not only in tests.
- **The README stays true and stays short.** It holds only what someone needs to run, play and
  build on the game. Change it in the same piece of work as the game, and cut what has stopped
  being essential.
