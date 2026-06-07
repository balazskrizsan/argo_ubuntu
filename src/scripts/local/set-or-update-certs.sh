#!/bin/bash

source ./_config.sh

for namespace in "${ENV_CERT_NAMESPACES[@]}"; do
  set_or_update_cert "${namespace}"
done
