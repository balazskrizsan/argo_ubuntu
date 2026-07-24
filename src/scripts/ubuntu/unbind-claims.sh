#!/bin/bash

# Reset claimRef on static persistent volumes to allow rebinding without data loss
kubectl patch pv ssp--backend--prod--psql--persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
kubectl patch pv ssp--ids--prodl--dp-persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
kubectl patch pv ssp--ids--prod--psql--persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
