/// <reference types="@workadventure/iframe-api-typings" />
/* The open day's map script: a banner naming each zone as you walk in, and a
   Directory button. Zones are tile layers named zone-<key>, painted by
   scripts/build-maps.cjs, which also writes world.json. */
import world from "./world.json";

const W: { base: string; zones: Record<string, string>; posters: Record<string, string> } = world;

WA.onInit().then(() => {
  // Show zone banners as the player walks around
  for (const key of Object.keys(W.zones)) {
    WA.room.onEnterLayer("zone-" + key).subscribe(() => {
      try {
        WA.ui.banner.openBanner({
          id: "zone",
          text: W.zones[key],
          bgColor: "#141a26",
          textColor: "#e9b949",
          closable: false,
          timeToClose: 3200
        });
      } catch (e) { console.warn("banner", e); }
    });
  }

  // A "View poster" button in the action bar while you stand in a poster's call area
  for (const key of Object.keys(W.posters || {})) {
    WA.room.onEnterLayer("zone-" + key).subscribe(() => {
      WA.ui.actionBar.addButton({
        id: "view-poster", label: "View poster",
        callback: () => { WA.nav.openCoWebSite(W.posters[key], false, "", 70).catch(e => console.warn(e)); }
      });
    });
    WA.room.onLeaveLayer("zone-" + key).subscribe(() => {
      try { WA.ui.actionBar.removeButton("view-poster"); } catch (e) { /* already gone */ }
    });
  }

  // Directory button in action bar
  WA.ui.actionBar.addButton({
    id: "directory",
    label: "Directory",
    callback: () => {
      WA.nav.openCoWebSite(W.base + "/pages/directory.html", false, "", 50).catch(e => console.warn(e));
    }
  });

  console.info("PRISM Poster Hall script ready");
}).catch(e => console.error(e));

export {};
