import { SOUND_EFFECT_VOLUME } from '../constants/game';

export function playSound(filename: string): void {
  const audio = new Audio(`/${filename}`);
  audio.volume = SOUND_EFFECT_VOLUME;
  audio.play().catch(() => { /* ignore autoplay restriction */ });
}

export function playSoundAwait(filename: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`/${filename}`);
    audio.volume = SOUND_EFFECT_VOLUME;

    const onEnd = () => {
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onEnd);
      resolve();
    };

    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onEnd);

    audio.play().catch(() => {
      onEnd();
    });
  });
}
