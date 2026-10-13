# Executado pela tarefa agendada "CasaGlancesPatch" (no logon e de hora em hora).
# Chama glances_patch.ps1 -Aplicar -Reiniciar: com o patch presente nada acontece; so se ele
# tiver sumido (container recriado do zero) o patch e reaplicado e o HA e reiniciado.
# Registra cada execucao em %LOCALAPPDATA%\CasaHA\glances_patch.log (fora do repositorio).

$ErrorActionPreference = 'Continue'
$aqui   = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $env:LOCALAPPDATA 'CasaHA'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir 'glances_patch.log'

# Mantem o log pequeno
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 200KB)) {
    Get-Content $log -Tail 200 | Set-Content $log -Encoding utf8
}

$saida = & (Join-Path $aqui 'glances_patch.ps1') -Aplicar -Reiniciar 2>&1 | Out-String
$codigo = $LASTEXITCODE
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $log -Value "[$ts] exit=$codigo $($saida.Trim())" -Encoding utf8
exit $codigo
