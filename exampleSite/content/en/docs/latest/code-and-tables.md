+++
title = "Code and Tables"
description = "Code-heavy and table-heavy content for visual verification."
docType = "how-to"
weight = 18
+++

This page is intentionally compact but dense.

```bash
set -euo pipefail
hugo --source exampleSite --theme hugo-theme-symblix --cleanDestinationDir
```

| Setting | Default | Notes |
|---|---|---|
| `root` | `docs` | Documentation root section. |
| `logoAlt` | `Symblix` | Fallback logo text. |
| `enabled` | `true` | Enables search UI. |

Inline code should not blow up the layout, even if it is verylongandunbrokenandkeptinlineforstress-testing.
