+++
title = "Impression"
description = "Une page de test pour le rendu imprimé et le flux de contenu."
weight = 80
+++

Cette page confirme que le thème imprime proprement le contenu sans dépendre
de la barre latérale, de la table des matières ou du chrome interactif.

{{< details title="Notes d'impression" open=true >}}
La feuille de style d’impression doit conserver la lisibilité du corps du texte
et ne pas dépendre d’une UI repliable pour exposer les informations importantes.
{{< /details >}}

{{< figure src="/images/docs-diagram.svg" alt="Un schéma simple de mise en page" caption="Les figures doivent rester lisibles à l’impression." >}}

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Élément</th>
        <th>Comportement à l’impression</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Barre latérale</td>
        <td>Masquée</td>
      </tr>
      <tr>
        <td>Sommaire</td>
        <td>Masqué</td>
      </tr>
      <tr>
        <td>Blocs de code</td>
        <td>Conservés</td>
      </tr>
    </tbody>
  </table>
</div>

