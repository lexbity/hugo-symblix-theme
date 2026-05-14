+++
title = "Versioning"
description = "Serve current and archived docs from the same site."
related = ["/en/docs/latest/navigation/", "/en/docs/latest/multilingual/"]
weight = 40
+++

Versioning is how the theme supports a current release and archived docs side by side.

## Current and archived versions

The example site ships a `latest` docs tree and a `v1.0` tree:

- `/en/docs/latest/`
- `/en/docs/v1.0/`

The current version is the default target for navigation, metadata, and browse pages. Archived versions can be marked as `archived` in `data/docs_versions.yaml`.

## Version data

```yaml
current: latest
versions:
  - id: latest
    label: Latest
    path: /en/docs/latest/
  - id: v1.0
    label: v1.0
    path: /en/docs/v1.0/
    archived: true
```

## Archived warning

Archived pages can render a warning and be excluded from search indexing or robots behavior in the release configuration. The example site uses this to keep the older version visible but clearly marked.

{{< note title="Equivalent pages" >}}
Version switching works best when pages have equivalents across releases. The theme falls back to the version root when an exact equivalent does not exist.
{{< /note >}}
