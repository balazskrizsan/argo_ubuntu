#!/bin/bash

# Reset claimRef on all persistent volumes to allow rebinding without data loss
echo "Unbinding all PVs..."
for pv in $(kubectl get pv -o name); do
  echo "Unbinding $pv"
  kubectl patch "$pv" -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
done
