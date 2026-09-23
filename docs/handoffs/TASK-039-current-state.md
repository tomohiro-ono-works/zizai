# TASK-039 Current State

- Status: Current-State Handoff — not Current Specification
- Updated: 2026-09-23
- Canonical detail / history: `docs/tasks/active/TASK-039-fix-native-window-resize-and-investigate-blackout.md`（約101KB。詳細Evidenceと調査historyはそちらが正本）
- 役割: 次セッションが最小の読解で現在地を把握するための現状固定。2026-09-22までの詳細は下の既存section、2026-09-23の実Application診断は直後の更新sectionを優先する。過去の「次の判断」はhistoryであり、現在の進行方針は下記「Closure preparation」を優先する。
- Locator表記: `T039 §<section>` = TASK-039本文の該当section見出し。

## 2026-09-23 Update — Read First

**現在の結論:** 起動直後のnative resize不可（H1）は修正済み。実Applicationの長時間blackoutは未解決。Project ownerの実画面観察がblackout／白化のground truthであり、ログだけから各操作の画面色は判定できない。修正候補を採用できるEvidenceはまだ無い。Project ownerはlocalhost方式への移行を次の正式な進行方針とし、TASK-039はblackout未解決を明記してクローズ準備中。移行の仕様変更・設計・実装は別Taskで扱う。

| 実Applicationの試行 | 観測結果 | locator |
| --- | --- | --- |
| native resize終了の受動trace | 12操作中、owner申告で1・3・5・11がBLACKOUT。いずれも自力復帰せず、次のresizeやHTML button hover等の利用者操作で復帰。全12操作で`WM_EXITSIZEMOVE`捕捉、約500ms後のview geometry／visible／screen／DPRは整合、page probe callbackは約1–2msで返答。ただし`payload=`は空なのでJS内のviewport値は取得できていない | `logs/app_20260923.log` `sid=20260923021322-38676`＋owner Observation |
| `WM_EXITSIZEMOVE`後の`view.update()` | 15操作すべてでnative end後25–53msに実行。owner申告で1・3・5・7・8・9・11・15がBLACKOUT、全件自力復帰なし。QWidget repaint要求だけでは解消しない | 同log `sid=20260923022437-21232`＋owner Observation |
| Qt WebEngine compositor logging（介入なし） | 13操作中、owner申告で3・7・8・11・12・13がBLACKOUT、全件自力復帰なし。各操作でresize後のpixel sizeを持つSharedImage初期化とDXGI resourceをD3D11 textureへimportするログがある。これはbuffer処理の通過を示すが、frame内容・swap完了・Windowsへのpresent成功は証明しない | 同log `sid=20260923024306-11472`、`logs/TASK-039_qt_compositor_20260923-024304.stderr.log`＋owner Observation |
| 約500ms後の`QWebEngineView.grab()` | 13操作のPNGすべてに正常なHome UI。owner申告ではこのsession中に約3回黒化し、自力復帰しなかった。操作番号の対応は未記録。したがって黒化が続く間もgrab経路は正常な画像を得られるが、grabはon-screen texture／presentを直接読む測定ではない | 同log `sid=20260923025444-42792`、`logs/TASK-039_view_grab_pid42792_op001.png`～`op013.png`＋owner Observation |
| PySide6 6.11.0 → 6.11.2隔離A/B | 6.11.2で15操作中2回目にBLACKOUTし、自力復帰なし。起動直後にはHome中心部が一時的に表示されないowner Observationもある（後で表示）。修正候補としてFAIL。`pyproject.toml`、`uv.lock`、通常`.venv`は変更していない | 同log `sid=20260923033409-40372`、`logs/TASK-039_pyside6112_20260923-033408.stderr.log`、`logs/TASK-039_view_grab_pid40372_op002.png`＋owner screenshot／Observation |
| native end後の`view.hide()`→`view.show()` | 初回操作で白画面となり自力復帰せず、FAIL。native end後約29msに実行、view visible／page object identity／Qt focus-in-viewは前後で維持。失敗した追加コードは除去済み | 同log `sid=20260923034802-41948`、`logs/TASK-039_reconnect_20260923-034801.stderr.log`＋owner Observation |

