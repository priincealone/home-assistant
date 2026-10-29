/**
 * Painel Principal — Bridge WebComponent para Home Assistant
 * Roda INTEIRO dentro da HA: os arquivos do painel (dashboard-lab) ficam em /config/www/painel-secundario e são
 * servidos pela própria HA em /local/painel-secundario/ (iframe de mesma origem; sem porta 3011, sem PC do Node,
 * sem mixed content).
 *
 * Este carregador é o ÚNICO lado confiável (specs/features/painel-secundario-casa-real.md):
 *  - FASE A (leitura): recebe da HA o objeto `hass` (sessão do usuário logado — não há token para guardar) e
 *    repassa ao painel, por postMessage, só os estados das entidades de contrato.json, com atributos em lista de
 *    permissão.
 *  - FASE B (comandos): o painel pede {tipo:"comando"|"comando-lote", dispositivo, acao, params}; AQUI se resolve o
 *    entity_id **somente por comandos.json** (gerado do contrato + dashboard-lab/comandos-regras.json), se valida ação,
 *    parâmetros (tipo, faixa, enum, campos extras proibidos) e `somenteSe` (estado atual), e só então chama
 *    hass.callService. O painel nunca informa entity_id, domínio nem serviço. Sem fila e SEM reenvio ao reconectar
 *    (CLAUDE.md §13): com hass.connected falso o comando é recusado. Tudo o que não está em comandos.json é recusado.
 *
 * Mantenha-o PEQUENO e ESTÁVEL: /local é cacheado por 31 dias; mudar este arquivo exige subir o ?v= do module_url
 * em configuration.yaml e reiniciar a HA. As regras vivem em comandos.json (publicado com hash), a UI no painel.
 */

