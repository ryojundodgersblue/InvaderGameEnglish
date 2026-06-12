#!/usr/bin/env python3
"""
最新問題一覧Excelを生成するスクリプト。
backend/data/*.json を読み込み、outputs/ に出力する。
"""
import json
import os
from openpyxl import Workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, "backend", "data")
OUTPUT_DIR = os.path.join(BASE, "outputs")

# ── データ読み込み ──────────────────────────────────────────
with open(os.path.join(DATA_DIR, "grades.json"), encoding="utf-8") as f:
    grades = {g["id"]: g["grade_no"] for g in json.load(f)}

with open(os.path.join(DATA_DIR, "parts.json"), encoding="utf-8") as f:
    parts = {p["part_id"]: p for p in json.load(f)}

with open(os.path.join(DATA_DIR, "questions.json"), encoding="utf-8") as f:
    questions = json.load(f)

with open(os.path.join(DATA_DIR, "answer_patterns.json"), encoding="utf-8") as f:
    # question_id → [expected_text, ...] (複数解答対応)
    ans_map: dict[int, list[str]] = {}
    for ap in json.load(f):
        ans_map.setdefault(ap["question_id"], []).append(ap["expected_text"])

# ── 行データ構築 ──────────────────────────────────────────
rows = []
for q in questions:
    part = parts.get(q["part_id"], {})
    grade_no = grades.get(part.get("grade_id", 0), "?")
    part_no = part.get("part_no", "?")
    subpart_no = part.get("subpart_no", "?")
    requirement = part.get("requirement", "").replace("\n", " ")
    answers = " / ".join(ans_map.get(q["question_id"], []))
    rows.append({
        "学年": grade_no,
        "パート": part_no,
        "サブパート": subpart_no,
        "part_id": q["part_id"],
        "question_id": q["question_id"],
        "表示順": q["display_order"],
        "デモ": "◎" if q["is_demo"] else "",
        "問題文": q["question_text"],
        "解答": answers,
        "イラスト": q.get("image_url", ""),
        "指示文": requirement,
    })

# 学年→パート→サブパート→表示順でソート
rows.sort(key=lambda r: (r["学年"], r["パート"], r["サブパート"], r["表示順"]))

# ── Excel 生成 ──────────────────────────────────────────
wb = Workbook()
ws = wb.active
ws.title = "問題一覧"

# カラー定義
HEADER_FILL = PatternFill("solid", fgColor="2563EB")   # Brand Blue
DEMO_FILL   = PatternFill("solid", fgColor="DBEAFE")   # 薄青
ODD_FILL    = PatternFill("solid", fgColor="F8FAFC")   # Off White
EVEN_FILL   = PatternFill("solid", fgColor="EFF6FF")   # 超薄青
BORDER_SIDE = Side(style="thin", color="CBD5E1")
THIN_BORDER = Border(
    left=BORDER_SIDE, right=BORDER_SIDE,
    top=BORDER_SIDE, bottom=BORDER_SIDE
)

COLUMNS = [
    ("学年",       6),
    ("パート",     6),
    ("サブ",       6),
    ("part_id",   9),
    ("question_id", 12),
    ("表示順",     7),
    ("デモ",       6),
    ("問題文",    40),
    ("解答",      30),
    ("イラスト",  20),
    ("指示文",    50),
]

# ヘッダー行
ws.freeze_panes = "A2"
ws.row_dimensions[1].height = 22
for col_idx, (header, width) in enumerate(COLUMNS, start=1):
    cell = ws.cell(row=1, column=col_idx, value=header)
    cell.fill = HEADER_FILL
    cell.font = Font(bold=True, color="FFFFFF", size=10, name="Noto Sans JP")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = THIN_BORDER
    ws.column_dimensions[get_column_letter(col_idx)].width = width

# データ行
FIELD_ORDER = ["学年","パート","サブパート","part_id","question_id","表示順","デモ","問題文","解答","イラスト","指示文"]
for row_idx, row_data in enumerate(rows, start=2):
    is_demo = row_data["デモ"] == "◎"
    fill = DEMO_FILL if is_demo else (ODD_FILL if row_idx % 2 == 0 else EVEN_FILL)
    for col_idx, field in enumerate(FIELD_ORDER, start=1):
        cell = ws.cell(row=row_idx, column=col_idx, value=row_data[field])
        cell.fill = fill
        cell.border = THIN_BORDER
        cell.alignment = Alignment(vertical="top", wrap_text=(col_idx >= 8))
        cell.font = Font(size=9)

# オートフィルター
ws.auto_filter.ref = ws.dimensions

# 統計シート
ws2 = wb.create_sheet("サマリー")
ws2.column_dimensions["A"].width = 25
ws2.column_dimensions["B"].width = 12

summary_data = [
    ("項目", "件数"),
    ("総問題数", len(rows)),
    ("デモ問題数", sum(1 for r in rows if r["デモ"])),
    ("本問題数",  sum(1 for r in rows if not r["デモ"])),
    ("学年数", len(grades)),
    ("パート数（全）", len(parts)),
]
# 学年別
for gid, gno in sorted(grades.items()):
    cnt = sum(1 for r in rows if r["学年"] == gno)
    summary_data.append((f"  {gno}年生 問題数", cnt))

for r_idx, (label, val) in enumerate(summary_data, start=1):
    ws2.cell(row=r_idx, column=1, value=label).font = Font(bold=(r_idx == 1))
    ws2.cell(row=r_idx, column=2, value=val).alignment = Alignment(horizontal="right")

# ── 保存 ──────────────────────────────────────────────
from datetime import date
out_name = f"問題一覧_最新_{date.today().strftime('%Y-%m-%d')}.xlsx"
out_path = os.path.join(OUTPUT_DIR, out_name)
os.makedirs(OUTPUT_DIR, exist_ok=True)
wb.save(out_path)
print(f"✅ 生成完了: {out_path}")
print(f"   総問題数: {len(rows)}")
print(f"   デモ問題: {sum(1 for r in rows if r['デモ'])}")
print(f"   本問題数: {sum(1 for r in rows if not r['デモ'])}")
