# データ再構築レポート

- 実行日: 2026-07-02
- 入力: `English Speaking Drill仕様書.xlsx` の question シート(最終ソース)
- 出力: `backend/data/*.json`, `outputs/DB_2026-07-02.xlsx`

## 件数サマリ

- パート: 276 (学年別: {1: 105, 2: 100, 3: 71})
- 問題: 2208
- 解答パターン: 2211
- ユーザー: 6 / スコア履歴: 330 (前回exportから引き継ぎ)

## エラー (0件)

なし

## 解析時の補正・異常値 (1件)

- row1644: パート欠落 → 1 で開始 (学年3)

## 画像ファイル名の補正 (11件)

- 12326: '1_23_2_0.6png' → 1_23_2_06.png
- 12815: '1_28_1_05png' → 1_28_1_05.png
- 14121: '1 _41_2_01.png' → 1_41_2_01.png
- 30821: 'None' → 3_8_2_01.png
- 30822: 'None' → 3_8_2_02.png
- 30823: 'None' → 3_8_2_03.png
- 30824: 'None' → 3_8_2_04.png
- 30825: 'None' → 3_8_2_05.png
- 30826: 'None' → 3_8_2_06.png
- 30827: 'None' → 3_8_2_07.png
- 30828: 'None' → 3_8_2_08.png

## 命名規則から補完した画像 (3-8-2 / 要望No144) (8件)

- 30821: 3_8_2_01.png
- 30822: 3_8_2_02.png
- 30823: 3_8_2_03.png
- 30824: 3_8_2_04.png
- 30825: 3_8_2_05.png
- 30826: 3_8_2_06.png
- 30827: 3_8_2_07.png
- 30828: 3_8_2_08.png

## 音声認識対策の追加別解 (要望No149) (3件)

- 10111: 'I' に別解 'eye' を追加
- 10116: 'I' に別解 'eye' を追加
- 10118: 'I' に別解 'eye' を追加

## デモ〇列と構造ルールの不一致(参考・構造ルールを採用) (1件)

- 11621: シートのデモ〇=なし / 構造ルール(1問目)=デモ

## 旧データセット(featureブランチ 2026-06-11版)との突合

questionシートを正とし、差分は「Mukaさんの6/11以降の編集」または
「旧版のみの修正(要Muka確認)」に分類する。

- 旧のみに存在するパート: [3313, 3314] ← **要Muka確認**
- 新のみに存在するパート: []
- 旧のみに存在する問題: 16件 [33131, 33132, 33133, 33134, 33135, 33136, 33137, 33138, 33141, 33142, 33143, 33144, 33145, 33146, 33147, 33148]
- 新のみに存在する問題: 0件 []
- 問題文が異なる: 244件
    - 10517: 'Your brother' → 'It'
    - 10518: 'My mother and I' → 'Your brother'
    - 10915: 'Tom and I' → 'Tom'
    - 10916: 'My parrot' → 'My friend Ted'
    - 10928: 'My dog' → 'The boy'
    - 11216: 'My dog' → 'He'
    - 11312: 'John is a teacher.' → 'Jone is a teacher.'
    - 11518: 'What is this?' → 'What do you have?'
    - 12411: 'Do you like soccer' → 'You like soccer.'
    - 12412: 'Do you speak English?' → 'They speak English.'
    - 12413: 'Do you play the piano?' → 'We play the piano.'
    - 12414: 'Do you read books?' → 'They read books.'
    - 12415: 'Do you have a brother?' → 'We have a brother.'
    - 12416: 'Do you study English?' → 'You study English.'
    - 12417: 'Do you cook?' → 'We swim in the river.'
    - 12418: 'Do you walk to school?' → 'You walk to school.'
    - 12423: 'We play the piano.' → 'They read books.'
    - 12424: 'They read books.' → 'You play soccer.'
    - 12511: 'Does she like cats?' → 'She likes cats.'
    - 12512: 'Does my sister read books?' → 'My sister reads books.'
    - 12513: 'Do you play tennis?' → 'He plays the guitar.'
    - 12514: 'Does he play the guitar?' → 'Mary speaks Japanese.'
    - 12515: 'Does your cat eat fish?' → 'He studies math.'
    - 12516: 'Does Mary speak Japanese?' → 'She has a bag.'
    - 12517: 'Do you have a dog?' → 'My friend likes dogs.'
    - 12518: 'Does this bus go to the station?' → 'She reads a newspaper.'
    - 12523: 'You play tennis.' → 'He plays the guitar.'
    - 12524: 'He plays the guitar.' → 'Mary speaks Japanese.'
    - 12525: 'Your cat eats fish.' → 'He studies math.'
    - 12526: 'Mary speaks Japanese.' → 'She has a bag.'
    - 12527: 'You have a dog.' → 'My friends like dogs.'
    - 12528: 'This bus goes to the station.' → 'She reads a newspaper.'
    - 12812: 'Can they buy apples?' → 'Can she say hello?'
    - 12817: 'Can he ride a bike?' → 'Can he believe his friend?'
    - 12913: 'Use this pen' → 'Help you'
    - 12915: 'Sit here' → 'Write your name'
    - 13212: 'Do you like sports?' → 'Do you like subjects?'
    - 13223: 'Do you have books?' → 'Do you have fruits?'
    - 13337: 'My hero is Taro.' → 'My favorite actor is Johnny Depp.'
    - 13338: 'My favorite character is Pikachu.' → 'My favorite singers are BTS.'
    - 13418: 'Is she good today?' → 'Are they good today?'
    - 13621: "What's the plural of bus?" → "What's the plural of class?"
    - 13622: "What's the plural of dish?" → "What's the plural of country?"
    - 13715: 'Do you draw cats?' → 'Do you draw pictures?'
    - 13918: 'You are noisy.' → 'You are late.'
    - 14017: 'Mary' → 'it'
    - 14214: 'What is Bob doing now?' → 'What are you doing now?'
    - 14217: 'What is your father doing?' → 'What is your mother doing now?'
    - 14317: 'He opens the door.' → 'She says hello.'
    - 14421: 'Who is looking for the pen?' → "Who's looking for the pen?"
    - …ほか194件
