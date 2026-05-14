+++
title = "印刷"
description = "印刷専用のレンダリングとコンテンツの流れを確認するフィクスチャページ。"
weight = 110
+++

このページは、サイドバー、TOC、インタラクティブな UI に依存せずに、
コンテンツがきれいに印刷されることを確認するためのものです。

{{< details title="印刷メモ" open=true >}}
印刷用スタイルシートは本文の可読性を保ち、重要な情報の表示に
折りたたみ UI へ依存してはいけません。
{{< /details >}}

{{< figure src="/images/docs-diagram.svg" alt="ドキュメントレイアウト図" caption="図は印刷時にも読みやすくあるべきです。" >}}

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>要素</th>
        <th>印刷時の挙動</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>サイドバー</td>
        <td>非表示</td>
      </tr>
      <tr>
        <td>TOC</td>
        <td>非表示</td>
      </tr>
      <tr>
        <td>コードブロック</td>
        <td>保持</td>
      </tr>
    </tbody>
  </table>
</div>

