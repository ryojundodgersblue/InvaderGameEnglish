// 仕様(Function Specs D17): 停止時に「蓄積した認識候補」で判定する。
// maxAlternatives=3 の全候補を取りこぼさないこと (要望No.176/180/185)
import { describe, it, expect } from 'vitest';
import { extractTranscripts } from '../recognition';
import type { SpeechRecognitionEvent } from '../../types/speechRecognition';

function makeEvent(resultIndex: number, results: string[][]): SpeechRecognitionEvent {
  const list = results.map(alts => {
    const r = alts.map(t => ({ transcript: t, confidence: 0.9 }));
    return Object.assign(r, { isFinal: true });
  });
  return { resultIndex, results: list } as unknown as SpeechRecognitionEvent;
}

describe('extractTranscripts: 認識候補の全件取り出し', () => {
  it('第1候補だけでなく第2・第3候補も返す', () => {
    const e = makeEvent(0, [['he is', 'he was', 'she is']]);
    expect(extractTranscripts(e)).toEqual(['he is', 'he was', 'she is']);
  });

  it('resultIndex より前の確定済み結果は再処理しない', () => {
    const e = makeEvent(1, [['old'], ['new one', 'new two']]);
    expect(extractTranscripts(e)).toEqual(['new one', 'new two']);
  });

  it('空・空白のみの候補は捨てる', () => {
    const e = makeEvent(0, [['  ', 'apple', '']]);
    expect(extractTranscripts(e)).toEqual(['apple']);
  });

  it('複数resultをまたいで蓄積する', () => {
    const e = makeEvent(0, [['a'], ['b', 'c']]);
    expect(extractTranscripts(e)).toEqual(['a', 'b', 'c']);
  });
});
