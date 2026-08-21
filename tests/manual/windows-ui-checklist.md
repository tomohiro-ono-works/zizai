# Windows UI Release Checklist

- Risk: `RISK-UI-001`
- Platform: Windows 11 interactive desktop with a real display
- Result source: `results/manual/RISK-UI-001.json`

各caseは実施前提、操作、期待結果、実結果、`Pass`判定、証跡pathとSHA-256を記録する。

| Test ID | 操作 | 期待結果 |
|---|---|---|
| `UI-WINDOW-DRAG` | title barをdragする | windowがpointerに追従して移動する |
| `UI-WINDOW-RESIZE` | 四辺と四隅をdragする | windowが各方向へresizeされる |
| `UI-WINDOW-MINIMIZE` | minimize buttonを押す | taskbarへ最小化される |
| `UI-WINDOW-MAXIMIZE` | maximize/restoreを順に押す | 最大化と元のsizeへの復元が成功する |
| `UI-WINDOW-CLOSE` | closeを押し、必要なら確認dialogへ応答する | processが正常終了する |
| `UI-FILE-DIALOG` | file pickerを開いて選択・cancelする | 選択pathとcancel結果が正しく返る |
| `UI-FOLDER-DIALOG` | folder pickerを開いて選択・cancelする | 選択pathとcancel結果が正しく返る |
| `UI-COORDINATE-CAPTURE` | coordinate captureを開始し、選択・cancelする | preview/selected/cancelledが正しいcapture IDで届く |
| `UI-RETRY-OVERLAY` | retry可能errorを発生させretryする | overlayが表示され、retry後に解除される |
