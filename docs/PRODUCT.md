# PRODUCT — o que este sistema é

Última revisão: 15/09/2026 · Fontes: `CASA.md`, `ESTADO_DASHBOARD.md`, decisões do André nesta data.

## O produto

Uma casa automatizada e o painel que a opera. São duas peças com ciclos próprios:

1. **A base** — Home Assistant com as integrações, dispositivos, áreas, automações e sensores
   derivados. É o que continua funcionando mesmo se tudo o mais cair.
2. **O painel** — `dashboard-app/`, interface própria em Next.js que consome a API do HA. Desde
   15/09/2026 é **a** interface da casa; a dashboard Lovelace "Casa" foi retirada.

A separação não é estética: automação que depende de tela é automação que falha quando a tela falha.
Nenhuma das cinco automações ativas passa pelo painel.

## Quem usa

| Pessoa | Situação |
| :--- | :--- |
| André | Único usuário cadastrado. Acessa pelo navegador, pelo app do HA e pelo tablet |
| Larissa | **Pendente.** Depende de acesso remoto fora da tailnet |
| Luca | Não é usuário; tem cômodo com luz, luminária e tomadas controladas |

❓ **DESCONHECIDO** — quem mais alcança a porta 3002 hoje (ver `docs/SECURITY.md`).

## Como se usa, na prática

- **Tablet de parede**: visão geral da casa, um toque por cômodo, modo de repouso à noite.
- **Celular**: mesmo painel, dentro de casa ou pela tailnet.
- **Sem tocar em nada**: as automações de presença, porta e ventilação agem sozinhas.
- **App do Home Assistant**: administração, histórico, e as telas nativas de Dispositivos e Mapa.

## O que o produto entrega hoje

- Luz, ventilador e tomada em 10 cômodos, com controle fino de brilho e velocidade
- Quatro cenas rápidas no painel (cinema, boa noite, boas-vindas, gamer)
- TV e PS5: energia, volume, fonte, aplicativos e controle remoto
- Aspirador: estado, bateria, ações e modo de sucção
- Energia: potência ao vivo e histórico de 24 h de duas tomadas medidoras
- Clima, relógio, lista de compras e telemetria do PC
- Saúde: seis indicadores vindos do Apple Saúde por webhook
- Áudio: Music Assistant com Apple Music (ver limitações em `docs/ARCHITECTURE.md`)

## O que está fora de escopo

| Fora | Por quê |
| :--- | :--- |
| **Planta 2D e 3D interativa** | Decisão do André em 15/09/2026: "por hora não irei usar nenhum modelo 3D ou 2D". Os arquivos foram removidos nesse dia |
| Dashboard Lovelace | Retirada em 15/09/2026. Não recriar |
| Broker MQTT próprio | Nenhum dispositivo exige |
| Câmeras e fechaduras | Não existem no sistema |
| Climatização | Sem entidade `climate.*`. O termostato existe fisicamente e está offline |
| Calendário | Sem entidade `calendar.*` |

## Princípios que o produto respeita

1. **A casa funciona sem o painel.** Automação mora no Home Assistant.
2. **Estado visível em três metros.** O tablet é lido de relance, não estudado.
3. **Resposta imediata ao toque.** A interface reflete a intenção em 0 ms e reconcilia depois.
4. **Nada de comando destrutivo por conveniência.** Ação irreversível pede confirmação humana.
5. **Credencial é do dono.** Nenhum agente busca, preenche ou transporta senha, token ou cookie.

## Como se mede sucesso

- A casa se comporta como esperado à noite, sem acendimento fantasma
- O painel está no ar quando alguém olha para o tablet
- Uma luz nova entra nas rotinas sem reescrever automação
- Nenhuma mudança de interface muda comportamento elétrico
