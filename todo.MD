# Todo
## Icons
- ~~Ditch `.webp` (thanks apple)~~
- ~~Un-ditch `.webp` due to size contraints (f*ck you apple)~~
- ~~Create standard set of icons~~
- ~~Convert png8 icon set under `resources/icons` to RGB png and allow `pebble build` to convert down to png8, this will reduce filesize of `tools/webp.sh` output a bit.~~ 
`Converting to RGB did not save size over all, re-opted to use webp with a fallback to github urls`
- ~~Create black spinner icon and tie into `text_color_legible_over()`~~

## Remote config sync
- ~~Sync config to/from a server so it can be updated without opening the app~~
`Implemented as pull-only in modules/sync.js - config is fetched on JS 'ready', and on Submit when the sync settings themselves changed. Server is source of truth, a local Submit drops the stored revision so the next pull re-applies.`
  - ~~Add a "config URL" (+ optional auth headers) to the global settings section of `data/clay_config.js`, stored alongside the other globals in `data/base_object.js`~~ `Lives in the JSON Manager section, in its own sync-settings localStorage key rather than in base_object`
  - ~~Fetch on `Pebble.addEventListener('ready')`, reusing `modules/xhr.js:xhrRequest()` rather than a new HTTP path~~ `READY is sent to the watch first so startup is not blocked, the pull issues its own REFRESH / READY if the config actually changed`
  - ~~Needs a conflict/precedence rule~~ `Pull-only, server wins. Pull is skipped while TRANSFER_LOCK is set so it cannot clobber an open config page.`
  - ~~Version the remote doc so we can skip the expensive `TransferType.REFRESH` + full re-pack of tiles when nothing changed~~ `sha1 of the fetched doc stored under the sync-revision localStorage key`
  - ~~Validate hard before writing to `localStorage`~~ `sync.validate() rejects non-objects, empty tile arrays and malformed tiles so a login page returning 200 cannot wipe the config`
  - ~~Stop a remote doc from repointing or disabling sync~~ `Structural: the sync settings live in their own sync-settings localStorage key, following the custom-icons pattern, so they are not part of the config document at all`
- Outstanding on this feature:
  - Push (two-way) sync - needs a defined server API contract (PUT semantics, auth, conflict resolution) before it is worth building
  - Custom icons still do not sync. They live under the `custom-icons` localStorage key (`modules/icon.js`, `modules/image.js`) as encoded image data. Either sync them too or have the remote config reference icon URLs and let `image.load()` re-fetch them.
  - A watch initiated `TransferType.REFRESH` calls `localStorage.clear()` in `index.js`, which wipes the `sync-settings` key along with everything else, leaving no way to recover the config from the server. Consider preserving it across a refresh.
  - `ClayHelper.openURL()` does not set `TRANSFER_LOCK`, so the lock only covers config pages opened via `showConfiguration`. Harmless today (pulls only fire on `ready` and on a sync settings change) but worth tightening if more sync triggers are added.
  - No periodic / push-triggered refresh - config only updates on watchapp launch, or on Submit when the sync settings changed
  - Applying a synced config sends `TransferType.REFRESH`, which closes the watchapp. `comm_bluetooth_event()` in `modules/comm.c` calls `window_stack_pop_all(true)` before `loading_window_push(NULL)`, and emptying the window stack terminates the app. Pre-existing, but only visible now that a config can be applied while the app is open. Needs the loading window pushed before the others are removed, and an emulator to verify.
  - Needs a wiki page covering the config document shape in full

