#!/bin/bash

source ../common/_functions.sh

export APP_NAMESPACES=(
  "ssp-prod"
  "ssp-uat"
  "elk"
)

export ENV_CERT_NAMESPACES=(
  "argo-cd"
  "kubernetes-dashboard"
)
ENV_CERT_NAMESPACES+=("${APP_NAMESPACES[@]}")

export ARGO_APPS=(
  "elk"
  "ssp"
  "ssp-uat"
  "cluster"
)

