#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <env>"
  echo "Example: $0 local"
  echo "Example: $0 ubuntu"
  exit 1
fi

ENV="$1"

source ../$ENV/_config.sh

for namespace in "${APP_NAMESPACES[@]}"; do
  kubectl delete namespace "${namespace}" --grace-period=0 --force
done
