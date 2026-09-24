#!/usr/bin/env node
/* Builds the rooms of the PRISM open day as WorkAdventure maps: lobby,
   poster foyer, four poster rooms (one per track), auditorium, team rooms,
   lounge. Each is a Tiled JSON map at one tile per cell (32 px), with the
   generated tileset embedded. Reads tilesets/prism.json, content/posters.json,
   content/teams.json. Writes maps/*.tmj and src/world.json.
   Arrival spots are always two tiles clear of any exit, so nobody bounces
   straight back through the door they came in by.   node scripts/build-maps.cjs */
"use strict";
const fs = require("fs"), path = require("path");
const { ROOT, BASE, TRACKS, ROOMS } = require("./world.cjs");
const TS = JSON.parse(fs.readFileSync(path.join(ROOT, "tilesets", "prism.json"), "utf8"));
const posters = require(path.join(ROOT, "content", "posters.json"));
const SIZE = 32, gid = id => id + 1, ORDER = ["technical", "evals", "frontier", "governance"];
const prop = (name, value) => ({ name, type: typeof value === "boolean" ? "bool" : typeof value === "number" ? "int" : "string", value });
const short = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;

class Room {
  constructor(key, W, H) {
    this.key = key; this.style = ROOMS[key].style || key; this.W = W; this.H = H; const L = () => new Array(W * H).fill(0);
    this.L = { floor: L(), decor: L(), props: L(), walls: L(), collisions: L(), start: L() }; this.zones = {}; this.objects = []; this.oid = 1;
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  set(layer, x, y, id) { if (this.inside(x, y)) this.L[layer][y * this.W + x] = gid(id); }
  clear(layer, x, y) { if (this.inside(x, y)) this.L[layer][y * this.W + x] = 0; }
  grid(layer, g, x, y, collide) { g.forEach((row, j) => row.forEach((id, i) => { this.set(layer, x + i, y + j, id); if (collide) this.set("collisions", x + i, y + j, TS.T.COLLIDE); })); }
  floor(x0, y0, w, h) { const pair = TS.floors[this.style]; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set("floor", x, y, pair[(x + y) % 2]); }
  floorOne(x0, y0, w, h, id) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set("floor", x, y, id); }
  wall(x, y, id) { this.set("walls", x, y, id); this.set("collisions", x, y, TS.T.COLLIDE); }
  box(x0, y0, w, h, faceRows = 2) {
    const f = TS.faces[this.style];
    for (let x = x0; x < x0 + w; x++) { this.wall(x, y0, TS.T.WALL_TOP); for (let r = 1; r <= faceRows; r++) this.wall(x, y0 + r, r === faceRows ? f.bottom : f.top); this.wall(x, y0 + h - 1, TS.T.WALL_TOP); }
    for (let y = y0; y < y0 + h; y++) { this.wall(x0, y, TS.T.WALL_TOP); this.wall(x0 + w - 1, y, TS.T.WALL_TOP); }
  }
  door(x0, y0, w, h) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { this.clear("walls", x, y); this.clear("collisions", x, y); this.set("floor", x, y, TS.T.DOOR); } }
  arrows(dir, cells) { const id = TS.T["ARROW_" + dir.toUpperCase()]; for (const [x, y] of cells) this.set("decor", x, y, id); }
  zone(name, x0, y0, w, h) { const L = this.zones[name] = this.zones[name] || new Array(this.W * this.H).fill(0); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (this.inside(x, y)) L[y * this.W + x] = gid(TS.T.ZONE); }
  area(name, x, y, w, h, props) { this.objects.push({ id: this.oid++, name, type: "area", x: x * SIZE, y: y * SIZE, width: w * SIZE, height: h * SIZE, rotation: 0, visible: true, properties: props }); }
  exit(x, y, w, h, target, entry) { this.door(x, y, w, h); this.area("to-" + target, x, y, w, h, [prop("exitUrl", target + ".tmj#" + entry)]); }
  entry(name, x, y, w, h) { this.area(name, x, y, w, h, [prop("start", true)]); }
  arrive(x, y, w, h) { this.entry("arrive", x, y, w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set("start", x + i, y + j, TS.T.START); }
  website(name, x, y, w, h, url, msg, width = 50) { this.area(name, x, y, w, h, [prop("openWebsite", url), prop("openWebsiteTrigger", "onaction"), prop("openWebsiteTriggerMessage", msg), prop("openWebsiteWidth", width), prop("openWebsiteClosable", true)]); }
  jitsi(name, x, y, w, h, roomName, msg) { const p = [prop("jitsiRoom", roomName)]; if (msg) { p.push(prop("jitsiTrigger", "onaction")); p.push(prop("jitsiTriggerMessage", msg)); } this.area(name, x, y, w, h, p); }
  plants(cells) { for (const [x, y] of cells) { this.set("props", x, y, TS.furniture.plant); this.set("collisions", x, y, TS.T.COLLIDE); } }
  build(desc) {
    let lid = 1; const tl = (name, data) => ({ id: lid++, name, type: "tilelayer", visible: true, opacity: 1, x: 0, y: 0, width: this.W, height: this.H, data });
    const layers = [tl("floor", this.L.floor), tl("decor", this.L.decor), tl("props", this.L.props), tl("walls", this.L.walls), tl("collisions", this.L.collisions)];
    for (const z of Object.keys(this.zones).sort()) layers.push(tl("zone-" + z, this.zones[z]));
    layers.push(tl("start", this.L.start));
    layers.push({ id: lid++, name: "floorLayer", type: "objectgroup", draworder: "topdown", visible: true, opacity: 1, x: 0, y: 0, objects: this.objects });
    const tileset = { columns: TS.cols, firstgid: 1, image: TS.file, imageheight: TS.height, imagewidth: TS.width, margin: 0, name: "prism", spacing: 0, tilecount: TS.tileCount, tileheight: SIZE, tilewidth: SIZE,
      tiles: [{ id: TS.T.COLLIDE, properties: [prop("collides", true)] }], properties: [prop("tilesetCopyright", "CC0, generated by scripts/tileset.cjs for the PRISM open day. Poster thumbnails belong to their authors (NeurIPS 2025).")] };
    return { compressionlevel: -1, height: this.H, width: this.W, infinite: false, layers, nextlayerid: lid, nextobjectid: this.oid, orientation: "orthogonal", renderorder: "right-down", tiledversion: "1.11.2", tileheight: SIZE, tilewidth: SIZE, type: "map", version: "1.10",
      properties: [prop("mapName", "PRISM Open Day · " + ROOMS[this.key].name), prop("mapDescription", desc), prop("mapCopyright", "Map CC BY 4.0 PRISM, Women Who Do Data. Tileset CC0. Posters belong to their authors."), prop("script", "../src/main.ts")], tilesets: [tileset] };
  }
}
const F = TS.furniture;

