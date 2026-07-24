#!/bin/bash

# Reset claimRef on static persistent volumes to allow rebinding without data loss
kubectl patch pv ssp--backend--local--psql--persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
kubectl patch pv ssp--ids--local--dp-persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
kubectl patch pv ssp--ids--local--psql--persistent-volume -p '{"spec":{"claimRef": null}}' 2>/dev/null || true
