# Relatório de Segurança da Interface e Borda (09-security-ui-report.md)

**Documento**: `artifacts/audit/09-security-ui-report.md`  
**Escopo**: Superfície de exposição da porta 3002 e proteção de dados e hardware  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Achados de Segurança Priorizados

1. **Achado A-01 (Crítico - `SEC-001`) · Ausência Universal de Autenticação na Porta 3002**:
   - Inexistência de `middleware.ts` ou controle de sessão. Qualquer dispositivo na rede Wi-Fi local ou tailnet possui comando irrestrito sobre lâmpadas, TV, aspirador e cenas sem identificação prévia.
2. **Proteção de Tokens no Frontend (Aprovado)**:
   - A varredura de código confirmou que `HA_TOKEN` e `MASS_TOKEN` operam estritamente no backend Node.js (`lib/ha.ts` e `app/api/mass/route.ts`). Zero tokens vazam para o bundle do cliente.
3. **Câmeras e Fechaduras (Aprovado)**:
   - Inexistência de feeds de câmeras CFTV ou fechaduras eletrônicas expostas na interface, mitigando riscos de intrusão perimetral física através do painel.
4. **Conflito na Ventilação do PS5 (`SEC-002`)**:
   - A cena Gamer alterna (`toggle`) o cooler do PS5 sem checar estado prévio; se o console já estiver quente e o cooler ativo, a cena desliga a ventilação.
5. **Parâmetros Livres em Rotas de API**:
   - `/api/tv` e `/api/vacuum` repassam strings livres diretamente para os serviços do Home Assistant, carecendo de validação de schemas estritos com enums permitidos.
