#!/bin/bash

source ./_config.sh

kubectl apply -k ../../app-groups/ssp/scripts/local/cluster-config
