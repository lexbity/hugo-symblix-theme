+++
title = "Référence"
description = "Blocs de référence structurés pour la configuration, les API, les commandes et les codes d'état."
docType = "reference"
weight = 55
+++

{{< hero eyebrow="Composants de référence" title="Référence structurée" subtitle="Remplacez les tableaux bruts par des éléments de référence lisibles et liés." headingLevel="2" primaryHref="/fr/docs/latest/components/" primaryLabel="Retour aux composants" secondaryHref="/fr/docs/latest/technical-content/" secondaryLabel="Voir le contenu technique" >}}
{{< /hero >}}

{{< config-option name="params.docs.rightToc" type="boolean" default="true" since="v1.0" >}}
Contrôle l’affichage de la table des matières à droite sur les pages de documentation.
{{< /config-option >}}

{{< param name="title" type="string" required=true >}}
Titre visible du composant ou de la page.
{{< /param >}}

{{< property name="versions[].id" type="string" required=true since="v1.0" >}}
Segment d’URL et clé interne de version utilisés pour le routage et le changement de version.
{{< /property >}}

{{< env-var name="HUGO_ENV" default="production" >}}
Contrôle l’environnement de build Hugo et peut servir à varier le comportement de compilation.
{{< /env-var >}}

{{< cli-command name="docworkbench audit" >}}
Analyse le contenu documentaire et signale les liens brisés, les pages obsolètes et les métadonnées manquantes.

```sh
docworkbench audit ./exampleSite
```
{{< /cli-command >}}

{{< http-endpoint method="GET" path="/v1/projects/{id}" auth="required" since="v1.0" >}}
Retourne un projet à partir de son identifiant.
{{< /http-endpoint >}}

{{< status-code code="404" label="Not Found" >}}
Le projet demandé n’existe pas ou l’appelant n’y a pas accès.
{{< /status-code >}}
