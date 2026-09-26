#!/usr/bin/env node
/* Builds the PRISM open day poster hall as a WorkAdventure map.
   Single room with 12 team posters (3 per wall: N/S/E/W), spawn in center.
   Each is a Tiled JSON map at one tile per cell (32 px), with the
   generated tileset embedded. Reads tilesets/prism.json, content/teams.json.
   Writes maps/*.tmj and src/world.json.
   node scripts/build-maps.cjs */
"use strict";
const fs = require("fs"), path = require("path");
const { ROOT, BASE, ROOMS, WALLS } = require("./world.cjs");
const TS = JSON.parse(fs.readFileSync(path.join(ROOT, "tilesets", "prism.json"), "utf8"));
const teams = require(path.join(ROOT, "content", "teams.json"));
const SIZE = 32, gid = id => id + 1;
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
  grid(layer, g, x, y, collide) { if (!g) return; g.forEach((row, j) => row.forEach((id, i) => { this.set(layer, x + i, y + j, id); if (collide) this.set("collisions", x + i, y + j, TS.T.COLLIDE); })); }
  floor(x0, y0, w, h) { const pair = TS.floors[this.style] || TS.floors.hall; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set("floor", x, y, pair[(x + y) % 2]); }
  floorOne(x0, y0, w, h, id) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set("floor", x, y, id); }
  wall(x, y, id) { this.set("walls", x, y, id); this.set("collisions", x, y, TS.T.COLLIDE); }
  box(x0, y0, w, h, faceRows = 2) {
    const f = TS.faces[this.style] || TS.faces.hall;
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
  plants(cells) { for (const [x, y] of cells) { if (TS.furniture && TS.furniture.plant) { this.set("props", x, y, TS.furniture.plant); this.set("collisions", x, y, TS.T.COLLIDE); } } }
  build(desc) {
    let lid = 1; const tl = (name, data) => ({ id: lid++, name, type: "tilelayer", visible: true, opacity: 1, x: 0, y: 0, width: this.W, height: this.H, data });
    const layers = [tl("floor", this.L.floor), tl("decor", this.L.decor), tl("props", this.L.props), tl("walls", this.L.walls), tl("collisions", this.L.collisions)];
    for (const z of Object.keys(this.zones).sort()) layers.push(tl("zone-" + z, this.zones[z]));
    layers.push(tl("start", this.L.start));
    layers.push({ id: lid++, name: "floorLayer", type: "objectgroup", draworder: "topdown", visible: true, opacity: 1, x: 0, y: 0, objects: this.objects });
    const tileset = { columns: TS.cols, firstgid: 1, image: TS.file, imageheight: TS.height, imagewidth: TS.width, margin: 0, name: "prism", spacing: 0, tilecount: TS.tileCount, tileheight: SIZE, tilewidth: SIZE,
      tiles: [{ id: TS.T.COLLIDE, properties: [prop("collides", true)] }], properties: [prop("tilesetCopyright", "CC0, generated by scripts/tileset.cjs for the PRISM open day. Poster thumbnails belong to their authors.")] };
    return { compressionlevel: -1, height: this.H, width: this.W, infinite: false, layers, nextlayerid: lid, nextobjectid: this.oid, orientation: "orthogonal", renderorder: "right-down", tiledversion: "1.11.2", tileheight: SIZE, tilewidth: SIZE, type: "map", version: "1.10",
      properties: [prop("mapName", "PRISM Open Day · " + ROOMS[this.key].name), prop("mapDescription", desc), prop("mapCopyright", "Map CC BY 4.0 PRISM, Women Who Do Data. Tileset CC0. Posters belong to their authors."), prop("script", "../src/main.ts")], tilesets: [tileset] };
  }
}
const F = TS.furniture || {};

/* ---------- the poster hall: single room, 12 teams, 3 per wall ----------
   Every poster has its own call: step onto the tinted floor in front of a
   board and you join that team's video call; step off and you leave it.
   The call areas are 6 by 4 tiles (the board plus one tile each side) and
   sit at least 3 tiles from any other call area, corners included, so
   neighbouring conversations never overlap and there is room to walk
   between them. The centre, where visitors spawn, is outside every call. */
