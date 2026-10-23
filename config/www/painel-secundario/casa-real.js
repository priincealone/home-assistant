// Painel Secundário, modo real (fase A leitura + fase B comandos, specs/features/painel-secundario-casa-real.md).
// Três blocos neste arquivo:
//  1) ADAPTADOR PURO (estadoReal e auxiliares): contrato.json + estados recebidos -> modelo que a interface já sabe desenhar.
//     Não toca no DOM nem na rede; é o que os testes exercitam.
//  2) COMANDOS (fase B): funções puras (escolher ação, converter UI -> params, mapear erro, gating, lote) e o CLIENTE
//     (criarCliente) que só monta mensagens {tipo:"comando"|"comando-lote"} e casa cada "resultado" ao seu id. O painel NUNCA
//     informa entity_id/domínio/serviço: só o id do contrato + ação + params; quem valida e chama a HA é o carregador.
//  3) PONTE (conectar): a ÚNICA parte que faz entrada/saída. Carrega contrato.json e comandos.json (únicos acessos de rede do
//     painel; arquivos estáticos do próprio painel), escuta "casa-estados"/"resultado" do carregador (window.parent, mesma
//     origem) e avisa "painel-pronto" uma vez. Kill-switch: ?leitura=1 (no painel ou na página que o hospeda) ou comandos.json
//     ausente/ilegível = tudo somente leitura, nenhuma mensagem de comando.
"use strict";
(function (g) {
  /* ---------- Leitura honesta dos estados ---------- */
  const INDISP = new Set(["unavailable", "unknown", ""]);
  // null (a HA não tem a entidade), ausente, state vazio/unavailable/unknown: indisponível. NUNCA vira "desligado" nem 0.
  const indisponivel = (e) => e == null || typeof e !== "object" || e.state == null || INDISP.has(String(e.state).trim().toLowerCase());

  // Número só quando a leitura é realmente numérica ("" e "unknown" NÃO viram 0).
  function lerNumero(v) {
    if (v == null || typeof v === "boolean") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).trim().replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
  }
  // Bateria em %, 0..100, inteira; sem leitura = null (nunca 0).
  function lerBateria(e) {
    if (indisponivel(e)) return null;
    const n = lerNumero(e.state);
    return n == null || n < 0 || n > 100 ? null : Math.round(n);
  }
  const instante = (s) => { const t = Date.parse(s); return Number.isFinite(t) ? t : null; };

  /* ---------- Domínio / categoria / device_class -> tipo de cartão da interface ---------- */
  const PORTA = new Set(["door", "opening", "window", "garage_door"]);
  const MOVIMENTO = new Set(["motion", "occupancy", "presence", "moving"]);
  const ehBateria = (d, at) => at.device_class === "battery" || /_bateria$/.test(d.entityId) || /bateria/i.test(d.nome);
  function tipoCartao(d, at) {
    const a = at || {};
    switch (d.dominio) {
      case "light": return /\bled\b/i.test(d.nome) ? "led" : "light";
      case "fan": return "fan";
      case "media_player": return /\btv\b/i.test(d.nome) ? "tv" : "console";
      case "switch": return d.categoria === "iluminacao" ? "light" : "plug";
      case "camera": return "camera";
      case "binary_sensor":
        if (PORTA.has(a.device_class)) return "door";
        if (MOVIMENTO.has(a.device_class)) return "motion";
        if (d.categoria === "seguranca") return "door";
        return /moviment|presen/i.test(d.nome) ? "motion" : null;
      default: return null;   // sensor (temperatura, umidade, energia, bateria), vacuum etc.: sem cartão
    }
  }
  const ICONE_SALA = { sala_de_estar: "couch", cozinha: "pot", copa: "pot", lavanderia: "wash", area_gourmet: "fire", quarto_luca: "baby", banheiro: "bath", circulacao: "steps", closet: "shirt", quarto: "bed" };
  const CENAS = {   // chave do contrato -> como a interface mostra (ordem de exibição abaixo)
    boa_noite: { nome: "Boa noite", icone: "moon" }, boas_vindas: { nome: "Chegada", icone: "home" },
    cinema: { nome: "Cinema", icone: "clap" }, gamer: { nome: "Jogar", icone: "console" },
  };
  const ORDEM_CENAS = ["boa_noite", "boas_vindas", "cinema", "gamer"];

  const ligadoMedia = (s) => !["off", "standby"].includes(String(s).toLowerCase());
  const pct255 = (b) => { const n = lerNumero(b); return n == null ? null : Math.min(100, Math.max(1, Math.round((n / 255) * 100))); };
  const kelvin = (at) => {
    const k = lerNumero(at.color_temp_kelvin); if (k != null && k > 0) return Math.round(k);
    const m = lerNumero(at.color_temp); return m != null && m > 0 ? Math.round(1e6 / m) : null;
  };

  // Cartão da interface a partir de um aparelho do contrato e do estado recebido. Campos null = "não informado".
  const MODOS_COR = new Set(["rgb", "rgbw", "rgbww", "hs", "xy"]);
  function cartao(sala, d, e, tipo, extraTv) {
    const at0 = (e && e.attributes) || {};
    const at = tipo === "tv" && extraTv ? Object.assign({}, at0, extraTv) : at0;   // volume/mudo/fontes da TV vêm da entidade da nuvem
    const indisp = indisponivel(e);
    const sensor = tipo === "door" || tipo === "motion";
    const estado = indisp ? "" : String(e.state).toLowerCase();
    const on = indisp ? false : d.dominio === "media_player" ? ligadoMedia(estado) : estado === "on";
    const pct = lerNumero(at.percentage);
    const vol = lerNumero(at.volume_level);
    return {
      chave: `${sala.id}.${d.id}`, sala: sala.id, id: d.id, entityId: d.entityId, nome: d.nome, tipo, real: true,
      indisp, on, sensor, info: false, estado, dominio: d.dominio,
      txtOk: tipo === "door" ? "Fechada" : tipo === "motion" ? "Sem movimento" : null,
      txtAlerta: tipo === "door" ? "Aberta" : tipo === "motion" ? "Movimento" : null,
      desde: indisp && !e ? null : instante(e && e.last_changed),
      bri: on && (tipo === "light" || tipo === "led") ? pct255(at.brightness) : null,
      temp: on ? kelvin(at) : null,
      pct: tipo === "fan" && on && pct != null ? Math.round(pct) : null,
      vel: tipo === "fan" && on && pct != null ? (pct <= 34 ? 1 : pct <= 67 ? 2 : 3) : null,
      dir: tipo === "fan" && (at.direction === "forward" || at.direction === "reverse") ? at.direction : null,
      osc: tipo === "fan" && typeof at.oscillating === "boolean" ? at.oscillating : null,
      vol: tipo === "tv" && vol != null ? Math.round(vol * 100) : null,
      mudo: tipo === "tv" && typeof at.is_volume_muted === "boolean" ? at.is_volume_muted : null,
      app: tipo === "tv" ? (at.source || at.app_name || null) : null,
      subOn: tipo === "console" ? (at.app_name || at.media_title || null) : null,
      dimmer: d.dominio !== "light" ? false : !on ? null : pct255(at.brightness) != null,   // null = ainda não dá para saber
      rgb: d.dominio === "light" && Array.isArray(at0.supported_color_modes) && at0.supported_color_modes.some((m) => MODOS_COR.has(m)),
      rgbCor: on && Array.isArray(at0.rgb_color) && at0.rgb_color.length === 3 ? at0.rgb_color.map(Number) : null,
      kmin: lerNumero(at0.min_color_temp_kelvin), kmax: lerNumero(at0.max_color_temp_kelvin),
      fontes: tipo === "tv" && Array.isArray(at.source_list) ? at.source_list.filter((x) => typeof x === "string") : null,
      temBat: !!d.batteryEntityId, batEntityId: d.batteryEntityId || null, bat: null,
    };
  }

  const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

  /**
   * Modelo da casa a partir do contrato e dos estados recebidos (mapa entity_id -> {state,last_changed,attributes}|null).
   * Devolve { salas[{id,nome,icone,cartoes[],temperatura,umidade,temSensorTemp,temSensorUmid,leitura}], baterias[], offline[],
   *           cameras[], cenas[], foraDeCena[] }. Não inventa cartão para o que a interface não sabe mostrar (foraDeCena).
   */
  const ESTADO_ASPIRADOR = { docked: "base", cleaning: "limpando", paused: "pausado", returning: "retornando", idle: "parado", error: "erro" };
  // Aspirador (fora do contrato de cômodos): só existe no modo real com comandos.json (alvos e regras do aspirador).
  function cartaoAspirador(sala, regras, E) {
    const alvos = regras.alvos || {}, eid = alvos.aspirador;
    if (!eid) return null;
    const e = E[eid], at = (e && e.attributes) || {}, indisp = indisponivel(e);
    const estado = indisp ? "" : String(e.state).toLowerCase();
    const modoE = alvos.aspirador_modo ? E[alvos.aspirador_modo] : null;
    const b = lerNumero(at.battery_level);
    return {
      chave: `${sala.id}.aspirador`, sala: sala.id, id: "aspirador", entityId: eid, nome: "Aspirador", tipo: "vacuum", real: true,
      indisp, on: false, sensor: false, info: true, estado, vst: indisp ? "" : ESTADO_ASPIRADOR[estado] || "outro", dominio: "vacuum",
      txtOk: null, txtAlerta: null, desde: indisp && !e ? null : instante(e && e.last_changed),
      bat: b == null || b < 0 || b > 100 ? null : Math.round(b), temBat: true, batEntityId: null,
      modo: modoE && !indisponivel(modoE) ? String(modoE.state) : null,
      modoOpcoes: modoE && modoE.attributes && Array.isArray(modoE.attributes.options) ? modoE.attributes.options.filter((x) => typeof x === "string") : null,
    };
  }

  function estadoReal(contrato, estados, regras) {
    const E = estados || {};
    const todos = (contrato.comodos || []).flatMap((c) => c.dispositivos || []);
    const baterias = [], offline = [], cameras = [], foraDeCena = [];
    const referenciadas = new Set(todos.map((d) => d.batteryEntityId).filter(Boolean));
    const salas = (contrato.comodos || []).map((c) => {
      const sala = { id: c.id, nome: c.nome, icone: ICONE_SALA[c.id] || "room", cartoes: [], temperatura: null, umidade: null, temSensorTemp: false, temSensorUmid: false, leitura: "" };
      for (const d of c.dispositivos || []) {
        const e = E[d.entityId];
        const at = (e && e.attributes) || {};
        const tipo = tipoCartao(d, at);
        let icone = tipo;
        if (d.dominio === "sensor") {
          if (ehBateria(d, at)) {   // a bateria entra pelo aparelho dono (batteryEntityId); só vira item próprio se ninguém a referencia
            if (!referenciadas.has(d.entityId)) baterias.push({ chave: `${c.id}.${d.id}`, nome: d.nome, local: c.nome, tipo: "plug", bat: lerBateria(e) });
            continue;
          }
          if (at.device_class === "temperature" || d.unidade === "°C") {
            sala.temSensorTemp = true; sala.temperatura = indisponivel(e) ? null : lerNumero(e.state); icone = "cloud";
          } else if (at.device_class === "humidity" || (d.unidade === "%" && /umid/i.test(d.nome))) {
            sala.temSensorUmid = true; sala.umidade = indisponivel(e) ? null : lerNumero(e.state); icone = "cloud";
          } else { icone = "bolt"; foraDeCena.push({ entityId: d.entityId, nome: d.nome, motivo: d.unidade === "W" ? "energia" : "sem cartão" }); }
        } else if (!tipo) { icone = "plug"; foraDeCena.push({ entityId: d.entityId, nome: d.nome, motivo: "sem cartão" }); }
        let card = null;
        if (tipo === "camera") cameras.push({ chave: `${c.id}.${d.id}`, nome: d.nome, indisp: indisponivel(e) });
        else if (tipo) {
          const nuvem = tipo === "tv" && regras && regras.alvos && regras.alvos.tv_nuvem ? ((E[regras.alvos.tv_nuvem] || {}).attributes || null) : null;
          card = cartao(sala, d, e, tipo, nuvem);
          if (d.batteryEntityId) card.bat = lerBateria(E[d.batteryEntityId]);
          sala.cartoes.push(card);
        }
        if (d.batteryEntityId) {
          const rot = tipo ? d.nome : icone === "cloud" ? "Sensor de temperatura e umidade" : d.nome;
          baterias.push({ chave: `${c.id}.${d.id}`, nome: rot, local: c.nome, tipo: icone || "plug", bat: lerBateria(E[d.batteryEntityId]) });
        }
        if (indisponivel(e)) {
          offline.push({
            chave: `${c.id}.${d.id}`, nome: d.nome, local: c.nome, tipo: icone || "plug", desde: e ? instante(e.last_changed) : null,
            verbo: "Fora do ar", acao: e === null ? "A Home Assistant não tem esta entidade" : "Conferir a energia e a conexão",
          });
        }
      }
      const partes = [];
      if (sala.temSensorTemp) partes.push(sala.temperatura == null ? "—°" : `${fmt(sala.temperatura)}°`);
      if (sala.temSensorUmid) partes.push(sala.umidade == null ? "—%" : `${Math.round(sala.umidade)}%`);
      sala.leitura = partes.join(" · ");
      return sala;
    });
    if (regras && regras.dispositivos && regras.dispositivos.aspirador && salas.length) {
      const sala = salas.find((x) => x.id === "closet") || salas[salas.length - 1];
      const a = cartaoAspirador(sala, regras, E);
      if (a) {
        sala.cartoes.push(a);
        baterias.push({ chave: a.chave, nome: a.nome, local: sala.nome, tipo: "vacuum", bat: a.bat, aspirador: true, naBase: a.vst === "base" });
        if (a.indisp) offline.push({ chave: a.chave, nome: a.nome, local: sala.nome, tipo: "vacuum", desde: a.desde, verbo: "Fora do ar", acao: E[a.entityId] === null ? "A Home Assistant não tem esta entidade" : "Conferir a energia e a conexão" });
      }
    }
    offline.sort((a, b) => (a.desde == null) - (b.desde == null) || (a.desde ?? 0) - (b.desde ?? 0));   // fora do ar há mais tempo primeiro
    const cenas = ORDEM_CENAS.filter((k) => (contrato.cenas || []).some((c) => c.chave === k) && CENAS[k])
      .map((k) => ({ id: k, nome: CENAS[k].nome, desc: regras && regras.dispositivos ? "Toque para executar" : "Somente leitura", icone: CENAS[k].icone, liga: [], disp: "cena_" + k }));
    return { salas, baterias, offline, cameras, cenas, foraDeCena };
  }

  /* ---------- Comandos (fase B): puro; nada aqui toca rede nem DOM ---------- */
  const TEM = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  // Regras = comandos.json (a MESMA lista de permissão do carregador). Inválido/ausente = null = somente leitura.
  function validaRegras(r) {
    return r && typeof r === "object" && r.dispositivos && typeof r.dispositivos === "object" && !Array.isArray(r.dispositivos) ? r : null;
  }
  function acaoRegra(regras, dispositivo, acao) {
    const d = regras && TEM(regras.dispositivos, dispositivo) ? regras.dispositivos[dispositivo] : null;
    return d && TEM(d.acoes, acao) ? d.acoes[acao] : null;
  }
  // Espelha o "somenteSe" do carregador (que continua sendo quem decide); aqui só evita pedir o que sabemos ser recusado.
  function somenteSeOk(regra, estado) {
    const s = regra && regra.somenteSe;
    if (!s) return true;
    if (Array.isArray(s.estadoEm) && !s.estadoEm.includes(estado)) return false;
    if (Array.isArray(s.estadoNaoEm) && s.estadoNaoEm.includes(estado)) return false;
    return true;
  }
  // Toque curto: que ação alterna este cartão agora? null = nenhuma disponível.
  function escolherAcaoToque(card, regras) {
    if (!card || card.indisp || card.sensor || card.info) return null;
    const cand = card.on ? ["desligar", "repouso"] : ["ligar"];
    if (card.tipo === "console" && card.estado === "idle") cand.push("ligar");   // acordado e sem jogo: "ligar" ainda vale
    for (const a of cand) {
      const r = acaoRegra(regras, card.id, a);
      if (r && somenteSeOk(r, card.estado)) return a;
    }
    return null;
  }
  // Pode comandar agora? offline, carregando, sem dados, indisponível, sensor ou sem regra = não.
  function podeComandar(regras, ctx, card, acao) {
    if (!regras || !ctx || ctx.net !== "online" || ctx.recebeu === false) return false;
    if (!card || card.indisp || card.sensor) return false;
    return !!acaoRegra(regras, card.id, acao);
  }
  // Quanto o painel espera o estado REAL confirmar antes de reverter o valor otimista. Padrão 5 s; aparelhos lentos (TV, PS5)
  // declaram mais em comandos.json (`confirmaMs`), sempre limitado a 60 s. Valor inválido = padrão.
  const TRAVA_PADRAO_MS = 5000, TRAVA_MAX_MS = 60000;
  function confirmaMsDaAcao(regras, dispositivo, acao) {
    const r = acaoRegra(regras, dispositivo, acao);
    const v = r && r.confirmaMs;
    return typeof v === "number" && Number.isFinite(v) && v > TRAVA_PADRAO_MS ? Math.min(v, TRAVA_MAX_MS) : TRAVA_PADRAO_MS;
  }
  const textoConfirmacao = (regras, dispositivo, acao) => { const r = acaoRegra(regras, dispositivo, acao); return r && typeof r.confirmar === "string" ? r.confirmar : null; };

  // Conversões UI -> parâmetros da HA
  const VEL_PCT = [33, 66, 100];   // mesmos degraus do Painel Primário (FanControlCard): 1 Suave, 2 Médio, 3 Turbo
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const brilhoParaHa = (pct) => clamp(Math.round((lerNumero(pct) ?? 1) / 100 * 255), 1, 255);
  const volumeParaHa = (pct) => clamp(Math.round(lerNumero(pct) ?? 0), 0, 100) / 100;
  const velParaPct = (v) => VEL_PCT[clamp(Math.round(lerNumero(v) ?? 1), 1, 3) - 1];
  const COR_RGB = { ambar: [251, 191, 36], vermelho: [239, 68, 68], verde: [16, 185, 129], ciano: [56, 189, 248], violeta: [167, 139, 250] };
  const MODOS_ASPIRADOR = [["安静", "Silencioso"], ["标准", "Padrão"], ["中档", "Forte"], ["强力", "Turbo"]];
  // [comando, rótulo, nome acessível]: 3 colunas (Voltar ▲ Início / ◀ OK ▶ / Menu ▼ Parar / ⏪ Play ⏩ / Pausa)
  const BOTOES_REMOTO = [["KEY_RETURN", "Voltar", null], ["KEY_UP", "▲", "Cima"], ["KEY_HOME", "Início", null],
    ["KEY_LEFT", "◀", "Esquerda"], ["KEY_ENTER", "OK", null], ["KEY_RIGHT", "▶", "Direita"],
    ["KEY_MENU", "Menu", null], ["KEY_DOWN", "▼", "Baixo"], ["KEY_STOP", "Parar", null],
    ["KEY_REWIND", "⏪", "Retroceder"], ["KEY_PLAY", "Play", null], ["KEY_FF", "⏩", "Avançar"], ["KEY_PAUSE", "Pausa", null]];
  const DIRECOES_OK = ["forward", "reverse"];
  const FONTE_OK = /^[A-Za-z0-9 ._-]{1,32}$/;   // mesmo padrão do carregador para "fonte"
  // campo da folha -> {acao, params} (ou null se o campo não comanda)
  function comandoDoCampo(campo, valor) {
    switch (campo) {
      case "bri": return { acao: "ajustar", params: { brightness: brilhoParaHa(valor) } };
      case "temp": return { acao: "ajustar", params: { color_temp_kelvin: Math.round(lerNumero(valor) ?? 0) } };
      case "cor": return TEM(COR_RGB, valor) ? { acao: "ajustar", params: { rgb_color: COR_RGB[valor].slice() } } : null;
      case "vel": return { acao: "velocidade", params: { percentage: velParaPct(valor) } };
      case "dir": return DIRECOES_OK.includes(valor) ? { acao: "direcao", params: { direction: valor } } : null;
      case "osc": return { acao: "oscilar", params: { oscillating: !!valor } };
      case "vol": return { acao: "volume", params: { volume_level: volumeParaHa(valor) } };
      case "mudo": return { acao: "mudo", params: { is_volume_muted: !!valor } };
      case "app": return typeof valor === "string" && FONTE_OK.test(valor) ? { acao: "fonte", params: { source: valor } } : null;
      case "modo": return typeof valor === "string" ? { acao: "modo", params: { option: valor } } : null;
      default: return null;
    }
  }
  // O estado real confirma o valor esperado pela trava otimista? (tolerâncias absorvem arredondamentos da HA)
  const iguais = (campo, real, esperado) => {
    if (real == null || esperado == null) return false;
    switch (campo) {
      case "on": case "osc": case "mudo": return !!real === !!esperado;
      case "bri": case "vol": return Math.abs(real - esperado) <= 2;
      case "temp": return Math.abs(real - esperado) <= 150;
      default: return real === esperado;
    }
  };
  // Cor predefinida que corresponde a um rgb_color lido (ou null).
  const corDoRgb = (rgb) => {
    if (!Array.isArray(rgb) || rgb.length !== 3) return null;
    for (const k of Object.keys(COR_RGB)) if (COR_RGB[k].every((v, i) => Math.abs(v - rgb[i]) <= 6)) return k;
    return null;
  };

  // "Apagar/Acender luzes": só ações marcadas lote:true nas regras (luzes e interruptor de luz), do cômodo, que precisam mudar.
  const MAX_LOTE = 24;
  function itensLote(cartoes, ligar, regras) {
    const acao = ligar ? "ligar" : "desligar";
    const out = [];
    for (const c of cartoes || []) {
      if (!c || c.indisp || c.sensor || c.info) continue;
      const r = acaoRegra(regras, c.id, acao);
      if (!r || r.lote !== true) continue;
      if (ligar ? c.on : !c.on) continue;
      out.push({ dispositivo: c.id, acao });
    }
    return out.slice(0, MAX_LOTE);
  }
  const loteInverso = (itens) => (itens || []).map((i) => ({ dispositivo: i.dispositivo, acao: i.acao === "ligar" ? "desligar" : "ligar" }));
  // há luz comandável em lote neste cômodo? (o botão só existe se houver)
  const temLote = (cartoes, regras) => (cartoes || []).some((c) => c && !c.indisp && !c.sensor && !c.info && ["ligar", "desligar"].some((a) => { const r = acaoRegra(regras, c.id, a); return r && r.lote === true; }));

  const ERROS = {
    confirmacao_necessaria: "Confirmação necessária.", desconectado: "Sem conexão com a casa. Nada foi enviado.", sem_hass: "A Home Assistant não está disponível. Nada foi enviado.",
    dispositivo_nao_comandavel: "Este aparelho não aceita comandos pelo painel.", acao_nao_permitida: "Esta ação não é permitida para este aparelho.",
    parametro_nao_permitido: "Este ajuste não é permitido.", parametro_invalido: "Valor fora do permitido para este ajuste.", parametros_ausentes: "Faltou o valor do ajuste.",
    estado_nao_permite: "O aparelho não está num estado que permita isto agora.", estado_desconhecido: "Estado do aparelho desconhecido. Aguarde e tente de novo.",
    muitos_comandos: "Comandos demais em pouco tempo. Aguarde um instante.", lote_invalido: "Lote de comandos inválido.", item_recusado: "A casa recusou um dos itens. Nada foi enviado.",
    acao_fora_do_lote: "Só luzes entram em Apagar/Acender luzes.", falha_na_ha: "A casa não executou o comando.", timeout_sem_confirmacao: "Sem confirmação da casa — confira o estado.",
    pedido_invalido: "Pedido inválido.", alvo_desconhecido: "Aparelho sem destino configurado.", servico_invalido: "Ação inválida.", parametros_invalidos: "Ajuste inválido.",
  };
  const mensagemErro = (codigo) => (TEM(ERROS, codigo) ? ERROS[codigo] : "Não foi possível executar o comando.");

  /**
   * Cliente de comandos: monta {tipo:"comando"|"comando-lote", id, ...}, entrega pelo canal `postar` (só o pai recebe) e devolve
   * uma Promise do "resultado" com o mesmo id. Ids desconhecidos são ignorados. Se o resultado não vier em timeoutMs (~70 s,
   * além do limite do carregador) resolve como timeout_sem_confirmacao: o comando PODE ter sido aplicado. Nunca reenvia sozinho.
   */
  function criarCliente(o) {
    const postar = o.postar, setT = o.setTimeout || setTimeout, clearT = o.clearTimeout || clearTimeout, limite = o.timeoutMs || 70000;
    let seq = 0; const pend = new Map();
    function enviar(tipo, corpo) {
      return new Promise((resolve) => {
        const id = ++seq;
        const t = setT(() => { if (pend.delete(id)) resolve({ ok: false, erro: "timeout_sem_confirmacao" }); }, limite);
        pend.set(id, { resolve, t });
        postar(Object.assign({ tipo, id }, corpo));
      });
    }
    return {
      comandar(dispositivo, acao, params, op) {
        const corpo = { dispositivo, acao };
        if (params) corpo.params = params;
        if (op && op.confirmado === true) corpo.confirmado = true;
        return enviar("comando", corpo);
      },
      comandarLote(itens) { return enviar("comando-lote", { itens: (itens || []).map((i) => ({ dispositivo: i.dispositivo, acao: i.acao })) }); },
      receber(m) {
        if (!m || m.tipo !== "resultado" || !pend.has(m.id)) return false;
        const p = pend.get(m.id); pend.delete(m.id); clearT(p.t);
        const r = { ok: m.ok === true };
        for (const k of ["erro", "detalhe", "confirmar", "resultados"]) if (m[k] !== undefined) r[k] = m[k];
        p.resolve(r); return true;
      },
      pendentes: () => pend.size,
    };
  }

  /* ---------- Ponte com a HA (única parte com entrada/saída) ---------- */
  const versaoDaPagina = () => { const v = new URLSearchParams(window.location.search).get("v"); return v ? "?v=" + encodeURIComponent(v) : ""; };
  const ESPERA_SEM_DADOS_MS = 8000;
  // Kill-switch: ?leitura=1 na URL do painel OU da página que o hospeda (mesma origem), p.ex. /painel-secundario?leitura=1.
  function modoLeitura() {
    const tem = (s) => { try { return new URLSearchParams(s || "").get("leitura") === "1"; } catch { return false; } };
    let pai = false;
    try { pai = !!window.parent && window.parent !== window && tem(window.parent.location.search); } catch { /* pai de outra origem: ignora */ }
    return tem(window.location.search) || pai;
  }

  // aoContrato(contrato, regras|null, cliente|null) monta a interface; aoLote(msg) recebe cada lote de estados do carregador;
  // aoSemDados() se nada chegar em 8 s; aoFalha(erro) se o contrato não carregar (o painel segue no modo simulado).
  // regras/cliente nulos = somente leitura (?leitura=1, comandos.json ausente ou inválido): nenhuma mensagem de comando sai.
  function conectar(o) {
    let recebeu = false;
    const buscaRegras = () => (modoLeitura() ? Promise.resolve(null)
      : fetch("comandos.json" + versaoDaPagina(), { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).then(validaRegras).catch(() => null));
    fetch("contrato.json" + versaoDaPagina(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("contrato.json: HTTP " + r.status); return r.json(); })
      .then((c) => { if (!c || !Array.isArray(c.comodos)) throw new Error("contrato.json inválido"); return c; })
      .then((c) => buscaRegras().then((regras) => [c, regras]))
      .then(([c, regras]) => {
        const cliente = regras ? criarCliente({ postar: (m) => window.parent.postMessage(m, window.location.origin) }) : null;
        o.aoContrato(c, regras, cliente);
        window.addEventListener("message", (ev) => {
          if (ev.source !== window.parent || ev.origin !== window.location.origin) return;
          const m = ev.data;
          if (m && m.tipo === "resultado") { if (cliente) cliente.receber(m); return; }
          if (!m || m.tipo !== "casa-estados" || !m.estados || typeof m.estados !== "object") return;
          recebeu = true; o.aoLote(m);
        });
        window.parent.postMessage({ tipo: "painel-pronto" }, window.location.origin);
        setTimeout(() => { if (!recebeu) o.aoSemDados(); }, ESPERA_SEM_DADOS_MS);
      }, (e) => o.aoFalha(e));
  }

  g.CasaReal = {
    indisponivel, lerNumero, lerBateria, tipoCartao, estadoReal, conectar, ESPERA_SEM_DADOS_MS,
    validaRegras, acaoRegra, confirmaMsDaAcao, somenteSeOk, escolherAcaoToque, podeComandar, textoConfirmacao, brilhoParaHa, volumeParaHa, velParaPct, comandoDoCampo,
    iguais, corDoRgb, itensLote, loteInverso, temLote, mensagemErro, criarCliente, modoLeitura, COR_RGB, VEL_PCT, MODOS_ASPIRADOR, BOTOES_REMOTO, FONTE_OK, DIRECOES_OK,
  };
})(typeof window !== "undefined" ? window : globalThis);
