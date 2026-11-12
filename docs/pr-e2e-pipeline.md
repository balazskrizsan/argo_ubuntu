# PR e2e pipeline

```
 ArgoCD repo
      │ PR (image tags / cluster changes)
      ▼
 GitHub Actions  ── .github/workflows/pr-e2e-prod-test.yaml  ┐
                 └─ .github/workflows/pr-e2e-uat-test.yaml   ├ thin callers
                    .github/workflows/pr-e2e-stack-test.yaml ┘ shared reusable
                    workflow (all deploy+test steps live here)
      │
      ├───────────────┐
      │               │
   K8s deploy      Playwright
   (kind cluster)  (phase 2)
      │               │
      └───────┬───────┘
              │
          PASS / FAIL
              │
              ▼
      PR merge allowed      <- required status check
              │
              ▼
           ArgoCD
              │
              ▼
         production
```

## What the workflow does

There are **two thin caller workflows** — `pr-e2e-prod-test.yaml`
(stack=prod: `ci_prod` overlay into `ssp-ci-prod`, prod domains) and
`pr-e2e-uat-test.yaml` (stack=uat: `ci_uat` into `ssp-ci-uat`, uat
`*.balazskrizsan.com` domains) — plus the **shared reusable workflow**
`pr-e2e-stack-test.yaml`, which contains the whole deploy+test job and
derives every env-specific value (namespace, domains, overlay dirs, cert
CN, cluster/artifact names) from its `stack` input in the
`Resolve stack config` step. Each caller only carries the `paths:` filter,
so a prod-only or uat-only change runs exactly one pipeline; shared files
(`templates`, `common/insecure-config`, `common/secret-manager`) trigger
both; local-only changes trigger neither.

1. **Checkout** the PR head.
2. **Resolve image tags** — scans the PR diff for changed
   `value: kbalazsworks/...` image patches in the workflow's **own** overlay
   (`apps/*/ubuntu_prod` + `scripts/ubuntu_prod` for prod, `apps/*/ubuntu_uat`
   + `scripts/ubuntu_uat` for uat); unchanged apps fall back to that
   overlay's tags (each CI env runs the same images as its real env).
   `local_*`-tagged images are skipped — they bake dev-cluster hosts into
   the frontend bundle at build time. The result is appended as a kustomize
   `images:` block to `scripts/ci_<env>/kustomization.yaml`,
   so the cluster runs exactly the versions the PR ships.
3. **Create a kind cluster** (`.github/ci/kind-config.yaml`): port mappings
   80/443 for ingress-nginx, `extraMounts` for the hostPath PVs used by the
   `ssp-ci-prod` / `ssp-ci-uat` overlays (same paths as `ubuntu_prod` /
   `ubuntu_uat`; both mount sets live in the shared config).
4. **Install ingress-nginx** (kind provider manifest).
5. **Create namespace + secrets**: `env-cert` is a self-signed
   `*.smartscrumpoker.com` (prod) / `*.smartscrumpoker.balazskrizsan.com`
   (uat) cert; `cloud-secrets` comes from the
   **`SSP_SECRETS_YAML` / `SSP_UAT_SECRETS_YAML` GitHub secret** — a full
   Secret manifest stored as the
   secret value (may contain multiple `---` separated Secret docs). The
   cert-manager Job stays **excluded** (it would fetch the real cert from S3).
6. **Deploy** `kubectl apply -k src/app-groups/ssp/scripts/ci_<env>`, then handle
   `aws-services-secrets` in one of two modes:
   - if `cloud-secrets` was in the env's secrets secret: wait for
     `secret-manager-job`, which downloads the encrypted secrets from S3 and
     decrypts them via sops + GCP KMS into `aws-services-secrets`;
   - if not: `aws-services-secrets` must already be in the env's secrets
     secret (this is the current setup) and the sops Job is deleted.
   Only then wait for the deployment rollouts.
7. **Map hosts + smoke check**: the env's domains (prod:
   `smartscrumpoker.com` etc.; uat: `smartscrumpoker.balazskrizsan.com`
   etc.) are mapped to 127.0.0.1 on the
   runner so the baked frontend bundle and the ids issuer URL resolve
   to the kind ingress unchanged; then frontend + IDS discovery over HTTPS.
8. **Playwright e2e** — runs the tests in `e2e/` (skipped if the dir is
   absent): `npm ci` -> `playwright install --with-deps chromium` ->
   `playwright test`. `E2E_BASE_URL` feeds `baseURL`
   (`https://smartscrumpoker.com` for prod,
   `https://smartscrumpoker.balazskrizsan.com` for uat) and the config
   sets `ignoreHTTPSErrors: true` for the self-signed cert. First spec:
   `e2e/tests/homepage.spec.ts` asserts the landing page renders the
   "Smart Scrum Poker" and "Smarter Estimations for Agile Teams" texts.
