# Feature Spec: B-02 · Correção das Entidades Inexistentes no Contrato do Painel

- **ID da Tarefa**: B-02
- **Nome**: correcao-entidades-contrato
- **Executor Principal**: Antigravity (UX / Frontend)
- **Status**: Especificado (Aguardando Aprovação para Implementação)
- **Data de Especificação**: 15/09/2026
- **Classificação**: Baixo risco / Higiene de Contrato

---

## 1. Objetivo

Eliminar as 4 referências a entidades inexistentes ou incorretas no contrato de dados do frontend (`lib/rooms.ts`) e em seus componentes consumidores (`VacuumWidget.tsx`, `SecurityAlertsBar.tsx`, `AmbientNightMode.tsx`), garantindo consistência estrita com a API do Home Assistant Core e impedindo estados nulos silenciosos, contadores enganosos e sensores zumbis na interface do usuário.

---

## 2. Escopo

1. **Bateria do Aspirador Dreame**:
   - Substituir o ID inexistente `sensor.dreame_us_415783444_mc1808_battery_battery_level` pelo ID canônico real `sensor.dreame_us_415783444_mc1808_battery_level_p_2_1` em:
     - `dashboard-app/lib/rooms.ts` (na lista `ENTIDADES_EXTRAS`);
     - `dashboard-app/app/components/VacuumWidget.tsx` (na constante `ENTITY_BATTERY`).
2. **Lista de Afazeres (Todo)**:
   - Substituir a entidade fictícia `todo.tarefas` pela entidade canônica do Home Assistant `todo.lista_de_compras` em:
     - `dashboard-app/lib/rooms.ts` (na lista `ENTIDADES_EXTRAS`), alinhando o contrato à rota já existente `app/api/todo/route.ts`.
3. **Sensores de Movimento Fictícios (Banheiro e Closet)**:
   - Remover as entradas dos dispositivos inexistentes da lista de dispositivos em `dashboard-app/lib/rooms.ts`:
     - Banheiro: remover objeto com `id: "mov_banheiro"` e `entityId: "binary_sensor.sensor_banheiro_movimento"`;
     - Quarto/Closet: remover objeto com `id: "mov_closet"` e `entityId: "binary_sensor.sensor_closet_movimento"`.
   - Remover essas entidades das listas de monitoramento em:
     - `dashboard-app/app/components/SecurityAlertsBar.tsx` (lista `SENSORES`);
     - `dashboard-app/app/components/AmbientNightMode.tsx` (listas `SENSORES_SEGURANCA` e `SENSORES_PRESENCA`).
4. **Sincronização de Documentação**:
   - Atualizar `artifacts/antigravity/current-architecture.md` (§3, Banheiro) para remover a menção ao sensor de movimento inexistente.

---

## 3. Fora do Escopo

- Criação de helpers, template sensors ou dispositivos virtuais no Home Assistant para simular os sensores ausentes.
- Compra, pareamento ou integração de novos sensores físicos Zigbee/Tuya.
- Qualquer edição em `config/automations.yaml` (automações físicas da casa).
- Qualquer modificação nos registros internos do Home Assistant (`config/.storage/core.*`).
- Qualquer alteração na infraestrutura de containers Docker, portas de rede ou regras de firewall.
- Alteração no comportamento das automações da nuvem Smart Life/Tuya.

---

## 4. Arquivos Permitidos

Somente os seguintes arquivos têm autorização para modificação na fase de implementação desta tarefa:

| Arquivo | Papel na Correção |
| :--- | :--- |
| `dashboard-app/lib/rooms.ts` | Correção da lista de extras e remoção de dispositivos inexistentes nos cômodos. |
| `dashboard-app/app/components/VacuumWidget.tsx` | Ajuste da constante `ENTITY_BATTERY` para o entity_id real. |
| `dashboard-app/app/components/SecurityAlertsBar.tsx` | Remoção dos sensores inexistentes de banheiro e closet do array `SENSORES`. |
| `dashboard-app/app/components/AmbientNightMode.tsx` | Remoção dos sensores de banheiro e closet das listas `SENSORES_SEGURANCA` e `SENSORES_PRESENCA`. |
| `artifacts/antigravity/current-architecture.md` | Ajuste documental na tabela de hardware do Banheiro. |
| `planning/IN_PROGRESS.md` e `planning/BACKLOG.md` | Atualização do progresso e encerramento do item de backlog. |

---

## 5. Arquivos Proibidos

É terminantemente vedado tocar nos seguintes arquivos ou diretórios durante esta tarefa:

