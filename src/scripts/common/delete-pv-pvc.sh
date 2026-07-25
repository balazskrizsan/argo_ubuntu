#!/bin/bash

echo "Deleting all PVCs..."
for pvc in $(kubectl get pvc --all-namespaces -o name); do
  echo "Deleting $pvc"
  kubectl delete "$pvc" --grace-period=0 --force 2>/dev/null || true
done

echo "Deleting all PVs..."
for pv in $(kubectl get pv -o name); do
  echo "Deleting $pv"
  kubectl delete "$pv" --grace-period=0 --force 2>/dev/null || true
done

echo "PV and PVC deletion complete"
