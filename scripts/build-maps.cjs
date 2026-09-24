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

/* ---------- the poster hall: single room, 12 teams, 3 per wall ---------- */
function hall() {
  /*
   * Layout: ~28x28 room with 12 poster boards (3 per wall)
   * North wall: teams at positions 1,2,3 (y=4, x varies)
   * South wall: teams at positions 1,2,3 (y=H-7, x varies)
   * East wall: teams at positions 1,2,3 (x=W-5, y varies)
   * West wall: teams at positions 1,2,3 (x=1, y varies)
   * Spawn in center
   */
  const W = 28, H = 28;
  const r = new Room("hall", W, H);
  r.floor(1, 3, W - 2, H - 4); r.box(0, 0, W, H, 2);

  // Hall banner in center near spawn (on floor/decor layer)
  if (TS.banners && TS.banners.hall) {
    r.grid("decor", TS.banners.hall, Math.floor(W / 2) - 6, Math.floor(H / 2) - 1);
  }

  // Group teams by wall
  const byWall = { north: [], east: [], south: [], west: [] };
  for (const t of teams) {
    if (byWall[t.wall]) byWall[t.wall].push(t);
  }
  // Sort by position within each wall
  for (const wall of Object.keys(byWall)) {
    byWall[wall].sort((a, b) => a.position - b.position);
  }

  // Poster board dimensions: 4 wide x 3 tall (from tileset)
  const BOARD_W = 4, BOARD_H = 3;

  // North wall: posters face south (boards at y=4, interaction below)
  const northX = [4, 12, 20]; // x positions for 3 posters
  byWall.north.forEach((t, i) => {
    const x = northX[i], y = 4;
    if (TS.boards && TS.boards[t.slug]) {
      r.grid("walls", TS.boards[t.slug], x, y, true);
    }
    // Interaction zone in front of poster (south of board)
    r.website("poster-" + t.slug, x, y + BOARD_H, BOARD_W, 1, BASE + "/pages/teams/" + t.slug + ".html", "Press SPACE: " + t.mentor + " — " + short(t.title, 50));
    // Jitsi zone for isolated video chat
    r.jitsi("call-" + t.slug, x, y + BOARD_H, BOARD_W, 3, "PRISM-" + t.slug);
    r.zone("team-" + t.slug, x, y + BOARD_H, BOARD_W, 3);
  });

  // South wall: posters face north (boards at y=H-7, interaction above)
  const southY = H - 7;
  byWall.south.forEach((t, i) => {
    const x = northX[i], y = southY;
    if (TS.boards && TS.boards[t.slug]) {
      r.grid("walls", TS.boards[t.slug], x, y, true);
    }
    // Interaction zone in front of poster (north of board)
    r.website("poster-" + t.slug, x, y - 1, BOARD_W, 1, BASE + "/pages/teams/" + t.slug + ".html", "Press SPACE: " + t.mentor + " — " + short(t.title, 50));
    // Jitsi zone for isolated video chat
    r.jitsi("call-" + t.slug, x, y - 3, BOARD_W, 3, "PRISM-" + t.slug);
    r.zone("team-" + t.slug, x, y - 3, BOARD_W, 3);
  });

  // West wall: posters face east (boards at x=1, interaction to right)
  // Each board is 3 tiles tall, 2 tile gap between, start at y=8 to clear north posters (end at y=7)
  const westY = [8, 13, 18]; // y positions for 3 posters
  byWall.west.forEach((t, i) => {
    const x = 1, y = westY[i];
    if (TS.boards && TS.boards[t.slug]) {
      r.grid("walls", TS.boards[t.slug], x, y, true);
    }
    // Interaction zone in front of poster (east of board)
    r.website("poster-" + t.slug, x + BOARD_W, y, 1, BOARD_H, BASE + "/pages/teams/" + t.slug + ".html", "Press SPACE: " + t.mentor + " — " + short(t.title, 50));
    // Jitsi zone for isolated video chat
    r.jitsi("call-" + t.slug, x + BOARD_W, y, 3, BOARD_H, "PRISM-" + t.slug);
    r.zone("team-" + t.slug, x + BOARD_W, y, 3, BOARD_H);
  });

  // East wall: posters face west (boards at x=W-5, interaction to left)
  byWall.east.forEach((t, i) => {
    const x = W - 5, y = westY[i];
    if (TS.boards && TS.boards[t.slug]) {
      r.grid("walls", TS.boards[t.slug], x, y, true);
    }
    // Interaction zone in front of poster (west of board)
    r.website("poster-" + t.slug, x - 1, y, 1, BOARD_H, BASE + "/pages/teams/" + t.slug + ".html", "Press SPACE: " + t.mentor + " — " + short(t.title, 50));
    // Jitsi zone for isolated video chat
    r.jitsi("call-" + t.slug, x - 3, y, 3, BOARD_H, "PRISM-" + t.slug);
    r.zone("team-" + t.slug, x - 3, y, 3, BOARD_H);
  });

  // Plants in corners
  r.plants([[1, 3], [W - 2, 3], [1, H - 2], [W - 2, H - 2]]);

  // Spawn point in center
  r.arrive(Math.floor(W / 2) - 1, Math.floor(H / 2), 2, 2);
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
for (const t of teams) zones["team-" + t.slug] = t.mentor + "'s team: " + t.title;
fs.mkdirSync(path.join(ROOT, "src"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "world.json"), JSON.stringify({ base: BASE, zones }, null, 1));
console.table(summary); console.log("teams:", teams.length, "· pages base:", BASE);