- `config/automations.yaml` (automações físicas da casa)
- `config/configuration.yaml`
- `config/scenes.yaml`
- `config/scripts.yaml`
- `config/.storage/*` (todos os registros do Core)
- `config/secrets.yaml`
- `dashboard-app/.env.local`
- Scripts de infraestrutura e diagnóstico (`scripts/*`)
- Qualquer arquivo do backend Python

---

## 6. Fluxo Principal

1. **Inicialização do Dashboard**:
   - O painel inicia no navegador e efetua polling em `/api/state`, enviando a lista `todasEntidades` gerada a partir de `lib/rooms.ts`.
   - A requisição solicita os estados das entidades canônicas, incluindo `sensor.dreame_us_415783444_mc1808_battery_level_p_2_1` e `todo.lista_de_compras`.
2. **Renderização do Aspirador Dreame**:
   - O componente `VacuumWidget` recebe o estado da bateria real via props `estados`.
   - Extrai o atributo numérico ou estado percentual (ex: `100%`) e renderiza o ícone de bateria com preenchimento coerente e indicador textual imediato.
3. **Renderização dos Cômodos Banheiro e Quarto**:
   - A página de detalhes `/comodo/banheiro` renderiza exclusivamente a iluminação (`light.banheiro_switch_1`) e a tomada (`switch.banheiro_switch_2`), sem cartões fantasmas de sensores inativos.
   - A página de detalhes `/comodo/quarto` renderiza os dispositivos reais de iluminação, tomadas e medição de energia do PC, sem cartões de movimento no closet.
4. **Segurança e Modo Noturno**:
   - `SecurityAlertsBar` monitora unicamente sensores reais existentes (`porta_do_quarto_porta`, `sensor_lavanderia_movimento`, `sensor_area_gourmet_movimento`).
   - O `AmbientNightMode` não dispara acordamento indevido ou falsos gatilhos decorrentes de estados indefinidos.

---

## 7. Loading (Carregamento)

- **Estado de Inicialização**: Durante os primeiros milissegundos enquanto `/api/state` está sendo resolvido:
  - O `VacuumWidget` exibe o esqueleto padronizado (placeholder com brilho suave e `--%` no campo de bateria), evitando pulo de layout (*Cumulative Layout Shift - CLS*).
  - A barra de alertas de segurança permanece invisível até a hidratação completa do mapa de estados.
  - Nenhum elemento deve emitir alertas falsos durante a fase de transição de loading para hydrated.

---

## 8. Erro

- **Tratamento de Estado Indisponível no Aspirador**:
  - Se `sensor.dreame_us_415783444_mc1808_battery_level_p_2_1` retornar `unavailable` ou `unknown` (ex: robô desconectado da base ou sem sinal Wi-Fi):
    - O componente `VacuumWidget` não quebra nem renderiza `NaN%`.
    - Exibe o texto de fallback gracioso `"Indisp."` ou ícone com opacidade reduzida.
- **Tolerância a Falhas**:
  - O acesso a propriedades em `estados[ENTITY_BATTERY]?.state` deve continuar protegido por encadeamento opcional (`?.`) e fallback padrão.
  - A ausência dos sensores excluídos não deve produzir mensagens de erro no console de JavaScript do cliente.

---

## 9. Offline

- **Comportamento em Queda de Conexão**:
  - Se a comunicação entre o painel e o Home Assistant for interrompida:
    - O banner global de conectividade do painel entra em exibição (`Sem conexão com o Home Assistant`).
    - O `VacuumWidget` congela no último valor recebido de bateria com indicador visual discreto de dados em cache, desativando ações que dependam da API.
    - O `SecurityAlertsBar` não deve disparar alertas vermelhos espúrios em caso de perda de sinal.

---

## 10. Reconexão

- **Restauração de Rede**:
  - Quando a chamada periódica a `/api/state` obtém sucesso após uma falha de conexão:
    - O estado da bateria do Dreame é revalidado imediatamente.
    - Os alertas de segurança se reconciliam com os dados mais recentes sem necessidade de recarregar a página (`F5`).
    - As travas otimistas (`travasOtimistasRef`) permanecem ativas garantindo que comandos de toque não sejam sobrescritos por respostas defasadas.

---

## 11. Segurança

- **Governança de Permissões de API**:
  - O arquivo `lib/rooms.ts` atua como a *allowlist* de segurança estrita para as rotas do painel (`/api/toggle` e `/api/control`).
  - Entidades fora de `todasEntidades` são bloqueadas contra comandos de alternância ou controle via HTTP.
  - A limpeza remove entidades fantasmas da lista de entidades monitoradas e autorizadas.
- **Credenciais**:
  - Nenhuma chave de API, credencial ou token de acesso deve ser manipulado nesta alteração.

---

## 12. Critérios de Aceitação