function hall() {
  const W = 48, H = 44, BOARD_W = 4, BOARD_H = 3, DEPTH = 4;
  const r = new Room("hall", W, H);
  r.floor(1, 3, W - 2, H - 4); r.box(0, 0, W, H, 2);
  if (TS.banners && TS.banners.hall) r.grid("decor", TS.banners.hall, Math.floor(W / 2) - 3, Math.floor(H / 2) - 4);

  const byWall = { north: [], east: [], south: [], west: [] };
  for (const t of teams) if (byWall[t.wall]) byWall[t.wall].push(t);
  for (const w of Object.keys(byWall)) byWall[w].sort((a, b) => a.position - b.position);

  const across = [13, 22, 31];     /* board x on the north and south walls: call areas x 12-17, 21-26, 30-35 */
  const down = [13, 21, 29];       /* board y on the west and east walls:  call areas y 12-16, 20-24, 28-32 */
  const calls = [];
  function poster(t, bx, by, zone) {
    if (TS.boards && TS.boards[t.slug]) r.grid("walls", TS.boards[t.slug], bx, by, true);
    const [zx, zy, zw, zh] = zone, tile = TS.callFloors && TS.callFloors[t.wall];
    if (tile) r.floorOne(zx, zy, zw, zh, tile);
    const label = t.mentor + ": " + short(t.title, 50);
    /* the SPACE spot is the row or column touching the board */
    const near = t.wall === "north" ? [bx, by + BOARD_H, BOARD_W, 1] : t.wall === "south" ? [bx, by - 1, BOARD_W, 1] : t.wall === "west" ? [bx + BOARD_W, by, 1, BOARD_H] : [bx - 1, by, 1, BOARD_H];
    r.website("poster-" + t.slug, ...near, BASE + "/pages/teams/" + t.slug + ".html", "Press SPACE to read about " + label);
    r.jitsi("call-" + t.slug, zx, zy, zw, zh, "PRISM-poster-" + t.slug);
    r.zone("team-" + t.slug, zx, zy, zw, zh);
    calls.push({ slug: t.slug, x0: zx, y0: zy, x1: zx + zw - 1, y1: zy + zh - 1 });
  }
  byWall.north.forEach((t, i) => poster(t, across[i], 4, [across[i] - 1, 4 + BOARD_H, BOARD_W + 2, DEPTH]));
  byWall.south.forEach((t, i) => { const by = H - 2 - BOARD_H; poster(t, across[i], by, [across[i] - 1, by - DEPTH, BOARD_W + 2, DEPTH]); });
  byWall.west.forEach((t, i) => poster(t, 1, down[i], [1 + BOARD_W, down[i] - 1, DEPTH, BOARD_H + 2]));
  byWall.east.forEach((t, i) => { const bx = W - 1 - BOARD_W; poster(t, bx, down[i], [bx - DEPTH, down[i] - 1, DEPTH, BOARD_H + 2]); });

  /* refuse to build if any two call areas come within 3 tiles of each other */
  const GAP = 3;
  for (let i = 0; i < calls.length; i++) for (let j = i + 1; j < calls.length; j++) {
    const a = calls[i], b = calls[j], dx = Math.max(0, b.x0 - a.x1 - 1, a.x0 - b.x1 - 1), dy = Math.max(0, b.y0 - a.y1 - 1, a.y0 - b.y1 - 1);
    if (Math.max(dx, dy) < GAP) { console.error("CALL AREAS TOO CLOSE:", a.slug, "and", b.slug, "gap", Math.max(dx, dy)); process.exit(1); }
  }

  r.plants([[1, 3], [W - 2, 3], [1, H - 2], [W - 2, H - 2]]);
  const sx = Math.floor(W / 2) - 1, sy = Math.floor(H / 2);
  for (const c of calls) if (sx + 1 >= c.x0 && sx <= c.x1 && sy + 1 >= c.y0 && sy <= c.y1) { console.error("SPAWN INSIDE A CALL:", c.slug); process.exit(1); }
  r.arrive(sx, sy, 2, 2);
  r.zone("hall", 1, 3, W - 2, H - 4);
  return r.build(ROOMS.hall.blurb);
}

fs.mkdirSync(path.join(ROOT, "maps"), { recursive: true });
const built = { hall: hall() };
const summary = [];
/* A map edited by hand in Tiled carries a map property handEdited = true; the generator then leaves that file alone. */
function handEdited(file) { try { const m = JSON.parse(fs.readFileSync(file, "utf8")); return (m.properties || []).some(p => p.name === "handEdited" && p.value === true); } catch (e) { return false; } }
for (const key in built) {
  const file = path.join(ROOT, "maps", key + ".tmj"), m = built[key];
  if (handEdited(file)) { summary.push({ map: key + ".tmj", size: "kept", objects: "hand-edited in Tiled, not regenerated" }); continue; }
  fs.writeFileSync(file, JSON.stringify(m)); summary.push({ map: key + ".tmj", size: m.width + "x" + m.height, objects: m.layers.find(l => l.name === "floorLayer").objects.length });
}
/* No exits to check in single-room layout */
const zones = { hall: "Welcome to the PRISM Poster Hall. Walk to a poster and press SPACE for details." };
for (const t of teams) zones["team-" + t.slug] = "You joined the call at " + t.mentor + "'s poster: " + t.title;
fs.mkdirSync(path.join(ROOT, "src"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "world.json"), JSON.stringify({ base: BASE, zones }, null, 1));
console.table(summary); console.log("teams:", teams.length, "· pages base:", BASE);
