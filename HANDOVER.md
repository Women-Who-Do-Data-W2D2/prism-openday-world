# Handover: running the PRISM open day world

For whoever looks after the PRISM poster hall while Archana is away. It covers what exists, how to
get access, how to change the hall, how to change server settings, and what to do when something
breaks. No passwords or keys are in this file; it says where each one lives.

## 1. What exists

| Thing | Where | Notes |
|---|---|---|
| **The live world** | https://178-105-222-101.sslip.io/ | Self-hosted WorkAdventure, no visitor cap. Opens straight into the poster hall. This is the link to share. |
| The museum, same server | https://178-105-222-101.sslip.io/~/museum/maps/core.wam | The Museum of AI Safety world, a separate project. Leave it alone unless asked. |
| **This repo** | github.com/Women-Who-Do-Data-W2D2/prism-openday-world | Source for the hall: content, scripts, generated map, pages. |
| Open pull request #2 | branch `spaced-poster-calls` | Everything since 25 September: spaced call areas, real posters, name bands, view-poster strips, freeform calls. **The server already runs this branch.** `main` is behind it. |
| GitHub Pages copy | women-who-do-data-w2d2.github.io/prism-openday-world | Built from `main` on every push. Holds the map files for the hosted copy below. |
| Hosted copy | play.workadventu.re/_/global/Women-Who-Do-Data-W2D2.github.io/prism-openday-world/maps/hall.tmj | WorkAdventure's free plan, **10 visitors at a time**. Shows the old hall until PR #2 is merged. Do not share it for the event. |
| The server | Hetzner Cloud, project `Archana Vaidheeswaran`, server `museum-play`, type cx23 (2 vCPU, 4 GB), Falkenstein, IPv4 178.105.222.101 | About 8 EUR a month. Owned by Archana's Hetzner account. |
| Video calls | Element's public Jitsi, meet.element.io | No login, no moderator, no time limit. Not ours, so it is a dependency. |
| Crowd and call tests | github.com/varchanaiyer/prism-openday-loadtest (private) | GitHub Actions workflows that send headless visitors into the hall. |
| Discord tools | github.com/varchanaiyer/prism-dashboard (private) | Workflows that read and post in the PRISM Discord through the PRISM bot: poster scan, search, send. |

**First thing to do:** merge PR #2 into `main`. Then `main`, GitHub Pages and the server all describe
the same hall, and nobody has to remember which branch is real. The pull request has no conflicts.

## 2. Getting access

Archana has to grant these. Ask for whichever you need.

| Access | How Archana grants it | What you can then do |
|---|---|---|
| **This repo** | Already an admin if you are AngC1998, Astha0024, ccstan99, LNRobertson or w2ariag; Ayesha-Imr can maintain. Others: Settings, Collaborators. | Change content and code, merge PR #2. |
| **SSH to the server** | You send her your SSH **public** key (`~/.ssh/id_ed25519.pub`; create one with `ssh-keygen -t ed25519`). She appends it to `/root/.ssh/authorized_keys` on the server. | Change settings, restart, read logs. |
| **Map upload key** | Lives on the server as `MAP_STORAGE_API_TOKEN` in `/opt/workadventure/.env`. Once you have SSH you can read it yourself. Never paste it in chat or commit it. | Upload a new version of the hall. |
| **Hetzner Console** | Hetzner Console (console.hetzner.cloud, not Hetzner Accounts), project `Archana Vaidheeswaran`, Security in the left sidebar, Members tab, Add member, role Member. | Power-cycle, resize or delete the server, see billing. Only needed if SSH stops working. |
| Discord tools, test repo | Collaborator on the two private repos above. | Run the poster scan, search Discord, rerun the crowd test. |

Connect to the server:

```sh
ssh root@178.105.222.101
cd /opt/workadventure
```

## 3. How the hall is built

Nothing is drawn by hand. Scripts turn content into the map:

| File | What it holds |
|---|---|
| `content/teams.json` | The twelve teams: mentor, title, wall (`north`, `east`, `south`, `west`), position on the wall (1 to 3), fellows, blurb |
| `content/posters/<slug>.png` | The poster image painted onto each board's thumbnail |
| `pages/posters/<slug>.jpg` | The full poster shown when a visitor presses SPACE |
| `scripts/tileset.cjs` | Paints the tiles: floors, walls, the board with its mentor-name band, the VIEW strips, the banner |
| `scripts/build-maps.cjs` | Lays out the hall: room size, board positions, call areas, VIEW strips, spawn. Refuses to build if two call areas come within 3 tiles of each other |
| `scripts/build-pages.cjs` | The pages that open in the side panel: team pages, poster viewers, directory, programme |
| `scripts/import-posters.cjs` | Places posters dropped into `content/posters-inbox/` |
| `src/main.ts` | The in-browser script: banners as you walk into a zone, the View poster and Directory buttons |

