# PR e2e pipeline

```
 ArgoCD repo
      │ PR (image tags / cluster changes)
      ▼
 GitHub Actions  ── .github/workflows/pr-e2e-stack.yml
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

1. **Checkout** the PR head.
2. **Resolve image tags** — scans the PR diff for changed
   `value: kbalazsworks/...` image patches in **any** overlay
   (`local` / `ubuntu_uat` / `ubuntu_prod`); unchanged apps fall back to the
   `local` overlay tags. The result is appended as a kustomize `images:` block
   to `src/app-groups/ssp/scripts/ci/kustomization.yaml`, so the cluster runs
   exactly the versions the PR ships.
3. **Create a kind cluster** (`.github/ci/kind-config.yaml`): port mappings
   80/443 for ingress-nginx, `extraMounts` for the hostPath PVs used by the
   `ssp-ci` overlay.
4. **Install ingress-nginx** (kind provider manifest).
5. **Create namespace + secrets**: `env-cert` is a self-signed
   `*.localhost.balazskrizsan.com` cert; `cloud-secrets` comes from the
   **`SSP_SECRETS_YAML` GitHub secret** — a full Secret manifest stored as the
   secret value (may contain multiple `---` separated Secret docs). The
   cert-manager Job stays **excluded** (it would fetch the real cert from S3).
6. **Deploy** `kubectl apply -k src/app-groups/ssp/scripts/ci`, then handle
   `aws-services-secrets` in one of two modes:
   - if `cloud-secrets` was in `SSP_SECRETS_YAML`: wait for `secret-manager-job`,
     which downloads the encrypted secrets from S3 and decrypts them via
     sops + GCP KMS into `aws-services-secrets`;
   - if not: `aws-services-secrets` must already be in `SSP_SECRETS_YAML`
     (this is the current setup) and the sops Job is deleted.
   Only then wait for the deployment rollouts.
7. **Smoke check** frontend + IDS discovery endpoint over HTTPS.
8. **Playwright e2e** — runs the tests in `e2e/` (skipped if the dir is
   absent): `npm ci` -> `playwright install --with-deps chromium` ->
   `playwright test`. `E2E_BASE_URL` feeds `baseURL`
   (`https://smartscrumpoker.localhost.balazskrizsan.com`) and the config
   sets `ignoreHTTPSErrors: true` for the self-signed cert. First spec:
   `e2e/tests/homepage.spec.ts` asserts the landing page renders the
   "Smart Scrum Poker" and "Smarter Estimations for Agile Teams" texts.
9. On failure: pods, events and container logs are dumped to the job log.

## Required GitHub secret

**`SSP_SECRETS_YAML`** — repo secret (Settings -> Secrets and variables ->
Actions). The whole Secret YAML is stored as the value (may contain multiple
`---` separated Secret docs). Two supported modes:

- **`aws-services-secrets` only** (current) — injected as-is, the sops Job is
  skipped. Simplest, no S3/KMS calls in CI.
- **`cloud-secrets` present** — the sops Job runs and generates
  `aws-services-secrets` itself (GCP SA for KMS + AWS S3 paths come from it).

The workflow applies it exactly like `src/scripts/local/apply-cloud-secrets-local.sh`
does (`kubectl apply -f`), except from stdin/`/tmp` instead of a committed file.
Before applying it rewrites every `metadata.namespace` to `ssp-ci`, so the
manifest can be copied verbatim from `cloud-secrets-local.yaml`.

## Differences vs the real `local` stack

- cert-manager Job excluded — `env-cert` is self-signed in CI.
- secret-manager Job runs only when `cloud-secrets` is provided in
  `SSP_SECRETS_YAML` (otherwise deleted before it can fail).
- fluent-bit **is kept** — `identity-service/local` patches its `fluent-bit-env`
  ConfigMap, so removing it would break `kubectl apply -k`.
- The ids deployment's probes are overridden: the template's
  `periodSeconds: 300` would delay readiness past any sane rollout timeout
  in CI (readiness: 10s cadence; liveness: generous but bounded).
- Namespace is `ssp-ci` (isolated from `ssp-local`); the ci overlay patches
  `aws-services-config`'s hardcoded `ids.ssp-local...` OIDC URI to `ssp-ci`
  and ships its own minimal Role/RoleBinding for the secret-manager Job's
  `default` ServiceAccount (the repo's `cluster-config` kustomization is
  broken — it references a non-existent `apps/common/templates` dir).

## Enabling the merge gate

Repo **Settings -> Branches -> branch protection on `master`**:

- enable **Require status checks to pass before merging**
- add the check: **`Deploy SSP stack to kind`**

Without this the workflow runs but does not block merges.

## Known limitations / open questions

- Images are pulled from Docker Hub (`kbalazsworks/*`, public). If a PR bumps
  to a tag that was not pushed yet, the rollout wait will time out -> PR fails,
  which is the intended gate behavior.
- The workflow triggers on `src/app-groups/ssp/**` changes only; pure
  cluster/grafana/elk PRs are out of scope for now.
- The sops Job downloads the encrypted secrets from real AWS S3 and decrypts
  via real GCP KMS — both come from `SSP_SECRETS_YAML`. If CI must not touch
  real buckets, skip `common/secret-manager` in the ci overlay and ship an
  `aws-services-secrets` Secret doc inside `SSP_SECRETS_YAML` instead.
