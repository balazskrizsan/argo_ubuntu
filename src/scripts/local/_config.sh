#!/bin/bash

NAMESPACES=(
  "argocd"
)

export ENV_CERT_NAMESPACES=(
  "argocd"
)

export ARGO_APPS=(
  "elk"
  "ssp"
)

set_or_update_cert() {
  local namespace="$1"

  kubectl delete secret env-cert \
    -n "$namespace" \
    --ignore-not-found

  kubectl create secret tls env-cert \
    -n "$namespace" \
    --key ./../../certs/localhost-krizsanbalazs-com-stack/privkey.pem \
    --cert ./../../certs/localhost-krizsanbalazs-com-stack/fullchain.pem
}

toggle_argo_app() {
  local command="$1"
  local env="$2"
  local app="$3"

  echo "Argo app: $command => $env / $app"

  goto_src

  cd "argo-apps/$env/" || exit

  kubectl $command -f "./$app--$env--app.yaml"
}

goto_src() {
  cd "./../../" || exit
}