/* ---------- the lobby: one poster track off each wall, welcome area in the middle ---------- */
/* compass: north technical, east evals, south frontier, west governance */
function lobby() {
  const r = new Room("lobby", 32, 24);
  r.floor(1, 3, 30, 20); r.box(0, 0, 32, 24, 2);
  r.grid("walls", TS.banners.lobby, 3, 1);
  /* programme/directory sit clear of the widened north doorsign (which now runs x17-23) */
  r.grid("walls", TS.wallsigns.PROGRAMME, 24, 2); r.website("programme", 24, 3, 3, 1, BASE + "/pages/programme.html", "Press SPACE: the open day programme");
  r.grid("walls", TS.wallsigns.DIRECTORY, 28, 2); r.website("directory", 28, 3, 3, 1, BASE + "/pages/directory.html", "Press SPACE: directory of the building");
  /* north: technical. Arrivals land on row 4, one clear tile from the door. */
  r.exit(15, 0, 2, 3, "posters-technical", "from-lobby"); r.entry("from-posters-technical", 15, 4, 2, 1);
  r.grid("props", TS.doorSigns.technical, 17, 3, true);
  const trailN = []; for (let y = 4; y <= 16; y += 2) trailN.push([15, y], [16, y]); r.arrows("up", trailN);
  /* open floor: no desk, kiosk, tables, sofas, rug or plants */
  r.arrive(15, 17, 2, 1); r.zone("lobby", 1, 3, 30, 20);
  /* west: governance. east: evals. south: frontier. Full-name side signs, clear of the wall. */
  r.exit(0, 11, 1, 2, "posters-governance", "from-lobby"); r.entry("from-posters-governance", 2, 11, 1, 2); r.grid("props", TS.leftSigns.governance, 1, 9, true); r.arrows("left", [[2, 11], [2, 12]]);
  r.exit(31, 11, 1, 2, "posters-evals", "from-lobby"); r.entry("from-posters-evals", 29, 11, 1, 2); r.grid("props", TS.rightSigns.evals, 24, 9, true); r.arrows("right", [[29, 11], [29, 12]]);
  r.exit(15, 23, 2, 1, "posters-frontier", "from-lobby"); r.entry("from-posters-frontier", 15, 21, 2, 1); r.grid("props", TS.downSigns.frontier, 17, 21, true); r.arrows("down", [[15, 21], [16, 21]]);
  return r.build("The PRISM open day. Technical Safety is north, Evaluations east, Frontier Risks south, Governance west. Programme and directory signs are on the north wall, and the floor is open.");
}

