# TV da sala — estado real (estado, canal, entrada, volume)

**Status**: opção A aprovada e implementada em 24/09/2026 (alçada 2). Opção B descartada por ora.

## Problema

O painel mostra dados da TV que às vezes não vêm da TV:

| Onde | Valor inventado | Deveria ser |
| :--- | :--- | :--- |
| `MediaHubModal.tsx` `volumeHa` | `0.15` quando o atributo falta | "sem leitura" |
| `MediaHubModal.tsx` `fonteAtualRaw` | `"TV Aberta"` quando falta fonte | "sem leitura" |
| `MediaHubModal.tsx` `canalNomeAtualRaw` | `"Samsung TV Plus"` quando falta o nome | "sem leitura" |
| `MediaHubModal.tsx` / `TvRemoteWidget.tsx` | qualquer id `com.samsung*` vira "Samsung TV Plus" / "TV Aberta" | nome do app real, ou "aplicativo" |
| `TvRemoteWidget.tsx` | `"Smart TV Conectada"` sem volume | "sem leitura de volume" |

Medido em 24/09/2026 (TV ligada, SmartThings autenticado):

- `media_player.sala_de_estar_tv` (nuvem): `on`, `source=digital_tv`, `volume_level=0.15`, `is_volume_muted=false`.
- `sensor.sala_de_estar_tv_canal_de_tv`: vazio. `sensor.sala_de_estar_tv_nome_do_canal_de_tv`: `com.samsung.tv.aria-video` — id de aplicativo, não nome de canal.
- TV local (SamsungTV): só `on/off`, `source_list`, mudo. Não traz fonte, volume nem canal.

## Regras

1. Fonte de verdade do **contexto** (entrada, volume, canal, app): SmartThings. Para **ligada/desligada**, a TV
   local decide sempre que responde; a nuvem só quando a local está muda (revisão de 06/10/2026: a SmartThings
   congelou em `on` de 01 a 05/10 e a regra antiga "qualquer `on` vence" mostrou a TV ligada por 4 dias —
   `specs/features/painel-estados-verdadeiros.md`, E-01).
2. Dado ausente aparece como ausente ("—" / "sem leitura"), nunca como valor padrão.
3. `unavailable` e `unknown` são estados próprios (CLAUDE.md §12).
4. Leitura que falha não dispara comando.

## Decisão de arquitetura (pendente)

**A. Via integração do HA (sem segredo novo).** Um sensor `sensor.tv_sala_contexto` no HA normaliza estado, entrada, canal, app e volume a partir das entidades SmartThings; o painel só o lê. Limite: só existe o que a integração expõe.

**B. Direto na API do SmartThings.** Rota nova `app/api/tv/estado` chama `api.smartthings.com` com um Personal Access Token e lê os componentes `main` (`switch`, `audioVolume`, `mediaInputSource`, `tvChannel`, `samsungvd.*`). Traz mais campos, mas: token novo em `dashboard-app/.env.local` (só o André cria e coloca — CLAUDE.md §10), rota nova (alçada 2), segunda fonte de verdade ao lado do HA, e o painel não tem autenticação.

## Critérios de pronto

- Nenhum valor padrão inventado nos dois componentes.
- TV desligada, ligada em TV aberta, ligada em HDMI, ligada em app e sem leitura: cada caso conferido contra a API, sem acionar a casa.
- `npx tsc --noEmit` passa; registro em `ESTADO_DASHBOARD.md`.

## Se o HA reiniciar no meio

Sensores de template reavaliam sozinhos; sem estado persistido. Nada a restaurar.
