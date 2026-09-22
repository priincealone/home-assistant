# Sobe os clipes de movimento das cÃ¢meras da rua para o Google Drive e apaga
# do Drive o que passou de 7 dias, para nÃ£o acumular.
#
# Roda no HOST (Windows), nÃ£o dentro do container do Home Assistant: uma
# conta de serviÃ§o do Google Cloud nÃ£o tem cota de armazenamento em Drive
# pessoal, sÃ³ em Google Workspace com "shared drives" â€” por isso o upload nÃ£o
# Ã© feito pela automaÃ§Ã£o do HA (config/automations.yaml), e sim por aqui,
# autenticado como a prÃ³pria conta do AndrÃ© (autorizaÃ§Ã£o feita uma vez via
# `rclone config`, remoto "gdrive_cameras", token em
# %APPDATA%\rclone\rclone.conf).
#
# Chamado pela Tarefa Agendada do Windows "CameraClipesDriveSync" a cada 5
# minutos. Ver CASA.md e specs/features/clipes-movimento-nuvem.md.

$rclone = "C:\Users\adoli\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.1-windows-amd64\rclone.exe"
$origem = "D:\HomeAssistant\config\www\clipes_movimento"
$destino = "gdrive_cameras:CÃ¢meras - Clipes de Movimento"

# --min-age 30s evita pegar um arquivo que o ffmpeg ainda esteja gravando
& $rclone move $origem $destino --include "*.mp4" --min-age 30s --create-empty-src-dirs

# limpeza: nada alÃ©m de 7 dias fica ocupando espaÃ§o no Drive
& $rclone delete $destino --min-age 7d

