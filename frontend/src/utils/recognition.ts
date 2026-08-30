import type { SpeechRecognitionEvent } from '../types/speechRecognition';

/**
 * 音声認識イベントから発話候補をすべて取り出す (要望No.176/180/185)。
 *
 * 仕様(Function Specs D17)は「停止時に蓄積した認識候補で判定」。
 * maxAlternatives=3 を設定しているため、第1候補だけでなく
 * 第2・第3候補にも正解が含まれることがある(特に1語解答や語尾子音)。
 * ここで全候補を返し、判定側の蓄積リストに載せる。
 * 判定閾値(0.62)は変更しない — 候補の取りこぼしをなくすだけ。
 */
export function extractTranscripts(e: SpeechRecognitionEvent): string[] {
  const out: string[] = [];
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const result = e.results[i];
    for (let j = 0; j < result.length; j++) {
      const text = result[j]?.transcript?.trim();
      if (text) out.push(text);
    }
  }
  return out;
}
