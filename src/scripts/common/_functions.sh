#!/bin/bash

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
