# SECURITY — superfícies, segredos e limites

Última revisão: 15/09/2026 · Base: `artifacts/claude/technical-audit.md`.
Descreve o estado **atual**, incluindo o que está aberto. Nada aqui foi corrigido — é inventário, não
declaração de conformidade.

## Modelo de ameaça, em uma frase

A casa não está exposta à internet: o acesso remoto é por Tailscale. O risco real não é invasão de
fora, é **quem já está dentro da rede** — visita no Wi-Fi, aparelho comprometido, ou qualquer
dispositivo na tailnet.

## Superfícies expostas

| Superfície | Porta | Autenticação | Observação |
| :--- | :--- | :--- | :--- |
| Home Assistant | 8123 | ✅ Usuário e senha | Sessão por token |
| **Painel Next.js** | 3002 | ❌ **Nenhuma** | Ver A-01 |
| Music Assistant | 8095 | ✅ Token | Também 8097 para streams |
| bgutil-provider | 4416 | — | Publicado só em `127.0.0.1` |
| anisette | 6969 | — | Serviço local para a integração FindMy |
| Glances | 61208 | ❓ | ❓ **DESCONHECIDO** se exige credencial |

## Achados abertos

### A-01 · O painel não autentica ninguém — **Crítico**

Não há `middleware.ts` nem verificação em nenhuma das 10 rotas. O `HA_TOKEN` está bem protegido no
servidor, mas **quem alcança a porta 3002 comanda a casa**: luzes, TV, ventiladores, aspirador, cenas.
Alcance atual: toda a LAN e toda a tailnet.

❓ **DESCONHECIDO** — se a 3002 responde fora da tailnet (depende da configuração do Tailscale e do
firewall do Windows) e quantos aparelhos têm acesso hoje.

### A-02 · Segredos em pasta sincronizada com a nuvem — **Alto**

`C:\HomeAssistant` é sincronizada pelo cliente do Google Drive. Dentro dela:

| Arquivo | Conteúdo |
| :--- | :--- |
| `dashboard-app/.env.local` | `HA_TOKEN`, `MASS_TOKEN` (longa duração) |
| `config/secrets.yaml` | webhook de saúde, token do aspirador, usuário e senha Xiaomi |
| `config/.storage/auth*` | credenciais de autenticação do HA |
| `config/.storage/core.config_entries` | tokens e chaves locais das integrações |

Estão fora do **git** — e dentro do **Drive**. Um token de longa duração do HA equivale à casa inteira,
e não expira sozinho.

### A-03 · Parâmetros repassados sem lista de permissão — **Médio**

`toggle` e `control` validam a entidade contra `lib/rooms.ts` — proteção correta. Mas:

- `app/api/tv/route.ts` repassa `comando` (string livre) a `remote.send_command`
- `app/api/vacuum/route.ts` repassa `modo` (string livre) a `select.select_option`

Somado a A-01, qualquer cliente da rede envia comando arbitrário a esses dois serviços.

### A-04 · Sem análise estática — **Médio**

Não há ESLint instalado (nem dependência, nem configuração). `npm run lint` não funciona. A única
verificação é a checagem de tipos do `next build`.

### A-05 · Scripts com poder desproporcional — **Médio**

| Script | Comportamento |
| :--- | :--- |
| `parar_servidor.bat` | `taskkill /T /F` contra **quem estiver** escutando a 3002, sem confirmar identidade |
| `instalar_servico_agendado.bat` | Registra o servidor de desenvolvimento no logon com **privilégio máximo** (`/rl highest`), sobrescrevendo tarefa homônima |

## Fronteiras que estão corretas

- **Token nunca chega ao navegador.** `lib/ha.ts` é servidor-only e documenta isso no cabeçalho.
- **`.env.local` e `secrets.yaml` fora do versionamento.**
- **Lista de permissão de entidades** nas rotas de toggle e controle.
- **Banco e registros** protegidos por protocolo de parada antes de edição.
- **Scripts de diagnóstico** abrem o SQLite em modo somente leitura.

## Regras de credencial

1. **Nenhum agente busca, preenche ou transporta** senha, cookie de sessão ou token do André — mesmo
   quando ele pede. O correto é levar o fluxo até a borda e dizer em uma frase o que falta.
2. **Credencial que já existe em arquivo** pode ir de arquivo para arquivo, sem passar pela conversa.
3. **Nenhum segredo entra em log, commit, documento ou mensagem.**
4. **Chave de acesso e CAPTCHA são do dono.** A integração da Alexa está parada exatamente por isso.

## Rotação e recuperação

❓ **DESCONHECIDO** — se existe backup do `config/` fora do PC, e com que frequência.
❓ **DESCONHECIDO** — quando os tokens de longa duração foram emitidos e se há plano de rotação.

Existe a integração `backup` do HA ativa; ❓ **DESCONHECIDO** onde ela grava e se alguém confere.

## Se um token vazar

1. Revogar em Perfil → Tokens de acesso de longa duração, no HA
2. Emitir novo e atualizar `dashboard-app/.env.local` (só o André)
3. Reiniciar o painel
4. Conferir acessos recentes no log do HA
