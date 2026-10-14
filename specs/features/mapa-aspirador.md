# Mapa do aspirador no painel (via Xiaomi Cloud Map Extractor)

Origem: levantamento de 13/10/2026 (`artifacts/claude/aspirador-mapa-e-comodos.md`) e pedido do André ("adicionar login",
resposta: conta Xiaomi para o mapa do aspirador). **Esta especificação está parada à espera do André** (K-18 em
`planning/BLOCKED.md`): sem a conta e o token do robô não há câmera de mapa, e nada do painel pode ser construído nem verificado.

## Problema

O aspirador (`vacuum.dreame_us_415783444_mc1808`, "Mijia 1C") só entrega ao HA estado e sucção pela integração `xiaomi_home`. O mapa e os
cômodos que o app nativo mostra vivem num arquivo na nuvem Xiaomi e não chegam ao HA nem ao painel. O modal "Central do Robô
Aspirador" não tem mapa.

## Comportamento esperado

1. **Casa (André, nível 3)**: instala o `Xiaomi Cloud Map Extractor` (HACS), obtém IP e token do robô, grava a conta e o token no
   `config/secrets.yaml` e me diz **só os nomes das chaves**. Eu acrescento o bloco `camera:` ao `configuration.yaml` com `!secret`
   (nível 2: plano abaixo, aprovação dele), valido com `check_config` e reinicio o HA (só YAML).
2. **Painel** (depois que existir `camera.<nome>`): no modal do aspirador, uma aba ou seção "Mapa" com a imagem da câmera e a lista de
   cômodos lida dos atributos (`rooms`, `room_numbers`, `vacuum_room_name`). Atualiza a cada 30 s com o modal aberto e a cada 5 s
   enquanto o robô está `cleaning`; fora disso, só ao abrir.
3. **Rota nova** `GET /api/mapa` (nível 2: rota nova; revisão): o servidor lê `/api/camera_proxy/<entity>` do HA com o token (que nunca
   vai ao navegador) e devolve a imagem; a entidade vem de `lib/rooms.ts` (lista de permissão), nunca da requisição. Somente leitura.
4. **Sem mapa, o painel diz**: câmera indisponível ou sem imagem mostra "Mapa sem leitura" (estado próprio, CLAUDE.md §12); nunca um
   mapa velho como se fosse atual, e a imagem traz a hora da última atualização.

## Bloco de configuração (só entra depois do passo 1)

```yaml
# config/configuration.yaml — Xiaomi Cloud Map Extractor (mapa do aspirador)
camera:
  - platform: xiaomi_cloud_map_extractor
    name: Mapa do aspirador
    host: !secret mapa_aspirador_ip
    token: !secret mapa_aspirador_token
    username: !secret mapa_xiaomi_usuario
    password: !secret mapa_xiaomi_senha
    country: us            # o robô está na conta "us" (entidades dreame_us_…); confirmar com o André
    draw: ["all"]
    attributes: [calibration_points, rooms, room_numbers]
    scan_interval: 30      # o padrão é 5 s; 30 s poupa a nuvem e a conta
```

Os quatro nomes de chave são sugestões: se o `secrets.yaml` já tiver chaves equivalentes (o `docs/SECURITY.md` cita token do
aspirador e conta Xiaomi), reutilize os nomes dele em vez de duplicar. **Nenhum valor passa pela conversa.**

## Entidades envolvidas

- Nova: `camera.mapa_do_aspirador` (nome provável; confirmar depois do primeiro boot) e seus atributos.
- Já existentes: `vacuum.dreame_us_415783444_mc1808` e sensores de bateria e estado.
- `lib/rooms.ts`: entrada em `ENTIDADES_EXTRAS` e em `CAMERAS_CASA`-like específica; o `tests/contrato-entidades.test.mjs` já confere a
  existência no registro e não deve ser enfraquecido.

## Fora desta entrega

- **Limpar por cômodo ou zona**: a spec MIoT do `mc1808` não tem comando de cômodo; escrever na propriedade `area` exigiria um formato
  não público. Não prometer.
- Edição do mapa, múltiplos andares, "zona proibida".
- Trocar a integração `xiaomi_home` do aspirador.

## Se o HA reiniciar no meio

A câmera some e volta com o HA; o painel mostra "Mapa sem leitura" enquanto isso (nunca o último mapa como se fosse atual). Nenhuma
automação depende do mapa. O primeiro mapa pode levar alguns minutos depois de um boot.

## Riscos e cuidados

- **Segredos no Google Drive**: `config/secrets.yaml` está dentro da pasta sincronizada (`docs/SECURITY.md`). Preferir uma **conta Xiaomi
  secundária** com o aspirador compartilhado, em vez da conta principal (se a nuvem liberar o arquivo do mapa para convidado; testar).
- A conta Xiaomi tem limite de pedidos e 2FA por e-mail; erro de login repetido pode travar a conta por horas.
- O IP do robô é DHCP: reservar no roteador (junto do K-06) ou o mapa para de atualizar quando o IP mudar.
- Complemento de terceiros que recebe a senha da conta: ler o código antes de instalar (PiotrMachowski, repositório público).

## Como se verifica

1. `check_config` com o bloco (e as chaves de `!secret` existentes) sai com código 0.
2. A câmera aparece e tem imagem; `rooms` lista os cômodos do app.
3. `GET /api/mapa` devolve imagem com o HA no ar e 502 com `{ erro }` com ele fora, sem token no corpo nem nos cabeçalhos.
4. Modal: imagem, hora da atualização e lista de cômodos; câmera indisponível = "Mapa sem leitura".
5. `npx tsc --noEmit`, `npm run lint` e `npm test` (com a nova entidade no contrato).
