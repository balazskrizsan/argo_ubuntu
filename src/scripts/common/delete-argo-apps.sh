#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <env>"
  echo "Example: $0 local"
  echo "Example: $0 ubuntu"
  exit 1
fi

ENV="$1"

source ../$ENV/_config.sh

for argo_app in "${ARGO_APPS[@]}"; do
  toggle_argo_app "delete" "${ENV}" "${argo_app}"
done
