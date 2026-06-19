#!/bin/bash

#./stop-argo-apps.sh
./stop-argo-app.sh ssp
./argocd-remove-finalizers.sh
./delete-namespaces.sh
