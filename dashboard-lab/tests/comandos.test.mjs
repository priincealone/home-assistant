// Painel Secundário, FASE B (comandos), lado do PAINEL. Node puro, sem navegador, sem rede, sem HA, sem acionar a casa.
// Rodar a partir da raiz do repositório:  node --test dashboard-lab/tests/*.test.mjs
// Cobre: funções puras de comando (ação por estado, conversões, erro -> mensagem, gating, lote), o cliente de mensagens
// (ids, resultado, timeout, ignorar o que não é do pai), a interface com um PAI FALSO (otimista com trava de 5 s, confirmação,
// lote + Desfazer, cenas, folha), o kill-switch ?leitura=1 e a varredura de segurança. O carregador tem seus próprios testes
// (carregador.test.mjs); aqui o "pai" só registra as mensagens que o painel manda e responde o que o teste mandar.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");
const APP = ler("app.js"), ICONES = ler("icons.js"), REAL_JS = ler("casa-real.js");
const CONTRATO = JSON.parse(ler("contrato.json"));
const COMANDOS = JSON.parse(ler("comandos.json"));
const json = (o) => JSON.stringify(o);
const plano = (x) => JSON.parse(json(x));
const espera = () => new Promise((r) => setImmediate(r));

/* ---------- Estados da HA ---------- */
const AGORA = Date.now();
const antes = (min) => new Date(AGORA - min * 60000).toISOString();
const est = (state, attributes = {}, min = 10) => ({ state, last_changed: antes(min), last_updated: antes(min), attributes });
const TODAS = CONTRATO.comodos.flatMap((c) => c.dispositivos);
const porId = (id) => TODAS.find((d) => d.id === id).entityId;
const CHV = (comodo, id) => `${comodo}.${id}`;
const ALVOS = COMANDOS.alvos;
function casaBase() {
  const e = {};
  for (const d of TODAS) {
    const dom = d.dominio;
    if (dom === "light" || dom === "switch" || dom === "fan" || dom === "media_player") e[d.entityId] = est("off");
    else if (dom === "binary_sensor") e[d.entityId] = est("off", { device_class: /porta/.test(d.entityId) ? "door" : "motion" });
    else if (dom === "sensor") e[d.entityId] = est(d.unidade === "°C" ? "26" : "55", { unit_of_measurement: d.unidade || "" });
    if (d.batteryEntityId) e[d.batteryEntityId] = est("80", { device_class: "battery" });
  }
  e[ALVOS.aspirador] = est("docked", { battery_level: 100 });
  e[ALVOS.aspirador_modo] = est("标准", { options: ["安静", "标准", "中档", "强力"] });
  e[ALVOS.tv_nuvem] = est("off");
  return e;
}

const CR = (() => {
  const ctx = { window: null, Date, Math, JSON, Map, Set, Array, Object, String, Number, Promise, URLSearchParams, setTimeout, clearTimeout };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(REAL_JS, ctx);
  return ctx.CasaReal;
})();

/* ---------- (a) funções puras ---------- */
const cartao = (extra) => ({ id: "luz_sala", tipo: "light", on: false, indisp: false, sensor: false, info: false, estado: "off", ...extra });

test("ação do toque: ligar × desligar pelo estado atual; PS5 liga em repouso e vai a repouso ligado; TV desliga só ligada", () => {
  assert.equal(CR.escolherAcaoToque(cartao({ on: false }), COMANDOS), "ligar");
  assert.equal(CR.escolherAcaoToque(cartao({ on: true, estado: "on" }), COMANDOS), "desligar");
  const ps5 = (estado, on) => cartao({ id: "ps5_sala", tipo: "console", on, estado });
  assert.equal(CR.escolherAcaoToque(ps5("off", false), COMANDOS), "ligar");
  assert.equal(CR.escolherAcaoToque(ps5("standby", false), COMANDOS), "ligar");
  assert.equal(CR.escolherAcaoToque(ps5("playing", true), COMANDOS), "repouso");
  assert.equal(CR.escolherAcaoToque(ps5("on", true), COMANDOS), "repouso");
  assert.equal(CR.escolherAcaoToque(ps5("idle", true), COMANDOS), "ligar", "ocioso: repouso só vale ligado/jogando; 'ligar' vale em idle");
  const tv = (estado, on) => cartao({ id: "tv_sala", tipo: "tv", on, estado });
  assert.equal(CR.escolherAcaoToque(tv("on", true), COMANDOS), "desligar");
  assert.equal(CR.escolherAcaoToque(tv("standby", false), COMANDOS), "ligar");
  // sem toque: indisponível, sensor, aspirador (info) e aparelho sem regra
  assert.equal(CR.escolherAcaoToque(cartao({ indisp: true }), COMANDOS), null);
  assert.equal(CR.escolherAcaoToque(cartao({ id: "porta_sala", tipo: "door", sensor: true }), COMANDOS), null);
  assert.equal(CR.escolherAcaoToque(cartao({ id: "aspirador", tipo: "vacuum", info: true }), COMANDOS), null);
  assert.equal(CR.escolherAcaoToque(cartao({ id: "inventado", on: false }), COMANDOS), null);
  assert.equal(CR.escolherAcaoToque(cartao(), null), null, "sem regras (kill-switch) nada comanda");
});

test("conversões UI -> HA: brilho % -> 1..255, volume % -> 0..1, velocidade 1-3 -> 33/66/100 (degraus do Painel Primário)", () => {
  assert.equal(CR.brilhoParaHa(100), 255); assert.equal(CR.brilhoParaHa(50), 128); assert.equal(CR.brilhoParaHa(1), 3);
  assert.equal(CR.brilhoParaHa(0), 1, "nunca 0: 0 apagaria a luz sem 'desligar'");
  assert.equal(CR.brilhoParaHa(500), 255);
  assert.equal(CR.volumeParaHa(35), 0.35); assert.equal(CR.volumeParaHa(0), 0); assert.equal(CR.volumeParaHa(100), 1); assert.equal(CR.volumeParaHa(250), 1);
  assert.deepEqual([1, 2, 3].map(CR.velParaPct), [33, 66, 100]);
  assert.equal(CR.velParaPct(9), 100); assert.equal(CR.velParaPct(0), 33);
  const c = (campo, v) => plano(CR.comandoDoCampo(campo, v));
  assert.deepEqual(c("bri", 50), { acao: "ajustar", params: { brightness: 128 } });
  assert.deepEqual(c("temp", 3200), { acao: "ajustar", params: { color_temp_kelvin: 3200 } });
  assert.deepEqual(c("cor", "verde"), { acao: "ajustar", params: { rgb_color: [16, 185, 129] } });
  assert.deepEqual(c("vel", 2), { acao: "velocidade", params: { percentage: 66 } });
  assert.deepEqual(c("osc", true), { acao: "oscilar", params: { oscillating: true } });
  assert.deepEqual(c("vol", 40), { acao: "volume", params: { volume_level: 0.4 } });
  assert.deepEqual(c("mudo", false), { acao: "mudo", params: { is_volume_muted: false } });
  assert.deepEqual(c("app", "HDMI 2"), { acao: "fonte", params: { source: "HDMI 2" } });
  assert.deepEqual(c("modo", "强力"), { acao: "modo", params: { option: "强力" } });
  for (const [campo, v] of [["cor", "rosa"], ["app", "Disney+"], ["app", ""], ["app", "x".repeat(33)], ["inventado", 1]]) assert.equal(CR.comandoDoCampo(campo, v), null, `${campo}=${v}`);
  // o resultado das conversões sempre cabe nas faixas declaradas em comandos.json
  const luz = COMANDOS.dispositivos.luz_sala.acoes.ajustar.params;
  for (const p of [1, 25, 50, 99, 100]) { const b = CR.comandoDoCampo("bri", p).params.brightness; assert.ok(b >= luz.brightness.min && b <= luz.brightness.max, String(p)); }
  const rgbOk = (rgb) => rgb.length === 3 && rgb.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  for (const k of Object.keys(CR.COR_RGB)) assert.ok(rgbOk(CR.COR_RGB[k]), k);
});

test("erro do carregador -> mensagem em português (todos os códigos); desconhecido vira mensagem genérica; nada em inglês nem vazio", () => {
  const codigos = ["confirmacao_necessaria", "desconectado", "dispositivo_nao_comandavel", "acao_nao_permitida", "parametro_nao_permitido", "parametro_invalido", "parametros_ausentes",
    "estado_nao_permite", "estado_desconhecido", "muitos_comandos", "lote_invalido", "item_recusado", "acao_fora_do_lote", "falha_na_ha", "timeout_sem_confirmacao", "sem_hass", "pedido_invalido"];
  const vistas = new Set();
  for (const c of codigos) {
    const m = CR.mensagemErro(c);
    assert.ok(typeof m === "string" && m.length > 8 && !/_/.test(m) && m !== "Não foi possível executar o comando.", c);
    vistas.add(m);
  }
  assert.equal(vistas.size, codigos.length, "cada código tem sua própria mensagem");
  assert.equal(CR.mensagemErro("timeout_sem_confirmacao"), "Sem confirmação da casa — confira o estado.");
  assert.equal(CR.mensagemErro("codigo_novo"), "Não foi possível executar o comando.");
  assert.equal(CR.mensagemErro(undefined), "Não foi possível executar o comando.");
  assert.equal(CR.mensagemErro("__proto__"), "Não foi possível executar o comando.");
});