- 解答が異なる: 266件
    - 10421: 'This table is strong.' → 'It is strong.'
    - 10422: 'This chair is strong.' → 'It is strong.'
    - 10423: 'That table is strong.' → 'It is strong.'
    - 10424: 'My cat is strong.' → 'It is strong.'
    - 10425: 'My cats are strong.' → 'They are strong.'
    - 10426: 'Your cats are strong.' → 'They are strong.'
    - 10427: 'My mother is strong.' → 'She is strong.'
    - 10428: 'My father is strong.' → 'He is strong.'
    - 10517: 'Your brother is in the kitchen.' → 'It is in the kitchen.'
    - 10518: 'My mother and I are in the kitchen.' → 'He is in the kitchen.'
    - 10915: 'We speak English.' → 'He speaks English.'
    - 10916: 'It speaks English.' → 'He speaks English.'
    - 10922: 'She plays tennis.' → 'She plays tennis'
    - 10923: 'We play tennis.' → 'We play tennis'
    - 10924: 'He plays tennis.' → 'He plays tennis'
    - 10925: 'They play tennis.' → 'They play tennis'
    - 10926: 'She plays tennis.' → 'She plays tennis'
    - 10927: 'He plays tennis.' → 'He plays tennis'
    - 10928: 'It plays tennis.' → 'He plays tennis'
    - 11128: 'They eat breakfast.' → 'They clean the room.'
    - 11216: 'It plays soccer in the park.' → 'He plays soccer in the park.'
    - 11518: 'This is a big dog.' → 'I have a big dog.'
    - 11812: 'It is not your bike.' → 'This is not your bike.'
    - 12411: "No, I don't." → 'Do you like soccer?'
    - 12412: "No, I don't." → 'Do they speak English?'
    - 12413: 'Yes, I do.' → 'Do we play the piano?'
    - 12414: "No, I don't." → 'Do they read books?'
    - 12415: 'Yes, I do.' → 'Do we have a brother?'
    - 12416: 'Yes, I do.' → 'Do you study English?'
    - 12417: "No, I don't." → 'Do we swim in the river?'
    - 12418: "No, I don't." → 'Do you walk to school?'
    - 12421: 'Do you like soccer?' → "You don't like soccer."
    - 12422: 'Do they speak English?' → "They don't speak English."
    - 12423: 'Do we play the piano?' → "They don't read books."
    - 12424: 'Do they read books?' → "You don't play soccer."
    - 12425: 'Do we have a brother?' → "We don't have a brother."
    - 12426: 'Do you study English?' → "You don't study English."
    - 12427: 'Do we swim in the river?' → "We don't swim in the river."
    - 12428: 'Do you walk to school?' → "You don't walk to school."
    - 12511: 'Yes, she does.' → 'Does she like cats?'
    - 12512: "No, she doesn't." → 'Does your sister read books?'
    - 12513: 'Yes, I do.' → 'Does he play the guitar?'
    - 12514: 'Yes, he does.' → 'Does she speak Japanese?'
    - 12515: 'Yes, it does.' → 'Does he study math?'
    - 12516: "No, she doesn't." → 'Does she have a bag?'
    - 12517: "No, I don't." → 'Does your friend like dogs?'
    - 12518: "No, it doesn't." → 'Does she read a newspaper?'
    - 12521: 'Does she like cats?' → "She doesn't like cats."
    - 12522: 'Does my sister read books?' → "She doesn't read books."
    - 12523: 'Do you play tennis?' → "He doesn't play the guitar."
    - …ほか216件
- 画像URLが異なる: 0件
- 回答条件が異なるパート: [1021, 1041, 1042, 1051, 1062, 1081, 1082, 1092, 1111, 1121, 1122, 1141, 1142, 1151, 1161, 1212, 1222, 1241, 1242, 1251, 1252, 1271, 1281, 1282, 1372, 1392, 1411, 1412, 1421, 1422, 1441, 1471, 1472, 1481, 1482, 1491, 1492, 1493, 1494, 1501, 1502, 2012, 2021, 2161, 2171, 2172, 2332, 3132, 3141, 3142, 3151, 3152, 3161, 3162, 3171, 3172, 3181, 3182, 3191, 3201, 3202, 3211, 3212, 3221, 3222, 3231, 3241, 3251, 3252, 3262, 3271, 3302, 3311, 3312]

