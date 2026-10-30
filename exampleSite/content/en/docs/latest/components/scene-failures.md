+++
title = "Scene Failure Fixtures"
description = "Every row of the degradation matrix, live: deliberately broken scenes demonstrating the motion runtime's error isolation."
weight = 19
+++

These mounts are intentionally broken. They exist to demonstrate, live, the
degradation guarantees from [Scenes](/en/docs/latest/components/scenes/):
a scene that misbehaves is that scene's problem — the page, its layout, and
its sibling scenes keep working, and the poster returns.

The browser console will show `[symblix-motion]` warnings on this page.
That is the error isolation working as designed, not a bug.

## Author-code failures

{{< scene src="js/scenes/__broken.js" poster="/images/scene-orbit-poster.svg" title="Fixture — createScene throws" >}}
This scene's `createScene` throws immediately. The runtime marks the mount
`error`, logs a warning, and leaves the poster standing.
{{< /scene >}}

{{< scene src="js/scenes/orbit.js" poster="/images/scene-orbit-poster.svg" title="Healthy control" >}}
The healthy control: this mount starts normally while its broken siblings
fail around it — one scene's failure never affects another.
{{< /scene >}}

{{< scene src="js/scenes/__topthrow.js" poster="/images/scene-orbit-poster.svg" title="Fixture — module throws at import" >}}
This scene's module throws during import, before any runtime code runs.
The rejected fetch lands the mount in `error` exactly like author-code
failures do.
{{< /scene >}}

{{< scene src="js/scenes/__badshape.js" poster="/images/scene-orbit-poster.svg" title="Fixture — bad export shape" >}}
The module's default export is not a function. The runtime validates the
shape before invoking anything.
{{< /scene >}}

{{< scene src="js/scenes/__wrongapi.js" poster="/images/scene-orbit-poster.svg" title="Fixture — scene API mismatch" >}}
The module declares scene API 99; the runtime ships API 1. A declared
mismatch is refused up front.
{{< /scene >}}

## Click-gated loads

With `load="click"`, both the module fetch and the scene start wait for the
visitor to press the button. Without JavaScript the button is removed from
the markup (noscript rule) and the poster is the whole content.

{{< scene src="js/scenes/__broken.js" poster="/images/scene-orbit-poster.svg" title="Fixture — click-gated createScene throw" load="click" >}}
Press the button: the scene fetches, starts, and throws — one strike, and
the poster returns. A broken scene is not retryable.
{{< /scene >}}

{{< scene src="js/scenes/orbit.js" poster="/images/scene-orbit-poster.svg" title="Click-to-load control" load="click" >}}
The working click-gated control: press the button and this scene starts
normally, exactly like its visible sibling above.
{{< /scene >}}