## New hardware support (Core Devices)
- ~~Add Pebble Time 2 (`emery`) support~~ `Added emery to targetPlatforms in package.json. Builds clean and runs; no layout changes were needed.`
  - Findings from doing it:
    - The layout code was already resolution independent. `action_window.c`, `menu_window.c` and `loading_window.c`
      derive everything from `layer_get_bounds()`, so nothing was hardcoded to 144x168 the way these notes assumed.
    - Platform gating is all `PBL_COLOR` / `PBL_APLITE`, never platform names, so emery picked up the colour and
      large-buffer paths on its own. `ICON_ARRAY_SIZE`/`MAX_TILES` (`stateful.h`), `INBOX_SIZE` (`comm.h`) and
      `getPlatformLimits()` (`globals.js`) all key off aplite only and needed no change. emery has 128KB app RAM,
      double basalt.
    - `apng.c` gates the animated spinner on `PBL_COLOR`, so emery gets the animated path.
  - Still open on emery:
    - `CELL_HEIGHT` (48) and `CELL_WIDTH` (40) in `menu_window.c` are fixed pixel values, as is the 18px
      `FONT_UBUNTU_BOLD_18`. On a 228px tall display that fits ~4.75 rows instead of ~3.5, so the menu is denser
      and physically smaller rather than broken. Scale these per platform if it reads too small on real hardware.
    - Icons are fixed at `ICON_SIZE_PX: 18` in `pkjs/modules/globals.js`. Higher-res variants under
      `resources/icons` would sharpen them on emery.
    - Add an appstore screenshot set under `resources/appstore/` for emery.
- Pebble 2 Duo (`flint`) is blocked, not done
  - `flint` is 144x168 monochrome, dimensionally identical to the already-supported `diorite`, so the app itself
    needs nothing. The blocker is the dependency: `pebble-clay` ships `aplite, basalt, chalk, diorite, emery` and
    building with flint in `targetPlatforms` fails outright with
    "The Pebble package pebble-clay does not support the flint platform".
  - Unblocking it means adding flint to the clay fork (`kennedn/clay`) and pointing `package.json` at it.

## General
- Commit clay, make sure project compiles in clean repo
- Use minified clay_function when releasing
- ~~Test max size of tile object with limits enforced in clay~~
- ~~Use `Object.byString` in `status.variable` parsing~~
- ~~Implement front end tile limits - aplite (10?), basalt (64)~~
- ~~Enforce max string length in data.js for texts and icon_keys~~

- ~~Test clay_needs_config against changes made in comm_ready_callback~~
- ~~Handle xhrArrayBuffer callback failures~~
- ~~Attempt to retrieve icons from storage in `data_tile_array_pack_tiles()` for faster loads~~
- ~~Detect startup connectivity issues in `comm_ready_callback()`~~
- ~~Implement custom icon storage and pulldown to clay~~
- ~~png decode failure on aplite due to memory segmentation on initial download~~ 
`won't fix - Added catch that will set default icon on allocation failure. persistent_storage still works when png allocation fails so subsequent app launches will display images. The reason for this issue is due to the limited memory on aplite.`
- ~~Does setting default icon on failure go into app storage?~~
- ~~Non PNG sent to image.js?~~
## Clay Config
- ~~Validation needs to expand sections to properly check them :(~~
- ~~Implement field validation~~
- ~~Handle Submit payload~~
- ~~Handle Icon payload (url)~~
- ~~Refresh payload?~~
- ~~Handle Add / Delete tile payload~~
- ~~Add Icon manager~~
- ~~Add global settings~~
- ~~Add JSON Manager~~
- ~~Use focus event to copy JSON to clipboard?~~ `no`
- ~~TileSelection causes problems with ButtonIcon/ButtonName~~

## Nice to have / ideas
- ~~Session management (via incrementing int) in comm.c to prevent old requests causing a race condition in `comm_bluetooth_event()`. Currently an assumption is made that when READY is received the subsequent TILE chunk transfers will be received without interruption, which under a limited set of circumstances is not the case and can cause app crashes.~~
- ~~Use image urls from github repo as a fallback position for webp data uris~~ 
`Added useragent regex to decide if IOS version is too low for webp (<14), if it is use github urls as fallback`
- ~~Static loading image for b/w models on xhr request (rotate overflow icon?)~~
`Not doing, indicator icons are enough`
- ~~Use LZString library to reduce transfer sizes (needs to be below ~256kb or android app crashes)~~
- ~~Crash counter in stateful.c via local storage? Clear local storage if 2+ crashes?~~
