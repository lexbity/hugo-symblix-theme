+++
title = "Video"
description = "Embedded playback for self-hosted clips and YouTube, without third-party requests on page load."
weight = 16
+++

The `video` shortcode embeds videos that play inside the page. Self-hosted
sources use a native `<video>` element that works without JavaScript. YouTube
sources use a static facade that loads the privacy-enhanced nocookie player
only after the visitor presses play — zero third-party requests exist on page
load, and without JavaScript the facade becomes an outbound link.

## Self-hosted video

A native player with controls; add a `poster` for a stable first frame.

{{< video src="/videos/symblix-demo.webm" poster="/videos/symblix-demo-poster.jpg" title="Symblix demo clip" caption="A self-hosted clip rendered by the native `<video>` element — no JavaScript involved." duration="0:03" >}}

The shortcode behind the clip above:

```text
{{</* video src="/videos/symblix-demo.webm"
            poster="/videos/symblix-demo-poster.jpg"
            title="Symblix demo clip"
            caption="A self-hosted clip."
            duration="0:03" */>}}
```

## YouTube facade

Pass a `youtube` video ID instead of `src`. The facade shows your own `poster`
or a themed placeholder, and swaps in the nocookie player on click. This demo
uses a real video ID; the player loads only if you press play.

{{< video youtube="aqz-KE-bpKQ" title="Big Buck Bunny (YouTube demo)" caption="Nothing loads from YouTube until you press play; without JavaScript this becomes a link instead of an embed." duration="10:34" >}}

## Parameters

| Param    | Required | Description                                            |
| -------- | -------- | ------------------------------------------------------ |
| `src`    | one of   | Path or URL of a self-hosted video file.               |
| `youtube`| one of   | YouTube video ID for the click-to-load facade.         |
| `title`  | yes      | Accessible name; also used as the iframe title.        |
| `poster` | no       | Poster image (self-hosted path or URL).                |
| `caption`| no       | Markdown caption rendered under the frame.             |
| `duration`| no      | Display-only chip (e.g. `2:41`) on the facade.         |
| `class`  | no       | Extra classes on the wrapping figure.                  |

## What is not here

{{< warning >}}
No iframe, no player library, and no third-party request exist on page load.
Self-hosted playback needs no JavaScript at all; the YouTube facade needs
JavaScript only to honor the click, and stays a plain link without it.
{{< /warning >}}