Layout in one paragraph: the hall is 48 by 44 tiles. Each wall holds three boards, 4 tiles wide and 5
tall (a 2-tile name band over the poster). In front of each board is its call area, a tinted 6 by 4
floor: step on and you join that team's video call, step off and you leave. Along the front edge of
each call area is a strip of VIEW tiles: stand there and press SPACE to read the poster without
joining the call. Visitors spawn in the middle, outside every call.

Set up once on your machine (Node 20 or newer):

```sh
git clone https://github.com/Women-Who-Do-Data-W2D2/prism-openday-world
cd prism-openday-world
git checkout spaced-poster-calls     # or main, once PR #2 is merged
npm install
```

## 4. Common changes

After any of these, run `npm run content`, look at the preview, commit, push, and then **update the
server** (section 5). Pushing to GitHub alone does not change the live hall.

```sh
npm run content                                   # regenerate tileset, map and pages
node scripts/preview.cjs hall /tmp/hall.png 2     # picture of the hall, call areas outlined
```

**Put up a poster that arrived late.** Save it into `content/posters-inbox/` with the mentor's
surname in the file name (`Freedman.pdf`, `heitzig-poster.png`). PDF, PNG or JPG. PDFs use their
first page. Then:

```sh
npm run place-posters        # prints placed or missing for every team, then rebuilds
```

PowerPoint posters: export to PDF first, or on a Mac run `qlmanage -t -s 3000 -o . poster.pptx` and
use the PNG it makes. Check each poster by eye before placing it: one team's first submission still
had template text in it.

