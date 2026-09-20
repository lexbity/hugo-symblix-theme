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

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Setting</th>
        <th>Default</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>root</code></td>
        <td><code>docs</code></td>
        <td>Documentation root section.</td>
      </tr>
      <tr>
        <td><code>logoAlt</code></td>
        <td><code>Docworkbench</code></td>
        <td>Fallback logo text.</td>
      </tr>
      <tr>
        <td><code>enabled</code></td>
        <td><code>true</code></td>
        <td>Enables search UI.</td>
      </tr>
    </tbody>
  </table>
</div>

Inline code should not blow up the layout, even if it is verylongandunbrokenandkeptinlineforstress-testing.
