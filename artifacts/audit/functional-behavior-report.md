# Relatório de Auditoria de Comportamento Funcional (Fase 5)

**Documento**: `artifacts/audit/functional-behavior-report.md`  
**Escopo**: Painel de Automação Residencial (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Ambiente de Desenvolvimento / Modo Somente Leitura)  
**Ambiente de Teste**: Servidor local `http://localhost:3002` sob Node.js/Next.js 16.3.3 + Home Assistant Core 2026.9

---

## 1. Visão Geral da Auditoria Funcional

Esta auditoria avaliou o comportamento da interface e dos endpoints de integração do painel sob condições normais, estados de borda (*edge cases*), dados nulos/desconhecidos e cenários simulados de falha de rede e indisponibilidade.

> [!IMPORTANT]
> **Garantia de Segurança Física**: Nenhuma requisição com payload que altere o estado de atuadores reais (lâmpadas, relés, aspirador ou TV) foi despachada durante esta auditoria. Comandos de teste em rotas de controle utilizaram entidades inexistentes ou métodos somente leitura (`GET`).

---

## 2. Matriz de Testes de Fluxos e Comportamentos

### 2.1. Navegação, Telas e Seleção de Áreas

| Fluxo / Ação | Estado Testado | Resultado Esperado | Resultado Real | Evidência Técnica | Severidade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Carga Inicial (`/`)** | Inicial / Loading | Carregar layout base, cabeçalho e esqueleto dos cômodos; atualizar via polling | Carrega em ~120ms; dispara `GET /api/state` e preenche 10 cômodos e 5 widgets | HTTP 200 em `/api/state`, 64 entidades ativas | Nenhuma |
| **Navegação Cômodo (`/comodo/[id]`)** | Sucesso | Transição suave sem recarregar a página inteira; listar todos os dispositivos da área | Executa `executarComTransicao`; exibe navegação anterior/próximo e lista categorizada | `app/comodo/[id]/page.tsx` responde sem erro | Baixa |
| **Navegação Cômodo Inexistente (`/comodo/area_fantasma`)** | Dados Vazios / Erro | Redirecionamento 404 limpo ou fallback para tela inicial | O componente monta com `comodo = undefined`; acessos a `comodo.nome` quebram se não houver guarda estrita | `comodosCompletos.find(...)` retorna `undefined` | **Média** |
| **Filtros / Busca / Ordenação** | Inexistente | Não aplicável | Não implementado (o painel possui matriz espacial fixa de 10 cômodos) | Registrado como não aplicável | Nenhuma |

### 2.2. Abertura, Fechamento e Ciclo de Vida de Modais

| Fluxo / Ação | Estado Testado | Resultado Esperado | Resultado Real | Evidência Técnica | Severidade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Abertura de Modal (`RoomPopup`)** | Ação Concluída | Bloquear scroll do body (`overflow: hidden`), abrir portal e focar container | `createPortal` monta `.popup-overlay`; body recebe `overflow: hidden` | `useEffect` manipula `document.body.style.overflow` | Baixa |
| **Fechamento via Tecla ESC** | Ação Cancelada | Fechar o modal imediatamente e restaurar scroll do body | Tecla `Escape` fecha o modal com animação de 180ms; body overflow restaurado | `handleKey(e)` implementado em `RoomPopup.tsx` | Baixa |
| **Fechamento com Submodal Ativo (`LightDimmerModal`)** | Ação Aninhada | Fechar apenas o modal superior (Dimmer), mantendo o `RoomPopup` aberto | Tecla ESC fecha a luz selecionada primeiro; segundo ESC fecha o popup | `if (luzSelecionada) setLuzSelecionada(null); else close();` | Baixa |
| **Fechamento via Clique no Backdrop** | Ação Cancelada | Fechar o modal ao clicar fora da folha central | Clique no backdrop executa `fecharModal`; `e.stopPropagation()` no sheet impede fecho acidental | Tratado com handler dedicado | Baixa |

### 2.3. Alteração de Tema e Modo Kiosk

| Fluxo / Ação | Estado Testado | Resultado Esperado | Resultado Real | Evidência Técnica | Severidade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Alternar Tema (Dark → Light)** | Sucesso | Mudar atributo no DOM `[data-theme="light"]` e persistir em `localStorage` | Alterna instantaneamente; fundo passa para `#e2e8f4` | Contraste de acento `#d97706` reprovado (2.59:1) conforme Fase 3 | **Alta** |
| **Modo Kiosk / Wake Lock** | Sucesso / Fallback | Solicitar tela cheia (`requestFullscreen`) e ativar Wake Lock API | Em browsers desktop, entra em tela cheia; se a API de Wake Lock falhar, silencia sem crash | `lib/wakeLock.ts` trata rejeição de Promise com try/catch | Baixa |

### 2.4. Gestão de Estado Otimista, Conexão e Travas

