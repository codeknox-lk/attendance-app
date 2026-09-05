# ====================================================================
#   SmileHub Dental Care - MedSync Cloud Biometric Sync Daemon
#   Version: 2.0 (Production Stable)
#   Runs silently on clinic reception PC to push punches to Cloud.
# ====================================================================

$Host.UI.RawUI.WindowTitle = "SmileHub MedSync Cloud Sync"

# Configuration
$TerminalIP    = "192.168.8.145"
$TerminalPort  = "443"
$TerminalUser  = "admin"
$TerminalPass  = "SMILE123"
$CloudEndpoint = "https://attendance-app-seven-black.vercel.app/api/biometric/hikvision"
$LogFile       = "C:\SmileHub\sync.log"
$TempJsonPath  = "$env:TEMP\hik_query.json"

# In-memory deduplication tracker
$ProcessedEvents = [System.Collections.Generic.HashSet[string]]::new()

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line -ForegroundColor $Color
    try {
        Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    } catch {}
}

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SmileHub MedSync - Biometric Cloud Sync Engine         " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Hardware Terminal : https://$TerminalIP`:$TerminalPort" -ForegroundColor Yellow
Write-Host " Cloud Webhook     : $CloudEndpoint" -ForegroundColor Yellow
Write-Host " Log Destination   : $LogFile" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Log "Daemon started successfully. Monitoring for staff punches..." "Green"

# Main Polling Loop
while ($true) {
    try {
        # Check punches from today
        $nowDate = Get-Date
        $startTime = $nowDate.AddDays(-1).ToString("yyyy-MM-ddT00:00:00+05:30")
        $endTime   = $nowDate.ToString("yyyy-MM-ddT23:59:59+05:30")

        # Prepare Hikvision ISAPI Query JSON (File-based to prevent PowerShell quote stripping)
        $queryObject = @{
            AcsEventCond = @{
                searchID             = "1"
                searchResultPosition = 0
                maxResults           = 100
                major                = 5
                minor                = 0
                startTime            = $startTime
                endTime              = $endTime
            }
        }
        $queryObject | ConvertTo-Json -Compress | Set-Content -Path $TempJsonPath -Encoding UTF8

        # Execute authenticated curl request
        $curlCmd = "curl.exe -k -s --digest -u `"$TerminalUser`:$TerminalPass`" -X POST `"https://$TerminalIP`:$TerminalPort/ISAPI/AccessControl/AcsEvent?format=json`" -H `"Content-Type: application/json`" -d `"@$TempJsonPath`""
        $rawOutput = Invoke-Expression $curlCmd

        if ($rawOutput) {
            $parsed = $rawOutput | ConvertFrom-Json
            $events = $parsed.AcsEvent.InfoList

            if ($events -and $events.Count -gt 0) {
                $newPunchesCount = 0

                foreach ($ev in $events) {
                    $biometricId = $ev.employeeNoString
                    if (-not $biometricId) { continue }

                    # Unique event identifier (Serial + Time)
                    $eventKey = "$($ev.serialNo)_$($ev.time)_$biometricId"

                    if (-not $ProcessedEvents.Contains($eventKey)) {
                        $ProcessedEvents.Add($eventKey) | Out-Null

                        # Determine verification method
                        $authMethod = "Fingerprint"
                        if ($ev.minor -eq 75 -or ($ev.currentVerifyMode -and $ev.currentVerifyMode.ToLower().Contains("face"))) {
                            $authMethod = "Face"
                        } elseif ($ev.minor -eq 1 -or ($ev.currentVerifyMode -and $ev.currentVerifyMode.ToLower().Contains("card"))) {
                            $authMethod = "Card"
                        }

                        $staffName = if ($ev.name) { $ev.name } else { "Staff #$biometricId" }
                        $punchTime = if ($ev.time) { $ev.time } else { (Get-Date).ToString("s") }

                        # Build payload for MedSync Cloud
                        $cloudPayload = @{
                            AccessControllerEvent = @{
                                employeeNoString  = $biometricId
                                name              = $staffName
                                time              = $punchTime
                                currentVerifyMode = $authMethod.ToLower()
                                minor             = $ev.minor
                                major             = $ev.major
                                serialNo          = "DS-K1T320MFWX"
                                deviceName        = "Clinic Terminal"
                            }
                        } | ConvertTo-Json -Compress

                        # Push to MedSync Cloud Webhook
                        try {
                            $res = Invoke-RestMethod -Uri $CloudEndpoint -Method POST -Body $cloudPayload -ContentType "application/json" -TimeoutSec 10
                            Write-Log "PUNCH DETECTED: $staffName (#$biometricId) at $punchTime via $authMethod -> Pushed to MedSync [OK]" "Green"
                            $newPunchesCount++
                        } catch {
                            Write-Log "Failed to forward punch for $staffName to cloud: $($_.Exception.Message)" "Red"
                        }
                    }
                }

                # Trim memory tracker if it grows too large
                if ($ProcessedEvents.Count -gt 1000) {
                    $ProcessedEvents.Clear()
                }
            }
        }
    } catch {
        Write-Log "Connection notice: Hikvision terminal busy or unreachable. Retrying in 30s..." "DarkYellow"
    }

    # Poll every 30 seconds
    Start-Sleep -Seconds 30
}
