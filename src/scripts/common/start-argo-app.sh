#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <env> <app-name>"
  echo "Example: $0 local elk"
  echo "Example: $0 ubuntu elk"
  exit 1
fi

ENV="$1"
APP_NAME="$2"

if [ -z "$APP_NAME" ]; then
  echo "Error: Missing app-name parameter"
  echo "Usage: $0 <env> <app-name>"
  exit 1
fi

source ../$ENV/_config.sh

# Check if app exists in ARGO_APPS array
APP_FOUND=false
for argo_app in "${ARGO_APPS[@]}"; do
  if [ "$argo_app" = "$APP_NAME" ]; then
    APP_FOUND=true
    break
  fi
done

if [ "$APP_FOUND" = false ]; then
  echo "Error: App '$APP_NAME' not found in ARGO_APPS config."
  echo "Available apps: ${ARGO_APPS[*]}"
  exit 1
fi

toggle_argo_app "create" "${ENV}" "${APP_NAME}"
