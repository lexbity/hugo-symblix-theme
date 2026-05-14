+++
title = "Reference"
description = "Structured reference blocks for configuration, APIs, commands, and status codes."
docType = "reference"
weight = 55
+++

{{< hero eyebrow="Reference components" title="Structured reference" subtitle="Replace raw tables with scannable, linkable reference items." headingLevel="2" primaryHref="/en/docs/latest/components/" primaryLabel="Back to components" secondaryHref="/en/docs/latest/technical-content/" secondaryLabel="See technical content" >}}
{{< /hero >}}

{{< config-option name="params.docs.rightToc" type="boolean" default="true" since="v1.0" >}}
Controls whether the right-side table of contents appears on documentation pages.
{{< /config-option >}}

{{< param name="title" type="string" required=true >}}
Visible title for the component or page.
{{< /param >}}

{{< property name="versions[].id" type="string" required=true since="v1.0" >}}
URL segment and internal version key used for routing and version switching.
{{< /property >}}

{{< env-var name="HUGO_ENV" default="production" >}}
Controls the Hugo build environment and can be used to branch build behavior.
{{< /env-var >}}

{{< cli-command name="docworkbench audit" >}}
Audits documentation content and reports broken links, stale pages, and missing metadata.

```sh
docworkbench audit ./exampleSite
```
{{< /cli-command >}}

{{< http-endpoint method="GET" path="/v1/projects/{id}" auth="required" since="v1.0" >}}
Returns a project by ID.
{{< /http-endpoint >}}

{{< status-code code="404" label="Not Found" >}}
The requested project does not exist or the caller does not have access.
{{< /status-code >}}
