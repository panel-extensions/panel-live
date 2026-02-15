# Release Alpha (v0.1.0a1) Research

## Current State

- `build.yml` already has tag-triggered PyPI publishing via OIDC
- `hatch-vcs` derives version from git tags with `no-guess-dev` scheme
- CDN is live at `cdn.holoviz.org/panel-live/latest/` (no versioned directories yet)
- JS bundle builds via esbuild (`pixi run build-js`)
- Python wheel builds via hatchling (`pixi run -e build build-wheel`)

## How Panel Does CDN Publishing (our model)

Panel's `.github/workflows/build.yaml` has three CDN-related jobs:

1. **`cdn_build`** — builds JS/CSS assets, uploads as GitHub artifact
2. **`waiting_room`** — manual approval gate via `environment: publish`
3. **`cdn_publish`** — downloads artifact, runs `scripts/cdn_upload.py` which uses `aws s3 sync` to push to `s3://cdn.holoviz.org/panel/{version}/dist/`

**Infrastructure:** cdn.holoviz.org is an AWS S3 bucket fronted by CloudFront (region: `us-east-1`). Two secrets are needed: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

## Implementation

### CDN Upload Script (`scripts/cdn_upload.py`)
- Reads version from `package.json`
- Two S3 operations:
  1. `aws s3 sync dist/ s3://cdn.holoviz.org/panel-live/{version}/` — versioned path
  2. `aws s3 sync dist/ s3://cdn.holoviz.org/panel-live/latest/` — latest alias
- Files uploaded: `panel-live.js`, `panel-live-worker.js`, `panel-live.css`, source maps

### Build Workflow (`.github/workflows/build.yml`)
- Tag patterns for alpha/beta/rc
- `cdn_build` job: npm install + esbuild, uploads `dist/` as artifact
- `waiting_room` job: `environment: publish` (manual approval)
- `cdn_publish` job: downloads artifact, runs CDN upload script
- `github_release` job: creates GitHub Release with JS/CSS/wheel attached
- `release` job (PyPI): runs in parallel after waiting_room

### Required Secrets and Environments

| Item | Where | Purpose |
|------|-------|---------|
| `AWS_ACCESS_KEY_ID` | Repository secret | S3 write to `cdn.holoviz.org/panel-live/` |
| `AWS_SECRET_ACCESS_KEY` | Repository secret | S3 write to `cdn.holoviz.org/panel-live/` |
| `publish` environment | GitHub repo settings | Manual approval gate |
| `pypi` environment | GitHub repo settings | Already exists |
| PyPI Trusted Publisher | pypi.org | For `panel-extensions/panel-live` repo |

## Release Process

1. Ensure tests pass: `pixi run test`, `pixi run test-js`, `pixi run lint`
2. Tag: `git tag v0.1.0a1 && git push origin v0.1.0a1`
3. Workflow: build wheel + JS -> waiting room -> publish to PyPI + CDN + GitHub Release

## Verification

- `pip install panel-live==0.1.0a1 --pre` works
- `python -c "import panel_live; print(panel_live.__version__)"` prints `0.1.0a1`
- JS/CSS at `cdn.holoviz.org/panel-live/0.1.0a1/panel-live.js`
- JS/CSS at `cdn.holoviz.org/panel-live/latest/panel-live.js`
