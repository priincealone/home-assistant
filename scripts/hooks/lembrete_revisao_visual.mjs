// Gancho PostToolUse (Edit/Write/MultiEdit) do Claude Code: quando o arquivo editado é da interface do painel,
// lembra o agente de que a tarefa só fica pronta com a revisão do visual-gatekeeper (docs/UI-QUALITY-POLICY.md).
// Não bloqueia nada e não lê nem grava arquivo do projeto: só lê o JSON do evento na entrada padrão.
let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (pedaco) => (entrada += pedaco));
process.stdin.on("end", () => {
  let caminho = "";
  try {
    const evento = JSON.parse(entrada || "{}");
    caminho = String(evento?.tool_input?.file_path ?? evento?.tool_input?.path ?? "");
  } catch {
    process.exit(0);
  }
  const p = caminho.replace(/\\/g, "/");
  const visual =
    /\/(dashboard-lab|config\/www\/painel-secundario)\/(?!tests\/)[^/]+\.(css|html|js)$/.test(p) &&
    !/\/dashboard-lab\/(serve|contrato)/.test(p);
  if (!visual) process.exit(0);
  const aviso =
    "Mudança VISUAL no painel (" + p.split("/").slice(-2).join("/") + "). Regra obrigatória: docs/UI-QUALITY-POLICY.md. " +
    "Antes de declarar pronto ou publicar: auditar a área e as adjacentes na matriz de viewports, corrigir tudo e " +
    "obter APROVADO do agente visual-gatekeeper (somente leitura; nunca aciona a casa). Nunca remover funcionalidade " +
    "para resolver visual. O relatório final só diz \"Nenhuma regressão visual ou funcional conhecida permanece.\" se for verdade.";
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: aviso } })
  );
});
