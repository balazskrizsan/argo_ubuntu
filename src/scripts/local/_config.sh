#!/bin/bash

NAMESPACES=(
  "argocd"
)

export ENV_CERT_NAMESPACES=(
  "argocd"
)

export ARGO_APPS=(
  "elk"
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
  local namespace="$2"
  local env="$3"
  local app="$4"

  echo "Argo app: $command => $namespace / $env / $app"

  kubectl $command -f "./../../argo-apps/$env/$namespace--$app--app.yaml"
}
