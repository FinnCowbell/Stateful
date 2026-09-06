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

## Time 2 touch navigation

With SDK 4.33 or newer and compatible watch firmware, enable touch input in
the watch settings to scroll and select tiles using the native menu gestures.
Opening a tile does not send an API request.

Inside a tile, swipe right to return to the menu. Taps, holds, and other swipe
directions do not trigger actions or switch the overflow controls: API requests
still require physical button presses. Button navigation remains available.
Other watches and builds using SDKs without these touch APIs remain button-only.

# Wiki

Head over to the [Wiki](../../wiki) for more information on usage.