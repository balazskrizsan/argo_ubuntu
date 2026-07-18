#!/bin/bash

mkdir -p /argo_ubuntu_certs_secrets

curl -o "/argo_ubuntu_certs_secrets/certificate.crt" \
  "https://smart-scrum-poker-secrets.s3.us-east-1.amazonaws.com/cert--smart-scrump-poker.stack/v11/certificate.crt"

curl -o "/argo_ubuntu_certs_secrets/private.key" \
  "https://smart-scrum-poker-secrets.s3.us-east-1.amazonaws.com/cert--smart-scrump-poker.stack/v11/private-decrypted.key"

curl -o "/argo_ubuntu_certs_secrets/private-orig.key" \
  "https://smart-scrum-poker-secrets.s3.us-east-1.amazonaws.com/cert--smart-scrump-poker.stack/v11/private.key"

sudo systemctl restart nginx
