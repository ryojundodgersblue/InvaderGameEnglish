// 仕様(Function List I11 改訂): 効果音は個別音量 — 銃声(attack)0.1 / miss 0.2 (要望No.167)。
// 追加: 停止経路から効果音を止められること(「やめる」後に鳴り続けない)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type MockAudio = {
  src: string;
  volume: number;
  paused: boolean;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (ev: string, fn: () => void) => void;
  removeEventListener: (ev: string, fn: () => void) => void;
  _emit: (ev: string) => void;
};

const created: MockAudio[] = [];

function installAudioMock() {
  created.length = 0;
  class AudioMock {
    src: string;
    volume = 1;
    paused = false;
    private listeners = new Map<string, Set<() => void>>();
    constructor(src?: string) {
      this.src = src ?? '';
      created.push(this as unknown as MockAudio);
    }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener(ev: string, fn: () => void) {
      if (!this.listeners.has(ev)) this.listeners.set(ev, new Set());
      this.listeners.get(ev)!.add(fn);
    }
    removeEventListener(ev: string, fn: () => void) {
      this.listeners.get(ev)?.delete(fn);
    }
    _emit(ev: string) {
      [...(this.listeners.get(ev) ?? [])].forEach(fn => fn());
    }
  }
  vi.stubGlobal('Audio', AudioMock);
}

beforeEach(() => {
  vi.resetModules();
  installAudioMock();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('効果音の個別音量 (No.167)', () => {
  it('attack.mp3 は音量0.1で再生される(銃声を軽く)', async () => {
    const { playSound } = await import('../sound');
    playSound('attack.mp3');
    expect(created).toHaveLength(1);
    expect(created[0].volume).toBeCloseTo(0.1);
  });

  it('miss.mp3 は従来どおり0.2(据え置き=聞こえにくい環境への配慮)', async () => {
    const { playSound } = await import('../sound');
    playSound('miss.mp3');
    expect(created[0].volume).toBeCloseTo(0.2);
  });

  it('playSoundAwait も同じ音量マップを使う', async () => {
    const { playSoundAwait } = await import('../sound');
    const p = playSoundAwait('attack.mp3');
    expect(created[0].volume).toBeCloseTo(0.1);
    created[0]._emit('ended');
    await p;
  });
});

describe('効果音の停止 (やめる・遷移時に鳴り続けない)', () => {
  it('stopAllSounds で再生中の効果音が止まる', async () => {
    const { playSound, stopAllSounds } = await import('../sound');
    playSound('attack.mp3');
    playSound('miss.mp3');
    stopAllSounds();
    expect(created.every(a => a.paused)).toBe(true);
  });

  it('playSoundAwait は ended で解決する(既存仕様)', async () => {
    const { playSoundAwait } = await import('../sound');
    const resolved = vi.fn();
    const p = playSoundAwait('attack.mp3').then(resolved);
    expect(resolved).not.toHaveBeenCalled();
    created[0]._emit('ended');
    await p;
    expect(resolved).toHaveBeenCalled();
  });
});
