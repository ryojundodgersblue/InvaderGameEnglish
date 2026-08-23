const NORMALIZE_REGEX_1 = /[^a-z0-9\s]/g;
const NORMALIZE_REGEX_2 = /\s+/g;

// 短縮形の展開表 (No149: I'm と I am のような言い方の揺れを同一視する)。
// 正解テキストと認識テキストの両方に同じ展開を適用するため、
// どちらの言い方でも判定結果は変わらない。
// ※「'd」は had の可能性もあるが、本教材の解答では would のみ使われる
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\bhe's\b/g, 'he is'],
  [/\bshe's\b/g, 'she is'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'],
  [/\bwhat's\b/g, 'what is'],
  [/\bwho's\b/g, 'who is'],
  [/\blet's\b/g, 'let us'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bwon't\b/g, 'will not'],
  [/\bwouldn't\b/g, 'would not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bmustn't\b/g, 'must not'],
  [/\bhaven't\b/g, 'have not'],
  [/\bhasn't\b/g, 'has not'],
  [/\bhadn't\b/g, 'had not'],
  [/\b(i|you|he|she|we|they|it)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|he|she|we|they)'d\b/g, '$1 would'],
];

// アポストロフィが落ちた短縮形(音声認識の出力に多い)のうち、
// 一般の英単語と衝突しないものだけを展開する。
// ※ ill(病気)/well(井戸)/were(過去形)/its(所有格)/id などは誤変換になるため対象外
const CONTRACTIONS_NO_APOSTROPHE: Array<[RegExp, string]> = [
  [/\bim\b/g, 'i am'],
  [/\byoure\b/g, 'you are'],
  [/\btheyre\b/g, 'they are'],
  [/\bdont\b/g, 'do not'],
  [/\bdoesnt\b/g, 'does not'],
  [/\bisnt\b/g, 'is not'],
  [/\barent\b/g, 'are not'],
  [/\bwasnt\b/g, 'was not'],
  [/\bwerent\b/g, 'were not'],
  [/\bdidnt\b/g, 'did not'],
  [/\bcant\b/g, 'cannot'],
  [/\bwont\b/g, 'will not'],
  [/\bcouldnt\b/g, 'could not'],
  [/\bwouldnt\b/g, 'would not'],
  [/\bshouldnt\b/g, 'should not'],
  [/\bmustnt\b/g, 'must not'],
  [/\bhavent\b/g, 'have not'],
  [/\bhasnt\b/g, 'has not'],
  [/\bhadnt\b/g, 'had not'],
  [/\btheyll\b/g, 'they will'],
  [/\bitll\b/g, 'it will'],
  [/\byouve\b/g, 'you have'],
  [/\btheyve\b/g, 'they have'],
];

// want→won't 誤認識の補正 (2026-08-11 Mukaさん承認)。
// 児童が「want」と言っても音声認識が「won't」と返すことがあるため、
// won't を want と読み替えた候補を判定に追加する。
// ただし won't が正解の問題 (2-14-1 の8問) で適用すると
// 「want」と発話しても正解になってしまうため、
// 「正解に want を含み、won't / will not を含まない問題」に限定する。
const WONT_REGEX = /\bwon'?t\b/i;
const WONT_REPLACE_REGEX = /\bwon'?t\b/gi;

export const wantCorrectionApplies = (rawAnswers: string[]): boolean =>
  rawAnswers.some(a => /\bwant\b/i.test(a)) &&
  !rawAnswers.some(a => WONT_REGEX.test(a) || /\bwill not\b/i.test(a));

/** 補正対象の問題なら、won't→want に置換した聞き取り候補を元の候補に追加して返す */
export const expandWontToWant = (heardList: string[], rawAnswers: string[]): string[] => {
  if (!wantCorrectionApplies(rawAnswers)) return heardList;
  return heardList.flatMap(t =>
    WONT_REGEX.test(t) ? [t, t.replace(WONT_REPLACE_REGEX, 'want')] : [t]
  );
};

export const normalize = (s: string) => {
  let t = s.toLowerCase().replace(/[’‘]/g, "'");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t.replace(NORMALIZE_REGEX_1, '');
  for (const [re, rep] of CONTRACTIONS_NO_APOSTROPHE) t = t.replace(re, rep);
  return t.replace(NORMALIZE_REGEX_2, ' ').trim();
};

/**
 * 1語だけの正解(例: 主語を答える問題の 'I' 'You')向けの判定 (No149)。
 * 音声認識は単語ひとつだけの発話を文として返すことがあるため、
 * 認識テキストのトークン列に正解語が含まれていれば正解とみなす。
 */
export const containsAsToken = (heardNormalized: string, answerNormalized: string): boolean => {
  if (!answerNormalized || answerNormalized.includes(' ')) return false;
  return heardNormalized.split(' ').includes(answerNormalized);
};

export function lev(a: string, b: string, maxDistance?: number): number {
  const m = a.length, n = b.length;

  if (maxDistance !== undefined && Math.abs(m - n) > maxDistance) {
    return maxDistance + 1;
  }

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    let minInRow = Infinity;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      minInRow = Math.min(minInRow, dp[i][j]);
    }
    if (maxDistance !== undefined && minInRow > maxDistance) {
      return maxDistance + 1;
    }
  }
  return dp[m][n];
}

export const simLevenshtein = (a: string, b: string): number => {
  if (!a.length && !b.length) return 1;
  const d = lev(a, b);
  return 1 - d / Math.max(a.length, b.length);
};

export const jaccard = (a: string, b: string): number => {
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  A.forEach(w => { if (B.has(w)) inter++; });
  const uni = A.size + B.size - inter;
  return inter / uni;
};
