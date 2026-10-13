# Verifica (e, com -Aplicar, reaplica) o patch de timeout do glances_api no container do HA.
#
# Por que existe: a API v3 do Glances no PC demora ate ~18 s na primeira chamada a frio, e o
# glances_api usa o timeout padrao do httpx (5 s). Sem o patch (timeout=15) as metricas do PC
# oscilam para "indisponivel". O patch vive dentro do container e some quando ele e recriado
# do zero (so sobrevive a `docker restart`). Backlog B-08.
#
# Uso:
#   .\glances_patch.ps1                       # so verifica; codigo 0 = patch presente, 1 = ausente
#   .\glances_patch.ps1 -Aplicar              # aplica o patch (idempotente); NAO reinicia o HA
#   .\glances_patch.ps1 -Aplicar -Reiniciar   # aplica e faz `docker restart homeassistant`
#
# O modulo ja foi importado pelo HA: o patch so vale depois de reiniciar o container.
# Nao toca em .storage nem aciona a casa.

param(
    [switch]$Aplicar,
    [switch]$Reiniciar
)

$ErrorActionPreference = 'Stop'
$Container = 'homeassistant'
$Arquivo   = '/usr/local/lib/python3.14/site-packages/glances_api/__init__.py'

# Git Bash/MSYS nao entra aqui (PowerShell), mas mantem o caminho literal para o container.
function Invoke-NoContainer([string]$cmd) {
    $saida = docker exec $Container sh -c $cmd
    if ($LASTEXITCODE -ne 0) { throw "docker exec falhou: $cmd" }
    return $saida
}

$estado = docker inspect -f '{{.State.Running}}' $Container 2>$null
if ($LASTEXITCODE -ne 0 -or $estado -ne 'true') {
    Write-Output "ERRO: container '$Container' nao esta rodando."
    exit 2
}

# O caminho muda com a versao do Python da imagem: se sumir, avisa em vez de adivinhar.
docker exec $Container test -f $Arquivo
if ($LASTEXITCODE -ne 0) {
    Write-Output "ERRO: $Arquivo nao existe (versao do Python da imagem mudou?). Localize com:"
    Write-Output "  docker exec $Container python -c `"import glances_api;print(glances_api.__file__)`""
    exit 2
}

$semPatch = [int](Invoke-NoContainer "grep -c 'client.get(url)' $Arquivo || true")
$comPatch = [int](Invoke-NoContainer "grep -c 'client.get(url, timeout=15)' $Arquivo || true")

if ($comPatch -ge 1 -and $semPatch -eq 0) {
    Write-Output 'OK: patch de timeout presente.'
    exit 0
}

if (-not $Aplicar) {
    Write-Output 'AUSENTE: o glances_api esta com o timeout padrao (5 s). Rode com -Aplicar.'
    exit 1
}

Invoke-NoContainer "sed -i 's/client.get(url)/client.get(url, timeout=15)/g' $Arquivo" | Out-Null

$depois = [int](Invoke-NoContainer "grep -c 'client.get(url, timeout=15)' $Arquivo || true")
if ($depois -lt 1) {
    Write-Output 'ERRO: o patch nao pegou (o trecho original mudou na versao nova do glances_api).'
    exit 2
}
Write-Output 'Patch aplicado.'

if ($Reiniciar) {
    docker restart $Container | Out-Null
    Write-Output 'Container reiniciado: o patch esta ativo.'
} else {
    Write-Output 'Reinicie o container para o patch valer: docker restart homeassistant'
}
exit 0
