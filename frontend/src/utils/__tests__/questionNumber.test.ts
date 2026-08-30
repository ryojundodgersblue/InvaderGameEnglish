// 仕様: 1パート=8問(デモ1+本問7)。スコアは「デモ除く」(Data Specs E32)。
// 要望No.166: 問題番号の表示もデモを除いた本問1〜7で数え、結果画面の「n/7」と一致させる
import { describe, it, expect } from 'vitest';
import { realQuestionNumber, questionBadgeLabel, questionBannerText } from '../questionNumber';

// 実データと同じ構成: 先頭がデモ、以降7問が本問
const QS = [
  { is_demo: true },
  { is_demo: false }, { is_demo: false }, { is_demo: false }, { is_demo: false },
  { is_demo: false }, { is_demo: false }, { is_demo: false },
];

describe('問題番号のデモ除外カウント (No.166)', () => {
  it('デモは番号ではなく「デモ」と表示する', () => {
    expect(questionBadgeLabel(QS, 0)).toBe('デモ');
    expect(questionBannerText(QS, 0)).toBe('start a demo !');
  });

  it('本問はデモを除いて1から数える', () => {
    expect(questionBadgeLabel(QS, 1)).toBe('1');
    expect(questionBannerText(QS, 1)).toBe('Question 1 !');
  });

  it('最後の本問は7になる(8ではない=結果画面のn/7と一致)', () => {
    expect(questionBadgeLabel(QS, 7)).toBe('7');
    expect(questionBannerText(QS, 7)).toBe('Question 7 !');
    expect(realQuestionNumber(QS, 7)).toBe(7);
  });

  it('デモが無いパート構成でも1始まりで数えられる(防御)', () => {
    const noDemo = [{ is_demo: false }, { is_demo: false }];
    expect(questionBadgeLabel(noDemo, 0)).toBe('1');
    expect(questionBadgeLabel(noDemo, 1)).toBe('2');
  });

  it('範囲外indexは空文字(防御)', () => {
    expect(questionBadgeLabel(QS, 99)).toBe('');
  });
});
