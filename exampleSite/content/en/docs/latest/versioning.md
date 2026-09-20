+++
title = "Versioning"
description = "Publish documentation versions that track releases of your software project."
related = ["/en/docs/latest/navigation/", "/en/docs/latest/multilingual/"]
weight = 40
+++

Documentation versions in this theme correspond to releases of the matching software project. When the project ships a new release, the docs for the previous release are frozen in place and a new tree carries the current documentation.

## Model

- `latest` (or whatever `current` points to) is the live documentation for the current development state.
- Each released version gets its own content tree (`v1.0/`, `v2.0/`, …) that is frozen when the software ships.
- Archived versions stay browsable, are clearly labelled in the version switcher, and — with `noindexArchived = true` — are excluded from search engines and the sitemap so they do not compete with current docs in search results.

The example site ships a `latest` tree and an archived `v1.0` tree:

- `/en/docs/latest/`
- `/en/docs/v1.0/`

## Version data

`data/docs_versions.yaml` declares the versions, their labels, and their release state:

```yaml
current: latest
versions:
  - id: latest
    label: Latest
    weight: 100
    archived: false
  - id: v1.0
    label: v1.0
    weight: 90
    archived: true
```

The `id` must match the folder name under the docs root (in every language). `weight` controls the ordering in the version switcher.

## Release workflow

1. While developing toward a release, edit pages under `content/<lang>/docs/latest/`.
2. When the software ships version X.Y, copy the `latest/` tree to `content/<lang>/docs/vX.Y/` and freeze it.
3. Add a `vX.Y` entry to `data/docs_versions.yaml` with `archived: true`.
4. Keep fixing forward in `latest/`; backport only if the archived release is still supported.
5. When an archived release reaches end of life, either mark it clearly in the switcher or remove its tree and data entry.

The `current` slug is not limited to the name `latest` — projects that prefer a `stable` tree can name the folder `content/<lang>/docs/stable/` and set `current: stable`. Everything else in this page works the same.

## Versioned navigation

A version tree can ship its own sidebar navigation. Create a data file named after the base nav file plus the version id — for the default `data = "docs_nav"` setting, `data/docs_nav_v1.0.yaml` is used for every page under `docs/v1.0/`, while all other versions keep using `docs_nav.yaml`:

```yaml
items:
  - title: Home
    page: /en/docs/v1.0/

  - title: Getting Started
    page: /en/docs/v1.0/getting-started/
```

The example site ships exactly this file, so switching to v1.0 also switches the sidebar.

## Translations and archived versions

Translated trees only need to track the **current** version. An archived release that exists only in the default language is normal: the version switcher and language switcher both degrade gracefully (per language, then to the version root, then to the language home).

## Resolution warnings

Two build-time warnings help catch versioning drift:

- A `warnf` fires when a version id in `data/docs_versions.yaml` has no matching content section in **any** language (a data/content mismatch). A version missing from only some languages is expected and stays silent.
- Set `versions.warnUnresolved = true` under `[params.docs]` to also warn whenever the version switcher cannot find a page equivalent and falls back to linking the version root. Useful as a lint pass when pruning or renaming pages between releases; off by default because falling back is often intended.

## Equivalent pages

Version switching keeps the reader as close to their current page as possible: it first looks for the same path in the target version, then for a sibling page with the same file name, and finally lands on the target version root.

{{< note title="Keep page names stable" >}}
The sibling lookup is file-name based. When a page is renamed between releases, add an alias in the renamed page's front matter so old URLs keep working across versions.
{{< /note >}}