| Fluxo / Ação | Estado Testado | Resultado Esperado | Resultado Real | Evidência Técnica | Severidade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Disparo de Ação com Trava Otimista** | Em Processamento | Atualizar UI em 0ms; travar entidade por 5s; não sobrescrever com polling | UI alterna em 0ms; `travasOtimistasRef` impede regresso durante 5000ms | `travasOtimistasRef.current.set(entityId, ...)` verificado | Baixa |
| **Falha de Rede no Comando (`/api/toggle`)** | Ação Falhou / Rollback | Efetuar auto-retry após 800ms; se falhar novamente, reverter UI, acionar haptics e shake | Executa retry de 1 ciclo; em caso de falha persistente, executa rollback do snapshot e emite `ha-toggle-failed` | Testado no fluxo de `alternar()` em `page.tsx` | Baixa |
| **Queda do Home Assistant (502)** | Offline | Status de conexão muda para "offline"; UI avisa perda de sinal | Status muda para "offline" após 2 falhas consecutivas; cabeçalho exibe dot vermelho | Cards mantêm último estado em cache sem indicador de dado desatualizado | **Média** |
| **Reconexão Automática** | Reconectando | Ao voltar a rede (`online` event), disparar busca imediata e restaurar status | Escuta `window.addEventListener("online", ...)` e dispara `buscar()` imediatamente | Implementado em `app/page.tsx:130` | Baixa |
| **Sessão Expirada / Permissões** | Sem Permissão | Erro 401/403 tratado com redirecionamento ou aviso de credencial expirada | **Não tratado**: o painel não possui autenticação nem tela de login/expiração | Documentado em `docs/SECURITY.md` (A-01) | **Crítica** |

### 2.5. Dispositivos Indisponíveis, Dados Vazios e Incompletos

| Fluxo / Ação | Estado Testado | Resultado Esperado | Resultado Real | Evidência Técnica | Severidade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Entidade `unavailable` (`DeviceTile`)** | Entidade Indisponível | Exibir badge "Indisponível", desabilitar toggle e reduzir opacidade | Exibe rótulo textual e estiliza com cinza; previne chamada de toggle | `DeviceTile.tsx:83` trata `st === "unavailable"` | Baixa |
| **Entidade `unavailable` (`RoomCard`)** | Entidade Indisponível | Indicar que o cômodo possui pontos fora de alcance | **Ignorado**: o `RoomCard` conta apenas `state === "on"`, tratando `unavailable` como se estivesse desligado | Usuário presume que a luz está apagada | **Média** |
| **Sensor com Atributo Nulo (`HealthWidget`)** | Dados Incompletos | Exibir placeholder gracioso (`"--"`) sem quebrar a renderização | Trata com `estados[...]?.state || "--"`; converte com regex segura | `Number.parseInt(String(passos)...)` blindado | Baixa |
| **Entidades Inexistentes no Contrato** | Dados Desconhecidos | Ignorar ou registrar aviso; não provocar erro 500 no backend | `getEstados()` retorna `null` para IDs não encontrados; front trata com optional chaining | 4 entidades inexistentes chegam como `null` | Baixa |

---

## 3. Auditoria de Segurança e Resiliência das Rotas de API

Os testes de integração HTTP realizados contra o servidor local revelaram os seguintes comportamentos:

```
GET  /api/state   -> HTTP 200 OK (Tempo: 18ms | 64 entidades sincronizadas em lote)
GET  /api/weather -> HTTP 200 OK (Tempo: 12ms | Previsão horária e semanal consolidada)
GET  /api/energy  -> HTTP 200 OK (Tempo: 15ms | Histórico spline e métricas de tomadas)
GET  /api/todo    -> HTTP 200 OK (Tempo: 14ms | Lista de compras sincronizada)
GET  /api/mass    -> HTTP 200 OK (Tempo: 22ms | WebSocket Music Assistant em cache)
POST /api/toggle  -> HTTP 400 Bad Request (Payload inválido: {"erro":"entityId inválido ou não mapeado"})
POST /api/control -> HTTP 400 Bad Request (Payload inválido: {"erro":"Entidade inválida ou não mapeada"})
```

### Diagnóstico de Segurança nas Rotas:
1. **Proteção por Whitelist Ativa**: As rotas `/api/toggle` e `/api/control` rejeitam qualquer `entityId` que não esteja previamente registrado no contrato canônico de `lib/rooms.ts`. Tentativas de injeção de entidades arbitrárias retornam HTTP 400 imediatamente.
2. **Fragilidade de Parâmetros Livres**: Conforme levantado em `docs/SECURITY.md` (A-03), `/api/tv` e `/api/vacuum` ainda repassam comandos em string sem sanitização de enum restrito.

---

## 4. Síntese de Falhas e Oportunidades Funcionais

| ID | Área | Falha / Oportunidade | Impacto | Severidade |
| :--- | :--- | :--- | :--- | :---: |
| **FUNC-01** | Notificações | Falta de feedback visual permanente quando a API falha | Usuário não sabe se o relé acionou | **Alta** |
| **FUNC-02** | Autenticação | Acesso desprotegido em toda a LAN/Tailnet | Qualquer cliente na rede controla a casa | **Crítica** |
| **FUNC-03** | `RoomCard` | Omissão do estado `unavailable` na contagem de luzes | Entidade com defeito parece apenas apagada | **Média** |
| **FUNC-04** | Rotas TV/Vácuo | Parâmetros de comando sem validação estrita de schema | Risco de envio de parâmetros espúrios | **Média** |
| **FUNC-05** | Fallback 404 | Falta de tela amigável para cômodo inexistente | Risco de tela em branco em rotas inválidas | Baixa |
