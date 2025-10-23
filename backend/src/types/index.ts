// backend/src/types/index.ts

/**
 * ユーザー型定義
 */
export interface User {
  id: number;
  userId: string;
  password: string;
  nickname: string;
  realName: string;
  currentGrade: number;
  currentPart: number;
  currentSubpart: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * パート型定義
 */
export interface Part {
  partId: string;
  gradeId: number;
  partNo: number;
  subpartNo: number;
  requirement: string;
}

/**
 * 問題型定義
 */
export interface Question {
  questionId: string;
  partId: string;
  displayOrder: number;
  isDemo: boolean;
  questionText: string;
  imageUrl: string;
  answers: string[];
}

/**
 * 回答パターン型定義
 */
export interface AnswerPattern {
  id: number;
  questionId: string;
  expectedText: string;
}

/**
 * スコア型定義
 */
export interface Score {
  scoreId: number;
  userId: string;
  partId: string;
  scores: number;
  clear: boolean;
  playDate: string;
}

/**
 * ランキングアイテム型定義
 */
export interface RankingItem {
  userId: string;
  name: string;
}

/**
 * ランキングデータ型定義
 */
export interface RankingData {
  month: string;
  items: {
    challenge: RankingItem[];
    accuracy: RankingItem[];
  };
}

/**
 * APIレスポンス型定義（成功）
 */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
  [key: string]: unknown;
}

/**
 * APIレスポンス型定義（エラー）
 */
export interface ApiErrorResponse {
  ok: false;
  message: string;
  errors?: string[];
}

/**
 * APIレスポンス型定義（ユニオン型）
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * JWTペイロード型定義
 */
export interface JWTPayload {
  userId: string;
  name: string;
  current_grade: number;
  current_part: number;
  current_subpart: number;
  iat?: number;
  exp?: number;
}

/**
 * ログインリクエスト型定義
 */
export interface LoginRequest {
  userId: string;
  password: string;
}

/**
 * ログインレスポンス型定義
 */
export interface LoginResponse {
  ok: boolean;
  user?: {
    userId: string;
    name: string;
    current_grade: number;
    current_part: number;
    current_subpart: number;
  };
  message?: string;
}

/**
 * スコア送信リクエスト型定義
 */
export interface ScoreRequest {
  userId: string;
  partId: string;
  scores: number;
  clear: boolean;
}

/**
 * 進捗更新リクエスト型定義
 */
export interface AdvanceRequest {
  userId: string;
  current: {
    grade: string;
    part: string;
    subpart: string;
  };
  partId: string;
  clear: boolean;
}

/**
 * TTS合成リクエスト型定義
 */
export interface TTSRequest {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

/**
 * TTSレスポンス型定義
 */
export interface TTSResponse {
  audioContent: string | Buffer;
  contentType: string;
  cached?: boolean;
}

/**
 * キャッシュエントリ型定義
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * 検証スキーマ型定義
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

/**
 * エラーレスポンス型定義（詳細）
 */
export interface DetailedErrorResponse extends ApiErrorResponse {
  error?: string;
  stack?: string;
  statusCode?: number;
}