**測定系の制約と更新:** `QTWEBENGINE_CHROMIUM_FLAGS`による重いChromium startup traceは実Applicationのrendererをpage load前に`0xC0000005`でクラッシュさせたため無効。Windows WPRの`GPU`＋`DesktopComposition` profileは初回に`0xc5585011`（system performance profiling権限なし）で開始できなかったが、後続の別試行でETLを取得した。下のWPR更新を参照。`logs/TASK-039_chromium_trace_20260923-023500.json`は正常blackout採取結果として使わない。

**現時点のfailure boundary:** native resize終了、Qt window/viewの幾何、rendererのJS callback、Qt WebEngineのSharedImage初期化／DXGI import処理のログ、およびgrab経路では正常像が観測された。それでも実画面は黒化・白化する。後続ETLにはDXGI present記録があるが、blackout開始時刻とframe内容との対応はない。最終表示までの正確なfailure pointは未確定。import成功やpresent記録を、blackout中の正常画面表示の証明にしない。特定のQt／Chromium／AMD driver defectとも断定しない。6.11.2更新、`view.update()`、`hide()`→`show()`は修正候補から除外する。

**作業状態:** 6.11.2隔離環境は`.tmp/task039-pyside6112/`（tracked dependencyは未変更）。失敗した`hide()`→`show()`コードは除去済み。その後、一時native-end／update／grab診断コードと診断testを除去し、H1修正とそのtestのみ残した。CSS候補は元に戻し、対のPlaywright testは除去した。詳細は下のClosure preparationを参照。

**当時の次の判断（history）:** ここまでのEvidenceで新たなDOM/CSS探索や描画強制workaroundを追加しない。実画面へのpresentを観測できる方法を整えるか、得られた再現EvidenceをQt WebEngine／graphics stackの上流調査へ渡すかを決める、という方針だった。後続のWPR取得とProject ownerのlocalhost移行判断を受け、現在の次工程は下記「Closure preparation」を優先する。

## 2026-09-23 WPR update and closure preparation — Current

- Project ownerはWindows `GPU`＋`DesktopComposition`のWPR trace記録中に実Applicationの1回目のresizeでBLACKOUTを視認し、直後にtraceを停止した。ETL: `%USERPROFILE%\Desktop\TASK-039-blackout.etl`（2,319,450,112 bytes、repository外）。同一sessionのApplication log: `logs/app_20260923.log` `sid=20260923041142-37484`、04:11:42.695起動、04:11:47.927 `home_ready`。
- このsessionは`ZIZ_RESIZE_TRACE`無効であり、Application logにはnative resize終了とBLACKOUT開始の正確な時刻がない。PresentMon 2.3.1によるETLのPID 37484抽出ではDXGI presentが18件、`Dropped=0`、`PresentMode=Composed: Flip`。raw CSVの時刻はApplication logより9時間先行表示され、9時間差を補正するとJST 04:11:47.038〜04:12:07.084。画面内容も操作時刻も得ていないため、このpresent記録をblackout中の正常表示や原因特定の証拠にしない。解析CSV: `%TEMP%/TASK-039-presentmon-pid37484-v1.csv`（一時物）。
- **Closureの分類:** H1は修正・manual PASS。blackoutは未解決、修正候補なし、複数fresh sessionでの修正後確認とFull `RISK-UI-001`は未実施。元Goal達成／PASSとしてはクローズしない。Project ownerは今後の正式な進行方針をlocalhost方式へ切り替えたが、移行は別Taskで設計する。現行`docs/features/architecture.md`／`frontend.md`は`file://`＋QWebChannelをCurrent Specificationとし、localhost APIを許容していないため、別TaskでDecision／仕様変更の承認を得るまで実装しない。
- **今回のworking-tree整理:** `apps/desktop/host.py`ではH1のresize handle attach順変更のみ残し、環境変数で有効化するnative-end／update／grab診断コードを除去。`tests/unit/test_desktop_host_window_contract.py`はH1契約testのみ残す。`apps/gui/css/12_home.css`の`overflow:auto`削除を戻し、対の未追跡Playwright testを除去。これは失敗したproduction候補の撤収であり、D2 A/B/Aのdiagnostic Evidenceは残す。別Taskのdirty changesには触れない。
- raw ETL、Application log、temp CSVはGit管理外。Git pushでEvidenceを保全したとはみなさない。H1修正と本handoffは2026-09-23にlocal commitとして記録済み。pushは本更新時点で未実施。

