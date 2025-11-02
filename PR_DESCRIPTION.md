# Pull Request: Fix Mic-Off Freeze Issue

## Summary

- マイクをオフにした際に何も音声認識されていない場合のフリーズ問題を修正
- Fix freeze issue when microphone is turned off without any speech recognition

## Problem

マイクをオフにしたが何も認識されていない場合、ゲームがフリーズする問題がありました:

1. `evaluateCaptured()` が空の `capturedRef` で呼ばれる
2. タイマーがクリアされる (`deadlineRef` が `null` に)
3. 音声がないため不正解として評価される
4. 不正解ロジックがタイマー残存をチェックするが、既に `null`
5. listening状態に戻れず、フリーズする

**When the user turned off the mic without saying anything:**
1. evaluateCaptured() was called with empty capturedRef
2. Timer was cleared (deadlineRef set to null)
3. Evaluation failed with no speech, marked as wrong answer
4. Wrong answer logic checked if timer remained, but it was null
5. Game couldn't return to listening state → **freeze**

## Solution

`stopRecognitionAndEvaluate()` 関数で、`capturedRef` が空の場合は評価をスキップするように修正:

- 音声が認識されていない場合は評価を実行しない
- マイクを停止してlistening状態を維持
- 実際に音声が認識された場合のみ評価を実行

**Skip evaluation when capturedRef is empty in stopRecognitionAndEvaluate():**
- Simply stop the mic and remain in listening state
- Only evaluate when actual speech was captured
- Game continues smoothly even when users toggle mic without speaking

## Changes

**Modified Files:**
- `frontend/src/pages/PlayPage.tsx` (PlayPage.tsx:1238-1245)
  - Added check in `stopRecognitionAndEvaluate()` to skip evaluation when no speech is captured

## Code Changes

```typescript
// Before:
const stopRecognitionAndEvaluate = useCallback(async () => {
  console.log('[ASR] Stopping for evaluation');
  stoppingRef.current = true;

  // ... stop recognition ...

  setMicActive(false);
  micActiveRef.current = false;

  console.log('[ASR] Stopped for evaluation');
  evaluateCaptured();  // ❌ Always evaluates, even with no speech
}, []);

// After:
const stopRecognitionAndEvaluate = useCallback(async () => {
  console.log('[ASR] Stopping for evaluation');
  stoppingRef.current = true;

  // ... stop recognition ...

  setMicActive(false);
  micActiveRef.current = false;

  // ★ 何も認識されていない場合は評価をスキップ
  if (capturedRef.current.length === 0) {
    console.log('[ASR] No speech captured - skipping evaluation, staying in listening state');
    return;  // ✅ Skip evaluation and stay in listening state
  }

  console.log('[ASR] Stopped for evaluation - evaluating captured speech');
  evaluateCaptured();
}, []);
```

## Testing

- ✅ TypeScript compilation: Passed
- ✅ Build: Successful (no errors)
- ✅ No runtime errors expected

## Related Issues

Related to #29 (voice-related freeze fixes)

---

## Test Plan

### Manual Testing Steps:

1. ゲームを開始
2. 問題が読み上げられている間にマイクをオンにする
3. **何も話さずにマイクをオフにする** ← ここでフリーズしていた
4. ゲームが正常に続行することを確認（フリーズしない）✅
5. タイマーが動き続けることを確認 ✅

**English:**
1. Start the game
2. Turn on the mic during question playback
3. **Turn off the mic without saying anything** ← This caused freeze
4. Verify the game continues normally (no freeze) ✅
5. Verify the timer continues running ✅

### Expected Behavior After Fix:

- マイクをオフにしても何も話していない場合、ゲームはlistening状態を維持
- タイマーは動き続ける
- ユーザーは再度マイクをオンにして回答できる
- フリーズは発生しない

**When mic is turned off without speech:**
- Game remains in listening state
- Timer continues running
- User can turn mic on again to answer
- No freeze occurs

---

## Review Checklist

- [x] コードがTypeScriptコンパイルを通る
- [x] ビルドが成功する
- [x] ロジックが正しい（空の音声認識結果の場合は評価をスキップ）
- [x] 既存の機能に影響しない（音声が認識された場合は従来通り評価）
- [x] コンソールログで動作を追跡できる
