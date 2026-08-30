// 仕様(UI Specs C7 改訂 / 要望No.162):
//  「次のステージが解放されました！」は実際に解放が起きたとき(advanced)だけ表示する。
//  過去ステージの再クリアでは出さない。最終ステージクリアは全クリア文言。
// 仕様(10回→3回 / 8-24反映): 未クリア解放時の回数はadvance応答のrequired値を表示。
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResultPage from '../ResultPage';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

type ResultState = {
  clear?: boolean;
  correct?: number;
  total?: number;
  advanced?: boolean;
  requiredAttempts?: number;
  finalStage?: boolean;
};

function renderResult(state: ResultState) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/result', state }]}>
      <ResultPage />
    </MemoryRouter>
  );
}

const UNLOCK = '次のステージが解放されました！';

describe('解放メッセージはadvancedに連動する (No.162)', () => {
  it('クリアして実際に解放されたときは解放メッセージを出す', () => {
    renderResult({ clear: true, correct: 6, total: 7, advanced: true });
    expect(screen.getByText(UNLOCK)).toBeInTheDocument();
  });

  it('過去ステージの再クリア(解放なし)では解放メッセージを出さない', () => {
    renderResult({ clear: true, correct: 6, total: 7, advanced: false });
    expect(screen.queryByText(UNLOCK)).not.toBeInTheDocument();
    expect(screen.queryByText(/解放/)).not.toBeInTheDocument();
  });

  it('最終ステージクリアは全ステージクリアの文言', () => {
    renderResult({ clear: true, correct: 7, total: 7, advanced: false, finalStage: true });
    expect(screen.getByText(/全ステージクリア/)).toBeInTheDocument();
    expect(screen.queryByText(UNLOCK)).not.toBeInTheDocument();
  });
});

describe('規定回数解放の文言 (10回→3回 / 8-24反映の回帰)', () => {
  it('未クリアでも規定回数で解放されたら「3回挑戦したため…」', () => {
    renderResult({ clear: false, correct: 2, total: 7, advanced: true, requiredAttempts: 3 });
    expect(screen.getByText(`3回挑戦したため、${UNLOCK}`)).toBeInTheDocument();
  });
});

describe('スコア表示の既存仕様 (デグレ検知)', () => {
  it('正解数/問題数(デモ除く7)と%を表示する', () => {
    renderResult({ clear: false, correct: 3, total: 7 });
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
    expect(screen.getByText('43%')).toBeInTheDocument(); // round(3/7*100)
  });

  it('未クリア時は「あと N 問正解でクリア！」(CORRECT_TO_CLEAR=5基準)', () => {
    renderResult({ clear: false, correct: 3, total: 7 });
    expect(screen.getByText(/あと\s*2\s*問正解でクリア！/)).toBeInTheDocument();
  });

  it('クリア判定バッジ', () => {
    renderResult({ clear: true, correct: 5, total: 7, advanced: true });
    expect(screen.getByText('✅ CLEAR')).toBeInTheDocument();
  });
});
