+++
title = "Scene Failure Fixtures"
description = "Deliberately broken scenes that demonstrate the motion runtime's error isolation — the browser console warnings are the system working."
weight = 19
+++

These mounts are intentionally broken. They exist to demonstrate, live, the
degradation guarantees from [Scenes](/en/docs/latest/components/scenes/):
a scene that misbehaves is that scene's problem — the page, its layout, and
its sibling scenes keep working, and the poster returns.

The browser console will show `[symblix-motion]` warnings on this page.
That is the error isolation working as designed, not a bug.

{{< scene src="js/scenes/__broken.js" poster="/images/scene-orbit-poster.svg" title="Broken fixture — createScene throws" >}}
This scene's `createScene` throws immediately. The runtime marks the mount
`error`, logs a warning, and leaves the poster standing.
{{< /scene >}}

{{< scene src="js/scenes/orbit.js" poster="/images/scene-orbit-poster.svg" title="Orbit fixture scene" >}}
The healthy control: this mount starts normally while its broken siblings
fail around it — one scene's failure never affects another.
{{< /scene >}}

{{< scene src="js/scenes/__broken.js" poster="/images/scene-orbit-poster.svg" title="Second broken fixture" >}}
A second broken mount sharing the same module: each mount fails and
recovers to its poster independently.
{{< /scene >}}
