// PlayPageの進行フローを仕様どおりに通す統合テスト。
// 対象仕様:
//  - デモ問題は自動進行(Function Specs D12)・番号はデモ除外で1〜7 (No.166)
//  - タイマーは回答受付中のみ表示され30秒から開始 (D22 / No.159/175)
//  - マイクOFFのままなら導線ヒントを出す (No.161)
//  - 時間切れ→正解提示 (H22)。不正解処理中に来た時間切れも失われない (No.173/178/179)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SpeechRecognitionEvent } from '../../types/speechRecognition';

// ---- モジュールモック ----
vi.mock('../../utils/ttsAudio', () => ({
  speakText: vi.fn(async () => 'played' as const),
  prefetchSpeech: vi.fn(),
  unlockAudio: vi.fn(),
}));
vi.mock('../../utils/sound', () => ({
  playSound: vi.fn(),
  playSoundAwait: vi.fn(async () => {}),
  stopAllSounds: vi.fn(),
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: {
      userId: '00042', userName: 'テスト', isAdmin: false,
      currentGrade: '1', currentPart: '1', currentSubpart: '1',
    },
    updateProgress: vi.fn(),
  }),
}));

const QUESTIONS = Array.from({ length: 8 }, (_, i) => ({
  question_id: `1011${i + 1}`,
  part_id: 'P1',
  display_order: i + 1,
  is_demo: i === 0,
  question_text: `Question text ${i + 1}.`,
  image_url: '',
  answers: [`Answer number ${i + 1}.`],
}));

vi.mock('../../utils/apiClient', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../utils/apiClient')>();
  return {
    ...orig,
    apiFetch: vi.fn(async (path: string) => {
      if (path.startsWith('/game/part')) return { ok: true, part: { part_id: 'P1', requirement: 'テスト要件' } };
      if (path.startsWith('/game/questions')) return { ok: true, questions: QUESTIONS };
      if (path === '/game/score') return { ok: true };
      if (path === '/game/advance') return { ok: true, advanced: false, required: 3, reason: 'not enough attempts' };
      return { ok: true };
    }),
  };
});

// ---- SpeechRecognition モック ----
type ResultHandler = ((e: SpeechRecognitionEvent) => void) | null;
class FakeSR {
  static instances: FakeSR[] = [];
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onresult: ResultHandler = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() { FakeSR.instances.push(this); }
  stop() { /* noop */ }
  emit(alternatives: string[]) {
    const result = Object.assign(
      alternatives.map(t => ({ transcript: t, confidence: 0.9 })),
      { isFinal: true }
    );
    this.onresult?.({ resultIndex: 0, results: [result] } as unknown as SpeechRecognitionEvent);
  }
}

import PlayPage from '../PlayPage';
import { speakText } from '../../utils/ttsAudio';

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

/** 条件を満たすまでフェイク時間を刻んで進める(状態駆動・タイミング予算に依存しない) */
async function advanceUntil(pred: () => boolean, step = 250, maxMs = 90_000) {
  let elapsed = 0;
  while (!pred()) {
    if (elapsed >= maxMs) throw new Error('advanceUntil: 条件に到達しないまま上限に達した');
    await advance(step);
    elapsed += step;
  }
}

const timerEl = () => document.querySelector('.timer-display');

async function renderAndStart() {
  render(<MemoryRouter initialEntries={['/play']}><PlayPage /></MemoryRouter>);
  await act(async () => {}); // 初期ロード(part/questions)を消化
  expect(screen.getByText('テスト要件')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Start'));
  await advance(150); // startDelay(100ms)
}

/** デモを自動進行で消化し、本問1の回答受付(タイマー表示)まで進める */
async function goToFirstQuestionListening(step = 250) {
  await advanceUntil(() => timerEl() !== null, step);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
  FakeSR.instances = [];
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeSR;
});
let hiddenFlag = false;
function setDocumentHidden(hidden: boolean) {
  hiddenFlag = hidden;
  document.dispatchEvent(new Event('visibilitychange'));
}
Object.defineProperty(document, 'hidden', { configurable: true, get: () => hiddenFlag });

afterEach(() => {
  vi.useRealTimers();
  hiddenFlag = false;
  vi.mocked(speakText).mockReset();
  vi.mocked(speakText).mockResolvedValue('played');
});

describe('PlayPage: デモと問題番号 (No.166)', () => {
  it('デモはバッジ「デモ」・バナー「start a demo !」、本問1は「1」「Question 1 !」', async () => {
    await renderAndStart();

    // デモ問題
    expect(screen.getByText('start a demo !')).toBeInTheDocument();
    expect(screen.getByText('デモ')).toBeInTheDocument();

    // デモ自動進行 → 本問1のバナー(2秒間表示)をポーリングで捕捉
    await advanceUntil(() => screen.queryByText('Question 1 !') !== null);
    const badge = document.querySelector('.question-number-display');
    expect(badge?.textContent).toBe('1'); // 表示順2問目だが番号は1(結果画面のn/7と一致)
  });
});

