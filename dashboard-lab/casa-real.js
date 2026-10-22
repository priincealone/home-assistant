// Painel Secundário, modo real SOMENTE LEITURA (fase A, specs/features/painel-secundario-casa-real.md).
// Dois blocos neste arquivo:
//  1) ADAPTADOR PURO (estadoReal e auxiliares): contrato.json + estados recebidos -> modelo que a interface já sabe desenhar.
//     Não toca no DOM nem na rede; é o que os testes exercitam.
//  2) PONTE (conectar): a ÚNICA parte que faz entrada/saída. Carrega contrato.json (único acesso de rede do painel), escuta
//     mensagens "casa-estados" vindas do carregador (window.parent, mesma origem) e avisa "painel-pronto" uma única vez.
//     Não existe caminho de comando: nenhuma outra mensagem é enviada e nenhum serviço da HA é chamado (fase B não autorizada).
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
  function cartao(sala, d, e, tipo) {
    const at = (e && e.attributes) || {};
    const indisp = indisponivel(e);
    const sensor = tipo === "door" || tipo === "motion";
    const estado = indisp ? "" : String(e.state).toLowerCase();
    const on = indisp ? false : d.dominio === "media_player" ? ligadoMedia(estado) : estado === "on";
    const pct = lerNumero(at.percentage);
    const vol = lerNumero(at.volume_level);
    return {
      chave: `${sala.id}.${d.id}`, sala: sala.id, id: d.id, entityId: d.entityId, nome: d.nome, tipo, real: true,
      indisp, on, sensor, info: false,
      txtOk: tipo === "door" ? "Fechada" : tipo === "motion" ? "Sem movimento" : null,
      txtAlerta: tipo === "door" ? "Aberta" : tipo === "motion" ? "Movimento" : null,
      desde: indisp && !e ? null : instante(e && e.last_changed),
      bri: on && (tipo === "light" || tipo === "led") ? pct255(at.brightness) : null,
      temp: on ? kelvin(at) : null,
      pct: tipo === "fan" && on && pct != null ? Math.round(pct) : null,
      vel: tipo === "fan" && on && pct != null ? (pct <= 34 ? 1 : pct <= 67 ? 2 : 3) : null,
      osc: tipo === "fan" && typeof at.oscillating === "boolean" ? at.oscillating : null,
      vol: tipo === "tv" && vol != null ? Math.round(vol * 100) : null,
      mudo: tipo === "tv" && typeof at.is_volume_muted === "boolean" ? at.is_volume_muted : null,
      app: tipo === "tv" ? (at.source || at.app_name || null) : null,
      subOn: tipo === "console" ? (at.app_name || at.media_title || null) : null,
      dimmer: d.dominio !== "light" ? false : !on ? null : pct255(at.brightness) != null,   // null = ainda não dá para saber
      temBat: !!d.batteryEntityId, batEntityId: d.batteryEntityId || null, bat: null,
    };
  }

  const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

  /**
   * Modelo da casa a partir do contrato e dos estados recebidos (mapa entity_id -> {state,last_changed,attributes}|null).
   * Devolve { salas[{id,nome,icone,cartoes[],temperatura,umidade,temSensorTemp,temSensorUmid,leitura}], baterias[], offline[],
   *           cameras[], cenas[], foraDeCena[] }. Não inventa cartão para o que a interface não sabe mostrar (foraDeCena).
   */
  function estadoReal(contrato, estados) {
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
          card = cartao(sala, d, e, tipo);
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
    offline.sort((a, b) => (a.desde == null) - (b.desde == null) || (a.desde ?? 0) - (b.desde ?? 0));   // fora do ar há mais tempo primeiro
    const cenas = ORDEM_CENAS.filter((k) => (contrato.cenas || []).some((c) => c.chave === k) && CENAS[k])
      .map((k) => ({ id: k, nome: CENAS[k].nome, desc: "Somente leitura", icone: CENAS[k].icone, liga: [] }));
    return { salas, baterias, offline, cameras, cenas, foraDeCena };
  }

  /* ---------- Ponte com a HA (única parte com entrada/saída) ---------- */
  const versaoDaPagina = () => { const v = new URLSearchParams(window.location.search).get("v"); return v ? "?v=" + encodeURIComponent(v) : ""; };
  const ESPERA_SEM_DADOS_MS = 8000;

  // aoContrato(contrato) monta a interface; aoLote(msg) recebe cada mensagem do carregador; aoSemDados() se nada chegar em 8 s;
  // aoFalha(erro) se o contrato não carregar (o painel segue no modo simulado).
  function conectar(o) {
    let recebeu = false;
    fetch("contrato.json" + versaoDaPagina(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("contrato.json: HTTP " + r.status); return r.json(); })
      .then((c) => { if (!c || !Array.isArray(c.comodos)) throw new Error("contrato.json inválido"); return c; })
      .then((c) => {
        o.aoContrato(c);
        window.addEventListener("message", (ev) => {
          if (ev.source !== window.parent || ev.origin !== window.location.origin) return;
          const m = ev.data;
          if (!m || m.tipo !== "casa-estados" || !m.estados || typeof m.estados !== "object") return;
          recebeu = true; o.aoLote(m);
        });
        window.parent.postMessage({ tipo: "painel-pronto" }, window.location.origin);   // única mensagem que o painel envia
        setTimeout(() => { if (!recebeu) o.aoSemDados(); }, ESPERA_SEM_DADOS_MS);
      }, (e) => o.aoFalha(e));
  }

  g.CasaReal = { indisponivel, lerNumero, lerBateria, tipoCartao, estadoReal, conectar, ESPERA_SEM_DADOS_MS };
})(typeof window !== "undefined" ? window : globalThis);
