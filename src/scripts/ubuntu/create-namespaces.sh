#!/bin/bash

source ./_config.sh

for namespace in "${APP_NAMESPACES[@]}"; do
  kubectl create namespace "${namespace}"
done
