# Relatório de Auditoria de Segurança da Interface e Borda (Fase 9)

**Documento**: `artifacts/audit/security-ui-report.md`  
**Escopo**: Interface Next.js (`dashboard-app`) e Borda de Integração (`app/api/*`)  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — sem acionamento de hardware)  
**Referência Canônica**: [`docs/SECURITY.md`](file:///c:/HomeAssistant/docs/SECURITY.md) e [`docs/AUTOMATION-POLICY.md`](file:///c:/HomeAssistant/docs/AUTOMATION-POLICY.md)

---

## 1. Visão Geral do Modelo de Ameaça

O sistema de automação residencial do André opera sob isolamento perimetral via Tailscale (sem portas abertas na WAN pública). Portanto, o vetor de ataque primário reside **dentro da rede local (LAN)** ou entre nós autorizados da **tailnet**. Qualquer dispositivo conectado ao Wi-Fi residencial ou compartilhado na tailnet (visitas, celulares de terceiros, dispositivos IoT comprometidos) possui alcance direto à porta `3002`.

---

## 2. Matriz de Auditoria de Superfície e Controles de Segurança

| Vetor de Risco | Cenário Inspecionado | Veredito | Diagnóstico Técnico | Severidade |
| :--- | :--- | :---: | :--- | :---: |
| **Autenticação no Painel** | Acesso direto a `http://<IP>:3002` | ❌ **CRÍTICO** | Inexistência de `middleware.ts`, tela de login ou verificação de sessão. Qualquer dispositivo na LAN/Tailnet assume comando total da residência. | **Crítica** |
| **Vazamento de Tokens no Bundle** | Varredura estática de `use client` | ✅ **Aprovado** | `HA_TOKEN` e `MASS_TOKEN` residem exclusivamente no lado do servidor (`lib/ha.ts` e `api/mass/route.ts`). Zero ocorrências vazadas para o cliente. | Nenhuma |
| **Controle de Câmeras e CFTV** | Monitoramento visual da casa | ✅ **Aprovado** | Não há entidades de câmera (`camera.*`) integradas ou expostas na interface. | Nenhuma |
| **Fechaduras e Portões Físicos** | Trancas eletrônicas e atuadores de acesso | ✅ **Aprovado** | Nenhuma fechadura (`lock.*`) ou portão automatizado está mapeado no contrato de `lib/rooms.ts`. O risco físico é restrito a relés de iluminação, TV e tomadas. | Nenhuma |
| **Ações Críticas Globais (Apagar Tudo)** | Desligamento geral de iluminação | ✅ **Aprovado** | Protegido por **Hold de Segurança de 800ms** com anel de progresso SVG e confirmação física, impedindo disparos acidentais por toque simples. | Nenhuma |
| **Ações Críticas de Hardware (Cena Gamer vs PS5)** | Toggle de ventilação do console | ⚠️ **Alto Risco** | Conflito aberto R8: A cena Gamer dispara `toggle` no cooler do PS5; se o console estiver ligado e quente, a cena pode desligar a refrigeração forçada. | **Alta** |
| **Comandos Arbitrários em Rotas Abertas** | Injeção de strings em rotas de API | ⚠️ **Médio Risco** | `/api/tv` e `/api/vacuum` repassam strings livres (`comando` e `modo`) diretamente a serviços do Home Assistant sem checagem contra enum restrito. | **Média** |
| **Leitura Direta de Storage em Disco** | Caminho Windows hardcoded em rota | ⚠️ **Médio Risco** | `app/api/mass/route.ts` tenta ler diretamente `C:\HomeAssistant\config\.storage\core.config_entries`, o que quebra portabilidade e containerização. | **Média** |
| **Exposição de Dados Pessoais de Saúde** | Métricas biométricas no cabeçalho | ℹ️ **Informativo** | Frequência cardíaca, calorias e passos de André expostos na interface visual na parede sem restrição de perfil de visualizador. | Baixa |

---

## 3. Análise Detalhada dos Achados de Segurança

### 3.1. Achado A-01 (Crítico) · Ausência Universal de Autenticação na Porta 3002
* **Evidência**:
  Uma requisição `GET http://localhost:3002/api/state` ou `POST http://localhost:3002/api/toggle` não requer cookies, cabeçalhos `Authorization` ou tokens.
* **Impacto**:
  Uma visita conectada à rede Wi-Fi de hóspedes que descubra a porta 3002 ou qualquer script rodando em um computador da rede pode apagar as luzes da casa, ligar aparelhos ou disparar rotinas indiscriminadamente.
* **Proposta de Mitigação Arquitetural**:
  1. Implementar `middleware.ts` do Next.js validando um PIN de acesso ou cookie de sessão simples;
  2. Implementar autenticação básica ou token de sessão local para os painéis de parede fixos (Wall-Mounts).

### 3.2. Achado A-02 (Alto) · Inexistência de Idempotência na Smart TV Samsung
* **Evidência**:
  O comando de power na TV Samsung (`media_player.tv_un65du8000gxzd`) opera por alternância física de pulso (Power Toggle). Se o usuário enviar um comando de desligar com a TV já apagada, ela liga no meio da noite.
* **Impacto**:
  Automações ou toques rápidos em retry podem religar a TV na sala involuntariamente.

### 3.3. Achado A-03 (Médio) · Falta de Validação de Schema nas Rotas `/api/tv` e `/api/vacuum`
* **Código Atual**:
  ```ts
  // app/api/tv/route.ts
  const { comando } = await req.json();
  await enviarComandoTv(comando); // Aceita qualquer string arbitrária
  ```
* **Proposta**:
  Implementar validação estrita com array fixo de comandos permitidos (`["KEY_POWER", "KEY_VOLDOWN", "KEY_VOLUP", "KEY_HOME", "KEY_ENTER", ...]`).

---

## 4. Matriz de Recomendações de Segurança

1. **Prioridade 1 (Crítica)**:
   - Estruturar autenticação / proteção perimetral na porta 3002 antes de disponibilizar acesso remoto para Larissa ou terceiros fora da tailnet.
2. **Prioridade 2 (Alta)**:
   - Adicionar trava de confirmação com condicional de estado (`choose` ou verificação prévia) no acionamento da TV Samsung e isolar a ventilação do PS5 da cena Gamer.
3. **Prioridade 3 (Média)**:
   - Sanitizar e restringir os payloads de `/api/tv` e `/api/vacuum` com schemas rigorosos.