## Goal

Windows 11 real display上で、起動直後から四辺・四隅でnative resizeでき、resize確定後も`QWebEngineView` contentが表示され続けること（T039 §Goal）。root cause完全特定は必須ではなく、supportedかつ安全な変更でlongが複数fresh sessionで再現せず、page state／dirty data／performance／Current Specificationを維持し、targeted verificationとFull `RISK-UI-001`をPASSすれば採用可（T039 §D2 supported graphics stack A/B — Completion policy）。

現在地: H1は完了。blackoutは**未解決**。D2 diagnosticで唯一negativeだった候補（`.home-screen`のnested scroll除去）は、real Applicationでlongが再発し**production fixとしてFAIL**した。2026-09-23の後続診断・候補FAILは上の更新sectionを参照。

## Confirmed Facts

- **C1 blackout中もnative title bar／window controlsは正常表示を維持する。主領域はtitle bar下の`QWebEngineView` client領域。** custom title bar／sidebarはWebView内HTMLなので同時に黒化する。T039 §Source Evidence（native title bar表示時のblackout範囲）、§E3、§D2 supported graphics stack A/B（Visual Evidence）。screenshot: `%TEMP%/codex-clipboard-414f25cb-…png`、`%TEMP%/codex-clipboard-f720a8a7-…png`。
- **C2 drag中ではなくmouse release後のresize確定時に発生し、自動復帰しない場合がある（次のresize操作で復帰する場合がある）。** T039 §Source Evidence（resize確定時のblackout timing／direction）、§E5 manual result — control（`tests/manual/result/レコーディング 2026-09-20 211942.mp4`のframe audit）。
- **C3 観測済みsessionにrenderer terminationは無い。** T039 §Source Evidence（Claude Opus read-only whole-log review: `Renderer.ProcessLifetime3.MainFrame` 1件・149,661ms＝session全期間）。診断logでも`render_process_terminated`／`screen_changed`は0件（`%TEMP%/TASK-039_d2_opengl_*`、`_d2_home_scroll_*`、`_d2_restoration_*`）。
- **C4 観測範囲にWindows TDR／explicit device-lost Evidenceは無い。** T039 §Source Evidence（Windows System Event Log 11:48〜11:53にDisplay／TDR event無し）。上記stderrに`device lost`／`TDR`／`context lost`／GPU process crashの行も0件。
- **C5 H1（起動直後にresizeできない）は修正済み・manual PASS。H1とblackoutは分離されている。** T039 §Implementation evidence / H1。`apps/desktop/host.py`で`install_resize_handles()`を`setCentralWidget(view)`直後へ移動、`tests/unit/test_desktop_host_window_contract.py` `1 passed`、manual `tests/manual/result/レコーディング 2026-09-20 110816.mp4`。同じ確認でblackoutは再現した。
- **C6 現行loggingはvisual blackoutのground truthを持たない。** draw／swap／present／occlusion／LocalSurfaceIdを直接確認できない（T039 §Source Evidence、§Independent review disposition）。2026-09-23にはnative resize終了、Qt compositorのSharedImage／DXGI import、`QWebEngineView.grab()`を追加観測し、後続ETLでpresent記録も得たが、画面内容とblackout開始時刻は得ていない。実画面の表示状態は引き続きProject ownerのvisual Observationがground truth。

## Real-Application Findings

