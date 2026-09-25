# BLOCKED

Trabalho que não avança por falta de algo fora do alcance de quem executa. Cada item diz **o que
destrava** e **quem destrava** — se não houver ação concreta descrita, o item não pertence aqui.

A maioria está bloqueada no André, e por um bom motivo: são credenciais, contas e equipamento físico,
que por política nenhum agente toca (`docs/SECURITY.md`).

---

## Bloqueados no André — credenciais e contas

### K-01 · Rotinas de presença na nuvem Tuya
**Destrava**: desativar as rotinas no app Smart Life (Lavanderia e Banheiro).
**Por que só ele**: a conta é dele; a regra roda nos servidores da Tuya, fora do HA.
**Impacto de não fazer**: a automação da Lavanderia disputa a mesma lâmpada com a rotina da nuvem, que
acende a qualquer hora. Desativar a entidade `scene.*` no HA **não** para a rotina de lá.

### K-02 · Alexa Media Player
**Destrava**: trocar a chave de acesso da conta Amazon por senha com verificação em duas etapas por
app autenticador; a integração tem campo próprio para a chave de 52 caracteres.
**Por que só ele**: é segurança da conta dele.
**Diagnóstico**: passkey é amarrada ao domínio `amazon.com.br` e o proxy da integração serve de outro
endereço — o navegador recusa por origem diferente. Não é defeito de configuração. Tentado também
neutralizar o WebAuthn na aba: não contorna.

### K-03 · YouTube Music no Music Assistant
**Destrava**: usuário e cookie de sessão do Google.
**Pronto para receber**: `scripts/music_assistant/ytmusic_setup.js` faz o resto sem passar pela
interface do MA, que congela nesse diálogo. O servidor de PO token já está de pé e no endereço certo.

### K-04 · Chaves dos AirTags (FindMy)
**Destrava**: rodar `python3 -m findmy decrypt` **num Mac** e trazer o arquivo de chaves — **e**
recriar o servidor anisette, removido em 20/09/2026 a pedido do André (container, imagem e pasta
de dados apagados; não será mais usado no projeto). A integração `findmy` continua configurada no
HA, mas sem o anisette não tem como autenticar. Sem ele, este item não destrava mais só com o Mac.

### K-05 · Atalho do Apple Saúde
**Destrava**: montar o atalho no iPhone com automação diária apontando para o webhook.
**Pronto**: os seis sensores existem e respondem; os valores atuais são de um POST de teste.

---

## Bloqueados no André — rede e equipamento

### K-06 · Reserva de DHCP
**Destrava**: reservar no roteador o IP do PC (`192.168.31.22`), o do PS5 e o do **DVR das câmeras**
(`192.168.31.216`). O DVR já mudou duas vezes (`.216`→`.217` em 20/09/2026 e `.217`→`.216` em
24/09/2026), derrubando as duas câmeras até a URL RTSP ser corrigida.
**Mitigação parcial (24/09/2026)**: André fixou o IP `.216` no próprio DVR (Rede → TCP/IP, sem DHCP);
HLS das duas câmeras voltou a gerar. Falta a reserva/exclusão da faixa DHCP no roteador, senão outro
aparelho pode receber o `.216` e gerar conflito. O MAC do DVR deve ser lido no menu do DVR ou na lista
do roteador — o `arp` do PC mostrou o mesmo MAC em `.155` e `.216` (proxy ARP do mesh), não serve.
**Impacto de não fazer**: o IP do PC está escrito fixo em `app/api/mass/route.ts` e é o destino do
webhook de saúde. Se mudar, o painel perde o Music Assistant e a telemetria para de chegar. O IP do
DVR está fixo na URL RTSP das duas integrações `generic` — se mudar de novo, as câmeras voltam a
ficar indisponíveis até alguém perceber e corrigir manualmente.

### K-07 · Som ambiente — equipamento
**Destrava**: comprar as caixas embutidas e o amplificador; definir onde ficam os Echos.
**Observação**: multiroom **sincronizado** depende do multicast, que este hospedeiro não entrega — ou
seja, K-07 completo depende também de K-09.

### K-08 · Larissa como usuária
**Destrava**: resolver o acesso remoto fora da tailnet (Tailscale no iPhone dela, ou outro caminho).
**Efeito colateral a considerar**: com duas pessoas cadastradas, a automação proposta "saiu de casa →
apaga tudo" deixa de ser segura como está escrita.

