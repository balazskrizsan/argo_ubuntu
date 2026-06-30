# argo_ubuntu — Project Description

## Overview

`argo_ubuntu` is a **GitOps deployment repository** for the *Smart Scrum Poker (SSP)*
application stack and a supporting **ELK** (Elasticsearch / Logstash / Kibana) logging
stack. It contains **no application source code** — only Kubernetes manifests, Kustomize
overlays, [Argo CD](https://argo-cd.readthedocs.io/) `Application` definitions and helper
shell scripts that describe *how* the pre-built container images are deployed to a
Kubernetes cluster.

The repository is built around two target environments:

| Folder suffix | Meaning                                            |
|---------------|----------------------------------------------------|
| `local`       | Local developer cluster (e.g. Docker Desktop / kind / minikube on Ubuntu) |
| `ubuntu`      | A bare‑metal / VM "prod‑like" Ubuntu cluster       |
| `templates`   | Shared base manifests overlaid by the env folders  |

Git remote: `https://github.com/balazskrizsan/argo_ubuntu` (branch: `master`).

---

## Architecture

### Deployment model (GitOps with Argo CD)

1. Argo CD runs inside the cluster (namespace `argocd`).
2. An Argo CD `Application` object points at a path in **this Git repo**
   (e.g. `src/app-groups/ssp/scripts/local`).
3. That path is a **Kustomize root** that aggregates all the app manifests for the group.
4. Argo CD continuously syncs the rendered manifests into the target namespace
   (`ssp-local`, `elk-local`, …), with `automated.prune: true`.

```
argo-apps/local/ssp--local--app.yaml   ──▶  src/app-groups/ssp/scripts/local (kustomize root)
                                                 ├── apps/common      (psql config, cert-manager job)
                                                 ├── apps/aws-services
                                                 ├── apps/ids         (+ postgres)
                                                 ├── apps/backend     (+ postgres)
                                                 └── apps/frontend
```

### Application groups

**`ssp` — Smart Scrum Poker** (deployed to namespace `ssp-local`):

| App           | Image (local overlay)                                        | Notes |
|---------------|-------------------------------------------------------------|-------|
| `frontend`    | `kbalazsworks/smart_scrum_poker_v2_frontend`                | Web UI |
| `backend`     | `kbalazsworks/smart_scrum_poker_v2_backend`                 | REST API + its own PostgreSQL 16.2 |
| `ids`         | `placeholder` (set per‑overlay)                             | Identity server + its own PostgreSQL 16.2 |
| `aws-services`| `kbalazsworks/smart_scrum_poker_v2_aws_services`            | AWS integration service |
| `common`      | —                                                           | Shared PSQL config + cert‑manager PreSync job |

**`elk` — logging stack** (namespace `elk-local`): `elastic`, `logstash`, `kibana`,
`elastalert` (with backup / restore / erase jobs for Elasticsearch).

### Networking / Ingress

Routing uses an **NGINX Ingress Controller** with TLS terminated via a `env-cert`
secret. Hostnames (local):

| Service       | Host                                                            |
|---------------|----------------------------------------------------------------|
| Argo CD UI    | `argocd.localhost.balazskrizsan.com`                           |
| Frontend      | `smartscrumpoker.localhost.balazskrizsan.com`                  |
| Backend API   | `api--smartscrumpoker.localhost.balazskrizsan.com`            |
| IDS           | `ids--smartscrumpoker.localhost.balazskrizsan.com`           |
| AWS services  | `api--aws-services--smartscrumpoker.localhost.balazskrizsan.com` |

See [`port-map.md`](./port-map.md) for the full host‑port allocation (BE `:4000x`,
FE `:4030x`, IDS `:4040x`, etc., per environment).

### Secrets & certificates

* **TLS certs** for local live in `src/certs/localhost-krizsanbalazs-com-stack/`
  (`fullchain.pem`, `privkey.pem`, a `keystore.jks`, etc.) and are loaded into the
  `env-cert` TLS secret in each namespace.
* **Cloud secrets** are applied from `src/secerts/cloud-secrets-local.yaml`
  — **this file is git‑ignored and must be supplied locally** (only `*.tpl` templates
  are tracked). It provides the `cloud-secrets` Secret consumed by the cert‑manager and
  secret‑manager PreSync jobs.
* In‑cluster jobs (`cert-manager-job`, `secret-manager-job`) pull real certs/secrets
  from AWS S3 / decrypt with **SOPS + GCP KMS** using `kbalazsworks/kubernetes_job_base_image`.

---

## Repository layout

```
.
├── port-map.md                     # Host/port allocation matrix per environment
├── src
│   ├── addon-ingress/local/        # Ingress for the Argo CD UI itself
│   ├── app-groups/
│   │   ├── ssp/                     # Smart Scrum Poker app group
│   │   │   ├── apps/{frontend,backend,ids,aws-services,common}/
│   │   │   │   ├── templates/       # Base k8s manifests (Deployment/Service/Ingress)
│   │   │   │   └── local/           # Kustomize overlay: images, ports, hosts, PV/PVCs
│   │   │   └── scripts/local/       # Kustomize root + RBAC cluster-config + start/delete
│   │   └── elk/                     # Elasticsearch/Logstash/Kibana/Elastalert group
│   ├── argo-apps/                   # Argo CD Application CRDs (local + ubuntu)
│   ├── certs/                       # Local TLS material
│   └── scripts/local/              # Bootstrap/orchestration shell scripts
└── (src/secerts/  — git-ignored, you create this)
```

### Key scripts (`src/scripts/local/`)

| Script | Purpose |
|--------|---------|
| `_start.sh`              | Full bring‑up: namespaces → cloud secrets → cluster RBAC → start `ssp` app |
| `_delete.sh`             | Full teardown: stop app → remove finalizers → delete namespaces |
| `_config.sh`             | Shared config (namespace list, app list, cert helper functions) |
| `create-namespaces.sh` / `delete-namespaces.sh` | Manage app namespaces |
| `apply-cloud-secrets-local.sh` | Apply `src/secerts/cloud-secrets-local.yaml` |
| `set-cluster-config.sh`  | Apply RBAC roles/bindings for the in‑cluster jobs |
| `set-or-update-certs.sh` | Create/refresh the `env-cert` TLS secret in each namespace |
| `start-argo-app.sh <name>` / `stop-argo-app.sh <name>` | Apply/delete one Argo `Application` |
| `argocd-add-extensions.sh` | Apply the Argo CD UI ingress |
| `argocd-get-master-password.sh` | Print the initial Argo CD admin password |
| `argocd-remove-finalizers.sh` | Unblock stuck Application deletions |

---

## Local setup

### Required tools

| Tool | Recommended version | Purpose |
|------|--------------------|---------|
| **Kubernetes cluster** (Docker Desktop K8s / minikube / kind / k3s) | 1.27+ | Runtime target |
| **kubectl** | matches cluster (1.27+) | All scripts call `kubectl` (uses built‑in Kustomize `-k`) |
| **Argo CD** (in‑cluster) | 2.8+ | GitOps controller + UI |
| **argocd CLI** *(optional)* | 2.8+ | Manage Argo CD from terminal |
| **Kustomize** | bundled in kubectl ≥1.21 (or standalone 5.x) | Renders overlays |
| **NGINX Ingress Controller** | 1.9+ | Ingress / TLS termination |
| **Bash** | 4+ | Run the `*.sh` scripts (Linux/Ubuntu, WSL, or Git Bash on Windows) |
| **Git** | 2.x | Clone the repo |
| **OpenSSL / keytool** *(optional)* | — | Inspect/regenerate the certs in `src/certs/` |

> Note: scripts are written for **Ubuntu/Bash** and use relative `cd ../../` paths, so run
> them from inside `src/scripts/local/`. On Windows use **WSL2** or **Git Bash**.

### Installing the tools (macOS & Windows)

The fastest path is to use a package manager: **[Homebrew](https://brew.sh/)** on macOS and
**[winget](https://learn.microsoft.com/windows/package-manager/)** (or
[Chocolatey](https://chocolatey.org/)) on Windows.

#### 0. Package manager (install first)

| OS | Install command |
|----|-----------------|
| macOS | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Windows | `winget` ships with Windows 10/11. (Chocolatey: run in an **admin** PowerShell: `Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`) |

#### 1. Git

| OS | Command |
|----|---------|
| macOS | `brew install git` |
| Windows | `winget install --id Git.Git -e` |

#### 2. Docker Desktop (provides the local Kubernetes cluster)

Docker Desktop bundles a one‑click single‑node Kubernetes cluster — the simplest local
runtime. After installing, enable it via **Settings → Kubernetes → Enable Kubernetes**.

| OS | Command |
|----|---------|
| macOS | `brew install --cask docker` |
| Windows | `winget install --id Docker.DockerDesktop -e` (requires WSL2 — see step 7) |

> Alternatives to Docker Desktop's cluster: **minikube** (`brew install minikube` /
> `winget install Kubernetes.minikube`) or **kind** (`brew install kind` /
> `winget install Kubernetes.kind`).

#### 3. kubectl

| OS | Command |
|----|---------|
| macOS | `brew install kubectl` |
| Windows | `winget install --id Kubernetes.kubectl -e` |

> kubectl includes a built‑in Kustomize (`kubectl apply -k`), which is all the scripts need.
> For a standalone binary: `brew install kustomize` / `winget install Kubernetes.kustomize`.

#### 4. Argo CD CLI (optional, for terminal management)

| OS | Command |
|----|---------|
| macOS | `brew install argocd` |
| Windows | `winget install --id ArgoCD.argocd -e` (or `choco install argocd-cli`) |

> Argo CD itself runs **inside the cluster** and is installed with `kubectl apply` — see
> *Prerequisites in the cluster* below; only the CLI is installed on your machine.

#### 5. NGINX Ingress Controller

Installed **into the cluster**, not on your machine. Easiest via the official manifest
(works on Docker Desktop / kind):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

Or via Helm (install Helm first: `brew install helm` / `winget install Helm.Helm`):

```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

#### 6. OpenSSL (optional — inspect/regenerate certs)

| OS | Command |
|----|---------|
| macOS | `brew install openssl` (`keytool` comes with a JDK: `brew install openjdk`) |
| Windows | Ships with Git Bash; or `winget install ShiningLight.OpenSSL.Light`. `keytool` comes with a JDK: `winget install EclipseAdoptium.Temurin.21.JDK` |

#### 7. Bash to run the `*.sh` scripts

* **macOS** — Bash/zsh are preinstalled; the scripts run as‑is.
* **Windows** — the scripts are **Bash‑only**. Use one of:
  * **WSL2** (recommended): `wsl --install` in an admin PowerShell, then run everything from
    the Ubuntu shell. `kubectl`/`docker` from Docker Desktop are available inside WSL.
  * **Git Bash** (installed with Git) for quick runs.

#### One‑liner installs

```bash
# macOS
brew install git kubectl argocd helm openssl && brew install --cask docker

# Windows (winget)
winget install Git.Git Kubernetes.kubectl ArgoCD.argocd Helm.Helm Docker.DockerDesktop
```

After installing, verify:

```bash
git --version
docker --version
kubectl version --client
argocd version --client
```

### Prerequisites in the cluster

1. **Argo CD installed** in the `argocd` namespace, e.g.:
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
2. **NGINX Ingress Controller installed** (so the `*.localhost.balazskrizsan.com` hosts resolve to services).
3. **Hosts file entries** mapping the ingress hostnames to your cluster IP (e.g. `127.0.0.1`):
   ```
   127.0.0.1 argocd.localhost.balazskrizsan.com smartscrumpoker.localhost.balazskrizsan.com api--smartscrumpoker.localhost.balazskrizsan.com ids--smartscrumpoker.localhost.balazskrizsan.com api--aws-services--smartscrumpoker.localhost.balazskrizsan.com
   ```
4. **Create the git‑ignored secrets file** `src/secerts/cloud-secrets-local.yaml` defining a
   Secret named `cloud-secrets` with the keys referenced by the jobs
   (`AWS_S3_CERTIFICATE_FOLDER`, `AWS_SERVICES_APP_SECRET_PATH`, `GOOGLE_SERVICE_ACCOUNT`, …).
   *(Obtain real values from the project owner.)*

### Bring the stack up

```bash
git clone https://github.com/balazskrizsan/argo_ubuntu.git
cd argo_ubuntu/src/scripts/local

# (optional) load TLS certs into the namespaces
./set-or-update-certs.sh

# full bootstrap (namespaces + secrets + RBAC + ssp Argo app)
./_start.sh

# expose the Argo CD UI ingress and read the admin password
./argocd-add-extensions.sh
./argocd-get-master-password.sh
```

Then open `https://argocd.localhost.balazskrizsan.com` (user `admin`) and
`https://smartscrumpoker.localhost.balazskrizsan.com` for the app.

### Tear the stack down

```bash
cd argo_ubuntu/src/scripts/local
./_delete.sh
```

---

## How changes are deployed

Because this is GitOps, the normal workflow is:

1. Edit a Kustomize overlay (e.g. bump an image tag in
   `src/app-groups/ssp/apps/backend/local/kustomization.yaml`).
2. Commit & push to `master`.
3. Argo CD detects the change and auto‑syncs (`prune: true`, `selfHeal: false`).

Image tags follow the pattern `kbalazsworks/<service>:commit_sha_short_<sha>` — the actual
application images are produced by the separate Smart Scrum Poker source repositories, not here.

---

## Notes & gotchas

* `selfHeal: false` — manual `kubectl` edits in the cluster are **not** auto‑reverted, but
  deleted resources are re‑created on the next sync.
* The base `templates/deployment.yaml` files use `image: placeholder:placeholder`; the real
  image is injected by each environment overlay's `patches` block.
* `src/secerts/` is intentionally git‑ignored (only `*.tpl` templates are committed); never
  commit real secret values.
* The folder name `secerts` (sic) is the literal name used by the scripts and `.gitignore`.
