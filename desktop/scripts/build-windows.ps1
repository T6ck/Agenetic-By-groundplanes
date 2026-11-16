param([switch]$Release, [switch]$AzureSigning, [switch]$SelfSigned, [ValidateSet("stable","beta")][string]$Channel = "stable", [string]$LlamaDirectory = "")
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if ($Release -and $SelfSigned) { throw 'Choose Release or SelfSigned, not both.' }
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Build command failed: $LASTEXITCODE" } }
if ($AzureSigning -and !$Release) { throw 'Azure signing requires -Release.' }
if ($Release -and !$AzureSigning -and (!$env:CSC_LINK -or !$env:CSC_KEY_PASSWORD -or !$env:AGENETIC_SIGNER_THUMBPRINT)) { throw 'Signed release requires CSC_LINK, CSC_KEY_PASSWORD and AGENETIC_SIGNER_THUMBPRINT. Use a secret store, never commit keys.' }
$isSigned = $Release -or $SelfSigned
if ($SelfSigned) {
 # Keep the private key in Windows CurrentUser\My. Never ship it with the installer.
 $identityDir = Join-Path $env:LOCALAPPDATA 'Groundplanes\Signing'
 New-Item -ItemType Directory -Force $identityDir | Out-Null
 $pinFile = Join-Path $identityDir 'agenetic-test-thumbprint.txt'
 if (Test-Path $pinFile) {
  $pin = (Get-Content $pinFile -Raw).Trim()
  if ($pin -notmatch '^[A-Fa-f0-9]{40}$') { throw 'Invalid saved test signer.' }
  $testCert = Get-Item "Cert:\CurrentUser\My\$pin" -ErrorAction Stop
  if (!$testCert.HasPrivateKey -or $testCert.NotAfter -lt (Get-Date).AddDays(7)) { throw 'Test certificate missing its key or expiring. Preserve the existing identity and plan certificate rotation.' }
 } else {
  $testCert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=Groundplanes Development' -FriendlyName 'Agenetic development signing only' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -NotAfter (Get-Date).AddYears(2)
  $testCert.Thumbprint | Set-Content $pinFile
 }
 $env:AGENETIC_SIGNER_THUMBPRINT = $testCert.Thumbprint
 Remove-Item Env:CSC_LINK -ErrorAction SilentlyContinue
 Remove-Item Env:WIN_CSC_LINK -ErrorAction SilentlyContinue
 New-Item -ItemType Directory -Force release | Out-Null
 Export-Certificate -Cert $testCert -FilePath release\Agenetic-Development.cer -Force | Out-Null
 Write-Host "Development signer: $($testCert.Thumbprint). Only the public certificate is exported."
}
py -3.12 -m venv .venv; Check-Exit
& .\.venv\Scripts\python.exe -m pip install --requirement requirements.txt; Check-Exit
& .\.venv\Scripts\python.exe -m PyInstaller --noconfirm --clean --onefile --name agenetic-companion --distpath runtime --workpath build --collect-all huggingface_hub --collect-all mcp --collect-all jsonschema --collect-all keyring ..\public\agenetic-runner.py; Check-Exit
if ($LlamaDirectory) {
 if (!(Test-Path (Join-Path $LlamaDirectory 'llama-cli.exe'))) { throw 'Choose an official llama.cpp Windows distribution containing llama-cli.exe.' }
 Copy-Item (Join-Path $LlamaDirectory '*') runtime -Recurse -Force
}
if ($Release -and !$AzureSigning -and $env:AGENETIC_SIGNER_THUMBPRINT -notmatch '^[a-fA-F0-9]{40}$') { throw 'Invalid signer certificate thumbprint.' }
$profileEku = if ($AzureSigning) { '1.3.6.1.4.1.311.97.195110185.989389674.218214560.908509447' } else { '' }
@{ signingProfileEku = $profileEku; signerThumbprints = @($env:AGENETIC_SIGNER_THUMBPRINT); signed = [bool]$isSigned; development = [bool]$SelfSigned; channel = $Channel; runtime = 'Python 3.12'; modelRuntimeBundled = [bool]$LlamaDirectory } | ConvertTo-Json | Set-Content runtime\release.json -Encoding utf8
npm ci; Check-Exit
npm run prepare:assets; Check-Exit
npm test; Check-Exit
if ($isSigned) { $env:CSC_IDENTITY_AUTO_DISCOVERY = 'true' } else { $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false' }
if ($SelfSigned) {
 npx --no-install electron-builder --win nsis --x64 --publish never "--config.win.signtoolOptions.certificateSha1=$($testCert.Thumbprint)" '--config.win.signtoolOptions.publisherName=Groundplanes Development' '--config.publish.url=https://groundplanes.com/downloads/agenetic/windows-test/' '--config.win.artifactName=Agenetic-Test-Setup-${version}-${arch}.${ext}'; Check-Exit
 Get-ChildItem release\Agenetic-Test-Setup-*.exe | ForEach-Object {
  $signature = Get-AuthenticodeSignature $_.FullName
  if ($signature.SignerCertificate.Thumbprint -ne $testCert.Thumbprint -or $signature.Status -notin @('Valid','NotTrusted')) { throw "Development signature verification failed. File: $($_.Name); status: $($signature.Status); reason: $($signature.StatusMessage); signer: $($signature.SignerCertificate.Thumbprint). Do not distribute until investigated." }
 }
 Write-Host 'Self-signed test build only. Windows trust is not installed or bypassed. Automatic updates are disabled for development builds.'
} elseif ($AzureSigning) {
 npx --no-install electron-builder --win nsis --x64 --publish never '--config.forceCodeSigning=true' '--config.win.azureSignOptions.endpoint=https://eus.codesigning.azure.net/' '--config.win.azureSignOptions.codeSigningAccountName=Groundplanes' '--config.win.azureSignOptions.certificateProfileName=agenetic-release' '--config.win.azureSignOptions.publisherName=David Tackett' '--config.win.azureSignOptions.timestampRfc3161=http://timestamp.acs.microsoft.com' '--config.win.azureSignOptions.timestampDigest=SHA256' '--config.win.azureSignOptions.fileDigest=SHA256'; Check-Exit
} else { npm run dist:win; Check-Exit }
if ($Release) {
 node scripts/verify-release.cjs; Check-Exit
 if ($env:AGENETIC_UPDATE_SIGNING_KEY) { node scripts\sign-feed.mjs; Check-Exit }
}
Write-Host 'Build completed. Test installation, model loading, backup restore and uninstall on a clean Windows machine before publication.'