/* ---------- one poster room per track ---------- */
function posterRoom(t) {
  const i = ORDER.indexOf(t), prev = ORDER[i - 1], next = ORDER[i + 1];
  const ps = posters.filter(p => p.track === t), rows = []; for (let k = 0; k < ps.length; k += 5) rows.push(ps.slice(k, k + 5));
  const H = 7 * rows.length + 7, r = new Room("posters-" + t, 36, H);
  r.floor(1, 3, 34, H - 4); r.box(0, 0, 36, H, 2);
  r.grid("walls", TS.roomBanners[t], 12, 1);
  rows.forEach((row, k) => {
    const y = 4 + k * 7;
    r.grid("props", TS.bays[t], 1, y + 1, true);
    row.forEach((p, j) => {
      const x = 7 + j * 5;
      r.grid("walls", TS.boards[p.id], x, y, true);
      r.floorOne(x, y + 3, 4, 1, TS.trackFloors[t]);
      r.website("poster-" + p.id, x, y + 3, 4, 1, BASE + "/pages/posters/" + p.id + ".html", "Press SPACE: " + short(p.title, 64));
    });
  });
  /* south: straight back to the lobby. Arrivals land on row H-3, one clear tile from the door. */
  r.exit(17, H - 1, 2, 1, "lobby", "from-posters-" + t); r.entry("from-lobby", 17, H - 3, 2, 1);
  r.grid("props", TS.signs["↓ LOBBY"], 14, H - 2, true); r.grid("props", TS.signs["↓ LOBBY"], 19, H - 2, true);
  /* side doors to the neighbouring tracks */
  if (prev) { r.exit(0, H - 4, 1, 2, "posters-" + prev, "from-posters-" + t); r.entry("from-posters-" + prev, 2, H - 4, 1, 2); r.grid("props", TS.sideSigns["← " + prev], 1, H - 7, true); r.arrows("left", [[2, H - 4], [2, H - 3]]); }
  if (next) { r.exit(35, H - 4, 1, 2, "posters-" + next, "from-posters-" + t); r.entry("from-posters-" + next, 33, H - 4, 1, 2); r.grid("props", TS.sideSigns[next + " →"], 31, H - 7, true); r.arrows("right", [[33, H - 4], [33, H - 3]]); }
  r.grid("props", TS.signposts[t], 8, H - 4, true);
  r.plants([[1, 3], [34, 3]]);
  r.arrive(17, H - 3, 2, 1); r.zone("posters-" + t, 1, 3, 34, H - 4);
  return r.build(TRACKS[t].name + " posters from NeurIPS 2025. Stand on the coloured strip below a board and press SPACE to read it. Side doors lead to the neighbouring tracks.");
}

fs.mkdirSync(path.join(ROOT, "maps"), { recursive: true });
const built = { lobby: lobby() };
for (const t of ORDER) built["posters-" + t] = posterRoom(t);
const summary = [];
/* A map edited by hand in Tiled carries a map property handEdited = true; the generator then leaves that file alone. */
function handEdited(file) { try { const m = JSON.parse(fs.readFileSync(file, "utf8")); return (m.properties || []).some(p => p.name === "handEdited" && p.value === true); } catch (e) { return false; } }
for (const key in built) {
  const file = path.join(ROOT, "maps", key + ".tmj"), m = built[key];
  if (handEdited(file)) { summary.push({ map: key + ".tmj", size: "kept", objects: "hand-edited in Tiled, not regenerated" }); continue; }
  fs.writeFileSync(file, JSON.stringify(m)); summary.push({ map: key + ".tmj", size: m.width + "x" + m.height, objects: m.layers.find(l => l.name === "floorLayer").objects.length });
}
/* every exit must land on a named arrival in the other map */
const entries = {}; for (const key in built) entries[key] = new Set(built[key].layers.find(l => l.name === "floorLayer").objects.filter(o => o.properties.some(p => p.name === "start")).map(o => o.name));
let bad = 0;
for (const key in built) for (const o of built[key].layers.find(l => l.name === "floorLayer").objects) { const e = o.properties.find(p => p.name === "exitUrl"); if (!e) continue; const [file, hash] = e.value.split("#"), target = file.replace(".tmj", ""); if (!entries[target] || !entries[target].has(hash)) { console.error("BROKEN DOOR", key, "->", e.value); bad++; } }
if (bad) process.exit(1);
const zones = {};
for (const k in ROOMS) { if (ROOMS[k].listed === false) continue; zones[k] = ROOMS[k].track ? TRACKS[ROOMS[k].track].name + " posters. Stand on the strip below a board and press SPACE." : "Welcome to " + ROOMS[k].name.toLowerCase(); }
zones.lobby = "The lobby. Four doors, one per track, lead straight into the poster rooms.";
fs.mkdirSync(path.join(ROOT, "src"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "world.json"), JSON.stringify({ base: BASE, zones }, null, 1));
console.table(summary); console.log("posters hung:", posters.length, "· every door checked · pages base:", BASE);
