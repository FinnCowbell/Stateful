# Building Stateful

Use the Pebble CLI in Linux (or Ubuntu under WSL on Windows), with Node.js 20
available in the same shell.

## SDK

Time 2 touch navigation requires Pebble SDK 4.33 or newer. The development
build uses 4.33.1:

```sh
pebble sdk install 4.33.1
npm_config_ignore_scripts=true npm_config_package_lock=false pebble build --sdk 4.33.1
```

The explicit `--sdk` selects this SDK without changing the default for other
projects. Keep `pebble.sdkVersion` in `package.json` at `"3"`: that identifies
the app's SDK compatibility generation, not the installed SDK release.

Clay ships its built assets. Disabling npm lifecycle scripts avoids rebuilding
its obsolete development-only `node-sass` dependency; disabling lockfile writes
avoids rewriting the existing lockfile during the Pebble CLI's install/dedupe
steps.

## Isolated branches

The fork's `master` combines the individual feature branches. To test touch
support in isolation, a temporary integration branch also needs the modern
toolchain fix from `fix-implicit-fallthrough` and the Time 2 target from
`emery-support`. Keep those prerequisite changes out of `time2-touch-navigation`.

SDK 4.17 builds remain button-only. The touch-enabled Time 2 build requires
firmware exposing the SDK 4.33 touch-navigation APIs; enable touch input in the
watch settings before testing it.

## Install

Enable Developer Connection in the Pebble phone app and keep it in the
foreground, then run:

```sh
pebble install --phone <phone-ip>
```
