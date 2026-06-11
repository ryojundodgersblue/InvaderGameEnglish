#!/usr/bin/env python3
"""修正画像・新規画像を frontend/public/questions へ正規化コピーする。

入力(読み取りのみ・変更しない):
    doc/英会話ゲーム画像/修正画像/   差し替え画像(②付きは最新版)
    doc/英会話ゲーム画像/仮/         新規追加・再修正画像

正規化ルール(Mukaさんと合意済みの命名規則に揃える):
    ②除去(version=2として記録) → NFKC(全角→半角) → 空白除去 → ハイフン→アンダースコア
    → 問題番号を2桁ゼロ埋め → 小文字拡張子
    正規形: {grade}_{part}_{subpart}_{NN}.png

同一正規名に複数ソースがある場合は ②付き(version=2) を優先する。

出力:
    frontend/public/questions/*.png   (差し替え92 + 新規24 → 計952枚)
    scripts/reports/image_manifest.md (全対応表)

期待件数と一致しない場合は exit 1(誤反映防止のガード)。
"""
import hashlib
import os
import re
import shutil
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIRS = [
    ('修正画像', os.path.join(ROOT, 'doc', '英会話ゲーム画像', '修正画像')),
    ('仮', os.path.join(ROOT, 'doc', '英会話ゲーム画像', '仮')),
]
DEST = os.path.join(ROOT, 'frontend', 'public', 'questions')
REPORT = os.path.join(ROOT, 'scripts', 'reports', 'image_manifest.md')

EXPECTED_REPLACED = 92
EXPECTED_ADDED = 24
EXPECTED_FINAL = 952

CANONICAL_RE = re.compile(r'^[123]_\d{1,2}_\d_\d{2}\.png$')


def normalize_name(name):
    """ファイル名を正規形に変換。(canonical, version) を返す。不正形式は (None, v)。"""
    base = name
    version = 1
    if '②' in base:
        version = 2
        base = base.replace('②', '')
    base = unicodedata.normalize('NFKC', base)
    base = base.replace(' ', '').replace('　', '')
    base = re.sub(r'\.?png$', '', base, flags=re.I)
    base = base.replace('-', '_').replace('−', '_').replace('ー', '_')
    m = re.fullmatch(r'(\d+)_(\d+)_(\d+)_(\d+(?:\.\d+)?)', base)
    if not m:
        return None, version
    g, p, s, n = m.groups()
    n = n.replace('.', '')  # '0.6' のような打ち間違い→ '06'
    canonical = f'{int(g)}_{int(p)}_{int(s)}_{int(n):02d}.png'
    if not CANONICAL_RE.match(canonical):
        return None, version
    return canonical, version


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    # 1. ソース収集(②優先で正規名ごとに1ファイル選定)
    selected = {}   # canonical -> {src, folder, original, version}
    rejected = []   # 正規化できなかったファイル
    for folder, path in SRC_DIRS:
        if not os.path.isdir(path):
            print(f'ERROR: source dir not found: {path}')
            return 1
        for fn in sorted(os.listdir(path)):
            if fn == '.DS_Store' or not fn.lower().endswith('png'):
                continue
            canonical, version = normalize_name(fn)
            if canonical is None:
                rejected.append((folder, fn))
                continue
            cur = selected.get(canonical)
            if cur is None or version > cur['version']:
                selected[canonical] = {
                    'src': os.path.join(path, fn), 'folder': folder,
                    'original': fn, 'version': version,
                }

    if rejected:
        print('ERROR: 正規化できないファイルがあります:')
        for folder, fn in rejected:
            print(f'  {folder}/{fn}')
        return 1

    # 2. 分類(差し替え or 新規)とコピー
    existing = set(os.listdir(DEST))
    rows = []
    replaced = added = unchanged = 0
    for canonical in sorted(selected):
        info = selected[canonical]
        src_hash = sha256(info['src'])
        dest_path = os.path.join(DEST, canonical)
        if canonical in existing:
            before_hash = sha256(dest_path)
            if before_hash == src_hash:
                action = '変更なし'
                unchanged += 1
            else:
                action = '差し替え'
                replaced += 1
        else:
            action = '新規追加'
            added += 1
        shutil.copyfile(info['src'], dest_path)
        rows.append((canonical, info['folder'], info['original'],
                     'v2(②)' if info['version'] == 2 else 'v1', action, src_hash[:12]))

    final_count = len([f for f in os.listdir(DEST) if f.lower().endswith('.png')])

    # 3. レポート出力
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('# 画像反映マニフェスト\n\n')
        f.write(f'- 反映元: `doc/英会話ゲーム画像/修正画像`, `doc/英会話ゲーム画像/仮`\n')
        f.write(f'- 反映先: `frontend/public/questions/`\n')
        f.write(f'- 差し替え: {replaced}件 / 新規追加: {added}件 / 変更なし: {unchanged}件\n')
        f.write(f'- 反映後の総数: {final_count}枚\n')
        f.write('- 同一問題に複数版がある場合は②付き(v2)を優先\n\n')
        f.write('| 反映後ファイル名 | 出所 | 元ファイル名 | 版 | 区分 | SHA256(先頭12) |\n')
        f.write('|---|---|---|---|---|---|\n')
        for r in rows:
            f.write('| ' + ' | '.join(r) + ' |\n')

    print(f'差し替え: {replaced} / 新規: {added} / 変更なし: {unchanged} / 反映後総数: {final_count}')

    # 4. ガード: 初回実行は(差し替え92+新規24)、再実行(冪等)は全116件が変更なし
    total = replaced + added + unchanged
    first_run_ok = (replaced == EXPECTED_REPLACED and added == EXPECTED_ADDED)
    rerun_ok = (replaced == 0 and added == 0 and unchanged == EXPECTED_REPLACED + EXPECTED_ADDED)
    ok = True
    if not (first_run_ok or rerun_ok):
        print(f'ERROR: 反映件数が期待値と不一致 (差し替え{replaced}/新規{added}/変更なし{unchanged}, '
              f'期待: 初回{EXPECTED_REPLACED}+{EXPECTED_ADDED} or 再実行で全{EXPECTED_REPLACED + EXPECTED_ADDED}件変更なし)')
        ok = False
    if total != EXPECTED_REPLACED + EXPECTED_ADDED:
        print(f'ERROR: 反映元ファイル数が期待値と不一致 (expected {EXPECTED_REPLACED + EXPECTED_ADDED}, got {total})')
        ok = False
    if final_count != EXPECTED_FINAL:
        print(f'ERROR: 反映後総数が期待値と不一致 (expected {EXPECTED_FINAL}, got {final_count})')
        ok = False
    if not ok:
        return 1
    print(f'OK: レポート -> {os.path.relpath(REPORT, ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
