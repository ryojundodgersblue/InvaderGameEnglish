export const CORRECT_TO_CLEAR = 5;
export const MAX_QUESTIONS = 8;
export const TIME_LIMIT = 30; // 制限時間（秒）
export const FUZZY_MATCH_THRESHOLD = 0.62;

export const DLY = {
  betweenSpeaks: 1200,
  afterThirdSpeakBeforeDemoAns: 2000,
  afterThirdSpeakBeforeListen: 800,
  beam: 800,
  explosion: 1000,
  afterReveal: 1500,
  afterTimeoutBeforeReveal: 500,
  beforeNextQuestion: 300,
  intermission: 2500,
  bannerDisplay: 2000,
  wrongAnswerDelay: 600,
  answerPreDelay: 1000,
  startDelay: 100,
};

export const SOUND_EFFECT_VOLUME = 0.2;
export const TTS_VOLUME = 1.0;
export const TTS_PLAYBACK_TIMEOUT = 15000;
export const TTS_FETCH_TIMEOUT_MS = 10000;   // TTS合成APIのタイムアウト
export const TTS_PRIME_TIMEOUT_MS = 1500;    // 再生前の読み込み待ち上限（頭切れ対策）
export const SPEECH_CACHE_MAX = 50;          // セッション内TTS音声キャッシュの上限件数

// フリーズ検知: この時間アクティビティが無ければ回復ダイアログを表示
// (No134/No137: スキップ表示まで30秒〜1分かかる報告を受け30秒→20秒に短縮)
export const FREEZE_TIMEOUT_MS = 20000;
export const FREEZE_CHECK_INTERVAL_MS = 5000;

// ログイン中、この時間を超えたら「サーバー起動中」の案内を表示
export const LOGIN_SLOW_HINT_MS = 5000;

// APIの無応答タイムアウト (要望No.179ほか: 最終問題での完全ハング対策)
// ログインAPIのみ、Renderのコールドスタート(最大1分)を吸収するため長めにする
export const API_TIMEOUT_MS = 15_000;
export const LOGIN_API_TIMEOUT_MS = 60_000;
// 画面の初期データ取得(GET)はコールドスタート直撃があり得るため、ログインと同じ60秒まで待つ
// (15秒はゲーム内の書き込みAPI(score/advance)のハング対策用)
export const COLD_START_API_TIMEOUT_MS = 60_000;

// 効果音の個別音量 (要望No.167: 銃声だけ軽くする。missは聞こえにくい環境に配慮し据え置き)
export const SOUND_VOLUMES: Record<string, number> = {
  'attack.mp3': 0.1,
};

// playSoundAwaitの解決待ち上限(音声デバイス異常でendedが来ない場合の保険。attack.mp3実長は約2.6秒)
export const SOUND_AWAIT_MAX_MS = 4000;
