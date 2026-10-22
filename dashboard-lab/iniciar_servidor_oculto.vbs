' Abre o supervisor do Painel Secundario sem janela (usado pela tarefa agendada CasaPainelSecundarioAutoStart).
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\HomeAssistant\dashboard-lab\iniciar_servidor_background.ps1""", 0, False
