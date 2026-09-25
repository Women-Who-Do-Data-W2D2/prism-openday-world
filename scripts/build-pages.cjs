#!/usr/bin/env node
/* Writes the pages the world opens in its side panel: one per team,
   the directory, programme, about, reading list, and get involved.
   Plain HTML, no build step.  node scripts/build-pages.cjs */
"use strict";
const fs = require("fs"), path = require("path");
const { ROOT, BASE, ROOMS, WALLS } = require("./world.cjs");
const teams = require(path.join(ROOT, "content", "teams.json"));
const OUT = path.join(ROOT, "pages");
const esc = s => String(s).replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CSS = `
:root{--bg:#141a26;--card:#1c2333;--ink:#ece5d3;--dim:#a39c8b;--gold:#e9b949;--line:#2c3446}
*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 "Avenir Next",Avenir,"Helvetica Neue",Helvetica,Arial,sans-serif;padding:20px 18px 40px}
h1{font-size:1.45rem;line-height:1.25;margin:.2rem 0 .6rem}h2{font-size:1.05rem;margin:1.6rem 0 .5rem;color:var(--gold);text-transform:uppercase;letter-spacing:.06em}
p{margin:.5rem 0}a{color:var(--gold)}img{max-width:100%;height:auto;display:block;border-radius:6px;background:#fff}
.kicker{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:0}.kicker b{color:var(--accent,var(--gold))}
.authors{color:var(--dim);font-size:.95rem}.fine{color:var(--dim);font-size:.8rem}.hint{color:var(--dim);font-size:.85rem;margin-top:.3rem}
.btn{display:inline-block;background:var(--gold);color:#141a26;font-weight:600;padding:.5rem .9rem;border-radius:6px;text-decoration:none;margin:.4rem .4rem .4rem 0}
.card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent,var(--gold));border-radius:8px;padding:.8rem 1rem;margin:.6rem 0}
.card h3{margin:0 0 .25rem;font-size:1rem}.card p{margin:.2rem 0;color:var(--dim);font-size:.92rem}
ul{padding-left:1.2rem}li{margin:.3rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.6rem}
table{border-collapse:collapse;width:100%;font-size:.95rem}td,th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--dim);font-weight:600}
.frame{border:1px solid var(--line);border-radius:8px;padding:6px;background:#fff}
.fellows{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0}.fellow{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:.3rem .6rem;font-size:.85rem}
`;
function shell(title, body, accent) { return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body${accent ? ` style="--accent:${accent}"` : ""}>${body}<p class="fine" style="margin-top:2rem">PRISM open day · <a href="${BASE}/pages/directory.html">directory</a></p></body></html>`; }
function write(rel, html) { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }

// Wall colors from world.cjs
const wallColor = wall => WALLS[wall] ? WALLS[wall].color : "#e9b949";

/* team pages */
for (const tm of teams) {
  const color = wallColor(tm.wall);
  const fellowsHtml = tm.fellows && tm.fellows.length > 0
    ? `<h2>Fellows</h2><div class="fellows">${tm.fellows.map(f => `<span class="fellow">${esc(f)}</span>`).join("")}</div>`
    : "";
  const coMentorHtml = tm.coMentor ? ` & ${esc(tm.coMentor)}` : "";

  write(`teams/${tm.slug}.html`, shell(tm.title, `
<p class="kicker">PRISM 2026 team · <b>${esc(tm.wall.toUpperCase())} WALL</b></p>
<h1>${esc(tm.title)}</h1>
<p class="authors">Mentor: <b>${esc(tm.mentor)}${coMentorHtml}</b></p>
${tm.affiliation ? `<p class="fine">${esc(tm.affiliation)}</p>` : ""}
<h2>About this project</h2>
<p>${esc(tm.blurb)}</p>
${fellowsHtml}
<h2>Join the conversation</h2>
<p>Walk into the poster's video zone to join the team's discussion. Multiple teams can present in parallel — each poster has its own isolated video bubble.</p>
<p><a class="btn" href="${BASE}/pages/programme.html">Programme</a> <a class="btn" href="${BASE}/pages/directory.html">Directory</a></p>`, color));
}

/* directory */
const byWall = wall => teams.filter(t => t.wall === wall);
write("directory.html", shell("Directory", `
<p class="kicker">PRISM open day</p><h1>Directory</h1>
<p>A single poster hall with 12 PRISM teams presenting their research. Walk to any poster and press SPACE for details. Each poster has its own video zone for isolated conversations.</p>
<div class="card"><h3>${esc(ROOMS.hall.name)}</h3><p>${esc(ROOMS.hall.blurb)}</p></div>
<h2>Teams by Wall</h2>
${["north", "east", "south", "west"].map(wall => `<div class="card" style="--accent:${wallColor(wall)}"><h3>${wall.charAt(0).toUpperCase() + wall.slice(1)} Wall</h3><p>${byWall(wall).map(t => `<b>${esc(t.mentor)}</b>: ${esc(t.title)}`).join("<br>")}</p></div>`).join("")}
<h2>Tips</h2>
<ul><li>Arrow keys or WASD to walk. Walk up to someone and your cameras connect.</li><li>SPACE opens the team details panel when standing near a poster.</li><li>Each poster has its own Jitsi video zone — teams can present in parallel without interference.</li><li>You spawn in the center of the hall with quick access to any poster.</li></ul>`));

/* programme */
const sortedByWall = ["north", "east", "south", "west"].flatMap(wall => byWall(wall));
write("programme.html", shell("Programme", `
<p class="kicker">PRISM open day</p><h1>Programme</h1>
<p>The running order for the poster session. All 12 teams present in parallel — visit any poster to join that team's discussion.</p>
<table><tr><th>Block</th><th>What happens</th><th>Where</th></tr>
<tr><td>Doors open</td><td>Arrive in the poster hall, pick an avatar.</td><td>Poster Hall</td></tr>
<tr><td>Opening</td><td>Welcome from the PRISM programme team.</td><td>Zoom (link shared separately)</td></tr>
<tr><td>Poster session</td><td>All 12 teams present in parallel. Walk to any poster and join the conversation.</td><td>Poster Hall</td></tr>
<tr><td>Closing</td><td>What comes next for the papers and for PRISM.</td><td>Zoom (link shared separately)</td></tr></table>
<h2>Teams presenting</h2>
<table><tr><th>Wall</th><th>Mentor</th><th>Project</th></tr>
${sortedByWall.map(t => `<tr><td style="color:${wallColor(t.wall)}">${t.wall.charAt(0).toUpperCase() + t.wall.slice(1)}</td><td>${esc(t.mentor)}</td><td>${esc(t.title)}</td></tr>`).join("")}</table>`));

/* about */
write("about.html", shell("About PRISM", `
<p class="kicker">Welcome</p><h1>What PRISM is</h1>
<p><b>PRISM</b> is the Peer-vetted Research Initiative for Safety Methodologies: a sixteen-week AI safety research fellowship run by <a href="https://w2d2.org" target="_blank" rel="noopener">Women Who Do Data</a>. Teams of four fellows work with one senior mentor each, and the whole programme is built backwards from one goal: a paper submitted to a conference by week sixteen.</p>
<h2>How a team works</h2>
<ul><li><b>Weeks one and two:</b> a distributed literature review. Each fellow reads a few papers deeply and teaches them to the team.</li>
<li><b>Week three:</b> every fellow proposes methodologies.</li>
<li><b>Week four:</b> the team votes, with the mentor. Two votes each, one of which must go to someone else. The winner sets the direction.</li>
<li><b>Week six onwards:</b> pairs run experiments in parallel and present to each other every week.</li>
<li><b>All the way through:</b> contribution is tracked from day one and shown to everyone, so authorship is never a surprise at the end.</li></ul>
<h2>The 2026 cohort</h2>
<p>Twelve mentor projects exploring AI safety across interpretability, evaluations, control, and governance. Around eight hundred people applied, three quarters of them women, from every continent. The cohort started in June 2026.</p>
<p><a class="btn" href="https://prism-research.org" target="_blank" rel="noopener">prism-research.org</a> <a class="btn" href="${BASE}/pages/directory.html">Directory</a></p>`));

/* get involved */
write("join.html", shell("Get involved", `
<p class="kicker">PRISM</p><h1>Get involved with PRISM</h1>
<div class="card"><h3>Apply as a fellow</h3><p>The next call opens on <a href="https://prism-research.org" target="_blank" rel="noopener">prism-research.org</a>. Twenty hours a week for sixteen weeks, remote, with a real paper at the end.</p></div>
<div class="card"><h3>Mentor a team</h3><p>Mentors bring a project and meet their team weekly. Write to <a href="mailto:support@prism-research.org">support@prism-research.org</a>.</p></div>
<div class="card"><h3>Volunteer</h3><p>Programme support volunteers keep the cohort running: onboarding, tooling, reviews. Same address.</p></div>
<div class="card"><h3>Women Who Do Data</h3><p>PRISM is a W2D2 programme. See <a href="https://w2d2.org" target="_blank" rel="noopener">w2d2.org</a> for everything else the community does.</p></div>`));

console.log("pages:", teams.length, "teams and 4 fixed pages in", path.relative(ROOT, OUT));