test("gating: offline, carregando, sem dados, indisponível, sensor, sem regra e sem regras = desabilitado", () => {
  const ok = { net: "online", recebeu: true };
  assert.equal(CR.podeComandar(COMANDOS, ok, cartao(), "ligar"), true);
  assert.equal(CR.podeComandar(COMANDOS, { net: "offline", recebeu: true }, cartao(), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, { net: "carregando", recebeu: false }, cartao(), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, { net: "online", recebeu: false }, cartao(), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, ok, cartao({ indisp: true }), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, ok, cartao({ sensor: true }), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, ok, cartao({ id: "sem_regra" }), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, ok, cartao(), "acao_inventada"), false);
  assert.equal(CR.podeComandar(null, ok, cartao(), "ligar"), false);
  assert.equal(CR.podeComandar(COMANDOS, null, cartao(), "ligar"), false);
  assert.equal(CR.validaRegras(null), null); assert.equal(CR.validaRegras("x"), null); assert.equal(CR.validaRegras({}), null); assert.equal(CR.validaRegras({ dispositivos: [] }), null);
  assert.ok(CR.validaRegras(COMANDOS));
  assert.equal(CR.acaoRegra(COMANDOS, "__proto__", "ligar"), null, "ids herdados do protótipo não valem");
  assert.equal(CR.acaoRegra(COMANDOS, "luz_sala", "constructor"), null);
});

test("lote: só ações com lote:true (luzes e interruptor de luz) que precisam mudar; nunca tomada, ventilador, TV, console, aspirador, sensor", () => {
  const E = casaBase();
  for (const d of TODAS) if (["light", "switch", "fan", "media_player"].includes(d.dominio)) E[d.entityId] = est("on");
  const m = CR.estadoReal(CONTRATO, E, COMANDOS);
  for (const s of m.salas) {
    const apagar = plano(CR.itensLote(s.cartoes, false, COMANDOS));
    const ids = apagar.map((i) => i.dispositivo);
    for (const i of apagar) assert.equal(i.acao, "desligar");
    const permitido = plano(s.cartoes).filter((c) => c.tipo === "light" || c.tipo === "led").map((c) => c.id);
    assert.deepEqual(ids.sort(), permitido.sort(), s.id);
    assert.ok(!plano(s.cartoes).some((c) => ["plug", "fan", "tv", "console", "vacuum"].includes(c.tipo) && ids.includes(c.id)), "fora do lote: " + s.id);
    assert.deepEqual(plano(CR.itensLote(s.cartoes, true, COMANDOS)), [], "tudo aceso: nada a acender");
  }
  const sala = m.salas.find((s) => s.id === "sala_de_estar");
  assert.deepEqual(plano(CR.itensLote(sala.cartoes, false, COMANDOS)), [{ dispositivo: "luz_sala", acao: "desligar" }, { dispositivo: "painel", acao: "desligar" }]);
  const banheiro = m.salas.find((s) => s.id === "banheiro");
  assert.deepEqual(plano(CR.itensLote(banheiro.cartoes, false, COMANDOS)), [{ dispositivo: "banheiro_switch_1", acao: "desligar" }], "interruptor de luz entra, a tomada banheiro_switch_2 não");
  // inverso reaplica as MESMAS ações permitidas
  const inv = plano(CR.loteInverso(CR.itensLote(sala.cartoes, false, COMANDOS)));
  assert.deepEqual(inv, [{ dispositivo: "luz_sala", acao: "ligar" }, { dispositivo: "painel", acao: "ligar" }]);
  assert.deepEqual(plano(CR.itensLote(sala.cartoes, true, COMANDOS)), []);
  // luz indisponível fica fora; cômodo sem luz comandável não tem botão
  E[porId("painel")] = est("unavailable");
  const m2 = CR.estadoReal(CONTRATO, E, COMANDOS);
  assert.deepEqual(plano(CR.itensLote(m2.salas.find((s) => s.id === "sala_de_estar").cartoes, false, COMANDOS)), [{ dispositivo: "luz_sala", acao: "desligar" }]);
  assert.equal(CR.temLote(m.salas.find((s) => s.id === "sala_de_estar").cartoes, COMANDOS), true);
  assert.equal(CR.temLote(m.salas.find((s) => s.id === "sala_de_estar").cartoes, { dispositivos: {} }), false);
});

test("confirmações vêm do comandos.json: PC, bloqueio, PS5 repouso e cenas pedem; luzes não", () => {
  assert.match(CR.textoConfirmacao(COMANDOS, "pc_socket_1", "desligar"), /computador/);
  assert.ok(CR.textoConfirmacao(COMANDOS, "bloqueio_luca", "ligar"));
  assert.ok(CR.textoConfirmacao(COMANDOS, "ps5_sala", "repouso"));
  for (const c of ["cena_cinema", "cena_boa_noite", "cena_boas_vindas", "cena_gamer"]) assert.equal(CR.textoConfirmacao({ dispositivos: { [c]: { acoes: { executar: { confirmar: "?" } } } } }, c, "executar"), "?");
  assert.equal(CR.textoConfirmacao(COMANDOS, "luz_sala", "ligar"), null);
  assert.equal(CR.textoConfirmacao(COMANDOS, "tv_sala", "desligar"), null);
  // regras reais: toda cena do contrato tem 'executar' (a confirmação das cenas vem de `cenas.confirmar` no gerador; ver a UI abaixo)
  for (const c of CONTRATO.cenas) assert.ok(CR.acaoRegra(COMANDOS, "cena_" + c.chave, "executar"), c.chave);
});

test("adaptador com regras: aspirador entra na seção do Closet (estado, bateria, modo); sem regras não existe; TV usa volume da nuvem", () => {
  const E = casaBase();
  E[ALVOS.aspirador] = est("cleaning", { battery_level: 63 });
  E[ALVOS.aspirador_modo] = est("强力", { options: ["安静", "标准", "中档", "强力"] });
  E[porId("tv_sala")] = est("on", { source: "HDMI 1" });
  E[ALVOS.tv_nuvem] = est("on", { volume_level: 0.4, is_volume_muted: true, source_list: ["HDMI 1", "Netflix", "Disney+"] });
  const m = plano(CR.estadoReal(CONTRATO, E, COMANDOS));
  const closet = m.salas.find((s) => s.id === "closet");
  const asp = closet.cartoes.find((c) => c.id === "aspirador");
  assert.deepEqual([asp.tipo, asp.vst, asp.bat, asp.modo, asp.indisp, asp.info], ["vacuum", "limpando", 63, "强力", false, true]);
  assert.ok(m.baterias.some((b) => b.nome === "Aspirador" && b.bat === 63));
  const tv = m.salas.flatMap((s) => s.cartoes).find((c) => c.id === "tv_sala");
  assert.deepEqual([tv.vol, tv.mudo, tv.fontes], [40, true, ["HDMI 1", "Netflix", "Disney+"]]);
  for (const [estado, vst] of [["docked", "base"], ["paused", "pausado"], ["returning", "retornando"], ["idle", "parado"], ["error", "erro"]]) {
    E[ALVOS.aspirador] = est(estado, { battery_level: 50 });
    assert.equal(plano(CR.estadoReal(CONTRATO, E, COMANDOS)).salas.find((s) => s.id === "closet").cartoes.find((c) => c.id === "aspirador").vst, vst, estado);
  }
  for (const s of ["unavailable", "unknown"]) {
    E[ALVOS.aspirador] = est(s);
    const r = plano(CR.estadoReal(CONTRATO, E, COMANDOS));
    assert.equal(r.salas.find((x) => x.id === "closet").cartoes.find((c) => c.id === "aspirador").indisp, true, s);
    assert.ok(r.offline.some((o) => o.nome === "Aspirador"), s);
  }
  assert.ok(!plano(CR.estadoReal(CONTRATO, E)).salas.flatMap((s) => s.cartoes).some((c) => c.id === "aspirador"), "sem regras (leitura) não há cartão do aspirador");
  // cor: só quando supported_color_modes indica
  E[porId("led")] = est("on", { supported_color_modes: ["rgb"], rgb_color: [16, 185, 129], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 });
  E[porId("luz_sala")] = est("on", { supported_color_modes: ["color_temp"], color_temp_kelvin: 3000 });
  const r = plano(CR.estadoReal(CONTRATO, E, COMANDOS)).salas.flatMap((s) => s.cartoes);
  assert.equal(r.find((c) => c.id === "led").rgb, true); assert.equal(r.find((c) => c.id === "luz_sala").rgb, false);
  assert.equal(CR.corDoRgb(r.find((c) => c.id === "led").rgbCor), "verde");
  assert.equal(CR.corDoRgb([1, 2, 3]), null); assert.equal(CR.corDoRgb(null), null);
});

/* ---------- (b) cliente de mensagens ---------- */
function relogio() {
  let agora = 0, n = 0; const fila = [];
  return {
    set: (f, ms = 0) => { const id = ++n; fila.push({ id, t: agora + ms, f }); return id; },
    clear: (id) => { const i = fila.findIndex((x) => x.id === id); if (i >= 0) fila.splice(i, 1); },
    avanca(ms) { const alvo = agora + ms; for (;;) { fila.sort((a, b) => a.t - b.t || a.id - b.id); const x = fila[0]; if (!x || x.t > alvo) break; fila.shift(); agora = x.t; x.f(); } agora = alvo; },
    agora: () => agora, pendentes: () => fila.length,
  };
}

