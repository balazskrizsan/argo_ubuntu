#!/bin/bash

source ../common/_functions.sh

export APP_NAMESPACES=(
  "ssp-local"
)

export ENV_CERT_NAMESPACES=(
  "argocd"
  "elk-local"
)
ENV_CERT_NAMESPACES+=("${APP_NAMESPACES[@]}")

export ARGO_APPS=(
  "elk"
  "ssp"
  "argo-cd"
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
