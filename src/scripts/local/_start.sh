#!/bin/bash

./create-namespaces.sh
./apply-cloud-secrets-local.sh
./set-cluster-config.sh
#./start-argo-apps.sh
./start-argo-app.sh ssp