9. On failure: pods, events and container logs are dumped to the job log.

## Required GitHub secrets

**`SSP_SECRETS_YAML`** — repo secret (Settings -> Secrets and variables ->
Actions), currently passed by **both** callers to the reusable workflow's
`SSP_SECRETS_YAML` secret input. To split secrets per env, create e.g.
`SSP_UAT_SECRETS_YAML` and map it in `pr-e2e-uat-test.yaml`'s `secrets:`
block instead. The whole Secret YAML is stored as the value (may contain
multiple `---` separated Secret docs). Two supported modes per env:

- **`aws-services-secrets` only** (current) — injected as-is, the sops Job is
  skipped. Simplest, no S3/KMS calls in CI.
- **`cloud-secrets` present** — the sops Job runs and generates
  `aws-services-secrets` itself (GCP SA for KMS + AWS S3 paths come from it).

The workflow applies it exactly like `src/scripts/local/apply-cloud-secrets-local.sh`
does (`kubectl apply -f`), except from stdin/`/tmp` instead of a committed file.
Before applying it rewrites every `metadata.namespace` to `ssp-ci-prod` /
`ssp-ci-uat`, so the
manifest can be copied verbatim from `cloud-secrets-local.yaml`.

## Differences vs `ubuntu_prod` / `ubuntu_uat` (CI deltas)

Each `ci_<env>` overlay applies the **same app manifests as its real
overlay** — same image tags, same env vars. The remaining deltas are
CI-infra only (shown for prod; uat mirrors them with uat domains/ports):

- cert-manager Job excluded — `env-cert` is a self-signed
  `*.smartscrumpoker.com` cert in CI.
- secret-manager Job runs only when `cloud-secrets` is provided in
  `SSP_SECRETS_YAML` (otherwise deleted before it can fail).
- fluent-bit stays deployed (prod parity) — its logstash output does not
  exist in kind, so it retries in the background; pod logs are dumped by
  the workflow before teardown anyway.
- The frontend ingress gets a `tls` block — prod terminates TLS upstream
  and the template ships none, but kind/ingress-nginx needs it for HTTPS.
- The ids deployment's probes are overridden: the template's
  `periodSeconds: 300` would delay readiness past any sane rollout timeout
  in CI (readiness: 10s cadence; liveness: generous but bounded).
- backend-psql / ids-psql get a `pg_isready` readinessProbe — the templates
  ship none, and the workflow needs a rollout signal.
- ids `AwsServices__FullUrl` is rewritten to `http://aws-services:4073/`
  (prod) / `http://aws-services:4074/` (uat) —
  pod-side DNS would resolve the env hostname to the real public IP, and
  the call would egress to the live env (failing introspection there).
- Namespace is `ssp-ci-prod` / `ssp-ci-uat` (isolated from `ssp-prod` /
  `ssp-uat`); each ci overlay
  ships its own minimal Role/RoleBinding for the secret-manager Job's
  `default` ServiceAccount (the repo's `cluster-config` kustomization is
  broken — it references a non-existent `apps/common/templates` dir).

## Enabling the merge gate

Repo **Settings -> Branches -> branch protection on `master`**:

- enable **Require status checks to pass before merging**
- add the checks: **`deploy-stack / Deploy SSP prod stack to kind`** and/or
  **`deploy-stack / Deploy SSP uat stack to kind`** (called jobs of a
  reusable workflow are reported as `<caller job> / <called job>`)

Without this the workflows run but do not block merges. Note: a path-filtered
workflow that doesn't run reports no check at all — if both checks are
required, PRs that touch only one env's files would be unmergeable. Either
require only the check(s) that can actually run, or accept a single env gate.

## Known limitations / open questions

- Images are pulled from Docker Hub (`kbalazsworks/*`, public). If a PR bumps
  to a tag that was not pushed yet, the rollout wait will time out -> PR fails,
  which is the intended gate behavior.
- The workflows trigger on their own env's `paths:` only (`templates`,
  `ubuntu_<env>`, shared `common` pieces, `scripts/<env>` + `ci_<env>`, the
  env's ArgoCD Application, CI infra, `e2e/`); pure local-only,
  cluster/grafana/elk and `argo-apps/local` PRs run no tests at all.
- The sops Job downloads the encrypted secrets from real AWS S3 and decrypts
  via real GCP KMS — both come from `SSP_SECRETS_YAML`. If CI must not touch
  real buckets, skip `common/secret-manager` in the ci overlay and ship an
  `aws-services-secrets` Secret doc inside `SSP_SECRETS_YAML` instead.
