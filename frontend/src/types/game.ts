export type Q = {
  question_id: string;
  part_id: string;
  display_order: number;
  is_demo: boolean;
  question_text: string;
  image_url: string;
  answers: string[];
};

export type PartInfo = { part_id: string; requirement: string };

export type EnemyVariant = 'normal' | 'ko' | 'attack';

export type IntermissionSnapshot = {
  text: string;
  answer: string;
  enemy: EnemyVariant;
};

export type GamePhase =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'beam'
  | 'explosion'
  | 'reveal'
  | 'timeout'
  | 'wrong'
  | 'intermission'
  | 'finished';

export type GameState = {
  phase: GamePhase;
  enemyVariant: EnemyVariant;
  hasRecognition: boolean;
  intermissionSnap: IntermissionSnapshot | null;
};

export type GameAction =
  | { type: 'START_SPEAKING' }
  | { type: 'START_LISTENING' }
  | { type: 'RECOGNITION_DETECTED' }
  | { type: 'START_BEAM' }
  | { type: 'START_EXPLOSION' }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'TIMEOUT' }
  | { type: 'WRONG_ANSWER' }
  | { type: 'START_INTERMISSION'; snapshot: IntermissionSnapshot }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'FINISH_GAME' };
