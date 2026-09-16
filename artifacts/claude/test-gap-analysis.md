# Análise de Lacunas de Teste

Data: 15/09/2026 · Auditor: Claude Code
Pergunta de partida: **os testes descritos nos artefatos existem?** Resposta curta: **não existe nenhum.**
**Nenhum arquivo foi criado ou corrigido.**

---

## 1. O que foi procurado, e o que se achou

| Procurado | Resultado |
| :--- | :--- |
| `*.test.*`, `*.spec.*` | **0 arquivos** |
| `vitest.config.*`, `playwright.config.*`, `jest.config.*` | **0 arquivos** |
| Pastas `__tests__/`, `tests/`, `e2e/` | **não existem** |
| Dependências de teste em `package.json` | **nenhuma** (sem vitest, playwright, jest, testing-library) |
| Script `npm test` | **não existe** |
| ESLint (dependência ou configuração) | **nenhum** — `"lint": "next lint"` sem ESLint instalado |
| Integração contínua (`.github/workflows`, etc.) | **não existe** |

O RSK-10 ("ausência de suíte automatizada") está correto. O que os documentos **não** dizem é que
também não há análise estática: a única verificação existente é a checagem de tipos embutida no
`next build`.

### O que existe e pode ser confundido com teste

`dashboard-app/scratch/` contém `test_energy_buckets.mjs`, `test_ha_history.mjs` e `test_spline.mjs`.
São **roteiros exploratórios**: executam, imprimem no console e não afirmam nada. Não há asserção, não
há código de saída, não são executados por nenhum script. Úteis como rascunho, inúteis como rede de
proteção.

Do lado do Home Assistant, a verificação real existente é o `check_config`, que **funciona** (executado
nesta auditoria, saída com código 0):

```bash
docker exec -i homeassistant python -m homeassistant --script check_config -c /config
```

---

## 2. Por que a ausência de testes já custou caro

As quatro entidades fantasma e a inversão Cozinha/Lavanderia (`technical-audit.md`, D-01 e D-02)
**passariam em qualquer build**, porque `entity_id` é string: o TypeScript não tem como saber que
`binary_sensor.sensor_banheiro_movimento` não existe na casa. Um único teste comparando `lib/rooms.ts`
com `GET /api/states` teria barrado os cinco defeitos no dia em que entraram.

É a lacuna de maior retorno do projeto inteiro, e custa poucas linhas.

---

## 3. Lacunas por camada, em ordem de valor

### L-01 · Validação do contrato `lib/rooms.ts` × Home Assistant — **prioridade máxima**

- **O que provaria**: toda entidade citada em `rooms.ts`, `batteries.ts` e nos componentes existe no HA;
  nenhuma entidade citada está `unavailable` de forma permanente.
- **Defeitos que teria pego**: os 4 ids inexistentes; renomeações futuras; entidades removidas quando
  uma integração sai (foi o caso do `music_assistant`, cuja entrada sumiu sem ninguém notar).
- **Forma**: teste que lê `GET /api/states` e compara conjuntos. Não precisa de framework — roda como
  script com código de saída.
- **Não cobre**: se a entidade está no cômodo certo. Para isso, ver L-02.

### L-02 · Coerência semântica cômodo × entidade — **alta**

- **O que provaria**: o cômodo declarado em `rooms.ts` bate com a **área** e o **nome** no
  `core.entity_registry`.
- **Defeito que teria pego**: exatamente a inversão Cozinha/Lavanderia, que é invisível para o L-01
  (as duas entidades existem).
- **Fonte de verdade**: o registro do HA, que hoje concorda com automações e sensores de template.

### L-03 · Contratos das rotas de API — **alta**

- **O que provaria**: `/api/state` responde 200 com a forma esperada; `/api/toggle` e `/api/control`
  **rejeitam** entidade fora de `todasEntidades` (hoje a única defesa real do sistema, e ninguém a
  testa); `/api/scene`, `/api/tv`, `/api/vacuum` recusam entrada malformada.
- **Cuidado**: testes das rotas de escrita **acionam a casa de verdade**. Precisam de um HA de teste ou
  de injeção de dependência em `lib/ha.ts`; do contrário a suíte acende luzes às 3 da manhã.

### L-04 · Lógica pura já testável hoje — **média**

`getEnergyHistory` (baldes horários, último valor conhecido, fallback), `getWeatherForecast` (serviço
moderno com fallback para atributo legado) e o mesclador de travas otimistas de `app/page.tsx` são
funções determinísticas. Testáveis sem rede, sem HA, sem navegador.

### L-05 · Automações do Home Assistant — **média**

Hoje só existe `check_config` (sintaxe). Não há verificação de que a automação nº 2 exclui as luzes de
fundo, nem de que a nº 4 tem a condição de sol apenas no acender. O HA não oferece teste unitário de
automação; o caminho realista é um script que leia o YAML e afirme invariantes estruturais.

### L-06 · Fumaça de ponta a ponta — **média**

Painel sobe, `/` responde 200, os 10 cômodos renderizam, nenhum erro no console. Cobre a classe de
falha mais comum na prática: build quebrado, `desktop.ini` no `.next`, servidor fora do ar.

### L-07 · Análise estática — **média**

Não há ESLint. Antes de "consertar o script de lint" (roadmap F1.4), é preciso **instalar e configurar**
ESLint — a tarefa está subdimensionada no roadmap.

---

## 4. Riscos específicos de testar um sistema que mexe em coisa física

1. **Efeito colateral real.** Não existe "ambiente de teste" do painel: as rotas apontam para o HA de
   produção, que é a casa. Qualquer teste de escrita precisa de dublê.
2. **Estados iguais escondem inversões.** Um teste que só verifica "respondeu 200" passaria com a luz
   errada acesa. A asserção tem de ser sobre *qual* entidade foi chamada.
3. **A casa é assíncrona.** Relé Tuya leva centenas de milissegundos; testes de estado precisam de
   espera com limite, não de `sleep` fixo.
4. **A nuvem Tuya interfere.** Enquanto as rotinas do Smart Life estiverem ativas, um teste de luz pode
   falhar por ação de terceiro — resultado não determinístico por causa do ambiente, não do código.

---

## 5. Quadro-resumo

| Lacuna | Camada | Valor | Esforço | Defeito real que teria evitado |
| :--- | :--- | :--- | :--- | :--- |
| L-01 contrato × HA | Dados | **Máximo** | Baixo | 4 entidades fantasma |
| L-02 cômodo × área | Dados | Alto | Baixo | Inversão Cozinha/Lavanderia |
| L-03 rotas de API | Borda | Alto | Médio | Regressão na lista de permissão |
| L-04 lógica pura | Borda | Médio | Baixo | Erros de cálculo de energia/previsão |
| L-05 invariantes das automações | Físico | Médio | Médio | Perda da condição de sol ou da guarda da TV |
| L-06 fumaça ponta a ponta | Interface | Médio | Baixo | Painel fora do ar sem ninguém perceber |
| L-07 ESLint | Estática | Médio | Baixo | Código morto, importação errada |

**Conclusão**: o roadmap acerta ao prever testes na Fase 2 (F2.3), mas erra a ordem. L-01 e L-02 valem
mais que toda a Fase 3 — são baratos, não tocam na casa e atacam a classe de defeito que já está em
produção agora.
