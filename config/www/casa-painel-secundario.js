/**
 * Painel Secundário — Bridge WebComponent para Home Assistant
 * Roda INTEIRO dentro da HA: os arquivos do painel (dashboard-lab) ficam em /config/www/painel-secundario e são
 * servidos pela própria HA em /local/painel-secundario/ (iframe de mesma origem; sem porta 3011, sem PC do Node,
 * sem mixed content).
 *
 * FASE A (somente leitura, specs/features/painel-secundario-casa-real.md): este carregador recebe da HA o objeto
 * `hass` (a sessão do usuário logado — não há token para guardar) e REPASSA ao painel, por postMessage, apenas os
 * estados das entidades listadas em contrato.json (gerado de dashboard-app/lib/rooms.ts), com atributos em lista
 * de permissão. NÃO existe caminho de comando: este arquivo não chama serviços da HA e ignora qualquer mensagem do
 * painel que não seja "painel-pronto". (Comandos serão a fase B, só com aprovação do André.)
 *
 * Mantenha-o PEQUENO e ESTÁVEL: /local é cacheado por 31 dias; mudar este arquivo exige subir o ?v= do module_url
 * em configuration.yaml e reiniciar a HA. A lógica do painel vive nos arquivos publicados com hash.
 */

(function () {
  const BASE = "/local/painel-secundario/";
  // Atributos que o painel pode ver (nada de entity_picture/tokens, nem atributos arbitrários).
  const ATRIBUTOS = [
    "friendly_name", "unit_of_measurement", "device_class", "brightness", "color_temp", "color_temp_kelvin", "rgb_color",
    "percentage", "oscillating", "preset_mode", "battery_level", "status", "fan_speed", "battery",
    "source", "volume_level", "is_volume_muted", "media_title", "app_name",
  ];

  class CasaPainelSecundario extends HTMLElement {
    constructor() {
      super();
      this._permitidas = new Set();
      this._ultimos = new Map();   // entity_id -> assinatura do último estado enviado
      this._pronto = false;        // o painel avisou que já escuta mensagens
      this._hass = null;
      this._timer = null;
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
        // O contrato é a lista de permissão: sem ele, nada é repassado (o painel fica no modo simulado).
        const c = await fetch(`${BASE}contrato.json?v=${encodeURIComponent(versao)}`, { cache: "no-store" });
        if (c.ok) this._permitidas = new Set((await c.json()).entidades || []);
        else console.warn("[Painel Secundário] contrato.json indisponível: nenhum estado será repassado");
      } catch (e) {
        this._aviso("Painel Secundário não publicado. Rode: node scripts/manutencao/publicar_painel_secundario.mjs");
        console.warn("[Painel Secundário]", e);
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.src = `${BASE}index.html?v=${encodeURIComponent(versao)}`;
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      iframe.setAttribute("allow", "fullscreen; clipboard-read; clipboard-write");
      iframe.setAttribute("title", "Painel Secundário");
      this._iframe = iframe;

      this.innerHTML = "";
      this.appendChild(iframe);
    }

    // Só uma mensagem é aceita do painel: "painel-pronto" (pede o lote inicial). Qualquer outra é descartada.
    _onMsg(ev) {
      if (!this._iframe || ev.source !== this._iframe.contentWindow || ev.origin !== window.location.origin) return;
      if (!ev.data || ev.data.tipo !== "painel-pronto") return;
      this._pronto = true;
      this._ultimos.clear();
      this._enviar(true);
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
