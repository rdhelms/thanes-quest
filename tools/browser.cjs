// QA tool: plays the game in a real browser, from the command line.
//
// It is in two halves, because a browser has to stay open between commands:
//
//   npm run dev &                                  the game, with its debug hooks
//   node tools/browser.cjs serve &                 a browser on it, kept open (saves kept on disk)
//   node tools/browser.cjs look "talk to sigga" ":choose elder" ":shot hall"
//
// Anything without a colon is typed and sent, as a player would; message boxes are printed and
// answered, and a menu is printed and left open. The game is paused between runs (as it is for
// anyone who looks away), so nothing bites while the next line is being thought about.
//
//   :choose <words>     pick the menu row containing these words      :pick N   pick row N
//   :key <Key> [times]  press a key (Escape, Tab, Enter, ArrowUp...)  :hold <Key> <ms>
//   :go <x> <y>         walk to a point in the picture (320x200), as a click would
//   :door [room]        walk through a door (to the room named, or the only one)
//   :travel <north|south|east|west> [screens]   walk off the edge, fighting and drinking on the way
//   :fight [ms] [fleeHp]   guard when a blow is coming, otherwise close and swing
//   :shot <name>        a screenshot, saved under node_modules/.cache/thanes-quest/browser/
//   :wait <ms>          :settle (read whatever boxes are up)          :status
//   :new                start a new game                              :load <file>   continue a saved game from a file
//
// If the page has been reloaded (the development server does that when a file changes), the title
// menu is up: ":choose continue" takes the game up again from its last room.
//
// Every run ends by saying where the player is, how they are, who is about and what can be tried.
//
// Real keys and clicks go to the page. The development build's `window.game` is read only to know
// when a box or a menu is up, where things stand, and when a walk is over. PORT moves the control
// port (7777); VIEW=WxH and TOUCH=1 set the window, for the phone layout (add ?touch to the address).
//
// Needs Playwright and a Chromium, which are not dependencies of the game: `npm i -D playwright`
// and `npx playwright install chromium` where they are not already on the machine.

const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 7777);
const URL0 = 'http://localhost:5173/';
const CACHE = path.join(__dirname, '..', 'node_modules', '.cache', 'thanes-quest', 'browser');

// ---------------------------------------------------------------------------------------------
// The browser, kept open: actions arrive over HTTP as a JSON list.

const serve = async () => {
  const { chromium } = require('playwright');
  const touch = !!process.env.TOUCH;
  const [vw, vh] = (process.env.VIEW || '640x430').split('x').map(Number);
  // A profile kept on disk, so saved games outlive this process.
  const ctx = await chromium.launchPersistentContext(path.join(CACHE, 'profile'), { viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  let page = await ctx.newPage();
  const logs = [];
  const hook = (p) => {
    p.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  };
  hook(page);
  await page.goto(process.argv[3] || 'http://localhost:5173/');

  const run = async (acts) => {
    const out = [];
    for (const a of acts) {
      if (a.goto) { await page.goto(a.goto); }
      else if (a.type !== undefined) { await page.keyboard.type(a.type, { delay: a.delay ?? 25 }); if (!a.noEnter) await page.keyboard.press('Enter'); }
      else if (a.press) { for (let i = 0; i < (a.times ?? 1); i++) { await page.keyboard.press(a.press); await page.waitForTimeout(a.gap ?? 60); } }
      else if (a.hold) { await page.keyboard.down(a.hold); await page.waitForTimeout(a.ms ?? 300); await page.keyboard.up(a.hold); }
      else if (a.down) { await page.keyboard.down(a.down); }
      else if (a.up) { await page.keyboard.up(a.up); }
      else if (a.wait) { await page.waitForTimeout(a.wait); }
      else if (a.click) { await page.mouse.click(a.click[0], a.click[1]); }
      else if (a.tap) { await page.touchscreen.tap(a.tap[0], a.tap[1]); }
      else if (a.tapText) { const el = page.getByText(a.tapText, { exact: !!a.exact }).first(); await el.tap(); }
      else if (a.shot) { const f = path.join(CACHE, a.shot + '.png'); await page.screenshot({ path: f }); out.push(f); }
      else if (a.eval) { out.push(await page.evaluate(a.eval)); }
      else if (a.viewport) { await page.setViewportSize(a.viewport); }
    }
    return out;
  };

  http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', async () => {
      try {
        const out = await run(JSON.parse(body || '[]'));
        res.end(JSON.stringify({ out, logs: logs.splice(0) }));
      } catch (e) { res.statusCode = 500; res.end(String(e && e.stack || e)); }
    });
  }).listen(PORT, '127.0.0.1', () => console.log(`browser ready on ${PORT}`));
};

// ---------------------------------------------------------------------------------------------
// The player: commands in, what the game said out.

