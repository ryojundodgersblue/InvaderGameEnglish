#!/usr/bin/env python3
"""backend/data/*.json と frontend/public/questions の整合性検証。

エラーがあれば一覧表示して exit 1。警告のみなら exit 0。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, 'backend', 'data')
IMG_DIR = os.path.join(ROOT, 'frontend', 'public', 'questions')

# 1-44-1 はイラストのみの出題(要望No102でMukaさん確認済み)のため問題文なしを許容
EMPTY_TEXT_WHITELIST_PARTS = {1441}

CURLY_RE = re.compile(r'[‘’“”]')
CJK_RE = re.compile(r'[぀-ヿ一-鿿]')


def load(name):
    with open(os.path.join(DATA_DIR, f'{name}.json'), encoding='utf-8') as f:
        return json.load(f)


def main():
    errors = []
    warnings = []

    users = load('users')
    parts = load('parts')
    questions = load('questions')
    answers = load('answer_patterns')
    scores = load('scores')

    # --- parts ---
    pids = [p['part_id'] for p in parts]
    if len(pids) != len(set(pids)):
        errors.append('parts: part_idに重複あり')
    for p in parts:
        expect = p['grade_id'] * 1000 + p['part_no'] * 10 + p['subpart_no']
        if p['part_id'] != expect:
            errors.append(f"parts: ID体系不整合 part_id={p['part_id']} (期待 {expect})")
        if not str(p['requirement']).strip():
            warnings.append(f"parts: requirementが空 part_id={p['part_id']}")

    # --- questions ---
    q_by_part = {}
    qids = set()
    for q in questions:
        if q['question_id'] in qids:
            errors.append(f"questions: question_id重複 {q['question_id']}")
        qids.add(q['question_id'])
        q_by_part.setdefault(q['part_id'], []).append(q)
        expect = q['part_id'] * 10 + q['display_order']
        if q['question_id'] != expect:
            errors.append(f"questions: ID体系不整合 question_id={q['question_id']} (期待 {expect})")
        text = str(q['question_text'])
        if CURLY_RE.search(text):
            errors.append(f"questions: カーリー引用符残存 {q['question_id']}: {text!r}")
        if CJK_RE.search(text):
            errors.append(f"questions: 日本語混入 {q['question_id']}: {text!r}")
        if '→' in text or '\t' in text:
            errors.append(f"questions: 区切り記号残存 {q['question_id']}: {text!r}")
        if not text.strip() and q['part_id'] not in EMPTY_TEXT_WHITELIST_PARTS:
            errors.append(f"questions: 問題文が空 {q['question_id']}")
        url = str(q['image_url'] or '')
        if url:
            if not re.fullmatch(r'/questions/[\w.]+\.png', url):
                errors.append(f"questions: image_url形式不正 {q['question_id']}: {url!r}")
            elif not os.path.exists(os.path.join(IMG_DIR, url.split('/')[-1])):
                errors.append(f"questions: 画像ファイル不存在 {q['question_id']}: {url}")

    for pid in [p['part_id'] for p in parts]:
        qs = q_by_part.get(pid, [])
        if len(qs) != 8:
            errors.append(f'part {pid}: 問題数が{len(qs)}問(8問必要)')
            continue
        orders = sorted(q['display_order'] for q in qs)
        if orders != list(range(1, 9)):
            errors.append(f'part {pid}: display_orderが1〜8でない: {orders}')
        demos = [q['display_order'] for q in qs if q['is_demo']]
        if demos != [1]:
            errors.append(f'part {pid}: is_demoが1問目のみでない: {demos}')
    orphan_parts = set(q_by_part) - set(pids)
    if orphan_parts:
        errors.append(f'questions: 存在しないpartを参照: {sorted(orphan_parts)}')

    # --- answer_patterns ---
    aids = [a['id'] for a in answers]
    if len(aids) != len(set(aids)):
        errors.append('answer_patterns: idに重複あり')
    a_by_qid = {}
    for a in answers:
        a_by_qid.setdefault(a['question_id'], []).append(a)
        text = str(a['expected_text'])
        if CURLY_RE.search(text):
            errors.append(f"answers: カーリー引用符残存 qid={a['question_id']}: {text!r}")
        if CJK_RE.search(text):
            errors.append(f"answers: 日本語混入 qid={a['question_id']}: {text!r}")
        if '→' in text or '\t' in text:
            errors.append(f"answers: 区切り記号残存 qid={a['question_id']}: {text!r}")
        if not text.strip():
            errors.append(f"answers: 解答が空 qid={a['question_id']}")
    no_answer = qids - set(a_by_qid)
    if no_answer:
        errors.append(f'questions: 解答パターンなし: {sorted(no_answer)}')
    orphan_answers = set(a_by_qid) - qids
    if orphan_answers:
        errors.append(f'answers: 存在しない問題を参照: {sorted(orphan_answers)}')

    # --- users / scores ---
    for u in users:
        if not re.fullmatch(r'\d{5}', str(u['user_id'])):
            warnings.append(f"users: user_idが5桁でない: {u['user_id']!r}")
        for k in ('current_grade', 'current_part', 'current_subpart'):
            if not isinstance(u[k], int):
                errors.append(f"users: {k}が数値でない: {u['user_id']}")
    sids = [s['score_id'] for s in scores]
    if len(sids) != len(set(sids)):
        errors.append('scores: score_idに重複あり')
    for s in scores:
        if not re.fullmatch(r'\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}', str(s['play_date'])):
            errors.append(f"scores: play_date形式不正 score_id={s['score_id']}: {s['play_date']!r}")
        if 'avg_answer_time' not in s:
            errors.append(f"scores: avg_answer_timeカラム欠落 score_id={s['score_id']}")

    # --- 結果 ---
    print(f'parts: {len(parts)} / questions: {len(questions)} / answers: {len(answers)} '
          f'/ users: {len(users)} / scores: {len(scores)}')
    if warnings:
        print(f'\n警告 {len(warnings)}件:')
        for w in warnings:
            print(f'  WARN: {w}')
    if errors:
        print(f'\nエラー {len(errors)}件:')
        for e in errors:
            print(f'  ERROR: {e}')
        return 1
    print('\nOK: 整合性チェック合格')
    return 0


if __name__ == '__main__':
    sys.exit(main())
