#!/bin/bash

#./stop-argo-apps.sh
./stop-argo-app.sh elk
./stop-argo-app.sh ssp
./stop-argo-app.sh argo-cd
./argocd-remove-finalizers.sh
./unbind-claims.sh
./delete-namespaces.sh
