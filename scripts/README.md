# scripts/ — データ・画像パイプライン

`outputs/` の正本ファイル(Mukaさんの修正依頼・最新データ)から、システムが使う完成版データを再現可能な形で生成するスクリプト群。すべて冪等(再実行しても同じ結果)。

## 実行順

```bash
# 1. 画像反映: doc/英会話ゲーム画像/{修正画像,仮} → frontend/public/questions/(952枚)
python3 scripts/deploy_images.py

# 2. データ構築: 修正依頼673件を適用して完成版データを生成
#    出力: backend/data/*.json(ローカルモード用) + outputs/Data Specs_完成版_*.xlsx + apply_report
python3 scripts/build_dataset.py

# 3. 整合性チェック(ID体系・8問構成・画像実在・記号・解答混入)
python3 scripts/verify_dataset.py

# 4. ドキュメント反映(要望書のステータス・仕様書v1.6)※成果確定後に1回だけ
python3 scripts/update_workbooks.py
```

## 入力(変更しない)

| ファイル | 内容 |
|---|---|
| `outputs/Data Specs_2026-06-11.xlsx` | ベースデータ(正本) |
| `outputs/Mukaさん_ユーザー要望書.xlsx` | 修正依頼・不具合・要望の一覧 |
| `doc/英会話ゲーム画像/修正画像`, `仮` | 差し替え・新規イラスト(②付きが最新版) |

## 出力

| ファイル | 内容 |
|---|---|
| `backend/data/*.json` | ローカルデータモード(DATA_SOURCE=local)用の完成版データ |
| `outputs/Data Specs_完成版_*.xlsx` | Mukaさん納品用の新土台シート |
| `frontend/public/questions/*.png` | ゲームが参照する画像(952枚) |
| `scripts/reports/image_manifest.md` | 画像反映の全対応表 |
| `scripts/reports/apply_report.md/.json` | 修正適用の全ログ+クライアント要確認リスト |

## 修正依頼のパース仕様(build_dataset.py)

修正内容セルの形式を自動判別する:

| 形式 | 例 | 解釈 |
|---|---|---|
| `問題文：Q 解答：A` | 問題文：What is this? 解答：This is a dog. | Q/Aペア |
| `Q?(改行)A: 解答` | ...New Year's Day?\nA: New Year's Day is... | Q/Aペア |
| `問題文、解答ともに訂正 Q A` | 問題文、解答ともに訂正 Am I excited? Was I... | 2文に分割してQ/A |
| タブ区切り | Q\tA | Q/Aペア |
| 矢印 | I read a book. → The book I read... | Q/Aペア(言い換え問題) |
| スラッシュ | This table/This table is strong. | Q/Aペア |
| `Q? 解答文`(区切りなし) | What is fun to do? It's fun to... | 後続文が解答文と類似(Jaccard≥0.5)ならQ/A分割 |
| 単文 | What's this? | 問題文置換(解答文に一致する場合は解答側へ) |

その他: 先頭の `→` `/` `問題修正` `解答の修正` 等のラベルは自動除去。
対象セルの揺れ(全角・`3-31-2--1`・Excel日付化け)は `lib/ids.py` + `manual_mappings.json` で解決。
存在しないパートへの8問完全セットは新規サブパートとして作成(3-31-3, 3-31-4)。

## 本番反映(Node・別途手動実行)

```bash
node backend/scripts/sync_to_sheets.js            # dry-run
node backend/scripts/sync_to_sheets.js --execute  # Google Sheetsへ実反映
node backend/scripts/verify_api.mjs               # API一括検証(ローカル/本番)
```
