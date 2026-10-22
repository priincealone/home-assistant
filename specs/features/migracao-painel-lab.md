# Migração do painel paralelo (`dashboard-lab/`) para o painel real (`dashboard-app/`)

**Status:** RASCUNHO para aprovação do André — nada de `dashboard-app/` foi alterado. Escrito em 21/10/2026.
**Alçada:** nível 2 (CLAUDE.md): mexe em `dashboard-app/` (território do Antigravity), exige pedido inequívoco, plano prévio e aprovação.
**Origem:** o André decidiu "levar o painel completo" do lab para o painel real. Referências: `specs/features/painel-paralelo-lab.md` (rodadas 1–9).

## 1. O que "levar o painel completo" precisa respeitar
- **Nunca remover funcionalidade do painel real** para encaixar o visual (CLAUDE.md §17, `UI-QUALITY-POLICY`). O lab é uma maquete menor que o painel real; migrar = **trazer a distribuição, o visual e os comportamentos novos do lab sem perder nada do que o real já faz**.
- **Automação nunca depende do painel**; nenhuma rota nova de escrita sem plano próprio. Comandos continuam passando por `/api/toggle`, `/api/control`, `/api/scene`, `/api/tv`, `/api/vacuum`, com a lista de permissão de `lib/rooms.ts`.
- Contrato de entidades: `lib/rooms.ts` continua sendo a única fonte; o `npm test` (contrato de entidades) roda a cada fase.
- Publicar na 3002 só com **APROVADO** do `visual-gatekeeper` na versão exata (auditada antes na 3010). Mudança desta escala (cabeçalho, grade de cômodos, rolagem, componente compartilhado, tela/modal novo, > 3 arquivos) é **rodada completa** do porteiro: 4 frentes em paralelo, Opus, matriz inteira, ~600–900 mil tokens — **custo a ser confirmado pelo André antes de cada rodada completa**.

## 2. O que o painel real já tem (e o lab não)
Levantado em leitura: `app/page.tsx` (883 linhas), `app/globals.css` (~16 mil linhas), 36 componentes em `app/components/`, rotas `app/api/{camera,control,energy,historico,mapa,scene,state,stream,todo,toggle,tv,vacuum,wallpaper,weather}`, `app/comodo/[id]`, `app/standby`.
Funcionalidades do real **sem equivalente no lab** (todas devem sobreviver): energia (`EnergyWidget`), clima e previsão (`HeaderWeather`, `WeatherForecastModal`), controle remoto e hub de mídia da TV (`TvRemoteWidget`, `MediaHubModal`), câmeras ao vivo/hub de vigilância (`CameraLivePlayer`, `SurveillanceHubModal`), aspirador com mapa (`VacuumWidget`, `/api/mapa`), lista de tarefas/compras (`TodoListWidget`), papel de parede (`WallpaperSurface`, `WallpaperGalleryModal`), rede (`RedePill`, `RedeModal`), saúde (`HealthPill`), alertas de segurança e bateria (`HeaderAlertPill`, `lib/alertas.ts`, `lib/batteries.ts`), modo noturno/standby, página de cada cômodo (`app/comodo/[id]`), modo celular com resumo recolhível, push otimista com travas (`lib/estadosOtimistas.ts`), SSE (`/api/stream`).
O que o lab **tem e o real não**: hero por hora do dia, rail de ícones por ambiente (celular e tablet), casca de tablet sem rolagem de página, folha de ajustes por toque longo em todos os aparelhos, favoritos, aviso com Desfazer, deslizar entre ambientes, dica de rolagem, Manutenção (baterias + offline).

## 3. Mapa lab → real (proposta; decisões marcadas ⚠️ no §6)
| Lab | Real hoje | Proposta |
| :-- | :-- | :-- |
| Hero por hora + saudação + resumo | `hero-glass-enclosure` (título "Casa", relógio, clima, pílulas, ações rápidas) | Trazer o céu por hora e a saudação **preservando** relógio, clima, pílulas de status/alerta e ações rápidas (reposicionados na linha do resumo). |
| 5 cenas | `QuickScenesPanel` | Reaproveitar o painel de cenas existente com o visual do lab (cenas reais, via `/api/scene`). |
| Ambientes (rail/lista) + cômodos com aparelhos | grade de `RoomCard` + `app/comodo/[id]` | ⚠️ A grade de cartões de cômodo é a porta de entrada hoje. Proposta: manter `RoomCard` e a página do cômodo, e **acrescentar** o rail/lista de Ambientes como filtro da mesma tela. |
| Folha de ajustes (toque longo) | `LightDimmerModal`, `FanControlCard`, `TvRemoteWidget`, `VacuumWidget` | Unificar o **gesto** (toque longo/menu de contexto) chamando os modais/ controles que já existem; "Favorito" é novo. Sem duplicar controles. |
| Segurança (câmeras) | `CameraGlanceWidget` + hub de vigilância | Coluna lateral usa as câmeras reais já existentes. |
| Manutenção (baterias/offline) | `HeaderAlertPill` (baterias/segurança) + `lib/batteries.ts` | ⚠️ Ampliar o que existe (índice, lista, offline) em vez de criar paralelo; dados reais de `lib/batteries.ts` e do estado `unavailable`. |
| Favoritos, Desfazer, deslizar | — | Novos; favoritos em `localStorage` (como no lab) ou no servidor? ⚠️ |
| Estados carregando/offline/indisponível | já há 3 estados de conexão e `unavailable` | Alinhar o visual ao lab; **mesma semântica** do CLAUDE.md §12 (nunca mostrar desconhecido como desligado). |
| Casca de tablet sem rolagem (768–1400 px) | `UI-RESPONSIVE.md`, "1º viewport" | ⚠️ Conferir com `docs/UI-RESPONSIVE.md` e o `visual-gatekeeper`; os widgets do real (energia, TV, câmeras, aspirador, tarefas) disputam o mesmo espaço. |

