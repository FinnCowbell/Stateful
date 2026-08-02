# Stateful

`Stateful` is a Pebble watchapp designed to control RESTful API's with minimal clicks. 

![](markdown_resources/example1.png)
![](markdown_resources/example2.png)
![](markdown_resources/example3.png)
![](markdown_resources/example4.png)

# Interface

The watch interface is split up into distinct 'tiles'. A tile in `stateful` is a grouping of up to 6 button clicks, each of which can call a RESTful endpoint with arbitrary data.

Each tile has an overflow menu that can be accessed by long pressing the middle button.

Multiple tiles can coexist. There is a menu system which allows navigation between tiles:

![](markdown_resources/menuing.gif)
# Remote Config

Instead of editing settings by hand, `stateful` can pull its configuration from a URL. Enable **Remote Config** in settings, point it at an endpoint that serves the config JSON and press **Sync Now**.

The config is fetched each time the watchapp launches. When the fetched document differs from the one in use it is applied and pushed to the watch, so a config change on the server reaches the watch on next launch with no interaction. The document is validated before it is applied, and the last known good config is kept if the endpoint is unreachable or returns something unexpected.

The expected document is the same JSON used by the JSON Manager, so the simplest way to produce one is to export from there. A few things to be aware of:

- The server is the source of truth. Anything edited locally is replaced on the next sync.
- `sync_enabled`, `sync_url` and `sync_headers` are ignored if present in the fetched document. The sync endpoint can only be changed on the watch, so a bad config cannot lock you out.
- Each tile needs exactly 7 `texts` and 7 `icon_keys`, matching the JSON Manager output.
- Custom icons do not sync, only the config that references them.
- The config carries whatever API credentials your tiles use, so the endpoint should be served over HTTPS and access controlled.

# Wiki

Head over to the [Wiki](../../wiki) for more information on usage.