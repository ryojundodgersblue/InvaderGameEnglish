const NORMALIZE_REGEX_1 = /[^a-z0-9\s]/g;
const NORMALIZE_REGEX_2 = /\s+/g;

export const normalize = (s: string) =>
  s.toLowerCase().replace(NORMALIZE_REGEX_1, '').replace(NORMALIZE_REGEX_2, ' ').trim();

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
