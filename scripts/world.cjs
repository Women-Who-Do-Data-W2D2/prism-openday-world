/* Shared vocabulary for the PRISM open day world: the four tracks, the five
   rooms, and where the placard pages are served from. */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
function readEnv(k) { try { const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp("^" + k + "=(.*)$", "m")); return m && m[1].trim(); } catch (e) { return null; } }
const BASE = (process.env.PAGES_BASE || readEnv("PAGES_BASE") || "https://Women-Who-Do-Data-W2D2.github.io/prism-openday-world").replace(/\/$/, "");
const TRACKS = {
  technical: { name: "Interpretability", color: "#5b8def" },
  evals: { name: "Evaluations & Red Teaming", color: "#e0a03c" },
  frontier: { name: "AI Control & Monitoring", color: "#e05c6c" },
  governance: { name: "AI Safety & Governance", color: "#48b38a" }
};
const ROOMS = {
  lobby: { name: "The Lobby", floor: ["#d9d2c3", "#d1c9b8"], face: "#8d7b66", blurb: "Welcome desk, programme, directory, and one door to each poster room." },
  posters: { name: "The Poster Foyer", floor: ["#e3e4e6", "#dadbdf"], face: "#6f7480", blurb: "Not a room by itself any more - just the shared floor and wall style the four poster track rooms use.", listed: false },
  "posters-technical": { name: "Interpretability", style: "posters", track: "technical", blurb: "Interpretability for Scientific Causal Reasoning · Do Rules and Concepts Hold Across Languages? · Interpreting Personalized Reward Model Bases" },
  "posters-evals": { name: "Evaluations & Red Teaming", style: "posters", track: "evals", blurb: "Multilingual Safety Evals · Red-Teaming Protein Foundation Models · Trust Calibration in Healthcare AI" },
  "posters-frontier": { name: "AI Control & Monitoring", style: "posters", track: "frontier", blurb: "Synchronous Monitoring for AI Control · Estimating Harm and Exposure for AI Harm Monitoring · Decision Update Consistency in LLMs" },
  "posters-governance": { name: "AI Safety & Governance", style: "posters", track: "governance", blurb: "How AI Labs Redefine Safety · Grounding Safe-by-Design AI · Preference Drift in Language Models" }
};
const SHORT = { technical: "Interp", evals: "Evals", frontier: "Control", governance: "Governance" };
module.exports = { ROOT, BASE, TRACKS, ROOMS, SHORT, readEnv };
