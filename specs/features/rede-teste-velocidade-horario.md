# Painel · Teste de velocidade real (download/upload) a cada hora

- **Data**: 27/09/2026
- **Pedido**: "no card ao vivo (vira Rede) adicionar e atualizar a cada hora teste real de down/upload da rede"
- **Decisões do André**: fonte = integração **Speedtest.net** do HA; a pílula "Ao vivo" → "Rede" está com outro
  agente, então esta entrega é **só o bloco de velocidade**, sem mexer na pílula.
- **Status**: **implementada em 27/09/2026** (passo 1 feito pelo André). Entidades conferidas no registro: `sensor.speedtest_download`, `_upload`, `_ping` (Mbit/s, intervalo fixo de 60 min no código da integração, sem opção de mudar).
- **Natureza**: só leitura no painel. O teste consome banda por ~30 s por hora.

## Passos

1. **André** — HA → Configurações → Dispositivos e serviços → Adicionar integração → *Speedtest.net*. Manter o
   intervalo padrão (60 min). Isso cria entrada em `core.config_entries`, arquivo que agentes não editam.
2. **Claude** — ler `core.entity_registry` e confirmar os `entity_id` reais (esperado:
   `sensor.speedtest_download`, `sensor.speedtest_upload`, `sensor.speedtest_ping`). **Não presumir nomes.**
3. **Claude** — incluir os ids em `ENTIDADES_EXTRAS` (`app/api/state/route.ts`) e conferi-los contra o registro.
4. **Frontend** — bloco "Velocidade" com download, upload, ping e "medido há N min". Componente em
   `app/components/`, lógica pura em `lib/`, sem tocar na pílula.

## Regras

- Unidade lida do atributo `unit_of_measurement` (Mb/s esperado); não assumir.
- `unavailable`/`unknown` → "Sem leitura", nunca 0 nem "lento".
- Medida com mais de ~2 h → marcar como desatualizada.
- O teste mede a conexão do **PC/container do HA**, não cada aparelho da casa.

## Verificação

`npx tsc --noEmit`; cada `entity_id` no registro; renderizar a lógica com estados simulados (ok, `unavailable`,
medida velha). Não derrubar a rede para testar. Registrar em `ESTADO_DASHBOARD.md` e `planning/`.
