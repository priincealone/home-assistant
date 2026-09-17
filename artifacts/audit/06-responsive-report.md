# Relatório de Responsividade e Adaptação Multiplataforma (06-responsive-report.md)

**Documento**: `artifacts/audit/06-responsive-report.md`  
**Escopo**: Matriz de 17 resoluções (320px a 3440px), safe-areas e orientação  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Resumo da Matriz de 17 Resoluções

* **Smartphones Retrato (320x568, 360x800, 390x844, 430x932)**:
  - Grade de 2 colunas com altura de card variando proporcionalmente entre 148px e 203px.
  - **Zero vazamento horizontal** (`overflow-x: 0px`).
* **Smartphones Paisagem (568x320, 800x360, 932x430)**:
  - Transição fluida para 3 ou 4 colunas; cabeçalho e widgets consomem até 45% da altura inicial.
* **Tablets Retrato (768x1024, 820x1180)**:
  - 3 colunas de cômodos em 100dvh sem rolagem vertical.
* **Tablets Paisagem / Wall-Mounts (1024x768, 1180x820)**:
  - **Regra do 1º Viewport Cumprida**: Visão de todos os 10 cômodos e 5 widgets em landscape sem rolagem vertical.
* **Desktops e Ultrawides (1280x720 até 3440x1440)**:
  - Contenção em `max-width: 1720px` centralizada com margens automáticas, evitando quebra da visão panorâmica.

---

## 2. Alertas e Falhas Responsivas

1. **Alvos Táteis Inferiores a 44px (`RSP-001` / `RSP-002`)**:
   - `.security-micro-pill`: 36px (anulado pela linha 7201 do CSS).
   - `.tv-compact-power`: 34px × 34px.
2. **Sticky Hover (`UX-002`)**:
   - 118 regras `:hover` disparam em telas táteis e mantêm o estado aceso após soltar o dedo.
3. **Dispersão de Breakpoints**:
   - 32 blocos `@media` declarados no CSS que requerem consolidação na matriz canônica de 7 faixas.
