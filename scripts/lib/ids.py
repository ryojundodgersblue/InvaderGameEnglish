"""対象文字列(例: '1-4-2-1')のパースとID算出。

ID体系(Data Specsで全件検証済みの決定的ルール):
    part_id     = grade*1000 + part_no*10 + subpart_no
    question_id = part_id*10 + display_order
"""
import json
import os
import re
import unicodedata

_MAPPINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'manual_mappings.json')


def load_manual_mappings():
    with open(_MAPPINGS_PATH, encoding='utf-8') as f:
        return json.load(f)


def normalize_target(raw):
    """対象セルの揺れを正規化して 'g-p-s-q' / 'g-p-s' 形式の文字列にする。

    対応する揺れ:
    - 全角数字・全角ハイフン(NFKC)
    - '3-31-2--1' のような連続ハイフン
    - '1 _41_2_01' のような空白・アンダースコア混在
    - Excelの日付化け('2001-09-02 00:00:00'等)は manual_mappings.json で解決
    戻り値: 正規化済み文字列 or None(解決不能)
    """
    if raw is None:
        return None
    s = str(raw).strip()
    mappings = load_manual_mappings()
    if s in mappings:
        return mappings[s]  # 値がNoneなら「解決不能・要確認」
    s = unicodedata.normalize('NFKC', s)
    s = s.replace(' ', '').replace('　', '')
    s = s.replace('_', '-')
    s = re.sub(r'-+', '-', s)
    if re.fullmatch(r'\d+(-\d+)*', s):
        return s
    return None


def parse_components(normalized):
    """正規化済み対象から数値成分リストを返す(ゼロ埋め除去)。"""
    if not normalized:
        return []
    return [int(x) for x in normalized.split('-')]


def part_id(grade, part_no, subpart_no):
    return grade * 1000 + part_no * 10 + subpart_no


def question_id(grade, part_no, subpart_no, order):
    return part_id(grade, part_no, subpart_no) * 10 + order


def target_to_question_id(raw):
    """'g-p-s-q' 形式の対象 → question_id。形式不一致は None。"""
    comps = parse_components(normalize_target(raw))
    if len(comps) == 4:
        return question_id(*comps)
    return None


def target_to_part_id(raw):
    """対象の先頭3成分 → part_id。3成分未満は None。

    Requirement修正の対象は 'g-p-s' のほか 'g-p-s-q'(qは行内の代表問題)でも
    記入されるため、先頭3成分でpartを特定する。
    """
    comps = parse_components(normalize_target(raw))
    if len(comps) >= 3:
        return part_id(comps[0], comps[1], comps[2])
    return None
