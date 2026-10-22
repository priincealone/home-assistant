/**
 * Painel Secundário — Bridge WebComponent para Home Assistant
 * Mostra o painel paralelo de estudo (dashboard-lab, porta 3011, dados simulados) na barra lateral da HA.
 * Mesmo molde do casa-panel.js (Painel Primário, porta 3002): resolve o host pelo endereço em que a HA
 * foi aberta (localhost, LAN ou Tailscale). O Painel Secundário não fala com a HA e não aciona a casa.
 */

(function () {
  const PORTA = "3011";

  class CasaPainelSecundario extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const protocolo = window.location.protocol || "http:";
      const host = window.location.hostname || "localhost";
      const alvo = `${protocolo}//${host}:${PORTA}`;

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

      const iframe = document.createElement("iframe");
      iframe.src = alvo;
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
