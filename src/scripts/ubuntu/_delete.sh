#!/bin/bash

#./stop-argo-apps.sh
./stop-argo-app.sh elk
#./stop-argo-app.sh ssp
#./stop-argo-app.sh cluster
./argocd-remove-finalizers.sh
./delete-namespaces.sh