(function () {
  const BASE = "/local/painel-secundario/";
  const MAX_LOTE = 24;                 // itens por "Apagar/Acender tudo"
  const LIMITE_JANELA_MS = 2000;       // no máximo 12 comandos a cada 2 s
  const LIMITE_COMANDOS = 12;
  const TIMEOUT_PADRAO_MS = 20000;
  // Atributos que o painel pode ver (nada de entity_picture/tokens, nem atributos arbitrários).
  const ATRIBUTOS = [
    "friendly_name", "unit_of_measurement", "device_class", "brightness", "color_temp", "color_temp_kelvin", "rgb_color",
    "percentage", "oscillating", "preset_mode", "direction", "battery_level", "status", "fan_speed", "battery",
    "source", "source_list", "volume_level", "is_volume_muted", "media_title", "app_name", "options",
    "supported_color_modes", "min_color_temp_kelvin", "max_color_temp_kelvin",
  ];

  // ---- validação de parâmetros (função pura, também usada nos testes) ----
  function validarParam(spec, v) {
    switch (spec.tipo) {
      case "int": return Number.isInteger(v) && v >= spec.min && v <= spec.max;
      case "num": return typeof v === "number" && Number.isFinite(v) && v >= spec.min && v <= spec.max;
      case "bool": return typeof v === "boolean";
      case "enum": return Array.isArray(spec.valores) && spec.valores.includes(v);
      case "rgb": return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
      case "texto": {
        if (typeof v !== "string" || v.length < 1 || v.length > (spec.max || 64)) return false;
        return spec.padrao ? new RegExp(spec.padrao).test(v) : true;
      }
      default: return false;
    }
  }

  class CasaPainelSecundario extends HTMLElement {
    constructor() {
      super();
      this._permitidas = new Set();
      this._comandos = { alvos: {}, dispositivos: {} };
      this._ultimos = new Map();   // entity_id -> assinatura do último estado enviado
      this._pronto = false;        // o painel avisou que já escuta mensagens
      this._hass = null;
      this._timer = null;
      this._recentes = [];         // carimbos dos últimos comandos (limite de taxa)
      this._onMsg = this._onMsg.bind(this);
    }

    // A HA define `hass` a cada mudança de estado: só coalescemos e enviamos o que mudou.
    set hass(h) {
      this._hass = h;
      this._agendar();
    }
    get hass() { return this._hass; }

    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;
      window.addEventListener("message", this._onMsg);

      // Ocupa só a área que a HA reserva ao painel; o recuo do topo vem da área segura (o iframe não a enxerga).
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      this.style.height = "100vh";
      this.style.height = "100dvh";
      this.style.boxSizing = "border-box";
      this.style.paddingTop = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))";
      this.style.overflow = "hidden";
      this.style.background = "#07090e";

      this._abrir();
    }

    disconnectedCallback() {
      window.removeEventListener("message", this._onMsg);
      clearTimeout(this._timer);
    }

    _aviso(texto) {
      this.innerHTML = "";
      const p = document.createElement("p");
      p.style.cssText = "margin:0;padding:24px;color:#f1f5f9;font:14px/1.5 sans-serif";
      p.textContent = texto;
      this.appendChild(p);
    }

    async _abrir() {
      let versao;
      try {
        const r = await fetch(`${BASE}versao.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`versao.json: HTTP ${r.status}`);
        versao = (await r.json()).versao;
        // Contrato = quais estados repassar; comandos.json = o que pode ser comandado. Sem eles, nada é repassado/comandado.
        const c = await fetch(`${BASE}contrato.json?v=${encodeURIComponent(versao)}`, { cache: "no-store" });
        if (c.ok) this._permitidas = new Set((await c.json()).entidades || []);
        else console.warn("[Painel Principal] contrato.json indisponível: nenhum estado será repassado");
        const k = await fetch(`${BASE}comandos.json?v=${encodeURIComponent(versao)}`, { cache: "no-store" });
        if (k.ok) this._comandos = await k.json();
        else console.warn("[Painel Principal] comandos.json indisponível: nenhum comando será aceito");
      } catch (e) {
        this._aviso("Painel Principal não publicado. Rode: node scripts/manutencao/publicar_painel_secundario.mjs");
        console.warn("[Painel Principal]", e);
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.src = `${BASE}index.html?v=${encodeURIComponent(versao)}`;
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      iframe.setAttribute("allow", "fullscreen; clipboard-read; clipboard-write");
      iframe.setAttribute("title", "Painel Principal");
      this._iframe = iframe;

      this.innerHTML = "";
      this.appendChild(iframe);
    }

    // Mensagens aceitas do painel: "painel-pronto", "comando" e "comando-lote". Qualquer outra é descartada.
    _onMsg(ev) {
      if (!this._iframe || ev.source !== this._iframe.contentWindow || ev.origin !== window.location.origin) return;
      const m = ev.data;
      if (!m || typeof m !== "object") return;
      if (m.tipo === "painel-pronto") {
        this._pronto = true;
        this._ultimos.clear();
        this._enviar(true);
      } else if (m.tipo === "comando") {
        this._comandar(m);
      } else if (m.tipo === "comando-lote") {
        this._comandarLote(m);
      }
    }

    _responder(id, corpo) {
      if (!this._iframe || !this._iframe.contentWindow) return;
      this._iframe.contentWindow.postMessage({ tipo: "resultado", id, ...corpo }, window.location.origin);
    }

    // Resolve e valida um item: devolve {erro} ou {dominio, servico, dados, entityId, timeoutMs}. NÃO executa.
    _preparar(item, comConfirmacao) {
      const h = this._hass;
      if (!h) return { erro: "sem_hass" };
      if (h.connected === false) return { erro: "desconectado" };
      if (!item || typeof item.dispositivo !== "string" || typeof item.acao !== "string") return { erro: "pedido_invalido" };
      const d = Object.prototype.hasOwnProperty.call(this._comandos.dispositivos || {}, item.dispositivo) ? this._comandos.dispositivos[item.dispositivo] : null;
      if (!d) return { erro: "dispositivo_nao_comandavel" };
      const a = Object.prototype.hasOwnProperty.call(d.acoes || {}, item.acao) ? d.acoes[item.acao] : null;
      if (!a) return { erro: "acao_nao_permitida" };
      const entityId = a.alvo ? (this._comandos.alvos || {})[a.alvo] : d.entityId;
      if (!entityId || typeof entityId !== "string") return { erro: "alvo_desconhecido" };
      const [dominio, servico, resto] = String(a.servico).split(".");
      if (!dominio || !servico || resto !== undefined) return { erro: "servico_invalido" };

      // parâmetros: só os declarados, cada um validado; campos extras são recusados (inclui entity_id)
      const params = item.params === undefined || item.params === null ? {} : item.params;
      if (typeof params !== "object" || Array.isArray(params)) return { erro: "parametros_invalidos" };
      const spec = a.params || {};
      for (const k of Object.keys(params)) {
        if (!Object.prototype.hasOwnProperty.call(spec, k)) return { erro: "parametro_nao_permitido", detalhe: k };
        if (!validarParam(spec[k], params[k])) return { erro: "parametro_invalido", detalhe: k };
      }
      if (Object.keys(spec).length && !Object.keys(params).length && !a.opcional) {
        // ações com parâmetros declarados exigem ao menos um (ex.: "ajustar" sem nada é inútil e ambíguo)
        return { erro: "parametros_ausentes" };
      }

      // condição de estado atual (ex.: TV só desliga se estiver ligada — a tecla POWER alterna, CLAUDE.md §11.3)
      if (a.somenteSe) {
        const s = h.states && h.states[d.entityId];
        const estado = s ? s.state : undefined;
        if (estado === undefined) return { erro: "estado_desconhecido" };
        if (Array.isArray(a.somenteSe.estadoEm) && !a.somenteSe.estadoEm.includes(estado)) return { erro: "estado_nao_permite", detalhe: estado };
        if (Array.isArray(a.somenteSe.estadoNaoEm) && a.somenteSe.estadoNaoEm.includes(estado)) return { erro: "estado_nao_permite", detalhe: estado };
      }

      // confirmação obrigatória (o painel mostra o texto e reenvia com confirmado:true)
      if (a.confirmar && comConfirmacao !== true) return { erro: "confirmacao_necessaria", confirmar: a.confirmar };

      return {
        dominio, servico, entityId,
        dados: { ...(a.fixos || {}), ...params, entity_id: entityId },
        timeoutMs: Number.isFinite(a.timeoutMs) ? a.timeoutMs : TIMEOUT_PADRAO_MS,
        lote: a.lote === true,
      };
    }

    _taxaOk(n) {
      const agora = Date.now();
      this._recentes = this._recentes.filter((t) => agora - t < LIMITE_JANELA_MS);
      if (this._recentes.length + n > LIMITE_COMANDOS && n <= LIMITE_COMANDOS) return false;
      for (let i = 0; i < Math.min(n, LIMITE_COMANDOS); i++) this._recentes.push(agora);
      return true;
    }

    async _executar(p) {
      let timer;
      const limite = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), p.timeoutMs); });
      try {
        await Promise.race([this._hass.callService(p.dominio, p.servico, p.dados), limite]);
        return { ok: true };
      } catch (e) {
        const msg = e && e.message ? String(e.message).slice(0, 200) : "falha";
        // timeout = resultado desconhecido (o comando pode ter sido aplicado): o painel deve reler o estado, não presumir
        return { ok: false, erro: msg === "timeout" ? "timeout_sem_confirmacao" : "falha_na_ha", detalhe: msg };
      } finally { clearTimeout(timer); }
    }

    async _comandar(m) {
      const p = this._preparar(m, m.confirmado);
      if (p.erro) { this._responder(m.id, { ok: false, ...p }); return; }
      if (!this._taxaOk(1)) { this._responder(m.id, { ok: false, erro: "muitos_comandos" }); return; }
      console.info(`[Painel Principal] comando ${m.dispositivo}.${m.acao} → ${p.dominio}.${p.servico} ${p.entityId}`);
      this._responder(m.id, await this._executar(p));
    }

    // "Apagar/Acender tudo": só ações marcadas com lote:true nas regras; todas validadas ANTES de executar qualquer uma.
    async _comandarLote(m) {
      const itens = Array.isArray(m.itens) ? m.itens : null;
      if (!itens || itens.length < 1 || itens.length > MAX_LOTE) { this._responder(m.id, { ok: false, erro: "lote_invalido" }); return; }
      const preparados = [];
      for (const it of itens) {
        const p = this._preparar(it, true);
        if (p.erro) { this._responder(m.id, { ok: false, erro: "item_recusado", detalhe: `${it && it.dispositivo}: ${p.erro}` }); return; }
        if (!p.lote) { this._responder(m.id, { ok: false, erro: "acao_fora_do_lote", detalhe: `${it.dispositivo}.${it.acao}` }); return; }
        preparados.push(p);
      }
      if (!this._taxaOk(1)) { this._responder(m.id, { ok: false, erro: "muitos_comandos" }); return; }
      console.info(`[Painel Principal] lote de ${preparados.length} comandos`);
      const resultados = await Promise.all(preparados.map((p) => this._executar(p)));
      this._responder(m.id, { ok: resultados.every((r) => r.ok), resultados });
    }

    _agendar() {
      if (!this._pronto || this._timer) return;
      this._timer = setTimeout(() => { this._timer = null; this._enviar(false); }, 120);
    }

    _enviar(completo) {
      const h = this._hass;
      if (!this._pronto || !h || !this._iframe || !this._iframe.contentWindow) return;
      const mudou = {};
      for (const id of this._permitidas) {
        const s = h.states && h.states[id];
        const assinatura = s ? `${s.state}|${s.last_updated}` : "ausente";
        if (!completo && this._ultimos.get(id) === assinatura) continue;
        this._ultimos.set(id, assinatura);
        if (!s) { mudou[id] = null; continue; }   // entidade do contrato que a HA não tem: o painel mostra "Indisponível"
        const attrs = {};
        for (const a of ATRIBUTOS) if (s.attributes && s.attributes[a] !== undefined) attrs[a] = s.attributes[a];
        mudou[id] = { state: s.state, last_changed: s.last_changed, last_updated: s.last_updated, attributes: attrs };
      }
      const conectado = h.connected !== false;
      if (!completo && !Object.keys(mudou).length && this._conectado === conectado) return;
      this._conectado = conectado;
      this._iframe.contentWindow.postMessage({ tipo: "casa-estados", completo, conectado, estados: mudou }, window.location.origin);
    }
  }

  if (!customElements.get("casa-painel-secundario")) {
    customElements.define("casa-painel-secundario", CasaPainelSecundario);
  }
})();
