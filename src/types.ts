export type GameMode = 'MENU' | 'SOLO' | 'MULTIPLAYER' | 'HISTORY' | 'ONLINE_LOBBY' | 'ONLINE_GAME';

export interface GameResult {
  id: string;
  date: string;
  mode: 'SOLO' | 'MULTIPLAYER';
  winner?: 'P1' | 'P2' | 'AI'; // AI not really implemented yet but good to have
  scoreP1: number;
  scoreP2?: number;
  durationSeconds: number;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  rotateCW: boolean;
  rotateCCW: boolean;
}
