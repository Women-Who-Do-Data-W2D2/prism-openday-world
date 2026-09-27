#!/usr/bin/env node
/* Takes the teams' real posters from content/posters-inbox/ and places them.
   Drop in a PDF, PNG or JPG per team, named with the team's slug or the
   mentor's surname anywhere in the file name (for example
   "Freedman poster final.pdf" or "rachel-freedman.png"). For each match it writes:
     content/posters/<slug>.png      the source the tileset paints onto the wall board
     pages/posters/<slug>.jpg        a 2000 px wide copy shown on the team's page
   PDFs are rendered from their first page with macOS sips or poppler's pdftoppm.
   Then run npm run content.      node scripts/import-posters.cjs */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const sharp = require("sharp");
const ROOT = path.join(__dirname, ".."), INBOX = path.join(ROOT, "content", "posters-inbox");
const teams = require(path.join(ROOT, "content", "teams.json"));
fs.mkdirSync(INBOX, { recursive: true });
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ");
const which = c => { try { execFileSync("which", [c], { stdio: "ignore" }); return true; } catch (e) { return false; } };
function pdfToPng(pdf) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "poster-"));
  if (which("pdftoppm")) { execFileSync("pdftoppm", ["-png", "-r", "150", "-singlefile", "-f", "1", "-l", "1", pdf, path.join(tmp, "p")]); return path.join(tmp, "p.png"); }
  if (which("sips")) { const out = path.join(tmp, "p.png"); execFileSync("sips", ["-s", "format", "png", "-Z", "4000", pdf, "--out", out], { stdio: "ignore" }); return out; }
  throw new Error("no PDF renderer: install poppler (brew install poppler) or run on a Mac");
}
(async () => {
  const files = fs.readdirSync(INBOX).filter(f => /\.(pdf|png|jpe?g|webp)$/i.test(f));
  if (!files.length) { console.log("content/posters-inbox/ is empty. Drop one PDF, PNG or JPG per team there, named with the mentor's surname."); return; }
  const placed = {}, unmatched = [];
  for (const f of files) {
    const n = " " + norm(f) + " ";
    const hits = teams.filter(t => n.includes(" " + norm(t.slug) + " ") || n.includes(" " + norm(t.mentor).trim().split(" ").pop() + " ") || n.includes(" " + norm(t.slug).trim().split(" ").pop() + " "));
    if (hits.length !== 1) { unmatched.push(f + (hits.length ? " (matches " + hits.map(h => h.slug).join(", ") + ")" : "")); continue; }
    const t = hits[0]; if (placed[t.slug]) { unmatched.push(f + " (second file for " + t.slug + ", kept " + placed[t.slug] + ")"); continue; }
    const src = /\.pdf$/i.test(f) ? pdfToPng(path.join(INBOX, f)) : path.join(INBOX, f);
    await sharp(src).flatten({ background: "#ffffff" }).resize({ width: 3000, withoutEnlargement: true }).png().toFile(path.join(ROOT, "content", "posters", t.slug + ".png"));
    fs.mkdirSync(path.join(ROOT, "pages", "posters"), { recursive: true });
    await sharp(src).flatten({ background: "#ffffff" }).resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(ROOT, "pages", "posters", t.slug + ".jpg"));
    placed[t.slug] = f;
  }
  for (const t of teams) console.log((placed[t.slug] ? "placed   " : "missing  ") + t.mentor.padEnd(26) + (placed[t.slug] || ""));
  if (unmatched.length) { console.log("\nNot placed:"); unmatched.forEach(u => console.log("  " + u)); console.log("Rename these to include the mentor's surname, for example 'Freedman.pdf'."); }
  console.log("\nNext: npm run content");
})().catch(e => { console.error(e.message || e); process.exit(1); });