### K-09 · Migração para hardware dedicado
**Destrava**: decidir e comprar o equipamento (mini PC ou Raspberry Pi com HA OS).
**Resolve de uma vez**: multicast e som multiroom, queda da casa quando o PC dorme, e a pasta do
projeto sincronizada pelo Google Drive.

### K-10 · Termostato e calendário
**Destrava**: o termostato existe fisicamente e está offline; o calendário nunca foi integrado.
❓ **DESCONHECIDO**: modelo do termostato e se é integrável ao HA.

**K-13 (URL RTSP malformada) resolvido pelo André em 19/09/2026** — ver `ESTADO_DASHBOARD.md`
(entradas de 19/09). HLS confirmado gerando normalmente depois da correção.

---

## Bloqueados por decisão, não por falta de acesso

### K-11 · Autenticação do painel
**Destrava**: decidir o método — senha simples no painel, proxy autenticado, ou restringir a porta 3002
por firewall e confiar só na tailnet.
**Por que está aqui**: é decisão de produto e de conveniência (o tablet de parede não deveria pedir
senha a cada toque), não uma tarefa de código esperando ser escrita.
⚠️ **Achado de 23/09/2026 que pesa nessa decisão**: `middleware.ts` isenta `/api/camera*` do PIN — o vídeo ao
vivo das duas câmeras e o `POST /api/camera/record` (grava 30 s por chamada) respondem sem autenticação para
quem alcança a porta 3002. Além disso `lib/auth.ts` cai num PIN padrão de 4 dígitos quando `DASHBOARD_PIN` não
está definido. Não alterei nada (decisão do André).

### K-12 · Como sair do servidor de desenvolvimento
**Destrava**: escolher entre container na `casa-net`, serviço do Windows, ou o `ha-addon/` que já
existe no repositório e nunca foi usado.
⚠️ Containerizar **quebra** a leitura de `C:\HomeAssistant\config\.storage\core.config_entries` feita
por `app/api/mass/route.ts`, e exige rever `HA_URL`.

**K-14 (reprodução das câmeras da rua na TV) encerrado, não só destravado** — André decidiu em
19/09/2026 descartar a abordagem em vez de resolver o transcode, e pediu para remover toda a
infraestrutura (não deixar pausada). Ver `planning/DONE.md` e `CASA.md` §Câmeras para o que foi
removido, e `specs/features/reproducao-cameras-tv.md` para o diagnóstico técnico (mantido como
registro histórico, marcado como descartado). Alexa/Nabu Casa continua fora de escopo, sem relação
com esse encerramento.

### K-15 · go2rtc embutido do HA: `frame.jpeg` dá 500 nas duas câmeras (imagens estáticas e WebRTC)
**Sintoma**: `/api/camera_proxy` e o card de miniatura do HA falham (~86 tracebacks/h no log:
`Go2RtcClientError`, `500` em `/api/frame.jpeg`); no boot aparece `Error registering WebRTC provider ...
Stream source is not supported by go2rtc`. O vídeo ao vivo **não** é afetado (HLS pelo componente `stream`).
**Já isolado (23/09/2026)**: o `frame.jpeg` responde `exit status 183` = o `ffmpeg` que o go2rtc executa sai
com `AVERROR_INVALIDDATA`. DVR, rede e decodificador estão bons: `ffmpeg` direto no DVR gera JPEG em ~1 s
(HEVC Main 960x1080@30, keyframe a cada 2 s, sem áudio). A causa exata dentro do go2rtc **não** foi
isolada — o teste A/B H.264×HEVC ficou inconclusivo (o RTSP interno rejeita caminho não definido), então
**não** se pode culpar o HEVC.
**Destrava**: decisão do André (mexe na config do HA, nível 2). Caminhos a avaliar: log de debug do go2rtc
para ver o comando exato que falha; mudar o stream principal do DVR para H.264 (só ele mexe no DVR);
ou aceitar, já que o painel não usa esse caminho.
**Impacto de não fazer**: log do HA poluído e miniaturas estáticas do próprio HA quebradas. O
`dashboard-app` não depende disso: as rotas `/api/camera/[id]/snapshot` e `/stream` (que dependem) não
são chamadas por nenhum componente.