Posters placed so far: Agarwal, Hudson, Reza Khan, Berg, Hussain, Owen. Still missing: Freedman,
Narayan, Ibitoye, Ravindra, Heitzig, Krishnan (Krishnan's group sent a slide deck, not a poster).

**Move a team to another wall or position.** Edit `wall` and `position` in `content/teams.json`.
Each wall must have exactly positions 1, 2 and 3.

**Change a team's title, fellows or blurb.** Edit `content/teams.json`.

**Change the programme, directory or other page text.** Edit `scripts/build-pages.cjs`.

**Change the layout** (room size, spacing, board size). Edit the top of `hall()` in
`scripts/build-maps.cjs`: `W`, `H`, `BOARD_W`, `BOARD_H`, `DEPTH` (call-area depth), `across`
(board x positions on the north and south walls) and `down` (board y positions on the west and east
walls). The build stops with `CALL AREAS TOO CLOSE` or `SPAWN INSIDE A CALL` if a change breaks the
spacing rules; move things further apart and try again.

**Change how calls behave.** Each call area passes Jitsi settings in the `jitsi()` helper in
`scripts/build-maps.cjs`: no join screen, no lobby, hidden moderator and security controls, no kick
or remote mute. Edit that object to change them.

## 5. Updating the server

The server keeps its own copy of the hall in WorkAdventure's map storage. To replace it, build with
the side-panel pages pointed at the server, zip, and upload. Takes 5 to 10 minutes, mostly the build.

```sh
export MAP_STORAGE_API_KEY=...     # the MAP_STORAGE_API_TOKEN value from the server's .env
export PAGES_BASE=https://178-105-222-101.sslip.io/map-storage/prism
node scripts/build-maps.cjs && node scripts/build-pages.cjs && npm run build
(cd dist && rm -f ../dist.zip && zip -qr ../dist.zip .)
curl -H "Authorization: Bearer $MAP_STORAGE_API_KEY" -F directory=prism -F file=@dist.zip \
  https://178-105-222-101.sslip.io/map-storage/upload
# answers "File successfully uploaded."

unset PAGES_BASE
node scripts/build-maps.cjs && node scripts/build-pages.cjs   # back to the GitHub Pages build before committing
```

Use `directory=prism` exactly: it replaces the hall in place. A different name creates a second copy;
`/` would wipe everything, including the museum.

Check it worked: open https://178-105-222-101.sslip.io/ in a private window. Visitors who already
have the hall open must reload (Cmd+Shift+R or Ctrl+Shift+R).

## 6. Server settings

Everything lives in `/opt/workadventure/.env` on the server. After editing, restart with
`docker compose up -d` in `/opt/workadventure`. **Back up first:**
`cp .env .env.bak-$(date +%Y%m%d)`.

| Setting | Current value | What it does |
|---|---|---|
| `DOMAIN` | `178-105-222-101.sslip.io` | The address. sslip.io is a free service that turns the IP into a name, so it needs no DNS. To use a real name, add a DNS A record pointing to 178.105.222.101, set `DOMAIN`, restart; the certificate is issued automatically within a minute. |
| `START_ROOM_URL` | `/~/prism/maps/hall.wam` | Where the bare address lands. |
| `JITSI_URL` | `meet.element.io` | The video-call service. Was `meet.jit.si`, which needs a logged-in moderator and ends embedded calls after 5 minutes. |
| `MAX_PER_GROUP` | `4` | Size of a walk-up conversation bubble outside the call areas. |
| `MAP_EDITOR_ALLOW_ALL_USERS` | `false` | Keep false: when true, any visitor can edit or delete things in the map from the browser. |
| `DISABLE_ANONYMOUS` | `false` | Visitors join with a name, no account. |
| `VERSION` | `v1.33.6` | WorkAdventure release. Do not upgrade the week of an event. |
| `MAP_STORAGE_API_TOKEN` | set | The upload key. Secret. |

Older versions of the file are kept as `.env.bak-YYYYMMDD*`. To roll back:
`cp .env.bak-20260927-jitsi .env && docker compose up -d`.

## 7. When something breaks

| Symptom | Likely cause and fix |
|---|---|
| Site does not load | `ssh` in, `cd /opt/workadventure && docker compose ps`. Anything not "Up": `docker compose up -d`. Logs: `docker compose logs --tail 100 play` (or `back`, `map-storage`, `reverse-proxy`). |
| Certificate warning | Renews automatically; current one is valid to 25 December 2026. `docker compose logs reverse-proxy` shows renewal errors. |
| A call shows a moderator, login or "Join meeting" screen | Check `JITSI_URL=meet.element.io` in `.env`, and that the uploaded map still has `jitsiConfig` on each call area. If meet.element.io itself is down, see the last row. |
| People still listed in a call after walking away | They popped the call into its own browser tab (the arrow-out button) or minimised it. Tell them to close that tab. Walking off the tinted floor ends the call within 5 seconds; this was tested. |
| Someone hears nobody in a walk-up bubble | Strict office or university networks block direct video; about 1 in 7 visitors. Poster calls are not affected (Jitsi has its own relay). Fix if it matters: add a TURN server (Coturn), see WorkAdventure's self-hosting docs. |
| Old hall still showing | The visitor needs a hard reload, or the upload in section 5 did not happen. |
| Upload says 401 | Wrong or missing `MAP_STORAGE_API_KEY`. |
| Server unreachable by SSH too | Hetzner Console: server `museum-play`, Power, Reset. |
| meet.element.io down | Temporarily set `JITSI_URL=meet.jit.si` (works, but needs a logged-in moderator and cuts calls at 5 minutes), or self-host Jitsi or LiveKit on a second server. |

## 8. Quick checks: is it working?

Do these after any change, and on the morning of the event. Part A needs only a browser. Part B
needs a terminal (Terminal on a Mac, PowerShell or Git Bash on Windows) and no access to anything.

### A. In the browser, about five minutes

Use Chrome or Edge. For the call tests you need two "people": a second browser profile, a private
window in a different browser, or a phone.

| # | Do this | You should see |
|---|---|---|
| 1 | Open https://178-105-222-101.sslip.io/ in a private window | Name screen, then avatar, then camera and microphone screen, then the poster hall. No error page, no certificate warning |
| 2 | Look around the hall | Twelve boards, three per wall, each topped by the mentor's name in large letters on a dark band. A "PRISM POSTER SHOWCASE" sign in the middle. You start next to it |
| 3 | Click **Directory** in the bottom bar | A side panel listing the twelve teams |
| 4 | Walk to a strip of tiles marked VIEW in front of any call area and press SPACE | The poster opens full width in the side panel (or "not been submitted yet" for teams without one). Click it to open full size |
| 5 | Step onto the tinted floor in front of a board | A banner names the team, and a video call opens on the right **straight away**: no "Join meeting" button, no lobby, no moderator or login screen. A **View poster** button appears in the bottom bar |
| 6 | With your second "person", step onto the same tinted floor | Both of you appear in the call |
| 7 | Walk the first person off the tinted floor | Their call window closes within about 5 seconds and they disappear from the other person's call |
| 8 | Bring both people together on the plain floor in the middle | A small walk-up video bubble connects them (up to 4 people) |
| 9 | Stay in a call for more than 5 minutes | The call keeps going. (A cut-off at 5 minutes means the server is back on meet.jit.si: see section 6) |

Things that are **not** bugs: a visitor who popped a call out into its own tab (arrow-out button)
stays in that call after walking away until they close the tab. People who join a call after the
first ten start with camera and microphone off; they can switch them on.

### B. In a terminal, about one minute

Copy each line, paste, press Enter, and compare with the expected answer.

```sh
# 1. The site answers.                                  Expect: 200
curl -s -o /dev/null -w '%{http_code}\n' https://178-105-222-101.sslip.io/

# 2. The certificate is valid.                          Expect: a date in the future (currently Dec 25 2026)
echo | openssl s_client -connect 178-105-222-101.sslip.io:443 -servername 178-105-222-101.sslip.io 2>/dev/null | openssl x509 -noout -enddate

# 3. The hall the server serves has 12 poster calls.    Expect: 12
curl -s https://178-105-222-101.sslip.io/map-storage/prism/maps/hall.tmj | grep -o '"jitsiRoom"' | wc -l

# 4. Every call skips the join screen.                  Expect: 12
curl -s https://178-105-222-101.sslip.io/map-storage/prism/maps/hall.tmj | grep -o 'prejoinPageEnabled' | wc -l

# 5. The hall is the current layout.                    Expect: 48 x 44
curl -s https://178-105-222-101.sslip.io/map-storage/prism/maps/hall.tmj | python3 -c "import json,sys; m=json.load(sys.stdin); print(m['width'], 'x', m['height'])"

# 6. A placed poster is served.                         Expect: 200 (try any slug from content/teams.json that has a poster)
curl -s -o /dev/null -w '%{http_code}\n' https://178-105-222-101.sslip.io/map-storage/prism/pages/posters/aryan-agarwal.jpg

# 7. The video-call service is up.                      Expect: 200
curl -s -o /dev/null -w '%{http_code}\n' https://meet.element.io/
```

If you have SSH access (section 2), two more:

```sh
# 8. All seven services are running.                    Expect: 7 lines, each "Up", three of them "(healthy)"
ssh root@178.105.222.101 'cd /opt/workadventure && docker compose ps --format "{{.Name}} {{.Status}}"'

# 9. The key settings are as documented in section 6.   Expect: DOMAIN=178-105-222-101.sslip.io, START_ROOM_URL=/~/prism/maps/hall.wam,
#                                                        JITSI_URL=meet.element.io, MAP_EDITOR_ALLOW_ALL_USERS=false
ssh root@178.105.222.101 'grep -E "^(DOMAIN|START_ROOM_URL|JITSI_URL|MAP_EDITOR_ALLOW_ALL_USERS)=" /opt/workadventure/.env'
```

If a check fails, section 7 has the likely cause for each symptom.

## 9. Testing without other people

The private repo varchanaiyer/prism-openday-loadtest has two workflows (Actions tab, Run workflow):

- **Call check**: two headless visitors walk into the same poster call, report whether they see each
  other and whether any moderator or login screen appears. Set `leave` to `1` to also test walking out.
- **Crowd test**: up to 8 machines times N visitors join together. On 27 September, 32 visitors all got
  in within 27 seconds and stayed 4 minutes with the server comfortable.

## 10. After the event

- To stop paying: in Hetzner Console, delete server `museum-play`, or ask Archana. This also takes the
  museum offline. Download anything you want first.
- The map storage copies (`prism`, `museum`) live on the server's disk and go with it.
- The repo, GitHub Pages and the hosted copy stay up for free.

## 11. People

- **Archana Vaidheeswaran**, owner of the server, the Hetzner account and the private repos.
- **ChengCheng Tan** (ccstan99), rebuilt the hall as a single poster room; admin on this repo.
- Repo admins: AngC1998, Astha0024, LNRobertson, w2ariag. Maintainer: Ayesha-Imr.