const post = async (acts) => {
  const r = await fetch(`http://127.0.0.1:${PORT}/`, { method: 'POST', body: JSON.stringify(acts) });
  const j = JSON.parse(await r.text());
  // What the page logs is passed on, except the development server's own chatter.
  for (const l of j.logs) if (!l.includes('[vite]')) console.log('LOG', l);
  return j.out;
};
const modal = async () => {
  const [s] = await post([{ eval: `(() => { const m = game.shell.modal; if (!m) return 'null'; const o = { ...m }; delete o.pick; delete o.onCancel; return JSON.stringify(o); })()` }]);
  return JSON.parse(s);
};
const status = async () => {
  const [s] = await post([{ eval: `(() => { const s = game.shell.sim.state, p = s.player; const inv = Object.entries(p.inv).map(([k, n]) => k + (n > 1 ? 'x' + n : '')).join(' '); return game.shell.sim.room.name + ' [' + s.room + '] at ' + Math.round(p.x) + ',' + Math.round(p.y) + ' | hp ' + Math.round(p.hp) + '/' + p.maxHp + ' mp ' + Math.round(p.mp) + '/' + p.maxMp + ' sp ' + Math.round(p.sp) + '/' + p.maxSp + ' | lvl ' + p.level + ' gold ' + p.gold + ' score ' + s.score + ' | ' + (p.weapon || 'unarmed') + (p.armor ? '+' + p.armor : '') + (p.trinket ? '+' + p.trinket : '') + ' | ' + inv + ' | note: ' + game.shell.noteText; })()` }]);
  return s;
};
// Answer message boxes (printing them) until a menu is waiting or nothing is.
const settle = async () => {
  let quiet = 0;
  for (let i = 0; i < 60 && quiet < 3; i++) {
    await post([{ wait: 180 }]);
    const m = await modal();
    if (!m) { const [busy] = await post([{ eval: 'game.shell.busy' }]); quiet = busy ? 0 : quiet + 1; continue; }
    quiet = 0;
    if (m.k === 'msg') { console.log((m.who ? `[${m.who}] ` : '') + m.text + (m.more ? ' (more)' : '')); await post([{ press: 'Enter' }]); }
    else if (m.k === 'page') { console.log(`== ${m.title} ==\n` + m.lines.join('\n')); await post([{ press: 'Enter' }]); }
    else if (m.k === 'list') { console.log(`MENU ${m.title}: ` + m.items.map((t, n) => (n === m.sel ? '>' : '') + t).join(' / ')); return; }
    else { console.log('MODAL ' + JSON.stringify(m)); return; }
  }
};
const PAUSE = `(() => { const m = game.shell.modal; if (!(m && m.k === 'msg' && m.any) && !game.shell.sim.state.player.dead) window.dispatchEvent(new Event('blur')); return 1; })()`;
const resume = async () => { const m = await modal(); if (m && m.k === 'msg' && m.any) await post([{ press: 'Enter' }]); };
const SNAP = `(() => { const s = game.shell.sim.state, p = s.player, r = s.rooms[s.room]; const prey = (a) => (game.content.enemies[a.ref] || {}).ai === 'prey'; const es = (r ? r.actors : []).filter((a) => a.kind === 'enemy' && a.act !== 'dead' && a.hp > 0 && !prey(a)).map((a) => ({ ref: a.ref, x: a.x, y: a.y, hp: a.hp, wind: a.ai && a.ai.wind, hostile: true })); return JSON.stringify({ x: p.x, y: p.y, dir: p.dir, hp: p.hp, sp: p.sp, dead: p.dead, modal: !!game.shell.modal, es }); })()`;
// A plain fighter: guards when a near enemy winds up, otherwise closes and swings. Stops if hurt below fleeHp.
const fight = async (ms, fleeHp) => {
  const t0 = Date.now(); let guarding = false, swings = 0, guards = 0;
  const arrow = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) * 1.2 ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : (dy < 0 ? 'ArrowUp' : 'ArrowDown'));
  const dirOf = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  let why = 'time';
  while (Date.now() - t0 < ms) {
    const s = JSON.parse((await post([{ eval: SNAP }]))[0]);
    if (s.dead) { why = 'dead'; break; }
    if (s.modal) { why = 'box'; break; }
    if (!s.es.length) { why = 'clear'; break; }
    if (s.hp < fleeHp) { why = 'hurt'; break; }
    const near = s.es.map((e) => ({ ...e, dx: e.x - s.x, dy: e.y - s.y, d: Math.hypot(e.x - s.x, e.y - s.y) })).sort((a, b) => a.d - b.d);
    const threat = near.find((e) => e.wind > 0 && e.d < 40);
    if (threat) {
      const k = arrow(threat.dx, threat.dy);
      if (!guarding) { await post([{ down: 'Shift' }]); guarding = true; guards++; }
      if (dirOf[k] !== s.dir) await post([{ hold: k, ms: 60 }]);
      await post([{ wait: 40 }]);
      continue;
    }
    if (guarding) { await post([{ up: 'Shift' }]); guarding = false; }
    const e = near[0];
    const k = arrow(e.dx, e.dy);
    const inReach = (k === 'ArrowLeft' || k === 'ArrowRight') ? Math.abs(e.dx) < 26 && Math.abs(e.dy) <= 7 : Math.abs(e.dy) < 13 && Math.abs(e.dx) <= 13;
    if (inReach) {
      if (dirOf[k] !== s.dir) await post([{ hold: k, ms: 60 }]);
      await post([{ press: 'Control' }, { wait: 120 }]); swings++;
    } else {
      // click-walk to a spot beside it on its row: the game's own path-finding goes round what is in the way
      const tx = e.x + (e.dx < 0 ? 18 : -18);
      await post([{ click: [Math.round(2 * tx), Math.round(2 * e.y + 30)] }, { wait: 160 }]);
    }
  }
  if (guarding) await post([{ up: 'Shift' }]);
  const s = JSON.parse((await post([{ eval: SNAP }]))[0]);
  console.log(`fight ended (${why}) after ${((Date.now() - t0) / 1000).toFixed(1)}s: swings ${swings}, guards ${guards}, hp ${s.hp.toFixed(1)}, sp ${s.sp.toFixed(0)}, enemies left ${JSON.stringify(s.es.map((e) => e.ref + ':' + e.hp.toFixed(0)))}`);
};
const ROOM = `(() => { const s = game.shell.sim.state, p = s.player; const sc = game.shell.sim.scene(); return JSON.stringify({ room: s.room, name: game.shell.sim.room.name, x: p.x, y: p.y, top: sc.walkTop, hp: p.hp, max: p.maxHp, potion: p.inv.potion || 0, dead: p.dead }); })()`;
// Walk off the edge of the picture, screen after screen, fighting whatever comes and drinking when hurt.
const travel = async (dir, n) => {
  for (let k = 0; k < n; k++) {
    let r = JSON.parse((await post([{ eval: ROOM }]))[0]);
    const from = r.room;
    const cx = Math.max(24, Math.min(296, r.x)), cy = Math.max(r.top + 8, Math.min(156, r.y)); const aim = () => ({ west: [2, cy], east: [317, cy], north: [cx, r.top + 1], south: [cx, 166] }[dir]);
    let moved = false;
    for (let t = 0; t < 260 && !moved; t++) {
      r = JSON.parse((await post([{ eval: ROOM }]))[0]);
      if (r.dead) { await settle(); console.log('DIED'); return; }
      if (r.room !== from) { moved = true; break; }
      const mm = await modal();
      if (mm && mm.k === 'list') {
        // A level: take whichever pool is smallest. Any other menu is for me to answer.
        if (!mm.title.startsWith('You have grown stronger')) { console.log('stopped at a menu: ' + mm.title); return; }
        const [pools] = await post([{ eval: '(() => { const p = game.shell.sim.state.player; return JSON.stringify([p.maxHp / 2, p.maxMp, p.maxSp]); })()' }]);
        const v = JSON.parse(pools); const i = v.indexOf(Math.min(v[0], v[2])) === 0 ? 0 : 2;
        await post([{ press: 'ArrowDown', times: i }, { press: 'Enter' }, { wait: 150 }]);
        console.log('level: raised ' + ['Health', 'Mana', 'Stamina'][i]);
        continue;
      }
      if (mm) { await settle(); continue; }
      const s = JSON.parse((await post([{ eval: SNAP }]))[0]);
      const close = s.es.filter((e) => e.hostile && Math.hypot(e.x - s.x, (e.y - s.y) * 2) < 150);
      if (close.length) {
        if (r.hp < r.max * 0.45 && r.potion) { await post([{ type: 'drink draught' }]); await settle(); }
        await fight(12000, 0);
        await settle();
        continue;
      }
      if (t % 12 === 0) { const [x, y] = aim(); await post([{ eval: `game.shell.walkTo(${Math.round(x)}, ${Math.round(y)}), 1` }]); }
      await post([{ wait: 150 }]);
    }
    await settle();
    r = JSON.parse((await post([{ eval: ROOM }]))[0]);
    console.log(moved ? `-> ${r.name} [${r.room}] hp ${Math.round(r.hp)}/${r.max}` : `could not go ${dir} from ${from}`);
    if (!moved) return;
  }
};
const play = async (cmds) => {
  await resume();
  for (const c of cmds) {
    console.log(`\n> ${c}`);
    if (!c.startsWith(':')) {
      const m = await modal();
      if (m) { console.log('(a box or menu is up; not typing) ' + JSON.stringify(m).slice(0, 200)); continue; }
      await post([{ type: c }]);
      await settle();
      continue;
    }
    const [op, ...a] = c.slice(1).split(' ');
    if (op === 'pick' || op === 'choose') {
      const m = await modal();
      if (!m || m.k !== 'list') { console.log('no menu'); continue; }
      const want = op === 'pick' ? Number(a[0]) - 1 : m.items.findIndex((t) => t.toLowerCase().includes(a.join(' ').toLowerCase()));
      if (want < 0 || want >= m.items.length) { console.log('no such row: ' + m.items.join(' / ')); continue; }
      const d = want - m.sel;
      if (d) await post([{ press: d > 0 ? 'ArrowDown' : 'ArrowUp', times: Math.abs(d) }]);
      await post([{ press: 'Enter' }]);
      await settle();
    } else if (op === 'walk') {
      const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[a[0]];
      await post([{ hold: key, ms: Number(a[1] ?? 500) }]);
      await settle();
    } else if (op === 'click') { await post([{ click: [Number(a[0]), Number(a[1])] }, { wait: Number(a[2] ?? 1500) }]); await settle(); }
    else if (op === 'key') { await post([{ press: a[0], times: Number(a[1] ?? 1) }]); await settle(); }
    else if (op === 'hold') { await post([{ hold: a[0], ms: Number(a[1] ?? 500) }]); }
    else if (op === 'wait') { await post([{ wait: Number(a[0]) }]); await settle(); }
    else if (op === 'shot') { console.log((await post([{ shot: a[0] }]))[0]); }
    else if (op === 'settle') { await settle(); }
    else if (op === 'fight') { await fight(Number(a[0] ?? 20000), Number(a[1] ?? 12)); await settle(); }
    else if (op === 'travel') { await travel(a[0], Number(a[1] ?? 1)); }
    else if (op === 'go') { await post([{ eval: `game.shell.walkTo(${Number(a[0])}, ${Number(a[1])}), 1` }]); for (let i = 0; i < 60; i++) { await post([{ wait: 150 }]); const [w] = await post([{ eval: '!!game.shell.heading || !!game.shell.modal' }]); if (!w || (await modal())) break; } await settle(); }
    else if (op === 'door') {
      const [d] = await post([{ eval: `(() => { const ds = game.shell.sim.room.doors || []; const d = ds.find((k) => k.to.includes('${a[0] ?? ''}')) || ds[0]; if (!d) return 'none'; game.shell.walkTo(Math.round((d.x0 + d.x1) / 2), Math.round((d.y0 + d.y1) / 2)); return d.to; })()` }]);
      const [from] = await post([{ eval: 'game.shell.sim.state.room' }]);
      for (let i = 0; i < 80; i++) { await post([{ wait: 150 }]); const [now] = await post([{ eval: 'game.shell.sim.state.room' }]); if (now !== from || (await modal())) break; }
      console.log('door to ' + d); await settle();
    }
    else if (op === 'load') {
      // A saved game from a file (the JSON a save slot holds), put where "Continue" will find it.
      const save = fs.readFileSync(a[0], 'utf8');
      await post([{ eval: `localStorage.setItem('thanes-quest:save:auto', ${JSON.stringify(save)}), 1` }, { goto: URL0 }, { wait: 1200 }, { press: 'Enter' }, { wait: 600 }]);
    }
    else if (op === 'new') { await post([{ goto: URL0 }, { wait: 1200 }, { press: 'ArrowUp' }, { press: 'Enter' }, { wait: 500 }]); await settle(); }
    else if (op === 'status') { /* printed below */ }
    else console.log('unknown ' + op);
  }
  console.log('\n' + (await status()));
  const [e] = await post([{ eval: `(() => { const s = game.shell.sim.state, r = s.rooms[s.room]; return JSON.stringify((r ? r.actors : []).filter((a) => a.hp === undefined || a.hp > 0).map((a) => a.ref + (a.kind === 'enemy' ? '!' : '') + '@' + Math.round(a.x) + ',' + Math.round(a.y))); })()` }]);
  const [t] = await post([{ eval: `(() => { const sim = game.shell.sim; return JSON.stringify(sim.things().filter((t) => t.take || (t.try && t.try.length)).map((t) => t.nouns[0] + '@' + t.x + ',' + t.y)); })()` }]);
  console.log('here: ' + e + ' things: ' + t);
  await post([{ eval: PAUSE }]);
};

if (process.argv[2] === 'serve') {
  fs.mkdirSync(CACHE, { recursive: true });
  serve();
} else {
  play(process.argv.slice(2)).catch((e) => {
    console.error(String(e && e.cause && e.cause.code === 'ECONNREFUSED' ? 'No browser is being served. Start one with: node tools/browser.cjs serve &' : (e && e.stack) || e));
    process.exit(1);
  });
}
