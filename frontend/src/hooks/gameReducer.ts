import type { GameState, GameAction } from '../types/game';

export const initialGameState: GameState = {
  phase: 'idle',
  enemyVariant: 'normal',
  hasRecognition: false,
  intermissionSnap: null,
};

export function gameStateReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_SPEAKING':
      return { ...state, phase: 'speaking', enemyVariant: 'normal' };

    case 'START_LISTENING':
      return { ...state, phase: 'listening' };

    case 'RECOGNITION_DETECTED':
      return { ...state, hasRecognition: true };

    case 'START_BEAM':
      return { ...state, phase: 'beam', enemyVariant: 'ko' };

    case 'START_EXPLOSION':
      return { ...state, phase: 'explosion' };

    case 'REVEAL_ANSWER':
      return { ...state, phase: 'reveal' };

    case 'TIMEOUT':
      return { ...state, phase: 'timeout', enemyVariant: 'attack' };

    case 'WRONG_ANSWER':
      return { ...state, phase: 'wrong', enemyVariant: 'attack' };

    case 'START_INTERMISSION':
      return {
        ...state,
        phase: 'intermission',
        intermissionSnap: action.snapshot,
      };

    case 'RESET_TO_IDLE':
      return {
        ...state,
        phase: 'idle',
        enemyVariant: 'normal',
        hasRecognition: false,
        intermissionSnap: null,
      };

    case 'FINISH_GAME':
      return { ...state, phase: 'finished' };

    default:
      return state;
  }
}
