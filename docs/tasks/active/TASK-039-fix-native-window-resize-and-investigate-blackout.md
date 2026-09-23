# TASK-039 Fix Native Window Resize and Investigate Display Blackout

## Status

Closure preparation（2026-09-23）— H1の起動時resize handle stackingは修正・manual PASS。実Applicationのlong blackoutは未解決で、本Taskの元のGoalとFull `RISK-UI-001` Acceptanceは未達。Project ownerはlocalhost方式への移行を今後の正式な進行方針とした。移行の設計・Current Specification変更・実装は本Taskでは行わず、別Taskで扱う。本Taskを「blackout修正完了」または検証PASSとして閉じない。過去のdiagnostic priorityと候補は下のhistoryに残し、現在の判断には用いない。次セッションは`docs/handoffs/TASK-039-current-state.md`を先に読む。

## Goal

Windows 11のreal display上で、ZizAIを起動直後から四辺・四隅でresizeでき、resize後もWebView contentが表示され続けるようにする。resize時のblackoutはQtWebEngine repaintを確定原因とせず、monitor／DPI／GPU／Application hostの責務を切り分ける。root causeの完全特定を必須とはせず、supportedかつ安全な変更で症状を安定して解消できる場合は、必要な安全性・互換性・performance verificationを満たしたうえで修正候補として採用する。

## Scope

- `apps/desktop/host.py`が所有するframeless native window、resize handle、QWebEngineView配置・lifecycleをroot cause別に検証する。
- 起動直後のresize handleのhit target／z-orderと、maximize／restore後のstate transitionをTest-firstで固定する。
- blackoutを、native resize handle、QtWebEngine repaint、monitor screen transition、DPI transitionのいずれが契機か実displayで切り分ける。
- root causeまたは再現を安定して解消するsupported graphics stack／Application drawing conditionを特定し、Project ownerが修正採用を承認した場合だけ、最小限のApplication修正と対象Testを実装する。
- 修正後、`UI-WINDOW-RESIZE`を含むFull `RISK-UI-001`を新しいEvidenceで再実施する。

## Out of scope

- TASK-038のApplication／document lifecycle／external conflict／Settings／SQL editor修正、targeted retest Result、Round 1 Resultの変更。
- `RISK-UI-001`の残るケースを、原因修正前に再開またはPASS Evidenceとして生成すること。
- Frontend vendor、CSS、Workflow、Connector、Bridge Protocol、Security boundaryの変更。
- GPU driver、Windows display設定、monitor構成、Qt／PySide6 dependency versionの更新。
- black screenを隠すためのwindow reload、WebEngine再生成、強制maximize／restore、固定delayの追加。

## References

