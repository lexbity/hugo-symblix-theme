+++
title = "Étapes"
description = "Flux ordonnés pour les tutoriels, l’installation et les migrations."
weight = 13
+++

{{< steps start=1 >}}

{{< step title="Créer le site" status="Requis" >}}
```sh
hugo new site my-docs
```
{{< /step >}}

{{< step title="Ajouter le thème" status="Requis" >}}
```sh
git submodule add https://github.com/example/hugo-theme-docworkbench themes/docworkbench
```
{{< /step >}}

{{< step title="Ajouter votre contenu" optional=true >}}
Écrivez vos premières pages de documentation et reliez-les au menu latéral.
{{< /step >}}

{{< /steps >}}
