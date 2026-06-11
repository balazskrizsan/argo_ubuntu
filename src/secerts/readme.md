# Encrypt with sops

```powershell
> $env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path '.\google-service-account.json').Path
```

```powershell
> sops.exe --gcp-kms "projects/smartscrumpoker/locations/global/keyRings/sops/cryptoKeys/sops-key"   --encrypt .\aws-services.prod.secrets.dec.yaml > .\aws-services.prod.secrets.enc.yaml
```
