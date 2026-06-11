# 修正依頼 適用レポート (2026-06-11)

## サマリ

- 修正依頼(未対応)件数: 673
- 適用ログ件数: 952
- applied: 853
- already_ok: 93
- superseded(別修正が優先): 4
- skipped(要確認): 2
- 新規サブパート作成: ['3-31-3 (part_id=3313)', '3-31-4 (part_id=3314)']
- 全体アポストロフィ正規化での追加修正フィールド数: 9
- 3-8-2 image_url設定: 8
- ベースデータ補正: ['1-16-2-1 (question_id=11621): is_demo false→true (全パート共通の1問目デモ構成に統一)']
- データ件数: {'users': 6, 'grades': 3, 'parts': 278, 'questions': 2224, 'answer_patterns': 2224, 'scores': 330}
- 種別内訳: {'Requirementの修正:applied': 73, 'Requirementの修正:skipped': 1, 'その他:already_ok': 1, 'その他:applied': 2, 'アポストロフィの統一:already_ok': 21, 'アポストロフィの統一:applied': 125, 'アポストロフィの統一:superseded': 4, 'イラスト差し替え:skipped': 1, '問題文の修正:already_ok': 70, '問題文の修正:applied': 555, '解答のみ修正:already_ok': 1, '解答のみ修正:applied': 98}

## クライアント(Mukaさん)要確認

| 項目 | 内容 |
|---|---|
| 2-35-1-2 イラスト差し替え | 「New Year's Day」の差し替えイラストがローカル未着。受領後に反映要 |
| Requirement修正の対象不明1件 | 「to不定詞を使って〜」の対象が3-3-1/3-3-2/3-3-3のいずれか特定不能(記入時にExcelが日付化け) |
| 1-24-2 のイラスト | 不具合報告No132で言及があるが、イラスト未提供のためデータ上image_urlなし(画像なしで動作はする) |
| 1-44-1 の問題文 | 問題文なし(イラストのみ)。要望No102で「問題文なしでも動く」と確認済みのため現状維持 |

## 新規サブパート作成(修正依頼の8問完全セットから)

- 3-31-3 (part_id=3313): Requirement+8問+解答を新設(イラストなし)
- 3-31-4 (part_id=3314): Requirement+8問+解答を新設(イラストなし)

## スキップ(要確認)一覧

| 行 | 対象 | 種別 | 理由 |
|---|---|---|---|
| 370 | 2000-03-03 00:00:00 | Requirementの修正 | 対象partを特定できない(要確認): '2000-03-03 00:00:00' |
| 315 | 2-35-1-2 | イラスト差し替え | 差し替えイラストがローカル未着(クライアント要確認) |

## superseded(より新しい内容修正が優先された行)

| 行 | 対象 | 種別 | 理由 |
|---|---|---|---|
| 708 | 1-31-1-1 | アポストロフィの統一 | 同一問題への内容修正(問題文の修正(row141), 問題文の修正(row141))が優先。アポストロフィは全体正規化で統一済み |
| 720 | 2-7-1-3 | アポストロフィの統一 | 同一問題への内容修正(解答のみ修正(row264))が優先。アポストロフィは全体正規化で統一済み |
| 723 | 2-7-1-6 | アポストロフィの統一 | 同一問題への内容修正(解答のみ修正(row265))が優先。アポストロフィは全体正規化で統一済み |
| 734 | 2-17-2-3 | アポストロフィの統一 | 同一問題への内容修正(解答のみ修正(row283), アポストロフィの統一(row733))が優先。アポストロフィは全体正規化で統一済み |

## 同一問題への複数修正(後勝ちで適用)

- question_id=10421: 問題文の修正(row5), 問題文の修正(row5)
- question_id=10422: 問題文の修正(row6), 問題文の修正(row6)
- question_id=10423: 問題文の修正(row7), 問題文の修正(row7)
- question_id=10424: 問題文の修正(row8), 問題文の修正(row8)
- question_id=10425: 問題文の修正(row9), 問題文の修正(row9)
- question_id=10426: 問題文の修正(row10), 問題文の修正(row10)
- question_id=10427: 問題文の修正(row11), 問題文の修正(row11)
- question_id=10428: 問題文の修正(row12), 問題文の修正(row12)
- question_id=10517: 問題文の修正(row13), 問題文の修正(row13)
- question_id=10518: 問題文の修正(row14), 問題文の修正(row14)
- question_id=10915: 問題文の修正(row22), 問題文の修正(row22)
- question_id=10916: 問題文の修正(row24), 問題文の修正(row24)
- question_id=10922: 問題文の修正(row26), 問題文の修正(row26)
- question_id=10923: 問題文の修正(row27), 問題文の修正(row27)
- question_id=10924: 問題文の修正(row28), 問題文の修正(row28)
- question_id=10925: 問題文の修正(row29), 問題文の修正(row29)
- question_id=10926: 問題文の修正(row30), 問題文の修正(row30)
- question_id=10927: 問題文の修正(row31), 問題文の修正(row31)
- question_id=10928: 問題文の修正(row32), 問題文の修正(row32)
- question_id=11128: 問題文の修正(row41), 問題文の修正(row41)
- question_id=11216: 問題文の修正(row44), 問題文の修正(row44)
- question_id=11312: 問題文の修正(row47), 問題文の修正(row47)
- question_id=11518: 問題文の修正(row56), 問題文の修正(row56)
- question_id=11812: 問題文の修正(row52), 問題文の修正(row52)
- question_id=12411: 問題文の修正(row60), 問題文の修正(row60)
- question_id=12412: 問題文の修正(row62), 問題文の修正(row62)
- question_id=12413: 問題文の修正(row64), 問題文の修正(row64)
- question_id=12414: 問題文の修正(row66), 問題文の修正(row66)
- question_id=12415: 問題文の修正(row68), 問題文の修正(row68)
- question_id=12416: 問題文の修正(row70), 問題文の修正(row70)
- question_id=12417: 問題文の修正(row72), 問題文の修正(row72)
- question_id=12418: 問題文の修正(row74), 問題文の修正(row74)
- question_id=12421: 問題文の修正(row77), 問題文の修正(row77)
- question_id=12422: 問題文の修正(row78), 問題文の修正(row78)
- question_id=12423: 問題文の修正(row79), 問題文の修正(row79)
- question_id=12424: 問題文の修正(row80), 問題文の修正(row80)
- question_id=12425: 問題文の修正(row81), 問題文の修正(row81)
- question_id=12426: 問題文の修正(row82), 問題文の修正(row82)
- question_id=12427: 問題文の修正(row83), 問題文の修正(row83)
- question_id=12428: 問題文の修正(row84), 問題文の修正(row84)
- question_id=12511: 問題文の修正(row86), 問題文の修正(row86)
- question_id=12512: 問題文の修正(row88), 問題文の修正(row88)
- question_id=12513: 問題文の修正(row90), 問題文の修正(row90)
- question_id=12514: 問題文の修正(row92), 問題文の修正(row92)
- question_id=12515: 問題文の修正(row94), 問題文の修正(row94)
- question_id=12516: 問題文の修正(row96), 問題文の修正(row96)
- question_id=12517: 問題文の修正(row98), 問題文の修正(row98)
- question_id=12518: 問題文の修正(row100), 問題文の修正(row100)
- question_id=12521: 問題文の修正(row103), 問題文の修正(row103)
- question_id=12522: 問題文の修正(row104), 問題文の修正(row104)
- question_id=12523: 問題文の修正(row105), 問題文の修正(row105)
- question_id=12524: 問題文の修正(row106), 問題文の修正(row106)
- question_id=12525: 問題文の修正(row107), 問題文の修正(row107)
- question_id=12526: 問題文の修正(row108), 問題文の修正(row108)
- question_id=12527: 問題文の修正(row109), 問題文の修正(row109)
- question_id=12528: 問題文の修正(row110), 問題文の修正(row110)
- question_id=12621: 問題文の修正(row111), 問題文の修正(row111)
- question_id=12712: 問題文の修正(row113), 問題文の修正(row113)
- question_id=12812: 問題文の修正(row115), 問題文の修正(row115)
- question_id=12817: 問題文の修正(row117), 問題文の修正(row117)
- question_id=12913: 問題文の修正(row121), 問題文の修正(row121)
- question_id=12915: 問題文の修正(row122), 問題文の修正(row122)
- question_id=13011: 問題文の修正(row123), アポストロフィの統一(row690), アポストロフィの統一(row691)
- question_id=13012: 問題文の修正(row124), アポストロフィの統一(row692), アポストロフィの統一(row693)
- question_id=13013: 問題文の修正(row125), アポストロフィの統一(row694)
- question_id=13014: 問題文の修正(row126), アポストロフィの統一(row695)
- question_id=13015: 問題文の修正(row127), アポストロフィの統一(row696)
- question_id=13016: 問題文の修正(row128), アポストロフィの統一(row697)
- question_id=13017: 問題文の修正(row129), アポストロフィの統一(row698)
- question_id=13018: 問題文の修正(row130), アポストロフィの統一(row699)
- question_id=13021: 問題文の修正(row131), アポストロフィの統一(row700)
- question_id=13022: 問題文の修正(row132), アポストロフィの統一(row701)
- question_id=13023: 問題文の修正(row133), 問題文の修正(row133), アポストロフィの統一(row702)
- question_id=13024: 問題文の修正(row134), 問題文の修正(row134), アポストロフィの統一(row703)
- question_id=13025: 問題文の修正(row135), アポストロフィの統一(row704)
- question_id=13026: 問題文の修正(row136), アポストロフィの統一(row705)
- question_id=13027: 問題文の修正(row137), アポストロフィの統一(row706)
- question_id=13028: 問題文の修正(row138), アポストロフィの統一(row707)
- question_id=13111: 問題文の修正(row141), 問題文の修正(row141)
- question_id=13112: 問題文の修正(row142), 問題文の修正(row142), アポストロフィの統一(row709)
- question_id=13113: 問題文の修正(row143), 問題文の修正(row143), アポストロフィの統一(row710)
- question_id=13114: 問題文の修正(row144), 問題文の修正(row144), アポストロフィの統一(row711)
- question_id=13115: 問題文の修正(row145), 問題文の修正(row145), アポストロフィの統一(row712)
- question_id=13116: 問題文の修正(row146), 問題文の修正(row146)
- question_id=13117: 問題文の修正(row147), 問題文の修正(row147)
- question_id=13118: 問題文の修正(row148), 問題文の修正(row148), アポストロフィの統一(row713)
- question_id=13212: 問題文の修正(row149), 問題文の修正(row149)
- question_id=13223: 問題文の修正(row151), 問題文の修正(row151)
- question_id=13337: 問題文の修正(row152), 問題文の修正(row152)
- question_id=13338: 問題文の修正(row153), 問題文の修正(row153)
- question_id=13418: 問題文の修正(row155), 問題文の修正(row155)
- question_id=13611: 問題文の修正(row156), 問題文の修正(row156)
- question_id=13612: 問題文の修正(row157), 問題文の修正(row157)
- question_id=13613: 問題文の修正(row158), 問題文の修正(row158)
- question_id=13614: 問題文の修正(row159), 問題文の修正(row159)
- question_id=13615: 問題文の修正(row160), 問題文の修正(row160)
- question_id=13616: 問題文の修正(row161), 問題文の修正(row161)
- question_id=13617: 問題文の修正(row162), 問題文の修正(row162)
- question_id=13618: 問題文の修正(row163), 問題文の修正(row163)
- question_id=13621: 問題文の修正(row164), 問題文の修正(row164)
- question_id=13622: 問題文の修正(row165), 問題文の修正(row165)
- question_id=13623: 問題文の修正(row166), 問題文の修正(row166)
- question_id=13624: 問題文の修正(row167), 問題文の修正(row167)
- question_id=13625: 問題文の修正(row168), 問題文の修正(row168)
- question_id=13626: 問題文の修正(row169), 問題文の修正(row169)
- question_id=13627: 問題文の修正(row170), 問題文の修正(row170)
- question_id=13628: 問題文の修正(row171), 問題文の修正(row171)
- question_id=13715: 問題文の修正(row172), 問題文の修正(row172)
- question_id=13731: 問題文の修正(row174), 問題文の修正(row174)
- question_id=13732: 問題文の修正(row175), 問題文の修正(row175)
- question_id=13733: 問題文の修正(row176), 問題文の修正(row176)
- question_id=13734: 問題文の修正(row177), 問題文の修正(row177)
- question_id=13735: 問題文の修正(row178), 問題文の修正(row178)
- question_id=13736: 問題文の修正(row179), 問題文の修正(row179)
- question_id=13737: 問題文の修正(row180), 問題文の修正(row180)
- question_id=13738: 問題文の修正(row181), 問題文の修正(row181)
- question_id=13918: 問題文の修正(row189), 問題文の修正(row189)
- question_id=14017: 問題文の修正(row191), 問題文の修正(row191)
- question_id=14214: 問題文の修正(row200), 問題文の修正(row200)
- question_id=14217: 問題文の修正(row193), 問題文の修正(row193)
- question_id=14317: 問題文の修正(row203), 問題文の修正(row203)
- question_id=14421: 問題文の修正(row213), 問題文の修正(row213)
- question_id=14422: 問題文の修正(row214), 問題文の修正(row214)
- question_id=14423: 問題文の修正(row215), 問題文の修正(row215)
- question_id=14424: 問題文の修正(row216), 問題文の修正(row216)
- question_id=14425: 問題文の修正(row217), 問題文の修正(row217)
- question_id=14426: 問題文の修正(row218), 問題文の修正(row218)
- question_id=14427: 問題文の修正(row219), 問題文の修正(row219)
- question_id=14428: 問題文の修正(row220), 問題文の修正(row220)
- question_id=14626: 問題文の修正(row227), 問題文の修正(row227)
- question_id=14818: 問題文の修正(row234), 問題文の修正(row234)
- question_id=14938: 問題文の修正(row242), 問題文の修正(row242)
- question_id=15021: 問題文の修正(row246), 問題文の修正(row246)
- question_id=15022: 問題文の修正(row247), 問題文の修正(row247)
- question_id=15026: 問題文の修正(row248), 問題文の修正(row248)
- question_id=20215: 問題文の修正(row251), 問題文の修正(row251)
- question_id=21514: 問題文の修正(row252), 問題文の修正(row252), 問題文の修正(row271), 問題文の修正(row271)
- question_id=21723: 解答のみ修正(row283), アポストロフィの統一(row733)
- question_id=21827: 問題文の修正(row285), 問題文の修正(row285)
- question_id=22722: 問題文の修正(row289), 問題文の修正(row289)
- question_id=23217: 問題文の修正(row298), 問題文の修正(row298)
- question_id=23318: 問題文の修正(row300), 問題文の修正(row300)
- question_id=23321: 問題文の修正(row302), 問題文の修正(row302), 問題文の修正(row304), 問題文の修正(row304)
- question_id=23424: アポストロフィの統一(row752), アポストロフィの統一(row753)
- question_id=23425: 問題文の修正(row310), 問題文の修正(row310)
- question_id=23427: 問題文の修正(row311), 問題文の修正(row311)
- question_id=23511: アポストロフィの統一(row754), アポストロフィの統一(row755)
- question_id=23512: 問題文の修正(row314), 問題文の修正(row314)
- question_id=23614: アポストロフィの統一(row756), アポストロフィの統一(row757)
- question_id=23713: 問題文の修正(row323), 問題文の修正(row323)
- question_id=23721: アポストロフィの統一(row758), アポストロフィの統一(row759)
- question_id=23724: 問題文の修正(row327), 問題文の修正(row327)
- question_id=23822: 問題文の修正(row331), 問題文の修正(row331)
- question_id=23823: 問題文の修正(row332), 問題文の修正(row332)
- question_id=23825: 問題文の修正(row333), 問題文の修正(row333)
- question_id=23826: 問題文の修正(row334), 問題文の修正(row334)
- question_id=23828: 問題文の修正(row335), 問題文の修正(row335)
- question_id=23913: 問題文の修正(row336), 問題文の修正(row336)
- question_id=23917: 問題文の修正(row337), 問題文の修正(row337)
- question_id=23922: 問題文の修正(row338), 問題文の修正(row338)
- question_id=23926: 問題文の修正(row339), 問題文の修正(row339)
- question_id=24013: 問題文の修正(row340), 問題文の修正(row340)
- question_id=24113: 問題文の修正(row341), 問題文の修正(row341)
- question_id=24118: 問題文の修正(row345), 問題文の修正(row345)
- question_id=24128: 問題文の修正(row349), 問題文の修正(row349)
- question_id=24325: 問題文の修正(row351), 問題文の修正(row351)
- question_id=24326: 問題文の修正(row353), 問題文の修正(row353)
- question_id=24415: 問題文の修正(row355), 問題文の修正(row355)
- question_id=24428: 問題文の修正(row358), 問題文の修正(row358)
- question_id=24513: 問題文の修正(row360), 問題文の修正(row360)
- question_id=24527: 問題文の修正(row361), 問題文の修正(row361)
- question_id=24723: 問題文の修正(row362), 問題文の修正(row362)
- question_id=24724: 問題文の修正(row363), 問題文の修正(row363)
- question_id=30222: 問題文の修正(row365), 問題文の修正(row365)
- question_id=30223: 問題文の修正(row366), 問題文の修正(row366)
- question_id=30227: 問題文の修正(row367), 問題文の修正(row367)
- question_id=30228: 問題文の修正(row368), 問題文の修正(row368)
- question_id=30814: 問題文の修正(row386), 問題文の修正(row386)
- question_id=30816: 問題文の修正(row387), 問題文の修正(row387)
- question_id=30818: 問題文の修正(row388), 問題文の修正(row388)
- question_id=30926: 問題文の修正(row398), 問題文の修正(row398)
- question_id=31323: 問題文の修正(row416), 問題文の修正(row416)
- question_id=31328: 問題文の修正(row417), 問題文の修正(row417)
- question_id=31334: 問題文の修正(row418), 問題文の修正(row418)
- question_id=31335: 問題文の修正(row419), 問題文の修正(row419)
- question_id=31336: 問題文の修正(row420), 問題文の修正(row420)
- question_id=31337: 問題文の修正(row421), 問題文の修正(row421)
- question_id=31428: 問題文の修正(row426), 問題文の修正(row426)
- question_id=31511: 問題文の修正(row428), 問題文の修正(row428)
- question_id=31512: 問題文の修正(row429), 問題文の修正(row429)
- question_id=31513: 問題文の修正(row430), 問題文の修正(row430)
- question_id=31514: 問題文の修正(row431), 問題文の修正(row431)
- question_id=31515: 問題文の修正(row432), 問題文の修正(row432)
- question_id=31516: 問題文の修正(row433), 問題文の修正(row433)
- question_id=31517: 問題文の修正(row434), 問題文の修正(row434)
- question_id=31518: 問題文の修正(row435), 問題文の修正(row435)
- question_id=31521: 問題文の修正(row437), 問題文の修正(row437)
- question_id=31522: 問題文の修正(row438), 問題文の修正(row438)
- question_id=31523: 問題文の修正(row439), 問題文の修正(row439)
- question_id=31524: 問題文の修正(row440), 問題文の修正(row440)
- question_id=31525: 問題文の修正(row441), 問題文の修正(row441)
- question_id=31526: 問題文の修正(row442), 問題文の修正(row442)
- question_id=31527: 問題文の修正(row443), 問題文の修正(row443)
- question_id=31528: 問題文の修正(row444), 問題文の修正(row444)
- question_id=31718: 問題文の修正(row464), 問題文の修正(row464)
- question_id=31721: 問題文の修正(row466), 問題文の修正(row466)
- question_id=31722: 問題文の修正(row467), 問題文の修正(row467)
- question_id=31723: 問題文の修正(row468), 問題文の修正(row468)
- question_id=31724: 問題文の修正(row469), 問題文の修正(row469)
- question_id=31725: 問題文の修正(row470), 問題文の修正(row470)
- question_id=31726: 問題文の修正(row471), 問題文の修正(row471)
- question_id=31727: 問題文の修正(row472), 問題文の修正(row472)
- question_id=31728: 問題文の修正(row473), 問題文の修正(row473)
- question_id=31816: 問題文の修正(row475), 問題文の修正(row475)
- question_id=31817: 問題文の修正(row476), 問題文の修正(row476)
- question_id=31818: 問題文の修正(row477), 問題文の修正(row477)
- question_id=31913: 問題文の修正(row480), 問題文の修正(row480)
- question_id=31917: 問題文の修正(row481), 問題文の修正(row481)
- question_id=32011: 問題文の修正(row483), 問題文の修正(row483)
- question_id=32012: 問題文の修正(row484), 問題文の修正(row484)
- question_id=32013: 問題文の修正(row485), 問題文の修正(row485)
- question_id=32014: 問題文の修正(row486), 問題文の修正(row486)
- question_id=32015: 問題文の修正(row487), 問題文の修正(row487)
- question_id=32016: 問題文の修正(row488), 問題文の修正(row488)
- question_id=32017: 問題文の修正(row489), 問題文の修正(row489)
- question_id=32018: 問題文の修正(row490), 問題文の修正(row490)
- question_id=32022: 問題文の修正(row492), 問題文の修正(row492)
- question_id=32024: 問題文の修正(row493), 問題文の修正(row493)
- question_id=32026: 問題文の修正(row494), 問題文の修正(row494)
- question_id=32028: 問題文の修正(row495), 問題文の修正(row495)
- question_id=32111: 問題文の修正(row497), 問題文の修正(row497)
- question_id=32112: 問題文の修正(row499), 問題文の修正(row499)
- question_id=32114: 問題文の修正(row501), 問題文の修正(row501)
- question_id=32117: 問題文の修正(row502), 問題文の修正(row502)
- question_id=32118: 問題文の修正(row504), 問題文の修正(row504)
- question_id=32123: 問題文の修正(row507), 問題文の修正(row507)
- question_id=32124: 問題文の修正(row509), 問題文の修正(row509)
- question_id=32126: 問題文の修正(row511), 問題文の修正(row511)
- question_id=32214: 問題文の修正(row514), 問題文の修正(row514)
- question_id=32225: 問題文の修正(row519), 問題文の修正(row519)
- question_id=32316: 問題文の修正(row521), 問題文の修正(row521)
- question_id=32317: 問題文の修正(row522), 問題文の修正(row522)
- question_id=32318: 問題文の修正(row523), 問題文の修正(row523)
- question_id=32326: 問題文の修正(row524), 問題文の修正(row524)
- question_id=32423: 問題文の修正(row534), 問題文の修正(row534)
- question_id=32424: 問題文の修正(row535), 問題文の修正(row535)
- question_id=32427: 問題文の修正(row536), 問題文の修正(row536)
- question_id=32615: 問題文の修正(row551), 問題文の修正(row551)
- question_id=32622: 問題文の修正(row558), 問題文の修正(row558)
- question_id=32628: 問題文の修正(row560), 問題文の修正(row560)
- question_id=32825: 問題文の修正(row570), 問題文の修正(row570)
- question_id=32826: 問題文の修正(row571), 問題文の修正(row571)
- question_id=32827: 問題文の修正(row572), 問題文の修正(row572)
- question_id=32914: 問題文の修正(row573), 問題文の修正(row573)
- question_id=32915: 問題文の修正(row574), 問題文の修正(row574)
- question_id=32918: 問題文の修正(row575), 問題文の修正(row575)
- question_id=32928: 問題文の修正(row576), 問題文の修正(row576)
- question_id=33111: 問題文の修正(row579), 問題文の修正(row579)
- question_id=33112: 問題文の修正(row580), 問題文の修正(row580)
- question_id=33113: 問題文の修正(row581), 問題文の修正(row581)
- question_id=33114: 問題文の修正(row582), 問題文の修正(row582)
- question_id=33115: 問題文の修正(row583), 問題文の修正(row583)
- question_id=33116: 問題文の修正(row584), 問題文の修正(row584)
- question_id=33117: 問題文の修正(row585), 問題文の修正(row585)
- question_id=33118: 問題文の修正(row586), 問題文の修正(row586)
- question_id=33121: 問題文の修正(row588), 問題文の修正(row588)
- question_id=33122: 問題文の修正(row589), 問題文の修正(row589)
- question_id=33123: 問題文の修正(row590), 問題文の修正(row590)
- question_id=33124: 問題文の修正(row591), 問題文の修正(row591)
- question_id=33125: 問題文の修正(row592), 問題文の修正(row592)
- question_id=33126: 問題文の修正(row593), 問題文の修正(row593)
- question_id=33127: 問題文の修正(row594), 問題文の修正(row594)
- question_id=33128: 問題文の修正(row595), 問題文の修正(row595)
- question_id=33131: 問題文の修正(row597), 問題文の修正(row597)
- question_id=33132: 問題文の修正(row598), 問題文の修正(row598)
- question_id=33133: 問題文の修正(row599), 問題文の修正(row599)
- question_id=33134: 問題文の修正(row600), 問題文の修正(row600)
- question_id=33135: 問題文の修正(row601), 問題文の修正(row601)
- question_id=33136: 問題文の修正(row602), 問題文の修正(row602)
- question_id=33137: 問題文の修正(row603), 問題文の修正(row603)
- question_id=33138: 問題文の修正(row604), 問題文の修正(row604)
- question_id=33141: 問題文の修正(row606), 問題文の修正(row606)
- question_id=33142: 問題文の修正(row607), 問題文の修正(row607)
- question_id=33143: 問題文の修正(row608), 問題文の修正(row608)
- question_id=33144: 問題文の修正(row609), 問題文の修正(row609)
- question_id=33145: 問題文の修正(row610), 問題文の修正(row610)
- question_id=33146: 問題文の修正(row611), 問題文の修正(row611)
- question_id=33147: 問題文の修正(row612), 問題文の修正(row612)
- question_id=33148: 問題文の修正(row613), 問題文の修正(row613)
- question_id=33316: 問題文の修正(row614), 問題文の修正(row614)
- question_id=33323: 問題文の修正(row615), 問題文の修正(row615)
- question_id=33327: 問題文の修正(row616), 問題文の修正(row616)
- question_id=33418: 問題文の修正(row617), 問題文の修正(row617)
- question_id=33426: 問題文の修正(row618), 問題文の修正(row618)
- question_id=33511: 問題文の修正(row621), 問題文の修正(row621)
- question_id=33513: 問題文の修正(row622), 問題文の修正(row622)

