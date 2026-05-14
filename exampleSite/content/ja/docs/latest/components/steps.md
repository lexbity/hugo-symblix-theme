+++
title = "ステップ"
description = "チュートリアル、セットアップ、移行のための順序立てたワークフロー。"
weight = 13
+++

{{< steps start=1 >}}

{{< step title="サイトを作成する" status="必須" >}}
```sh
hugo new site my-docs
```
{{< /step >}}

{{< step title="テーマを追加する" status="必須" >}}
```sh
git submodule add https://github.com/example/hugo-theme-docworkbench themes/docworkbench
```
{{< /step >}}

{{< step title="コンテンツを追加する" optional=true >}}
最初のドキュメントページを書き、サイドバーに接続します。
{{< /step >}}

{{< /steps >}}
