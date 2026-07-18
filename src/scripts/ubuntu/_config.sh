#!/bin/bash

export APP_NAMESPACES=(
  "ssp-local"
)

export ENV_CERT_NAMESPACES=(
  "argo-cd"
  "elk-local"
  "kubernetes-dashboard"
)
ENV_CERT_NAMESPACES+=("${APP_NAMESPACES[@]}")

export ARGO_APPS=(
#  "elk"
#  "ssp"
  "cluster"
)

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