1. [ ] **Dreame**: `sensor.dreame_us_415783444_mc1808_battery_battery_level` substituído por `sensor.dreame_us_415783444_mc1808_battery_level_p_2_1` em `lib/rooms.ts` e `VacuumWidget.tsx`.
2. [ ] **Todo**: `todo.tarefas` substituído por `todo.lista_de_compras` em `lib/rooms.ts`.
3. [ ] **Banheiro**: `binary_sensor.sensor_banheiro_movimento` completamente removido de `lib/rooms.ts`, `SecurityAlertsBar.tsx` e `AmbientNightMode.tsx`.
4. [ ] **Closet**: `binary_sensor.sensor_closet_movimento` completamente removido de `lib/rooms.ts`, `SecurityAlertsBar.tsx` e `AmbientNightMode.tsx`.
5. [ ] **Validação de Código**: Nenhuma ocorrência dos 4 IDs antigos encontrada em uma busca global no projeto `dashboard-app/`.
6. [ ] **Compilação**: `npm run build` e `npx tsc --noEmit` executados com sucesso absoluto (zero erros de tipo e zero quebras de rota).
7. [ ] **Automações Físicas Intocadas**: O arquivo `config/automations.yaml` não sofreu nenhuma modificação de conteúdo ou timestamp.

---

## 13. Testes

### 13.1. Testes Automatizados / Estáticos
- **Checagem de Tipos**:
  ```bash
  cd c:\HomeAssistant\dashboard-app
  npx tsc --noEmit
  ```
  *Resultado esperado*: Retorno 0, nenhum erro TypeScript.
- **Build de Produção**:
  ```bash
  cd c:\HomeAssistant\dashboard-app
  npm run build
  ```
  *Resultado esperado*: Build estático e de rotas gerado sem falhas.
- **Auditoria Textual de Resíduos**:
  ```bash
  # Não deve retornar nenhum arquivo dentro de dashboard-app
  git grep -n "sensor_banheiro_movimento" dashboard-app/
  git grep -n "sensor_closet_movimento" dashboard-app/
  git grep -n "battery_battery_level" dashboard-app/
  git grep -n "todo.tarefas" dashboard-app/
  ```

### 13.2. Testes de Integração com a API Local
- Executar teste de requisição contra a API do painel:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3002/api/state" | Select-Object -ExpandProperty "sensor.dreame_us_415783444_mc1808_battery_level_p_2_1"
  ```
  *Resultado esperado*: Objeto de estado retornado com valor percentual (ex: `state: "100"`).

---

## 14. Instruções para o Claude Code

- **Divisão de Responsabilidade**: Esta tarefa pertence exclusivamente à camada de interface e contrato do frontend mantida pelo **Antigravity**. O Claude Code **não deve alterar** componentes em `dashboard-app/app/components/` ou arquivos em `dashboard-app/lib/`.
- **Diretriz para Sensores Físicos Futuros**: Se em algum momento o André adquirir sensores de presença físicos reais para o Banheiro ou Closet:
  1. O Claude Code realizará o pareamento na infraestrutura física / Zigbee e validação dos logs do Home Assistant Core.
  2. O Claude Code notificará o Antigravity formalmente com os `entity_id` gerados.
  3. O Antigravity criará a especificação de interface para readicionar os controles nos cômodos correspondentes.

---

## 15. Instruções para Validação Visual

Para ser executada após a futura aprovação e implementação:

1. Abrir o navegador em `http://localhost:3002`.
2. **Card do Aspirador**:
   - Localizar o widget do aspirador na tela principal.
   - Constatar visualmente que o indicador de bateria exibe a carga real (ex: `100%`) com a barra de progresso verde/preenchida, em vez de vazia, nula ou travada em 0%.
3. **Tela do Banheiro (`/comodo/banheiro`)**:
   - Abrir o cômodo Banheiro.
   - Confirmar que estão visíveis apenas o controle de Luz e a Tomada.
   - Confirmar que **não existe** nenhum card fantasma intitulado "Presença / Movimento" com valor `undefined` ou travado em carregamento.
4. **Tela do Quarto (`/comodo/quarto`)**:
   - Abrir o cômodo Quarto.
   - Confirmar que os controles de iluminação, tomadas do PC e medição de energia estão limpos, sem o card fantasma de presença no closet.
5. **Barra de Segurança (`SecurityAlertsBar`)**:
   - Verificar que a barra superior só se abre quando há gatilho real (ex: porta do quarto aberta ou movimento na lavanderia/gourmet).
   - Abrir o modal de segurança e verificar que a lista de sensores monitorados contém 3 sensores ativos legítimos.
6. **Modo Noturno (`AmbientNightMode`)**:
   - Simular ou ativar o modo noturno: verificar ausência de exceções no console do navegador (`F12`).
