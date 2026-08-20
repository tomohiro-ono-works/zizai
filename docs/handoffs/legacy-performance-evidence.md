# Legacy Excel Performance Evidence

- Source period: 2026-06-14
- Migrated by: TASK-006
- Date: 2026-08-21
- Status: Historical Evidence — not a current performance acceptance baseline

## Preserved measurements

- 対象は100,000 rows × 300 columns、約183 MBの`.xlsx`であった。
- `pandas/openpyxl`は先頭1～200 rowsだけでも約84～85 secondsを要し、row数よりXLSX展開・初期parse costが支配的だった。
- 全量headless runは約735 secondsで、read phase約713 seconds、normalize約13 seconds、schema apply約7 seconds、UI cache build約0.1 secondsだった。
- GUI runは約1,073～1,276 secondsで、計測範囲ではCore/Connector elapsedがほぼ全時間を占めた。
- 別GUI runではmain Python processのprivate memoryが約734 MBから約3.08 GBへ増え、完了後約1.28 GBまで低下した。観測中の最低available RAMは約5.39 GBだった。

## Historical conclusion

計測時点の主因はFrontend描画やUI cacheではなく、`pandas/openpyxl read_excel`のparse costだった。`date_cleansing=false`時の不要なExcel epoch再読込は省略され、追加約90 secondsの処理を回避した。

## Reuse constraints

数値は当時のfile、machine、dependency、commitに依存するため、現在のSLOや合格基準に使用しない。性能回帰へ利用する場合は、個人pathを含まないfixture、環境情報、warm/cold条件、memory sampling、timeoutを新しいTaskで固定して再計測する。
