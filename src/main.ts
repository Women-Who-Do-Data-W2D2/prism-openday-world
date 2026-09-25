/// <reference types="@workadventure/iframe-api-typings" />
/* The open day's map script: a banner naming each zone as you walk in, and a
   Directory button. Zones are tile layers named zone-<key>, painted by
   scripts/build-maps.cjs, which also writes world.json. */
import world from "./world.json";

const W: { base: string; zones: Record<string, string> } = world;

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
