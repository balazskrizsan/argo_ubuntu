#!/bin/bash

kubectl patch job secret-manager-job -n ssp-local --type=merge -p '{"metadata":{"finalizers":[]}}'
kubectl patch job cert-manager-job -n ssp-local --type=merge -p '{"metadata":{"finalizers":[]}}'
