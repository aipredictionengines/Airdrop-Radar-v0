# Test now

Upload `index.html` to the repository root and replace the existing file.

No other runtime file is required.

## Test A — offline/local core

- Open the site.
- Search `Atlas`.
- Expect one result: `Atlas Test Protocol`.
- Open LAB / QA.
- Click `Run self-test`.
- Expect `SELF-TEST PASS`.

## Test B — source failure handling

- Click `Refresh DeFiLlama`.
- The source must end in PASS, FAIL or TIMEOUT within 12 seconds.
- It must never remain forever in RUNNING/IDLE after the call.

## Test C — live DEX search

- Enter `SOL` in Live DEX Screener query.
- Click Search live.
- On success, DEX results are merged into the dataset and the Radar list is filtered to them.
- On failure, a visible error and LAB Error Log entry are required.

## Test D — regression evidence

Export Debug JSON and keep it. Compare it with the files under `debug/BUG-001` and `debug/BUG-002`.
