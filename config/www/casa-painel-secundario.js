/**
 * Painel Secundário — Bridge WebComponent para Home Assistant
 * Roda INTEIRO dentro da HA: os arquivos do painel (dashboard-lab) ficam em /config/www/painel-secundario e são
 * servidos pela própria HA em /local/painel-secundario/. Sem porta 3011, sem o PC do Node e sem mixed content
 * (mesma origem da HA, HTTP ou HTTPS). Dados simulados: o painel não fala com a HA e não aciona a casa.
 *
 * Este módulo é só um carregador estável: lê versao.json (com carimbo de tempo, que fura o cache de 31 dias de /local)
 * e abre index.html?v=<versão>. Atualizar o painel = rodar scripts/manutencao/publicar_painel_secundario.mjs;
 * não exige reiniciar a HA nem mudar este arquivo.
 */

(function () {
  const BASE = "/local/painel-secundario/";

  class CasaPainelSecundario extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

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

    async _abrir() {
      let versao = String(Date.now());
      try {
        const r = await fetch(`${BASE}versao.json?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok) versao = (await r.json()).versao || versao;
        else throw new Error(`versao.json: HTTP ${r.status}`);
      } catch (e) {
        this.innerHTML = "";
        const aviso = document.createElement("p");
        aviso.style.cssText = "margin:0;padding:24px;color:#f1f5f9;font:14px/1.5 sans-serif";
        aviso.textContent = "Painel Secundário não publicado. Rode: node scripts/manutencao/publicar_painel_secundario.mjs";
        this.appendChild(aviso);
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

      this.innerHTML = "";
      this.appendChild(iframe);
    }
  }

  if (!customElements.get("casa-painel-secundario")) {
    customElements.define("casa-painel-secundario", CasaPainelSecundario);
  }
})();
