+++
title = "Steps"
description = "Ordered workflows for tutorials, setup, and migrations."
weight = 13
+++

{{< steps start=1 >}}

{{< step title="Create the site" status="Required" >}}
```sh
hugo new site my-docs
```
{{< /step >}}

{{< step title="Add the theme" status="Required" >}}
```sh
git submodule add https://github.com/example/hugo-theme-docworkbench themes/docworkbench
```
{{< /step >}}

{{< step title="Add your content" optional=true >}}
Write your first documentation pages and connect them to the sidebar.
{{< /step >}}

{{< /steps >}}
