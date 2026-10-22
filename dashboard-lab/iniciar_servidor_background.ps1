# Supervisor do Painel Secundario (dashboard-lab, porta 3011): mantem o servidor estatico no ar.
# Uma instancia so (mutex). Se a porta ficar livre, sobe `node serve.mjs` de novo. Nao toca no Painel Primario (3002).
$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { "D:\HomeAssistant\dashboard-lab" }
Set-Location -Path $projectDir

$mutex = $null
$isNew = $false
try {
    $mutex = New-Object System.Threading.Mutex($true, "Local\CasaPainelSecundarioMutex", [ref]$isNew)
} catch [System.Threading.AbandonedMutexException] {
    $isNew = $true
} catch {
    $isNew = $false
}
if (-not $isNew) { exit 0 }

$porta = 3011
$logFile = Join-Path $projectDir "servidor.log"
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "C:\Program Files\nodejs\node.exe" }

function Log($msg) {
    $linha = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $logFile -Value $linha -Encoding utf8 -ErrorAction SilentlyContinue
    if ((Get-Item $logFile -ErrorAction SilentlyContinue).Length -gt 1MB) {
        $resto = Get-Content -Path $logFile -Tail 200 -ErrorAction SilentlyContinue
        Set-Content -Path $logFile -Value $resto -Encoding utf8 -ErrorAction SilentlyContinue
    }
}

Log "supervisor iniciado (porta $porta)"
while ($true) {
    $ouvindo = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
    if (-not $ouvindo) {
        Start-Process -FilePath $node -ArgumentList "serve.mjs" -WorkingDirectory $projectDir -WindowStyle Hidden
        Log "porta $porta livre: servidor iniciado"
    }
    Start-Sleep -Seconds 30
}
