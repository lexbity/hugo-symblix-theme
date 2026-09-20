+++
title = "参照"
description = "設定、API、コマンド、HTTP エンドポイントの構造化された参照ブロック。"
weight = 100
+++

{{< config-option name="params.docs.rightToc" type="boolean" default="true" since="v1.0" >}}
ドキュメントページで右側の目次を表示するかどうかを制御します。
{{< /config-option >}}

{{< param name="title" type="string" required=true >}}
コンポーネントまたはページに表示されるタイトルです。
{{< /param >}}

{{< property name="versions[].id" type="string" required=true since="v1.0" >}}
ルーティングとバージョン切り替えに使う URL セグメントと内部キーです。
{{< /property >}}

{{< env-var name="HUGO_ENV" default="production" >}}
Hugo のビルド環境を制御します。
{{< /env-var >}}

{{< cli-command name="symblix audit" >}}
ドキュメントを監査し、壊れたリンクや古いページ、欠落したメタデータを報告します。
{{< /cli-command >}}

{{< http-endpoint method="GET" path="/v1/projects/{id}" auth="required" since="v1.0" >}}
ID でプロジェクトを返します。
{{< /http-endpoint >}}

{{< status-code code="404" label="Not Found" >}}
要求されたプロジェクトが存在しないか、呼び出し元にアクセス権がありません。
{{< /status-code >}}

