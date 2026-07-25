#!/bin/bash

minikube start \
  --driver=docker \
  --force \
  --apiserver-ips=0.0.0.0 \
  --apiserver-port=8443 \
  --cpus=7 \
  --memory=15360 \
  --addons=ingress,dashboard,metrics-server \
  --mount --mount-string="/minikube_backup/ssp/prod_psql_data:/mnt/ssp/prod_psql_data" \
  --mount --mount-string="/minikube_backup/ssp/uat_psql_data:/mnt/ssp/uat_psql_data"
