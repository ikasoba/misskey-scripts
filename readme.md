# misskey scripts

## 環境変数

以下の環境変数から挙動を調整できます。

- FetchWorker_threshold

  HTTP リクエスト時のタイマーの待ち時間を減らすまでの時間(ミリ秒)

  デフォルト: `30000`

- FetchWorker_maxConnect

  HTTP リクエスト時に同一ドメインへ接続できる最大数を設定します。

  デフォルト: `3`

- TaskQueue_maxTasks

  同時に実行できるタスクの数

  デフォルト: `5`

## 使い方

```plain
$ miscripts <misskey-config-path> <script-name>
```

# スクリプト一覧

## resolveBrokenAvatars

連合先のユーザーのアバター画像が読み込めない場合に連合先から解決するスクリプトです。

一度実行すれば postgres 内のデータを書き換えてくれます。

### 環境変数

以下の環境変数から細かく挙動を調整できます。

- process_limit

  一度に処理するユーザーの数を制限します。

  これは、一度に処理するすべてのユーザーを完全に処理してから実際にデータベースへ反映させます。

  例えば 10 に指定されれば毎回、データベースからユーザーを 10 件取得し、その 10 件のユーザーのアイコンをすべて取得してから実際にデータベースへ反映させます。

  デフォルト: `3`

## deleteNonExistentFiles

実際には存在しないファイルを削除します。

これはオブジェクトストレージなどを使用していない状態でのみ可能です。

### 環境変数

以下の環境変数から細かく挙動を調整できます。

- process_limit

  一度に処理するファイルの数を制限します。

  デフォルト: `10`

- process_delay

  タスクごとに実行する時間をミリ秒単位でづらす

  デフォルト: `5000`

## deleteBrokenEmojis

壊れた絵文字を削除します。

### 環境変数

以下の環境変数から細かく挙動を調整できます。

- process_limit

  一度に処理する絵文字の数を制限します。

  デフォルト: `10`
