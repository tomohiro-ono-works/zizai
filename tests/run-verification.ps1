[CmdletBinding()]
param(
    [string]$Gate,
    [string]$RiskId,
    [string]$EvidencePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$supportedGates = @(
    "static-analysis",
    "unit",
    "integration",
    "e2e",
    "manual-ui",
    "required"
)
$riskMarkers = @{
    "RISK-ENTRY-001" = "risk_entry_001"
    "RISK-PATH-001" = "risk_path_001"
    "RISK-CONN-001" = "risk_conn_001"
    "RISK-CONN-002" = "risk_conn_002"
    "RISK-CONFIG-001" = "risk_config_001"
    "RISK-BRIDGE-001" = "risk_bridge_001"
    "RISK-FS-001" = "risk_fs_001"
    "RISK-EXT-001" = $null
    "RISK-WEB-001" = "risk_web_001"
    "RISK-WEB-002" = $null
    "RISK-UI-001" = "risk_ui_001"
    "RISK-CI-001" = "risk_ci_001"
}
$deferredRisks = @("RISK-EXT-001", "RISK-WEB-002")

function Complete-Verification {
    param(
        [int]$ExitCode,
        [string]$Message
    )

    if ($ExitCode -eq 0) {
        Write-Host $Message
    }
    elseif ($ExitCode -eq 2) {
        Write-Warning $Message
    }
    else {
        Write-Error $Message -ErrorAction Continue
    }
    exit $ExitCode
}

function Resolve-UvCommand {
    $command = Get-Command "uv.exe" -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        $command = Get-Command "uv" -ErrorAction SilentlyContinue
    }
    if ($null -eq $command) {
        return $null
    }
    return $command.Source
}

function Test-UvToolchain {
    param([string]$UvCommand)

    $version = (& $UvCommand --version 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or $version -notmatch "^uv\s+(\S+)") {
        return $false
    }
    return $Matches[1] -eq "0.12.5"
}

