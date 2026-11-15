param([string]$Installer = '')
$ErrorActionPreference = 'Stop'
$desktopRoot = Split-Path $PSScriptRoot -Parent
if (!$Installer) {
 $version = (Get-Content (Join-Path $desktopRoot 'package.json') -Raw | ConvertFrom-Json).version
 $Installer = Join-Path $desktopRoot "release\Agenetic-Test-Setup-$version-x64.exe"
}
if (!(Test-Path -LiteralPath $Installer)) { throw "Installer not found: $Installer" }
$signature = Get-AuthenticodeSignature -LiteralPath $Installer
[PSCustomObject]@{
 File = (Resolve-Path -LiteralPath $Installer).Path
 Status = $signature.Status
 Reason = $signature.StatusMessage
 Subject = $signature.SignerCertificate.Subject
 Thumbprint = $signature.SignerCertificate.Thumbprint
 SHA256 = (Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash
} | Format-List
Write-Host 'Read-only inspection. No installer was run and no certificate trust was changed.'
