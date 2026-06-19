#!/bin/bash

source ./_config.sh

for namespace in "${APP_NAMESPACES[@]}"; do
  kubectl delete namespace "${namespace}" --grace-period=0 --force
done
