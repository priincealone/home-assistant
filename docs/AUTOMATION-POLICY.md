# AUTOMATION-POLICY — regras para automação física

Última revisão: 15/09/2026 · Base: as cinco automações em produção e `artifacts/claude/automation-safety-audit.md`.
Cada regra aqui nasceu de um defeito real neste sistema, não de teoria.

## Princípios

1. **Automação mora no Home Assistant.** Nunca na interface. Se o painel cair, a casa continua.
2. **Cada atuador tem um dono.** Dois lugares mandando no mesmo relé produzem comportamento
   indeterminado.
3. **Decida por estado, não por gatilho.** Gatilho se perde num reinício; estado é sempre legível.
4. **Reversível por padrão.** Prefira a automação cujo erro se corrige apertando um botão.

## Regras obrigatórias

### R1 · A automação explica a si mesma

Toda automação carrega na `description` o que faz, por que foi feita assim e qual armadilha evita. É o
que impede que a próxima pessoa "simplifique" a proteção.

### R2 · Comando de desligar não é idempotente

`media_player.turn_off` na TV Samsung é a tecla POWER, que **alterna**: com a TV apagada, liga.
Medido: porta fechou 23:18:52, TV ligou 23:18:56.

> Condicione o comando ao estado atual e envie por **um caminho de cada vez**. Nunca dispare o mesmo
> comando por integração local e de nuvem simultaneamente.

### R3 · Condição de horário que atravessa a meia-noite

`after: '22:00:00'` sozinho cobre das 22h à meia-noite e para. Para a noite inteira, use `after` maior
que `before` (22:00 → 06:00).

### R4 · Condição de sol guarda o acender, nunca o apagar

Se a condição `below_horizon` também guardar o desligamento, uma luz acesa às 5h50 fica acesa para
sempre: o sol nasce, a condição vira falsa, o apagar nunca roda.

> Acender exige escuro. Apagar por ausência é seguro a qualquer hora.

### R5 · Temporizador é `for:` no gatilho

Use `for: '00:10:00'` no gatilho de ausência em vez de `timer` ou `delay`. Ele se reinicia sozinho a
cada nova detecção e não sobrevive como agendamento órfão.

### R6 · Reconcilie o que não pode ficar errado

Para automação que protege hardware (ventilação do PS5), some gatilhos de `homeassistant.start` e
`time_pattern` e decida pelo estado. Assim ela se conserta sozinha depois de qualquer reinício.

### R7 · Alvos por template, exclusões explícitas

Resolver "todas as luzes" por template faz luz nova entrar na rotina sozinha. Exclua sempre, e por
escrito: luzes de fundo dos interruptores, LEDs de equipamento de rede e telas de navegador.

### R8 · Um atuador, um dono

Antes de escrever, verifique se o alvo já é governado por outra automação. Conflito conhecido e ainda
aberto: a cena "gamer" do painel dá `toggle` em `switch.ventilacao_ps5`, que pertence à automação de
ventilação — com o console ligado, a cena **desliga** a ventilação e a automação só corrige na
reconciliação seguinte.

### R9 · Verifique a nuvem antes de automatizar presença

O app Smart Life tem rotinas próprias sobre os mesmos sensores. Desativar a entidade `scene.*` no HA
**não** para a rotina na nuvem. Confirme com `scripts/diagnostico/quem_acendeu.py`: acendimento sem
contexto não partiu do Home Assistant.

## Procedimento para criar ou alterar automação

1. **Mapear o alvo** — qual entidade, quem mais mexe nela (R8, R9)
2. **Escrever com justificativa** na `description` (R1)
3. **Validar a sintaxe** antes de recarregar:
   ```bash
   docker exec -i homeassistant python -m homeassistant --script check_config -c /config
   ```
4. **Recarregar sem reiniciar** — serviço `automation.reload`
5. **Conferir que carregou** — a automação deve aparecer `on`
6. **Não disparar para testar** se o efeito for físico e inoportuno. Prefira renderizar os templates e
   avaliar as condições com o estado atual
7. **Registrar** em `ESTADO_DASHBOARD.md` e atualizar `CASA.md`

## O que nunca fazer sem autorização explícita do André

- Acionar automação real para demonstração fora de hora
- Automatizar tranca, portão, aquecedor ou qualquer carga com risco físico
- Criar automação que dependa do painel estar no ar
- Alterar regras no app Smart Life (é conta dele, alçada dele)
- Editar registros do `.storage` com o container em execução

## Alçadas

| Nível | O que é | Quem decide |
| :--- | :--- | :--- |
| 1 | Diagnóstico somente leitura; recarregar automação existente | Agente, com validação |
| 2 | Criar ou alterar automação; mexer em `.storage`; mudar contrato de entidades | Plano prévio e aprovação do André |
| 3 | Segredos, tokens, nuvem Tuya, rede e roteador, pareamento físico | Só o André |

## Automações em produção

Ver `CASA.md` para a descrição de cada uma. Hoje são cinco: ventilação do PS5, porta do quarto (fechar
e abrir) e movimento (Lavanderia e Área Gourmet). Nenhuma aciona carga crítica; o pior efeito possível
é luz na hora errada ou TV ligando — este último já protegido por R2.
