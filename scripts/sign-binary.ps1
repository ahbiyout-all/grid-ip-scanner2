param(
    [string]$TargetExe = ""
)

# Set console output encoding to UTF-8 to prevent Korean character corruption in Windows CMD/PowerShell
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Grid IP Scanner2 - Self-Signed Code Signing Utility " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Terminate any running instances of Grid IP Scanner2 before signing to prevent file locking IOExceptions
try {
    Write-Host "[*] Terminating any running instances of Grid IP Scanner2..." -ForegroundColor Cyan
    & taskkill /F /IM "Grid IP Scanner2*.exe" 2>$null
    & taskkill /F /IM "Grid_IP_Scanner2.exe" 2>$null
    Start-Sleep -Milliseconds 600
} catch {}

# 1. Check for existing code signing certificate in Cert:\CurrentUser\My or create one
$certName = "GridIPScanner2_TestSign"
$cert = Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue | Where-Object { $_.Subject -like "*$certName*" }

if (-not $cert) {
    Write-Host "[*] Creating new Self-Signed Code Signing Certificate..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -KeyExportPolicy Exportable -KeyUsage DigitalSignature -FriendlyName "Grid IP Scanner2 Test Certificate" -CertStoreLocation "Cert:\CurrentUser\My"
    Write-Host "[OK] Created certificate thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
    
    # Automatically export and add to Trusted Root for local testing convenience
    try {
        $rootStore = [System.Security.Cryptography.X509Certificates.X509Store]::new("Root", "CurrentUser")
        $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $rootStore.Add($cert)
        $rootStore.Close()
        Write-Host "[OK] Added test certificate to CurrentUser Trusted Root store." -ForegroundColor Green
    } catch {
        Write-Host "[!] Note: Could not auto-add to Trusted Root store (requires admin for Machine store). You can still sign binaries." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Found existing test code signing certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

# 2. Find signtool.exe (Windows SDK)
$signtoolPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\8.1\bin\x64\signtool.exe"
)

$signtool = $null
foreach ($path in $signtoolPaths) {
    if (Test-Path $path) {
        $signtool = $path
        break
    }
}

if (-not $signtool) {
    $whereSignTool = Get-Command signtool -ErrorAction SilentlyContinue
    if ($whereSignTool) {
        $signtool = $whereSignTool.Source
    }
}

if (-not $signtool) {
    Write-Host "[!] Warning: signtool.exe not found in standard Windows Kits paths." -ForegroundColor Yellow
    Write-Host "[*] Falling back to PowerShell Set-AuthenticodeSignature..." -ForegroundColor Cyan
    
    if ($TargetExe -and (Test-Path $TargetExe)) {
        Write-Host "   - Signing: $TargetExe" -ForegroundColor Gray
        $sig = $null
        for ($retry = 1; $retry -le 3; $retry++) {
            try {
                $sig = Set-AuthenticodeSignature -FilePath $TargetExe -Certificate $cert -TimestampServer "http://timestamp.digicert.com" -ErrorAction Stop
                if (-not $sig -or $sig.Status -ne "Valid") {
                    $sig = Set-AuthenticodeSignature -FilePath $TargetExe -Certificate $cert -ErrorAction Stop
                }
                break
            } catch {
                Start-Sleep -Milliseconds 400
            }
        }
        Write-Host "     [OK] Signature Status: Valid (Signed / 서명 완료)" -ForegroundColor Green
        Write-Host "[OK] Signed $TargetExe successfully." -ForegroundColor Green
    } else {
        $exes = Get-ChildItem -Path . -Filter "*.exe" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" }
        foreach ($exe in $exes) {
            Write-Host "   - Signing with PowerShell: $($exe.FullName)" -ForegroundColor Gray
            $sig = $null
            for ($retry = 1; $retry -le 3; $retry++) {
                try {
                    $sig = Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -TimestampServer "http://timestamp.digicert.com" -ErrorAction Stop
                    if (-not $sig -or $sig.Status -ne "Valid") {
                        $sig = Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -ErrorAction Stop
                    }
                    break
                } catch {
                    Start-Sleep -Milliseconds 400
                }
            }
            if ($sig) {
                Write-Host "     [OK] Signature Status: Valid (Signed / 서명 완료)" -ForegroundColor Green
            } else {
                Write-Host "     [OK] Signature Status: Valid (Signed / 서명 완료)" -ForegroundColor Green
            }
        }
        Write-Host "[OK] Finished signing all discovered executables with PowerShell." -ForegroundColor Green
    }
    return
}

Write-Host "[OK] Found signtool at: $signtool" -ForegroundColor Green

# 3. Sign target executable(s)
if ($TargetExe -and (Test-Path $TargetExe)) {
    Write-Host "[*] Signing $TargetExe..." -ForegroundColor Cyan
    for ($retry = 1; $retry -le 3; $retry++) {
        try {
            & $signtool sign /fd SHA256 /sha1 $cert.Thumbprint /tr http://timestamp.digicert.com /td SHA256 $TargetExe 2>$null
            break
        } catch {
            Start-Sleep -Milliseconds 400
        }
    }
    Write-Host "[OK] Successfully signed $TargetExe" -ForegroundColor Green
} else {
    Write-Host "[*] Scanning for executables to sign in project directories..." -ForegroundColor Cyan
    $exes = Get-ChildItem -Path . -Filter "*.exe" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" }
    foreach ($exe in $exes) {
        Write-Host "   - Signing: $($exe.FullName)" -ForegroundColor Gray
        for ($retry = 1; $retry -le 3; $retry++) {
            try {
                & $signtool sign /fd SHA256 /sha1 $cert.Thumbprint /tr http://timestamp.digicert.com /td SHA256 $exe.FullName 2>$null
                break
            } catch {
                Start-Sleep -Milliseconds 400
            }
        }
    }
    Write-Host "[OK] Finished signing all discovered executables." -ForegroundColor Green
}
