#!/bin/bash

source ./_config.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <app-name>"
  echo "Example: $0 elk"
  exit 1
fi

APP_NAME="$1"

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

toggle_argo_app "create" "local" "${APP_NAME}"
