#!/bin/bash

./create-namespaces.sh
./apply-cloud-secrets.sh
./set-cluster-config.sh
#./start-argo-apps.sh
#./start-argo-app.sh elk
#./start-argo-app.sh ssp
./start-argo-app.sh cluster