function Invoke-UvPython {
    param([string[]]$Arguments)

    Push-Location $repositoryRoot
    try {
        & $script:uvCommand run --frozen python @Arguments | Out-Host
        return $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}

function Invoke-PytestSelection {
    param([string]$MarkerExpression)

    if ((Invoke-UvPython -Arguments @("-c", "import pytest")) -ne 0) {
        return 2
    }

    $previousFailOnSkip = $env:ZIZAI_FAIL_ON_REQUIRED_SKIP
    try {
        $env:ZIZAI_FAIL_ON_REQUIRED_SKIP = "1"
        $pytestExitCode = Invoke-UvPython -Arguments @(
            "-m", "pytest", "--strict-markers", "-m", $MarkerExpression, "tests"
        )
    }
    finally {
        if ($null -eq $previousFailOnSkip) {
            Remove-Item Env:ZIZAI_FAIL_ON_REQUIRED_SKIP -ErrorAction SilentlyContinue
        }
        else {
            $env:ZIZAI_FAIL_ON_REQUIRED_SKIP = $previousFailOnSkip
        }
    }

    if ($pytestExitCode -eq 0) {
        return 0
    }
    return 1
}

function Test-SymlinkCapability {
    if ($env:ZIZAI_TEST_FORCE_NO_SYMLINK -eq "1") {
        return $false
    }

    $probe = Join-Path $repositoryRoot "tests\support\check_symlink_capability.py"
    return (Invoke-UvPython -Arguments @($probe)) -eq 0
}

function Test-WebEngineCapability {
    $probe = Join-Path $repositoryRoot "tests\support\check_webengine_capability.py"
    return (Invoke-UvPython -Arguments @($probe)) -eq 0
}

function Invoke-PlaywrightVerification {
    $playwrightRoot = Join-Path $repositoryRoot "tests\playwright"
    $node = Get-Command "node.exe" -ErrorAction SilentlyContinue
    $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ($null -eq $node -or $null -eq $npm) {
        return 2
    }

    Push-Location $playwrightRoot
    try {
        & $node.Source "support\check-capability.js" | Out-Host
        if ($LASTEXITCODE -ne 0) {
            return 2
        }
        $previousForceColor = $env:FORCE_COLOR
        Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue
        try {
            & $npm.Source test | Out-Host
            $playwrightExitCode = $LASTEXITCODE
        }
        finally {
            if ($null -ne $previousForceColor) {
                $env:FORCE_COLOR = $previousForceColor
            }
        }
    }
    finally {
        Pop-Location
    }

    if ($playwrightExitCode -eq 0) {
        return 0
    }
    return 1
}

if ([string]::IsNullOrWhiteSpace($Gate) -and [string]::IsNullOrWhiteSpace($RiskId)) {
    Complete-Verification -ExitCode 1 -Message "Specify -Gate or -RiskId."
}

if (-not [string]::IsNullOrWhiteSpace($Gate) -and $Gate -notin $supportedGates) {
    Complete-Verification -ExitCode 1 -Message "Unsupported Gate: $Gate"
}

if (-not [string]::IsNullOrWhiteSpace($RiskId) -and -not $riskMarkers.ContainsKey($RiskId)) {
    Complete-Verification -ExitCode 1 -Message "Unsupported RiskId: $RiskId"
}

if ($RiskId -in $deferredRisks) {
    Complete-Verification -ExitCode 2 -Message "$RiskId is Blocked until TASK-012."
}

$script:uvCommand = Resolve-UvCommand
if ($null -eq $script:uvCommand -or -not (Test-UvToolchain -UvCommand $script:uvCommand)) {
    Complete-Verification -ExitCode 2 -Message "uv 0.12.5 is required for canonical verification."
}

if (($RiskId -eq "RISK-FS-001" -or $Gate -eq "unit") -and -not (Test-SymlinkCapability)) {
    Complete-Verification -ExitCode 2 -Message "Symlink capability is required by RISK-FS-001."
}

if (($RiskId -eq "RISK-WEB-001" -or $Gate -eq "e2e") -and -not (Test-WebEngineCapability)) {
    Complete-Verification -ExitCode 2 -Message "QtWebEngine capability is required by RISK-WEB-001."
}

if ($Gate -eq "manual-ui" -or $RiskId -eq "RISK-UI-001") {
    if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
        Complete-Verification -ExitCode 2 -Message "EvidencePath is required for manual-ui verification."
    }

    $validator = Join-Path $repositoryRoot "tests\manual\validate_manual_ui_result.py"
    if (-not (Test-Path -LiteralPath $validator -PathType Leaf)) {
        Complete-Verification -ExitCode 2 -Message "Manual UI validator is missing: $validator"
    }

    $manualValidatorExitCode = Invoke-UvPython -Arguments @($validator, $EvidencePath)
    Complete-Verification -ExitCode $manualValidatorExitCode -Message "manual-ui verification passed."
}

if ($Gate -eq "required") {
    foreach ($requiredGate in @("static-analysis", "unit", "integration")) {
        Write-Host "Running required Gate: $requiredGate"
        if ($requiredGate -eq "unit" -and -not (Test-SymlinkCapability)) {
            Complete-Verification -ExitCode 2 -Message "Symlink capability is required by RISK-FS-001."
        }
        $marker = $requiredGate.Replace("-", "_")
        $result = Invoke-PytestSelection -MarkerExpression $marker
        if ($result -ne 0) {
            Complete-Verification -ExitCode $result -Message "Required Gate failed or was blocked: $requiredGate"
        }
    }
    Complete-Verification -ExitCode 0 -Message "Required Gates passed."
}

$selection = if (-not [string]::IsNullOrWhiteSpace($RiskId)) {
    $riskMarkers[$RiskId]
}
else {
    $Gate.Replace("-", "_")
}

$exitCode = Invoke-PytestSelection -MarkerExpression $selection
if ($exitCode -eq 2) {
    Complete-Verification -ExitCode 2 -Message "Verification prerequisites are missing."
}
if ($exitCode -ne 0) {
    Complete-Verification -ExitCode 1 -Message "Verification failed: $selection"
}

if ($RiskId -eq "RISK-WEB-001" -or $Gate -eq "e2e") {
    $playwrightExitCode = Invoke-PlaywrightVerification
    if ($playwrightExitCode -eq 2) {
        Complete-Verification -ExitCode 2 -Message "Playwright prerequisites are missing."
    }
    if ($playwrightExitCode -ne 0) {
        Complete-Verification -ExitCode 1 -Message "Playwright verification failed."
    }
}
Complete-Verification -ExitCode 0 -Message "Verification passed: $selection"
