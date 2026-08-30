// 仕様: 音声判定の正規化・短縮形同一視(No149)・won't補正(No157/8-24反映) のデグレ検知網
import { describe, it, expect } from 'vitest';
import {
  normalize, simLevenshtein, jaccard, containsAsToken,
  wantCorrectionApplies, expandWontToWant,
} from '../textMatch';

describe('normalize: 短縮形の同一視 (No149)', () => {
  it("I'm と I am を同一視する", () => {
    expect(normalize("I'm a student")).toBe(normalize('I am a student'));
  });
  it("won't は will not に展開される", () => {
    expect(normalize("I won't believe you")).toBe('i will not believe you');
  });
  it('アポストロフィ無しの dont も展開される', () => {
    expect(normalize('I dont like it')).toBe(normalize("I don't like it"));
  });
  it('記号は除去し空白は正規化する', () => {
    expect(normalize('  Hello,   world! ')).toBe('hello world');
  });
});

describe('判定閾値まわり (FUZZY_MATCH_THRESHOLD=0.62 は8/11決着・変更禁止)', () => {
  it('完全一致は類似度1', () => {
    expect(simLevenshtein('abc', 'abc')).toBe(1);
    expect(jaccard('a b c', 'a b c')).toBe(1);
  });
  it('1語解答は認識文に含まれれば正解扱いにできる (containsAsToken)', () => {
    expect(containsAsToken(normalize('he is nice'), normalize('He'))).toBe(true);
    expect(containsAsToken(normalize('she is nice'), normalize('He'))).toBe(false);
  });
});

describe("won't→want 補正 (No157: 8/24反映の回帰テスト)", () => {
  const wantAns = ['I want to be a singer.'];
  const wontAns = ["I won't believe your story."];

  it('wantが正解の問題では補正候補が追加される', () => {
    const out = expandWontToWant(["I won't to be a singer"], wantAns);
    expect(out).toContain('I want to be a singer');
    expect(out).toContain("I won't to be a singer"); // 元候補も残す
  });
  it("won'tが正解の問題(2-14-1)では補正しない", () => {
    expect(wantCorrectionApplies(wontAns)).toBe(false);
    expect(expandWontToWant(['I want believe your story'], wontAns))
      .toEqual(['I want believe your story']);
  });
  it('アポストロフィ無しの wont も補正対象', () => {
    expect(expandWontToWant(['I wont to be a singer'], wantAns))
      .toContain('I want to be a singer');
  });
});
