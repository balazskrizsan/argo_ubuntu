#!/bin/bash

source ./_config.sh

kubectl apply -k ../../app-groups/ssp/scripts/ubuntu_prod/cluster-config
kubectl apply -k ../../app-groups/ssp/scripts/ubuntu_uat/cluster-config