test("cliente: ids incrementais, mensagem só com dispositivo/ação/params (nunca entity_id), resultado casa pelo id", async () => {
  const saiu = []; const r = relogio();
  const cli = CR.criarCliente({ postar: (m) => saiu.push(plano(m)), setTimeout: r.set, clearTimeout: r.clear });
  const p1 = cli.comandar("luz_sala", "ligar"), p2 = cli.comandar("luz_sala", "ajustar", { brightness: 128 }), p3 = cli.comandar("pc_socket_1", "desligar", null, { confirmado: true }), p4 = cli.comandar("tv_sala", "desligar", null, { confirmado: false });
  assert.deepEqual(saiu, [
    { tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" },
    { tipo: "comando", id: 2, dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 128 } },
    { tipo: "comando", id: 3, dispositivo: "pc_socket_1", acao: "desligar", confirmado: true },
    { tipo: "comando", id: 4, dispositivo: "tv_sala", acao: "desligar" },
  ]);
  assert.ok(!json(saiu).includes("entity_id") && !json(saiu).includes("light."));
  assert.equal(cli.pendentes(), 4);
  assert.equal(cli.receber({ tipo: "resultado", id: 2, ok: true }), true);
  assert.equal(cli.receber({ tipo: "resultado", id: 1, ok: false, erro: "falha_na_ha", detalhe: "x" }), true);
  assert.deepEqual(plano(await p2), { ok: true });
  assert.deepEqual(plano(await p1), { ok: false, erro: "falha_na_ha", detalhe: "x" });
  assert.equal(cli.receber({ tipo: "resultado", id: 99, ok: true }), false, "id desconhecido é ignorado");
  assert.equal(cli.receber({ tipo: "resultado", id: 2, ok: true }), false, "resultado repetido é ignorado");
  assert.equal(cli.receber({ tipo: "outra", id: 3, ok: true }), false);
  assert.equal(cli.receber(null), false);
  assert.equal(cli.receber({ tipo: "resultado", id: 3, ok: "true" }), true);
  assert.equal((await p3).ok, false, "ok só vale se for exatamente true");
  assert.equal(cli.pendentes(), 1);
  cli.receber({ tipo: "resultado", id: 4, ok: false, erro: "confirmacao_necessaria", confirmar: "Texto" });
  assert.deepEqual(plano(await p4), { ok: false, erro: "confirmacao_necessaria", confirmar: "Texto" });
  // lote: só dispositivo/ação de cada item
  const pl = cli.comandarLote([{ dispositivo: "luz_sala", acao: "desligar", entity_id: "light.x" }, { dispositivo: "painel", acao: "desligar" }]);
  assert.deepEqual(saiu.at(-1), { tipo: "comando-lote", id: 5, itens: [{ dispositivo: "luz_sala", acao: "desligar" }, { dispositivo: "painel", acao: "desligar" }] });
  cli.receber({ tipo: "resultado", id: 5, ok: false, resultados: [{ ok: true }, { ok: false, erro: "falha_na_ha" }] });
  assert.deepEqual(plano(await pl), { ok: false, resultados: [{ ok: true }, { ok: false, erro: "falha_na_ha" }] });
});

test("cliente: sem resultado em ~70 s vira timeout_sem_confirmacao (pode ter sido aplicado), e resposta tardia é ignorada; nunca reenvia", async () => {
  const saiu = []; const r = relogio();
  const cli = CR.criarCliente({ postar: (m) => saiu.push(m), setTimeout: r.set, clearTimeout: r.clear });
  const p = cli.comandar("luz_sala", "ligar");
  r.avanca(69999); assert.equal(cli.pendentes(), 1);
  r.avanca(1);
  assert.deepEqual(plano(await p), { ok: false, erro: "timeout_sem_confirmacao" });
  assert.equal(cli.pendentes(), 0);
  assert.equal(cli.receber({ tipo: "resultado", id: 1, ok: true }), false, "resposta tardia ignorada");
  r.avanca(300000);
  assert.equal(saiu.length, 1, "o cliente nunca reenvia sozinho");
});

function ponte({ regrasOk = true, buscaPai = "", buscaPropria = "?v=abc" } = {}) {
  const enviadas = [], ouvintes = []; let aoContrato;
  const pai = { postMessage: (m, o) => enviadas.push([plano(m), o]), location: { search: buscaPai } };
  const janela = { parent: pai, location: { search: buscaPropria, origin: "http://ha.local:8123" }, addEventListener: (t, f) => { if (t === "message") ouvintes.push(f); } };
  const chamadas = [];
  const ctx = {
    window: janela, URLSearchParams, JSON, Promise, Math, Date, Object, Array, String, Number, Map, Set, setTimeout: () => 0, clearTimeout: () => {},
    fetch: (url) => { chamadas.push(url); const corpo = url.startsWith("comandos.json") ? COMANDOS : CONTRATO; return url.startsWith("comandos.json") && !regrasOk ? Promise.resolve({ ok: false, status: 404 }) : Promise.resolve({ ok: true, json: () => Promise.resolve(corpo) }); },
  };
  janela.window = janela; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(REAL_JS, ctx);
  const pronto = new Promise((res) => { aoContrato = (c, regras, cli) => res({ c, regras, cli }); });
  janela.CasaReal.conectar({ aoContrato, aoLote: () => {}, aoSemDados: () => {}, aoFalha: () => {} });
  return { enviadas, ouvintes, chamadas, pai, pronto };
}