- **R1** 起動直後にresizeできず、maximize／restore後にできる（修正前）。`tests/manual/result/レコーディング 2026-09-20 094742.mp4`。
- **R2** 横幅拡大時のblackout（修正前）。`tests/manual/result/レコーディング 2026-09-20 094441.mp4`。
- **R3** H1修正後、起動直後resizeはPASS。同じ確認中にblackout再現。`レコーディング 2026-09-20 110816.mp4`（T039 §Implementation evidence / H1）。
- **R4** ZizAI本体のGPU A/B — GPU ONでlong、`--disable-gpu`では長いblackoutを再現せず。T039 §Source Evidence（ZizAI本体のGPU A/B）。
- **R5** ZizAI本体のGPU／compositor診断log: Qt／Chromiumとも同一AMD Radeon、ANGLE D3D11、QSG RHI D3D11、GPU Compositing enabled。`%TEMP%/TASK-039_gpu-compositor.log`。
- **R6** CSS変更適用後のfresh normal Application起動記録。`logs/app_20260922.log`（`sid=20260922173649-24852`、17:36:49開始、`home_ready elapsed_ms=3007.6`）。`page_load_failed`／`page_load_timeout`／`render_process_terminated`の記録は無い（`apps/desktop/host.py:780, 800, 808`が記録する）。
- **R7（2026-09-22時点で確定）** **`.home-screen { overflow:auto }`削除済みのfresh normal ZizAI Applicationで、Project ownerが2026-09-22 17:36以降にtargeted manual確認を実施し、Session 1のresize確認中にlong blackoutが再発した。** その時点で停止したため**Session 2は未実施**、**Full `RISK-UI-001`も未実施**、**commit／pushなし**。Evidence: 2026-09-22 Project owner Observation（ground truth）＋起動記録R6。screenshot／videoは取得していない。
  → 分類: **Failed production-fix candidate**。D2でのstrong trigger／contributor分類は維持し、削除・書き換えはしない。

## Diagnostic-Only Findings

diagnostic harness上で成立したが、real Applicationへ一般化できないもの。

**D2 overflow A/B/A（最重要）** — T039 §Final targeted CSS candidate: Home nested-scroll ownership。

- **A** unchanged D2（`.home-screen { overflow:auto }`）→ long positive。
- **B** `.home-screen`へ`overflow:visible !important`をinlineで1回設定 → **20+ release相当でlong 0件**。`%TEMP%/TASK-039_d2_home_scroll_20260922_170615_806726.stdout.log`。有効区間は2回目`load_finished`（17:07:38）より前でraw `resize_settled` 23件。以後のgateは`payload:null`／invalidで加算しない。
- **A'** fresh unchanged D2 restoration → 3回目のresize releaseでlong再現。`%TEMP%/TASK-039_d2_restoration_20260922_171739_200095.stdout.log`。
- **正しい分類:** D2条件内では **strong trigger / contributor**。**root causeではない**（T039 §Final targeted CSS candidate — Evidence conclusionが明示）。かつ**production fixとしてFAIL**（R7）。「CSSがroot cause」「overflow変更で修正済み」とは分類しない。

その他:

- **D2 document条件 × GPU path** — 実`home.html`でGPU ONはlong、`--disable-gpu`は4回ともlong 0。T039 §D2 preparation and manual evidence。`%TEMP%/TASK-039_d2_document.log`／`_gpu_off.log`。
- **minimal QWebEngineView** — minimal static HTML＋native frameはGPU ON/OFFとも**transientのみ**、longは出ない。本体のlongとは別failure modeとして分離済み。T039 §Source Evidence（minimal `QWebEngineView`のGPU A/B）、§Independent review disposition。
- **E3／E4／E5** — active JavaScriptはlongの必要条件として非支持（E3: script 0のstatic DOMでlong）。resize時のactive author CSSも全条件での必要条件としては非支持（E4: stylesheet 9本全disableでもlong、`tests/manual/result/レコーディング 2026-09-20 203817.mp4`）。E5 static fixtureではCSS依存が出たが、E4とdocument sourceが異なるため結果差をCSSへ帰属できない。T039 §E3／§E4／§evidence synthesis。
- **offscreen起動はinvalid** — `QT_QPA_PLATFORM=offscreen`はrenderer exit code 49で異常終了。実display結果へ流用不可。T039 §targeted paint/compositing prototype。

## Failed Fix / Diagnostic Candidates