- `docs/handoffs/TASK-039-current-state.md` — 次セッション向けのcurrent-state handoff。本Taskの確定事実、real-Application結果、diagnostic-only結果、failed production-fix candidate、current decision pointを要約する。Current Specificationではなく、詳細Evidenceの正本は本Task本文である。
- `docs/features/architecture.md` — `apps/desktop/host.py`はPySide6、QtWebEngine、QWebChannel、local navigation boundaryを所有する。
- `docs/features/frontend.md` — Windows QtWebEngine／native dialogはManual UI Gateで確認する。
- `docs/features/coding-rules.md` — Current Specification、source ownership、公開behaviorのVerification。
- `tests/manual/windows-ui-checklist.md` — `RISK-UI-001`／`UI-WINDOW-RESIZE`の正式期待結果。
- `tests/manual/manual-ui-result.schema.json`、`tests/manual/validate_manual_ui_result.py` — Manual Gate Evidence contract。
- [Qt WebEngine Features / Enable logging and troubleshooting](https://doc.qt.io/qtforpython-6/overviews/qtwebengine-features.html) — `qt.webenginecontext`と`qt.webengine.compositor`によるGPU／graphics configuration診断。
- [Qt WebEngine Debugging and Profiling](https://doc.qt.io/qt-6/qtwebengine-debugging.html) — `QTWEBENGINE_CHROMIUM_FLAGS`、Chromium console logging、`--disable-gpu`の診断用途。
- `docs/tasks/active/TASK-038-fix-round1-application-and-editor-bugs.md` — TASK-038の完了前Manual Gate依存。
- `tests/manual/result/レコーディング 2026-09-20 094441.mp4` — 横幅を広げた際のblackout Evidence。
- `tests/manual/result/レコーディング 2026-09-20 094742.mp4` — 起動直後にresizeできず、window state変更後にresize可能になるEvidence。
- `tests/manual/result/レコーディング 2026-09-20 110816.mp4` — H1修正後は起動直後からresize可能である一方、blackoutは引き続き発生することを確認したEvidence。

## 2026-09-23 closure preparation and evidence update

- **Outcome boundary:** H1は完了。resize後の実画面blackoutは未解決。`.home-screen`の`overflow:auto`削除はD2 diagnostic A/B/Aではstrong trigger／contributorだったが、real Applicationではlong blackoutが再発しproduction fixとしてFAIL。6.11.2、native end後の`view.update()`、`view.hide()`→`view.show()`もreal ApplicationでFAIL。GPU無効化は診断条件であり恒久修正として採用しない。詳細なsession・owner Observationはhandoffの「2026-09-23 Update」を参照する。
- **WPR取得後の更新:** 先のWPR起動失敗（`0xc5585011`）とは別の試行で、Project ownerがWindows `GPU`＋`DesktopComposition` traceを記録し、実Applicationの1回目のresizeでBLACKOUTを視認して直後に停止した。ETLは`%USERPROFILE%\Desktop\TASK-039-blackout.etl`（2,319,450,112 bytes、repository外）。同一Application sessionは`logs/app_20260923.log`の`sid=20260923041142-37484`、04:11:42.695起動、04:11:47.927 `home_ready`。このsessionでは`ZIZ_RESIZE_TRACE`が無効で、native resize終了やblackout開始の正確な時刻はApplication logにない。
- **ETLから得られた範囲:** 既存ETLをPresentMon 2.3.1でread-only解析したPID 37484のCSVには18件のDXGI present記録があり、`Dropped=0`、`PresentMode=Composed: Flip`。CSVの時刻はApplication logより9時間先行表示され、9時間差を補正した場合の範囲はJST 04:11:47.038〜04:12:07.084。時刻系の差とblackoutの操作時刻不在により、これらをblackout瞬間の正常表示証明、frame内容の証明、root causeの特定として扱わない。CSVは`%TEMP%/TASK-039-presentmon-pid37484-v1.csv`にある一時解析物で、ETLとともにGit管理外。raw ETL／logをGit pushで保全したとみなさない。
- **Cleanup disposition:** H1の`host.py`変更とfocused unit testを残す。一時的なnative-end／update／grab instrumentationとそのtestを除去した。失敗したblackout修正候補である`apps/gui/css/12_home.css`の`overflow:auto`削除を戻し、対の`home-scroll-ownership.spec.js`を除去した。D2 A/B/AのEvidenceと不成立の記録は残す。これらのcleanupはblackoutを直したことを意味しない。
- **Cleanup verification:** `.venv\Scripts\python.exe -m pytest tests/unit/test_desktop_host_window_contract.py -q`は`1 passed`（2026-09-23）。`git diff --check`はexit 0。ただしこれらはblackout解消の検証ではない。
- **Next boundary:** localhost方式はProject ownerの進行方針。ただし`docs/features/architecture.md`と`docs/features/frontend.md`は現在も`file://`＋QWebChannelをCurrent Specificationとし、localhost APIの新設を許容していない。別Taskでarchitecture／security／dirty data／browser close・reload／performance／verificationを設計し、必要なDecisionとCurrent Specificationの変更承認を得る。本TaskのScopeで移行を実装しない。

## Source Evidence and current classification

| Finding | Classification | Evidence | Current assessment |
| --- | --- | --- | --- |
| 起動直後にresizeできないが、maximize／restore後はできる | Confirmed Application Bug | `レコーディング 2026-09-20 094742.mp4` (`9f60adc0d52c4d28c4d4591135ca55e74959e5b75c14b4a8bf2092c7b5ed9133`) | H1修正前は`ResizeHandle`をinstall・raiseした後に`QWebEngineView`をcentral widgetへattachしていた。restore時だけ`WindowStateChange`からhandleを再表示・raiseするため、起動時だけWebViewにhandleが覆われる仮説が最有力だった。 |
| 横幅を広げるとblackoutすることがある | Confirmed Rendering Regression / Root Cause Unresolved | `レコーディング 2026-09-20 094441.mp4` (`61bf9fbc1d2298ab6dd817934be707fbd79edc6e597cf5c5a4dd2c38b335d4cd`) | 初回はdual display／DPI境界を候補にしたが、GPU diagnostic sessionでは2 displayのbounds／scaleが全更新で不変だったため、そのsessionのblackout契機としては非支持。別scale環境の可能性は未検証。 |
| H1修正後の起動直後resize | Verified Fixed / Manual PASS | `レコーディング 2026-09-20 110816.mp4` (`86d8e9d10345a2cd1b2253871953aa7038e7fd5a336076c82f2a3eca44b107f4`) | Project ownerが起動直後のresize成功を確認した。blackoutは同じ確認中に再現したため、H1とは分離してH2／H3で扱う。 |
| native title bar表示時のblackout範囲 | Layer-discrimination Evidence | 2026-09-20 Project owner Observation | debug modeでnative title barを表示してもblackoutを再現したが、native title barは正常表示を維持した。Windows window／DWM全体ではなく、主に`QWebEngineView`側のclient領域が黒化している可能性が高まった。custom title bar／sidebarはWebView内のHTML UIであり、一緒に黒化する観測と矛盾しない。 |
| resize確定時のblackout timing／direction | Reproduction-pattern Evidence | 2026-09-20 Project owner Observation | drag中は黒化せず、mouse release後のresize確定時に黒化する。resize距離との明確な相関はなく、拡大時に発生しやすいが縮小時と上下方向でも発生する。最小幅への縮小は未確認。window幅1223px付近に境界があるように見えるが再現性・pixel座標系は未確定。 |
| ZizAI本体のGPU A/B | Layer-discrimination Evidence (long blackout only) | 2026-09-20 Project owner Observation | ZizAI本体ではGPU ONで長いblackoutがあり、`QTWEBENGINE_CHROMIUM_FLAGS="--disable-gpu"`では長いblackoutを再現しなかった。このA/Bは**ZizAI本体の長い**failureについてだけGPU acceleration pathの関与を支持する。GPU driver単体、Chromium compositor、QtWebEngine surface lifecycleのいずれがroot causeかは未確定であり、minimalの瞬間黒化へ一般化しない。 |
| GPU／compositor diagnostic log | Layer-discrimination Evidence | `%TEMP%/TASK-039_gpu-compositor.log` (`afb7bf64fe910da1db2ce2e99bf5f81a681dc462a1c43405963d076355b6ff67`)、Project owner reported blackout around 11:51:15 | QtとChromiumはいずれも同じAMD Radeon GPUを使用し、ANGLE D3D11、QSG RHI D3D11、GPU Compositing enabled、Native compositor、GaneshGL、D3D11 outputで初期化された。Direct Composition disabled、overlays unsupported、D3D Shared Images unsupported、`in-process-gpu`。全logでは`Displays updated` 6件、SharedImage初期化5件、DXGI→D3D11 import試行11件。startup後は各3件、3件、8件だけで、頻発した全resize／blackoutを記録していない。11:51:15±5秒にgraphics行はなく、最近傍の11:51:20.777／20.782を一意にblackoutへ対応付けできない。import成功を示す行ではなく、失敗logもない。 |
| Claude Opus read-only whole-log review | Independent Review | 2026-09-20 Claude Code Opus（Read／Grep／Globのみ）、Codexによる実log再集計 | 現loggingは初期化・一部resource allocation／import試行を記録するが、draw／swap／present／PresentationFeedback／LocalSurfaceId／occlusion／Qt RHI swapchainを時刻付きで記録しないため、正常resizeとblackout resizeを識別できないとの指摘。Codex再集計もevent件数とblind spotを確認した。`Renderer.ProcessLifetime3.MainFrame`は1件・149661msでsession全期間に一致し、このcaptured sessionのrenderer crashは否定。Windows System Event Logの11:48〜11:53にもDisplay／TDR関連eventは検出されなかった。 |
| minimal `QWebEngineView`のGPU A/B | Strong Layer-discrimination Evidence (transient blackout only) | `%TEMP%/TASK-039_minimal_webengine.py`、`%TEMP%/TASK-039_minimal_webengine.log`、2026-09-20 13:18前後のProject owner Observation | static minimal HTML＋native `QMainWindow` frameで、右端を横へ拡大しmouse release後に一瞬blackoutして即時自動復帰した。GPU ONでも`QTWEBENGINE_CHROMIUM_FLAGS="--disable-gpu"`でも同じ瞬間黒化がある。よってminimalの瞬間黒化はGPU acceleration依存ではなく、minimalだけからGPU pathを原因候補として支持しない。GPU ON logにはAMD／ANGLE D3D11、QSG RHI D3D11、Native compositor／D3D11 outputが記録され、13:18には17回の`resize_event`と17回の`resize_settled`（WebView幅274〜1856px）、各resize後のSharedImage初期化／DXGI→D3D11 import各17回がある。Qt windowは`\\\\.\\DISPLAY1`、window／screen DPR 1.0のままで、`screen_changed`／`render_process_terminated`は0件、明示的GPU／compositor failureも0件だった。ZizAI固有HTML／CSS／JS、custom chrome、frameless window、`startSystemResize`が**瞬間黒化**に必要とはいえない一方、ZizAI本体で観測した長いblackoutの必要条件から外す根拠にはならない。視覚的blackoutを個別timestampへmarkしていないため、SharedImage／DXGI行を原因へ一意に結び付けない。 |
| D2 real `home.html`のGPU A/B | Strong Factor-interaction Evidence (long blackout) | `%TEMP%/TASK-039_d2_document.py`、GPU ON `%TEMP%/TASK-039_d2_document.log` (`EDE682BD27E2D810354C3D9782254285F5019E5035E1284649504204AAFC4749`)、GPU OFF `%TEMP%/TASK-039_d2_document_gpu_off.log`、2026-09-20 Project owner Observation | baseline static HTMLとD1 attach timingはGPU ONでtransientのみ。D2 real `home.html`はGPU ONでlong、同じD2を`--disable-gpu`で4回確認するとlong 0回だった。実`home.html`のdocument/source条件とGPU accelerated rendering pathの組み合わせがlong化に関係することを強く支持する。一方、どちらか単独の十分性、特定のHTML／CSS／JavaScript要素、GPU driver／QtWebEngine／Chromiumの具体的failure pointは未確定。 |

`レコーディング 2026-09-20 110816.mp4`の42秒を時系列で確認すると、約3〜10秒、18〜22秒、36〜40秒の3区間で黒化し、各区間後の約11秒、23秒、41秒では内容表示へ戻っている。黒化は複数のwindow幅で発生し、custom title bar／sidebarを含むWebView表示領域を覆う一方、背後のApplication表示は継続している。追加Observationではnative title barが正常表示を維持したため、native window全体のblackoutという表現は採用しない。このEvidenceだけではwindow size閾値、monitor／DPI境界、HTML paint、QtWebEngine／Chromium compositor、GPU renderingのいずれも確定できない。active resize中とmouse release後の相関を、monitorごと・rendering layerごとに分離して確認する。

## Responsibility and canonical-source preflight

| Candidate | Classification | Ownership / update path |
| --- | --- | --- |
| `apps/desktop/host.py` | Application Desktop host / canonical Project source | `architecture.md`が定めるPySide6／QtWebEngine host。root cause確定後、直接修正可能。 |
| `apps/gui/js/app-shell.js`、`apps/gui/js/app.js` | Application Frontend adapter | window commandのBridge呼出のみ。native edge resizeやQtWebEngine repaintのroot causeではない限りRead Scopeのみ。 |
| `apps/gui/vendor/*` | vendor / mirror | 本Taskの直接Edit Scopeへ入れない。vendorの直接patchは禁止。 |
| Qt／PySide6／QtWebEngine | external dependency | version更新はScope外。upstream defectの疑いが残る場合は再現最小化とupstream issue調査を別判断する。 |

## Root cause hypotheses and required discrimination

以下はH1修正前に記録した仮説と当時のsource状態である。現在の実装と結果はStatusおよびImplementation evidenceを参照。

1. **H1 — startup resize handles are below the central WebView (highest confidence).**
   - `host.py`では`window.install_resize_handles()`後に`window.show()`し、後段で`window.setCentralWidget(view)`を呼ぶ。
   - `FramelessMainWindow.changeEvent()`は`WindowStateChange`時だけ`_update_resize_handles_visibility()`を呼び、normal stateへ戻るとhandleを`raise_()`する。
   - これは「起動直後はresizeできないが、maximize／restore後はできる」と一致する。
2. **H2 — WebView-side rendering failure (unresolved; layer not yet identified).**
   - native title barが表示を維持するため、主なfailure boundaryは`QWebEngineView`側にある可能性が高まった。
   - HTML／CSS／JavaScriptのlayout・paintと、QtWebEngine／Chromium compositor／GPU surfaceのfailureは未分離である。custom title bar／sidebarもHTML UIなので、それらの同時黒化だけでは層を判定できない。
   - `resizeEvent()`はresize handleとretry overlayのgeometryだけを同期し、screen change／DPI changeでWebView repaintを観測・同期する処理はない。ただし、この欠落だけを原因とは扱わない。
   - captured diagnostic sessionでは`Renderer.ProcessLifetime3.MainFrame`がsession全期間と一致し、renderer crashは否定された。`in-process-gpu`のため独立GPU process crashとして観測する構成でもない。device lost／TDR、presentation failureは別観測を要する。
   - source上のresponsive breakpointはhomeの`980px`、共通の`768px`／`640px`等であり、`1223px`のliteral breakpointは存在しない。以前の`devicePixelRatio=1.25`仮定はdiagnostic sessionのreported scale `1.05`と一致せず、そのsessionでは980px breakpoint照合説を支持しない。実際の`innerWidth`／DPR取得前に完全排除はしない。
   - blackoutを観測したHomeは`app.js`をloadせず、`app-shell.js`と`app.home.js`を使用する。Homeのwindow `resize` listenerはshell content heightの同期だけで、source上にwidth thresholdやrelease後timerはない。Dataflow用`app.js`の120ms panel geometry同期をHome再現の原因候補へ混ぜない。
   - CSS breakpoint遷移、Homeの即時JavaScript resize処理、QtWebEngine surface resizeを同じ現象として扱わず、runtime値と発生時刻で分離する。
3. **H3 — GPU-accelerated QtWebEngine／Chromium rendering path for ZizAI long blackout (highest current priority; root cause unresolved).**
   - monitorごとのresolution、scale、primary／secondary、windowが境界を跨いだか、blackoutがmouse release後も残るかを記録し、H2と分離する。Applicationが観測・修正できる問題か、upstream／environment issueかを決めるまでdependency更新を行わない。
   - ZizAI本体のmonitor条件を固定したA/Bでは、GPU ONだけに長いblackoutがあり、GPU無効起動では長いblackoutを再現しなかった。この結果はZizAI本体の長いfailureに限ってGPU-accelerated pathへの依存性を支持するが、GPU driver単体をroot causeとは断定しない。minimalの瞬間黒化はGPU ON/OFFの両方であるため、同一failure modeまたはH3の独立根拠として扱わない。
   - diagnostic logではQt／Chromiumのmulti-GPU mismatchは認められず、両方とも同じAMD Radeon／D3D11 pathを使用する。SharedImage再生成とDXGI→D3D11 texture importは試行として記録され、失敗logはないが、成功完了やその後のpresentationは記録されない。surface再割当からpresentationまでの未記録区間、またはcontent-dependent compositingを次に分離する。
   - GPU無効化は診断用A/B条件であり、恒久修正、default flag、workaroundとして採用しない。
   - D2ではGPU ONでlong、GPU OFFで4回ともlongなしだった。baseline／D1がGPU ONでもtransientであるため、GPU acceleration単独ではなく、実`home.html`の描画条件とのinteractionを次に分解する。
   - minimalのstatic HTML＋native frameではGPU ON/OFFとも瞬間黒化だけで即時復帰する。これはZizAI固有HTML／CSS／JS、custom chrome、frameless window、`startSystemResize`が**瞬間黒化**の必要条件ではないことを示すが、長いblackoutを同じfailure modeとして扱わない。長時間化はZizAI固有のpage、attach timing、host integration、frame／resize pathの単独または相互作用を別に切り分ける。
   - 最小logはresizeごとのsurface allocation／DXGI importを捕捉したが、presentation／swap／occlusionを捕捉せず、視覚的blackoutのground truthも個別timestampへ付与されていない。ZizAI logと共通して明示的GPU error／renderer crashを示さない。allocation件数はminimal GPU ONで17組、ZizAIで5 SharedImage／11 importだが、操作数とground truthが異なるため件数差を原因とは扱わない。

### Next diagnostic design: isolate the ZizAI condition that extends blackout duration

Application sourceは変更せず、一時diagnostic harnessだけを使う。比較対象は「blackoutの有無」ではなく、mouse release後に250ms時点でもclient領域が黒いか（long）、250msより前に戻るか（transient）とする。各armは同じmonitor、初期logical size 1440×960、右辺を20〜50px拡大、mouse release、GPU ONで開始する。各armでは4回まで反復し、blackoutが発生したときだけ短いcaptureとrelease時刻を保存する。baselineのminimal GPU ON/OFFは既にtransientと確認済みなので、再実施しない。

最初にbaselineからの単独差分を確認し、D1、D2、D3はそれぞれbaselineへ戻して実施する。すべてtransientの場合だけ、直前にtransientだったarmへ変数を1つずつ積み上げる。**最初にlongとなったarmで止め、そのarmだけGPU OFFを再実施する。** したがって後続armを同時に増やしたり、long発生後に別の原因候補を混ぜたりしない。

1. **D1 — attach timing only:** native frame＋static minimal HTML＋default WebEngineを維持し、`QWebEngineView`をshow前にattachするbaselineから、ZizAIと同じ「placeholderをshowしてからviewをattach」へだけ変更する。
2. **D2 — document only:** native frame・show前attach・default `QWebEnginePage`を維持し、static HTMLから`file://`で実`apps/gui/home.html`をloadする。bridge不在のpage初期化失敗はlong blackoutと混同せず、このarmをinvalidとして記録する。
3. **D3 — frameless/system-resize path only:** static minimal HTML・show前attach・default WebEngineを維持し、native frameから`FramelessMainWindow`、resize handle、`startSystemResize`へ変更する。frameless windowだけでは同じOS resize操作を成立させられないため、このframe/input pairは検証可能な最小の不可分例外として扱い、他のhost integrationは追加しない。
4. **D4 — attach + document interaction:** D1とD2がともにtransientの場合にのみ、D2へattach timingを追加する。D2からの差分はattach timingだけであり、ここで初めてlongとなればpageとattach lifecycleのinteractionとして分類する。
5. **D5 — add frameless/system-resize to the last transient page/lifecycle arm:** D4がtransientならD4へ、D4がinvalidなら最後のvalid transient document armへ、D3で検証済みのframe/input pairだけを追加する。ここで初めてlongとなれば、page/lifecycleとframe/input pathのinteractionとして分類する。
6. **D6 — Profile only:** D5がtransientの場合に限り、同じwindow・document・attach・frame/input条件のまま、productionと同名の`QWebEngineProfile`を使うが、cache、interceptor、custom page、channel、Bridgeは追加しない。
7. **D7 — profile cache only:** D6がtransientの場合に限り、既存profileへproductionと同じDisk HTTP cacheだけを追加する。
8. **D8 — request interceptor only:** D7がtransientの場合に限り、既存profileへ`LockedDownRequestInterceptor`だけを追加する。profile identity、cache、request policyを別に判定する。
9. **D9 — Page only:** D8がtransientの場合に限り、同じprofile設定のままdefault pageを`LockedDownPage`へ置き換える。
10. **D10 — QWebChannel only:** D9がtransientの場合に限り、同じpageへ`QWebChannel`をattachするが、object登録とBridgeRuntimeは追加しない。
11. **D11 — Bridge only:** D10がtransientの場合に限り、productionと同じ`BridgeRuntime`／`WebViewBridge`をchannelへ登録する。Bridgeを成立させる最小runtime callback以外のApplication機能や操作は追加しない。

#### D1 preparation and manual evidence (2026-09-20)

- Harness: `%TEMP%/TASK-039_d1_attach_timing.py`。baseline `%TEMP%/TASK-039_minimal_webengine.py`と同じstatic HTML、native `QMainWindow`、default page/profile、logging、250ms `resize_settled`を維持する。
- D1だけのlifecycle差分: `QWebEngineView`を先に生成・static HTMLへ設定したまま、`QWidget` placeholderをcentral widgetとして`show()`／`app.processEvents()`し、その後で`setCentralWidget(view)`する。これは`apps/desktop/host.py`のplaceholder→show→processEvents→view attachの順序を再現する。一方、productionのpage loadはattach後であるが、D1はbaselineとの差分をattach timingだけに閉じるためload時点は変更しない。
- Claude Code Opus independent review: `Read`／`Grep`／`Glob`のみ。判定は「実機testへ進める」。Profile/cache/interceptor/custom Page/QWebChannel/Bridge、frameless／`startSystemResize`、animation／forced repaint、timer変更の混入なしを確認した。startup snapshotだけもbaselineと同じview参照を持つよう、`set_diagnostic_view(view)`はplaceholder前に設定した。
- Focused checks: ephemeral D1 structural contract PASS、`.venv\\Scripts\\python.exe -m py_compile %TEMP%/TASK-039_d1_attach_timing.py` PASS、一時startup smokeで`startup_environment`と`shown` snapshotを確認（stderr 0）。
- Manual result: 同じmonitor／window状態で右辺を拡大して4回実施した結果は`transient, transient, transient, transient`。各回とも増えた領域だけが一瞬黒化し即時表示へ戻り、250ms後も黒いlong blackoutは0回だった。D1のattach timing単独はlong化条件として非支持とする。D1 GPU OFF A/Bは不要で、D2へ進む。

#### D2 preparation and manual evidence (2026-09-20)

- Harness: `%TEMP%/TASK-039_d2_document.py`。baselineからのruntime差分は、`setHtml(..., about:blank)`を`file://`の実`apps/gui/home.html`へ置換するdocument/source軸だけ。native frame、attach-before-show、default page/profile、snapshot、250ms timerは維持する。
- Claude Code Opus independent review: `Read`／`Grep`／`Glob`のみ。判定は「実機testへ進める」。`zizai.py`とproduction hostが同じ`apps/gui/home.html`をtargetにすること、Profile/cache/interceptor/custom Page/QWebChannel/Bridge、frameless／`startSystemResize`、rendering behaviorを変えるtimer／animation／repaintがD2へ混入していないことを確認した。
- Bridge不在は`bridge.js`がtransportなしで正常returnし、Homeは空のrecent project/template表示へfallbackするため、単独ではinvalidにしない。初期表示でHome UIが出ない、renderer／render target fallbackが出る、Chromium error pageまたはunstyled sourceが出る、`render_process_terminated`が出る場合だけ`INVALID`としてblackout分類から除外する。
- Manual result: Project ownerがGPU ONでD2を実施し、15:02〜15:03頃にlong blackoutを確認した。baseline static HTMLはtransient、D1 attach timing単独も4回すべてtransientであり、D2（実`home.html`をloadするdocument/source条件）が最初のlong発生armである。D3以降は実施しない。D2 logは`%TEMP%/TASK-039_d2_document.log`、SHA-256は`EDE682BD27E2D810354C3D9782254285F5019E5035E1284649504204AAFC4749`（Codexが照合済み）。
- GPU OFF A/B: 同じD2 harnessを`QTWEBENGINE_CHROMIUM_FLAGS="--disable-gpu --enable-logging --log-level=0 --v=1"`で起動し、Project ownerが4回確認した結果はlong 0回だった。logは`%TEMP%/TASK-039_d2_document_gpu_off.log`、SHA-256は`F0CF82862644FDF121A12B73C885B9DE6F161229F25E00CE2CBFAC2016DD6C60`（process終了後にCodexが照合済み）。`startup_environment`で`--disable-gpu`を確認し、同sessionに`screen_changed`／`render_process_terminated`はない。
- Log analysis: 15:02:49.828〜15:02:56.494の9組の`resize_event`／250ms後`resize_settled`では、WebView幅が967〜1876 logical pxへ変化しても、すべて`\\.\DISPLAY1`、screen/window DPR 1.0のままだった。`screen_changed`と`render_process_terminated`は0件で、`device lost`、GPU process crash、present/swap/DXGI failureの明示行もない。15:03:16.702の`Displays updated`は主な15:02のresize列より後であり、window snapshotは引き続き`DISPLAY1`／DPR 1.0なので、long blackoutの原因には対応付けない。
- Limits and disposition: 実行中にpageの`blur`対象がnullという非fatal JavaScript console errorが2件あるが、manual実行でHome UIは有効に表示されており、これをlong blackoutの原因とは扱わない。現loggingはvisual blackoutのground-truth時刻、draw/swap/present/occlusion完了を記録しないため、正常resizeとlong blackout resizeをlogだけで識別できない。D2 GPU A/Bは**実`home.html`のdocument/source条件とGPU accelerated rendering pathの組み合わせがlong化に関係する**ことを強く支持するが、特定のHTML/CSS/JavaScript要素、GPU driver、QtWebEngine compositorをroot causeとは断定しない。次はD2 factor-decomposition planへ進む。
- Focused checks: ephemeral D2 structural contract PASS、`.venv\\Scripts\\python.exe -m py_compile %TEMP%/TASK-039_d2_document.py` PASS、一時startup smokeで`startup_environment`と`shown` snapshot、`render_process_terminated`なしを確認（stderr 0）。startup smokeは上記のProject owner実機判定とは別の事前確認である。

#### D2 factor-decomposition diagnostic plan (supersedes D3 onward)

D2が最初のlong armとなったため、元のD3〜D11は実施せずsuspendする。次の目的は、GPU ONのreal `home.html`でlong化に必要な**描画条件**を特定することであり、Application sourceは変更しない。すべて一時diagnostic harness／fixtureだけで行い、native frame、attach-before-show、default Profile／Page、1440×960、同一monitor、右辺20〜50px拡大、mouse release、4回まで、250ms判定を固定する。各armはGPU ONで開始し、同時に変更する独立変数を1つにする。

共通ルール:

- D2 GPU ONをpositive control、D2 GPU OFFをnegative controlとする。環境またはsessionが変わった場合だけpositive controlを1回再確認し、各armごとに同じ確認を繰り返さない。
- diagnostic fixtureはproduction assetをcopyして編集せず、variant manifestへ元path、SHA-256、有効／無効にした単一条件を記録する。Application／vendor sourceは直接変更しない。
- `long -> transient`へ変わったarmは、その条件が当該harnessで必要であることを示す候補に留める。同じ条件だけを戻して`long`へ復帰する再確認後にnecessary contributorと分類する。十分条件やroot causeとは呼ばない。
- Home shellが構築されない、想定DOMが欠ける、Chromium error page、unstyled source、未処理例外による初期化停止、`render_process_terminated`があるarmは`INVALID`とし、transientとして数えない。
- 最初に有効な必要条件候補を得たbranchだけを細分化する。複数のstylesheet、DOM region、script behaviorを同時に変更しない。

順序:

1. **E1 — file navigation control:** baseline minimal HTMLを一時fileとして保存し、D2と同じ`setUrl(file://...)`でloadする。baselineとの差分をlocal-file navigationだけにして、D2の`setHtml -> setUrl`変更がlong化へ寄与するか分離する。E1がlongならHome固有分解を停止し、file navigation／resource load pathを先に調査する。
2. **E2 — JavaScript execution gate:** D2を維持し、default pageの`JavascriptEnabled`だけをfalseにする。real `home.html`、CSS、file URL、GPU ONは維持する。longならJavaScript実行とJS生成DOMは必要条件ではない。transientなら「JavaScript依存状態が必要」とだけ判断し、特定scriptやcallbackを原因としない。
3. **E3 — rendered-DOM snapshot gate:** E2がtransientの場合、正常なD2 load後のDOMをsnapshotし、script要素とinline handlerを含まない静的fixtureとして同じproduction CSS参照でloadする。shell region数、主要class、viewport size、computed grid tracksがD2と一致することをvalidity conditionにする。longならactive JavaScriptは不要で、JSが生成したDOM＋CSS側へ進む。transientならactive JavaScript／runtime mutation側へ進む。
4. **E4 — author CSS gate:** full D2のJavaScriptと生成DOMを維持し、load完了後にauthor stylesheetの`disabled`だけを切り替える。同じpost-load diagnostic hookをno-opで実行するcontrolも用意し、hook自体を交絡させない。CSS無効化後も主要DOMとscript初期化が維持されることを確認する。longならauthor CSSは必要条件ではない。transientならCSSまたはCSSと生成DOMのinteractionを細分化する。E2／E3と結果を組み合わせ、JS停止によるDOM欠落をCSS原因と誤分類しない。

##### E1 preparation and intermittent manual evidence (2026-09-20)

- Harness: `%TEMP%/TASK-039_e1_file_navigation.py` (`F7483CE0D06CFBAB6F5EC1351A9137C4FF67FA8B75ECA86472C83AA9686AAFF8`)。Fixture: `%TEMP%/TASK-039_e1_minimal.html` (`04269B8FD6E1604F4C26681304DE3BDABDF3A541672D1581D19738DD1B7397C8`)。
- RED: E1 script／fixtureの不在をstructural contractが期待どおり検出した。GREEN: 改行を正規化したfixture textがbaseline `HTML` literalと一致し、E1 scriptから`Path` import／fixture constantを除外して`setUrl(file://...)`をbaselineの`setHtml(..., about:blank)`へ戻すと全文一致した。native frame、attach-before-show、default WebEngine、1440×960、250ms timer、logging wiringは変更していない。
- Claude Code Opus independent review: sandbox内接続はfirewallで失敗したため、承認済みsandbox外経路で`Read`／`Grep`／`Glob`だけを許可して再実施した。判定は「実機testへ進める」。Profile／cache／interceptor／custom Page／QWebChannel／Bridge、frameless／`startSystemResize`、animation／forced repaint／continuous timer、production CSS／JavaScript、real `home.html`の混入なしを確認した。E1が判定できるのはmain documentの`setHtml/about:blank`と`setUrl/file://`の差であり、file subresource loadや具体的rendering root causeは判定できない。
- Focused checks: `.venv\\Scripts\\python.exe -m py_compile %TEMP%/TASK-039_e1_file_navigation.py` PASS。GPU ON startup smokeでは`QTWEBENGINE_CHROMIUM_FLAGS="--enable-logging --log-level=0 --v=1"`、`startup_environment`／`shown`／1440×960／`\\.\DISPLAY1`／DPR 1.0、4秒後もprocess alive、`render_process_terminated`なしを確認した。Chromium logで`FileURLLoader::Start: file:///C:/Users/<user>/AppData/Local/Temp/TASK-039_e1_minimal.html`を確認した。
- Validity: 実機では薄紫背景、紫枠、`TASK-039 minimal QWebEngineView`見出しがbaselineどおり表示されることを最初に確認する。error page、空白、別contentなら`INVALID`としてresize判定へ進まない。E1結果が出るまでE2以降を実装しない。
- Manual observation: Project ownerが15:57頃にE1でlong blackoutを1回観測した。その後diagnostic環境変数をすべてresetして同じE1を再実行するとlongは発生しなかった。先のlong観測はEvidenceとして維持するが、E1のfile navigation単独で再現済みとは扱わず、分類を`intermittent / reproducibility unresolved`とする。既存`%TEMP%/TASK-039_e1_file_navigation.log`は16:00:52開始のlogging-enabled sessionで、visual longのground-truth markerを持たないため、15:57のlongへ個別対応付けしない。
- Confound: `--enable-logging --log-level=0 --v=1`はdiagnostic出力、I/O、thread scheduling、timing／performanceへ影響し得る。logging flagsがlongの原因または必要条件とは未確定だが、E1 navigation評価を進める前にcontrolled A/Bで分離する。E2以降は停止する。

##### E1 Chromium logging controlled A/B

- Harness、fixture、GPU ON、monitor、DPR、初期1440×960、window位置、操作幅、release後250ms判定を固定し、変更変数を`QTWEBENGINE_CHROMIUM_FLAGS`の有無だけにする。`QT_LOGGING_RULES`、`QTWEBENGINE_REMOTE_DEBUGGING`、`CHROME_LOG_FILE`は全armでunsetする。
- **A1 — flags absent:** `QTWEBENGINE_CHROMIUM_FLAGS`をunsetする。startup snapshotが空文字であることを確認する。1440→約1480pxの拡大release、約1480→1440pxの縮小releaseを4 cycle、計8 release観測する。
- **B1 — flags present:** A1と同じ新process／操作順で、`QTWEBENGINE_CHROMIUM_FLAGS="--enable-logging --log-level=0 --v=1"`だけを設定する。
- **A1 manual result (2026-09-20):** Project ownerはflags absent（`qtwebengine_chromium_flags: ""`）で8 releaseを実施し、long blackoutは0件だった。logは`%TEMP%/TASK-039_e1_A1_no_flags.log`（67,414 bytes、SHA-256 `5774DF88E237BA59D3E5E9805215BE7FBD6E6D7A0A1FF2FB528D74C7FC11CB84`）。startup snapshotは空文字を確認し、harness raw geometry callbackは`resize_event`／`resize_settled`ともに34件だった。これは手動release数ではなく、1回の操作中に生じるgeometry callbackを含むため、8 releaseとの不整合ではない。logにはvisual blackoutの直接markerがない。A1はlogging flagsとの相関候補を残すが、間欠性のため、flagsなしがlongを防ぐこと、またはlogging flagsが原因・必要条件であることを証明しない。B1完了までE2以降は停止する。
- **B1 manual result (2026-09-20):** Project ownerはlogging flags present（`QTWEBENGINE_CHROMIUM_FLAGS="--enable-logging --log-level=0 --v=1"`）で、A1と同じE1 harness・操作条件により8 releaseを実施し、long blackoutは0件だった。A1／B1とも8/8 longなしであるため、logging flagsがE1のlongを誘発する仮説は非支持とする。ただし、15:57のE1 long観測は有効な視覚Evidenceとして残し、E1 file navigation単独の分類は引き続き`intermittent / reproducibility unresolved`とする。A/B controlled checkは完了し、E2へ進む。E2以降はこの結論からlogging flagsを原因・必要条件として扱わない。
- A1／B1のいずれかだけでlongが出てもintermittent性を考慮し、直ちに因果確定しない。差が出た場合はA2／B2を同じ順序・回数で再確認する。両方でlongまたは両方でlongなしなら、logging flag効果は非確定のまま追加sampleまたは別交絡を検討する。
- 各armは8 releaseの`none／transient／long`を順番に記録する。longまたは判定困難時だけ短いcaptureを保存する。A/B完了までE1を確定せず、E2以降を実装しない。

##### E2 preparation — JavaScript execution gate (2026-09-20)

- Harness: `%TEMP%/TASK-039_e2_javascript_disabled.py`（SHA-256 `2BEA4B7EDAC1034D5A30D896423E39ED26A94075711D5BC4E01EAF7D8EC02812`）。D2を基準に、同じdefault `QWebEngineView` pageの`JavascriptEnabled`だけを`False`へ設定してから、同じ`file://`の実`apps/gui/home.html`をnavigationする。Profile、cache、interceptor、custom Page、QWebChannel、Bridge、native frame、attach order、1440×960、resize settle timer、GPU flagは変更しない。
- Passive diagnostics: `javascript_configuration`で`JavascriptEnabled=False`を、`load_finished`でlocal document navigationの成功だけを出力する。いずれもpage／rendering stateを変更しない観測であり、`render_process_terminated`、screen、DPR、resize snapshotはD2と同じ観測を維持する。
- Focused checks: `py_compile` PASS。短時間startup smokeではflags `--enable-logging --log-level=0 --v=1`、`javascript_configuration.javascript_enabled=false`、`file:///.../apps/gui/home.html`とCSS／icon subresource load、`load_finished.succeeded=true`、`shown`後の`\\.\DISPLAY1`／DPR 1.0を確認した。input／resize操作は行わず、確認用processは終了した。
- Claude Code Opus read-only review: `Read`／`Grep`／`Glob`のみでD2とE2を比較し、判定は「実機testへ進める」。同一の`HOME_HTML_PATH`／`setUrl(file://...)`、default page/profile、native frame、attach-before-show、1440×960、resize event／250ms settle timer、screen observerを確認した。runtime差分は`QWebEngineSettings` import、同じdefault pageへのnavigation前`JavascriptEnabled=False`、設定値と`loadFinished`の受動snapshotだけである。Profile/cache/interceptor/custom Page/QWebChannel/Bridge、frameless／`startSystemResize`、animation／forced repaint／`update()`は混入していない。`loadFinished`とearly `javascript_configuration`はD2にない出力イベントのため、log比較時はそれらをresize差分と扱わない。
- Validity: JavaScript無効化により通常のHome shell／recent project UIが構築されないことはexpectedであり、これ自体を`INVALID`としない。`javascript_configuration=false`、`load_finished=true`、Chromium error pageなし、`render_process_terminated`なしを満たしてからresizeを評価する。navigation failure、error page、renderer terminationは`INVALID`としてtransient／long判定に含めない。
- Manual result: Project ownerがGPU ON、real `home.html`、JavaScript disabled、load成功の条件で8 releaseを実施し、long blackoutは0件だった。D2のJavaScript ONではlongが観測されているため、active JavaScriptまたはそれが生成・変更するDOM状態がlong化に関係する候補を支持する。ただし、同じ条件を戻してlongへ復帰する再確認前であり、必要条件・root causeとは断定しない。

##### E3 preparation — rendered-DOM static snapshot gate (2026-09-20)

- Capture harness: `%TEMP%/TASK-039_e3_capture_snapshot.py`（SHA-256 `7CA41BAFB4A2A29B01A4F0C6B07B8AA0110977489DF94F01B7BDABD8CFC86185`）は、default `QWebEngineView`／default page/profile／native `QMainWindow`／1440×960／`file://.../apps/gui/home.html`をD2と同じ条件で一度だけloadする。`load_finished=true`から750ms後に生成済みDOMをcloneし、17個の`script`要素と0個のinline `on*` handlerを除外して、元URLへの`<base>`を追加した静的fixtureをTEMPへ出力する。production assetはcopy／editしない。
- Fixture／manifest: `%TEMP%/TASK-039_e3_home_snapshot.html`（SHA-256 `EF55DDE8907A0834AB9905F703ACE8D982C310DFA5A2693110ED087F19EDF837`）と`%TEMP%/TASK-039_e3_home_snapshot.manifest.json`（SHA-256 `23A1C420BF90C3EB2FB535D6AC17CB9A9FE0B910C6FD9EE695B9DDAF43B221CD`）。manifestはsource `home.html` SHA-256 `97787962d66c1455ecc529f177856e98516e433139d39f4e2d48569dd0377353`、viewport 1440×960、7 shell regions、class `zui-shell has-activitybar`、grid tracks `52px 0px 1388px 0px`／`0px 960px 0px 0px`を保持する。
- Manual harness: `%TEMP%/TASK-039_e3_static_snapshot.py`（SHA-256 `915B422A6EA0F8861583532CB24BE49D79946FC6676A1318AA3F373C1C341534`）はD2と同じnative frame、default page/profile、attach order、1440×960、resize／250ms settle／screen／renderer observer、GPU environmentを維持し、navigation documentだけをstatic snapshotへ置換する。JavaScript settingはD2と同じdefaultのままとするが、fixtureの`script_count=0`／inline handler count=0のためApplication JavaScriptは実行対象を持たない。fixture integrityおよびDOM／computed layout照合は一度だけの受動diagnostic queryであり、DOM変更、animation、forced repaintを行わない。
- Claude Code Sonnet read-only review: Opusが応答しなかったため同じ最小scopeをSonnetへ切替え、`Read`／`Grep`／`Glob`のみで判定は「実機testへ進める」。D2／E2／E3 staticの`DiagnosticWindow`、resize／screen／renderer observer、1440×960、default WebEngine条件が同一であり、E3ではdocument sourceをstatic snapshotへ替えることだけがbehavioral variableであることを確認した。Profile/cache/interceptor/custom Page/QWebChannel/Bridge、frameless／`startSystemResize`、animation／`update()`／`repaint()`は混入していない。capture processはfixture生成専用で、D2 vs E3 staticのmanual比較へは含めない。
- Focused checks: capture／static harnessとも`py_compile` PASS。fixtureのoffline auditはscript 0、inline handler 0、7 regionsを確認。static startup smokeはfixture／source SHA一致、`load_finished=true`、`static_snapshot_validation.valid=true`、7 region／class／viewport／grid tracksのmanifest一致、`\\.\DISPLAY1`／DPR 1.0を確認した。input／resize操作は行わず、確認用processは終了した。
- Validity: `fixture_integrity`が両方true、`load_finished=true`、`static_snapshot_validation.valid=true`、Chromium error pageなし、`render_process_terminated`なしを満たしてからresizeを評価する。不一致やnavigation／renderer failureは`INVALID`としてtransient／long判定に含めない。
- Manual result: Project ownerがE3を完了し、static snapshot条件でlong blackoutを再現した。添付Evidence `%TEMP%/codex-clipboard-f720a8a7-ab70-4940-a000-c609af5bedac.png`（46,197 bytes、SHA-256 `7E38004334359E3F2FC948A32879B58DC987D413D9E72EB1385554E2EC69FE9B`）ではnative title barは正常表示を維持し、title bar下の`QWebEngineView` client領域だけが全面黒化している。したがってactive JavaScriptはlong化の必要条件ではない候補を支持し、生成済みDOM＋production CSS側の分解へ進む。ただし、再現の間欠性とE3 fixtureのdocument-source差が残るため、特定CSS／DOM要素をroot causeとは断定しない。

##### E4 preparation — author CSS gate (2026-09-20)

- Harness: `%TEMP%/TASK-039_e4_author_css_gate.py`（SHA-256 `33FB82FCC2A6973E5C77EE255729D02FA7DD57B5C2B0B979B622B317489844EB`）。D2と同じ実`home.html`、active JavaScript、生成済みDOM、native `QMainWindow`、default page/profile、attach-before-show、1440×960、resize／250ms settle／screen／renderer observerを維持する。`load_finished`の750ms後に単一のstylesheet gateを実行し、`control`ではauthor stylesheetを変更せず、`disable-author-css`では`link[rel~="stylesheet"]`の9件だけを`disabled=true`にする。Profile／cache／interceptor／custom Page／QWebChannel／Bridge、frameless／`startSystemResize`、animation／forced repaint／continuous timerは追加しない。
- Claude Code Sonnet independent read-only review: `Read`／`Grep`／`Glob`のみでD2とE4を比較し、判定は「実機testへ進める」。同一window／page lifecycle、post-load hookの対称性、real `home.html`の9 stylesheet link、17 script、7 shell regionを確認した。レビューでcontrol側の自己検証が`enabled_stylesheet_count == 0`を誤って要求し、正常controlをinvalidと出力するdiagnostic-only bugを発見した。Application描画には影響しないが、実機判定を誤らせるため、`disabled_stylesheet_count == 0`へ最小修正した。
- Focused checks: `py_compile` PASS。GPU ON diagnostic logging（`--enable-logging --log-level=0 --v=1`）で、両modeをinput／resizeなしで4秒間startup smokeした。両方ともprocessは4秒後もalive、`load_finished=true`、`render_process_terminated`なし、`\\.\DISPLAY1`／DPR 1.0、1440×960を確認した。`author_css_gate.valid=true`かつcontrolはstylesheet 9件中enabled 9／disabled 0、disable-author-cssはenabled 0／disabled 9で、いずれもscript 17、7 shell region、`app_shell_root_present=true`を確認した。これはProject ownerの実機resize判定とは別の準備確認である。
- Validity: 各modeで`load_finished=true`、`author_css_gate.valid=true`、stylesheet 9、script 17、7 shell region、`app_shell_root_present=true`、Chromium error pageなし、`render_process_terminated`なしを満たしてからresizeを評価する。CSS無効化modeでunstyledな見た目になることは意図した変数でありINVALIDではない。navigation／renderer failure、gate不一致はINVALIDとしてtransient／long判定に含めない。
- Manual protocol: controlとdisable-author-cssは各々fresh processで同じGPU ON／monitor／window位置／1440→約1480→1440pxの4 cycle（8 release）を行う。longまたは判定困難時だけ短いcaptureを保存する。controlがlong、CSS無効化がtransientでも、再現の間欠性を考慮しCSSをnecessary contributorと確定せず、同一条件でCSSを戻すreconfirmationを要する。CSS無効化でもlongならauthor CSS全体は必要条件候補を支持しない。controlがlongなしの場合はpositive control不足として判定保留にする。
- Manual result — control: Project ownerがE4 controlでlong blackoutを観測した。native title barは正常表示を維持し、`QWebEngineView` client領域が全面黒化した。screenshot Evidenceあり。longの発生は「5回目の拡大release付近」の可能性があるが、操作回数は厳密に確認されていないため、発生回数・release番号の確定Evidenceには使わない。このcontrol resultはCSS無効化armを比較可能にするpositive observationであり、CSSの因果をまだ示さない。
- Manual result — control reconfirmation: Project ownerがfresh controlでlong blackoutを再現し、`tests/manual/result/レコーディング 2026-09-20 203309.mp4`（13,386,829 bytes、SHA-256 `3527A7FD550335110B19A28B65E165394C1DD37BADADF06D179CEFD8A3877CFB`）を保存した。今回の再実施では3回目の操作で発生したと報告されている。前回の「5回目付近」は未確定補助Observationのままとし、両者のrelease番号差は再現の間欠性または操作数記録の精度差として保持する。controlでlongが複数sessionにて観測されたため、CSS無効化armとの比較に必要なpositive observationは満たす。
- Manual result — disable-author-css: Project ownerが`author_css_gate.valid=true`、stylesheet 9件すべてdisabledの状態でlong blackoutを観測した。Evidenceは`tests/manual/result/レコーディング 2026-09-20 203817.mp4`（15,633,708 bytes、SHA-256 `2F3F3BEC55462B45952F7978C7886230B2409D8D6876C8045CE7002954FBB1B2`）。4回目の戻す／縮小release付近という報告は、操作回数を厳密に同期記録していないため補助Observationとしてのみ扱う。
- Video audit: Codexが14.466633秒、1918×1050の実videoを直接frame抽出して確認した。7.7秒ではunstyled contentが表示され、7.8秒ではnative title barが正常表示のまま`QWebEngineView` client領域が全面黒化し、記録終了まで少なくとも約6.6秒継続した。これはProject ownerの視覚Observationと一致する。frame時刻はvideo timeline上の観測であり、4回目のrelease時刻を独立に確定するものではない。
- E4 disposition: controlとdisable-author-cssの両方でlongを再現したため、resize時にactiveなauthor CSSはlong化の必要条件として非支持とする。stylesheet単位・declaration単位の細分化には進まない。ただしCSSはload完了後750msまで一度適用されており、pre-disable layout／resource／compositor historyを除外した結果ではない。特定DOM、CSS、GPU componentをroot causeとは断定しない。

##### D2／E2／E3／E4 evidence synthesis and next diagnostic plan

- D2は実`home.html`、JavaScript ON、author CSS ON、GPU ONでlong、GPU OFFで4回ともlongなしだった。実document条件とGPU accelerated pathのinteractionを支持するが、page内要素は未分離である。
- E2はJavaScript disabledで8 releaseともlongなしだったが、shell生成を含むDOM state自体がD2と異なるため、active JavaScriptだけの必要性を単独では判定しない。
- E3は生成済みDOMのstatic snapshot、Application script／inline handlerなし、author CSS ONでlongだった。active JavaScript実行は必要条件として非支持であり、生成済みDOMまたはそのdocument stateを候補として残す。
- E4は生成済みDOMとJavaScript実行履歴を維持したまま、author CSS ON／OFFの両方でlongだった。resize時にactiveなauthor CSSは必要条件として非支持であり、stylesheet細分化は停止する。
- E3は「active JavaScriptなし／CSSあり」、E4 variantは「JavaScript実行履歴あり／active CSSなし」であるため、「active JavaScriptなし／active CSSなし」の組合せが未検証である。両armの結論を単純合成してDOM単独と断定しない。

次の最小armは**E5 — static generated DOM＋author CSS gate**とする。

1. E3の既存static snapshot、fixture hash、native frame、default page/profile、attach order、GPU ON、1440×960、screen／DPR、resize／250ms settle observerをそのまま維持する。fixtureを再captureしない。
2. E4と同じ750ms post-load hookだけを追加する。controlはno-op、variantは9件のstylesheet linkをすべて`disabled=true`にする。control／variant間で変更するbehavioral variableはauthor CSSのactive stateだけとする。
3. E3 fixtureはscript要素が0件なので、E4の`script_count > 0` gateを流用しない。E5専用validityは`script_count == 0`、stylesheet 9件、7 shell region、`app_shell_root_present=true`、fixture／source hash一致、mode別disabled count一致、`load_finished=true`、Chromium error pageなし、`render_process_terminated`なしとする。
4. controlをfresh processで先に実施し、longを独立に再現できた場合だけvariantを評価する。controlが8 releaseでlongなしならpositive control不足としてE5をinconclusiveで停止する。
5. variantでlongを再現した場合、active JavaScriptとresize時のactive author CSSのどちらもないstatic generated DOM／document state branchを優先する。ただしpost-loadまでCSSが一度適用されたhistoryとGPU pathは残るため、DOM単独の十分性またはroot causeとは呼ばない。
6. variantでlongなしの場合、直ちにDOMを削除せず、CSS active stateまたはJavaScript／document lifecycle historyが代替的に寄与する可能性としてpaired restorationを設計する。

E5 variantがpositiveの場合だけ、次段階でDOMを1 armにつき1 subtreeずつ除外する。最初はbody直下でshellと独立し、E3では`display:none`／`aria-hidden=true`の`#appDialog`を除外する。その後もpositiveなら`main`、`activitybar`、残る`data-shell-region`をそれぞれ別armとし、複数regionを同時に除外しない。最初に`long -> transient`となったarmで停止し、元subtreeを戻したfresh positive reconfirmation後にだけcontributor候補とする。必要なら同じgeometryを保つinert placeholder armを別に設け、subtree contentとlayout footprintを分離する。Application source、production asset、stylesheet細分化は変更しない。

- Claude Code Sonnet independent read-only review: E5は未検証の組合せを埋める最小single-variable armとして妥当と判定した。一方、E4 gateの`script_count > 0`をE5へ流用するとstatic fixtureを常にinvalidにするため、E5では`script_count == 0`へ変更する必要があるとの指摘を採用した。post-load CSS無効化が初回layout／compositor historyを消さないこと、E3 fixtureのdocument source差、間欠性によるfalse negative／positiveはRemaining uncertaintyとして維持する。
- E5 harness and independent review: `%TEMP%/TASK-039_e5_static_author_css_gate.py`（SHA-256 `8B68BCDD6799FC955468652D2011F1E202871185AC37351B3FF22BE3306E5D44`）を作成した。Claude Code Sonnetは`Read`／`Grep`／`Glob`だけでE3／E5／snapshot／manifestを比較し、「実機testへ進める」と判定した。E3 controlとの差分は750ms post-load gateだけ、E5 control／variant間のbehavioral differenceは9 stylesheetの`disabled=true`だけであること、Profile／cache／interceptor／custom Page／QWebChannel／Bridge、frameless／`startSystemResize`、animation／repaintが不在であることを確認した。control hookはstylesheetを変更せず、DOM queryだけを行う。
- Focused checks: `py_compile` PASS。GPU ON diagnostic loggingでcontrolをinput／resizeなしで4秒間startup smokeし、process alive、fixture／source hash一致、`load_finished=true`、E3 static validation valid、`static_author_css_gate.valid=true`、script 0、inline handler 0、stylesheet 9件中enabled 9／disabled 0、7 shell region、`appShellRoot`あり、`render_process_terminated`なし、`\\.\DISPLAY1`／DPR 1.0／1440×960を確認した。controlのmanual positive後に同じharnessの`disable-author-css` variantもinput／resizeなしで4秒間startup smokeし、process alive、fixture／source hash一致、`load_finished=true`、E3 static validation valid、`static_author_css_gate.valid=true`、script 0、inline handler 0、stylesheet 9件中enabled 0／disabled 9、7 shell region、`appShellRoot`あり、`render_process_terminated`なし、`\\.\DISPLAY1`／DPR 1.0／1440×960を確認した。variant startup logは`%TEMP%/TASK-039_e5_disable-author-css_startup_20260920_212658.log`であり、Project ownerのresize判定とは別の準備確認である。
- Manual result — control: Project ownerはE5 controlで、ほとんどのresize後にlong blackoutを観測した。Evidenceは`tests/manual/result/レコーディング 2026-09-20 211942.mp4`（27,670,295 bytes、SHA-256 `B5EC5DE1EB96034B459330D92923535A6B06EF188A74CDE4C4D7F88D07EF1A39`）。Codexが24.9333秒、1918×1078の実videoを0.25秒間隔の全編frameと境界付近の原寸frameで確認した。videoではresize release後に対象windowの`QWebEngineView` client領域が全面黒化し、自動的に即時回復せず、次のwindow resize操作まで黒化状態を維持するケースと、次のresize操作を契機に表示が復帰するケースを確認した。黒化中もnative title barとwindow controlsは正常表示を維持している。video timeline上で黒化表示が観測できる時間には、Project ownerが次のresize操作を行うまで待機した時間が含まれるため、約3.8秒／約15.9秒という区間長をfailure固有の継続時間または原因分析の定量Evidenceとして使用しない。frame timelineは表示状態と操作前後関係のEvidenceであり、各黒化を特定のresize release番号へ一意に対応付けるものではない。E5 controlはvariant比較に必要なpositive controlを満たした。
- Manual result — disable-author-css: Project ownerは`static_snapshot_validation.valid=true`および`static_author_css_gate.valid=true`を含むvalidity条件を満たした状態で8 releaseを実施し、long blackoutは0件だった。同じstatic snapshotのcontrolではlongが高頻度で再現しているため、**static snapshot条件内では**resize時にauthor CSSがactiveである状態とlong blackoutの関連を強く支持する。ただしE4ではJavaScript実行／DOM mutation履歴があるreal `home.html`でauthor CSSを全無効化した後にもlongを再現しているため、author CSSを単独原因、全条件での必要条件、root causeとは扱わない。
- E4／E5 read-only review: Claude Code Sonnetが実E4／E5 harnessを`Read`／`Grep`／`Glob`だけで再比較した。E4はreal `home.html`、Application scriptあり、JS-driven DOM生成、実document URLである一方、E5はTEMPのstatic snapshot、script／inline handler 0、直列化済みDOM、manifest／hash照合、追加の受動`runJavaScript`によるcomputed layout検証を持つ。したがってE4 variantとE5 variantの結果差をCSSだけへ帰属できない。Claudeの初回案である「E4へno-op `runJavaScript`を1回追加」は、E5 control／variantが同じ受動検証を共有しながら結果が分かれているため、主interactionを分離する次armとしては採用しない。

以下の**E6 — initial author-CSS application history with active JavaScript**は旧提案として保持する。2026-09-21のProject owner承認により保留し、次節のE5 fixed-pair／CSS trigger reductionを優先する。上記DOM subtree除外案も保留し、実行しない。

1. canonical `apps/gui/home.html`のhashを固定し、Application sourceを変更せず、control／variantとも同じTEMP diagnostic file pathへfresh process起動前に生成する。両modeへ同一のcanonical `apps/gui/` base URLを入れ、stylesheet／script／image等の相対document resourceを同じcanonical URLから解決する。
2. control／variantともreal Application scriptを実行し、同じnative frame、default page/profile、GPU ON、1440×960、attach order、resize／250ms settle observer、750ms gateを維持する。Profile／cache／interceptor／custom Page／QWebChannel／Bridge、frameless／`startSystemResize`、animation／forced repaintは追加しない。
3. **Control:** 9件のauthor stylesheet linkを通常どおりinitial parse／load中にactiveにし、750ms gateで9件すべて`disabled=true`にする。**Variant:** 同じ9 linkだけをsource上でinitially non-applicableにしてnavigationし、750ms gateで`disabled=true`の最終状態へ揃える。variantのinitial gate属性はCSSがinitial paint／JS-driven DOM mutation中に適用されない方式とし、750ms時点でcontrolと同じlink属性／disabled stateへ正規化する。
4. source generatorはcontrol／variantの差分が9 stylesheet linkのinitial applicabilityだけであることを機械的に検証する。両modeでsource `home.html` hash、同一TEMP URL、script count、stylesheet count 9、stylesheet resource load／parse状態、7 shell region、`appShellRoot`、final enabled 0／disabled 9、final gate属性の同値、`load_finished=true`、Chromium error pageなし、`render_process_terminated`なしをvalidityへ含める。CSS内部の相対`url()`はcanonical stylesheet URL基準で解決されるため、documentの`base`だけでなく各stylesheetの実resolved URLも記録する。
5. E4の既存結果をcontrolとして流用せず、E6 controlをfresh processで先に実施する。controlでlongを再現できなければpositive control不足としてE6をinconclusiveで停止する。controlがlongのときだけvariantへ進む。
6. control long／variant longなら、JS実行履歴がある条件ではinitial author-CSS applicationはlong化の必要条件として非支持とし、document lifecycle／JS mutation履歴の次armを設計する。control long／variant longなしなら、initial CSS applicationとJS-driven document constructionのinteractionをcontributor候補として強く支持するが、root causeとは断定せず、variantの再現とinitial CSSを戻すpaired reconfirmationを行う。

Claudeのfollow-up reviewは、同一directoryへ置かない場合のrelative resource解決とCSS load確認を注意点として挙げた。CodexはApplication directoryへdiagnostic fileを置く案を採用せず、両modeで同一TEMP URLと同一canonical baseを使用し、新しいE6 controlを必須にする。stylesheetのresolved URL／`sheet` availabilityをvalidityで確認し、TEMP document lifecycleをpaired comparison内で固定する。残る交絡は、initial CSS適用の有無によってJSがcomputed styleへ応答すること、resource priority／paint historyが変わること、TEMP documentがcanonical E4 URLと異なることである。前二者はこのarmが意図して測る初期CSS履歴の下流効果であり、後者はE6 controlのpositive再現が得られた場合に限ってpaired判定を有効とする。

各有効armはvariant ID、source／fixture hash、GPU flags、screen／DPR、初期／resize後size、`loadFinished`、主要DOM count、JavaScript exception、4回の`transient／long`、`render_process_terminated`を記録する。映像はlongまたは判定困難時だけ短く取得し、raw log全体をRepository Evidenceへcopyしない。

各armの追加対象はcanonical `apps/desktop/host.py`にある既存componentだけとする。harnessから既存componentを安全に構成できない場合は、類似した代替実装やApplication source patchを作らず、そのarmをunresolvedとして停止する。D1〜D11のすべてがtransientまたはinvalidで、ZizAIだけlongのままなら、harnessと実Applicationの未分離条件を列挙し、Qt／Chromium tracingまたはETWによるPresent観測の導入可否をProject ownerが判断する。恒久flag、reload、forced repaint、Application修正はこの診断結果が出るまで行わない。

### Current diagnostic plan: E5 fixed pair, then CSS trigger reduction (2026-09-21)

- E5はroot cause確定条件ではなく、比較的再現性の高いtriggerの縮約用fixtureとする。E4のCSS無効後もlongというEvidenceは維持し、CSS単独原因／全条件での必要条件とは扱わない。
- 過去のE5「CSS OFF」は、**初期load時には9 stylesheetが有効で、loadFinished後750msに9本の外部stylesheet linkをdisabled化する条件**を指す。初期からauthor CSSを適用しない条件ではなく、inline styleも残る。750msはtimerの指定delayであり厳密な実行時刻保証ではない。
- 今回準備するのはcontrol／all-disabledの再確認pairだけ。既存`%TEMP%/TASK-039_e5_static_author_css_gate.py`とE3 snapshot／manifestは変更せず、`%TEMP%/TASK-039_e5_fixed_pair.py`を起動前後のhash照合・子process環境固定・新規log保存だけのlauncherとする。手順は`%TEMP%/TASK-039_e5_fixed_pair_plan.md`、固定manifestは`%TEMP%/TASK-039_e5_fixed_pair.lock.json`。Application／vendor sourceはRead Scopeのみ。
- 固定内容: 同一TEMP snapshot URL／base、9 stylesheetのURLとcascade順、参照resourceを包含する`apps/gui/`全fileのhash、harness／snapshot／original manifest／Python executable／launcher hash、PySide6 package version。sourceをcopy／rewriteせず、実行前後で不一致なら停止する。GPU設定は子processだけに既存Chromium logging flagsとQt context／compositor loggingを設定し、継承QT／QSG／QML overrideを除く。GPU acceleration実状態とbackendは実機stderrで別途確認する。
- 実機条件: tomoh interactive desktop、fresh process、DISPLAY1／Qt screen geometry 1920×1080／window・screen DPR 1.0、初期window／WebView 1440×960。両armで同じwindow位置、monitor設定、他Application状態を維持する。自動GUI操作・自動resize・repaintは追加しない。
- Geometry protocol (revised 2026-09-21): operatorへpixel幅と許容差を指定する方式を廃止する。左辺・上下を固定して右端だけを`EXPAND → COMPACT`の順に4回繰り返し、各release後約2秒無操作で観察する。EXPANDは初期windowより明確に広げ、COMPACTは右端をDISPLAY1中央付近へ移す粗い操作指示だけとし、実幅はlogからCodexが事後分類する。WIDEはWebView logical width 1200px以上、COMPACTは800〜960px、その他はOUT_OF_BANDとする。WIDE↔COMPACTは実装済み980px breakpointを跨ぎ、768／640px breakpointを跨がない意味のあるgeometry差である。exact widthはarm間の一致条件にしない。
- Geometry validity: 8 release longなしを暫定negativeとするには、各armでWIDE／COMPACT endpointが各3件以上、WIDE→COMPACT／COMPACT→WIDE transitionが各2件以上必要。OUT_OF_BANDはEvidenceに残すが比較から除外し、その場で補正resizeを追加しない。coverage不足はUNRESOLVEDでありoperator error／negativeとしない。screen／DPR、height、左・上端が変わった場合も同様に分離する。release ordinalはoperator記録とtimestampで対応させ、`resize_settled`件数だけから推定しない。
- controlで明確なlongを1回観測したらそこで停止し、新規Evidenceを記録する。8 releaseでlongなしならpositive control不足としてsession停止。control positiveとruntime validityを確認した場合だけall-disabled variantへ進む。variantは最初のlongで停止、8 release longなしは暫定negativeとする。初期validity不足、screen／DPR変更、resource load failure、renderer termination、操作列逸脱はnegativeではなくinvalid／unresolved。control早期停止時は共通操作prefixだけがpaired比較となる。
- pair成立後のみ、9 stylesheetを概ね4／5へ分割し、subset／complementのddmin型縮約を設計する。両側negativeならinteraction／非単調性を考慮し、細分化とcomplement除去を使う。cascade順、CSS variable依存、media条件を保持する。stylesheetが絞れた後だけrule→declaration/propertyへ進む。最小候補はfresh processの保持→除去→復帰で確認し、描画・presentation問題のtriggerとroot causeを区別する。
- E6、DOM subtree削除、Application修正、Full RISK-UI-001、commit／pushは保留。各armの設計／差分に対するClaude read-only reviewと実機結果を得るまで次armを準備しない。
- Preparation verification: 非GUIでsyntax、162-file inventory一致、9 stylesheet順、子process環境の隔離、fixture drift拒否を確認した。既存E5 harness SHA-256 `8B68BCDD6799FC955468652D2011F1E202871185AC37351B3FF22BE3306E5D44`、snapshot SHA-256 `EF55DDE8907A0834AB9905F703ACE8D982C310DFA5A2693110ED087F19EDF837`は不変。今回のinteractive startup／pair結果は未実施であり、過去のstartup smokeを今回のPASSへ流用しない。
- Claude Code Sonnet independent review: sandbox内で応答が得られなかった実行を停止し、承認されたsandbox外経路で`Read`／`Grep`／`Glob`だけを許可してfixed-pair設計とlauncher／既存E5差分をレビューした。判定は「実機testへ進める」。既存harness無改造、750ms post-load gateの差分、resource hash、子process環境隔離、今回partial maskを実装しないことを確認した。Codexも照合し、stdout relay等の準備overheadは両arm共通だがtiming無影響を証明しないため新pairの実機再確認を必須とする。screen／DPR／GPU backendは実logによる確認が残り、hash preflight PASSだけでruntime validity／manual PASSとはしない。
- Fixed lock SHA-256: `B4218291C8B1D3CE05D2E032E9798654AF6DE265DE63E48A0243B714B196CE06`。`git diff --check`および未追跡Task本文のwhitespace確認はPASS（既存LF/CRLF warningのみ）。固定pairはProject ownerのcontrol実施待ち。
- Fixed-pair control manual result (2026-09-21): Project ownerはcontrolをPOSITIVEと判定し、最初の拡大releaseでlongを観測した。release後の観察中に自動回復せず、回復確認を目的とする追加resizeは実施していない。screenshot／videoはないため、視覚ObservationはProject owner記録を正とし、logだけからblackout timestampへ一意に対応付けない。stdoutは`%TEMP%/TASK-039_e5_fixed_control_20260921_090839_925087.stdout.log`（21,624 bytes、SHA-256 `8427E2F216D2BB57753D7F2A8BA7AF7A9DD33E79C025827202CFDBC1BA903DF1`）、stderrは同prefixの`.stderr.log`（128,595 bytes、SHA-256 `1B645F467E57EA7DC6AB562424BA0A8941C0A0D8C56D36EA3001DBD6496F153C`）。fixture／source hash、load、static validation、gateはvalidで、script／inline handler 0、stylesheet enabled 9／disabled 0、DISPLAY1／geometry 1920×1080／DPR 1.0／initial 1440×960、GPU Compositing enabled、ANGLE AMD D3D11、QSG RHI D3D11を確認し、`screen_changed`／`render_process_terminated`はない。
- Geometry disposition: 旧1700／1100±20px protocolは、current幅をリアルタイムに確認できないoperatorへpixel精度を要求しており実行可能性が不足していたため撤回する。既存controlのfirst settled 1535pxはWIDEで、positive Evidenceを維持する。Project ownerが追加報告した`1515 → 943`もWIDE→COMPACTとして有効なgeometry Observationであり、operator errorとして無効化しない。ただしvisual resultとrelease ordinalを含む正式なvariant結果は未報告なので、この値だけからall-disabled armのpositive／negativeを判定しない。今後は上記semantic class coverageでpairを比較する。

### Current diagnostic priority: D2 supported graphics stack A/B (2026-09-22)

- Project ownerの方針変更により、E5 CSS ddmin、E6、DOM subtree削除は停止する。E5はroot cause確定条件ではなく、document／CSS stateがGPU presentation failureを顕在化させ得るEvidenceとして維持する。
- 次の最優先armは、既存D2（native `QMainWindow`、default `QWebEngineView`／Page／Profile、実`home.html`、attach-before-show、1440×960）を変更せず、graphics stackだけをWindows default D3D11からQtのsupported OpenGL alternativeへ切り替えるA/Bである。
- OpenGL armは`QSG_RHI_BACKEND=opengl`をprocess起動前に設定する。これは「Qt RHIだけ」を変える純粋なA/Bとは扱わない。Qt WebEngineが可能な範囲でChromium backendをQt側へalignするため、**supported graphics stack alternative全体**のA/Bとして評価する。Chromiumの`--use-gl`／`--use-angle`を個別に強制せず、GPU全面無効化もしない。
- 有効なOpenGL armは、実logで`QSG RHI Backend`、`QSG RHI Backend Supported`、`QSG RHI Device`／GPU、`Chromium GL Backend`、`Chromium ANGLE Backend`、`ANGLE_OPENGL`／`ANGLE_D3D11`の実初期化結果、`GPU Compositing`、DISPLAY／DPR、初期window size、`render_process_terminated`有無を確認する。requested settingだけでOpenGL成功と判定しない。
- 実機操作はProject ownerが行い、AIはGUI操作しない。operatorへpixel単位の目標幅を要求せず、resize前後の実geometryはD2 logから取得する。最初の明確なlongで停止し、longなしは複数releaseとruntime validityを併記して暫定判定する。
- OpenGLでlongなしの場合は、同じlauncher条件のfresh D3D11 controlでlongを再確認した後にだけ、実ApplicationをOpenGL stackで起動するtargeted prototypeへ進む。OpenGLでもlongの場合はCSS全ddminへ直ちに戻らず、実sourceとcomputed behaviorを確認した少数の安全なApplication drawing conditionをprototype A/Bする。
- `contain: paint`／`isolation: isolate`は実sourceとcomputed behaviorの確認前にroot cause／修正候補へ固定しない。`WM_EXITSIZEMOVE`後の`view.update()`はforced repaintであり、page state／performanceへの影響が大きいため後順位とする。
- **Completion policy:** root causeを完全特定できなくても、supportedかつ安全な変更によってblackoutが複数fresh sessionで再現しなくなり、page state／dirty data／performance／Current Specificationを維持し、targeted verificationおよびFull `RISK-UI-001`をPASSする場合は修正として採用可能とする。
- OpenGL preparation: `%TEMP%/TASK-039_d2_opengl_stack.py`（SHA-256 `6A3A8E22F2C9751F5AF2CF221D2DEDA7CA3F0489FDC3F72804F6C8144E4B0F57`）を、既存D2 harnessをsubprocessでそのまま起動する一時launcherとして作成した。D2 SHA-256 `0132F0B8A9CDD5AF0EABECB8F6EA0DC9B4FC116E60349993409A76C165F0CF3E`とsource markerを起動前に照合し、`QSG_RHI_BACKEND=opengl`、Qt WebEngine graphics logging、backend非強制のChromium loggingだけを子processへ設定する。Application source／document／DOM・CSS・JS／Page・Profile／attach順／window／resize behavior／repaintは変更しない。
- Claude Code Sonnet independent read-only review: D2とlauncherと本節だけを`Read`／`Grep`／`Glob`で確認し、「実機testへ進める」と判定した。D2未変更、OpenGL requestと受動logging以外のbehavioral changeなし、要求graphics fieldをQt WebEngine logとD2 snapshotから取得可能、`--check`がGUIを起動しないことを確認した。実runではrequested valueだけでなく、実際のbackend／support／device／ANGLE initialization行が出ることをvalidity gateとする。
- Non-GUI preparation smoke: `.venv/Scripts/python.exe %TEMP%/TASK-039_d2_opengl_stack.py --check`はexit 0。`gui_started=false`、D2／`home.html` hash、PySide6 6.11.0、初期1440×960、`chromium_backend_forced=false`、`gpu_disabled=false`、`QSG_RHI_BACKEND=opengl`を確認した。これは実OpenGL初期化またはblackout結果のPASSではなく、Project owner実機run待ちである。
- D2 OpenGL manual result — POSITIVE (2026-09-22): Project ownerは最初の拡大releaseでlong blackoutを観測した。D2 stdoutではWebView／window logical widthが`1440 → 1705`、`resize_event`は13:17:22.783、250ms後の`resize_settled`は13:17:23.033で1705を維持した。DISPLAY1、screen／window DPR 1.0、初期1440×960で、`screen_changed`／`render_process_terminated` eventはない。stdout `%TEMP%/TASK-039_d2_opengl_20260922_131631_823425.stdout.log`は2,570 bytes、SHA-256 `86206B799F64E0BF8B3040E5D8E822255F028FBC5F2973003D793204A57A3E32`。stderr同prefixは109,544 bytes、SHA-256 `747B2CA44EBB52ABD3E2D15A90E3D4BC6FDC7A19829A56188417E992250110F0`。
- OpenGL runtime validity: `QSG RHI Backend: OpenGL`、`QSG RHI Backend Supported: yes`、AMD Radeon OpenGL 4.6 device、`GPU Compositing: Enabled`、Chromium `GL Backend: angle`／`ANGLE Backend: default`、`ANGLE_D3D11 display is initialized`、Qt `Native Skia Output Device: OpenGL`を実logで確認した。これはQt RHI／native outputをOpenGLへ変更したsupported mixed graphics stackであり、Chromium compositorはANGLE D3D11のままである。
- Visual Evidence: `%TEMP%/codex-clipboard-414f25cb-fbe9-45da-8df4-5d8e94bae9b9.png`（19,705 bytes、SHA-256 `B571B68355F5C56F806B1F5F4957A20BD612B53DDCA65D2F85981DFFB95323E8`）をCodexが実際に確認した。native title bar／window controlsは正常表示のまま、title bar下の`QWebEngineView` client領域が全面黒化している。logにblackoutの直接markerはないため、視覚Observationを13:17:22.783のresizeへlogだけから一意に導出せず、Project ownerのrelease対応報告と画像をground truthとする。
- OpenGL disposition: supportedなQt RHI OpenGL／Qt native OpenGL outputへの変更だけではD2 longを解消しなかったため、実Application OpenGL prototypeとfresh D3D11 reconfirmationの分岐へは進まない。この結果はQt RHI D3D11固有説を非支持とする一方、Chromium ANGLE D3D11、content／layer構成、Chromium→Qt resource import／presentation interactionを除外しない。次はCSS全ddminへ戻らず、実sourceとcomputed behaviorを確認した少数の安全なApplication drawing conditionを候補化する。Application修正は別途Test-first計画とProject owner確認後に行う。

### Current diagnostic priority: targeted paint/compositing prototype (2026-09-22)

- OpenGL armもpositiveだったため、CSS全ddmin、E6、DOM subtree削除、OpenGL Application prototypeへは進まず、D2で実際に適用されるpaint／stacking／clipping条件から、安全な代替表現を持ち得る候補をread-onlyで3件に限定した。canonical ownershipは`docs/features/frontend-libraries.md`と`apps/gui/vendor/README.md`で確認し、AppShell vendor copyを恒久修正で直接patchしない。
- Computed-style probe: exact E3 generated DOM／E5 positive static snapshotを1440×960、DPR 1、9 stylesheet enabledでheadless Chromiumへloadした。`%TEMP%/TASK-039_paint_candidate_probe.js`による観測で、(1) `.zui-shell__activitybar`はrect `0,0,52×960`、`contain:paint`、`isolation:isolate`、`overflow:hidden`、`display:flex`、(2) `body::after`は1440×960のfixed 1px border、`z-index:300`、(3) `.home-screen`と`.zui-shell__main-content`はnested `overflow:auto`だった。hidden dialogは`display:none`／0×0、bodyは`background-image:none`のため初回候補から除外した。
- Candidate priority: 第一候補はactivitybarの`contain:paint`。`contain`だけを外しても`isolation:isolate`がstacking context、`overflow:hidden`がclippingを維持でき、geometry不変をgate化できる。第二候補はfull-viewport `body::after`だが、見た目を維持する代替が複数propertyとなるため後順位。第三候補はnested scroll ownershipだが、layout／interaction regression riskが高いため後順位とした。存在だけを理由に`isolation:isolate`を単独候補へ昇格していない。
- TEMP prototype: `%TEMP%/TASK-039_d2_activitybar_contain_variant.py`（7,459 bytes、SHA-256 `67F7A52A0AD1312073C4913BBB2E516EF362FE3F006F61343757285FE1CB4DB8`）とrunner `%TEMP%/TASK-039_d2_activitybar_contain_run.py`（10,134 bytes、SHA-256 `6FA3185129B5E85DE850A577582AC113E5CC24220D58A5BC45D9BC71CF48775D`）を用意した。D2 native host／default WebView・Page・Profile／実`home.html`／attach-before-show／1440×960／platform-default GPU ONを維持し、successful `loadFinished`後に`.zui-shell__activitybar`へ`contain:none !important`を1回だけ設定する。delay、forced repaint、reload、WebView再生成、animation、GUI automationはない。
- Variant validity gate: target 1件、9 external stylesheetのURL順とenabled状態、変更前`contain:paint`、変更後`contain:none`、`isolation:isolate`、`overflow:hidden`、display不変、rect不変を必須とする。document URL、script count、body child countも記録する。gate invalid／load failure／renderer termination時はblackout結果を分類しない。
- Claude Code Sonnet independent read-only review: candidate plan、D2／variant差分、ownership contractを`Read`／`Grep`／`Glob`だけで確認し、「実機testへ進める」と判定した。第一候補の優先順位、単独property mutation、AppShell upstream→test→revision→re-vendorの恒久更新経路を妥当とした。review後、stylesheet validityを件数だけでなく正確な9 URL順へ強化し、runnerで9 source hashも固定した。
- Preparation verification: variant／runner／probeのsyntaxはPASS。runner `--check`はexit 0で、PySide6 6.11.0、QWebEngine import、`home.html`と9 stylesheet hash、exactly one mutation、GPU not disabled、graphics backend not forced、no fixed delay／repaint／reload／recreateを確認した。`git diff --check`はPASS（既存line-ending warningのみ）。Application sourceとvendor sourceは変更していない。
- Offscreen startup attempt is invalid evidence: `QT_QPA_PLATFORM=offscreen`ではrendererがexit code 49でabnormal terminationし、`load_finished succeeded:false`、paint gate未到達だった。stdout `%TEMP%/TASK-039_d2_activitybar_contain_20260922_134653_174377.stdout.log`（3,271 bytes、SHA-256 `CD17FE5F40179ACB9D152B809D88CA7AF4F5B79B0635D15C96AF1CA8CC391E45`）、stderr同prefix（4,084 bytes、SHA-256 `CB99B4785D24C7882A58B9A7F7B38E6ECBF203A53C8FBDFF5DF8C56C7FB93899`）。これはoffscreen QtWebEngine環境の制約であり、variantのPASS／FAILまたは実display startup結果へ流用しない。実display上のstartup、gate、manual resizeはProject owner実施待ちである。
- Decision rule: variantでlongが1回でも出たら第一候補は非支持として停止する。valid gate後に8 releaseでlongなしならnegative candidateとし、fresh processの未変更D2 controlを同等geometryでpositiveへ戻せた場合だけ、恒久修正候補としてAppShell upstreamでのTest-first変更設計へ進む。property自体をQtWebEngine root causeとは断定しない。
- Activitybar variant manual result — POSITIVE (2026-09-22): Project ownerはD3D11／GPU Compositing Enabled、DISPLAY1／DPR 1.0でvalid gateを確認した。`contain:paint -> none`後も`isolation:isolate`、`overflow:hidden`、geometryは維持されたが、最初のresize releaseでlong blackoutが発生したため追加resizeは行わなかった。よってactivitybarのpaint containment単独変更は修正候補として非支持とし、恒久AppShell変更へ進まない。

### Current diagnostic priority: full-viewport `body::after` prototype (2026-09-22)

- Read-only source/runtime confirmation: canonical Application CSS `apps/gui/css/01_base.css`の`body::after`は`content:""`、`position:fixed`、`inset:0`、`z-index:300`、1px border、`pointer-events:none`である。real `home.html`を1440×960／DPR 1でloadしたruntime probeでは`embedded-mode=false`、shell present、pseudoはvisible block、content box 1438×958＋各辺1px borderでouter 1440×960を覆った。JSからpseudoを参照・操作する箇所はなく、`embedded-mode`時のCSS非表示以外にbehavior責務はない。window-edge borderの装飾であり、Application CSSがcanonical sourceである。
- TEMP prototype: `%TEMP%/TASK-039_d2_body_after_variant.py`（SHA-256 `AD3E52F9992ADFEF6BA2053EDA6626A001C9C35AEF51B0683F3C368F04A8B50E`）はD2 host、default WebView／Page／Profile、real `home.html`、Application JS／DOM／9 external stylesheets、platform-default GPU ON、attach／window／manual resize pathを維持する。successful `loadFinished`直後に診断`style` nodeをheadへ1件だけ追加し、`body::after { content: none !important; }`の単一behaviorだけを変更する。Application sourceは変更しない。
- Validity gate: beforeはnon-embedded、content empty string、visible fixed inset 0、z-index 300、pointer-events none、border込みouter sizeがviewport一致を必須とする。afterは`content:none`、probe style 1件を必須とし、9 stylesheetのURL順／enabled状態、body child数、script数、body／shell geometry不変を確認する。delay、forced repaint、reload、WebView再生成、animation、GUI automationはない。
- Runtime probe: `%TEMP%/TASK-039_body_after_runtime_probe.js`（SHA-256 `9B548E8B04FDE138F0ADCC2E67E518152CB1068FCE095FBE361E1A598A88E965`）はreal `home.html`で上記computed behaviorを直接確認した。probeはread-onlyでApplication sourceを変更しない。
- Runner／preflight: `%TEMP%/TASK-039_d2_body_after_run.py`（SHA-256 `2286DA7F8B450317A00B293CD558E8744A95B56BA5362AC463F800EC7B3A4115`）。variant／runner syntaxはPASS。`--check`はexit 0でPySide6 6.11.0、QWebEngine import、`home.html`／9 stylesheet／variant hash、単一approved rule／style append、GPU not disabled、backend not forced、禁止behavior不在を確認した。これはmanual blackout結果ではない。
- Claude Code Sonnet independent read-only review: Repository sourceとTEMP probe／variant／runnerを`Read`／`Grep`／`Glob`だけで確認し「実機testへ進める」と判定した。pseudoは全viewportのnon-interactive装飾border、Application CSSがcanonical、D2条件維持、変更はcontent 1 behavior、gateは十分、repaint／reload／recreate／delay混入なしと判断した。残る注意点は診断style node＋`!important`が本番source変更そのものではないこと、hash値をClaude自身は再計算していないこと、negativeでも因果／root cause確定にはならないことである。Codexはhashを別途再計算してpreflightと照合した。
- Decision rule: valid gate後、最初のlongで停止して候補非支持とする。8 releaseでlongなしならfresh unchanged D2 controlでpositive復帰を確認してからだけ、`01_base.css`の恒久最小変更設計へ進む。CSS ddmin、E6、DOM subtree削除へは戻らない。
- `body::after` variant manual result — POSITIVE (2026-09-22): Project ownerはvalid gate、full-viewport fixed overlayから`content:none`への変更、body／shell geometry維持、D3D11／GPU Compositing Enabledを確認した。最初のresize releaseでlong blackoutが発生したため追加resizeは行わなかった。よってpseudo除去単独は恒久修正候補として非支持とする。

### Final targeted CSS candidate: Home nested-scroll ownership (2026-09-22)

- Canonical source/runtime: Application-owned `apps/gui/css/12_home.css`は`.home-screen { overflow:auto }`、AppShell upstream vendorは`.zui-shell__main-content { overflow:auto }`を定義する。real `home.html`のcomputed probeではDOM chain中の`#flowchart`と`main`は`overflow:visible`で、外側shell main-contentがscroll owner候補である。`home.html`がloadする9 stylesheetに`30_flowchart.css`は含まれない。
- Read-only geometry probe: `%TEMP%/TASK-039_nested_scroll_probe.js`（SHA-256 `DEF4D1354ABB835447F8E81D883D778C47BA87B847E0AF882B51A219A8F996C5`）で1440×960、943×960、1440×600、943×600を確認した。全条件で`.home-screen`に実X／Y overflowはなく、内側だけ`overflow:visible`へ変更してもbody、main、`#flowchart`、home-screen、shell main-contentのrect／scroll metricsは不変、外側は`overflow:auto`を維持した。
- TEMP prototype: `%TEMP%/TASK-039_d2_home_scroll_variant.py`（SHA-256 `B181ED800CB70B2BA79C4803AC4A27BD0A6A8AE52FE738D44EF53030628E60BB`）はD2 host／document／JS／DOM／9 stylesheet／platform-default GPU ON／attach／window／manual resize pathを維持し、`.home-screen`へ`overflow:visible !important`をinlineで1回だけ設定する。Application source／vendorは変更しない。
- Validity gate: target／outer ownerの一意性、target `auto -> visible`、outer owner `auto`維持、`#flowchart`／`main`の`visible`維持、target／owner／flowRoot／main／body／shellのrectおよびscroll metrics不変、9 stylesheet順／enabled、script数／body child数不変を必須とする。初期targetに実overflowがある場合はfail-closedでinvalidとし、このarmの結果へ分類しない。
- Runner／preflight: `%TEMP%/TASK-039_d2_home_scroll_run.py`（SHA-256 `5C2A2C288F90470146434DECB252B927BE8AF3FC2007B3A849D50A92FE573615`）。variant／runner／probe syntaxはPASS、`--check`はexit 0。PySide6 6.11.0、QWebEngine import、source／9 stylesheet／variant hash、single mutation、GPU not disabled、backend not forced、repaint／reload／recreate／delay／automation不在を確認した。
- Claude Code Sonnet read-only review: 初回は未読込の`30_flowchart.css`を根拠に`#flowchart` gate不足を指摘した。Codexは実`home.html`のstylesheet inventoryとcomputed behaviorを照合し、指摘の前提を退けつつ、`#flowchart`／`main`のoverflow／rect／scroll metricsをgateへ追加した。revised variantを再レビューし「実機testへ進める」と判定した。残る注意点は、Home生成が`loadFinished`時点で未完ならgateがinvalidになるがfail-openしないこと、実overflowがある長いHome contentのscroll behaviorはこのblackout armとは別途恒久変更時に確認が必要なことである。
- Decision rule: valid gate後、最初のlongで停止してnested-scroll単独変更を非支持とする。8 releaseでlongなしならfresh unchanged D2 controlのpositive復帰後にのみ恒久候補を設計する。これもpositiveなら新しいCSS候補は探索せず、CSS ddmin／E6／DOM subtree削除へ戻らず、resize gesture終了時の単発`view.update()`等、page stateを壊さないApplication側最小prototypeへ優先順位を移す。
- Nested-scroll variant manual result — NEGATIVE candidate (2026-09-22): Project ownerはvalid gate条件で20 releaseを超えて操作し、long blackout 0件を確認した。stdout `%TEMP%/TASK-039_d2_home_scroll_20260922_170615_806726.stdout.log`（64,919 bytes、SHA-256 `6BF04EA4FC8B69069774D171E34048438FFAFC6FBEF0FB7F46EB584A6401F9DB`）、stderr同prefix（63,868 bytes、SHA-256 `CAEC8509774626977D442D42650CF9AB571B179D2866880641840B1572D01CC6`）。初回gateはvalid、DISPLAY1／DPR 1.0、renderer termination 0件。logはvisual blackout markerを持たないため、long 0はProject owner Observationをground truthとする。
- Variant log audit: 初回valid gate後、17:07:38の2回目`load_finished`より前にraw `resize_event`／`resize_settled`が各23件あり、この区間はinline overflow mutationが適用された同一documentとして有効なnegative Evidenceである。2回目load後のgateは`payload:null`／invalidとなり、以後36 callbackはvariant適用を保証できないためnegative件数へ加算しない。Project ownerの「20+ release negative」は有効区間だけで満たされるが、raw Qt callback数とmanual release数は同義とせず併記する。
- Paired restoration preparation: unchanged `%TEMP%/TASK-039_d2_document.py`（SHA-256 `0132F0B8A9CDD5AF0EABECB8F6EA0DC9B4FC116E60349993409A76C165F0CF3E`）をfresh processで起動する`%TEMP%/TASK-039_d2_restoration_run.py`（SHA-256 `EAFFD6F439E8F0BCE486E5B318B0164FF08124415899715E670DA02B93BB185D`）を用意した。runnerはgraphics overrideを除去し、platform-default stack／GPU ONと受動loggingだけを設定する。D2／`home.html`／9 stylesheet hash、default WebView／Page／Profile、1440×960、real `home.html`、CSS／JS runtime mutationなしをpreflightで固定した。syntaxと`--check`はPASS。
- Paired decision: fresh baselineでlongが再現すれば`overflow:auto positive -> overflow:visible 20+ release negative -> overflow:auto positive reconfirmation`のA/B/Aを成立とする。その後はroot cause完全特定を待たず、狭いwindow／content増加時の本来のscroll責務を確認し、必要ならouter containerへscroll ownershipを明示的に移すApplication CSS最小prototypeをTest-firstで設計する。baselineがnegativeなら間欠性のためA/B/A未成立としてproduction変更へ進まない。
- Paired restoration manual result — POSITIVE／A-B-A成立 (2026-09-22): Project ownerはfresh unchanged D2 baseline（`.home-screen { overflow:auto }`）で3回目のresize releaseにlong blackoutを再現し、その時点で停止した。stdout `%TEMP%/TASK-039_d2_restoration_20260922_171739_200095.stdout.log`（5,486 bytes、SHA-256 `590753A84AC95411D148FA745BEA2314E969300803DBD02D826CA6912B4A2335`）、stderr同prefix（112,547 bytes、SHA-256 `3FB4551FCA403FED397337D35CC144C103E69775E1DBFA98DDCE8950CB1965F9`）。logはvisual blackout markerを持たないため、release 3のlong判定はProject owner Observationをground truthとする。
- Evidence conclusion: `overflow:auto` baseline positive -> `overflow:visible` variant 20+ release negative -> restored `overflow:auto` baseline positiveのA/B/Aが成立した。`.home-screen { overflow:auto }`をQtWebEngine root causeとは断定せず、D2条件でlong blackoutを成立させる強いcontributor／triggerと分類する。新しいCSS候補探索、CSS ddmin、E6、DOM subtree削除は終了し、親AppShell scroll ownerへ責務を一本化できるかを確認してApplication修正へ進む。
- Scroll-responsibility read-only conclusion: Home DOMは`.home-screen -> #flowchart -> main -> .zui-shell__main-content`で、実`home.html`では内側3要素のうち`.home-screen`だけが`overflow:auto`、外側AppShell main-contentにも`overflow:auto`宣言がある。Home codeは`.home-screen`の`scrollTop`／wheel／keyboard stateを所有せず、Recentは最大10件、Templateは可変件数を通常flowへ追加する。1440×960、943×960、1440×600、943×600のprobeで内側の実overflowはなく、内側だけ`visible`へ変えてもgeometry／scroll metricsは不変だった。content増加を含むbrowser確認ではAppShellが`min-height:100vh`で伸びるためmain-content自体はscroll rangeを持たず、実scrollはdocument viewportが所有した。したがってApplication-owned `apps/gui/css/12_home.css`からnested scroll containerだけを除去し、既存ancestor／document scroll chainへ委譲する最小変更を第一候補とする。新しいscroll ownerや高さ制約は追加せず、vendor AppShellは変更しない。

### Independent review disposition

- **Strong／adopt:** current logだけでは正常resizeとblackout resizeを識別できない。頻発した操作に対してstartup後のSharedImage初期化は3件のみで、縦resizeのsurface size変更も記録されていない。
- **Modify:** native `QMainWindow`＋最小HTMLでblackoutが再現しても、ZizAI固有HTML／custom chromeが必要条件でないと結論できるのは、持続時間・回復条件を含むfailure profileが一致するときだけである。現在のminimalはGPU ON/OFFとも瞬間的に復帰し、ZizAI本体の長いblackoutと分離して扱う。
- **Strong／adopt:** 現在の最小scriptで再現しない場合、それだけではZizAI HTML原因を証明しない。ZizAIはframeless＋`startSystemResize`、最小scriptはnative frame resizeであり、window pathと初期sizeが未統制だからである。
- **Moderate／adopt:** 最小script非再現時は`{native frame, frameless startSystemResize} × {minimal HTML, home.html}`の比較へ進む。
- **Modify:** continuous `requestAnimationFrame`／CSS animationはdamage生成そのものが症状を変える可能性があるため、baseline minimal HTMLへ混ぜず、別診断armとして扱う。
- **Defer（当時のreview判断）:** PresentMonは当時のhostに存在しなかった。後続のWPR取得後にPresentMon 2.3.1で既存ETLをread-only解析した結果は本Task上部の「2026-09-23 closure preparation and evidence update」を参照する。

## Subtask plan

以下は当時の実行計画の記録。2026-09-23のclosure preparation後、Subtask Bの追加diagnostic／production fix探索をTASK-039で再開しない。

### Subtask A: Startup native resize handle ownership

- **Outcome:** 起動直後のnormal windowで四辺・四隅のnative resize handleがQWebEngineViewより前面にあり、maximize／restore後も同じ契約を維持する。
- **Read Scope:** `apps/desktop/host.py`の`ResizeHandle`、`FramelessMainWindow`、WebView attach順、関連Desktop Test。
- **Edit Scope:** `apps/desktop/host.py`、最小限のDesktop host Test。Frontend／vendorは変更しない。
- **Acceptance Criteria:** Application起動直後に四辺・四隅からresizeできる。maximize中はresize handleを無効化し、restore後も再びresizeできる。central widget attach後もhandleのhit targetが失われない。
- **Tests:** handle layout／visibility／stackingをQt Test fixtureでTest-firstに固定し、Windows 11 real displayで起動直後の`UI-WINDOW-RESIZE`を再確認する。

### Subtask B: WebEngine resize repaint and screen/DPI discrimination

- **Dependencies:** Subtask Aでnative handleを安定化した後。
- **Outcome:** blackoutの再現条件と所有境界を必要十分な範囲で明確にし、supportedかつ安全なgraphics stackまたはApplication側の最小変更でresize後の表示を維持する。
- **Read Scope:** `apps/desktop/host.py`のwindow／WebView lifecycle、Home／AppShell scroll ownership、QtWebEngine logging、Current PySide6 version、Manual Evidence。
- **Edit Scope:** A/B/Aで承認されたcanonical Application CSS `apps/gui/css/12_home.css`とfocused browser Test。Qt／driver／vendorは直接変更しない。
- **Acceptance Criteria:** single-monitor内、同一scaleのmonitor間、異なるscaleのmonitor境界の各条件で、resize後にWebView contentが表示され続ける。root cause未確定でも、採用する変更がsupportedで、複数fresh sessionでlongを再現せず、page state／dirty data／performance／Current Specificationを維持し、targeted verificationとFull `RISK-UI-001`をPASSすること。未分類のまま場当たり的なrepaint・reloadを追加しない。
- **Tests:** 実display Manual Testで各操作の開始／release時刻、方向、前後size、blackout有無／復帰をground truthとして記録する。browser Testはwide／narrow・short viewportと増加contentでnested scrollingがなく、ancestor／document scroll chainからwheel／focusで全contentへ到達でき、横overflowを作らないcontractを固定する。GPU全面無効を恒久修正として検証しない。

## Project owner manual confirmation protocol

AIはGUI操作を行わない。必要な再現はProject ownerが行い、各操作で次を記録する。

1. single monitor内で、Application起動直後に右辺を20〜50pxだけdragし、mouse release後もWebView内容が見えるか。
2. maximize→restore後に同じ右辺dragを行い、起動直後との差を確認する。
3. window全体をsecondary monitorへ移動後、同じdragを行う。monitorごとのscaleが異なる場合は値を記録する。
4. blackout時は、mouse release後に復帰するか、maximize／restoreまたはwindow移動で復帰するか、Application logに`render_process_terminated`／page load failureが出るかを確認する。

各条件は短いcaptureだけを保存し、raw log全体はEvidenceへ複製しない。

## Risks

- H1とH2を同じ修正で隠すと、native input bugとWebEngine rendering bugの責務が不明確になる。
- forced repaint／reloadはblackoutを一時的に隠しても、page state、Bridge lifecycle、dirty Tabを壊すおそれがある。
- monitor／DPI遷移はbrowser-only、offscreen WebEngine、単一monitor CIでは証明できない。
- 起動直後window dragの既存F-09とは近接するが、Round 1 Evidenceの修正Scope外という扱いを変えない。必要なら本Taskで同じhost原因かをRead-only確認するが、Acceptanceには混ぜない。

## Verification

- focused Desktop host Test（RED→minimal implementation→GREEN）。
- `tests/run-verification.ps1 -Gate static-analysis`、`-Gate unit`、影響に応じた`-Gate integration`／`-Gate e2e`。
- focused Home scroll ownership Playwright Test（RED→minimal CSS implementation→GREEN）。
- `git diff --check`。
- Windows 11 real displayの`UI-WINDOW-RESIZE`をPASSさせた後、Full `RISK-UI-001`を最初から実施し、新しい`results/manual/RISK-UI-001.json`をcanonical validatorで検証する。
- TARGETED `TASK-038` retestとRound 1 Resultは変更しない。

## Implementation evidence

### H1: startup resize handle stacking

- RED: `tests/unit/test_desktop_host_window_contract.py::test_resize_handles_are_installed_after_webview_is_attached`を追加し、WebView attachが818行、resize handle installが447行のため`1 failed`となることを確認した。
- Minimal fix: `window.install_resize_handles()`をstartup placeholder attach時から、`window.setCentralWidget(view)`直後へ移動した。window state、WebEngine、DPI、monitor、Frontendには追加処理を入れていない。
- GREEN: `.venv\Scripts\python.exe -m pytest tests/unit/test_desktop_host_window_contract.py -q`で`1 passed`を確認した。
- Manual PASS: Project ownerが`レコーディング 2026-09-20 110816.mp4`で起動直後のresize成功を確認した。H1は完了とする。
- Remaining: 同じ確認でblackoutが再現した。H1へ便乗修正せず、monitor構成／DPI／blackoutの持続・回復条件をH2／H3 Evidenceとして切り分ける。

### H2: Home nested-scroll removal prototype

- RED: `tests/playwright/specs/home-scroll-ownership.spec.js`を追加し、1200×480と900×480で増加content、responsive grid、横overflowなし、wheel／focusによる到達性を実`home.html`で確認した。既存挙動ではこれらは成立したが、`.home-screen`のcomputed `overflow-y`が`auto`のため期待するnested-scroll-free contract `visible`に対して`1 failed`となった。
- Minimal fix: canonical Application CSS `apps/gui/css/12_home.css`から`.home-screen`の`overflow:auto` 1宣言だけを除去した。AppShell vendor、DOM、JS、geometry、高さ制約、新しいscroll owner、forced repaint、reload、GPU設定は変更していない。
- GREEN: `tests/playwright/node_modules/.bin/playwright.cmd test specs/home-scroll-ownership.spec.js --project=chromium`で`1 passed`（1.5s）。wide／narrow・short、content増加、wheel、focus、横overflowなしを確認した。
- Remaining: このbrowser TestはQtWebEngine／GPU presentationのlong blackoutを証明しない。次に実Applicationのfresh processでtargeted resizeとHome scroll／responsive behaviorをProject ownerが確認し、PASS後に通常automated verificationとFull `RISK-UI-001`へ進む。
- Real Application targeted manual result — FAIL (2026-09-22): Project ownerが2026-09-22 17:36以降に、`.home-screen { overflow:auto }`削除済みのfresh normal ZizAI Applicationでtargeted manual確認を実施し、Session 1のresize確認中にlong blackoutが再発した。その時点で確認を停止したためSession 2は未実施、Full `RISK-UI-001`も未実施、commit／pushなし。起動記録は`logs/app_20260922.log`（`sid=20260922173649-24852`、17:36:49開始、`home_ready elapsed_ms=3007.6`、`page_load_failed`／`page_load_timeout`／`render_process_terminated`なし）で、視覚判定はProject owner Observationをground truthとする。screenshot／videoは取得していない。
- Classification: 上記により、`.home-screen`のnested scroll除去は**D2 diagnosticではstrong trigger／contributor（A/B/A成立）だが、production fixとしては失敗**と分類する。D2のA/B/A Evidence（`### Final targeted CSS candidate: Home nested-scroll ownership`）は有効なdiagnostic結果としてそのまま維持し、削除・書き換えはしない。`.home-screen`をQtWebEngine root causeとする分類、および「overflow変更で修正済み」とする分類は採らない。2026-09-23のclosure preparationで`apps/gui/css/12_home.css`の候補差分を戻し、対の`tests/playwright/specs/home-scroll-ownership.spec.js`を除去した。過去のRED／GREEN結果はdiagnostic historyであり、現行のtest成果として数えない。

## Remaining Project owner decisions (historical; current disposition is above)

- H2がApplication hostではなくQtWebEngine／GPU／driver側と分類された場合、upstream issue化、PySide6 update検討、supported monitor/DPI configurationのいずれを採るか。
- H2の実display再現で使用するmonitor構成とDPI scaleの代表組合せ。

これらは当時の未決事項。2026-09-23のProject ownerによるlocalhost移行方針の後、TASK-039のクローズ条件として追加調査を再開しない。移行設計の判断は別Taskへ移す。
