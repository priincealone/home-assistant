# PRODUCT.md — Painel de Automação Residencial

## O que é
Interface própria (web, pensada para rodar num tablet fixo na parede e também acessível
via navegador comum) que substitui o dashboard nativo do Home Assistant por uma visão
baseada na **planta real da casa**, com os dispositivos plotados sobre ela — em vez da
organização padrão por cômodo/lista que o Lovelace entrega de fábrica.

Home Assistant continua sendo o motor: ele fala com os dispositivos, guarda estado,
executa automações. Esta interface é só a camada de visualização e controle por cima,
consumindo a API do HA.

## Para quem
Uso pessoal — um usuário (André), sem necessidade de multiusuário, permissões ou contas
por enquanto.

## Por que não o Lovelace nativo
O floorplan card do Lovelace existe, mas é limitado (YAML declarativo, SVG estático,
pouca liberdade de layout/animação). Construir por fora dá controle total sobre como a
planta e os dispositivos são desenhados e sobre a experiência de interação — e é o motivo
de valer a pena usar uma skill de craft visual (Impeccable) em vez de só configurar cards.

## Núcleo funcional (MVP)
- Planta da casa como camada visual de base
- Dispositivos plotados na posição real dentro da planta (não em lista/grid)
- Estado visual imediato por dispositivo (ligado/desligado, aberto/fechado, valor de
  sensor) — precisa ser legível à distância, já que o uso principal é um tablet na parede
- Interação direta: tocar no dispositivo na planta para controlar (toggle, ajustar)
- Atualização em tempo real (não por polling — ver seção técnica)

## Fora de escopo por enquanto
- App mobile nativo (fica pra depois, se fizer sentido)
- Integração com o assistente de voz por IA ([[assistente-voz-ia]]) — projeto separado
- Automações complexas / lógica própria além do que o HA já oferece — a camada própria é
  visualização e controle, não motor de regras

## Estado atual do projeto
- Home Assistant **já está instalado e rodando via Docker** no notebook Windows
- Nenhum dispositivo real conectado ainda (a confirmar) — o MVP precisa funcionar com
  poucos dispositivos (ou dados mockados) e crescer conforme dispositivos reais forem
  adicionados
- Ambiente de desenvolvimento: um único notebook Windows
- Sem prazo — projeto de hobby/curiosidade técnica, ritmo incremental

## Planta da casa — origem dos dados
André tem iPhone/iPad Pro com LiDAR. Isso é o caminho natural para gerar a planta base
real (em vez de desenhar do zero): escanear os cômodos com um app de captura 3D/RoomPlan
e exportar como planta 2D (imagem ou SVG) para servir de camada de fundo na interface.
Ainda não decidido qual app/fluxo de exportação usar.

## Fundação técnica (proposta — a validar)
- **Frontend:** React + Next.js. Alinha com o ecossistema que a skill Impeccable assume
  (ela cita React/Next.js como alvo natural), tem bom suporte a SSR/rendering para um
  dashboard sempre ligado, e roda bem em modo kiosk num tablet depois.
- **Comunicação com o HA:** WebSocket API do Home Assistant para estado em tempo real
  (luz acender, sensor mudar) — REST puro exigiria polling, que é ruim pra uma tela
  sempre visível. REST entra só para comandos pontuais quando fizer sentido.
- **Camada de backend:** fina, não um serviço grande — Next.js API routes bastam para
  fazer proxy do token de acesso do HA (evita expor o long-lived token no client) e para
  qualquer agregação de dado que a UI precisar. Sem banco de dados próprio por enquanto;
  o HA já é a fonte de verdade do estado.
- **Ambiente local (notebook Windows):** Home Assistant via Docker (Docker Desktop +
  WSL2), frontend rodando localmente com Node. Antigravity roda nativo no Windows, então
  não há atrito extra aí.

## Próximo passo prático
Com o HA já rodando via Docker, falta: (1) gerar um Long-Lived Access Token nas
configurações do usuário do HA, (2) confirmar que existe pelo menos 1-2 entidades reais
ou de teste disponíveis, e (3) validar que dá pra puxar estado via REST/WebSocket antes
de começar o frontend — sem isso, o modo de iteração por screenshot da Impeccable não tem
o que fotografar de verdade.