| Candidate | 結果 | Evidence locator |
| --- | --- | --- |
| **`.home-screen { overflow:auto }` 削除** | **Real ApplicationでFAIL**（Session 1でlong再発）。D2ではnegative candidate／A/B/A成立だった | R7（2026-09-22 owner Observation）＋`logs/app_20260922.log`。diagnostic側: T039 §Final targeted CSS candidate |
| activitybar `contain: paint -> none` | FAIL。valid gate下（`isolation:isolate`／`overflow:hidden`／geometry維持）で最初のreleaseにlong | T039 §targeted paint/compositing prototype（Activitybar variant manual result） |
| full-viewport `body::after` 除去（`content:none`） | FAIL。valid gate下で最初のreleaseにlong | T039 §full-viewport `body::after` prototype |
| Qt RHI OpenGLへのgraphics stack切替 | FAIL。D2 longを解消せず。Chromium側はANGLE D3D11のままで純粋なQt RHI単独A/Bではない | T039 §D2 supported graphics stack A/B（OpenGL disposition）。`%TEMP%/TASK-039_d2_opengl_20260922_131631_823425.stderr.log`に`QSG RHI Backend: OpenGL`／`Chromium GL Backend: angle`／`ANGLE_D3D11 display is initialized` |
| GPU全面無効化（`--disable-gpu`） | 診断用A/B条件。恒久修正・default flag・workaroundとして採用しない | T039 §Root cause hypotheses / H3 |
| `view.update()`（native end後） | 実Application 15操作中8回blackout、自力復帰なし。FAIL | 2026-09-23 Update、`sid=20260923022437-21232` |
| PySide6 6.11.2（隔離環境） | 15操作中2回目にblackout、自力復帰なし。FAIL | 2026-09-23 Update、`sid=20260923033409-40372` |
| `view.hide()`→`view.show()`（native end後） | 初回操作で白画面・自力復帰なし。FAIL。診断コードは除去済み | 2026-09-23 Update、`sid=20260923034802-41948` |

## Current Failure Boundary

絞り込めている範囲:

- 発生範囲: `QWebEngineView` client領域。native title barは正常（C1）。細かいfailure pointは2026-09-23 Updateの境界を参照。
- 発生契機: resize確定（mouse release）後（C2）。
- 必要条件から外れたもの: renderer crash／GPU process crash（C3）、device lost／TDR（観測範囲, C4）、Qt RHI D3D11固有説、active JavaScript、resize時のactive author CSS全体、multi-monitor／DPI遷移（観測session内で`screen_changed` 0・DPR 1.0固定）、Chromium logging flags。
- GPU accelerated path依存: 本体・D2ともGPU OFFではlongが出ない（R4）。minimalのtransient黒化はGPU非依存で別failure mode。
- **CSS single-condition側の探索は尽きている。** D2で唯一negativeだった候補もreal ApplicationでFAILした（R7）。

未確定のまま（推測で埋めない）:

- SharedImage初期化／DXGI import処理から実画面表示までの正確なfailure point。Qt logging／grabはswap、presentを直接観測していない。後続ETLのpresent記録も、BLACKOUT開始時刻・画面内容との対応がない（C6、WPR update）。
- D2 harnessとreal Applicationの未分離条件（frameless window／`startSystemResize`、`LockedDownPage`／Profile／cache／interceptor、QWebChannel／Bridge、production attach lifecycle）。元のD3〜D11 ladderはsuspend済みで未実施。
- long blackoutの間欠性のモデル（E1では1回longが出て同条件再実行で再現せず）。

## TASK-039 working-tree disposition

| file | change | automated | real-Application | disposition |
| --- | --- | --- | --- | --- |
| `apps/desktop/host.py` | H1のhandle順修正のみ | cleanup後のH1 focused test `1 passed` | H1 PASS、blackout未解決 | keep。一時診断は除去済み |
| `tests/unit/test_desktop_host_window_contract.py`（新規） | H1のattach順契約のみ | cleanup後 `1 passed`（2026-09-23） | — | keep。診断flag testは除去済み |
| `apps/gui/css/12_home.css` | `.home-screen`の`overflow: auto;`宣言を復元 | 過去のD2 A/B/Aとbrowser test結果はhistoryのみ | **FAIL — long再発（R7）** | blackout修正候補の差分は撤収。CSS内容は元に戻した |
| `tests/playwright/specs/home-scroll-ownership.spec.js`（新規） | 失敗したCSS候補に対するtest | 過去には`1 passed` | — | 除去済み。結果はhistoryに残す |
| `docs/tasks/active/TASK-039-….md`（untracked） | Task本文＋本handoffへの参照 | — | — | keep |
| `docs/handoffs/TASK-039-current-state.md`（本file・新規） | current state固定 | — | — | keep |