describe('PlayPage: タイマー表示は回答受付中のみ (No.159/175)', () => {
  it('バナー・読み上げ中はタイマー非表示、回答受付開始で30sから表示される', async () => {
    await renderAndStart();

    // 本問1のバナー時点ではタイマーを出さない
    await advanceUntil(() => screen.queryByText('Question 1 !') !== null);
    expect(timerEl()).toBeNull();

    // 回答受付(listening)に入るとタイマーが30sから出る
    await goToFirstQuestionListening();
    expect(timerEl()?.textContent).toBe('30s');

    // 5秒経過で25s (壁時計ベース)
    await advance(5000);
    expect(timerEl()?.textContent).toBe('25s');
  });

  it('マイクOFFのままだと導線ヒントが表示される (No.161)', async () => {
    await renderAndStart();
    await goToFirstQuestionListening();

    expect(screen.getByText(/ガンボタンをおして/)).toBeInTheDocument();

    // マイクONにするとヒントは消える
    fireEvent.click(screen.getByTitle('Start Recording'));
    await act(async () => {});
    expect(FakeSR.instances.length).toBeGreaterThan(0);
    expect(screen.queryByText(/ガンボタンをおして/)).not.toBeInTheDocument();
  });
});

describe('PlayPage: 時間切れの仕様 (H22 / No.173/178/179)', () => {
  it('30秒経過で正解が提示される', async () => {
    await renderAndStart();
    await goToFirstQuestionListening();

    await advance(31_500); // 時間切れ + afterTimeoutBeforeReveal(500)

    expect(screen.getByText('CORRECT ANSWER')).toBeInTheDocument();
    expect(screen.getByText('Answer number 2.')).toBeInTheDocument();
  });

  it('不正解処理中に来た時間切れも失われず正解提示に到達する(ワンショットロスト対策)', async () => {
    await renderAndStart();
    await goToFirstQuestionListening(50); // 開始時刻の不確かさを50ms以下に抑える

    // 残り約100〜150msまで進める
    await advance(29_850);
    expect(timerEl()?.textContent).toBe('1s'); // まだ時間内

    // 駆け込みで誤答: マイクON→認識→OFF(評価)
    fireEvent.click(screen.getByTitle('Start Recording'));
    await act(async () => {});
    const sr = FakeSR.instances[FakeSR.instances.length - 1];
    expect(sr).toBeTruthy();
    act(() => { sr.emit(['banana banana']); });
    fireEvent.click(screen.getByTitle('Stop & Evaluate'));
    await act(async () => {});

    // 不正解処理(600ms)の最中に0秒到達 → 旧実装ではここで時間切れが恒久ロストし
    // 「0sのまま終わらない」状態になっていた
    await advance(200);   // 0秒到達(処理中→退避)
    await advance(500);   // 不正解処理が明けて退避分を再実行
    await advance(700);   // afterTimeoutBeforeReveal(500)+α

    // 時間切れとして正解が提示される
    expect(screen.getByText('CORRECT ANSWER')).toBeInTheDocument();
    expect(screen.getByText('Answer number 2.')).toBeInTheDocument();
  });
});

describe('PlayPage: 早押しでもタイマーが始まる (No.175)', () => {
  it('読み上げ中にガンボタンを押すと回答受付+30秒カウントダウンが開始される', async () => {
    await renderAndStart();

    // 本問1の読み上げ中(バナーが消えてタイマーはまだ無い状態)を捕捉
    await advanceUntil(() => screen.queryByText('Question 1 !') !== null);
    await advanceUntil(() =>
      screen.queryByText('Question 1 !') === null &&
      document.querySelector('.gun-button.enabled') !== null &&
      timerEl() === null,
    50);

    // 早押し: 読み上げ中にガンON
    fireEvent.click(screen.getByTitle('Start Recording'));
    await act(async () => {});

    // タイマーが起動している(旧実装では永久に始まらない経路)
    expect(timerEl()?.textContent).toBe('30s');
    await advance(2000);
    expect(timerEl()?.textContent).toBe('28s');
  });
});

describe('PlayPage: 音声取得・再生が長引いてもフリーズ誤検知しない (No.170)', () => {
  it('読み上げに25秒かかっても、進行イベントが流れていれば回復ダイアログは出ない', async () => {
    // デモ1回目の読み上げを25秒かかる実装に差し替え(4秒ごとに進行イベントを流す)
    vi.mocked(speakText).mockImplementationOnce((_text, opts) => new Promise(resolve => {
      const iv = setInterval(() => opts?.onProgress?.(), 4000);
      setTimeout(() => { clearInterval(iv); resolve('played'); }, 25_000);
    }));

    await renderAndStart();

    // 25秒の読み上げの間、5秒刻みで回復ダイアログが出ないことを確認
    for (let i = 0; i < 6; i++) {
      await advance(5000);
      expect(screen.queryByText('画面が停止しました')).not.toBeInTheDocument();
    }

    // その後は通常どおり本問1へ進める
    await advanceUntil(() => timerEl() !== null);
    expect(timerEl()?.textContent).toBe('30s');
  });
});

describe('PlayPage: タブ非表示中はタイマーが進まない (仕様9-1)', () => {
  it('非表示中に回答受付へ到達してもカウントダウンは開始されず、復帰後に30秒から進む', async () => {
    await renderAndStart();

    // デモ中にタブを非表示化(音声・演出はモックのため進行し続ける)
    setDocumentHidden(true);

    // 本問1の回答受付に到達(タイマー表示は出るが一時停止状態で開始される)
    await advanceUntil(() => timerEl() !== null);
    expect(timerEl()?.textContent).toBe('30s');

    // 非表示のまま40秒経過しても時間切れにならない(裏で問題が消費されない)
    await advance(40_000);
    expect(timerEl()?.textContent).toBe('30s');
    expect(screen.queryByText('CORRECT ANSWER')).not.toBeInTheDocument();
    expect(screen.queryByText('画面が停止しました')).not.toBeInTheDocument();

    // タブ復帰でカウントダウン再開
    setDocumentHidden(false);
    await act(async () => {});
    await advance(2000);
    expect(timerEl()?.textContent).toBe('28s');
  });
});
