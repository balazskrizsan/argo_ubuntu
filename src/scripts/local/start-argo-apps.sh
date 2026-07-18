#!/bin/bash

source ./_config.sh

for argo_app in "${ARGO_APPS[@]}"; do
  toggle_argo_app "create" "local" "${argo_app}"
done