## 4. Dados reais (o que o lab simulava)
- Aparelhos/cômodos: `lib/rooms.ts` (contrato) + `/api/state` e SSE `/api/stream`; **sem token no navegador**.
- Brilho, cor, velocidade do ventilador, volume/entrada da TV, sucção/ações do aspirador: só os que as rotas existentes já aceitam; o que o HA não expõe **não aparece** na folha (nada de controle falso).
- Baterias: `lib/batteries.ts` (catálogo de entidades) — TODO confirmar quais têm leitura hoje. Offline: entidades `unavailable`/`unknown`.
- Temperatura por cômodo, "há X min" dos sensores: dos atributos `last_changed`/sensores reais — TODO confirmar disponibilidade em `lib/ha.ts`.
- Escrita: travas otimistas de 5 s e reversão em falha (CLAUDE.md §12 TODO "rotas de escrita com o HA fora do ar" segue em aberto — decidir aqui).

## 5. Plano em fases (cada fase: `npx tsc --noEmit`, `npm test`, `npm run lint`, porteiro; build/publicação só com APROVADO)
0. **Preparação**: branch no repositório `dashboard-app` (ex.: `lab-migracao`), desenvolvimento só na 3010; backup do estado atual; baseline de screenshots/medidas do painel de hoje. Nenhuma mudança de comportamento.
1. **Fundação visual**: tokens e utilitários do lab (céu por hora, máscara de rolagem, folha/aviso) em CSS escopado; sem trocar telas.
2. **Cabeçalho e cenas**: hero por hora, saudação, resumo; cenas com o novo visual. Preserva relógio/clima/pílulas/ações.
3. **Navegação por ambiente**: rail (celular/tablet) e lista (desktop) filtrando a grade/lista de cômodos; deslizar no celular.
4. **Aparelhos e ajustes**: gesto de toque longo/contexto abrindo os controles reais; favoritos; Desfazer em cenas/"Apagar tudo".
5. **Manutenção**: índice de baterias + offline sobre `lib/batteries.ts`/`unavailable`, integrado às pílulas existentes.
6. **Casca de tablet**: página fixa com laterais fixas, **sem remover** nenhum widget (se não couber, vai para a folha/aba e não some).
7. **Estabilização**: rodada completa do porteiro (custo confirmado), medições em aparelho real, piloto na 3010 por alguns dias, só então a 3002 (derrubar a porta, watchdog reconstrói).
Reversão: cada fase é um commit/PR separado no `dashboard-app`; a fase 7 publica atrás da 3010 e mantém o build anterior para voltar.

## 6. Decisões do André (21/10/2026)
1. **Escopo**: manter **todo** o painel real; trazer visual e comportamentos do lab sem remover nenhum widget.
2. **Permissão**: o Claude Code pode editar `dashboard-app/app/**` e `globals.css` **nesta migração**, em branch própria e só na 3010 até haver APROVADO do porteiro. (Exceção ao CLAUDE.md §6 limitada a este trabalho.)
3. **Custo**: rodadas **enxutas por fase** e **uma única rodada completa** do porteiro antes de publicar na 3002.
4. **Favoritos**: **só no aparelho** (`localStorage`), sem rota nova nem escrita no servidor.
5. **Ainda abertas** (decidir na fase correspondente): aspirador com mapa no real (o lab é sem mapa por decisão do André; o real tem `/api/mapa` — por regra de não remover funcionalidade, **o mapa fica**); casca de tablet com os widgets do real (fase 6).

## 7. Riscos e cuidados de execução
- **O working tree de `dashboard-app/` é o que o watchdog serve na 3002** (build automático quando o código muda). **Não trocar de branch nem editar nele sem isolar**: usar `git worktree` em pasta separada (ex.: `D:HomeAssistantdashboard-app-migracao`) com `node_modules` por junction/cópia — cuidado: `node_modules` está no Google Drive e perde arquivos. Resolver isso na fase 0 antes de qualquer edição.
- `dashboard-app/` tem git próprio (remote `priincealone/casa-dashboard`, privado): uma fase = um commit/PR; push só após varredura de segredos.
- Nenhuma fase pode derrubar a 3002 nem deixar `.next` inconsistente (foi assim que o painel ficou fora em 27–29/09).
- O `HeaderAlertPill` de baterias/segurança e o catálogo `lib/batteries.ts` **já existem**: a Manutenção do lab deve ampliá-los, não duplicar.
