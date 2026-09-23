/**
 * Casa Inteligente — Bridge WebComponent para Home Assistant
 * Permite renderizar o dashboard Next.js (dashboard-app) nativamente no Home Assistant
 * com resolução dinâmica de host (localhost, LAN ou Tailscale) e atualização imediata em 0ms.
 */

(function () {
  function getDashboardUrl(customPort) {
    const protocol = window.location.protocol || "http:";
    const host = window.location.hostname || "localhost";
    const port = customPort || "3002";
    return `${protocol}//${host}:${port}`;
  }

  // 1. Painel Nativo da Barra Lateral (panel_custom -> <casa-panel>)
  class CasaPanel extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const targetUrl = getDashboardUrl();
      console.log(`[Casa Dashboard] Painel lateral conectando a: ${targetUrl}`);

      this.style.display = "block";
      this.style.position = "absolute";
      this.style.top = "0";
      this.style.left = "0";
      this.style.right = "0";
      this.style.bottom = "0";
      this.style.width = "100%";
      this.style.height = "100%";
      this.style.overflow = "hidden";
      this.style.background = "#07090e";

      const iframe = document.createElement("iframe");
      iframe.src = targetUrl;
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      iframe.setAttribute("allow", "fullscreen; autoplay; camera; microphone; display-capture; clipboard-read; clipboard-write");
      iframe.setAttribute("title", "Casa Inteligente Dashboard");

      this.innerHTML = "";
      this.appendChild(iframe);
    }
  }

  if (!customElements.get("casa-panel")) {
    customElements.define("casa-panel", CasaPanel);
  }

  // 2. Card para Dashboards Lovelace (<casa-dashboard-card>)
  class CasaDashboardCard extends HTMLElement {
    setConfig(config) {
      this._config = config || {};
    }

    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const port = this._config?.port || "3002";
      const targetUrl = getDashboardUrl(port);
      console.log(`[Casa Dashboard] Card Lovelace conectando a: ${targetUrl}`);

      this.style.display = "block";
      this.style.width = "100%";
      this.style.height = "calc(100vh - var(--header-height, 56px))";
      this.style.margin = "0";
      this.style.padding = "0";
      this.style.overflow = "hidden";
      this.style.background = "#07090e";

      const iframe = document.createElement("iframe");
      iframe.src = targetUrl;
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      iframe.setAttribute("allow", "fullscreen; autoplay; camera; microphone; display-capture; clipboard-read; clipboard-write");
      iframe.setAttribute("title", "Casa Inteligente Dashboard");

      this.innerHTML = "";
      this.appendChild(iframe);
    }

    getCardSize() {
      return 10;
    }
  }

  if (!customElements.get("casa-dashboard-card")) {
    customElements.define("casa-dashboard-card", CasaDashboardCard);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "casa-dashboard-card")) {
    window.customCards.push({
      type: "casa-dashboard-card",
      name: "Casa Dashboard Card",
      description: "Embeds the live Casa Next.js dashboard seamlessly at full viewport height.",
    });
  }
})();
