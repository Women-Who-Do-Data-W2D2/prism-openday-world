/* Shared vocabulary for the PRISM open day world: single poster hall layout */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
function readEnv(k) { try { const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp("^" + k + "=(.*)$", "m")); return m && m[1].trim(); } catch (e) { return null; } }
const BASE = (process.env.PAGES_BASE || readEnv("PAGES_BASE") || "https://Women-Who-Do-Data-W2D2.github.io/prism-openday-world").replace(/\/$/, "");

// Single poster hall - no track-based rooms
const ROOMS = {
  hall: {
    name: "PRISM Poster Hall",
    floor: ["#e8e4dc", "#e0dcd4"],
    face: "#8d8577",
    blurb: "12 PRISM teams presenting their research. Walk to a poster and press SPACE for details."
  }
};

// Wall colors for poster boards (subtle differentiation)
const WALLS = {
  north: { color: "#5b8def" },  // blue
  east: { color: "#e0a03c" },   // orange
  south: { color: "#48b38a" },  // green
  west: { color: "#e05c6c" }    // red
};

module.exports = { ROOT, BASE, ROOMS, WALLS, readEnv };
