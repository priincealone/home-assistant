# Sobe os clipes de movimento das câmeras da rua para o Google Drive e apaga
# do Drive o que passou de 7 dias, para não acumular.
#
# Roda no HOST (Windows), não dentro do container do Home Assistant: uma
# conta de serviço do Google Cloud não tem cota de armazenamento em Drive
# pessoal, só em Google Workspace com "shared drives" — por isso o upload não
# é feito pela automação do HA (config/automations.yaml), e sim por aqui,
# autenticado como a própria conta do André (autorização feita uma vez via
# `rclone config`, remoto "gdrive_cameras", token em
# %APPDATA%\rclone\rclone.conf).
#
# Chamado pela Tarefa Agendada do Windows "CameraClipesDriveSync" a cada 5
# minutos. Ver CASA.md e specs/features/clipes-movimento-nuvem.md.

$rclone = "C:\Users\adoli\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.1-windows-amd64\rclone.exe"
$origem = "C:\HomeAssistant\config\www\clipes_movimento"
$destino = "gdrive_cameras:Câmeras - Clipes de Movimento"

# --min-age 30s evita pegar um arquivo que o ffmpeg ainda esteja gravando
& $rclone move $origem $destino --include "*.mp4" --min-age 30s --create-empty-src-dirs

# limpeza: nada além de 7 dias fica ocupando espaço no Drive
& $rclone delete $destino --min-age 7d
