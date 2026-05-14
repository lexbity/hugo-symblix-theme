+++
title = "Search"
description = "Use browse pages and static navigation instead of a live search bundle."
related = ["/en/docs/latest/navigation/", "/en/docs/latest/all-pages/"]
weight = 60
+++

The final supported release does not ship a client-side search UI.

## What changed

The older search bundle was removed during the cleanup phase so the theme stays static end to end. The docs still need to be discoverable, so the theme keeps two browse mechanisms:

1. The sidebar navigation tree
2. The `all-pages/` browse index for each docs version

## Why this is intentional

{{< warning title="No live search" >}}
There is no JavaScript search overlay in the release build. This keeps the docs usable in restricted environments and makes the theme easier to reason about and test.
{{< /warning >}}

## How readers browse

Use these entry points instead of search:

{{< child-pages root="/en/docs/latest/" title="Browseable sections" showDescriptions="true" maxItems="6" />}}

{{< note title="Static discovery" >}}
The browse pages are part of the documentation, not a fallback afterthought. They are built into the same theme shell as the rest of the site.
{{< /note >}}
