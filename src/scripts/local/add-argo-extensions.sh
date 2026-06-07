#!/bin/bash

kubectl delete -f ./../../addon-ingress/local/argocd-ingress.yaml \
  -n argocd \
  --ignore-not-found
kubectl apply -f ./../../addon-ingress/local/argocd-ingress.yaml \
  -n argocd
