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
   `ssp-local` overlay.
4. **Install ingress-nginx** (kind provider manifest).
5. **Create namespace + secrets**: `env-cert` is a self-signed
   `*.localhost.balazskrizsan.com` cert; `aws-services-secrets` is applied from
   `src/secerts/aws-services.prod.secrets.dec.yaml`. The real
   cert-manager / secret-manager Jobs are intentionally **excluded** from the
   CI overlay (they would need AWS S3 + GCP KMS access in GHA).
6. **Deploy** `kubectl apply -k src/app-groups/ssp/scripts/ci` and wait for all
   rollouts.
7. **Smoke check** frontend + IDS discovery endpoint over HTTPS.
8. **Playwright placeholder** — activates automatically once an `e2e/`
   directory exists. Use `baseURL: https://smartscrumpoker.localhost.balazskrizsan.com`
   and `ignoreHTTPSErrors: true` (self-signed cert).
9. On failure: pods, events and container logs are dumped to the job log.

## Differences vs the real `local` stack

- **No** cert-manager / secret-manager Jobs, no `cloud-secrets`, no `namespace-config`.
- fluent-bit **is kept** — `identity-service/local` patches its `fluent-bit-env`
  ConfigMap, so removing it would break `kubectl apply -k`.
- Namespace stays `ssp-local` because `aws-services/local` hardcodes
  `ids.ssp-local.svc.cluster.local` in `OIDC_INTROSPECTION_URI`.

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
- aws-services talks to real AWS S3 with the committed keys; if CI runs should
  never touch real buckets, replace `aws-services.prod.secrets.dec.yaml` with
  dummy values via `kubectl create secret generic` in the workflow.
