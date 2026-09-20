+++
title = "Print"
description = "All-in-one print compilation for the major theme components."
weight = 80
+++

This page compiles the major theme components into a single print-friendly
document. Use print preview to verify that the content remains readable when
navigation, TOC, and interactive chrome are hidden.

## Callouts

{{< note title="Print contract" >}}
The printed output should keep the article content, component examples, and
metadata readable without relying on JavaScript or interactive controls.
{{< /note >}}

{{< details title="Print notes" open=true >}}
The print stylesheet should keep important content visible, avoid excessive
white space, and print every panel in choice groups.
{{< /details >}}

## Figures

{{< figure src="/images/docs-diagram.svg" alt="A simple docs layout diagram" caption="Figures should remain readable in print output." >}}

## Tabs

{{< tabs >}}
{{< tab title="Layout" >}}
Print keeps the article column readable while removing sidebar and TOC chrome.
{{< /tab >}}

{{< tab title="Content" >}}
Headings, paragraphs, lists, tables, and figures should all remain legible.
{{< /tab >}}

{{< tab title="Panels" >}}
Every tab panel prints so reviewers can inspect the full component state.
{{< /tab >}}
{{< /tabs >}}

## Methods

{{< methods >}}
{{< method title="Screen" badge="Default" >}}
The screen layout uses compact navigation and interactive controls.
{{< /method >}}

{{< method title="Print" >}}
The printed layout removes the chrome and shows every panel inline.
{{< /method >}}

{{< method title="Archive" >}}
The archived view keeps the same readable structure without live UI.
{{< /method >}}
{{< /methods >}}

## Code groups

{{< code-group >}}
{{< code title="HTML" language="html" filename="article" >}}
<article class="docs-article">
  <h1>Print</h1>
  <p>All-in-one print compilation page.</p>
</article>
{{< /code >}}

{{< code title="Markdown" language="md" filename="fixture" >}}
{{< note title="Print preview" >}}
This page verifies printable output for the theme.
{{< /note >}}
{{< /code >}}

{{< code title="CSS" language="css" filename="print.css" >}}
@media print {
  .docs-sidebar,
  .docs-toc {
    display: none;
  }
}
{{< /code >}}
{{< /code-group >}}

## Cards

{{< cards columns="3" >}}
{{< card title="Getting Started" href="/en/docs/latest/getting-started/" icon="start" badge="Guide" >}}
Install the theme and understand the docs structure.
{{< /card >}}

{{< card title="Reference" href="/en/docs/latest/components/reference/" icon="browse" badge="API" >}}
Use structured blocks for configs, commands, and statuses.
{{< /card >}}

{{< card title="Navigation" href="/en/docs/latest/navigation/" icon="browse" badge="Sidebar" >}}
Review the content tree and manual navigation behavior.
{{< /card >}}
{{< /cards >}}

## Reference

{{< config-option name="params.docs.rightToc" type="boolean" default="true" since="v1.0" >}}
Controls whether the right-side table of contents appears on documentation pages.
{{< /config-option >}}

{{< http-endpoint method="GET" path="/v1/projects/{id}" auth="required" since="v1.0" >}}
Returns a project by ID in the reference documentation model.
{{< /http-endpoint >}}

{{< status-code code="404" label="Not Found" >}}
The requested project does not exist or the caller does not have access.
{{< /status-code >}}

## Steps

{{< steps start=1 >}}

{{< step title="Open print preview" status="Required" >}}
Use the browser print dialog or preview mode to inspect the full page.
{{< /step >}}

{{< step title="Check panels" status="Required" >}}
Confirm that tabs, methods, and code groups print all panels and snippets.
{{< /step >}}

{{< step title="Review spacing" optional=true >}}
Make sure cards, tables, figures, and reference blocks stay readable on paper.
{{< /step >}}

{{< /steps >}}

## Table

| Element | Print behavior |
|---|---|
| Sidebar | Hidden |
| TOC | Hidden |
| Tabs | All panels visible |
| Methods | All methods visible |
| Code groups | All snippets visible |
| Details | Expanded in print |