同じworking treeにあるTASK-039**以外**の変更（本Taskのdisposition対象外）: TASK-038由来（`apps/desktop/bridge.py`、`apps/gui/js/*`、`tests/playwright/specs/{ui-shell, sql-highlighter}.spec.js`、`tests/unit/test_bridge_contract.py`、`docs/features/frontend.md`、TASK-038本文、`tests/manual/`一式）、TASK-015本文、`AGENTS.md`＋`docs/features/coding-rules.md`（attribution未解決）、`scripts/`（無関係・untracked）。

未達のverification: blackout修正候補が無いため、修正後の複数fresh session確認、`tests/run-verification.ps1`各Gate、Full `RISK-UI-001`（T039 §Verification）は未実施。cleanup後のfocused H1 testは`.venv\Scripts\python.exe -m pytest tests/unit/test_desktop_host_window_contract.py -q`で`1 passed`。2026-09-23にlocal checkpoint commit済みで、pushは本更新時点で未実施。

## Genuine Unresolved Questions

- **U1（disposition済み）** `.home-screen`のCSS変更はblackout修正として非支持（R7）で撤収。対のbrowser testも除去。nested-scroll-free契約を将来採用するなら、blackoutとは独立した仕様・Taskの根拠が必要。
- **U2（現調査では追わない）** SharedImage／DXGI import以降の正確なfailure pointは未確定。後続WPRでpresent記録は得たが、blackout開始時刻・frame内容との対応を取れず、原因確定には至らない。移行方針下で新たなpresent追跡をTASK-039の必須工程にしない。
- **U3** D2 harnessとreal Applicationの未分離条件のうち、どれがD2 negativeとreal Application FAILの差を生んだのか。
- **U4** 間欠性を踏まえ、今後「longが出ない」と判定するために必要なsession数・release数の基準。Session 1のみで停止した今回はpositive判定なので有効だが、negative判定には同じ基準を使えない。

## Investigations Not To Repeat Without New Evidence

新しいEvidenceなしに同じbranchを再開しないための一覧。永久禁止ではない。

1. CSS stylesheet／declaration単位のddmin（T039 §evidence synthesis、§E5 fixed pair）。
2. E6 initial author-CSS application history（Project owner承認により保留）。
3. DOM subtree逐次除外（同上）。
4. 元のD3〜D11 ladder（D2が最初のlong armとなりsuspend）。
5. minimal QWebEngineViewのGPU ON/OFF baseline再取得（transient確定済み）。
6. Chromium logging flags A/B（A1 8/8 long 0、B1 8/8 long 0で非支持）。
7. Qt RHI OpenGLを修正候補として追うこと（D2 longを解消せず）。
8. activitybar `contain:paint`／`body::after`除去のprototype再試行（いずれも最初のreleaseでlong）。
9. `QT_QPA_PLATFORM=offscreen`での結果取得（renderer exit 49でinvalid）。
10. **新しいCSS single-condition候補の探索**（T039 §Final targeted CSS candidateで探索終了を決定済み。加えてR7でCSS側の最有力候補がproduction FAIL）。

## Current Decision Point

次のreviewer／Project ownerが判断すべき問い。実装案はここでは提示しない。

1. 変更整理とfocused H1 verificationを確認し、TASK-039を「H1完了・blackout未解決・元Goal未達のまま別方針へ移管」としてどう記録上クローズするかを決める。blackout修正済み／Full `RISK-UI-001` PASSにはしない。
2. localhost移行は別Taskでarchitecture／security／dirty data／close・reload／performance／verificationを設計し、Current SpecificationとDecisionの更新を承認してから実装する。TASK-039のEdit Scopeに混ぜない。
3. raw ETL（repository外）とlocal logの保全先を、Gitとは別にProject ownerが決める。Qt／Chromium／AMDの責務を現Evidenceだけで断定しない。
