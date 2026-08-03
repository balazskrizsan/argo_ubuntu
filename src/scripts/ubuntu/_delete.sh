#!/bin/bash

#./stop-argo-apps.sh
./stop-argo-app.sh elk
./stop-argo-app.sh ssp
./stop-argo-app.sh ssp-uat
./stop-argo-app.sh cluster
./../common/unbind-all-pv.sh
./../common/delete-pv-pvc.sh
./argocd-remove-finalizers.sh
./delete-namespaces.sh
