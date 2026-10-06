# Test v0.1.3 on GitHub Pages

## 1. Replace the repository contents
Upload the complete contents of this package to the repository root, including:

- `index.html`
- `data/`
- `scripts/`
- `.github/workflows/update-radar-data.yml`
- `debug/BUG-001/`
- `README.md`
- `LICENSE`

Do not upload only `index.html`; the snapshot collector is part of this build.

## 2. Generate the first live snapshot
On GitHub:

1. Open **Actions**.
2. Open **Update Radar Data**.
3. Click **Run workflow**.
4. Wait for the job to turn green.
5. The workflow should create a new commit named `data: refresh radar snapshot`.

The workflow also runs automatically at minute 17 and 47 of every hour. Scheduled GitHub Actions can sometimes start later than their nominal minute.

## 3. Open Pages
Hard refresh the Pages URL with `Ctrl+Shift+R`.

Expected:

- `SNAPSHOT PASS` in the top-right.
- `Candidates` greater than 0.
- `Source Health` shows PASS for at least one public source.
- `Radar Search` returns results when searching a project, chain, category, or token address contained in the current snapshot.

## 4. QA test
Open **LAB / QA** and click **Run self-test**.

Expected checks:

- meta loaded = PASS
- index array = PASS
- same-origin data path = PASS
- watch storage = PASS
- decision storage = PASS

Then add a candidate to Watchlist, create one Qualification decision, replay it, and export a debug pack.

## If the snapshot stays empty
Open the failed GitHub Action and copy the failing step/error. The UI should remain functional and should not create a permanently RUNNING browser source run.
