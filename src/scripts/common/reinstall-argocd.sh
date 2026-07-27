#!/bin/bash

# @todo: need to apply: src/app-groups/cluster/apps/argo-cd/ubuntu/argocd-ingress.yaml

# Reinstall ArgoCD completely
# This script will delete and reinstall the entire ArgoCD installation
# Usage: ./reinstall-argocd.sh

set -e

NAMESPACE="argocd"
APP_NAME="cluster--ubuntu--app"

echo "=========================================="
echo "ArgoCD Reinstallation Script"
echo "=========================================="
echo ""

# Step 1: Delete ArgoCD Application
echo "Step 1: Deleting ArgoCD Application..."
kubectl delete application $APP_NAME -n $NAMESPACE --ignore-not-found
echo "ArgoCD Application deleted."
echo ""

# Step 2: Delete ArgoCD namespace and all resources
echo "Step 2: Deleting ArgoCD namespace and all resources..."
kubectl delete namespace $NAMESPACE --ignore-not-found
echo "Waiting for namespace deletion..."
kubectl wait --for=delete namespace/$NAMESPACE --timeout=60s || true
echo "ArgoCD namespace deleted."
echo ""

# Step 3: Wait a bit for cleanup
echo "Step 3: Waiting for cleanup..."
sleep 5
echo ""

# Step 4: Create namespace
echo "Step 4: Creating ArgoCD namespace..."
kubectl create namespace $NAMESPACE
echo "ArgoCD namespace created."
echo ""

# Step 5: Apply ArgoCD installation
echo "Step 5: Applying ArgoCD installation..."
kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml -n $NAMESPACE
echo "ArgoCD installation applied."
echo ""

# Step 6: Wait for ArgoCD to be ready
echo "Step 6: Waiting for ArgoCD components to be ready..."
kubectl wait --for=condition=available deployment/argocd-server -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=available deployment/argocd-repo-server -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=available deployment/argocd-application-controller -n $NAMESPACE --timeout=300s
echo "ArgoCD components are ready."
echo ""

# Step 7: Apply custom ArgoCD ConfigMap if exists
if [ -f "argocd-cm.yaml" ]; then
  echo "Step 7: Applying custom ArgoCD ConfigMap..."
  kubectl apply -f argocd-cm.yaml -n $NAMESPACE
  kubectl rollout restart deployment argocd-server -n $NAMESPACE
  echo "Custom ConfigMap applied."
  echo ""
fi

# Step 8: Apply ArgoCD ingress if exists
if [ -f "argocd-ingress.yaml" ]; then
  echo "Step 8: Applying ArgoCD ingress..."
  kubectl apply -f argocd-ingress.yaml -n $NAMESPACE
  echo "ArgoCD ingress applied."
  echo ""
fi

echo "=========================================="
echo "ArgoCD reinstallation completed successfully!"
echo "=========================================="
echo ""
echo "You can get the initial admin password with:"
echo "  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo ""
