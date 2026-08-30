import { SOUND_EFFECT_VOLUME, SOUND_VOLUMES, SOUND_AWAIT_MAX_MS } from '../constants/game';

// 再生中の効果音(「やめる」や画面遷移で止められるように参照を保持する)
const activeSounds = new Set<HTMLAudioElement>();

function volumeFor(filename: string): number {
  // 要望No.167: 銃声(attack.mp3)は0.1に軽減。それ以外は従来の0.2
  return SOUND_VOLUMES[filename] ?? SOUND_EFFECT_VOLUME;
}

function track(audio: HTMLAudioElement): void {
  activeSounds.add(audio);
  const untrack = () => activeSounds.delete(audio);
  audio.addEventListener('ended', untrack);
  audio.addEventListener('error', untrack);
}

export function playSound(filename: string): void {
  const audio = new Audio(`/${filename}`);
  audio.volume = volumeFor(filename);
  track(audio);
  audio.play().catch(() => { activeSounds.delete(audio); /* ignore autoplay restriction */ });
}

export function playSoundAwait(filename: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`/${filename}`);
    audio.volume = volumeFor(filename);
    track(audio);

    let settled = false;
    const onEnd = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onEnd);
      activeSounds.delete(audio);
      resolve();
    };

    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onEnd);
    // endedが届かない環境(デバイス切替等)でも進行を止めない保険
    setTimeout(onEnd, SOUND_AWAIT_MAX_MS);

    audio.play().catch(() => {
      onEnd();
    });
  });
}

/** 再生中の効果音をすべて止める(「やめる」・画面遷移用) */
export function stopAllSounds(): void {
  for (const audio of activeSounds) {
    try { audio.pause(); } catch { /* noop */ }
  }
  activeSounds.clear();
}
