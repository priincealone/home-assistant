# Feature Spec · Desligar o PS5 (repouso) pelo Home Assistant via Remote Play

- **ID**: PS5-02
- **Autor**: Claude Code
- **Data**: 24/09/2026
- **Status**: Aprovada a direção pelo André em 24/09 (opção "Remote Play"). Implementação bloqueada por B-1 a B-3
- **Classificação**: Alçada 2 (integração custom e contrato de entidade). Passo de pareamento é alçada 3 (credencial do André)
- **Complementa**: `ps5-integracao-completa.md` (PS5-01). Este documento **revoga** o item "Desligar o PS5 — não faz" de PS5-01 §4 e a frase de §1.2 sobre a ausência de `turn_off`

---

## 1. Por que Remote Play

Medido em `config/custom_components/ps5`: o protocolo DDP só tem `SRCH` (estado) e `WAKEUP` (ligar). **Não existe
pacote de standby em DDP.** O único caminho de rede para pôr o console em repouso é abrir uma sessão Remote Play
(TCP 9295 / UDP 9296) e mandar o comando de repouso por ela. As alternativas foram descartadas: HDMI-CEC atrela o
console à TV Samsung; cortar a tomada é desligamento forçado.

## 2. Situação hoje (24/09/2026)

| Fato | Valor |
| :--- | :--- |
| Entidade | `media_player.sala_de_estar_ps5`, `supported_features = TURN_ON` |
| Endereço | `192.168.31.245` (DHCP, sem reserva, K-06) |
| Estado | `unavailable` em todo o histórico recente; sem ping, sem DDP, MAC `BC:33:29:87:AD:40` não aparece na `/24` |
| Material de pareamento guardado | só `credential` (derivada da `PS5-RegistKey`). **`RP-Key` é descartado** em `ddp/link.py` |
| Biblioteca candidata | `pyremoteplay 0.7.6` (instala no container, pip resolve; Python 3.14 **não testado**) |

O material atual **não basta**: a sessão Remote Play exige a `RP-Key` e a `RegistKey` completas. É preciso
**parear de novo**, guardando esses dois valores.

## 3. Desenho

1. **Dependência**: declarar `pyremoteplay==0.7.6` em `manifest.json` (`requirements`), para o HA reinstalar
   sozinho. Pip manual no container some quando ele é recriado. Validar em Python 3.14 antes de seguir; se não
   carregar, avaliar reimplementar só o trecho de standby ou fixar outra versão.
2. **Pareamento**: `config_flow` passa a gravar `RP-RegistKey` e `RP-Key` na entrada. Quem digita PIN e `npsso` é o
   André, pela tela de reconfiguração do HA. O agente nunca vê esses valores (CLAUDE.md §10).
3. **Entidade**: `media_player.sala_de_estar_ps5` ganha `TURN_OFF`. `async_turn_off` faz:
   - lê o estado; **só age se for `on`** (sessão Remote Play contra console em repouso o **acorda**, então comando de
     desligar não é idempotente aqui, ver CLAUDE.md §11.3);
   - abre a sessão, envia standby, fecha a sessão; timeout curto; erro vira exceção visível, sem retentativa cega.
4. **Quem pode chamar**: apenas ação explícita do André (botão no painel ou serviço manual). **Nenhuma automação
   desliga o console.** Gatilho por horário ou presença fica fora do escopo.
5. **Ventilação**: sem mudança. A automação "Ventilação do PS5 acompanha o console" já espera 2 min depois de o
   console sair de `on` (dono de `switch.ventilacao_ps5` continua sendo ela).
6. **Painel** (território do Antigravity): botão "Repouso" e entrada de `media_player.sala_de_estar_ps5` com
   `turn_off` na lista de permissão de `lib/rooms.ts` e da rota `control`. Só com pedido/acordo dele.

## 4. Riscos

| Risco | Efeito | Mitigação |
| :--- | :--- | :--- |
| Docker Desktop em NAT | Sessão UDP 9296 pode não fechar | Testar no container antes de codar o resto; se falhar, o caminho é rodar a integração fora do NAT (decisão do André) |
| Remote Play desativado no console | Sessão recusada | Passo do André (B-3) |
| Sessão já aberta (app Remote Play no celular) | Só há uma sessão por vez | Erro claro; sem forçar |
| Console em uso jogando | Standby interrompe a partida | Ação só por clique explícito; confirmação no painel (a definir com o Antigravity) |
| Lib de terceiros sem manutenção | Quebra em atualização do PS5 | Versão fixada; falha vira erro visível, não comando errado |

## 5. Bloqueios (todos do André, fisicamente no console e no roteador)

| ID | O que fazer | Por quê |
| :--- | :--- | :--- |
| B-1 | Reservar o IP do PS5 no roteador (K-06) | Sem isso a integração perde o console |
| B-2 | *Configurações → Sistema → Economia de energia → Recursos disponíveis no modo de repouso*: ativar **Manter conectado à internet** e **Ativar ligar o PS5 pela rede** | Sem rede em repouso, nem ligar nem estado funcionam |
| B-3 | *Configurações → Sistema → Remote Play*: ativar **Ativar Remote Play** | Habilita a sessão |
| B-4 | Deixar o console **ligado** e ler o PIN em *Remote Play → Vincular dispositivo*; digitar PIN + `npsso` na reconfiguração da integração | Gera a `RP-Key`; credencial é dele |

## 6. Verificação (Definição de pronto)

- [ ] `pyremoteplay` carrega em Python 3.14 dentro do container; `check_config` passa
- [ ] Pareamento novo grava os dois valores; `credential` antiga continua funcionando para o WAKEUP
- [ ] Estado do PS5 volta a `on`/`off` (fim do `unavailable` permanente)
- [ ] `turn_off` com console `on` leva a `off` em até 30 s; com console `off`, **não faz nada** (medido, não presumido)
- [ ] Teste físico feito **uma vez**, curto, com o André presente, e o estado anterior devolvido (`turn_on`)
- [ ] `ESTADO_DASHBOARD.md`, `CASA.md` e `planning/` atualizados; PS5-01 anotada como revogada neste ponto
