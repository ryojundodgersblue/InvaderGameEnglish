import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

/**
 * 画面クラッシュ時のフォールバック。
 * 白画面の代わりにエラーコード(SYS-UI)付きの回復画面を表示する。
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[SYS-UI] 画面描画エラー:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#0f172a', color: '#fff', padding: 24, textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>画面の表示中にエラーが発生しました</h1>
        <div style={{ color: '#94a3b8', fontSize: 14 }}>
          エラーコード: SYS-UI<br />
          お手数ですが、このコードと一緒に状況をお知らせください。
        </div>
        <div style={{ color: '#64748b', fontSize: 12, maxWidth: 480, wordBreak: 'break-word' }}>
          {this.state.message}
        </div>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            padding: '12px 32px', fontSize: 16, borderRadius: 8, border: 'none',
            background: '#3b82f6', color: '#fff', cursor: 'pointer',
          }}
        >
          最初の画面に戻る
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
