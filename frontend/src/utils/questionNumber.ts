import type { Q } from '../types/game';

type QuestionLike = Pick<Q, 'is_demo'>;

/**
 * 問題番号の表示ヘルパー (要望No.166)。
 *
 * 仕様: 1パート=8問(デモ1+本問7)。スコア・結果画面は「デモ除く」で数える
 * (Data Specs E32)ため、ゲーム中の番号表示もデモを除いた本問1〜7で数え、
 * 結果画面の「n / 7」と一致させる。デモ問題は番号ではなく「デモ」と表示する。
 */
export function realQuestionNumber(questions: QuestionLike[], idx: number): number {
  return questions.slice(0, idx + 1).filter(q => !q.is_demo).length;
}

/** 左バッジの表示: デモ→「デモ」、本問→1〜7 */
export function questionBadgeLabel(questions: QuestionLike[], idx: number): string {
  const q = questions[idx];
  if (!q) return '';
  return q.is_demo ? 'デモ' : String(realQuestionNumber(questions, idx));
}

/** 開始バナーの表示: デモ→「start a demo !」、本問→「Question N !」 */
export function questionBannerText(questions: QuestionLike[], idx: number): string {
  const q = questions[idx];
  if (!q) return '';
  return q.is_demo ? 'start a demo !' : `Question ${realQuestionNumber(questions, idx)} !`;
}