## 全適用ログ

| 行 | 対象 | 種別 | 結果 | フィールド | 変更前 | 変更後 | 備考 |
|---|---|---|---|---|---|---|---|
| 58 | 1-23-2-6 | その他 | applied | image_url | /questions/1_23_2_0.6png | /questions/1_23_2_06.png | タイポ修正 |
| 119 | 1-28-1-5 | その他 | applied | image_url | /questions/1_28_1_05png | /questions/1_28_1_05.png | タイポ修正 |
| 194 | 1 _41_2_01 | その他 | already_ok | image_url | /questions/1_41_2_01.png | /questions/1_41_2_01.png | ベースデータで修正済み |
| 5 | 1-4-2-1 | 問題文の修正 | already_ok | question_text | This table | This table |  |
| 5 | 1-4-2-1 | 問題文の修正 | applied | expected_text | It is strong. | This table is strong. |  |
| 6 | 1-4-2-2 | 問題文の修正 | already_ok | question_text | This chair | This chair |  |
| 6 | 1-4-2-2 | 問題文の修正 | applied | expected_text | It is strong. | This chair is strong. |  |
| 7 | 1-4-2-3 | 問題文の修正 | already_ok | question_text | That table | That table |  |
| 7 | 1-4-2-3 | 問題文の修正 | applied | expected_text | It is strong. | That table is strong. |  |
| 8 | 1-4-2-4 | 問題文の修正 | already_ok | question_text | My cat | My cat |  |
| 8 | 1-4-2-4 | 問題文の修正 | applied | expected_text | It is strong. | My cat is strong. |  |
| 9 | 1-4-2-5 | 問題文の修正 | already_ok | question_text | My cats | My cats |  |
| 9 | 1-4-2-5 | 問題文の修正 | applied | expected_text | They are strong. | My cats are strong. |  |
| 10 | 1-4-2-6 | 問題文の修正 | already_ok | question_text | Your cats | Your cats |  |
| 10 | 1-4-2-6 | 問題文の修正 | applied | expected_text | They are strong. | Your cats are strong. |  |
| 11 | 1-4-2-7 | 問題文の修正 | already_ok | question_text | My mother | My mother |  |
| 11 | 1-4-2-7 | 問題文の修正 | applied | expected_text | She is strong. | My mother is strong. |  |
| 12 | 1-4-2-8 | 問題文の修正 | already_ok | question_text | My father | My father |  |
| 12 | 1-4-2-8 | 問題文の修正 | applied | expected_text | He is strong. | My father is strong. |  |
| 13 | 1-5-1-7 | 問題文の修正 | applied | question_text | It | Your brother |  |
| 13 | 1-5-1-7 | 問題文の修正 | applied | expected_text | It is in the kitchen. | Your brother is in the kitchen. |  |
| 14 | 1-5-1-8 | 問題文の修正 | applied | question_text | Your brother | My mother and I |  |
| 14 | 1-5-1-8 | 問題文の修正 | applied | expected_text | He is in the kitchen. | My mother and I are in the kitchen. |  |
| 22 | 1-9-1-5 | 問題文の修正 | applied | question_text | Tom | Tom and I |  |
| 22 | 1-9-1-5 | 問題文の修正 | applied | expected_text | He speaks English. | We speak English. |  |
| 24 | 1-9-1-6 | 問題文の修正 | applied | question_text | My friend Ted | My parrot |  |
| 24 | 1-9-1-6 | 問題文の修正 | applied | expected_text | He speaks English. | It speaks English. |  |
| 26 | 1-9-2-2 | 問題文の修正 | already_ok | question_text | My mother | My mother |  |
| 26 | 1-9-2-2 | 問題文の修正 | applied | expected_text | She plays tennis | She plays tennis. |  |
| 27 | 1-9-2-3 | 問題文の修正 | already_ok | question_text | We | We |  |
| 27 | 1-9-2-3 | 問題文の修正 | applied | expected_text | We play tennis | We play tennis. |  |
| 28 | 1-9-2-4 | 問題文の修正 | already_ok | question_text | He | He |  |
| 28 | 1-9-2-4 | 問題文の修正 | applied | expected_text | He plays tennis | He plays tennis. |  |
| 29 | 1-9-2-5 | 問題文の修正 | already_ok | question_text | Our teachers | Our teachers |  |
| 29 | 1-9-2-5 | 問題文の修正 | applied | expected_text | They play tennis | They play tennis. |  |
| 30 | 1-9-2-6 | 問題文の修正 | already_ok | question_text | My sister | My sister |  |
| 30 | 1-9-2-6 | 問題文の修正 | applied | expected_text | She plays tennis | She plays tennis. |  |
| 31 | 1-9-2-7 | 問題文の修正 | already_ok | question_text | My brother | My brother |  |
| 31 | 1-9-2-7 | 問題文の修正 | applied | expected_text | He plays tennis | He plays tennis. |  |
| 32 | 1-9-2-8 | 問題文の修正 | applied | question_text | The boy | My dog |  |
| 32 | 1-9-2-8 | 問題文の修正 | applied | expected_text | He plays tennis | It plays tennis. |  |
| 41 | 1-11-2-8 | 問題文の修正 | already_ok | question_text | Emma and David | Emma and David |  |
| 41 | 1-11-2-8 | 問題文の修正 | applied | expected_text | They clean the room. | They eat breakfast. |  |
| 44 | 1-12-1-6 | 問題文の修正 | applied | question_text | He | My dog |  |
| 44 | 1-12-1-6 | 問題文の修正 | applied | expected_text | He plays soccer in the park. | It plays soccer in the park. |  |
| 47 | 1-13-1-2 | 問題文の修正 | applied | question_text | Jone is a teacher. | John is a teacher. |  |
| 47 | 1-13-1-2 | 問題文の修正 | already_ok | expected_text | He is a teacher. | He is a teacher. |  |
| 52 | 1-18-1-2 | 問題文の修正 | already_ok | question_text | This is your bike. | This is your bike. |  |
| 52 | 1-18-1-2 | 問題文の修正 | applied | expected_text | This is not your bike. | It is not your bike. |  |
| 56 | 1-15-1-8 | 問題文の修正 | applied | question_text | What do you have? | What is this? |  |
| 56 | 1-15-1-8 | 問題文の修正 | applied | expected_text | I have a big dog. | This is a big dog. |  |
| 60 | 1-24-1-1 | 問題文の修正 | applied | question_text | You like soccer. | Do you like soccer |  |
| 60 | 1-24-1-1 | 問題文の修正 | applied | expected_text | Do you like soccer? | No, I don't. |  |
| 62 | 1-24-1-2 | 問題文の修正 | applied | question_text | They speak English. | Do you speak English? |  |
| 62 | 1-24-1-2 | 問題文の修正 | applied | expected_text | Do they speak English? | No, I don't. |  |
| 64 | 1-24-1-3 | 問題文の修正 | applied | question_text | We play the piano. | Do you play the piano? |  |
| 64 | 1-24-1-3 | 問題文の修正 | applied | expected_text | Do we play the piano? | Yes, I do. |  |
| 66 | 1-24-1-4 | 問題文の修正 | applied | question_text | They read books. | Do you read books? |  |
| 66 | 1-24-1-4 | 問題文の修正 | applied | expected_text | Do they read books? | No, I don't. |  |
| 68 | 1-24-1-5 | 問題文の修正 | applied | question_text | We have a brother. | Do you have a brother? |  |
| 68 | 1-24-1-5 | 問題文の修正 | applied | expected_text | Do we have a brother? | Yes, I do. |  |
| 70 | 1-24-1-6 | 問題文の修正 | applied | question_text | You study English. | Do you study English? |  |
| 70 | 1-24-1-6 | 問題文の修正 | applied | expected_text | Do you study English? | Yes, I do. |  |
| 72 | 1-24-1-7 | 問題文の修正 | applied | question_text | We swim in the river. | Do you cook? |  |
| 72 | 1-24-1-7 | 問題文の修正 | applied | expected_text | Do we swim in the river? | No, I don't. |  |
| 74 | 1-24-1-8 | 問題文の修正 | applied | question_text | You walk to school. | Do you walk to school? |  |
| 74 | 1-24-1-8 | 問題文の修正 | applied | expected_text | Do you walk to school? | No, I don't. |  |
| 77 | 1-24-2-1 | 問題文の修正 | already_ok | question_text | You like soccer. | You like soccer. |  |
| 77 | 1-24-2-1 | 問題文の修正 | applied | expected_text | You don’t like soccer. | Do you like soccer? |  |
| 78 | 1-24-2-2 | 問題文の修正 | already_ok | question_text | They speak English. | They speak English. |  |
| 78 | 1-24-2-2 | 問題文の修正 | applied | expected_text | They don’t speak English. | Do they speak English? |  |
| 79 | 1-24-2-3 | 問題文の修正 | applied | question_text | They read books. | We play the piano. |  |
| 79 | 1-24-2-3 | 問題文の修正 | applied | expected_text | They don’t read books. | Do we play the piano? |  |
| 80 | 1-24-2-4 | 問題文の修正 | applied | question_text | You play soccer. | They read books. |  |
| 80 | 1-24-2-4 | 問題文の修正 | applied | expected_text | You don’t play soccer. | Do they read books? |  |
| 81 | 1-24-2-5 | 問題文の修正 | already_ok | question_text | We have a brother. | We have a brother. |  |
| 81 | 1-24-2-5 | 問題文の修正 | applied | expected_text | We don’t have a brother. | Do we have a brother? |  |
| 82 | 1-24-2-6 | 問題文の修正 | already_ok | question_text | You study English. | You study English. |  |
| 82 | 1-24-2-6 | 問題文の修正 | applied | expected_text | You don’t study English. | Do you study English? |  |
| 83 | 1-24-2-7 | 問題文の修正 | already_ok | question_text | We swim in the river. | We swim in the river. |  |
| 83 | 1-24-2-7 | 問題文の修正 | applied | expected_text | We don’t swim in the river. | Do we swim in the river? |  |
| 84 | 1-24-2-8 | 問題文の修正 | already_ok | question_text | You walk to school. | You walk to school. |  |
| 84 | 1-24-2-8 | 問題文の修正 | applied | expected_text | You don’t walk to school. | Do you walk to school? |  |
| 86 | 1-25-1-1 | 問題文の修正 | applied | question_text | She likes cats. | Does she like cats? |  |
| 86 | 1-25-1-1 | 問題文の修正 | applied | expected_text | Does she like cats? | Yes, she does. |  |
| 88 | 1-25-1-2 | 問題文の修正 | applied | question_text | My sister reads books. | Does my sister read books? |  |
| 88 | 1-25-1-2 | 問題文の修正 | applied | expected_text | Does your sister read books? | No, she doesn't. |  |
| 90 | 1-25-1-3 | 問題文の修正 | applied | question_text | He plays the guitar. | Do you play tennis? |  |
| 90 | 1-25-1-3 | 問題文の修正 | applied | expected_text | Does he play the guitar? | Yes, I do. |  |
| 92 | 1-25-1-4 | 問題文の修正 | applied | question_text | Mary speaks Japanese. | Does he play the guitar? |  |
| 92 | 1-25-1-4 | 問題文の修正 | applied | expected_text | Does she speak Japanese? | Yes, he does. |  |
| 94 | 1-25-1-5 | 問題文の修正 | applied | question_text | He studies math. | Does your cat eat fish? |  |
| 94 | 1-25-1-5 | 問題文の修正 | applied | expected_text | Does he study math? | Yes, it does. |  |
| 96 | 1-25-1-6 | 問題文の修正 | applied | question_text | She has a bag. | Does Mary speak Japanese? |  |
| 96 | 1-25-1-6 | 問題文の修正 | applied | expected_text | Does she have a bag? | No, she doesn't. |  |
| 98 | 1-25-1-7 | 問題文の修正 | applied | question_text | My friend likes dogs. | Do you have a dog? |  |
| 98 | 1-25-1-7 | 問題文の修正 | applied | expected_text | Does your friend like dogs? | No, I don't. |  |
| 100 | 1-25-1-8 | 問題文の修正 | applied | question_text | She reads a newspaper. | Does this bus go to the station? |  |
| 100 | 1-25-1-8 | 問題文の修正 | applied | expected_text | Does she read a newspaper? | No, it doesn't. |  |
| 103 | 1-25-2-1 | 問題文の修正 | already_ok | question_text | She likes cats. | She likes cats. |  |
| 103 | 1-25-2-1 | 問題文の修正 | applied | expected_text | She doesn’t like cats. | Does she like cats? |  |
| 104 | 1-25-2-2 | 問題文の修正 | already_ok | question_text | My sister reads books. | My sister reads books. |  |
| 104 | 1-25-2-2 | 問題文の修正 | applied | expected_text | She doesn’t read books. | Does my sister read books? |  |
| 105 | 1-25-2-3 | 問題文の修正 | applied | question_text | He plays the guitar. | You play tennis. |  |
| 105 | 1-25-2-3 | 問題文の修正 | applied | expected_text | He doesn’t play the guitar. | Do you play tennis? |  |
| 106 | 1-25-2-4 | 問題文の修正 | applied | question_text | Mary speaks Japanese. | He plays the guitar. |  |
| 106 | 1-25-2-4 | 問題文の修正 | applied | expected_text | She doesn’t speak Japanese. | Does he play the guitar? |  |
| 107 | 1-25-2-5 | 問題文の修正 | applied | question_text | He studies math. | Your cat eats fish. |  |
| 107 | 1-25-2-5 | 問題文の修正 | applied | expected_text | He doesn’t study math. | Does your cat eat fish? |  |
| 108 | 1-25-2-6 | 問題文の修正 | applied | question_text | She has a bag. | Mary speaks Japanese. |  |
| 108 | 1-25-2-6 | 問題文の修正 | applied | expected_text | She doesn’t have a bag. | Does Mary speak Japanese? |  |
| 109 | 1-25-2-7 | 問題文の修正 | applied | question_text | My friends like dogs. | You have a dog. |  |
| 109 | 1-25-2-7 | 問題文の修正 | applied | expected_text | They don't like dogs. | Do you have a dog? |  |
| 110 | 1-25-2-8 | 問題文の修正 | applied | question_text | She reads a newspaper. | This bus goes to the station. |  |
| 110 | 1-25-2-8 | 問題文の修正 | applied | expected_text | She doesn’t read a newspaper. | Does this bus go to the station? |  |
| 111 | 1-26-2-1 | 問題文の修正 | already_ok | question_text | Your mother drives a car. | Your mother drives a car. |  |
| 111 | 1-26-2-1 | 問題文の修正 | applied | expected_text | She doesn’t drive a car. | Your mother doesn't drive a car. |  |
| 113 | 1-27-1-2 | 問題文の修正 | already_ok | question_text | Your sister can drive a car. | Your sister can drive a car. |  |
| 113 | 1-27-1-2 | 問題文の修正 | applied | expected_text | Can she drive a car? | Can your sister drive a car? |  |
| 115 | 1-28-1-2 | 問題文の修正 | applied | question_text | Can she say hello? | Can they buy apples? |  |
| 115 | 1-28-1-2 | 問題文の修正 | applied | expected_text | Yes, she can. | No, they can't. |  |
| 117 | 1-28-1-7 | 問題文の修正 | applied | question_text | Can he believe his friend? | Can he ride a bike? |  |
| 117 | 1-28-1-7 | 問題文の修正 | applied | expected_text | Yes, he can. | No, he can't. |  |
| 121 | 1-29-1-3 | 問題文の修正 | applied | question_text | Help you | Use this pen |  |
| 121 | 1-29-1-3 | 問題文の修正 | applied | expected_text | Can I help you? | Can I use this pen? |  |
| 122 | 1-29-1-5 | 問題文の修正 | applied | question_text | Write your name | Sit here |  |
| 122 | 1-29-1-5 | 問題文の修正 | applied | expected_text | Can I write your name? | Can I sit here? |  |
| 123 | 1-30-1-1 | 問題文の修正 | applied | question_text | What’s this? | What's this? |  |
| 124 | 1-30-1-2 | 問題文の修正 | applied | question_text | What’s that? | What's that? |  |
| 125 | 1-30-1-3 | 問題文の修正 | applied | question_text | What’s that sound? | What's that sound? |  |
| 126 | 1-30-1-4 | 問題文の修正 | applied | question_text | What’s his name? | What's his name? |  |
| 127 | 1-30-1-5 | 問題文の修正 | applied | question_text | What’s your friend’s name? | What's your friend's name? |  |
| 128 | 1-30-1-6 | 問題文の修正 | applied | question_text | What’s her favorite sport? | What's her favorite sport? |  |
| 129 | 1-30-1-7 | 問題文の修正 | applied | question_text | What’s your favorite color? | What's your favorite color? |  |
| 130 | 1-30-1-8 | 問題文の修正 | applied | question_text | What’s your favorite subject? | What's your favorite subject? |  |
| 131 | 1-30-2-1 | 問題文の修正 | applied | question_text | What’s your favorite drink? | What's your favorite drink? |  |
| 132 | 1-30-2-2 | 問題文の修正 | applied | question_text | What’s your mother’s favorite food? | What's your mother's favorite food? |  |
| 133 | 1-30-2-3 | 問題文の修正 | applied | question_text | What’s your email address? | What's your email address? |  |
| 133 | 1-30-2-3 | 問題文の修正 | applied | expected_text | My email address is abc123.com | My email address is abc@123.com. |  |
| 134 | 1-30-2-4 | 問題文の修正 | applied | question_text | What’s your phone number? | What's your phone number? |  |
| 134 | 1-30-2-4 | 問題文の修正 | applied | expected_text | My phone number is 0568-000-1122 | My phone number is 0568-000-1122. |  |
| 135 | 1-30-2-5 | 問題文の修正 | applied | question_text | What’s on the table? | What's on the table? |  |
| 136 | 1-30-2-6 | 問題文の修正 | applied | question_text | What’s in your bag? | What's in your bag? |  |
| 137 | 1-30-2-7 | 問題文の修正 | applied | question_text | What’s in the box? | What's in the box? |  |
| 138 | 1-30-2-8 | 問題文の修正 | applied | question_text | What’s under the chair? | What's under the chair? |  |
| 141 | 1-31-1-1 | 問題文の修正 | already_ok | question_text | What time is it? | What time is it? |  |
| 141 | 1-31-1-1 | 問題文の修正 | applied | expected_text | It’s three. | It's three o'clock. |  |
| 142 | 1-31-1-2 | 問題文の修正 | already_ok | question_text | What time is it now? | What time is it now? |  |
| 142 | 1-31-1-2 | 問題文の修正 | applied | expected_text | It’s seven thirty. | It's seven thirty. |  |
| 143 | 1-31-1-3 | 問題文の修正 | already_ok | question_text | What day is it today? | What day is it today? |  |
| 143 | 1-31-1-3 | 問題文の修正 | applied | expected_text | It’s Monday. | It's Monday. |  |
| 144 | 1-31-1-4 | 問題文の修正 | already_ok | question_text | What month is it now? | What month is it now? |  |
| 144 | 1-31-1-4 | 問題文の修正 | applied | expected_text | It’s September. | It's September. |  |
| 145 | 1-31-1-5 | 問題文の修正 | already_ok | question_text | What season is it? | What season is it? |  |
| 145 | 1-31-1-5 | 問題文の修正 | applied | expected_text | It’s summer. | It's summer. |  |
| 146 | 1-31-1-6 | 問題文の修正 | already_ok | question_text | What time do you get up? | What time do you get up? |  |
| 146 | 1-31-1-6 | 問題文の修正 | already_ok | expected_text | I get up at six. | I get up at six. |  |
| 147 | 1-31-1-7 | 問題文の修正 | already_ok | question_text | What time do you go to bed? | What time do you go to bed? |  |
| 147 | 1-31-1-7 | 問題文の修正 | already_ok | expected_text | I go to bed at ten. | I go to bed at ten. |  |
| 148 | 1-31-1-8 | 問題文の修正 | applied | question_text | What day do you have English class？ | What day do you have English class? |  |
| 148 | 1-31-1-8 | 問題文の修正 | already_ok | expected_text | I have English class on Friday. | I have English class on Friday. |  |
| 149 | 1-32-1-2 | 問題文の修正 | applied | question_text | Do you like subjects? | Do you like sports? |  |
| 149 | 1-32-1-2 | 問題文の修正 | applied | expected_text | What subjects do you like? | What sports do you like? | 2文形式(Q?+解答文)と判定して分割 |
| 151 | 1-32-2-3 | 問題文の修正 | applied | question_text | Do you have fruits? | Do you have books? |  |
| 151 | 1-32-2-3 | 問題文の修正 | applied | expected_text | What fruits do you have? | What books do you have? |  |
| 152 | 1-33-3-7 | 問題文の修正 | applied | question_text | My favorite actor is Johnny Depp. | My hero is Taro. |  |
| 152 | 1-33-3-7 | 問題文の修正 | applied | expected_text | Who is your favorite actor? | Who is your hero? |  |
| 153 | 1-33-3-8 | 問題文の修正 | applied | question_text | My favorite singers are BTS. | My favorite character is Pikachu. |  |
| 153 | 1-33-3-8 | 問題文の修正 | applied | expected_text | Who are your favorite singers? | Who is your favorite character? |  |
| 155 | 1-34-1-8 | 問題文の修正 | applied | question_text | Are they good today? | Is she good today? |  |
| 155 | 1-34-1-8 | 問題文の修正 | applied | expected_text | How are your friends today? | How is she today? |  |
| 156 | 1-36-1-1 | 問題文の修正 | applied | question_text | What’s the plural of city? | What's the plural of city? |  |
| 156 | 1-36-1-1 | 問題文の修正 | applied | expected_text | It’s cities. | It's cities. |  |
| 157 | 1-36-1-2 | 問題文の修正 | applied | question_text | What’s the plural of box? | What's the plural of box? |  |
| 157 | 1-36-1-2 | 問題文の修正 | applied | expected_text | It’s boxes. | It's boxes. |  |
| 158 | 1-36-1-3 | 問題文の修正 | applied | question_text | What’s the plural of man? | What's the plural of man? |  |
| 158 | 1-36-1-3 | 問題文の修正 | applied | expected_text | It’s men. | It's men. |  |
| 159 | 1-36-1-4 | 問題文の修正 | applied | question_text | What’s the plural of woman? | What's the plural of woman? |  |
| 159 | 1-36-1-4 | 問題文の修正 | applied | expected_text | It’s women. | It's women. |  |
| 160 | 1-36-1-5 | 問題文の修正 | applied | question_text | What’s the plural of child? | What's the plural of child? |  |
| 160 | 1-36-1-5 | 問題文の修正 | applied | expected_text | It’s children. | It's children. |  |
| 161 | 1-36-1-6 | 問題文の修正 | applied | question_text | What’s the plural of family? | What's the plural of family? |  |
| 161 | 1-36-1-6 | 問題文の修正 | applied | expected_text | It’s families. | It's families. |  |
| 162 | 1-36-1-7 | 問題文の修正 | applied | question_text | What’s the plural of class? | What's the plural of class? |  |
| 162 | 1-36-1-7 | 問題文の修正 | applied | expected_text | It’s classes. | It's classes. |  |
| 163 | 1-36-1-8 | 問題文の修正 | applied | question_text | What’s the plural of country? | What's the plural of country? |  |
| 163 | 1-36-1-8 | 問題文の修正 | applied | expected_text | It’s countries. | It's countries. |  |
| 164 | 1-36-2-1 | 問題文の修正 | applied | question_text | What’s the plural of class? | What's the plural of bus? |  |
| 164 | 1-36-2-1 | 問題文の修正 | applied | expected_text | It’s classes. | It's buses. |  |
| 165 | 1-36-2-2 | 問題文の修正 | applied | question_text | What’s the plural of country? | What's the plural of dish? |  |
| 165 | 1-36-2-2 | 問題文の修正 | applied | expected_text | It’s countries. | It's dishes. |  |
| 166 | 1-36-2-3 | 問題文の修正 | applied | question_text | What’s the plural of lady? | What's the plural of lady? |  |
| 166 | 1-36-2-3 | 問題文の修正 | applied | expected_text | It’s ladies. | It's ladies. |  |
| 167 | 1-36-2-4 | 問題文の修正 | applied | question_text | What’s the plural of baby? | What's the plural of baby? |  |
| 167 | 1-36-2-4 | 問題文の修正 | applied | expected_text | It’s babies. | It's babies. |  |
| 168 | 1-36-2-5 | 問題文の修正 | applied | question_text | What’s the plural of fox? | What's the plural of fox? |  |
| 168 | 1-36-2-5 | 問題文の修正 | applied | expected_text | It’s foxes. | It's foxes. |  |
| 169 | 1-36-2-6 | 問題文の修正 | applied | question_text | What’s the plural of potato? | What's the plural of potato? |  |
| 169 | 1-36-2-6 | 問題文の修正 | applied | expected_text | It’s potatoes. | It's potatoes. |  |
| 170 | 1-36-2-7 | 問題文の修正 | applied | question_text | What’s the plural of tomato? | What's the plural of tomato? |  |
| 170 | 1-36-2-7 | 問題文の修正 | applied | expected_text | It’s tomatoes. | It's tomatoes. |  |
| 171 | 1-36-2-8 | 問題文の修正 | applied | question_text | What’s the plural of leaf? | What's the plural of leaf? |  |
| 171 | 1-36-2-8 | 問題文の修正 | applied | expected_text | It’s leaves. | It's leaves. |  |
| 172 | 1-37-1-5 | 問題文の修正 | applied | question_text | Do you draw pictures? | Do you draw cats? |  |
| 172 | 1-37-1-5 | 問題文の修正 | applied | expected_text | How many pictures do you draw? | How many cats do you draw? |  |
| 174 | 1-37-3-1 | 問題文の修正 | already_ok | question_text | Are you old? | Are you old? |  |
| 174 | 1-37-3-1 | 問題文の修正 | already_ok | expected_text | How old are you? | How old are you? |  |
| 175 | 1-37-3-2 | 問題文の修正 | already_ok | question_text | Is your brother old? | Is your brother old? |  |
| 175 | 1-37-3-2 | 問題文の修正 | applied | expected_text | How old is he | How old is he? |  |
| 176 | 1-37-3-3 | 問題文の修正 | already_ok | question_text | Are your friends old? | Are your friends old? |  |
| 176 | 1-37-3-3 | 問題文の修正 | already_ok | expected_text | How old are they? | How old are they? |  |
| 177 | 1-37-3-4 | 問題文の修正 | already_ok | question_text | Is she old? | Is she old? |  |
| 177 | 1-37-3-4 | 問題文の修正 | already_ok | expected_text | How old is she? | How old is she? |  |
| 178 | 1-37-3-5 | 問題文の修正 | already_ok | question_text | Is your dog old? | Is your dog old? |  |
| 178 | 1-37-3-5 | 問題文の修正 | already_ok | expected_text | How old is it? | How old is it? |  |
| 179 | 1-37-3-6 | 問題文の修正 | already_ok | question_text | Is this building old? | Is this building old? |  |
| 179 | 1-37-3-6 | 問題文の修正 | applied | expected_text | How old is it? | How old is this building? |  |
| 180 | 1-37-3-7 | 問題文の修正 | already_ok | question_text | Is the city old? | Is the city old? |  |
| 180 | 1-37-3-7 | 問題文の修正 | applied | expected_text | How old is it? | How old is the city? |  |
| 181 | 1-37-3-8 | 問題文の修正 | already_ok | question_text | Is the temple old? | Is the temple old? |  |
| 181 | 1-37-3-8 | 問題文の修正 | applied | expected_text | How old is it? | How old is the temple? |  |
| 189 | 1-39-1-8 | 問題文の修正 | applied | question_text | You are late. | You are noisy. |  |
| 189 | 1-39-1-8 | 問題文の修正 | applied | expected_text | Don’t be late. | Don't be noisy. |  |
| 191 | 1-40-1-7 | 問題文の修正 | applied | question_text | it | Mary |  |
| 191 | 1-40-1-7 | 問題文の修正 | applied | expected_text | it | her |  |
| 193 | 1-42-1-7 | 問題文の修正 | applied | question_text | What is your mother doing now? | What is your father doing? |  |
| 193 | 1-42-1-7 | 問題文の修正 | applied | expected_text | She is making dinner now. | He is eating dinner. |  |
| 200 | 1-42-1-4 | 問題文の修正 | applied | question_text | What are you doing now? | What is Bob doing now? |  |
| 200 | 1-42-1-4 | 問題文の修正 | applied | expected_text | I am swimming in the pool now. | He is swimming in the pool now. |  |
| 203 | 1-43-1-7 | 問題文の修正 | applied | question_text | She says hello. | He opens the door. |  |
| 203 | 1-43-1-7 | 問題文の修正 | applied | expected_text | Is she saying hello? | Is he opening the door? |  |
| 213 | 1-44-2-1 | 問題文の修正 | applied | question_text | Who’s looking for the pen? | Who is looking for the pen? |  |
| 213 | 1-44-2-1 | 問題文の修正 | applied | expected_text | I’m looking for the pen. | I'm looking for the pen. |  |
| 214 | 1-44-2-2 | 問題文の修正 | applied | question_text | Who’s waiting for the bus? | Who is waiting for the bus? |  |
| 214 | 1-44-2-2 | 問題文の修正 | applied | expected_text | I’m waiting for the bus. | I'm waiting for the bus. |  |
| 215 | 1-44-2-3 | 問題文の修正 | applied | question_text | Who’s listening to music? | Who is listening to music? |  |
| 215 | 1-44-2-3 | 問題文の修正 | applied | expected_text | I’m listening to music. | I'm listening to music. |  |
| 216 | 1-44-2-4 | 問題文の修正 | applied | question_text | Who’s talking to the teacher? | Who is talking to the teacher? |  |
| 216 | 1-44-2-4 | 問題文の修正 | applied | expected_text | I’m talking to the teacher. | I'm talking to the teacher. |  |
| 217 | 1-44-2-5 | 問題文の修正 | applied | question_text | Who’s taking a picture? | Who is taking a picture? |  |
| 217 | 1-44-2-5 | 問題文の修正 | applied | expected_text | I’m taking a picture. | I'm taking a picture. |  |
| 218 | 1-44-2-6 | 問題文の修正 | applied | question_text | Who’s turning off the light? | Who is turning off the light? |  |
| 218 | 1-44-2-6 | 問題文の修正 | applied | expected_text | I’m turning off the light. | I'm turning off the light. |  |
| 219 | 1-44-2-7 | 問題文の修正 | applied | question_text | Who’s getting on the bus? | Who is getting on the bus? |  |
| 219 | 1-44-2-7 | 問題文の修正 | applied | expected_text | I’m getting on the bus. | I'm getting on the bus. |  |
| 220 | 1-44-2-8 | 問題文の修正 | applied | question_text | Who’s picking up the ball? | Who is picking up the ball? |  |
| 220 | 1-44-2-8 | 問題文の修正 | applied | expected_text | I’m picking up the ball. | I'm picking up the ball. |  |
| 227 | 1-46-2-6 | 問題文の修正 | applied | question_text | He writes in his diary. | He has breakfast. |  |
| 227 | 1-46-2-6 | 問題文の修正 | applied | expected_text | He wrote in his diary yesterday. | He had breakfast yesterday. |  |
| 234 | 1-48-1-8 | 問題文の修正 | applied | question_text | They cleaned new bags last week. | They bought new bags last week. |  |
| 234 | 1-48-1-8 | 問題文の修正 | applied | expected_text | Did they clean new bags last week? | Did they buy new bags last week? |  |
| 242 | 1-49-3-8 | 問題文の修正 | applied | question_text | They wrote a letter yesterday. | They wrote letters yesterday. |  |
| 242 | 1-49-3-8 | 問題文の修正 | applied | expected_text | Where did they write a letter yesterday? | Where did they write letters yesterday? |  |
| 246 | 1-50-2-1 | 問題文の修正 | applied | question_text | I am excited. | Am I excited? |  |
| 246 | 1-50-2-1 | 問題文の修正 | applied | expected_text | I was excited yesterday. | Was I excited yesterday? |  |
| 247 | 1-50-2-2 | 問題文の修正 | applied | question_text | You are tired. | Are you tired? |  |
| 247 | 1-50-2-2 | 問題文の修正 | applied | expected_text | You were tired last night. | Were you tired last night? |  |
| 248 | 1-50-2-6 | 問題文の修正 | applied | question_text | They are noisy. | Are they noisy? |  |
| 248 | 1-50-2-6 | 問題文の修正 | applied | expected_text | They were noisy yesterday. | Were they noisy yesterday? |  |
| 251 | 2-2-1-5 | 問題文の修正 | already_ok | question_text | My brother | My brother |  |
| 251 | 2-2-1-5 | 問題文の修正 | applied | expected_text | He lives in Tokyo. | My brother plays the guitar. |  |
| 252 | 2-15-1-４ | 問題文の修正 | applied | question_text | What does your mother cook for you? | What does your mother cook you? |  |
| 252 | 2-15-1-４ | 問題文の修正 | applied | expected_text | She cooks dinner for me. | She cooks me dinner. |  |
| 269 | 2-12-2-8 | 問題文の修正 | applied | question_text | Bob's going to see animals. | They'er going to see animals. Where're they going to see animals? |  |
| 270 | 2-14-2-7 | 問題文の修正 | applied | question_text | Paul's nervous before the test. | He's nervous before the test. |  |
| 271 | 2-15-1-4 | 問題文の修正 | already_ok | question_text | What does your mother cook you? | What does your mother cook you? |  |
| 271 | 2-15-1-4 | 問題文の修正 | already_ok | expected_text | She cooks me dinner. | She cooks me dinner. |  |
| 285 | 2-18-2-7 | 問題文の修正 | applied | question_text | What do you know about that movie star? | What do you know about them? |  |
| 285 | 2-18-2-7 | 問題文の修正 | applied | expected_text | I know that he is popular. | I know that they are popular. | 2文形式(Q?+解答文)と判定して分割 |
| 289 | 2-27-2-2 | 問題文の修正 | applied | question_text | Why did I visit Nara? | Why did she visit Nara? |  |
| 289 | 2-27-2-2 | 問題文の修正 | applied | expected_text | To see my aunt. | To see her aunt. |  |
| 291 | 2-29-2-1 | 問題文の修正 | applied | question_text | What are there to see in the park? | What is there to see in the park? |  |
| 292 | 2-29-2-2 | 問題文の修正 | applied | question_text | What are there to see in the zoo? | What is there to see in the zoo? |  |
| 293 | 2-29-2-3 | 問題文の修正 | applied | question_text | What are there to visit in the city? | What is there to visit in the city? |  |
| 296 | 2-32-1-2 | 問題文の修正 | applied | question_text | Which river is wider, the Kiso River or the Shinano River? | Which is faster, a car or a bicycle? A car is faster than a bicycle. |  |
| 298 | 2-32-1-7 | 問題文の修正 | applied | question_text | Which mountain is higher, Mt. Kiso Ontake or Mt. Fuji? | Which is heavier, gold or silver? |  |
| 298 | 2-32-1-7 | 問題文の修正 | applied | expected_text | Mt. Fuji is higher than Mt. Kiso Ontake. | Gold is heavier than silver. |  |
| 300 | 2-33-1-8 | 問題文の修正 | applied | question_text | Which train is the fastest in Japan? | Which chair is the oldest in my room? |  |
| 300 | 2-33-1-8 | 問題文の修正 | applied | expected_text | The Shinkansen is the fastest in Japan. | This chair is the oldest in my room. |  |
| 302 | 2-33-2-1 | 問題文の修正 | applied | question_text | Talking about animals. | Talking about animals in Ueno zoo. |  |
| 302 | 2-33-2-1 | 問題文の修正 | applied | expected_text | What animal is the strongest? | Which animal is the strongest in Ueno Zoo? |  |
| 304 | 2-33-2-1 | 問題文の修正 | applied | question_text | Talking about animals in Ueno zoo. | Talking about your country. |  |
| 304 | 2-33-2-1 | 問題文の修正 | applied | expected_text | Which animal is the strongest in Ueno Zoo? | Which city is the biggest in your country? |  |
| 305 | 2-33-2-7 | 問題文の修正 | applied | question_text | Talking about the world. | Talking about Egypt. Which building is the oldest in Egypt? |  |
| 306 | 2-33-2-8 | 問題文の修正 | applied | question_text | Talking about the world. | Talking about Europe. Which country is the largest in Europe? |  |
| 307 | 2-34-1-1 | 問題文の修正 | applied | question_text | Is today busier than yesterday? | Is Russia larger than Canada? Yes, Russia is larger than Canada. |  |
| 308 | 2-34-1-8 | 問題文の修正 | applied | question_text | Is Bob taller than Ben? | Is your cat fatter than my cat? Yes, my cat is fatter than your cat. |  |
| 309 | 2-34-2-3 | 問題文の修正 | applied | question_text | What is the busiest day of the week for you? | Which day of the week is the busiest for you? |  |
| 310 | 2-34-2-5 | 問題文の修正 | applied | question_text | What is the biggest animal in the zoo? | Which animal is the biggest in Ueno Zoo? |  |
| 310 | 2-34-2-5 | 問題文の修正 | applied | expected_text | The elephant is the biggest animal in the zoo. | The elephant is the biggest animal in Ueno Zoo. | 2文形式(Q?+解答文)と判定して分割 |
| 311 | 2-34-2-7 | 問題文の修正 | applied | question_text | Which country is the biggest in the world? | Which country is the biggest in Europe? |  |
| 311 | 2-34-2-7 | 問題文の修正 | applied | expected_text | Russia is the biggest country in the world. | Russia is the biggest country in Europe. | 2文形式(Q?+解答文)と判定して分割 |
| 312 | 2-34-2-8 | 問題文の修正 | applied | question_text | What is the hottest season in your country? | Which month is hotter, August or September? August is hotter than September. |  |
| 314 | 2-35-1-2 | 問題文の修正 | applied | question_text | Which day is more important, Christmas or New Year in Japan? | In Japan, which day is more important, Christmas or New Year's Day? |  |
| 314 | 2-35-1-2 | 問題文の修正 | applied | expected_text | New Year is more important than Christmas in Japan. | New Year's Day is more important than Christmas in Japan. |  |
| 318 | 2-35-2-2 | 問題文の修正 | applied | question_text | What is the most useful tool in the box? | Which tool is the most useful in the box? |  |
| 319 | 2-35-2-4 | 問題文の修正 | applied | question_text | What is the most popular subject in your school? | Which subject is the most popular in your school? |  |
| 320 | 2-35-2-5 | 問題文の修正 | applied | question_text | What is the most comfortable place in the house? | Which place is the most comfortable in the house? |  |
| 321 | 2-36-2-3 | 問題文の修正 | applied | question_text | My dog Pochi is as friendly as your dog, John. | My dog Pochi is as friendly as your dog John. My dog Pochi isn't as friendly as your dog John. |  |
| 323 | 2-37-1-3 | 問題文の修正 | applied | question_text | Which mountain is higher, Mt. Fuji or Mt. Kiso Ontake? | Which mountain is higher, Mt. Fuji or Mt. Everest? |  |
| 323 | 2-37-1-3 | 問題文の修正 | applied | expected_text | Mt. Fuji is higher than Mt. Kiso Ontake. | Mt. Everest is higher than Mt. Fuji. |  |
| 325 | 2-37-1-5 | 問題文の修正 | applied | question_text | Which book is better, Harry Potter or Doraemon? | Which is better, Harry Potter or Doraemon? |  |
| 326 | 2-37-2-3 | 問題文の修正 | applied | question_text | What is the most difficult subject for Ken? | Which subject is the most difficult for Ken? |  |
| 327 | 2-37-2-4 | 問題文の修正 | applied | question_text | Who is the most famous singer in Japan, Hikaru Utada or Kenshi Yonezu? | Who is the most famous singer in Japan? |  |
| 327 | 2-37-2-4 | 問題文の修正 | already_ok | expected_text | Kenshi Yonezu is the most famous singer in Japan. | Kenshi Yonezu is the most famous singer in Japan. | 2文形式(Q?+解答文)と判定して分割 |
| 328 | 2-38-1-4 | 問題文の修正 | applied | question_text | My mother hit the ball. | He painted the wall. The wall was painted by him. |  |
| 329 | 2-38-1-6 | 問題文の修正 | applied | question_text | The teacher cut the paper. | My mother cooked the dinner. The dinner was cooked by my mother. |  |
| 330 | 2-38-1-7 | 問題文の修正 | applied | question_text | The chef set the table. | She invited her friends. Her friends were invited by her. |  |
| 331 | 2-38-2-2 | 問題文の修正 | applied | question_text | She read the book last night. | She watched the movie last night. |  |
| 331 | 2-38-2-2 | 問題文の修正 | applied | expected_text | The book was read by her last night. | The movie was watched by her last night. |  |
| 332 | 2-38-2-3 | 問題文の修正 | applied | question_text | He saw my uncle yesterday. | He visited my uncle yesterday. |  |
| 332 | 2-38-2-3 | 問題文の修正 | applied | expected_text | My uncle was seen by him yesterday. | My uncle was visited by him yesterday. |  |
| 333 | 2-38-2-5 | 問題文の修正 | applied | question_text | Michael shot the ball into the goal. | Michael kicked the ball. |  |
| 333 | 2-38-2-5 | 問題文の修正 | applied | expected_text | The ball was shot into the goal by Michael. | The ball was kicked by Michael. |  |
| 334 | 2-38-2-6 | 問題文の修正 | applied | question_text | He put the book on the desk. | He washed the dishes. |  |
| 334 | 2-38-2-6 | 問題文の修正 | applied | expected_text | The book was put on the desk by him. | The dishes were washed by him. |  |
| 335 | 2-38-2-8 | 問題文の修正 | applied | question_text | The boy kept the door open. | The boy painted the door. |  |
| 335 | 2-38-2-8 | 問題文の修正 | applied | expected_text | The door was kept open by the boy. | The door was painted by the boy. |  |
| 336 | 2-39-1-3 | 問題文の修正 | applied | question_text | She gave me a present. | She broke the cup. |  |
| 336 | 2-39-1-3 | 問題文の修正 | applied | expected_text | I was given a present by her. | The cup was broken by her. |  |
| 337 | 2-39-1-7 | 問題文の修正 | applied | question_text | Many people know the story. | Many people knew the story. |  |
| 337 | 2-39-1-7 | 問題文の修正 | applied | expected_text | The story is known by many people. | The story was known by many people. |  |
| 338 | 2-39-2-2 | 問題文の修正 | applied | question_text | The chef cooked the meal. | The teacher answered the question. |  |
| 338 | 2-39-2-2 | 問題文の修正 | applied | expected_text | The meal was cooked by the chef. | The question was answered by the teacher. |  |
| 339 | 2-39-2-6 | 問題文の修正 | applied | question_text | The police caught the thief. | The artist painted the picture. |  |
| 339 | 2-39-2-6 | 問題文の修正 | applied | expected_text | The thief was caught by the police. | The picture was painted by the artist. |  |
| 340 | 2-40-1-3 | 問題文の修正 | applied | question_text | I was given a present by her. | The cup was broken by her. |  |
| 340 | 2-40-1-3 | 問題文の修正 | applied | expected_text | Was I given a present by her? | Was the cup broken by her? |  |
| 341 | 2-41-1-3 | 問題文の修正 | applied | question_text | What was written by Natsume Soseki? | What is grown in Hokkaido? |  |
| 341 | 2-41-1-3 | 問題文の修正 | applied | expected_text | Bocchan was written by Natsume Soseki. | Potatoes are grown in Hokkaido. |  |
| 343 | 2-41-1-5 | 問題文の修正 | applied | question_text | What was painted by Leonardo da Vinci? | What was broken by the strong wind? The window was broken by the strong wind. |  |
| 345 | 2-41-1-8 | 問題文の修正 | applied | question_text | What is sold at that shop? | What is taught in this class? |  |
| 345 | 2-41-1-8 | 問題文の修正 | applied | expected_text | Books are sold at that shop. | Math is taught in this class. |  |
| 349 | 2-41-2-8 | 問題文の修正 | applied | question_text | What is read by many students? | What is studied by many students? |  |
| 349 | 2-41-2-8 | 問題文の修正 | applied | expected_text | This book is read by many students. | English is studied by many students. |  |
| 351 | 2-43-2-5 | 問題文の修正 | applied | question_text | How long has he been sick? | How long has he been tired? |  |
| 351 | 2-43-2-5 | 問題文の修正 | applied | expected_text | He has been sick since Friday. | He has been tired for three days. |  |
| 353 | 2-43-2-6 | 問題文の修正 | applied | question_text | How long has she been busy? | How long has she been free? |  |
| 353 | 2-43-2-6 | 問題文の修正 | applied | expected_text | She has been busy since yesterday. | She has been free for two hours. |  |
| 355 | 2-44-1-5 | 問題文の修正 | applied | question_text | He has waited here for 20 minutes. | He has been hungry since this morning. |  |
| 355 | 2-44-1-5 | 問題文の修正 | applied | expected_text | He hasn't waited here for 20 minutes. | He hasn't been hungry since this morning. |  |
| 356 | 2-44-2-3 | 問題文の修正 | applied | question_text | I have been in bed since last night. | You have been in bed since last night. |  |
| 357 | 2-44-2-6 | 問題文の修正 | applied | question_text | I have stayed in this hotel for two nights. | You have stayed in this hotel for two nights. |  |
| 358 | 2-44-2-8 | 問題文の修正 | applied | question_text | They have lived in Osaka since 2020. | They have known each other for ten years. |  |
| 358 | 2-44-2-8 | 問題文の修正 | applied | expected_text | Have they lived in Osaka since 2020? | Have they known each other for ten years? |  |
| 359 | 2-44-3-8 | 問題文の修正 | applied | question_text | He studies Japanese. | He works at this company. How long has he worked at this company? |  |
| 360 | 2-45-1-3 | 問題文の修正 | applied | question_text | He finished his homework last night. | He climbed Mt. Fuji last summer. |  |
| 360 | 2-45-1-3 | 問題文の修正 | applied | expected_text | He has finished his homework once. | He has climbed Mt. Fuji once. |  |
| 361 | 2-45-2-7 | 問題文の修正 | applied | question_text | We went to the park yesterday. | We went to Disneyland last month. |  |
| 361 | 2-45-2-7 | 問題文の修正 | applied | expected_text | We have been to the park four times. | We have been to Disneyland four times. |  |
| 362 | 2-47-2-3 | 問題文の修正 | applied | question_text | Have you fed a dog yet? | Have you fed the dog yet? |  |
| 362 | 2-47-2-3 | 問題文の修正 | applied | expected_text | I haven’t fed a dog yet. | I haven't fed the dog yet. |  |
| 363 | 2-47-2-4 | 問題文の修正 | applied | question_text | Have you seen a shooting star yet? | Have you finished your homework yet? |  |
| 363 | 2-47-2-4 | 問題文の修正 | applied | expected_text | I haven’t seen a shooting star yet. | I haven't finished my homework yet. |  |
| 364 | 2-47-2-5 | 問題文の修正 | applied | question_text | Have you broken a cup yet? | Have you washed the dishes yet? I haven't washed the dishes yet. |  |
| 365 | 3-2-2-2 | 問題文の修正 | applied | question_text | Taro bought a new bag. | You play soccer every day. |  |
| 365 | 3-2-2-2 | 問題文の修正 | applied | expected_text | Did he buy a new bag? | Do you play soccer every day? |  |
| 366 | 3-2-2-3 | 問題文の修正 | applied | question_text | My mother opened the window. | They study English after school. |  |
| 366 | 3-2-2-3 | 問題文の修正 | applied | expected_text | Did she open the window? | Do they study English after school? |  |
| 367 | 3-2-2-7 | 問題文の修正 | applied | question_text | You play soccer every day. | My mother opened the window. |  |
| 367 | 3-2-2-7 | 問題文の修正 | applied | expected_text | Do you play soccer every day? | Did she open the window? |  |
| 368 | 3-2-2-8 | 問題文の修正 | applied | question_text | They study English after school. | Taro bought a new bag. |  |
| 368 | 3-2-2-8 | 問題文の修正 | applied | expected_text | Do they study English after school? | Did he buy a new bag? |  |
| 371 | 3-3-2-1 | 問題文の修正 | applied | question_text | What do you want to cook today? | What do you like to do on weekends? I like to play the piano on weekends. |  |
| 372 | 3-3-2-7 | 問題文の修正 | applied | question_text | What do you want to study next month? | What did they plan to study last night? They planned to study science last night. |  |
| 373 | 3-3-2-8 | 問題文の修正 | applied | question_text | What does he want to eat for dinner? | What did he hope to become? He hoped to become a doctor. |  |
| 375 | 3-4-1-3 | 問題文の修正 | applied | question_text | The carpenter built the table. | My father built the tables. The tables were built by my father. |  |
| 376 | 3-5-1-4 | 問題文の修正 | applied | question_text | Tom cleaned the classroom. | Emi took these pictures. These pictures were taken by Emi. |  |
| 377 | 3-5-1-5 | 問題文の修正 | applied | question_text | Picasso painted this painting. | Mary ate the cake. The cake was eaten by Mary. |  |
| 378 | 3-5-1-8 | 問題文の修正 | applied | question_text | Thomas Edison invented the light bulb. | The boys broke the windows. The windows were broken by the boys. |  |
| 379 | 3-6-1-4 | 問題文の修正 | applied | question_text | The classroom was cleaned by Tom. | These pictures were taken by Emi. These pictures were not taken by Emi. |  |
| 380 | 3-6-1-5 | 問題文の修正 | applied | question_text | This painting was painted by Picasso. | The cake was eaten by Mary. The cake was not eaten by Mary. |  |
| 381 | 3-6-1-8 | 問題文の修正 | applied | question_text | The light bulb was invented by Thomas Edison. | The windows were broken by the boys. The windows were not broken by the boys. |  |
| 382 | 3-6-2-4 | 問題文の修正 | applied | question_text | This painting was painted by Picasso. | These pictures were taken by Emi. Were these pictures taken by Emi? |  |
| 383 | 3-6-2-5 | 問題文の修正 | applied | question_text | The letter was sent by my friend. | The cake was eaten by Mary. Was the cake eaten by Mary? |  |
| 384 | 3-6-2-6 | 問題文の修正 | applied | question_text | Apple was founded by Steve Jobs. | The windows were broken by the boys. Were the windows broken by the boys? |  |
| 385 | 3-7-2-4 | 問題文の修正 | applied | question_text | They knew each other for ten years. | They worked together for ten years. They have worked together for ten years. |  |
| 386 | 3-8-1-4 | 問題文の修正 | applied | question_text | We were excited yesterday. | We were hungry yesterday. |  |
| 386 | 3-8-1-4 | 問題文の修正 | applied | expected_text | We have been excited since yesterday. | We have been hungry since yesterday. |  |
| 387 | 3-8-1-6 | 問題文の修正 | applied | question_text | My brother was sleepy yesterday. | Tom was busy yesterday. |  |
| 387 | 3-8-1-6 | 問題文の修正 | applied | expected_text | My brother has been sleepy since yesterday. | Tom has been busy since yesterday. |  |
| 388 | 3-8-1-8 | 問題文の修正 | applied | question_text | Our teacher was kind yesterday. | Our teacher was angry yesterday. |  |
| 388 | 3-8-1-8 | 問題文の修正 | applied | expected_text | Our teacher has been kind since yesterday. | Our teacher has been angry since yesterday. |  |
| 397 | 3-9-2-5 | 問題文の修正 | applied | question_text | I have written a letter to my friend. | I have written a letter to my grandmother. Have you written a letter to your grandmother? |  |
| 398 | 3-9-2-6 | 問題文の修正 | applied | question_text | I have spoken English this week. | I have seen this movie. |  |
| 398 | 3-9-2-6 | 問題文の修正 | applied | expected_text | Have you spoken English this week? | Have you seen this movie? |  |
| 399 | 3-9-2-7 | 問題文の修正 | applied | question_text | I have taken some photos today. | I have used this computer for two years.Have you used this computer for two years? |  |
| 400 | 3-9-2-8 | 問題文の修正 | applied | question_text | I have gone to the library recently. | I have practiced soccer since elementary school.Have you practiced soccer since elementary school? |  |
| 401 | 3-9-3-1 | 問題文の修正 | applied | question_text | I have studied English. | You have studied English. How long have you studied English? |  |
| 402 | 3-9-3-5 | 問題文の修正 | applied | question_text | I have had this bike. | You have had this bike. How long have you had this bike? |  |
| 403 | 3-9-3-6 | 問題文の修正 | applied | question_text | She has practiced piano. | She has taught math.How long has she taught math? |  |
| 404 | 3-9-3-7 | 問題文の修正 | applied | question_text | We have waited here. | They have waited here. How long have they waited here? |  |
| 405 | 3-9-3-8 | 問題文の修正 | applied | question_text | My dog has been sick. | My dog has been sick. How long has my dog been sick? |  |
| 416 | 3-13-2-3 | 問題文の修正 | applied | question_text | He climbed Mt. Fuji in 2020. | He met a famous singer in 2022. |  |
| 416 | 3-13-2-3 | 問題文の修正 | applied | expected_text | He has climbed Mt. Fuji once. | He has met a famous singer once. |  |
| 417 | 3-13-2-8 | 問題文の修正 | applied | question_text | She cooked pasta on Sunday. | She swam in the ocean last summer. |  |
| 417 | 3-13-2-8 | 問題文の修正 | applied | expected_text | She has cooked pasta several times. | She has swum in the ocean several times. |  |
| 418 | 3-13-3-4 | 問題文の修正 | applied | question_text | He arrived at the station. | I wrote a letter to my grandmother. |  |
| 418 | 3-13-3-4 | 問題文の修正 | applied | expected_text | He has already arrived at the station. | I have already written a letter to my grandmother. |  |
| 419 | 3-13-3-5 | 問題文の修正 | applied | question_text | They cleaned the classroom. | I broke my favorite coffee cup. |  |
| 419 | 3-13-3-5 | 問題文の修正 | applied | expected_text | They have just cleaned the classroom. | I have just broken my favorite coffee cup. |  |
| 420 | 3-13-3-6 | 問題文の修正 | applied | question_text | I got home. | He spoke with his friends. |  |
| 420 | 3-13-3-6 | 問題文の修正 | applied | expected_text | I have just got home. | He has just spoken with his friends. |  |
| 421 | 3-13-3-7 | 問題文の修正 | applied | question_text | She washed the dishes. | I got home. |  |
| 421 | 3-13-3-7 | 問題文の修正 | applied | expected_text | She has just washed the dishes. | I have just gotten home. |  |
| 424 | 3-14-2-2 | 問題文の修正 | applied | question_text | We wait for the bus. | You wait for the bus. How long have you been waiting for the bus? |  |
| 425 | 3-14-2-3 | 問題文の修正 | applied | question_text | My father wears this jacket. | My father wears this jacket. How long has he been wearing this jacket? |  |
| 426 | 3-14-2-8 | 問題文の修正 | applied | question_text | My mother tastes the soup. | My mother makes soup. |  |
| 426 | 3-14-2-8 | 問題文の修正 | applied | expected_text | How long has she been tasting the soup? | How long has she been making soup? |  |
| 428 | 3-15-1-1 | 問題文の修正 | applied | question_text | What is fun? | What is fun to do? |  |
| 428 | 3-15-1-1 | 問題文の修正 | already_ok | expected_text | It's fun to swim in the pool. | It's fun to swim in the pool. | 2文形式(Q?+解答文)と判定して分割 |
| 429 | 3-15-1-2 | 問題文の修正 | applied | question_text | What is important? | What is important to do? |  |
| 429 | 3-15-1-2 | 問題文の修正 | applied | expected_text | It’s important to eat breakfast every day. | It's important to eat breakfast every day. | 2文形式(Q?+解答文)と判定して分割 |
| 430 | 3-15-1-3 | 問題文の修正 | applied | question_text | What is exciting? | What is exciting to do? |  |
| 430 | 3-15-1-3 | 問題文の修正 | applied | expected_text | It’s exciting to visit a new country. | It's exciting to visit a new country. | 2文形式(Q?+解答文)と判定して分割 |
| 431 | 3-15-1-4 | 問題文の修正 | applied | question_text | What is hard? | What is hard to do? |  |
| 431 | 3-15-1-4 | 問題文の修正 | applied | expected_text | It’s hard to wake up early in winter. | It's hard to wake up early in winter. | 2文形式(Q?+解答文)と判定して分割 |
| 432 | 3-15-1-5 | 問題文の修正 | applied | question_text | What is helpful? | What is helpful to do? |  |
| 432 | 3-15-1-5 | 問題文の修正 | applied | expected_text | It’s helpful to clean my room every day. | It's helpful to clean my room every day. | 2文形式(Q?+解答文)と判定して分割 |
| 433 | 3-15-1-6 | 問題文の修正 | applied | question_text | What is dangerous? | What is dangerous to do? |  |
| 433 | 3-15-1-6 | 問題文の修正 | applied | expected_text | It’s dangerous to run on the road. | It's dangerous to run on the road. | 2文形式(Q?+解答文)と判定して分割 |
| 434 | 3-15-1-7 | 問題文の修正 | applied | question_text | What is nice? | What is nice to do? |  |
| 434 | 3-15-1-7 | 問題文の修正 | applied | expected_text | It’s nice to listen to music after school. | It's nice to listen to music after school. | 2文形式(Q?+解答文)と判定して分割 |
| 435 | 3-15-1-8 | 問題文の修正 | applied | question_text | What is useful? | What is useful to do? |  |
| 435 | 3-15-1-8 | 問題文の修正 | applied | expected_text | It’s useful to learn another language. | It's useful to learn another language. | 2文形式(Q?+解答文)と判定して分割 |
| 437 | 3-15-2-1 | 問題文の修正 | applied | question_text | What is easy for you? | What is easy for you to do? |  |
| 437 | 3-15-2-1 | 問題文の修正 | applied | expected_text | It’s easy for me to cook pasta. | It's easy for me to cook pasta. | 2文形式(Q?+解答文)と判定して分割 |
| 438 | 3-15-2-2 | 問題文の修正 | applied | question_text | What is difficult for him? | What is difficult for him to do? |  |
| 438 | 3-15-2-2 | 問題文の修正 | applied | expected_text | It’s difficult for him to finish the homework. | It's difficult for him to finish the homework. | 2文形式(Q?+解答文)と判定して分割 |
| 439 | 3-15-2-3 | 問題文の修正 | applied | question_text | What is important for us? | What is important for us to do? |  |
| 439 | 3-15-2-3 | 問題文の修正 | applied | expected_text | It’s important for us to practice every day. | It's important for us to practice every day. | 2文形式(Q?+解答文)と判定して分割 |
| 440 | 3-15-2-4 | 問題文の修正 | applied | question_text | What is exciting for them? | What is exciting for them to do? |  |
| 440 | 3-15-2-4 | 問題文の修正 | applied | expected_text | It’s exciting for them to join the soccer team. | It's exciting for them to join the soccer team. | 2文形式(Q?+解答文)と判定して分割 |
| 441 | 3-15-2-5 | 問題文の修正 | applied | question_text | What is dangerous for you? | What is dangerous for you to do? |  |
| 441 | 3-15-2-5 | 問題文の修正 | applied | expected_text | It’s dangerous for me to skateboard. | It's dangerous for me to ride a skateboard. | 2文形式(Q?+解答文)と判定して分割 |
| 442 | 3-15-2-6 | 問題文の修正 | applied | question_text | What is fun for your sister? | What is fun for your sister to do? |  |
| 442 | 3-15-2-6 | 問題文の修正 | applied | expected_text | It’s fun for my sister to play the piano. | It's fun for my sister to play the piano. | 2文形式(Q?+解答文)と判定して分割 |
| 443 | 3-15-2-7 | 問題文の修正 | applied | question_text | What is hard for you? | What is hard for you to do? |  |
| 443 | 3-15-2-7 | 問題文の修正 | applied | expected_text | It’s hard for me to wake up early on Sundays. | It's hard for me to wake up early on Sundays. | 2文形式(Q?+解答文)と判定して分割 |
| 444 | 3-15-2-8 | 問題文の修正 | applied | question_text | What is helpful for your brother? | What is helpful for your brother to do? |  |
| 444 | 3-15-2-8 | 問題文の修正 | applied | expected_text | It’s helpful for my brother to study with friends. | It's helpful for my brother to study with friends. | 2文形式(Q?+解答文)と判定して分割 |
| 464 | 3-17-1-8 | 問題文の修正 | already_ok | question_text | Do you want that jacket? | Do you want that jacket? |  |
| 464 | 3-17-1-8 | 問題文の修正 | already_ok | expected_text | Would you like that jacket? | Would you like that jacket? | 2文形式(Q?+解答文)と判定して分割 |
| 466 | 3-17-2-1 | 問題文の修正 | applied | question_text | Do you want to hear this song? | Do you want to look after my dog? |  |
| 466 | 3-17-2-1 | 問題文の修正 | applied | expected_text | Would you like to hear this song? | Would you like to look after my dog? |  |
| 467 | 3-17-2-2 | 問題文の修正 | applied | question_text | Do you want to get a new bag? | Do you want to take a walk in the park? |  |
| 467 | 3-17-2-2 | 問題文の修正 | applied | expected_text | Would you like to get a new bag? | Would you like to take a walk in the park? |  |
| 468 | 3-17-2-3 | 問題文の修正 | applied | question_text | Do you want to see the movie? | Do you want to go on a trip to Kyoto? |  |
| 468 | 3-17-2-3 | 問題文の修正 | applied | expected_text | Would you like to see the movie? | Would you like to go on a trip to Kyoto? |  |
| 469 | 3-17-2-4 | 問題文の修正 | applied | question_text | Do you want to bring your notebook? | Do you want to pick up the children? |  |
| 469 | 3-17-2-4 | 問題文の修正 | applied | expected_text | Would you like to bring your notebook? | Would you like to pick up the children? |  |
| 470 | 3-17-2-5 | 問題文の修正 | applied | question_text | Do you want to begin the lesson? | Do you want to turn down the TV? |  |
| 470 | 3-17-2-5 | 問題文の修正 | applied | expected_text | Would you like to begin the lesson? | Would you like to turn down the TV? |  |
| 471 | 3-17-2-6 | 問題文の修正 | applied | question_text | Do you want to try this game? | Do you want to take off your jacket? |  |
| 471 | 3-17-2-6 | 問題文の修正 | applied | expected_text | Would you like to try this game? | Would you like to take off your jacket? |  |
| 472 | 3-17-2-7 | 問題文の修正 | applied | question_text | Do you want to lend me your pen? | Do you want to throw away these papers? |  |
| 472 | 3-17-2-7 | 問題文の修正 | applied | expected_text | Would you like to lend me your pen? | Would you like to throw away these papers? |  |
| 473 | 3-17-2-8 | 問題文の修正 | applied | question_text | Do you want to win the race? | Do you want to talk on the telephone now? |  |
| 473 | 3-17-2-8 | 問題文の修正 | applied | expected_text | Would you like to win the race? | Would you like to talk on the telephone now? |  |
| 475 | 3-18-1-6 | 問題文の修正 | applied | question_text | What do you want Mary to do? | What do you want him to do? |  |
| 475 | 3-18-1-6 | 問題文の修正 | applied | expected_text | I want her to clean my room. | I want him to clean my room. |  |
| 476 | 3-18-1-7 | 問題文の修正 | applied | question_text | What do you want my mother to do? | What do you want them to do? |  |
| 476 | 3-18-1-7 | 問題文の修正 | applied | expected_text | I want her to call me. | I want them to call me. |  |
| 477 | 3-18-1-8 | 問題文の修正 | applied | question_text | What do you want my sister to do? | What do you want her to do? |  |
| 477 | 3-18-1-8 | 問題文の修正 | already_ok | expected_text | I want her to go shopping with me. | I want her to go shopping with me. |  |
| 480 | 3-19-1-3 | 問題文の修正 | applied | question_text | What did the teacher tell Tom? | What did Mary tell Tom? |  |
| 480 | 3-19-1-3 | 問題文の修正 | applied | expected_text | He told him to come early tomorrow. | She told him to come early tomorrow. | 2文形式(Q?+解答文)と判定して分割 |
| 481 | 3-19-1-7 | 問題文の修正 | applied | question_text | What did you ask Yuki? | What did you ask Yuka? |  |
| 481 | 3-19-1-7 | 問題文の修正 | already_ok | expected_text | I asked her to bring her notebook. | I asked her to bring her notebook. |  |
| 483 | 3-20-1-1 | 問題文の修正 | applied | question_text | I tell him. | I'll tell him the news. |  |
| 483 | 3-20-1-1 | 問題文の修正 | applied | expected_text | Let me tell him. | Let me tell him the news. |  |
| 484 | 3-20-1-2 | 問題文の修正 | applied | question_text | I teach her. | I'll show you my pictures. |  |
| 484 | 3-20-1-2 | 問題文の修正 | applied | expected_text | Let me teach her. | Let me show you my pictures. |  |
| 485 | 3-20-1-3 | 問題文の修正 | applied | question_text | I tell them. | I'll carry your bag. |  |
| 485 | 3-20-1-3 | 問題文の修正 | applied | expected_text | Let me tell them. | Let me carry your bag. |  |
| 486 | 3-20-1-4 | 問題文の修正 | applied | question_text | I help us. | I'll help you with your homework. |  |
| 486 | 3-20-1-4 | 問題文の修正 | applied | expected_text | Let me help us. | Let me help you with your homework. |  |
| 487 | 3-20-1-5 | 問題文の修正 | applied | question_text | I ask him. | I'll answer the question. |  |
| 487 | 3-20-1-5 | 問題文の修正 | applied | expected_text | Let me ask him. | Let me answer the question. |  |
| 488 | 3-20-1-6 | 問題文の修正 | applied | question_text | I teach the students. | I'll try this game. |  |
| 488 | 3-20-1-6 | 問題文の修正 | applied | expected_text | Let me teach the students. | Let me try this game. |  |
| 489 | 3-20-1-7 | 問題文の修正 | applied | question_text | I help her. | I'll introduce my friend. |  |
| 489 | 3-20-1-7 | 問題文の修正 | applied | expected_text | Let me help her. | Let me introduce my friend. |  |
| 490 | 3-20-1-8 | 問題文の修正 | applied | question_text | I ask my friend. | I'll explain the rule. |  |
| 490 | 3-20-1-8 | 問題文の修正 | applied | expected_text | Let me ask my friend. | Let me explain the rule. |  |
| 492 | 3-20-2-2 | 問題文の修正 | applied | question_text | What do you help her do? | What do you help your brother do? |  |
| 492 | 3-20-2-2 | 問題文の修正 | applied | expected_text | I help her cook lunch. | I help him cook lunch. |  |
| 493 | 3-20-2-4 | 問題文の修正 | applied | question_text | What did you help him do? | What did you help Emma do? |  |
| 493 | 3-20-2-4 | 問題文の修正 | applied | expected_text | I helped him do his homework. | I helped her do her homework. |  |
| 494 | 3-20-2-6 | 問題文の修正 | applied | question_text | What does it make you do? | What does the movie make you do? |  |
| 494 | 3-20-2-6 | 問題文の修正 | already_ok | expected_text | It makes me cry. | It makes me cry. |  |
| 495 | 3-20-2-8 | 問題文の修正 | applied | question_text | What did she make you do? | What did your father make you do? |  |
| 495 | 3-20-2-8 | 問題文の修正 | applied | expected_text | She made me study hard. | He made me study hard. |  |
| 497 | 3-21-1-1 | 問題文の修正 | already_ok | question_text | What did she name her baby? | What did she name her baby? |  |
| 497 | 3-21-1-1 | 問題文の修正 | applied | expected_text | She named her baby Saki. | She named her Rin. |  |
| 499 | 3-21-1-2 | 問題文の修正 | already_ok | question_text | What did they name their dog? | What did they name their dog? |  |
| 499 | 3-21-1-2 | 問題文の修正 | applied | expected_text | They named their dog Jon. | They named it Lucky. |  |
| 501 | 3-21-1-4 | 問題文の修正 | already_ok | question_text | What did you name your cat? | What did you name your cat? |  |
| 501 | 3-21-1-4 | 問題文の修正 | applied | expected_text | I named my cat Momo. | I named it Momo. |  |
| 502 | 3-21-1-7 | 問題文の修正 | already_ok | question_text | What do you call that cat? | What do you call that cat? |  |
| 502 | 3-21-1-7 | 問題文の修正 | applied | expected_text | We call it Momo. | I call it Tama. |  |
| 504 | 3-21-1-8 | 問題文の修正 | applied | question_text | What do you call your team leader? | What do we call it in Japan? |  |
| 504 | 3-21-1-8 | 問題文の修正 | applied | expected_text | We call him Captain. | We call it Sushi. |  |
| 507 | 3-21-2-3 | 問題文の修正 | applied | question_text | How does your new classroom make you feel? | How does losing a game make you feel? |  |
| 507 | 3-21-2-3 | 問題文の修正 | applied | expected_text | It makes me comfortable. | It makes me sad. |  |
| 509 | 3-21-2-4 | 問題文の修正 | applied | question_text | How does he make you feel? | How does a long speech make you feel? |  |
| 509 | 3-21-2-4 | 問題文の修正 | applied | expected_text | He makes me laugh. | It makes me bored. |  |
| 511 | 3-21-2-6 | 問題文の修正 | applied | question_text | How does she make you feel? | How does a horror story make you feel? |  |
| 511 | 3-21-2-6 | 問題文の修正 | applied | expected_text | She makes me safe. | It makes me afraid. |  |
| 514 | 3-22-1-4 | 問題文の修正 | already_ok | question_text | What did she tell you? | What did she tell you? |  |
| 514 | 3-22-1-4 | 問題文の修正 | applied | expected_text | She told me that she lost her wallet. | She told me that she had lost her wallet. | 2文形式(Q?+解答文)と判定して分割 |
| 517 | 3-22-2-2 | 問題文の修正 | applied | question_text | What did he show you? | What did he show you? He showed me that I was good at math. |  |
| 519 | 3-22-2-5 | 問題文の修正 | already_ok | question_text | What did he show you? | What did he show you? |  |
| 519 | 3-22-2-5 | 問題文の修正 | applied | expected_text | He showed me that it's important. | He showed me that the answer was correct. |  |
| 521 | 3-23-1-6 | 問題文の修正 | applied | question_text | How old is Mary's sister? | How does he go to school? |  |
| 521 | 3-23-1-6 | 問題文の修正 | applied | expected_text | I don't know how old her sister is. | I don't know how he goes to school. |  |
| 522 | 3-23-1-7 | 問題文の修正 | applied | question_text | What is in the box? | Why did she leave early? |  |
| 522 | 3-23-1-7 | 問題文の修正 | applied | expected_text | I don't know what is in the box. | I don't know why she left early. |  |
| 523 | 3-23-1-8 | 問題文の修正 | applied | question_text | Why is he angry? | When will the train arrive? |  |
| 523 | 3-23-1-8 | 問題文の修正 | applied | expected_text | I don't know why he is angry. | I don't know when the train will arrive. |  |
| 524 | 3-23-2-6 | 問題文の修正 | applied | question_text | What is in his bag? | What is his name? |  |
| 524 | 3-23-2-6 | 問題文の修正 | applied | expected_text | Do you know what is in his bag? | Do you know what his name is? |  |
| 534 | 3-24-2-3 | 問題文の修正 | applied | question_text | What country did you learn about? | What is this book about? |  |
| 534 | 3-24-2-3 | 問題文の修正 | applied | expected_text | I learned about Japan. | This is a book about Japan. |  |
| 535 | 3-24-2-4 | 問題文の修正 | already_ok | question_text | What kind of book did you read? | What kind of book did you read? |  |
| 535 | 3-24-2-4 | 問題文の修正 | applied | expected_text | I read a book about the history. | I read a book about history. |  |
| 536 | 3-24-2-7 | 問題文の修正 | applied | question_text | Which boy did you see? | Which boy is Tom? |  |
| 536 | 3-24-2-7 | 問題文の修正 | applied | expected_text | I saw a boy with a big backpack. | He is the boy with a big backpack. |  |
| 551 | 3-26-1-5 | 問題文の修正 | already_ok | question_text | He is a boy. | He is a boy. |  |
| 551 | 3-26-1-5 | 問題文の修正 | applied | expected_text | He is a boy injured in the accident. | He is a boy known to everyone. |  |
| 557 | 3-26-2-1 | 問題文の修正 | applied | question_text | We visited a temple. The temple was damaged in the war. | We visited a temple. The temple was built 500 years ago. We visited a temple built 500 years ago. |  |
| 558 | 3-26-2-2 | 問題文の修正 | applied | question_text | I saw a house. The house was destroyed by the fire. | I saw a house. The house was painted white. |  |
| 558 | 3-26-2-2 | 問題文の修正 | applied | expected_text | I saw a house destroyed by the fire. | I saw a house painted white. |  |
| 559 | 3-26-2-3 | 問題文の修正 | applied | question_text | She read a letter. The letter was written in English. | She found a book. The book was written in Japanese. She found a book written in Japanese. |  |
| 560 | 3-26-2-8 | 問題文の修正 | applied | question_text | They saw a picture. The picture was painted with a brush. | They saw a picture. The picture was painted by Picasso. |  |
| 560 | 3-26-2-8 | 問題文の修正 | applied | expected_text | They saw a picture painted with a brush. | They saw a picture painted by Picasso. |  |
| 570 | 3-28-2-5 | 問題文の修正 | applied | question_text | She is a teacher. She teaches science. | They invited a singer. She sang at the party. |  |
| 570 | 3-28-2-5 | 問題文の修正 | applied | expected_text | She is a teacher who teaches science. | They invited a singer who sang at the party. |  |
| 571 | 3-28-2-6 | 問題文の修正 | applied | question_text | He is a singer. He sings in a band. | She remembered a teacher. He taught her in elementary school. |  |
| 571 | 3-28-2-6 | 問題文の修正 | applied | expected_text | He is a singer who sings in a band. | She remembered a teacher who taught her in elementary school. |  |
| 572 | 3-28-2-7 | 問題文の修正 | applied | question_text | She is my sister. She studies at college. | He knew a woman. She lived in Paris. |  |
| 572 | 3-28-2-7 | 問題文の修正 | applied | expected_text | She is my sister who studies at college. | He knew a woman who lived in Paris. |  |
| 573 | 3-29-1-4 | 問題文の修正 | applied | question_text | We saw a house. It was big. | We saw a house. It was very old. |  |
| 573 | 3-29-1-4 | 問題文の修正 | applied | expected_text | We saw a house that was big. | We saw a house that was very old. |  |
| 574 | 3-29-1-5 | 問題文の修正 | applied | question_text | I like a book. It is interesting. | I like books. They are interesting. |  |
| 574 | 3-29-1-5 | 問題文の修正 | applied | expected_text | I like a book that is interesting. | I like books that are interesting. |  |
| 575 | 3-29-1-8 | 問題文の修正 | applied | question_text | He found a box. It was heavy. | He made a cake. It was delicious. |  |
| 575 | 3-29-1-8 | 問題文の修正 | applied | expected_text | He found a box that was heavy. | He made a cake that was delicious. |  |
| 576 | 3-29-2-8 | 問題文の修正 | applied | question_text | She has a phone. It takes great photos. | She found a key. It opens this door. |  |
| 576 | 3-29-2-8 | 問題文の修正 | applied | expected_text | She has a phone that takes great photos. | She found a key that opens this door. |  |
| 579 | 3-31-1-1 | 問題文の修正 | applied | question_text | I watched a movie. The movie was interesting. | He is a boy. He plays soccer. |  |
| 579 | 3-31-1-1 | 問題文の修正 | applied | expected_text | The movie that I watched was interesting. | He is a boy who plays soccer. |  |
| 580 | 3-31-1-2 | 問題文の修正 | applied | question_text | He bought a book. The book was very popular. | She is a girl. She likes music. |  |
| 580 | 3-31-1-2 | 問題文の修正 | applied | expected_text | The book that he bought was very popular. | She is a girl who likes music. |  |
| 581 | 3-31-1-3 | 問題文の修正 | applied | question_text | She has a bag. The bag is very big. | I have a friend. He speaks three languages. |  |
| 581 | 3-31-1-3 | 問題文の修正 | applied | expected_text | The bag that she has is very big. | I have a friend who speaks three languages. |  |
| 582 | 3-31-1-4 | 問題文の修正 | applied | question_text | We visited a city. The city was beautiful. | This is my uncle. He lives in Canada. |  |
| 582 | 3-31-1-4 | 問題文の修正 | applied | expected_text | The city that we visited was beautiful. | This is my uncle who lives in Canada. |  |
| 583 | 3-31-1-5 | 問題文の修正 | applied | question_text | I met a boy. The boy was interesting. | She is a teacher. She teaches science. |  |
| 583 | 3-31-1-5 | 問題文の修正 | applied | expected_text | The boy who I met was interesting. | She is a teacher who teaches science. |  |
| 584 | 3-31-1-6 | 問題文の修正 | applied | question_text | She talked to a girl. The girl was very popular. | He is a singer. He sings in a band. |  |
| 584 | 3-31-1-6 | 問題文の修正 | applied | expected_text | The girl who she talked to was very popular. | He is a singer who sings in a band. |  |
| 585 | 3-31-1-7 | 問題文の修正 | applied | question_text | He has a friend. The friend is very kind. | We met a man. He helped us find the station. |  |
| 585 | 3-31-1-7 | 問題文の修正 | applied | expected_text | The friend who he has is very kind. | We met a man who helped us find the station. |  |
| 586 | 3-31-1-8 | 問題文の修正 | applied | question_text | We visited a teacher. The teacher was famous. | I know a girl. She can play the piano well. |  |
| 586 | 3-31-1-8 | 問題文の修正 | applied | expected_text | The teacher who we visited was famous. | I know a girl who can play the piano well. |  |
| 588 | 3-31-2--1 | 問題文の修正 | applied | question_text | I have a phone. It is very new. | I have a dog. It is very cute. |  |
| 588 | 3-31-2--1 | 問題文の修正 | applied | expected_text | I have a phone that is very new. | I have a dog that is very cute. |  |
| 589 | 3-31-2--2 | 問題文の修正 | applied | question_text | She has a computer. It works fast. | She has a bike. It is new. |  |
| 589 | 3-31-2--2 | 問題文の修正 | applied | expected_text | She has a computer that works fast. | She has a bike that is new. |  |
| 590 | 3-31-2--3 | 問題文の修正 | applied | question_text | I bought a bag. It is very big. | He bought a pen. It was cheap. |  |
| 590 | 3-31-2--3 | 問題文の修正 | applied | expected_text | I bought a bag that is very big. | He bought a pen that was cheap. |  |
| 591 | 3-31-2--4 | 問題文の修正 | applied | question_text | We saw a movie. It was very interesting. | We saw a house. It was very old. |  |
| 591 | 3-31-2--4 | 問題文の修正 | applied | expected_text | We saw a movie that was very interesting. | We saw a house that was very old. |  |
| 592 | 3-31-2--5 | 問題文の修正 | applied | question_text | I have a friend. He is very kind. | They watched a movie. It was exciting. |  |
| 592 | 3-31-2--5 | 問題文の修正 | applied | expected_text | I have a friend who is very kind. | They watched a movie that was exciting. |  |
| 593 | 3-31-2--6 | 問題文の修正 | applied | question_text | She has a sister. She studies English. | He made a robot. It can talk. |  |
| 593 | 3-31-2--6 | 問題文の修正 | applied | expected_text | She has a sister who studies English. | He made a robot that can talk. |  |
| 594 | 3-31-2--7 | 問題文の修正 | applied | question_text | I met a boy. He is very tall. | She bought a phone. It takes beautiful pictures. |  |
| 594 | 3-31-2--7 | 問題文の修正 | applied | expected_text | I met a boy who is very tall. | She bought a phone that takes beautiful pictures. |  |
| 595 | 3-31-2--8 | 問題文の修正 | applied | question_text | We know a teacher. She teaches math. | We visited a museum. It has many old things. |  |
| 595 | 3-31-2--8 | 問題文の修正 | applied | expected_text | We know a teacher who teaches math. | We visited a museum that has many old things. |  |
| 597 | 3-31-3-1 | 問題文の修正 | applied | question_text |  | He painted a picture. The picture is very famous. |  |
| 597 | 3-31-3-1 | 問題文の修正 | applied | expected_text |  | The picture that he painted is very famous. |  |
| 598 | 3-31-3-2 | 問題文の修正 | applied | question_text |  | I played a song. The song was difficult. |  |
| 598 | 3-31-3-2 | 問題文の修正 | applied | expected_text |  | The song that I played was difficult. |  |
| 599 | 3-31-3-3 | 問題文の修正 | applied | question_text |  | She made a cake. The cake was delicious. |  |
| 599 | 3-31-3-3 | 問題文の修正 | applied | expected_text |  | The cake that she made was delicious. |  |
| 600 | 3-31-3-4 | 問題文の修正 | applied | question_text |  | He bought a book. The book was popular. |  |
| 600 | 3-31-3-4 | 問題文の修正 | applied | expected_text |  | The book that he bought was popular. |  |
| 601 | 3-31-3-5 | 問題文の修正 | applied | question_text |  | We visited a city. The city has many tall buildings. |  |
| 601 | 3-31-3-5 | 問題文の修正 | applied | expected_text |  | The city that we visited has many tall buildings. |  |
| 602 | 3-31-3-6 | 問題文の修正 | applied | question_text |  | They found a bag. The bag was full of toys. |  |
| 602 | 3-31-3-6 | 問題文の修正 | applied | expected_text |  | The bag that they found was full of toys. |  |
| 603 | 3-31-3-7 | 問題文の修正 | applied | question_text |  | She took a photo. The photo became popular online. |  |
| 603 | 3-31-3-7 | 問題文の修正 | applied | expected_text |  | The photo that she took became popular online. |  |
| 604 | 3-31-3-8 | 問題文の修正 | applied | question_text |  | I heard a story. The story was true. |  |
| 604 | 3-31-3-8 | 問題文の修正 | applied | expected_text |  | The story that I heard was true. |  |
| 606 | 3-31-4-1 | 問題文の修正 | applied | question_text |  | I read a book. The book was interesting. |  |
| 606 | 3-31-4-1 | 問題文の修正 | applied | expected_text |  | The book I read was interesting. |  |
| 607 | 3-31-4-2 | 問題文の修正 | applied | question_text |  | She met a man. The man was kind. |  |
| 607 | 3-31-4-2 | 問題文の修正 | applied | expected_text |  | The man she met was kind. |  |
| 608 | 3-31-4-3 | 問題文の修正 | applied | question_text |  | They watched a movie. The movie was exciting. |  |
| 608 | 3-31-4-3 | 問題文の修正 | applied | expected_text |  | The movie they watched was exciting. |  |
| 609 | 3-31-4-4 | 問題文の修正 | applied | question_text |  | We visited a temple. The temple was beautiful. |  |
| 609 | 3-31-4-4 | 問題文の修正 | applied | expected_text |  | The temple we visited was beautiful. |  |
| 610 | 3-31-4-5 | 問題文の修正 | applied | question_text |  | He bought a car. The car was expensive. |  |
| 610 | 3-31-4-5 | 問題文の修正 | applied | expected_text |  | The car he bought was expensive. |  |
| 611 | 3-31-4-6 | 問題文の修正 | applied | question_text |  | I saw a painting. The painting was famous. |  |
| 611 | 3-31-4-6 | 問題文の修正 | applied | expected_text |  | The painting I saw was famous. |  |
| 612 | 3-31-4-7 | 問題文の修正 | applied | question_text |  | She wrote a letter. The letter was long. |  |
| 612 | 3-31-4-7 | 問題文の修正 | applied | expected_text |  | The letter she wrote was long. |  |
| 613 | 3-31-4-8 | 問題文の修正 | applied | question_text |  | He took a photo. The photo was beautiful. |  |
| 613 | 3-31-4-8 | 問題文の修正 | applied | expected_text |  | The photo he took was beautiful. |  |
| 614 | 3-33-1-6 | 問題文の修正 | applied | question_text | I see the stars clearly. | I have a dog. |  |
| 614 | 3-33-1-6 | 問題文の修正 | applied | expected_text | I wish I saw the stars clearly. | I wish I had a dog. |  |
| 615 | 3-33-2-3 | 問題文の修正 | already_ok | question_text | She is tall. | She is tall. |  |
| 615 | 3-33-2-3 | 問題文の修正 | applied | expected_text | I wish she were taller. | I wish she were tall. |  |
| 616 | 3-33-2-7 | 問題文の修正 | already_ok | question_text | This room is big. | This room is big. |  |
| 616 | 3-33-2-7 | 問題文の修正 | applied | expected_text | I wish this room were bigger. | I wish this room were big. |  |
| 617 | 3-34-1-8 | 問題文の修正 | applied | question_text | You should try again. | You should drink more water. |  |
| 617 | 3-34-1-8 | 問題文の修正 | applied | expected_text | If I were you, I would try again. | If I were you, I would drink more water. |  |
| 618 | 3-34-2-6 | 問題文の修正 | applied | question_text | I am a dog. | I am a dog. If I were a dog, |  |
| 618 | 3-34-2-6 | 問題文の修正 | applied | expected_text | If I were a dog, I would bark a lot. | I would run fast. |  |
| 621 | 3-35-1-1 | 問題文の修正 | applied | question_text | I should travel many countries. | You should travel to many countries. |  |
| 621 | 3-35-1-1 | 問題文の修正 | already_ok | expected_text | If I were you, I would travel to many countries. | If I were you, I would travel to many countries. |  |
| 622 | 3-35-1-3 | 問題文の修正 | applied | question_text | I should talk to my teacher. | You should talk to the teacher. |  |
| 622 | 3-35-1-3 | 問題文の修正 | applied | expected_text | If I were you, I would talk to my teacher. | If I were you, I would talk to the teacher. |  |
| 150 | 1-32-1-4 | 解答のみ修正 | applied | expected_text | What animal do you like? | What animals do you like? |  |
| 154 | 1-34-1-7 | 解答のみ修正 | applied | expected_text | How are the students after school? | How are they after school? |  |
| 182 | 1-39-1-1 | 解答のみ修正 | applied | expected_text | Don’t cross the road here. | Don't cross the road here. |  |
| 183 | 1-39-1-2 | 解答のみ修正 | applied | expected_text | Don’t swim there. | Don't swim there. |  |
| 184 | 1-39-1-3 | 解答のみ修正 | already_ok | expected_text | Don't eat it now. | Don't eat it now. |  |
| 185 | 1-39-1-4 | 解答のみ修正 | applied | expected_text | Don’t open the box. | Don't open the box. |  |
| 186 | 1-39-1-5 | 解答のみ修正 | applied | expected_text | Don’t be sad. | Don't be sad. |  |
| 187 | 1-39-1-6 | 解答のみ修正 | applied | expected_text | Don’t be late. | Don't be late. |  |
| 188 | 1-39-1-7 | 解答のみ修正 | applied | expected_text | Don’t be angry. | Don't be angry. |  |
| 201 | 1-42-1-5 | 解答のみ修正 | applied | expected_text | They are sitting in the park. | They are sitting in the park now. |  |
| 202 | 1-42-2-6 | 解答のみ修正 | applied | expected_text | He is cutting a vegetable now. | He is cutting vegetables now. |  |
| 204 | 1-43-2-1 | 解答のみ修正 | applied | expected_text | We aren’t playing soccer. | We aren't playing soccer. |  |
| 205 | 1-43-2-2 | 解答のみ修正 | applied | expected_text | He isn’t running in the park. | He isn't running in the park. |  |
| 206 | 1-43-2-3 | 解答のみ修正 | applied | expected_text | She isn’t singing a song. | She isn't singing a song. |  |
| 207 | 1-43-2-4 | 解答のみ修正 | applied | expected_text | They aren’t swimming in the pool. | They aren't swimming in the pool. |  |
| 208 | 1-43-2-5 | 解答のみ修正 | applied | expected_text | I’m not writing a diary. | I'm not writing a diary. |  |
| 209 | 1-43-2-6 | 解答のみ修正 | applied | expected_text | You aren’t playing the guitar. | You aren't playing the guitar. |  |
| 210 | 1-43-2-7 | 解答のみ修正 | applied | expected_text | He isn’t studying English. | He isn't studying English. |  |
| 211 | 1-43-2-8 | 解答のみ修正 | applied | expected_text | We aren’t cooking dinner. | We aren't cooking dinner. |  |
| 221 | 1-45-1-5 | 解答のみ修正 | applied | expected_text | She visited her uncle last week. | Mary visited her uncle last week. |  |
| 222 | 1-45-1-6 | 解答のみ修正 | applied | expected_text | He talked with his friend last Sunday. | Bob talked with his friend last Sunday. |  |
| 223 | 1-45-2-4 | 解答のみ修正 | applied | expected_text | He studied math yesterday. | Tom studied math yesterday. |  |
| 224 | 1-45-2-7 | 解答のみ修正 | applied | expected_text | He visited Kyoto two years ago. | Bob visited Kyoto two years ago. |  |
| 225 | 1-46-1-3 | 解答のみ修正 | applied | expected_text | He came to Japan two weeks ago. | Bob came to Japan two weeks ago. |  |
| 226 | 1-46-1-4 | 解答のみ修正 | applied | expected_text | He lived in Tokyo three years ago. | Mr. Jones lived in Tokyo three years ago. |  |
| 229 | 1-47-1-3 | 解答のみ修正 | applied | expected_text | She didn't visit her uncle last week. | Mary didn't visit her uncle last week. |  |
| 230 | 1-47-1-4 | 解答のみ修正 | applied | expected_text | He didn't talk with his friend last Sunday. | Bob didn't talk with his friend last Sunday. |  |
| 233 | 1-48-1-2 | 解答のみ修正 | applied | expected_text | Did we look at the stars last night? | Did Bob and I look at the stars last night? |  |
| 236 | 1-48-2-1 | 解答のみ修正 | applied | expected_text | Does he wait at the station? | Does Bob wait at the station? |  |
| 240 | 1-49-3-2 | 解答のみ修正 | applied | expected_text | Where did you eat last night? | Where did you eat curry and rice last night? |  |
| 241 | 1-49-3-3 | 解答のみ修正 | applied | expected_text | Where did you play last Sunday? | Where did you play soccer last Sunday? |  |
| 253 | 2-3-1-5 | 解答のみ修正 | applied | expected_text | He helped his friend after school. | My brother helped his friend after school. |  |
| 254 | 2-3-1-8 | 解答のみ修正 | applied | expected_text | It saw a bird in the garden at night. | The cat saw a bird in the garden at night. |  |
| 255 | 2-3-2-1 | 解答のみ修正 | applied | expected_text | They came to our house last week. | My grandparents came to our house last week. |  |
| 256 | 2-3-2-2 | 解答のみ修正 | applied | expected_text | They had a good time at the party last year. | Tom and Mary had a good time at the party last year. |  |
| 257 | 2-3-2-3 | 解答のみ修正 | applied | expected_text | She taught English yesterday. | Mary taught English yesterday. |  |
| 258 | 2-3-2-8 | 解答のみ修正 | applied | expected_text | He was sick last week. | My father was sick last week. |  |
| 259 | 2-4-1-5 | 解答のみ修正 | applied | expected_text | He doesn't help his friend. | My brother doesn't help his friend. |  |
| 260 | 2-5-2-4 | 解答のみ修正 | applied | expected_text | Did he help his friend? | Did my brother help his friend? |  |
| 261 | 2-5-2-5 | 解答のみ修正 | applied | expected_text | Was she sick? | Was my mother sick? |  |
| 262 | 2-5-2-7 | 解答のみ修正 | applied | expected_text | Did they have a good time at the party? | Did Tom and Mary have a good time at the party? |  |
| 263 | 2-7-1-2 | 解答のみ修正 | applied | expected_text | They weren't moving. | The cats weren't moving. |  |
| 264 | 2-7-1-3 | 解答のみ修正 | applied | expected_text | It wasn’t falling down. | The apple wasn't falling down. |  |
| 265 | 2-7-1-6 | 解答のみ修正 | applied | expected_text | She wasn’t baking a cake. | My mother wasn't baking a cake. |  |
| 266 | 2-7-2-5 | 解答のみ修正 | applied | expected_text | Was he checking his homework? | Was Taro checking his homework? |  |
| 267 | 2-7-2-7 | 解答のみ修正 | applied | expected_text | Was she buying a new bag? | Was Mary buying a new bag? |  |
| 268 | 2-7-2-8 | 解答のみ修正 | applied | expected_text | Were they looking at a bird in the park? | Were the children looking at a bird in the park? |  |
| 280 | 2-16-1-3 | 解答のみ修正 | applied | expected_text | We call it a panda. | We call this animal a panda. |  |
| 281 | 2-16-1-4 | 解答のみ修正 | applied | expected_text | He called it Robo. | He called his new robot Robo. |  |
| 282 | 2-17-1-3 | 解答のみ修正 | applied | expected_text | I ate spaghetti when I went there. | I ate spaghetti when I went to the restaurant |  |
| 283 | 2-17-2-3 | 解答のみ修正 | applied | expected_text | They asked their teacher when they didn’t understand it. | They asked their teacher when they didn't understand English |  |
| 284 | 2-17-2-6 | 解答のみ修正 | applied | expected_text | He felt scared when he watched it. | He felt scared when he watched a scary movie. |  |
| 286 | 2-21-1-7 | 解答のみ修正 | applied | expected_text | Will you take a picture of us? | Will you take a picture of me? |  |
| 287 | 2-21-2-2 | 解答のみ修正 | applied | expected_text | Would you play soccer with us? | Would you play soccer with me? |  |
| 288 | 2-23-1-1 | 解答のみ修正 | applied | expected_text | She doesn't have to believe them. | My mother doesn't have to believe them. |  |
| 294 | 2-29-2-7 | 解答のみ修正 | applied | expected_text | I don’t have the energy to study. | They don't have anything to read. |  |
| 316 | 2-35-1-8 | 解答のみ修正 | applied | expected_text | This park is more beautiful than that one. | This one is more beautiful than that one. |  |
| 322 | 2-36-2-6 | 解答のみ修正 | applied | expected_text | Mt. Takao isn't as beautiful as Mt. Fuji . | Mt. Takao isn't as beautiful as Mt. Fuji. |  |
| 347 | 2-41-2-5 | 解答のみ修正 | applied | expected_text | Desks are used at school every day. | Pencils are used at school every day. |  |
| 406 | 3-12-2-1 | 解答のみ修正 | applied | expected_text | I haven’t finished the book yet. | I haven't finished the book yet. |  |
| 407 | 3-12-2-2 | 解答のみ修正 | applied | expected_text | I haven’t washed my clothes yet. | I haven't washed my clothes yet. |  |
| 408 | 3-12-2-3 | 解答のみ修正 | applied | expected_text | I haven’t visited the new café yet. | I haven't visited the new café yet. |  |
| 409 | 3-12-2-4 | 解答のみ修正 | applied | expected_text | I haven’t bought the tickets yet. | I haven't bought the tickets yet. |  |
| 410 | 3-12-2-5 | 解答のみ修正 | applied | expected_text | He hasn’t done the dishes yet. | He hasn't done the dishes yet. |  |
| 411 | 3-12-2-6 | 解答のみ修正 | applied | expected_text | She hasn’t written her diary yet. | She hasn't written her diary yet. |  |
| 412 | 3-12-2-7 | 解答のみ修正 | applied | expected_text | He hasn’t drunk his milk yet. | He hasn't drunk his milk yet. |  |
| 413 | 3-12-2-8 | 解答のみ修正 | applied | expected_text | She hasn’t taken medicine yet. | She hasn't taken medicine yet. |  |
| 446 | 3-16-1-1 | 解答のみ修正 | applied | expected_text | I’d like a pen. | I'd like a pen. |  |
| 447 | 3-16-1-2 | 解答のみ修正 | applied | expected_text | I’d like some water. | I'd like some water. |  |
| 448 | 3-16-1-3 | 解答のみ修正 | applied | expected_text | I’d like a new bag. | I'd like a new bag. |  |
| 449 | 3-16-1-4 | 解答のみ修正 | applied | expected_text | I’d like a cup of tea. | I'd like a cup of tea. |  |
| 450 | 3-16-1-5 | 解答のみ修正 | applied | expected_text | I’d like this book. | I'd like this book. |  |
| 451 | 3-16-1-6 | 解答のみ修正 | applied | expected_text | I’d like some cheese. | I'd like some cheese. |  |
| 452 | 3-16-1-7 | 解答のみ修正 | applied | expected_text | I’d like a hamburger. | I'd like a hamburger. |  |
| 453 | 3-16-1-8 | 解答のみ修正 | applied | expected_text | I’d like that T-shirt. | I'd like that T-shirt. |  |
| 455 | 3-16-2-1 | 解答のみ修正 | applied | expected_text | I’d like to meet you. | I'd like to meet you. |  |
| 456 | 3-16-2-2 | 解答のみ修正 | applied | expected_text | I’d like to buy a new bag. | I'd like to buy a new bag. |  |
| 457 | 3-16-2-3 | 解答のみ修正 | applied | expected_text | I’d like to write a letter. | I'd like to write a letter. |  |
| 458 | 3-16-2-4 | 解答のみ修正 | applied | expected_text | I’d like to help my friend. | I'd like to help my friend. |  |
| 459 | 3-16-2-5 | 解答のみ修正 | applied | expected_text | I’d like to hear the story. | I'd like to hear the story. |  |
| 460 | 3-16-2-6 | 解答のみ修正 | applied | expected_text | I’d like to get a present. | I'd like to get a present. |  |
| 461 | 3-16-2-7 | 解答のみ修正 | applied | expected_text | I’d like to begin my homework. | I'd like to begin my homework. |  |
| 462 | 3-16-2-8 | 解答のみ修正 | applied | expected_text | I’d like to win the game. | I'd like to win the game. |  |
| 526 | 3-24-1-1 | 解答のみ修正 | applied | expected_text | The bag on the chair | The bag on the chair. |  |
| 527 | 3-24-1-2 | 解答のみ修正 | applied | expected_text | The pen under the notebook | The pen under the notebook. |  |
| 528 | 3-24-1-3 | 解答のみ修正 | applied | expected_text | The lunchbox in the fridge | The lunchbox in the fridge. |  |
| 529 | 3-24-1-4 | 解答のみ修正 | applied | expected_text | The hat by the door | The hat by the door. |  |
| 530 | 3-24-1-5 | 解答のみ修正 | applied | expected_text | The phone on the desk | The phone on the desk. |  |
| 531 | 3-24-1-6 | 解答のみ修正 | applied | expected_text | The jacket behind the door | The jacket behind the door. |  |
| 532 | 3-24-1-7 | 解答のみ修正 | applied | expected_text | The folder by the window | The folder by the window. |  |
| 533 | 3-24-1-8 | 解答のみ修正 | applied | expected_text | The tablet on the table | The tablet on the table. |  |
| 539 | 3-25-2-1 | 解答のみ修正 | applied | expected_text | The boy running in the park. | I'm looking for the boy running in the park. |  |
| 540 | 3-25-2-2 | 解答のみ修正 | applied | expected_text | The woman talking with Mr. Brown. | I'm talking about the woman talking with Mr. Brown. |  |
| 541 | 3-25-2-3 | 解答のみ修正 | applied | expected_text | The student reading a book. | I'm waiting for the student reading a book. |  |
| 542 | 3-25-2-4 | 解答のみ修正 | applied | expected_text | The man standing by the door. | I know the man standing by the door. |  |
| 543 | 3-25-2-5 | 解答のみ修正 | applied | expected_text | The girl smiling at us. | I want to sit with the girl smiling at us. |  |
| 544 | 3-25-2-6 | 解答のみ修正 | applied | expected_text | The boy playing soccer. | I'm going to help the boy playing soccer. |  |
| 545 | 3-25-2-7 | 解答のみ修正 | applied | expected_text | The teacher helping the student. | I'm looking for the teacher helping the student. |  |
| 546 | 3-25-2-8 | 解答のみ修正 | applied | expected_text | The girl talking on the phone. | I'm pointing at the girl talking on the phone. |  |
| 4 | 1-2-1-1 | Requirementの修正 | applied | requirement | 例にならい、　「～は、うれしいです。」 ⏎ という文章を作りましょう。 | 例にならい、主語に合う be 動詞を使って、 ⏎ 「~はうれしいです。」という英文を作りましょう。 |  |
| 17 | 1-6-2-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 「～は忙しいです。」 ⏎ という文章を作りましょう。 ⏎  ⏎ ただし主語は短縮形を使うこと。 | 例にならい、 ⏎ 「～は忙しいです。」 ⏎ という文章を作りましょう。 ⏎ ただし「主語+ be動詞」は短縮形を使うこと。 |  |
| 19 | 1-8-1-1 | Requirementの修正 | applied | requirement | 例に習い３人称の文はYes. ⏎ それ以外は No.と答えましょう。 | 例にならい、3人称単数の文は Yes、 ⏎ それ以外は No と答えましょう。 |  |
| 20 | 1-8-2-2 | Requirementの修正 | applied | requirement | 例にならい３人称の文はYes. ⏎ それ以外は No.と答えましょう。 | 例にならい、3人称単数の文は Yes、 ⏎ それ以外は No と答えましょう。 |  |
| 34 | 2001-09-02 00:00:00 | Requirementの修正 | applied | requirement | 例にならい　 ⏎ 「～はテニスをします。」という文章を ⏎ 完成させましょう。 ⏎ ただし、主語は代名詞で答えること。 | 例にならい　 ⏎ 「～はテニスをします。」という文章を ⏎ 完成させましょう。 ⏎ ただし、主語はHe She などの代名詞で答えること。 |  |
| 35 | 1-4-1-1 | Requirementの修正 | applied | requirement | 例にならい、　 ⏎ 「～は背が高い」という文章を作りましょう。 | 例にならい、　 ⏎ 「～背が高い。」という文章を作りましょう。ただし主語はHe,She などの代名詞で答えること。 |  |
| 36 | 1-4-2-1 | Requirementの修正 | applied | requirement | 例にならい、　 ⏎ 「～は強い」という文章を作りましょう。 | 例にならい、　 ⏎ 「～は強い」という文章を作りましょう。ただし主語はHe,She などの代名詞で答えること。へ変更お願いします。 |  |
| 37 | 1-5-1-1 | Requirementの修正 | applied | requirement | 例にならい、【～は台所にいます。】 ⏎ という文章を作りましょう。 | 例にならい、【～は台所にいます。】 ⏎ という文章を作りましょう。ただし主語はHe,She などの代名詞で答えること。 |  |
| 40 | 1-11-1-1 | Requirementの修正 | applied | requirement | go shopping.　またはeat breakfast.を使い、主語に合う文章を考えましょう。 ⏎ また、主語は（He She などの）代名詞で答えること。 | 「go shopping」または「eat breakfast」を使い、主語に合う文章を考えましょう。 ⏎ また、主語は（He、She などの）代名詞で答えましょう。 |  |
| 43 | 1-12-1-1 | Requirementの修正 | applied | requirement | イラストを見て、主語は（He Sheなどの）代名詞で答えること。イラストを見て、 ⏎ 主語に合う文章を考えましょう② | イラストを見て、主語に合う文章を考えましょう。 ⏎ ただし、主語は（He、She などの）代名詞で答えましょう。 |  |
| 46 | 1-12-2-1 | Requirementの修正 | applied | requirement | イラストを見て、主語は（He Sheなどの）代名詞で答えること。イラストを見て、 ⏎ 主語に合う文章を考えましょう② | イラストを見て、主語に合う文章を考えましょう② ⏎  主語は（He She などの）代名詞で答えましょう。 |  |
| 48 | 1-14-1-1 | Requirementの修正 | applied | requirement | だれの～ですか？の質問に　 ⏎ それは（私の、彼女の..）～です。 ⏎ と答えましょう！ | 「だれの～ですか？」の質問に、 ⏎ 「それは（私の、彼女の…）～です。」と答えましょう。 |  |
| 49 | 1-14-2-1 | Requirementの修正 | applied | requirement | だれの～ですか？の問に　 ⏎ それは（私の、彼女の..）～です。 ⏎ と答えましょう！ | 「だれの～ですか？」の問いに、 ⏎ 「それは（私の、彼女の…）～です。」と答えましょう。 |  |
| 50 | 1-15-1-1 | Requirementの修正 | applied | requirement | 「だれの～ですか？」の問いに、 「それは（私の、彼女の…）～です。」と答えましょう。 | イラストを見て質問に答えましょう。 |  |
| 51 | 1-16-1-1 | Requirementの修正 | applied | requirement | （always, never などの）ひんどを表す情報を ⏎ 付け加えて英文を考えましょう。 | 頻度を表す語（always、usually、often、sometimes など）を ⏎ 加えて英文を作りましょう。 |  |
| 53 | 1-22-2-1 | Requirementの修正 | applied | requirement | 肯定文をに否定文に言いかえましょう。 | 肯定文を否定文に言いかえましょう。 |  |
| 57 | 1-21-2-1 | Requirementの修正 | applied | requirement | 肯定文を否定文に言いかえましょう。 | 肯定文を否定文に言いかえましょう。主語はShe He などの代名詞で答えること。 |  |
| 59 | 1-24-1-1 | Requirementの修正 | applied | requirement | 例にならい、肯定文を疑問文に言いかえましょう。 | 例にならい、質問に対しYes, またはNo,で答えましょう。 |  |
| 76 | 1-24-2-1 | Requirementの修正 | applied | requirement | 例にならい、肯定文を否定文に言いかえましょう。 | 例にならい、肯定文を疑問文に言いかえましょう。 |  |
| 85 | 1-25-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 肯定文を疑問文に言いかえましょう。 | 例にならい、質問に対しYes, またはNo,で答えましょう。 |  |
| 102 | 1-25-2-1 | Requirementの修正 | applied | requirement | 例にならい、肯定文を否定文に言いかましょう。 | 例にならい、肯定文を疑問文に言いかえましょう。 |  |
| 112 | 1-27-1-1 | Requirementの修正 | applied | requirement | 例にならい、肯定文を質問文に言いかえましょう。 | 例にならい、肯定文を疑問文に言いかえましょう。 |  |
| 114 | 1-28-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ Yes, I can.  No, I can not.で答えましょう。 | 例にならい、 ⏎ Yes, ～ can. / No, ～ can't. で答えましょう。 |  |
| 120 | 1-28-2-1 | Requirementの修正 | applied | requirement | 例にならって、Can を使い出来ますか？という ⏎ 質問文にしましょう。 | 例にならい、Can を使って「～できますか？」という疑問文に言いかえましょう。 |  |
| 173 | 1-37-2-1 | Requirementの修正 | applied | requirement | 例にならい、How long を使って、 ⏎ ものの長さをたずねましょう。 | 例にならい、How long を使って、ものや時間の長さをたずねましょう。 |  |
| 190 | 1-39-2-1 | Requirementの修正 | applied | requirement | 例にならい「～しましょう。」という ⏎ 文に言いかえましょう。 | 例にならい、「Let's ～.」を使って ⏎ 「～しましょう。」という文に言いかえましょう。 |  |
| 192 | 1-41-2-1 | Requirementの修正 | applied | requirement | イラストを見て、現在進行形の ⏎ 質問に答えましょう。 | イラストを見て、現在進行形の質問に答えましょう。 ⏎ 人の名前などは he / she / they などの代名詞に変えて答えましょう。 |  |
| 196 | 1-41-1-1 | Requirementの修正 | applied | requirement | イラストを見て、現在進行形の ⏎ 質問に答えましょう。 | イラストを見て、現在進行形を使い質問に答えましょう。 ⏎ 人の名前などは he / she / they などの代名詞に変えて答えましょう。 |  |
| 197 | 1-42-1-1 | Requirementの修正 | applied | requirement | イラストを見て、現在進行形使い ⏎ 質問に答えましょう。 | イラストを見て、現在進行形使い質問に答えましょう。 ⏎ 人の名前などは he / she / they などの代名詞に変えて答えましょう。 |  |
| 198 | 1-42-2-1 | Requirementの修正 | applied | requirement | イラストを見て、現在進行形使い ⏎ 質問に答えましょう。 | イラストを見て、現在進行形使い質問に答えましょう。 ⏎ 人の名前などは he / she / they などの代名詞に変えて答えましょう。 |  |
| 212 | 1-44-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 何をしているの？とたずねましょう。 | イラストを見て、「何をしているの？」とたずねましょう。 |  |
| 228 | 1-47-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 過去形の文章を否定文に直しましょう！ | 例にならい、 ⏎ 過去形の文を否定文に言いかえましょう。 |  |
| 231 | 1-47-2-1 | Requirementの修正 | applied | requirement | Do,Does,Did を使い、 ⏎ 現在形と過去形が混ざった文章を ⏎ すべて否定文に直しましょう！ | don't・doesn't・didn't を使い、 ⏎ 現在形と過去形が混ざった文をすべて否定文に直しましょう。 |  |
| 232 | 1-48-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 過去形の文章を過去疑問文に直しましょう！ | 例にならい、 ⏎ 過去形の文を過去の疑問文に直しましょう。 |  |
| 235 | 1-48-2-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ 現在形と過去形が混在している文章を ⏎ すべて疑問文に直しましょう。 | 例にならい、 ⏎ 現在形と過去形が混在している文を、すべて疑問文に直しましょう。 |  |
| 237 | 1-49-1-1 | Requirementの修正 | applied | requirement | 例にならい「What」を使って、 ⏎ 「何を～したのですか？」 ⏎ という疑問文を考えましょう。 | 例にならい、 ⏎ 「What」を使って、「何を～したのですか？」とたずねましょう。 |  |
| 238 | 1-49-2-1 | Requirementの修正 | applied | requirement | 例にならいWhenを使って、 ⏎ 「いつ～したのですか？」 ⏎ という疑問文を考えましょう。 | 例にならい、Whenを使って「いつ～したのですか？」たずねましょう。 |  |
| 239 | 1-49-3-1 | Requirementの修正 | applied | requirement | 例にならい、Whereを使って、 ⏎ 「どこで～したのですか？」 ⏎ という疑問文を考えましょう。 | 「Where」を使って、「どこで～したのですか？」とたずねましょう。 |  |
| 243 | 1-49-4-1 | Requirementの修正 | applied | requirement | 例にならいHowを使って ⏎ 「どうやって～したのですか？」 ⏎ という疑問文を考えましょう。 | "例にならいHowを使って ⏎ 「どうやって～したのですか？」とたずねましょう。 |  |
| 244 | 1-50-1-1 | Requirementの修正 | applied | requirement | 例にならい、現在形の文を「～でした。」 ⏎ の過去形に直しましょう。 | 例にならい、現在形の文を「～でした。」 ⏎ の過去形で答えましょう。 |  |
| 245 | 1-50-2-1 | Requirementの修正 | applied | requirement | 否定文、疑問文、肯定文の現在形の文を ⏎ （～でした）の過去形に直しましょう。 | 否定文、疑問文、肯定文の現在形の文を ⏎ （～でした）の過去形で答えましょう。 |  |
| 249 | 2-1-2-1 | Requirementの修正 | applied | requirement | 例にならい、～人気があります。 ⏎ という文章をすべて代名詞で答えましょう。 | 例にならい、～人気があります。 ⏎ という文章の主語を代名詞に直して答えましょう |  |
| 250 | 2-2-1-4 | Requirementの修正 | applied | requirement | 例にならい「～は東京に住んでいます。」 ⏎ という文をすべて代名詞で答えましょう。 | 例にならい「～は東京に住んでいます。」 ⏎ という文の主語を代名詞に直して答えましょう |  |
| 279 | 2-16-1-1 | Requirementの修正 | applied | requirement | 【AをＢと呼ぶ・ＡをＢと名付ける】 ⏎ 　call やname を使った ⏎ 　質問文に答えましょう。 | 【AをBと呼ぶ・AをBと名付ける】 ⏎ 例にならい、主語は代名詞（They・She・He など）、 ⏎ 名詞はそのまま使用して英文に答えましょう。 |  |
| 303 | 2-33-2-1 | Requirementの修正 | applied | requirement | イラストを見て、【whatまたはWhichi】を使い、 ⏎ 「誰（何）が一番～ですか？」 ⏎ という疑問文を考えましょう。 | イラストを見て、【Which】を使い、 ⏎ 「どちらの～が一番～ですか？」 ⏎ という疑問文を考えましょう。 |  |
| 370 | 2000-03-03 00:00:00 | Requirementの修正 | skipped |  |  |  | 対象partを特定できない(要確認): '2000-03-03 00:00:00' |
| 415 | 3-13-2-1 | Requirementの修正 | applied | requirement | 過去形の文章を　現在完了（経験）「（今までに） ⏎ ～したことがある」　 ⏎ 　の文章に言いかえましょう。 | 経験を表す現在完了形の文を作りましょう。 |  |
| 422 | 3-14-1-1 | Requirementの修正 | applied | requirement | 「どのくらい〜していますか？」という問いに、 ⏎ 現在完了進行形（have/has been ～ing）  ⏎ を使い、for や since を正しく答えましょう。 | 「どのくらい〜していますか?」の問いに、 ⏎ 現在完了進行形(have/has been ~ing)と for / since を ⏎ 使って答えましょう。主語は代名詞に変えましょう。 |  |
| 423 | 3-14-2-1 | Requirementの修正 | applied | requirement | 現在の文章を　「How long ～」を使い ⏎ 「（今まで）ずっと～し続けていますか？」 ⏎ 　の文章に言いかえましょう。 | How long を使って『どのくらい〜し続けていますか?』と ⏎ たずねる文を作りましょう。主語は代名詞に変えましょう。 |  |
| 427 | 3-15-1-1 | Requirementの修正 | applied | requirement | 「It’s～to ～」を使い「～することは～です」　 ⏎ 　の文章を考えましょう。 | 質問に対して「It is ~  to …」の形で答えましょう。 |  |
| 436 | 3-15-2-1 | Requirementの修正 | applied | requirement | 「It’s ~for me【人】 to ~」を使い　 ⏎ 「～することは~にとって～です」　 ⏎ の文章を考えましょう。 | 質問に対して「It is ~ for 人 to …」 ⏎ (…することは~にとって~です)の形で答えましょう。 |  |
| 445 | 3-16-1-1 | Requirementの修正 | applied | requirement | 例文にならい「I'd like ~]を使い ⏎ 　もっとていねいな表現に言いかえましょう。 | 例にならい「I'd like ~]を使い ⏎ 　よりていねいな表現に言いかえましょう。 |  |
| 454 | 3-16-2-1 | Requirementの修正 | applied | requirement | 例文にならい「I'd like ”to” ~]を使い ⏎ 　もっとていねいな表現に言いかえましょう。 | 例にならい「I'd like "to" ~]を使い ⏎ 　よりていねいな表現に言いかえましょう。" |  |
| 463 | 3-17-1-1 | Requirementの修正 | applied | requirement | 例文にならい[Would you like ~]を使って、 ⏎ もっとていねいな表現に言いかえましょう。 | 例にならい「Would you like ~」を使い ⏎ 　よりていねいな表現に言いかえましょう。 |  |
| 465 | 3-17-2-1 | Requirementの修正 | applied | requirement | 例文にならい[Would you like to ~]を使って、 ⏎ もっとていねいな表現に言いかえましょう。 | 例にならい「Would you like to ~」を使い ⏎ 　よりていねいな表現に言いかえましょう。 |  |
| 474 | 3-18-1-1 | Requirementの修正 | applied | requirement | 例にならい、「I want （人）to ～」を使い　 ⏎ 人に～して欲しいと伝えましょう。 | 例にならい、「I want 人 to ~」の形で答えましょう。 |  |
| 478 | 3-18-2-1 | Requirementの修正 | applied | requirement | 肯定文を疑問文にして　「Do you want me to ～」 ⏎ 　「私が~しましょうか？」 ⏎ 　の文章を答えましょう。 | 「I want you to ~」の文を「Do you want me to ~?」 ⏎ (私が~しましょうか?) の形に変えて答えましょう。 ⏎ 代名詞は適切に変えましょう。 |  |
| 479 | 3-19-1-1 | Requirementの修正 | applied | requirement | 例にならい、tell や ask を使った文で答えましょう。 | 例にならい、tell や ask を使った文で答えましょう。 ⏎ 主語が固有名詞の場合は代名詞に変えましょう。 |  |
| 482 | 3-20-1-1 | Requirementの修正 | applied | requirement | 例にならい、 ⏎ let me を使って「私に～させて。」の文章を考えましょう。 | 「I'll ~」の文を「Let me ~」(私に~させて)の形に言いかえましょう。 |  |
| 491 | 3-20-2-1 | Requirementの修正 | applied | requirement | 例にならい、help または make を使って ⏎ 「動詞＋人＋動詞の原形」の形で答えましょう。 | 例にならい、help または make を使って ⏎ 「動詞＋人＋動詞の原形」の形で答えましょう。 ⏎ 主語が固有名詞の場合は代名詞に変えましょう。 |  |
| 496 | 3-21-1-1 | Requirementの修正 | applied | requirement | 「name（～と名づける）」「call（～と呼ぶ）」を使って、　人や動物・物に名前をつける／呼ぶ英文を考えましょう。 | 「name(~と名づける)」「call(~と呼ぶ)」を使って答えましょう。 ⏎ 主語が固有名詞や「her baby」などの場合は代名詞に変えましょう。 |  |
| 506 | 3-21-2-1 | Requirementの修正 | applied | requirement | 例にならい、It makes me ~「ＡをＢにする」 ⏎ 表現を使い、気持ちを表す文を考えましょう。 | 例にならい、make + 人 + 形容詞 ⏎ 「(人)を〜な気持ちにさせる」の形を使って、 ⏎ 気持ちを表す文を考えましょう。 |  |
| 513 | 3-22-1-1 | Requirementの修正 | applied | requirement | 例にならい、tell + 人 + that 〜 の形を使って ⏎ 質問に答えましょう。 | 時制の一致に注意し、 ⏎ 例にならい、tell + 人 + that 〜 の形を使って ⏎ 質問に答えましょう。 |  |
| 516 | 3-22-2-1 | Requirementの修正 | applied | requirement | 「show + 人 + that 〜」の形を使って質問に答えましょう。 | 時制の一致に注意し、 ⏎ 例にならいshow + 人 + that 〜 の形を使って  ⏎ 質問に答えましょう |  |
| 525 | 3-24-1-1 | Requirementの修正 | applied | requirement | 例にならい、「名詞 + 前置詞句 」 の名詞句の形で答えましょう。 | 例にならい、質問に対して「The ~」　から始まる文で答えましょう。 |  |
| 537 | 3-25-1-1 | Requirementの修正 | applied | requirement | 質問に対して「名詞＋動詞＋現在分詞」　の文で答えましょう。 | 例にならい、質問に対して「The ~」　から始まる文で答えましょう。 |  |
| 538 | 3-25-2-1 | Requirementの修正 | applied | requirement | 質問に対して「The ~」　から始まる文で答えましょう。 | 例にならい、質問に答えましょう。 |  |
| 556 | 3-26-2-1 | Requirementの修正 | applied | requirement | 前文の名詞を、後文の内容を使って ⏎ 「名詞＋主語＋動詞」の形で1文にしましょう。 ⏎ ※ 関係代名詞は使いません。 | 2つの文を、過去分詞を使って1つの文にしましょう。関係代名詞は使わないこと。 |  |
| 561 | 3-27-1-1 | Requirementの修正 | applied | requirement | それぞれの文を「どんな〜か」を説明する文にしましょう。 | 例にならい、名詞を「主語＋動詞〜」で後ろから説明する形にしましょう。 ⏎ 動詞は過去形にしましょう。 |  |
| 577 | 3-30-2-1 | Requirementの修正 | applied | requirement | 次の2つの文を1文にしなさい。 ⏎ 後ろの文で説明されている名詞を、 ⏎ 関係代名詞【that】を使ってまとめましょう。 | 次の2つの文を、関係代名詞【that】を使って1つの文にしましょう。 ⏎ 答えは「The 〜」から始めましょう。 |  |
| 578 | 3-31-1-1 | Requirementの修正 | applied | requirement | 次の2つの文を1文にしなさい。 ⏎ 後ろの文で説明されている名詞を、 ⏎ 関係代名詞【that / who】を使ってまとめましょう。 | 例にならい、 ⏎ 2つの文を、関係代名詞 who を使って1つの文にしましょう。 |  |
| 587 | 3-31-2--1 | Requirementの修正 | applied | requirement | 次の2つの文を1文にしなさい。 ⏎ 前の文に出てくる名詞を説明するために、 ⏎ 関係代名詞【that / who】を使って答えましょう。 | 例にならい、 ⏎ 2つの文を、関係代名詞 that を使って1つの文にしましょう。 |  |
| 596 | 3-31-3-1 | Requirementの修正 | applied | requirement |  | 例にならい、 ⏎ 2つの文を、関係代名詞 that を使って1つの文にしましょう。 ⏎ 答えは「The 〜」から始めましょう。 |  |
| 605 | 3-31-4-1 | Requirementの修正 | applied | requirement |  | 例にならい、 ⏎ 2つの文を、関係代名詞を使わずに1つの文にしましょう。 ⏎ 答えは「The 〜」から始めましょう。 |  |
| 623 | 1-3-1-1 | アポストロフィの統一 | applied | expected_text | I’m a student. | I'm a student. | アポストロフィ統一 |
| 624 | 1-3-1-2 | アポストロフィの統一 | applied | expected_text | You’re a student. | You're a student. | アポストロフィ統一 |
| 625 | 1-3-1-4 | アポストロフィの統一 | applied | expected_text | You’re a nurse. | You're a nurse. | アポストロフィ統一 |
| 626 | 1-3-1-5 | アポストロフィの統一 | applied | expected_text | I’m a teacher. | I'm a teacher. | アポストロフィ統一 |
| 627 | 1-3-1-6 | アポストロフィの統一 | applied | expected_text | You’re a teacher. | You're a teacher. | アポストロフィ統一 |
| 628 | 1-3-1-7 | アポストロフィの統一 | applied | expected_text | I’m a soccer player. | I'm a soccer player. | アポストロフィ統一 |
| 629 | 1-3-1-8 | アポストロフィの統一 | applied | expected_text | You’re a soccer player. | You're a soccer player. | アポストロフィ統一 |
| 630 | 1-3-2-1 | アポストロフィの統一 | applied | expected_text | I’m your mother. | I'm your mother. | アポストロフィ統一 |
| 631 | 1-3-2-2 | アポストロフィの統一 | applied | expected_text | You’re my friend. | You're my friend. | アポストロフィ統一 |
| 632 | 1-3-2-3 | アポストロフィの統一 | applied | expected_text | I’m a singer. | I'm a singer. | アポストロフィ統一 |
| 633 | 1-3-2-4 | アポストロフィの統一 | applied | expected_text | You’re a singer. | You're a singer. | アポストロフィ統一 |
| 634 | 1-3-2-5 | アポストロフィの統一 | applied | expected_text | I’m a police officer. | I'm a police officer. | アポストロフィ統一 |
| 635 | 1-3-2-6 | アポストロフィの統一 | applied | expected_text | You’re a police officer. | You're a police officer. | アポストロフィ統一 |
| 636 | 1-3-2-7 | アポストロフィの統一 | applied | expected_text | I’m a firefighter. | I'm a firefighter. | アポストロフィ統一 |
| 637 | 1-3-2-8 | アポストロフィの統一 | applied | expected_text | You’re a firefighter. | You're a firefighter. | アポストロフィ統一 |
| 638 | 1-6-2-2 | アポストロフィの統一 | applied | expected_text | We’re busy | We're busy | アポストロフィ統一 |
| 639 | 1-6-2-3 | アポストロフィの統一 | applied | expected_text | You’re busy. | You're busy. | アポストロフィ統一 |
| 640 | 1-6-2-6 | アポストロフィの統一 | applied | expected_text | I’m busy. | I'm busy. | アポストロフィ統一 |
| 641 | 1-14-1-7 | アポストロフィの統一 | applied | expected_text | It is my mother’s cap. | It is my mother's cap. | アポストロフィ統一 |
| 642 | 1-14-1-8 | アポストロフィの統一 | applied | expected_text | It is my father’s computer. | It is my father's computer. | アポストロフィ統一 |
| 643 | 1-19-1-2 | アポストロフィの統一 | applied | expected_text | You don’t play the guitar. | You don't play the guitar. | アポストロフィ統一 |
| 644 | 1-19-1-3 | アポストロフィの統一 | applied | expected_text | They don’t use the computer. | They don't use the computer. | アポストロフィ統一 |
| 645 | 1-19-1-4 | アポストロフィの統一 | applied | expected_text | We don’t go to the park. | We don't go to the park. | アポストロフィ統一 |
| 646 | 1-19-1-5 | アポストロフィの統一 | applied | expected_text | You don’t read comics. | You don't read comics. | アポストロフィ統一 |
| 647 | 1-19-1-6 | アポストロフィの統一 | applied | expected_text | They don’t play video games. | They don't play video games. | アポストロフィ統一 |
| 648 | 1-19-1-7 | アポストロフィの統一 | applied | expected_text | I don’t write letters. | I don't write letters. | アポストロフィ統一 |
| 649 | 1-19-1-8 | アポストロフィの統一 | applied | expected_text | I don’t want a new bag. | I don't want a new bag. | アポストロフィ統一 |
| 650 | 1-19-2-1 | アポストロフィの統一 | applied | expected_text | We don’t clean our room. | We don't clean our room. | アポストロフィ統一 |
| 651 | 1-19-2-2 | アポストロフィの統一 | applied | expected_text | You don’t know the answer. | You don't know the answer. | アポストロフィ統一 |
| 652 | 1-19-2-3 | アポストロフィの統一 | applied | expected_text | They don’t swim in the pool. | They don't swim in the pool. | アポストロフィ統一 |
| 653 | 1-19-2-4 | アポストロフィの統一 | applied | expected_text | I don’t eat breakfast every morning. | I don't eat breakfast every morning. | アポストロフィ統一 |
| 654 | 1-19-2-5 | アポストロフィの統一 | applied | expected_text | We don’t play basketball after school. | We don't play basketball after school. | アポストロフィ統一 |
| 655 | 1-19-2-6 | アポストロフィの統一 | applied | expected_text | You don’t drink milk in the morning. | You don't drink milk in the morning. | アポストロフィ統一 |
| 656 | 1-19-2-7 | アポストロフィの統一 | applied | expected_text | They don’t listen to music every night. | They don't listen to music every night. | アポストロフィ統一 |
| 657 | 1-19-2-8 | アポストロフィの統一 | applied | expected_text | We don’t watch movies on Sundays. | We don't watch movies on Sundays. | アポストロフィ統一 |
| 658 | 1-20-1-1 | アポストロフィの統一 | applied | expected_text | He doesn’t pick flowers. | He doesn't pick flowers. | アポストロフィ統一 |
| 659 | 1-20-1-2 | アポストロフィの統一 | applied | expected_text | She doesn’t meet her teacher at school. | She doesn't meet her teacher at school. | アポストロフィ統一 |
| 660 | 1-20-1-3 | アポストロフィの統一 | applied | expected_text | He doesn’t know the answer. | He doesn't know the answer. | アポストロフィ統一 |
| 661 | 1-20-1-4 | アポストロフィの統一 | applied | expected_text | She doesn’t give you a pen. | She doesn't give you a pen. | アポストロフィ統一 |
| 662 | 1-20-1-5 | アポストロフィの統一 | applied | expected_text | He doesn’t say hello to his friend. | He doesn't say hello to his friend. | アポストロフィ統一 |
| 663 | 1-20-1-6 | アポストロフィの統一 | applied | expected_text | She doesn’t ask her teacher a question. | She doesn't ask her teacher a question. | アポストロフィ統一 |
| 664 | 1-20-1-7 | アポストロフィの統一 | applied | expected_text | He doesn’t take a picture. | He doesn't take a picture. | アポストロフィ統一 |
| 665 | 1-20-1-8 | アポストロフィの統一 | applied | expected_text | She doesn’t write a letter. | She doesn't write a letter. | アポストロフィ統一 |
| 666 | 1-20-2-1 | アポストロフィの統一 | applied | expected_text | She doesn’t speak Japanese. | She doesn't speak Japanese. | アポストロフィ統一 |
| 667 | 1-20-2-2 | アポストロフィの統一 | applied | expected_text | We don’t have a car. | We don't have a car. | アポストロフィ統一 |
| 668 | 1-20-2-4 | アポストロフィの統一 | applied | expected_text | He doesn’t run fast. | He doesn't run fast. | アポストロフィ統一 |
| 669 | 1-20-2-5 | アポストロフィの統一 | applied | expected_text | I don’t play soccer. | I don't play soccer. | アポストロフィ統一 |
| 670 | 1-20-2-6 | アポストロフィの統一 | applied | expected_text | She doesn’t have a smartphone. | She doesn't have a smartphone. | アポストロフィ統一 |
| 671 | 1-20-2-7 | アポストロフィの統一 | applied | expected_text | She doesn’t play tennis. | She doesn't play tennis. | アポストロフィ統一 |
| 672 | 1-20-2-8 | アポストロフィの統一 | applied | expected_text | They don’t speak Japanese. | They don't speak Japanese. | アポストロフィ統一 |
| 673 | 1-21-1-2 | アポストロフィの統一 | applied | expected_text | They don’t play soccer. | They don't play soccer. | アポストロフィ統一 |
| 674 | 1-21-1-6 | アポストロフィの統一 | applied | expected_text | She doesn’t have a smartphone. | She doesn't have a smartphone. | アポストロフィ統一 |
| 675 | 1-26-2-2 | アポストロフィの統一 | applied | expected_text | They don’t speak Japanese. | They don't speak Japanese. | アポストロフィ統一 |
| 676 | 1-26-2-3 | アポストロフィの統一 | applied | expected_text | She isn’t a teacher. | She isn't a teacher. | アポストロフィ統一 |
| 677 | 1-26-2-4 | アポストロフィの統一 | applied | expected_text | He doesn’t live in Tokyo. | He doesn't live in Tokyo. | アポストロフィ統一 |
| 678 | 1-26-2-5 | アポストロフィの統一 | applied | expected_text | They aren’t in the park. | They aren't in the park. | アポストロフィ統一 |
| 679 | 1-26-2-6 | アポストロフィの統一 | applied | expected_text | She doesn’t study English. | She doesn't study English. | アポストロフィ統一 |
| 680 | 1-26-2-7 | アポストロフィの統一 | applied | expected_text | We aren’t friends. | We aren't friends. | アポストロフィ統一 |
| 681 | 1-26-2-8 | アポストロフィの統一 | applied | expected_text | He doesn’t like cats. | He doesn't like cats. | アポストロフィ統一 |
| 682 | 1-27-2-1 | アポストロフィの統一 | applied | expected_text | You can’t climb a tree. | You can't climb a tree. | アポストロフィ統一 |
| 683 | 1-27-2-2 | アポストロフィの統一 | applied | expected_text | They can’t go shopping. | They can't go shopping. | アポストロフィ統一 |
| 684 | 1-27-2-3 | アポストロフィの統一 | applied | expected_text | She can’t clean her room. | She can't clean her room. | アポストロフィ統一 |
| 685 | 1-27-2-4 | アポストロフィの統一 | applied | expected_text | He can’t read Japanese. | He can't read Japanese. | アポストロフィ統一 |
| 686 | 1-27-2-5 | アポストロフィの統一 | applied | expected_text | You can’t write English. | You can't write English. | アポストロフィ統一 |
| 687 | 1-27-2-6 | アポストロフィの統一 | applied | expected_text | You can’t take a picture. | You can't take a picture. | アポストロフィ統一 |
| 688 | 1-27-2-7 | アポストロフィの統一 | applied | expected_text | She can’t watch TV. | She can't watch TV. | アポストロフィ統一 |
| 689 | 1-27-2-8 | アポストロフィの統一 | applied | expected_text | He can’t listen to music. | He can't listen to music. | アポストロフィ統一 |
| 690 | 1-30-1-1 | アポストロフィの統一 | already_ok | question_text | What's this? | What's this? | アポストロフィ統一 |
| 691 | 1-30-1-1 | アポストロフィの統一 | applied | expected_text | It’s a pen. | It's a pen. | アポストロフィ統一 |
| 692 | 1-30-1-2 | アポストロフィの統一 | already_ok | question_text | What's that? | What's that? | アポストロフィ統一 |
| 693 | 1-30-1-2 | アポストロフィの統一 | applied | expected_text | It’s a big dog. | It's a big dog. | アポストロフィ統一 |
| 694 | 1-30-1-3 | アポストロフィの統一 | already_ok | question_text | What's that sound? | What's that sound? | アポストロフィ統一 |
| 695 | 1-30-1-4 | アポストロフィの統一 | already_ok | question_text | What's his name? | What's his name? | アポストロフィ統一 |
| 696 | 1-30-1-5 | アポストロフィの統一 | already_ok | question_text | What's your friend's name? | What's your friend's name? | アポストロフィ統一 |
| 697 | 1-30-1-6 | アポストロフィの統一 | already_ok | question_text | What's her favorite sport? | What's her favorite sport? | アポストロフィ統一 |
| 698 | 1-30-1-7 | アポストロフィの統一 | already_ok | question_text | What's your favorite color? | What's your favorite color? | アポストロフィ統一 |
| 699 | 1-30-1-8 | アポストロフィの統一 | already_ok | question_text | What's your favorite subject? | What's your favorite subject? | アポストロフィ統一 |
| 700 | 1-30-2-1 | アポストロフィの統一 | already_ok | question_text | What's your favorite drink? | What's your favorite drink? | アポストロフィ統一 |
| 701 | 1-30-2-2 | アポストロフィの統一 | already_ok | question_text | What's your mother's favorite food? | What's your mother's favorite food? | アポストロフィ統一 |
| 702 | 1-30-2-3 | アポストロフィの統一 | already_ok | question_text | What's your email address? | What's your email address? | アポストロフィ統一 |
| 703 | 1-30-2-4 | アポストロフィの統一 | already_ok | question_text | What's your phone number? | What's your phone number? | アポストロフィ統一 |
| 704 | 1-30-2-5 | アポストロフィの統一 | already_ok | question_text | What's on the table? | What's on the table? | アポストロフィ統一 |
| 705 | 1-30-2-6 | アポストロフィの統一 | already_ok | question_text | What's in your bag? | What's in your bag? | アポストロフィ統一 |
| 706 | 1-30-2-7 | アポストロフィの統一 | already_ok | question_text | What's in the box? | What's in the box? | アポストロフィ統一 |
| 707 | 1-30-2-8 | アポストロフィの統一 | already_ok | question_text | What's under the chair? | What's under the chair? | アポストロフィ統一 |
| 708 | 1-31-1-1 | アポストロフィの統一 | superseded |  |  |  | 同一問題への内容修正(問題文の修正(row141), 問題文の修正(row141))が優先。アポストロフィは全体正規化で統一済み |
| 709 | 1-31-1-2 | アポストロフィの統一 | already_ok | expected_text | It's seven thirty. | It's seven thirty. | アポストロフィ統一 |
| 710 | 1-31-1-3 | アポストロフィの統一 | already_ok | expected_text | It's Monday. | It's Monday. | アポストロフィ統一 |
| 711 | 1-31-1-4 | アポストロフィの統一 | already_ok | expected_text | It's September. | It's September. | アポストロフィ統一 |
| 712 | 1-31-1-5 | アポストロフィの統一 | already_ok | expected_text | It's summer. | It's summer. | アポストロフィ統一 |
| 713 | 1-31-1-8 | アポストロフィの統一 | already_ok | question_text | What day do you have English class? | What day do you have English class? | アポストロフィ統一 |
| 714 | 2-6-1-2 | アポストロフィの統一 | applied | expected_text | I’m studying English. | I'm studying English. | アポストロフィ統一 |
| 715 | 2-6-1-3 | アポストロフィの統一 | applied | expected_text | We’re building a house. | We're building a house. | アポストロフィ統一 |
| 716 | 2-6-1-4 | アポストロフィの統一 | applied | expected_text | They’re playing the guitar. | They're playing the guitar. | アポストロフィ統一 |
| 717 | 2-6-1-6 | アポストロフィの統一 | applied | expected_text | I’m writing a letter. | I'm writing a letter. | アポストロフィ統一 |
| 718 | 2-6-1-7 | アポストロフィの統一 | applied | expected_text | I’m baking a cake. | I'm baking a cake. | アポストロフィ統一 |
| 719 | 2-7-1-1 | アポストロフィの統一 | applied | expected_text | She wasn’t worrying about the test. | She wasn't worrying about the test. | アポストロフィ統一 |
| 720 | 2-7-1-3 | アポストロフィの統一 | superseded |  |  |  | 同一問題への内容修正(解答のみ修正(row264))が優先。アポストロフィは全体正規化で統一済み |
| 721 | 2-7-1-4 | アポストロフィの統一 | applied | expected_text | I wasn’t borrowing your pen. | I wasn't borrowing your pen. | アポストロフィ統一 |
| 722 | 2-7-1-5 | アポストロフィの統一 | applied | expected_text | I wasn’t feeling happy. | I wasn't feeling happy. | アポストロフィ統一 |
| 723 | 2-7-1-6 | アポストロフィの統一 | superseded |  |  |  | 同一問題への内容修正(解答のみ修正(row265))が優先。アポストロフィは全体正規化で統一済み |
| 724 | 2-7-1-7 | アポストロフィの統一 | applied | expected_text | She wasn’t wearing a blue dress. | She wasn't wearing a blue dress. | アポストロフィ統一 |
| 725 | 2-7-1-8 | アポストロフィの統一 | applied | expected_text | I wasn’t checking my homework. | I wasn't checking my homework. | アポストロフィ統一 |
| 726 | 2-14-1-1 | アポストロフィの統一 | applied | expected_text | I won’t believe your story. | I won't believe your story. | アポストロフィ統一 |
| 727 | 2-14-1-2 | アポストロフィの統一 | applied | expected_text | She won’t worry about her test. | She won't worry about her test. | アポストロフィ統一 |
| 728 | 2-14-1-4 | アポストロフィの統一 | applied | expected_text | They won’t keep the room clean. | They won't keep the room clean. | アポストロフィ統一 |
| 729 | 2-14-1-5 | アポストロフィの統一 | applied | expected_text | She won’t be important to our team. | She won't be important to our team. | アポストロフィ統一 |
| 730 | 2-14-1-6 | アポストロフィの統一 | applied | expected_text | He won’t be famous in his town. | He won't be famous in his town. | アポストロフィ統一 |
| 731 | 2-14-1-7 | アポストロフィの統一 | applied | expected_text | We won’t be excited about the party. | We won't be excited about the party. | アポストロフィ統一 |
| 732 | 2-14-1-8 | アポストロフィの統一 | applied | expected_text | I won’t be nervous before the test. | I won't be nervous before the test. | アポストロフィ統一 |
| 733 | 2-17-2-3 | アポストロフィの統一 | applied | question_text | What did they do when they didn’t understand English? | What did they do when they didn't understand English? | アポストロフィ統一 |
| 734 | 2-17-2-3 | アポストロフィの統一 | superseded |  |  |  | 同一問題への内容修正(解答のみ修正(row283), アポストロフィの統一(row733))が優先。アポストロフィは全体正規化で統一済み |
| 735 | 2-19-2-6 | アポストロフィの統一 | applied | expected_text | He is hungry because he didn’t eat lunch. | He is hungry because he didn't eat lunch. | アポストロフィ統一 |
| 736 | 2-31-1-1 | アポストロフィの統一 | applied | question_text | I don’t make curry. | I don't make curry. | アポストロフィ統一 |
| 737 | 2-31-1-2 | アポストロフィの統一 | applied | question_text | I don’t make cakes. | I don't make cakes. | アポストロフィ統一 |
| 738 | 2-31-1-3 | アポストロフィの統一 | applied | question_text | I don’t make sandwiches. | I don't make sandwiches. | アポストロフィ統一 |
| 739 | 2-31-1-4 | アポストロフィの統一 | applied | question_text | I don’t make coffee. | I don't make coffee. | アポストロフィ統一 |
| 740 | 2-31-1-5 | アポストロフィの統一 | applied | question_text | I don’t make tea. | I don't make tea. | アポストロフィ統一 |
| 741 | 2-31-1-6 | アポストロフィの統一 | applied | question_text | I don’t make robots. | I don't make robots. | アポストロフィ統一 |
| 742 | 2-31-1-7 | アポストロフィの統一 | applied | question_text | I don’t make websites. | I don't make websites. | アポストロフィ統一 |
| 743 | 2-31-1-8 | アポストロフィの統一 | applied | question_text | I don’t make friends easily. | I don't make friends easily. | アポストロフィ統一 |
| 744 | 2-31-2-1 | アポストロフィの統一 | applied | question_text | I don’t know how to get to the station. | I don't know how to get to the station. | アポストロフィ統一 |
| 745 | 2-31-2-2 | アポストロフィの統一 | applied | question_text | I don’t know how to make a cake. | I don't know how to make a cake. | アポストロフィ統一 |
| 746 | 2-31-2-3 | アポストロフィの統一 | applied | question_text | I don’t know how to play the guitar. | I don't know how to play the guitar. | アポストロフィ統一 |
| 747 | 2-31-2-4 | アポストロフィの統一 | applied | question_text | I don’t know how to use a smartphone. | I don't know how to use a smartphone. | アポストロフィ統一 |
| 748 | 2-31-2-5 | アポストロフィの統一 | applied | question_text | I don’t know how to speak French. | I don't know how to speak French. | アポストロフィ統一 |
| 749 | 2-31-2-6 | アポストロフィの統一 | applied | question_text | I don’t know how to draw a picture. | I don't know how to draw a picture. | アポストロフィ統一 |
| 750 | 2-31-2-7 | アポストロフィの統一 | applied | question_text | I don’t know how to ride a bicycle. | I don't know how to ride a bicycle. | アポストロフィ統一 |
| 751 | 2-31-2-8 | アポストロフィの統一 | applied | question_text | I don’t know how to sing well. | I don't know how to sing well. | アポストロフィ統一 |
| 752 | 2-34-2-4 | アポストロフィの統一 | applied | question_text | Which house is bigger, Jack’s or Emma’s? | Which house is bigger, Jack's or Emma's? | アポストロフィ統一 |
| 753 | 2-34-2-4 | アポストロフィの統一 | applied | expected_text | Jack’s house is bigger than Emma’s. | Jack's house is bigger than Emma's. | アポストロフィ統一 |
| 754 | 2-35-1-1 | アポストロフィの統一 | applied | question_text | Which book is more interesting, Jack’s book or Emma’s book? | Which book is more interesting, Jack's book or Emma's book? | アポストロフィ統一 |
| 755 | 2-35-1-1 | アポストロフィの統一 | applied | expected_text | Jack’s book is more interesting than Emma’s book. | Jack's book is more interesting than Emma's book. | アポストロフィ統一 |
| 756 | 2-36-1-4 | アポストロフィの統一 | applied | question_text | Which restaurant is as famous as McDonald’s? | Which restaurant is as famous as McDonald's? | アポストロフィ統一 |
| 757 | 2-36-1-4 | アポストロフィの統一 | applied | expected_text | This restaurant is as famous as McDonald’s. | This restaurant is as famous as McDonald's. | アポストロフィ統一 |
| 758 | 2-37-2-1 | アポストロフィの統一 | applied | question_text | Which day is more important, Christmas or New Year’s Day? | Which day is more important, Christmas or New Year's Day? | アポストロフィ統一 |
| 759 | 2-37-2-1 | アポストロフィの統一 | applied | expected_text | New Year’s Day is more important than Christmas. | New Year's Day is more important than Christmas. | アポストロフィ統一 |
| 760 | 2-42-2-1 | アポストロフィの統一 | applied | expected_text | No, I haven’t. | No, I haven't. | アポストロフィ統一 |
| 761 | 2-42-2-2 | アポストロフィの統一 | applied | expected_text | No, I don’t. | No, I don't. | アポストロフィ統一 |
| 762 | 2-42-2-3 | アポストロフィの統一 | applied | expected_text | No, I haven’t. | No, I haven't. | アポストロフィ統一 |
| 763 | 2-42-2-4 | アポストロフィの統一 | applied | expected_text | No, I don’t. | No, I don't. | アポストロフィ統一 |
| 764 | 2-42-2-5 | アポストロフィの統一 | applied | expected_text | No, I haven’t. | No, I haven't. | アポストロフィ統一 |
| 765 | 2-42-2-6 | アポストロフィの統一 | applied | expected_text | No, I don’t. | No, I don't. | アポストロフィ統一 |
| 766 | 2-42-2-7 | アポストロフィの統一 | applied | expected_text | No, I haven’t. | No, I haven't. | アポストロフィ統一 |
| 767 | 2-42-2-8 | アポストロフィの統一 | applied | expected_text | No, I don’t. | No, I don't. | アポストロフィ統一 |
| 768 | 2-47-2-1 | アポストロフィの統一 | applied | expected_text | I haven’t eaten lunch yet. | I haven't eaten lunch yet. | アポストロフィ統一 |
| 769 | 2-47-2-2 | アポストロフィの統一 | applied | expected_text | I haven’t taken a shower yet. | I haven't taken a shower yet. | アポストロフィ統一 |
| 770 | 2-47-2-6 | アポストロフィの統一 | applied | expected_text | He hasn’t heard that song yet. | He hasn't heard that song yet. | アポストロフィ統一 |
| 771 | 2-47-2-7 | アポストロフィの統一 | applied | expected_text | She hasn’t tried sushi yet. | She hasn't tried sushi yet. | アポストロフィ統一 |
| 772 | 2-47-2-8 | アポストロフィの統一 | applied | expected_text | He hasn’t worn his kimono yet. | He hasn't worn his kimono yet. | アポストロフィ統一 |
| 315 | 2-35-1-2 | イラスト差し替え | skipped |  |  |  | 差し替えイラストがローカル未着(クライアント要確認) |
