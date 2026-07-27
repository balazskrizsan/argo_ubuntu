#!/bin/bash

# Restore argocd-cm ConfigMap in production environment
# Usage: ./restore-argocd-cm.sh

NAMESPACE="argocd"
CONFIGMAP_FILE="app-groups/cluster/scripts/local/argocd-cm.yaml"

echo "Restoring argocd-cm ConfigMap in namespace: $NAMESPACE"

# Delete existing ConfigMap
kubectl delete configmap argocd-cm -n $NAMESPACE

# Apply new ConfigMap from local file
kubectl apply -f $CONFIGMAP_FILE

# Restart ArgoCD server to pick up changes
kubectl rollout restart deployment argocd-server -n $NAMESPACE

echo "Done. ArgoCD server is restarting..."
