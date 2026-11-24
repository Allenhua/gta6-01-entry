# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Allenhua/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Allenhua/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, set in the sun-soaked fictional city of Solmar Bay. Play as Dana "Daze" Cole: steal cars, outrun the Solmar Bay police, and run five chained missions — from a first hot-wired car at Gull & Gear to the big score at Bayfront Trust. All original: own city, characters, vehicles, story, art and synthesized sound. No Rockstar names, assets or music.

What is in the city:

- A drivable grid city with roads, buildings, Pelican Park, a beach and the docks
- On foot (WASD) and by car (E to get in and out, WASD to drive), with traffic cars and pedestrians that react to you
- Car stealing, a wanted level with police cars that chase and ram, and heat that cools off out of sight
- Five chained story missions with markers, a minimap and a HUD (health, cash, stars, objective)
- Combat: fists (F) and a pistol (mouse aim, click to fire) against rival Breakers
- Start screen, pause, game over / busted, a story ending, and autosave to localStorage
- Synthesized WebAudio sound: engine hum, sirens, gunshots and a looping bassline — no audio files

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests — everything is static files under `game/`.

Screenshots are staged from the real game with `?shot=start|play|chase|mission&seed=1`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