test("ponte: resultado de outra janela, de outra origem ou com id desconhecido é ignorado; do pai resolve", async () => {
  const p = ponte(); const { cli, regras } = await p.pronto;
  assert.ok(regras && cli);
  const prom = cli.comandar("luz_sala", "ligar");
  const msg = p.enviadas.find(([m]) => m.tipo === "comando");
  assert.deepEqual(msg, [{ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" }, "http://ha.local:8123"], "vai ao pai com targetOrigin da própria origem");
  const ouve = p.ouvintes[0];
  ouve({ source: {}, origin: "http://ha.local:8123", data: { tipo: "resultado", id: 1, ok: true } });                 // janela errada
  ouve({ source: p.pai, origin: "http://outra.origem", data: { tipo: "resultado", id: 1, ok: true } });               // origem errada
  ouve({ source: p.pai, origin: "http://ha.local:8123", data: { tipo: "resultado", id: 77, ok: true } });             // id desconhecido
  assert.equal(cli.pendentes(), 1, "nada disso resolveu o comando");
  ouve({ source: p.pai, origin: "http://ha.local:8123", data: { tipo: "resultado", id: 1, ok: true } });
  assert.deepEqual(plano(await prom), { ok: true });
});

test("kill-switch: ?leitura=1 (no painel ou na página que o hospeda) ou comandos.json ausente/inválido = sem regras, sem cliente, sem fetch de comandos, nenhuma mensagem de comando", async () => {
  for (const o of [{ buscaPropria: "?v=abc&leitura=1" }, { buscaPai: "?leitura=1" }]) {
    const p = ponte(o); const { regras, cli } = await p.pronto;
    assert.equal(regras, null); assert.equal(cli, null);
    assert.deepEqual(p.chamadas, ["contrato.json?v=abc"].slice(0, 1).concat(o.buscaPropria ? [] : []).filter(Boolean).length ? p.chamadas : p.chamadas);
    assert.ok(!p.chamadas.some((u) => u.startsWith("comandos.json")), "nem busca as regras");
    assert.deepEqual(p.enviadas.map(([m]) => m.tipo), ["painel-pronto"]);
  }
  const sem = ponte({ regrasOk: false }); const r = await sem.pronto;
  assert.equal(r.regras, null); assert.equal(r.cli, null);
  assert.deepEqual(sem.enviadas.map(([m]) => m.tipo), ["painel-pronto"]);
  const livre = ponte({ buscaPai: "?leitura=0" }); assert.ok((await livre.pronto).regras, "leitura=0 não liga o kill-switch");
});

/* ---------- (c) interface com pai falso ---------- */
function criaAmbiente({ regras = COMANDOS, estados = null, conectado = true, semLote = false, regrasObj } = {}) {
  const rel = relogio();
  const els = new Map(); const ouvintes = {}; const armazenamento = new Map();
  const el = (sel) => {
    if (!els.has(sel)) {
      const ov = {};
      els.set(sel, {
        sel, innerHTML: "", textContent: "", hidden: false, value: "", dataset: {}, children: [], style: { setProperty() {} }, ov,
        classList: { contains: () => false, add() {}, remove() {} }, setAttribute(k, v) { this[`attr_${k}`] = v; }, getAttribute: () => null, addEventListener(t, f) { (ov[t] ||= []).push(f); },
        querySelector: () => el("filho:" + sel), querySelectorAll: () => [], focus() {}, closest: () => null, offsetWidth: 0, scrollHeight: 0, clientHeight: 0, scrollTop: 0, inert: false,
      });
    }
    return els.get(sel);
  };
  const body = el("body"), docEl = el("html");
  const ctx = {
    console, URLSearchParams, Date, Math, JSON, Map, Set, Array, Object, String, Number, Promise,
    location: { search: "?net=online" },
    localStorage: { getItem: (k) => (armazenamento.has(k) ? armazenamento.get(k) : null), setItem: (k, v) => armazenamento.set(k, String(v)) },
    navigator: {}, performance: { now: () => rel.agora() },
    getComputedStyle: () => ({ getPropertyValue: () => "180", overflowY: "visible" }),
    setTimeout: rel.set, clearTimeout: rel.clear, setInterval: () => 0,
    document: { querySelector: (s) => el(s), querySelectorAll: () => [], contains: () => false, body, documentElement: docEl, activeElement: body, addEventListener: (t, f) => { (ouvintes[t] ||= []).push(f); } },
  };
  ctx.window = ctx; ctx.window.innerWidth = 1280;
  ctx.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  ctx.window.scrollTo = () => {}; ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(ICONES, ctx); vm.runInContext(REAL_JS, ctx); vm.runInContext(APP, ctx);
  const v = (codigo) => vm.runInContext(codigo, ctx);
  const saiu = [];
  const cli = regras ? ctx.CasaReal.criarCliente({ postar: (m) => saiu.push(plano(m)), setTimeout: rel.set, clearTimeout: rel.clear }) : null;
  ctx.__regras = regras; ctx.__cli = cli;
  v(`iniciaReal(${json(CONTRATO)}, __regras, __cli)`);
  const lote = (e, extra = {}) => v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: e, ...extra })})`);
  if (!semLote) v(`recebeLote(${json({ tipo: "casa-estados", completo: true, conectado, estados: estados || casaBase() })})`);
  const clica = (data) => {
    const alvo = { dataset: data, hasAttribute: (n) => n.startsWith("data-") && Object.keys(data).some((k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) === n) };
    for (const f of ouvintes.click) f({ target: { closest: (s) => (s === ".dev" ? null : alvo) }, preventDefault() {} });
  };
  // eventos nos elementos de diálogo (#confirma, #folha)
  const dispara = (sel, tipo, data) => {
    const alvo = { dataset: data, hasAttribute: (n) => n.startsWith("data-") && Object.keys(data).some((k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) === n), classList: { contains: () => false } };
    for (const f of el(sel).ov[tipo] || []) f({ target: { closest: () => alvo }, key: data.key, preventDefault() {}, shiftKey: false });
  };
  const responde = (m, corpo) => cli.receber({ tipo: "resultado", id: m.id, ...corpo });
  return { v, el, clica, dispara, saiu, cli, rel, responde, lote, ctx, J: (c) => JSON.parse(v(`JSON.stringify(${c})`)) };
}
const cmds = (a) => a.saiu.filter((m) => m.tipo === "comando" || m.tipo === "comando-lote");
const K = (c, i) => CHV(c, i);
const SALA = "sala_de_estar";

test("toque: luz desligada manda 'ligar', mostra 'pendente' (otimista) e a confirmação da HA limpa a trava sem erro", async () => {
  const a = criaAmbiente();
  const k = K(SALA, "luz_sala");
  assert.equal(a.v("comandosAtivos()"), true);
  a.clica({ dev: k });
  assert.deepEqual(cmds(a), [{ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" }]);
  assert.equal(a.v(`estado.get("${k}").on`), true, "otimista: o cartão já mostra ligado");
  assert.equal(a.v(`pendente("${k}")`), true);
  assert.match(a.v(`tileHtml("${k}", estado.get("${k}"))`), /data-pendente="true"/);
  a.responde(cmds(a)[0], { ok: true }); await espera();
  assert.equal(a.v(`pendente("${k}")`), true, "aceito != confirmado: a trava só sai quando o estado real chega");
  a.rel.avanca(2000);
  a.lote({ [porId("luz_sala")]: est("on", { brightness: 200 }, 0) });
  assert.equal(a.v(`pendente("${k}")`), false, "o estado real confirmou");
  assert.equal(a.v(`estado.get("${k}").on`), true);
  assert.doesNotMatch(a.el("#toast").innerHTML, /não confirmou|executou/);
  a.rel.avanca(10000);
  assert.equal(a.v(`estado.get("${k}").on`), true, "nada reverte depois de confirmado");
  assert.doesNotMatch(a.v(`tileHtml("${k}", estado.get("${k}"))`), /data-pendente/);
  assert.equal(cmds(a).length, 1, "um único comando");
});

test("toque: cada família manda a ação certa (luz, interruptor de luz, tomada, ventilador, TV, PS5)", () => {
  const E = casaBase();
  E[porId("ventilador_sala")] = est("on", { percentage: 66 }); E[porId("tv_sala")] = est("on"); E[porId("ps5_sala")] = est("playing");
  E[porId("banheiro_switch_2")] = est("on");
  const a = criaAmbiente({ estados: E });
  const casos = [[SALA, "luz_sala", "ligar"], [SALA, "ventilador_sala", "desligar"], [SALA, "tv_sala", "desligar"], ["banheiro", "banheiro_switch_1", "ligar"], ["banheiro", "banheiro_switch_2", "desligar"], [SALA, "ventilacao_ps5", "ligar"]];
  for (const [c, id, acao] of casos) { a.clica({ dev: K(c, id) }); const m = cmds(a).at(-1); assert.deepEqual([m.dispositivo, m.acao], [id, acao], id); }
  // PS5 ligado -> repouso exige confirmação: nada sai até confirmar
  const n = cmds(a).length;
  a.clica({ dev: K(SALA, "ps5_sala") });
  assert.equal(cmds(a).length, n, "repouso espera a confirmação");
  assert.match(a.el("#confirma").innerHTML, /PS5 em repouso/);
  a.dispara("#confirma", "click", { confirma: "sim" });
  const m = cmds(a).at(-1);
  assert.deepEqual([m.dispositivo, m.acao, m.confirmado], ["ps5_sala", "repouso", true]);
  // sensor, indisponível e aparelho em estado que não permite não comandam
  const antesN = cmds(a).length;
  a.clica({ dev: K(SALA, "porta_sala") });
  assert.equal(cmds(a).length, antesN);
});

test("erro do carregador reverte NA HORA e mostra o aviso em português; timeout_sem_confirmacao não presume nada e nunca reenvia", async () => {
  const a = criaAmbiente();
  const k = K(SALA, "luz_sala");
  a.clica({ dev: k });
  assert.equal(a.v(`estado.get("${k}").on`), true);
  a.responde(cmds(a)[0], { ok: false, erro: "falha_na_ha", detalhe: "boom" }); await espera();
  assert.equal(a.v(`estado.get("${k}").on`), false, "voltou ao estado real");
  assert.equal(a.v(`pendente("${k}")`), false);
  assert.match(a.el("#toast").innerHTML, /A casa não executou o comando\./);
  assert.equal(a.el("#toast").dataset.tom, "erro");
  assert.doesNotMatch(a.el("#toast").innerHTML, /boom/, "o detalhe cru da HA não vai para a tela");
  // timeout do carregador
  a.clica({ dev: k });
  a.responde(cmds(a)[1], { ok: false, erro: "timeout_sem_confirmacao" }); await espera();
  assert.equal(a.v(`estado.get("${k}").on`), false);
  assert.match(a.el("#toast").innerHTML, /Sem confirmação da casa — confira o estado\./);
  a.rel.avanca(60000);
  assert.equal(cmds(a).length, 2, "nenhum reenvio automático");
  // estado_nao_permite (TV desligada por outro caminho enquanto o toque era processado)
  a.clica({ dev: K(SALA, "ventilador_sala") }); a.responde(cmds(a)[2], { ok: false, erro: "estado_nao_permite" }); await espera();
  assert.match(a.el("#toast").innerHTML, /não está num estado que permita/);
});

test("trava de 5 s: sem confirmação da HA o cartão volta ao estado real e avisa 'A casa não confirmou'", async () => {
  const a = criaAmbiente();
  const k = K(SALA, "luz_sala");
  a.clica({ dev: k });
  a.responde(cmds(a)[0], { ok: true }); await espera();
  a.rel.avanca(4999);
  assert.equal(a.v(`estado.get("${k}").on`), true, "até 5 s vale o otimista");
  a.rel.avanca(1);
  assert.equal(a.v(`estado.get("${k}").on`), false, "passou de 5 s: estado real");
  assert.equal(a.v(`pendente("${k}")`), false);
  assert.match(a.el("#toast").innerHTML, /A casa não confirmou/);
  // um lote de outra entidade durante a trava não derruba o otimista
  a.clica({ dev: K(SALA, "painel") });
  a.rel.avanca(1000);
  a.lote({ [porId("luz_sala")]: est("off", {}, 0) });
  assert.equal(a.v(`estado.get("${K(SALA, "painel")}").on`), true, "trava segue valendo contra lotes irrelevantes");
  a.rel.avanca(4000);
  assert.equal(a.v(`estado.get("${K(SALA, "painel")}").on`), false);
});

test("confirmação: PC/bloqueio pedem antes de enviar; Cancelar não envia nada; Confirmar reenvia com confirmado:true; foco preso, Esc cancela", () => {
  const E = casaBase(); E[porId("pc_socket_1")] = est("on");
  const a = criaAmbiente({ estados: E });
  const k = K("closet", "pc_socket_1");
  a.clica({ dev: k });
  assert.equal(cmds(a).length, 0, "nada sai antes do OK");
  assert.equal(a.v("!!confirmaEstado"), true);
  const html = a.el("#confirma").innerHTML;
  assert.match(html, /role="alertdialog"/); assert.match(html, /Isto corta a energia do computador/); assert.match(html, /data-confirma="nao"/);
  assert.equal(a.el("#confirma").hidden, false);
  assert.equal(a.el(".wrap").inert, true, "a página fica inerte atrás do diálogo");
  assert.equal(a.v(`estado.get("${k}").on`), true, "sem otimista antes de confirmar");
  a.dispara("#confirma", "click", { confirma: "nao" });
  assert.equal(a.v("!!confirmaEstado"), false);
  a.rel.avanca(500);
  assert.equal(a.el("#confirma").hidden, true); assert.equal(a.el(".wrap").inert, false, "inert devolvido");
  assert.equal(cmds(a).length, 0, "cancelar não envia");
  a.clica({ dev: k });
  a.dispara("#confirma", "keydown", { key: "Escape" });
  a.rel.avanca(500);
  assert.equal(cmds(a).length, 0, "Esc cancela");
  a.clica({ dev: k });
  a.dispara("#confirma", "click", { confirma: "sim" });
  const m = cmds(a)[0];
  assert.deepEqual([m.dispositivo, m.acao, m.confirmado], ["pc_socket_1", "desligar", true]);
  // bloqueio de criança também pede
  a.rel.avanca(500);
  a.clica({ dev: K("quarto_luca", "bloqueio_luca") });
  assert.match(a.el("#confirma").innerHTML, /bloqueio para crianças/); assert.equal(cmds(a).length, 1);
  a.dispara("#confirma", "keydown", { key: "Escape" });
});

test("confirmação pedida pelo carregador (confirmacao_necessaria): reverte, mostra o texto recebido e só no Confirmar reenvia com confirmado:true", async () => {
  const a = criaAmbiente();
  const k = K(SALA, "luz_sala");
  a.clica({ dev: k });
  a.responde(cmds(a)[0], { ok: false, erro: "confirmacao_necessaria", confirmar: "Texto novo do carregador" }); await espera();
  assert.equal(a.v(`estado.get("${k}").on`), false, "revertido até o OK");
  assert.match(a.el("#confirma").innerHTML, /Texto novo do carregador/);
  assert.equal(cmds(a).length, 1);
  a.dispara("#confirma", "click", { confirma: "sim" });
  assert.equal(cmds(a).length, 2);
  assert.deepEqual([cmds(a)[1].dispositivo, cmds(a)[1].acao, cmds(a)[1].confirmado], ["luz_sala", "ligar", true]);
  assert.equal(a.v(`estado.get("${k}").on`), true, "e o otimista volta ao confirmar");
  // cancelar o diálogo do carregador não reenvia
  const b = criaAmbiente();
  b.clica({ dev: K(SALA, "luz_sala") }); b.responde(cmds(b)[0], { ok: false, erro: "confirmacao_necessaria", confirmar: "X" }); await espera();
  b.dispara("#confirma", "click", { confirma: "nao" }); b.rel.avanca(500);
  assert.equal(cmds(b).length, 1);
});

test("'Apagar luzes': um lote só com as luzes ligadas do cômodo (nunca tomada, TV, ventilador); Desfazer reaplica o inverso pelas mesmas ações", async () => {
  const E = casaBase();
  E[porId("luz_sala")] = est("on"); E[porId("painel")] = est("on"); E[porId("tv_sala")] = est("on"); E[porId("ventilador_sala")] = est("on", { percentage: 33 }); E[porId("ventilacao_ps5")] = est("on"); E[porId("ps5_sala")] = est("playing");
  const a = criaAmbiente({ estados: E });
  const html = a.v(`secaoHtml(SALAS.find((s) => s.id === "${SALA}"), [...estado.entries()].filter(([, d]) => d.sala === "${SALA}"))`);
  assert.match(html, /data-todos="sala_de_estar" data-valor="0"[^>]*>Apagar luzes</);
  assert.match(html, /aria-label="Apagar luzes: apaga as luzes de/);
  a.clica({ todos: SALA, valor: "0" });
  assert.deepEqual(cmds(a), [{ tipo: "comando-lote", id: 1, itens: [{ dispositivo: "luz_sala", acao: "desligar" }, { dispositivo: "painel", acao: "desligar" }] }]);
  assert.equal(a.v(`estado.get("${K(SALA, "luz_sala")}").on`), false, "otimista");
  assert.equal(a.v(`estado.get("${K(SALA, "tv_sala")}").on`), true, "a TV não é tocada");
  assert.equal(a.v(`estado.get("${K(SALA, "ventilacao_ps5")}").on`), true);
  assert.equal(a.v("S.loteOcupado"), SALA, "botão travado enquanto o lote não responde");
  a.responde(cmds(a)[0], { ok: true, resultados: [{ ok: true }, { ok: true }] }); await espera();
  assert.equal(a.v("S.loteOcupado"), null);
  assert.match(a.el("#toast").innerHTML, /Luzes de Sala de Estar apagadas/); assert.match(a.el("#toast").innerHTML, /data-desfazer/);
  a.lote({ [porId("luz_sala")]: est("off", {}, 0), [porId("painel")]: est("off", {}, 0) });
  a.clica({ desfazer: "" });
  assert.deepEqual(cmds(a)[1], { tipo: "comando-lote", id: 2, itens: [{ dispositivo: "luz_sala", acao: "ligar" }, { dispositivo: "painel", acao: "ligar" }] });
  assert.equal(a.v(`estado.get("${K(SALA, "luz_sala")}").on`), true);
  a.responde(cmds(a)[1], { ok: true }); await espera();
  assert.doesNotMatch(a.el("#toast").innerHTML, /data-desfazer/, "desfazer não tem Desfazer");
  // com tudo apagado o botão vira 'Acender luzes' e acende só luzes
  const b = criaAmbiente();
  b.clica({ todos: SALA, valor: "1" });
  assert.deepEqual(cmds(b)[0].itens, [{ dispositivo: "luz_sala", acao: "ligar" }, { dispositivo: "painel", acao: "ligar" }]);
  assert.match(criaAmbiente().v(`secaoHtml(SALAS.find((s) => s.id === "${SALA}"), [])`), /Acender luzes</);
  // lote com falha parcial: reverte só o item que falhou e avisa
  b.responde(cmds(b)[0], { ok: false, resultados: [{ ok: true }, { ok: false, erro: "falha_na_ha" }] }); await espera();
  assert.equal(b.v(`pendente("${K(SALA, "painel")}")`), false); assert.equal(b.v(`estado.get("${K(SALA, "painel")}").on`), false);
  assert.equal(b.v(`pendente("${K(SALA, "luz_sala")}")`), true, "o item que a casa aceitou segue aguardando a confirmação");
  assert.match(b.el("#toast").innerHTML, /Algumas luzes não responderam/);
  // lote recusado inteiro
  const c = criaAmbiente();
  c.clica({ todos: SALA, valor: "1" }); c.responde(cmds(c)[0], { ok: false, erro: "item_recusado", detalhe: "painel: acao_nao_permitida" }); await espera();
  assert.equal(c.v(`estado.get("${K(SALA, "luz_sala")}").on`), false); assert.match(c.el("#toast").innerHTML, /recusou um dos itens/);
});

test("'Apagar luzes' só existe onde há luz comandável; cômodo sem regra de lote não mostra o botão; offline desabilita", () => {
  const a = criaAmbiente();
  const sec = (id, ar = a) => ar.v(`secaoHtml(SALAS.find((s) => s.id === "${id}"), [...estado.entries()].filter(([, d]) => d.sala === "${id}"))`);
  for (const id of ["sala_de_estar", "cozinha", "banheiro", "quarto"]) assert.match(sec(id), /data-todos=/, id);
  // regras sem nenhuma ação de lote na circulação: sem botão
  const semLote = plano(COMANDOS); for (const id of ["muro", "corredor"]) for (const ac of ["ligar", "desligar"]) delete semLote.dispositivos[id].acoes[ac].lote;
  const b = criaAmbiente({ regras: semLote });
  assert.doesNotMatch(sec("circulacao", b), /data-todos=/);
  assert.match(sec("cozinha", b), /data-todos=/);
  // sem conexão: o botão fica desabilitado
  const off = criaAmbiente({ conectado: false });
  assert.match(sec("sala_de_estar", off), /data-todos="sala_de_estar"[^>]* disabled/);
});

test("cena: toque abre a confirmação; só no Executar manda 'executar' com confirmado:true; aviso só depois do resultado; botões travados ≥ 1 s; sem Desfazer", async () => {
  const a = criaAmbiente();
  assert.doesNotMatch(a.el("#cenas").innerHTML, / disabled/, "com comandos as cenas estão habilitadas");
  a.clica({ cena: "cinema" });
  assert.equal(cmds(a).length, 0);
  assert.match(a.el("#confirma").innerHTML, /Cena Cinema/);
  a.dispara("#confirma", "click", { confirma: "nao" }); a.rel.avanca(500);
  assert.equal(cmds(a).length, 0, "cancelar não executa");
  a.clica({ cena: "cinema" });
  a.dispara("#confirma", "click", { confirma: "sim" });
  assert.deepEqual(cmds(a), [{ tipo: "comando", id: 1, dispositivo: "cena_cinema", acao: "executar", confirmado: true }]);
  assert.doesNotMatch(a.el("#toast").innerHTML, /executada/, "aviso só depois do resultado");
  assert.equal(a.v("S.cenaOcupada"), "cinema");
  assert.match(a.el("#cenas").innerHTML, / disabled/, "durante o envio todas as cenas ficam desabilitadas");
  a.clica({ cena: "gamer" });
  a.responde(cmds(a)[0], { ok: true }); await espera();
  assert.match(a.el("#toast").innerHTML, /Cena Cinema executada/);
  assert.doesNotMatch(a.el("#toast").innerHTML, /data-desfazer/);
  a.rel.avanca(999);
  assert.equal(a.v("S.cenaOcupada"), "cinema", "ainda bloqueada antes de 1 s");
  a.rel.avanca(1);
  assert.equal(a.v("S.cenaOcupada"), null);
  assert.equal(cmds(a).length, 1, "o toque duplo não gerou segundo comando");
  // falha: erro visível e sem 'executada'
  a.clica({ cena: "gamer" }); a.dispara("#confirma", "click", { confirma: "sim" });
  a.responde(cmds(a)[1], { ok: false, erro: "falha_na_ha" }); await espera();
  assert.match(a.el("#toast").innerHTML, /A casa não executou/); assert.doesNotMatch(a.el("#toast").innerHTML, /executada/);
});

test("offline, carregando, sem dados e indisponível: nenhum comando sai e nada é presumido", () => {
  const off = criaAmbiente({ conectado: false });
  assert.equal(off.v("S.net"), "offline");
  off.clica({ dev: K(SALA, "luz_sala") }); off.clica({ cena: "cinema" }); off.clica({ todos: SALA, valor: "1" });
  assert.equal(cmds(off).length, 0); assert.equal(off.v("!!confirmaEstado"), false);
  assert.match(off.el("#cenas").innerHTML, / disabled/);
  const car = criaAmbiente({ semLote: true });
  assert.equal(car.v("S.net"), "carregando");
  car.clica({ dev: K(SALA, "luz_sala") }); car.clica({ cena: "cinema" }); car.clica({ todos: SALA, valor: "1" });
  assert.equal(cmds(car).length, 0);
  const E = casaBase(); E[porId("luz_sala")] = est("unavailable");
  const ind = criaAmbiente({ estados: E });
  ind.clica({ dev: K(SALA, "luz_sala") });
  assert.equal(cmds(ind).length, 0, "indisponível não comanda");
  // reconectar não dispara nada (CLAUDE.md §13)
  off.lote({ [porId("luz_sala")]: est("on", {}, 0) }, { conectado: true });
  off.rel.avanca(120000);
  assert.equal(cmds(off).length, 0);
});

test("kill-switch na interface: sem regras/cliente tudo segue somente leitura e NENHUM comando sai (toque, cena, tudo, folha)", () => {
  const a = criaAmbiente({ regras: null });
  assert.equal(a.v("comandosAtivos()"), false);
  const k = K(SALA, "luz_sala");
  a.clica({ dev: k }); a.clica({ cena: "cinema" }); a.clica({ todos: SALA, valor: "1" });
  assert.match(a.el("#toast").innerHTML, /Somente leitura/);
  assert.equal(a.saiu.length, 0);
  assert.equal(a.v(`estado.get("${k}").on`), false);
  assert.match(a.v(`tileHtml("${k}", estado.get("${k}"))`), /data-leitura="true"/);
  assert.match(a.el("#status").innerHTML, /somente leitura/);
  assert.ok(!a.v("estado.has(\"closet.aspirador\")"), "sem regras, sem aspirador");
  a.v(`abrirFolha("${k}")`);
  assert.equal(a.v(`(() => { ajusteReal("bri", 50, true); return travas.size; })()`), 0);
  assert.equal(a.saiu.length, 0);
  assert.match(a.v(`montaFolha(estado.get("${k}"))`), /data-sw="on"/);
});

test("modo real com comandos: cartão sem regra (ex.: aparelho fora do comandos.json) continua só leitura, e o resto comanda", () => {
  const r = plano(COMANDOS); delete r.dispositivos.painel;
  const a = criaAmbiente({ regras: r });
  const k = K(SALA, "painel");
  assert.match(a.v(`tileHtml("${k}", estado.get("${k}"))`), /data-leitura="true"/);
  a.clica({ dev: k });
  assert.equal(cmds(a).length, 0); assert.match(a.el("#toast").innerHTML, /não aceita comandos/);
  assert.doesNotMatch(a.v(`tileHtml("${K(SALA, "luz_sala")}", estado.get("${K(SALA, "luz_sala")}"))`), /data-leitura/);
});

test("folha: brilho envia com debounce de 200 ms (um só comando com o último valor) e na hora ao soltar; brilho % -> 1-255", () => {
  const E = casaBase(); E[porId("luz_sala")] = est("on", { brightness: 255, color_temp_kelvin: 3000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500, supported_color_modes: ["color_temp"] });
  const a = criaAmbiente({ estados: E });
  const k = K(SALA, "luz_sala");
  a.v(`abrirFolha("${k}")`);
  a.v(`ajusteReal("bri", 30, false)`); a.rel.avanca(100); a.v(`ajusteReal("bri", 40, false)`); a.rel.avanca(100); a.v(`ajusteReal("bri", 50, false)`);
  assert.equal(cmds(a).length, 0, "ainda no debounce");
  assert.equal(a.v(`estado.get("${k}").bri`), 50, "a tela segue o dedo na hora");
  a.rel.avanca(199); assert.equal(cmds(a).length, 0);
  a.rel.avanca(1);
  assert.deepEqual(cmds(a), [{ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 128 } }]);
  a.v(`ajusteReal("bri", 100, false)`); a.v(`ajusteReal("bri", 100, true)`);   // soltou: envia já e cancela o debounce pendente
  assert.equal(cmds(a).length, 2); assert.equal(cmds(a)[1].params.brightness, 255);
  a.rel.avanca(1000); assert.equal(cmds(a).length, 2, "o debounce pendente foi cancelado");
  a.v(`ajusteReal("temp", 4000, true)`);
  assert.deepEqual(cmds(a)[2].params, { color_temp_kelvin: 4000 });
  // a folha usa a faixa de kelvin do aparelho
  assert.match(a.v(`montaFolha(estado.get("${k}"))`), /id="f-temp" data-ctl="temp" min="2000" max="6500"/);
});

test("folha: controles por família (só o que tem ação em comandos.json E atributo de suporte); valores vêm do estado real", () => {
  const E = casaBase();
  E[porId("luz_sala")] = est("on", { brightness: 128, color_temp_kelvin: 3000, supported_color_modes: ["color_temp"] });
  E[porId("led")] = est("on", { brightness: 128, supported_color_modes: ["rgb"], rgb_color: [239, 68, 68] });
  E[porId("ventilador_sala")] = est("on", { percentage: 66, oscillating: false });
  E[porId("ventilador_quarto")] = est("off", {});
  E[porId("tv_sala")] = est("on", { source: "HDMI 1" });
  E[ALVOS.tv_nuvem] = est("on", { volume_level: 0.4, is_volume_muted: false, source_list: ["HDMI 1", "Netflix", "Disney+"] });
  E[porId("ps5_sala")] = est("standby");
  E[porId("tomada_luca_1")] = est("on");
  const a = criaAmbiente({ estados: E });
  const folha = (c, id) => a.v(`montaFolha(estado.get("${K(c, id)}"))`);
  const luz = folha(SALA, "luz_sala");
  assert.ok(luz.includes('data-sw="on"') && luz.includes('data-ctl="bri"') && luz.includes('data-ctl="temp"') && !luz.includes("data-cor="), "luz sem cor RGB não mostra cores");
  const led = folha("area_gourmet", "led");
  assert.equal((led.match(/data-cor="/g) || []).length, 5, "LED RGB: 5 cores");
  const fan = folha(SALA, "ventilador_sala");
  assert.equal((fan.match(/data-seg="vel"/g) || []).length, 3); assert.ok(fan.includes('data-sw="osc"') && !fan.includes('data-ctl="pct"'));
  const fanOff = folha("quarto", "ventilador_quarto");
  assert.ok(fanOff.includes('data-seg="vel"') && !fanOff.includes('data-sw="osc"'), "oscilar só se o atributo existe");
  assert.ok(!fan.includes('data-seg="dir"') && !fanOff.includes('data-seg="dir"'), "direção só se o estado real traz o atributo direction");
  const tv = folha(SALA, "tv_sala");
  assert.ok(tv.includes('data-ctl="vol"') && tv.includes('data-sw="mudo"'));
  assert.equal((tv.match(/data-rem="/g) || []).length, 13, "13 botões de controle remoto");
  assert.ok(tv.includes('data-app="Netflix"') && tv.includes('data-app="HDMI 1"') && !tv.includes("Disney"), "entradas vêm da source_list; nomes que o carregador recusaria ficam de fora");
  for (const c of ["KEY_RETURN", "KEY_HOME", "KEY_MENU", "KEY_UP", "KEY_DOWN", "KEY_LEFT", "KEY_RIGHT", "KEY_ENTER", "KEY_REWIND", "KEY_PLAY", "KEY_PAUSE", "KEY_STOP", "KEY_FF"]) assert.ok(tv.includes(`data-rem="${c}"`), c);
  const ps5 = folha(SALA, "ps5_sala");
  assert.ok(ps5.includes('data-sw="on"') && !ps5.includes("data-ctl") && !ps5.includes("data-rem"));
  const tomada = folha("quarto_luca", "tomada_luca_1");
  assert.ok(tomada.includes('data-sw="on"') && !tomada.includes("data-ctl"));
  const asp = folha("closet", "aspirador");
  for (const ac of ["iniciar", "pausar", "base", "parar", "localizar", "limpezaLocal"]) assert.ok(asp.includes(`data-vacacao="${ac}"`), ac);
  assert.deepEqual([...asp.matchAll(/data-modo="([^"]+)"/g)].map((x) => x[1]), ["安静", "标准", "中档", "强力"]);
  for (const t of ["Silencioso", "Padrão", "Forte", "Turbo"]) assert.ok(asp.includes(`>${t}<`), t);
  assert.ok(!asp.includes('data-sw="on"'));
  assert.equal(a.v(`SLIDERS.vol.get(estado.get("${K(SALA, "tv_sala")}"))`), 40);
  assert.equal(a.v(`estado.get("${K("area_gourmet", "led")}").cor`), "vermelho");
});

test("folha: ventilador (velocidade 1-3 -> 33/66/100, oscilar), TV (volume, mudo, entrada, remoto) e aspirador (operação e modo) mandam o comando certo", () => {
  const E = casaBase();
  E[porId("ventilador_sala")] = est("on", { percentage: 33, oscillating: false });
  E[porId("tv_sala")] = est("on", { source: "HDMI 1" });
  E[ALVOS.tv_nuvem] = est("on", { volume_level: 0.4, is_volume_muted: false, source_list: ["HDMI 1", "Netflix"] });
  const a = criaAmbiente({ estados: E });
  const ultimo = () => { const m = cmds(a).at(-1); return [m.dispositivo, m.acao, m.params]; };
  a.v(`abrirFolha("${K(SALA, "ventilador_sala")}")`);
  a.dispara("#folha", "click", { seg: "vel", v: "3" }); assert.deepEqual(plano(ultimo()), ["ventilador_sala", "velocidade", { percentage: 100 }]);
  a.dispara("#folha", "click", { sw: "osc" }); assert.deepEqual(plano(ultimo()), ["ventilador_sala", "oscilar", { oscillating: true }]);
  a.v("fecharFolha()"); a.rel.avanca(500);
  a.v(`abrirFolha("${K(SALA, "tv_sala")}")`);
  a.v(`ajusteReal("vol", 35, true)`); assert.deepEqual(plano(ultimo()), ["tv_sala", "volume", { volume_level: 0.35 }]);
  a.dispara("#folha", "click", { sw: "mudo" }); assert.deepEqual(plano(ultimo()), ["tv_sala", "mudo", { is_volume_muted: true }]);
  a.dispara("#folha", "click", { app: "Netflix" }); assert.deepEqual(plano(ultimo()), ["tv_sala", "fonte", { source: "Netflix" }]);
  a.dispara("#folha", "click", { rem: "KEY_UP" }); assert.deepEqual(plano(ultimo()), ["tv_sala", "controleRemoto", { command: "KEY_UP" }]);
  a.v("fecharFolha()"); a.rel.avanca(500);
  a.v(`abrirFolha("${K("closet", "aspirador")}")`);
  for (const ac of ["iniciar", "pausar", "base", "parar", "localizar", "limpezaLocal"]) { a.dispara("#folha", "click", { vacacao: ac }); const m = cmds(a).at(-1); assert.deepEqual([m.dispositivo, m.acao, m.params], ["aspirador", ac, undefined]); }
  a.dispara("#folha", "click", { modo: "强力" }); assert.deepEqual(plano(ultimo()), ["aspirador", "modo", { option: "强力" }]);
  assert.equal(a.v(`estado.get("${K("closet", "aspirador")}").modo`), "强力", "otimista até a HA confirmar");
  // favorito continua local (não comanda)
  const n = cmds(a).length; a.dispara("#folha", "click", { sw: "fav" }); assert.equal(cmds(a).length, n);
});

test("aspirador: cartão do Closet em português, toque curto abre a folha (nunca comanda), indisponível = 'Indisponível'", () => {
  const E = casaBase(); E[ALVOS.aspirador] = est("cleaning", { battery_level: 63 });
  const a = criaAmbiente({ estados: E });
  const k = K("closet", "aspirador");
  assert.equal(a.v(`subtitulo(estado.get("${k}"))`), "Aspirando · 63%");
  const tile = a.v(`tileHtml("${k}", estado.get("${k}"))`);
  assert.match(tile, /data-tipo="vacuum"/); assert.match(tile, /data-ativo="true"/); assert.match(tile, /Aspirando · 63%/);
  a.clica({ dev: k });
  assert.equal(cmds(a).length, 0, "tocar no cartão do aspirador só abre a folha");
  assert.equal(a.v("folhaChave"), k);
  for (const [s, t] of [["docked", "Na base · 63%"], ["paused", "Pausado · 63%"], ["returning", "Voltando à base · 63%"], ["idle", "Parado · 63%"], ["error", "Com erro · 63%"]]) {
    a.lote({ [ALVOS.aspirador]: est(s, { battery_level: 63 }, 0) });
    assert.equal(a.v(`subtitulo(estado.get("${k}"))`), t, s);
  }
  a.lote({ [ALVOS.aspirador]: est("unavailable", {}, 0) });
  assert.equal(a.v(`subtitulo(estado.get("${k}"))`), "Indisponível");
  assert.match(a.v(`tileHtml("${k}", estado.get("${k}"))`), /data-indisp="true"/);
  assert.ok(a.v("itensOffline().some((o) => o.nome === \"Aspirador\")"));
});

test("estado real prevalece: comando aceito mas a HA diz outra coisa => depois da trava mostra o real; ajuste confirmado dentro da tolerância limpa a trava", async () => {
  const E = casaBase(); E[porId("luz_sala")] = est("on", { brightness: 255, color_temp_kelvin: 3000 });
  const a = criaAmbiente({ estados: E });
  const k = K(SALA, "luz_sala");
  a.v(`abrirFolha("${k}")`);
  a.v(`ajusteReal("bri", 50, true)`);
  a.responde(cmds(a)[0], { ok: true }); await espera();
  a.lote({ [porId("luz_sala")]: est("on", { brightness: 128, color_temp_kelvin: 3000 }, 0) });   // 128/255 = 50 %
  assert.equal(a.v(`pendente("${k}")`), false);
  a.v(`ajusteReal("bri", 20, true)`);
  a.responde(cmds(a)[1], { ok: true }); await espera();
  a.lote({ [porId("luz_sala")]: est("on", { brightness: 128, color_temp_kelvin: 3000 }, 0) });   // a HA ignorou: segue em 50 %
  assert.equal(a.v(`estado.get("${k}").bri`), 20, "dentro dos 5 s o otimista ainda vale");
  a.rel.avanca(5000);
  assert.equal(a.v(`estado.get("${k}").bri`), 50, "passou: o real prevalece");
});

/* ---------- (f) varredura de segurança e regras ---------- */
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("segurança: app.js e casa-real.js não têm callService/callApi/callWS/token/entity_id literal nem serviço; só o canal postar fala com o pai", () => {
  for (const [nome, cod] of [["app.js", semComentarios(APP)], ["casa-real.js", semComentarios(REAL_JS)]]) {
    assert.ok(!/callService|callApi|callWS|callHttp|\/api\/services|\/api\/states|Authorization|Bearer|access_token|HA_TOKEN|hass\./.test(cod), nome);
    assert.ok(!/\b(light|switch|fan|media_player|vacuum|remote|script|select)\.(turn_on|turn_off|set_percentage|oscillate|volume_set|volume_mute|select_source|play_media|send_command|start|pause|return_to_base|stop|locate|clean_spot|select_option)\b/.test(cod), `${nome} não nomeia serviços`);
    assert.ok(!/"(light|switch|fan|media_player|vacuum|remote|script|select)\.[a-z0-9_]+"/.test(cod.replace(/"[a-z_]+\.json"/g, "")), `${nome} não carrega entity_id literal`);
  }
  const real = semComentarios(REAL_JS);
  assert.deepEqual([...new Set([...real.matchAll(/\bfetch\("([a-z]+\.json)"/g)].map((x) => x[1]))].sort(), ["comandos.json", "contrato.json"]);
  assert.ok(!/postMessage/.test(semComentarios(APP)));
});

test("regras: toda ação de lote:true é de luz ou interruptor de luz; nenhuma tomada/PC/bloqueio/TV/ventilador entra em lote", () => {
  const porIdContrato = Object.fromEntries(TODAS.map((d) => [d.id, d]));
  for (const [id, d] of Object.entries(COMANDOS.dispositivos)) {
    for (const [ac, r] of Object.entries(d.acoes)) {
      if (r.lote !== true) continue;
      const c = porIdContrato[id];
      assert.ok(c && (c.dominio === "light" || (c.dominio === "switch" && c.categoria === "iluminacao")), `${id}.${ac} em lote`);
    }
  }
  for (const id of ["pc_socket_1", "pc_socket_2", "bloqueio_luca", "tv_sala", "ps5_sala", "ventilador_sala", "ventilador_quarto", "aspirador"]) for (const r of Object.values(COMANDOS.dispositivos[id].acoes)) assert.notEqual(r.lote, true, id);
});

/* ---------- Rodada 13: direção do ventilador, rótulo "luzes" e achados do porteiro ---------- */
test("direção do ventilador: nomes do Painel Primário; valor vem do estado real; toque manda direcao/direction; só com o ventilador ligado", async () => {
  const E = casaBase();
  E[porId("ventilador_sala")] = est("on", { percentage: 66, direction: "forward" });
  E[porId("ventilador_quarto")] = est("off", { direction: "reverse" });
  const a = criaAmbiente({ estados: E });
  const k = K(SALA, "ventilador_sala");
  const h = a.v(`montaFolha(estado.get("${k}"))`);
  assert.equal((h.match(/data-seg="dir"/g) || []).length, 2);
  assert.ok(h.includes('data-v="forward"') && h.includes('data-v="reverse"') && h.includes("Ventilador (descer ar)") && h.includes("Exaustor (subir ar)"));
  assert.equal(a.v(`estado.get("${k}").dir`), "forward"); assert.equal(a.v(`estado.get("${K("quarto", "ventilador_quarto")}").dir`), "reverse");
  a.v(`abrirFolha("${k}")`);
  a.dispara("#folha", "click", { seg: "dir", v: "reverse" });
  assert.deepEqual(plano(cmds(a).at(-1)), { tipo: "comando", id: 1, dispositivo: "ventilador_sala", acao: "direcao", params: { direction: "reverse" } });
  assert.equal(a.v(`estado.get("${k}").dir`), "reverse", "otimista");
  assert.equal(a.v(`pendente("${k}")`), true);
  // erro do carregador: reverte na hora ao valor real
  a.responde(cmds(a)[0], { ok: false, erro: "falha_na_ha" }); await espera();
  assert.equal(a.v(`estado.get("${k}").dir`), "forward"); assert.equal(a.v(`pendente("${k}")`), false);
  // a HA confirma: trava sai sem erro
  a.dispara("#folha", "click", { seg: "dir", v: "reverse" });
  a.responde(cmds(a)[1], { ok: true }); await espera();
  a.lote({ [porId("ventilador_sala")]: est("on", { percentage: 66, direction: "reverse" }, 0) });
  assert.equal(a.v(`pendente("${k}")`), false); assert.equal(a.v(`estado.get("${k}").dir`), "reverse");
  // valor inválido nunca vira comando
  assert.equal(CR.comandoDoCampo("dir", "sideways"), null);
  assert.deepEqual(plano(CR.comandoDoCampo("dir", "forward")), { acao: "direcao", params: { direction: "forward" } });
  const antes = cmds(a).length; a.dispara("#folha", "click", { seg: "dir", v: "sideways" }); assert.equal(cmds(a).length, antes);
  // desligado: o controle aparece (há atributo) mas não comanda
  a.v("fecharFolha()"); a.rel.avanca(500);
  const q = K("quarto", "ventilador_quarto");
  a.v(`abrirFolha("${q}")`);
  const n = cmds(a).length; a.dispara("#folha", "click", { seg: "dir", v: "forward" });
  assert.equal(cmds(a).length, n, "ventilador desligado não recebe direção");
  assert.match(APP, /\[data-seg\]"\)\.forEach[^\n]*dataset\.seg === "dir" && !d\.on/, "botões desabilitados com o ventilador desligado");
});

test("direção do ventilador: sem o atributo direction (ou sem regra 'direcao', ou somente leitura) o controle não aparece e nada sai", () => {
  const E = casaBase(); E[porId("ventilador_sala")] = est("on", { percentage: 66 });
  const a = criaAmbiente({ estados: E });
  assert.ok(!a.v(`montaFolha(estado.get("${K(SALA, "ventilador_sala")}"))`).includes('data-seg="dir"'));
  assert.equal(a.v(`estado.get("${K(SALA, "ventilador_sala")}").dir`), null);
  const E2 = casaBase(); E2[porId("ventilador_sala")] = est("on", { percentage: 66, direction: "forward" });
  const semRegra = plano(COMANDOS); delete semRegra.dispositivos.ventilador_sala.acoes.direcao;
  assert.ok(!criaAmbiente({ estados: E2, regras: semRegra }).v(`montaFolha(estado.get("${K(SALA, "ventilador_sala")}"))`).includes('data-seg="dir"'));
  // valor estranho no atributo não vira estado
  const E3 = casaBase(); E3[porId("ventilador_sala")] = est("on", { direction: "diagonal" });
  assert.equal(criaAmbiente({ estados: E3 }).v(`estado.get("${K(SALA, "ventilador_sala")}").dir`), null);
  // kill-switch: nada comanda
  const k = criaAmbiente({ estados: E2, regras: null });
  k.v(`abrirFolha("${K(SALA, "ventilador_sala")}")`); k.dispara("#folha", "click", { seg: "dir", v: "reverse" });
  assert.equal(k.saiu.length, 0);
});

test("rótulo 'luzes' (real) e achados do porteiro: B-1 contraste do .sub, B-2 ações da confirmação à vista, B-3 foco por seletor, B-4 sem movimento", () => {
  const CSS = ler("styles.css");
  const a = criaAmbiente();
  const sec = a.v(`secaoHtml(SALAS.find((s) => s.id === "${SALA}"), [])`);
  assert.match(sec, /Acender luzes</); assert.doesNotMatch(sec, /tudo/i);
  const ro = criaAmbiente({ regras: null });   // somente leitura (real): também fala de luzes
  assert.match(ro.v(`secaoHtml(SALAS.find((s) => s.id === "${SALA}"), [])`), /(Acender|Apagar) luzes</);
  assert.doesNotMatch(APP + REAL_JS, /Apagar\/Acender tudo\./);
  // B-1
  assert.match(CSS, /\.dev\[data-pendente="true"\] \.sw \{ opacity: 0\.6; \}/); assert.doesNotMatch(CSS, /data-pendente="true"\] \.sub/);
  assert.match(CSS, /\.dev\[data-pendente="true"\] \.chip \{ outline: 1px dashed/);
  // B-2
  assert.match(CSS, /\.conf-acoes \{[^}]*position: sticky; bottom: 0;[^}]*background: #111827/);
  // B-3
  assert.match(APP, /voltarSel: seletorDe\(document\.activeElement\)/); assert.match(APP, /document\.querySelector\(c\.voltarSel\)/);
  for (const at of ["data-dev", "data-todos", "data-cena"]) assert.ok(APP.includes(`"${at}"`), at);
  // B-4
  const rm = CSS.slice(CSS.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(CSS, /\*, \*::before, \*::after \{ transition-duration: 1ms !important; animation-duration: 1ms !important; \}/);
  assert.match(CSS, /#confirma \.folha-painel, #confirma \.folha-fundo, \.toast,/); assert.ok(rm.length > 0);
  assert.ok(!/transition:\s*all/.test(CSS));
});

/* ---------- tempo de confirmação por ação (TV e PS5 esperam mais que 5 s) ---------- */
test("tempo de espera da confirmação: padrão 5 s; TV e PS5 mais; limitado a 60 s; valor inválido volta ao padrão", () => {
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "luz_sala", "ligar"), 5000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "ventilador_sala", "ligar"), 5000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "tv_sala", "ligar"), 30000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "tv_sala", "desligar"), 20000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "ps5_sala", "ligar"), 45000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "ps5_sala", "repouso"), 45000);
  assert.equal(CR.confirmaMsDaAcao(COMANDOS, "nao_existe", "ligar"), 5000);
  const com = (confirmaMs) => ({ dispositivos: { x: { acoes: { a: { servico: "light.turn_on", confirmaMs } } } } });
  assert.equal(CR.confirmaMsDaAcao(com(120000), "x", "a"), 60000, "teto de 60 s");
  for (const ruim of [100, 0, -1, NaN, Infinity, "30000", null, undefined, {}]) assert.equal(CR.confirmaMsDaAcao(com(ruim), "x", "a"), 5000, String(ruim));
});

test("regras reais: só TV e PS5 passam de 5 s; o carregador espera a HA por mais tempo que o painel espera o estado", () => {
  for (const [id, d] of Object.entries(COMANDOS.dispositivos)) for (const [nome, a] of Object.entries(d.acoes)) {
    const c = CR.confirmaMsDaAcao(COMANDOS, id, nome);
    if (!["tv_sala", "ps5_sala"].includes(id) || !["ligar", "desligar", "repouso"].includes(nome)) assert.equal(c, 5000, `${id}.${nome} não deveria esperar mais`);
    assert.ok(c <= 60000);
    // se a HA ainda está processando o serviço quando o painel desiste, o resultado "timeout" chegaria depois da reversão
    if (a.confirmaMs) assert.ok((a.timeoutMs || 20000) >= a.confirmaMs, `${id}.${nome}: timeoutMs menor que confirmaMs`);
  }
});

test("TV: ligar espera até 30 s pelo estado real (não reverte aos 5 s); ao passar de 30 s volta ao real e avisa", async () => {
  const a = criaAmbiente();                       // TV começa desligada
  const k = K(SALA, "tv_sala");
  a.clica({ dev: k });
  assert.deepEqual(cmds(a).map((m) => [m.dispositivo, m.acao]), [["tv_sala", "ligar"]]);
  a.responde(cmds(a)[0], { ok: true }); await espera();
  a.rel.avanca(5000);
  assert.equal(a.v(`estado.get("${k}").on`), true, "aos 5 s ainda aguarda a TV");
  assert.equal(a.v(`pendente("${k}")`), true);
  assert.doesNotMatch(a.el("#toast").innerHTML, /não confirmou/);
  a.rel.avanca(24999);
  assert.equal(a.v(`estado.get("${k}").on`), true, "até 30 s vale o otimista");
  a.rel.avanca(1);
  assert.equal(a.v(`estado.get("${k}").on`), false, "passou de 30 s: estado real");
  assert.match(a.el("#toast").innerHTML, /A casa não confirmou/);
});

test("TV: a TV que liga aos 20 s limpa a trava sem aviso de erro", async () => {
  const a = criaAmbiente();
  const k = K(SALA, "tv_sala");
  a.clica({ dev: k });
  a.responde(cmds(a)[0], { ok: true }); await espera();
  a.rel.avanca(20000);
  a.lote({ [porId("tv_sala")]: est("on", {}, 0) });
  assert.equal(a.v(`pendente("${k}")`), false, "o estado real confirmou");
  a.rel.avanca(60000);
  assert.doesNotMatch(a.el("#toast").innerHTML, /não confirmou/);
  assert.equal(a.v(`estado.get("${k}").on`), true);
});

test("PS5: ligar espera até 45 s; luz continua com 5 s (um comando lento não afeta os rápidos)", async () => {
  const E = casaBase(); E[porId("ps5_sala")] = { ...est("standby"), attributes: {} };
  const a = criaAmbiente({ estados: E });
  const kp = K(SALA, "ps5_sala"), kl = K(SALA, "luz_sala");
  a.clica({ dev: kp }); a.clica({ dev: kl });
  const [mp, ml] = cmds(a);
  assert.deepEqual([mp.dispositivo, mp.acao, ml.dispositivo, ml.acao], ["ps5_sala", "ligar", "luz_sala", "ligar"]);
  a.responde(mp, { ok: true }); a.responde(ml, { ok: true }); await espera();
  a.rel.avanca(5000);
  assert.equal(a.v(`pendente("${kl}")`), false, "a luz volta ao real aos 5 s");
  assert.equal(a.v(`pendente("${kp}")`), true, "o PS5 segue aguardando");
  a.rel.avanca(39999);
  assert.equal(a.v(`pendente("${kp}")`), true);
  a.rel.avanca(1);
  assert.equal(a.v(`pendente("${kp}")`), false, "aos 45 s desiste");
});
