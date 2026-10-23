// Painel Secundário, modo real SOMENTE LEITURA (fase A). Node puro, sem navegador, sem rede, sem HA.
// Rodar a partir da raiz do repositório:  node --test dashboard-lab/tests/*.test.mjs
// Cobre: adaptador puro (casa-real.js), a interface em modo real (app.js dentro de um `vm`), a ponte (conectar) com
// dublês de window/fetch, e a varredura de segurança (nenhum caminho de comando, nenhuma rede além de contrato.json).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");
const APP = ler("app.js"), ICONES = ler("icons.js"), REAL_JS = ler("casa-real.js"), HTML = ler("index.html");
const CARREGADOR = readFileSync(join(RAIZ, "..", "config", "www", "casa-painel-secundario.js"), "utf8");
const CONTRATO = JSON.parse(ler("contrato.json"));
const COMANDOS = JSON.parse(ler("comandos.json"));
const json = (o) => JSON.stringify(o);

/* ---------- Dublês de estado da HA ---------- */
const AGORA = Date.now();
const antes = (min) => new Date(AGORA - min * 60000).toISOString();
const est = (state, attributes = {}, min = 10) => ({ state, last_changed: antes(min), last_updated: antes(min), attributes });
const TODAS = CONTRATO.comodos.flatMap((c) => c.dispositivos);
const porId = (id) => TODAS.find((d) => d.id === id).entityId;

// Casa "tudo normal": tudo desligado/fechado, sensores com leitura, baterias a 80 %.
function casaBase() {
  const e = {};
  for (const d of TODAS) {
    const dom = d.dominio;
    if (dom === "light" || dom === "switch" || dom === "fan") e[d.entityId] = est("off");
    else if (dom === "media_player") e[d.entityId] = est("off");
    else if (dom === "binary_sensor") e[d.entityId] = est("off", { device_class: /porta/.test(d.entityId) ? "door" : "motion" });
    else if (dom === "sensor") e[d.entityId] = est(d.unidade === "°C" ? "26.34" : d.unidade === "%" && /umid/i.test(d.nome) ? "55" : d.unidade === "%" ? "80" : "12", { unit_of_measurement: d.unidade || "" });
    if (d.batteryEntityId) e[d.batteryEntityId] = est("80", { unit_of_measurement: "%", device_class: "battery" });
  }
  return e;
}

/* ---------- Adaptador puro ---------- */
function carregaAdaptador() {
  const ctx = { window: null, globalThis: null, Date, Math, JSON, Map, Set, Array, Object, String, Number, Promise, URLSearchParams, setTimeout: () => 0 };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(REAL_JS, ctx);
  return ctx.CasaReal;
}
const CR = carregaAdaptador();
const plano = (x) => JSON.parse(json(x));   // tira o realm do vm para comparar com deepEqual
const modelo = (estados) => plano(CR.estadoReal(CONTRATO, estados));
const cartaoDe = (m, id) => m.salas.flatMap((s) => s.cartoes).find((c) => c.id === id);

test("adaptador: domínio/categoria/device_class -> tipo de cartão (contrato inteiro)", () => {
  const m = modelo(casaBase());
  const cartoes = m.salas.flatMap((s) => s.cartoes);
  const esperado = {
    luz_sala: "light", painel: "light", ventilador_sala: "fan", ventilacao_ps5: "plug", tv_sala: "tv", ps5_sala: "console",
    porta_sala: "door", mov_lavanderia: "motion", porta_lavanderia: "door", mov_gourmet: "motion", porta_quarto: "door",
    led: "led", led_luca: "led", led_escritorio: "led", tomada_luca_1: "plug", bloqueio_luca: "plug", banheiro_switch_1: "light", banheiro_switch_2: "plug",
    ventilador_quarto: "fan", pc_socket_1: "plug",
  };
  for (const [id, tipo] of Object.entries(esperado)) assert.equal(cartaoDe(m, id)?.tipo, tipo, id);
  // sem cartão: temperatura, umidade, energia e o sensor de bateria avulso
  for (const id of ["temp_sala", "umid_sala", "energia_luca", "pc_energia", "bateria_porta_quarto"]) assert.equal(cartaoDe(m, id), undefined, id);
  assert.deepEqual(m.foraDeCena.map((f) => [f.nome, f.motivo]).sort(), [["Consumo Instantâneo", "energia"], ["Consumo PC", "energia"]]);
  // todo tipo usado existe em icons.js (a interface sabe desenhar)
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(ICONES, ctx);
  for (const t of new Set(cartoes.map((c) => c.tipo))) assert.ok(ctx.window.ICONES[t], "ícone ausente: " + t);
});

test("adaptador: liga/desliga por state, brilho 0-255 -> %, ventilador, TV e console", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("on", { brightness: 128, color_temp_kelvin: 3200 });
  e[porId("painel")] = est("on", {});                                                 // liga/desliga sem dimmer
  e[porId("ventilador_sala")] = est("on", { percentage: 66, oscillating: true });
  e[porId("tv_sala")] = est("on", { source: "HDMI 2", volume_level: 0.35, is_volume_muted: false });
  e[porId("ps5_sala")] = est("playing", { app_name: "Astro" });
  e[porId("ventilador_quarto")] = est("off", { percentage: null });
  const m = modelo(e);
  const luz = cartaoDe(m, "luz_sala");
  assert.deepEqual([luz.on, luz.bri, luz.temp, luz.dimmer], [true, 50, 3200, true]);
  const painel = cartaoDe(m, "painel");
  assert.deepEqual([painel.on, painel.bri, painel.dimmer], [true, null, false]);
  const fan = cartaoDe(m, "ventilador_sala");
  assert.deepEqual([fan.on, fan.pct, fan.vel, fan.osc], [true, 66, 2, true]);
  const tv = cartaoDe(m, "tv_sala");
  assert.deepEqual([tv.on, tv.app, tv.vol, tv.mudo], [true, "HDMI 2", 35, false]);
  assert.deepEqual([cartaoDe(m, "ps5_sala").on, cartaoDe(m, "ps5_sala").subOn], [true, "Astro"]);
  assert.equal(cartaoDe(m, "ventilador_quarto").on, false);
  assert.equal(cartaoDe(m, "luz_luca").on, false);
  // media_player: standby/off = desligado; idle/paused/on = ligado
  for (const [s, on] of [["standby", false], ["off", false], ["idle", true], ["paused", true], ["on", true]]) {
    e[porId("tv_sala")] = est(s); assert.equal(cartaoDe(modelo(e), "tv_sala").on, on, s);
  }
  // brilho nunca passa de 1..100 %
  e[porId("luz_sala")] = est("on", { brightness: 1 }); assert.equal(cartaoDe(modelo(e), "luz_sala").bri, 1);
  e[porId("luz_sala")] = est("on", { brightness: 255 }); assert.equal(cartaoDe(modelo(e), "luz_sala").bri, 100);
});

test("adaptador: unavailable, unknown, vazio, null e ausente são INDISPONÍVEIS (nunca desligado) e vão para o offline", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("unavailable");
  e[porId("painel")] = est("unknown");
  e[porId("ventilador_sala")] = est("");
  e[porId("tv_sala")] = null;                      // a HA não tem a entidade
  delete e[porId("ps5_sala")];                     // nunca recebida
  const m = modelo(e);
  for (const id of ["luz_sala", "painel", "ventilador_sala", "tv_sala", "ps5_sala"]) {
    const c = cartaoDe(m, id);
    assert.equal(c.indisp, true, id);
    assert.equal(c.on, false, id);
  }
  assert.equal(cartaoDe(m, "luz_luca").indisp, false);
  const off = m.offline.map((o) => o.nome);
  for (const n of ["Luz Sala", "Painel", "Ventilador", "TV Sala", "PlayStation 5"]) assert.ok(off.includes(n), n);
  assert.equal(m.offline.find((o) => o.nome === "TV Sala").acao, "A Home Assistant não tem esta entidade");
  assert.equal(CR.indisponivel({ state: "unavailable" }), true);
  assert.equal(CR.indisponivel({ state: "off" }), false);
  assert.equal(CR.indisponivel(null), true);
});

test("adaptador: bateria sem leitura NUNCA vira 0 (unknown, unavailable, vazio, texto, null) e faixas", () => {
  for (const s of ["unknown", "unavailable", "", "  ", "abc", "14%", null]) assert.equal(CR.lerBateria(s === null ? { state: null } : { state: s }), null, String(s));
  assert.equal(CR.lerBateria(null), null);
  assert.equal(CR.lerBateria({ state: "14" }), 14);
  assert.equal(CR.lerBateria({ state: "14.6" }), 15);
  assert.equal(CR.lerBateria({ state: "0" }), 0);      // zero de verdade é zero
  assert.equal(CR.lerBateria({ state: "101" }), null);
  assert.equal(CR.lerBateria({ state: "-3" }), null);
  assert.equal(CR.lerNumero(""), null); assert.equal(CR.lerNumero("unknown"), null); assert.equal(CR.lerNumero(true), null);
  const e = casaBase();
  e["sensor.sensor_porta_sala_bateria"] = est("14");
  e["sensor.porta_do_quarto_bateria"] = est("unknown");
  e["sensor.sensor_lavanderia_bateria"] = est("");
  e["sensor.door_sensor_2_bateria"] = est("30");
  e["sensor.sensor_area_gourmet_bateria"] = est("31");
  e["sensor.sensor_temperatura_e_humidade_bateria"] = null;
  const m = modelo(e);
  const por = Object.fromEntries(m.baterias.map((b) => [b.chave, b.bat]));
  assert.equal(m.baterias.length, 6);                                      // 6 aparelhos com bateria, sem duplicar o sensor avulso
  assert.deepEqual(por, {
    "sala_de_estar.temp_sala": null, "sala_de_estar.porta_sala": 14, "lavanderia.mov_lavanderia": null,
    "lavanderia.porta_lavanderia": 30, "area_gourmet.mov_gourmet": 31, "quarto.porta_quarto": null,
  });
  assert.equal(cartaoDe(m, "porta_quarto").bat, null);
  assert.equal(cartaoDe(m, "porta_sala").bat, 14);
});

test("adaptador: porta aberta/fechada, movimento e 'há X min' vêm de last_changed", () => {
  const e = casaBase();
  e[porId("porta_sala")] = est("on", { device_class: "door" }, 5);
  e[porId("porta_quarto")] = est("off", { device_class: "door" }, 95);
  e[porId("mov_gourmet")] = est("on", { device_class: "motion" }, 0);
  const m = modelo(e);
  const ps = cartaoDe(m, "porta_sala"), pq = cartaoDe(m, "porta_quarto"), mg = cartaoDe(m, "mov_gourmet");
  assert.deepEqual([ps.on, ps.sensor, ps.txtAlerta, ps.txtOk], [true, true, "Aberta", "Fechada"]);
  assert.equal(pq.on, false);
  assert.deepEqual([mg.on, mg.txtAlerta, mg.txtOk], [true, "Movimento", "Sem movimento"]);
  assert.equal((AGORA - ps.desde) / 60000, 5);
  assert.equal((AGORA - pq.desde) / 60000, 95);
  // device_class opening/window também é porta; sem device_class, a categoria 'seguranca' do contrato decide
  e[porId("porta_sala")] = est("on", { device_class: "opening" }); assert.equal(cartaoDe(modelo(e), "porta_sala").tipo, "door");
  e[porId("porta_sala")] = est("on", {}); assert.equal(cartaoDe(modelo(e), "porta_sala").tipo, "door");
});

test("adaptador: temperatura e umidade do cômodo (sem leitura = traço, nunca 0)", () => {
  const e = casaBase();
  assert.equal(modelo(e).salas.find((s) => s.id === "sala_de_estar").leitura, "26,3° · 55%");
  e[porId("temp_sala")] = est("unavailable"); e[porId("umid_sala")] = est("unknown");
  const s = modelo(e).salas.find((x) => x.id === "sala_de_estar");
  assert.equal(s.leitura, "—° · —%");
  assert.equal(s.temperatura, null);
  assert.equal(modelo(e).salas.find((x) => x.id === "quarto").leitura, "");   // cômodo sem sensor: nada inventado
});

test("adaptador: cenas reais do contrato (Boa noite, Chegada, Cinema, Jogar), sem nada para ligar", () => {
  const m = modelo({});
  assert.deepEqual(m.cenas.map((c) => c.nome), ["Boa noite", "Chegada", "Cinema", "Jogar"]);
  assert.ok(m.cenas.every((c) => c.liga.length === 0));
});

/* ---------- Interface em modo real ---------- */
function criaAmbiente(consulta = "?net=online") {
  const els = new Map();
  const el = (sel) => {
    if (!els.has(sel)) {
      els.set(sel, {
        sel, innerHTML: "", textContent: "", hidden: false, value: "", dataset: {}, children: [], style: { setProperty() {} },
        classList: { contains: () => false, add() {}, remove() {} }, setAttribute() {}, getAttribute: () => null, addEventListener() {},
        querySelector: () => el("filho:" + sel), querySelectorAll: () => [], focus() {}, closest: () => null, offsetWidth: 0, scrollHeight: 0, clientHeight: 0, scrollTop: 0, inert: false,
      });
    }
    return els.get(sel);
  };
  const ouvintes = {}; const armazenamento = new Map();
  const body = el("body"), docEl = el("html");
  const ctx = {
    console, URLSearchParams, Date, Math, JSON, Map, Set, Array, Object, String, Number, Promise,
    location: { search: consulta },
    localStorage: { getItem: (k) => (armazenamento.has(k) ? armazenamento.get(k) : null), setItem: (k, v) => armazenamento.set(k, String(v)) },
    navigator: {}, performance: { now: () => 0 },
    getComputedStyle: () => ({ getPropertyValue: () => "180", overflowY: "visible" }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    document: { querySelector: (s) => el(s), querySelectorAll: () => [], body, documentElement: docEl, activeElement: body, addEventListener: (t, f) => { (ouvintes[t] ||= []).push(f); } },
  };
  ctx.window = ctx; ctx.window.innerWidth = 1280;
  ctx.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  ctx.window.scrollTo = () => {}; ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(ICONES, ctx); vm.runInContext(REAL_JS, ctx); vm.runInContext(APP, ctx);
  const v = (codigo) => vm.runInContext(codigo, ctx);
  const clica = (data) => {
    const alvo = { dataset: data, hasAttribute: (n) => n.startsWith("data-") && Object.keys(data).some((k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) === n) };
    for (const f of ouvintes.click) f({ target: { closest: (s) => (s === ".dev" ? null : alvo) }, preventDefault() {} });
  };
  return { v, el, clica, armazenamento, ctx };
}
// ambiente em modo real, com o contrato carregado e (opcional) um lote de estados já recebido
function real(estados, { conectado = true } = {}) {
  const a = criaAmbiente();
  a.v(`iniciaReal(${json(CONTRATO)})`);
  if (estados) a.v(`recebeLote(${json({ tipo: "casa-estados", completo: true, conectado, estados })})`);
  return a;
}
const J = (a, c) => JSON.parse(a.v(`JSON.stringify(${c})`));
const CHV = (comodo, id) => `${comodo}.${id}`;

test("real: antes do primeiro lote = carregando (esqueletos, traços, nada de número inventado)", () => {
  const a = real();
  assert.equal(a.v("S.net"), "carregando");
  assert.equal(a.v("esq()"), true);
  assert.ok(a.el("#resumo").innerHTML.includes("sem leitura") && !/<b class="num">\d/.test(a.el("#resumo").innerHTML));
  assert.ok(a.el("#lista-comodos").innerHTML.includes("sk"));
  assert.ok(a.el("#manut-chip").innerHTML.includes("sem leitura"));
  assert.equal(a.v("SALAS.length"), 10);
});

test("real: primeiro lote = online; resumo com dados reais (luzes acesas/total, ativos, portas abertas); sem 'Ar livre'", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("on"); e[porId("led")] = est("on"); e[porId("tv_sala")] = est("on"); e[porId("porta_sala")] = est("on", { device_class: "door" });
  const a = real(e);
  assert.equal(a.v("S.net"), "online");
  const luzesTotal = TODAS.filter((d) => d.dominio === "light" || (d.dominio === "switch" && d.categoria === "iluminacao")).length;
  const r = a.el("#resumo").innerHTML;
  assert.ok(r.includes(`<b class="num">2/${luzesTotal}</b>`), r);
  assert.ok(r.includes('<b class="num">3</b> Ativos'), r);                 // 2 luzes + a TV
  assert.ok(r.includes('<b class="num">1</b> Porta aberta'), r);
  assert.ok(!r.includes("Ar livre") && !r.includes("simulado"));
  assert.match(a.el("#status").innerHTML, /Ao vivo · somente leitura/);
  assert.equal(a.el("#banner").hidden, true);
});

test("real: indisponível = cartão tracejado 'Indisponível', nunca 'Desligado', fora das contagens", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("unavailable"); e[porId("painel")] = est("on"); e[porId("tv_sala")] = null;
  const a = real(e);
  const html = a.v(`tileHtml("${CHV("sala_de_estar", "luz_sala")}", estado.get("${CHV("sala_de_estar", "luz_sala")}"))`);
  assert.ok(html.includes('data-indisp="true"') && html.includes("Indisponível") && !html.includes("Desligado"));
  const tv = a.v(`tileHtml("${CHV("sala_de_estar", "tv_sala")}", estado.get("${CHV("sala_de_estar", "tv_sala")}"))`);
  assert.ok(tv.includes("Indisponível") && !tv.includes("Desligado"));
  assert.equal(a.v(`acionaveis("sala_de_estar").some((d) => d.id === "luz_sala" || d.id === "tv_sala")`), false);
  const luzesTotal = TODAS.filter((d) => d.dominio === "light" || (d.dominio === "switch" && d.categoria === "iluminacao")).length;
  assert.ok(a.el("#resumo").innerHTML.includes(`<b class="num">1/${luzesTotal - 1}</b>`), a.el("#resumo").innerHTML);   // a luz indisponível sai do total
  // cabeçalho do cômodo mostra temperatura e umidade reais
  assert.ok(a.el("#lista-comodos").innerHTML.includes("26,3° · 55% · 1 de 4 ligados"), "cabeçalho da sala");
});

test("real: SOMENTE LEITURA - toque, cena, Apagar/Acender luzes e Desfazer não mudam nada e avisam", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("on");
  const a = real(e);
  const chave = CHV("sala_de_estar", "luz_sala");
  const antes = J(a, `[...estado].map(([k, d]) => [k, d.on, d.indisp])`);
  assert.equal(a.v("travado()"), true);
  assert.equal(a.v("semDados()"), false);
  a.clica({ dev: chave });
  assert.match(a.el("#toast").innerHTML, /Somente leitura/);
  assert.ok(!a.el("#toast").innerHTML.includes("data-desfazer"), "sem Desfazer: não há o que desfazer");
  a.clica({ cena: "cinema" }); a.clica({ todos: "sala_de_estar", valor: "0" }); a.clica({ desfazer: "" });
  assert.deepEqual(J(a, `[...estado].map(([k, d]) => [k, d.on, d.indisp])`), antes);
  assert.equal(a.v(`estado.get("${chave}").on`), true);
  assert.equal(a.v("S.cena"), null);
  // cartões e botões aparecem desabilitados de forma consistente
  const tile = a.v(`tileHtml("${chave}", estado.get("${chave}"))`);
  assert.ok(tile.includes('aria-disabled="true"') && tile.includes('data-leitura="true"') && tile.includes("Somente leitura"), tile);
  const cenas = a.el("#cenas").innerHTML;
  assert.equal((cenas.match(/<button/g) || []).length, 4);
  assert.equal((cenas.match(/ disabled/g) || []).length, 4);
  const sec = a.el("#lista-comodos").innerHTML;
  assert.ok(/data-todos="[^"]+" data-valor="[01]" disabled/.test(sec));
  assert.ok(!/data-todos="[^"]+" data-valor="[01]" (?!disabled)/.test(sec), "todo 'Apagar/Acender luzes' está desabilitado");
});

test("real: a folha abre para ler o estado real; comandos recusados, só o Favorito (local) funciona", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("on", { brightness: 128, color_temp_kelvin: 3200 });
  e[porId("ventilador_sala")] = est("on", { percentage: 66, oscillating: true });
  e[porId("tv_sala")] = est("on", { source: "HDMI 1", volume_level: 0.4, is_volume_muted: true });
  const a = real(e);
  const luz = a.v(`montaFolha(estado.get("${CHV("sala_de_estar", "luz_sala")}"))`);
  assert.ok(luz.includes('data-ctl="bri"') && luz.includes('data-ctl="temp"') && luz.includes('data-sw="fav"') && !luz.includes("data-cor"));
  const fan = a.v(`montaFolha(estado.get("${CHV("sala_de_estar", "ventilador_sala")}"))`);
  assert.ok(fan.includes('data-ctl="pct"') && fan.includes('data-sw="osc"') && !fan.includes("data-seg"));
  const tv = a.v(`montaFolha(estado.get("${CHV("sala_de_estar", "tv_sala")}"))`);
  assert.ok(tv.includes('data-ctl="vol"') && tv.includes('data-sw="mudo"') && !tv.includes("data-app"));
  assert.equal(a.v(`SLIDERS.bri.get(estado.get("${CHV("sala_de_estar", "luz_sala")}"))`), 50);
  assert.equal(a.v(`SLIDERS.vol.get(estado.get("${CHV("sala_de_estar", "tv_sala")}"))`), 40);
  // painel sem dimmer não ganha slider de brilho
  e[porId("painel")] = est("on", {}); a.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: { [porId("painel")]: e[porId("painel")] } })})`);
  assert.ok(!a.v(`montaFolha(estado.get("${CHV("sala_de_estar", "painel")}"))`).includes('data-ctl="bri"'));
  // comandos da folha são recusados; Favorito passa
  a.v(`abrirFolha("${CHV("sala_de_estar", "luz_sala")}")`);
  assert.equal(a.v("folhaChave"), CHV("sala_de_estar", "luz_sala"));
  assert.equal(a.v(`(() => { let n = 0; aplicarFolha(() => { n++; }); return n; })()`), 0);
  assert.equal(a.v(`(() => { let n = 0; aplicarFolha(() => { n++; }, true); return n; })()`), 1);
  // clique nos controles da folha (como o app trata): nada muda
  const antes = J(a, `estado.get("${CHV("sala_de_estar", "luz_sala")}").on`);
  a.v(`aplicarFolha((d) => { d.on = false; })`);
  assert.equal(J(a, `estado.get("${CHV("sala_de_estar", "luz_sala")}").on`), antes);
});

test("real: favoritos funcionam e persistem em chave própria (não misturam com o simulado)", () => {
  const a = real(casaBase());
  const k = CHV("sala_de_estar", "tv_sala");
  a.v(`estado.get("${k}").fav = true; salvaFavs(); renderComodos()`);
  assert.deepEqual(JSON.parse(a.armazenamento.get("lab.favoritos.real")), [k]);
  assert.ok(!a.armazenamento.has("lab.favoritos"));
  assert.ok(a.el("#lista-comodos").innerHTML.includes('aria-label="Favoritos"'));
});

test("real: subtítulos (sensor com 'há X min', brilho, ventilador, TV) e a hora vem do last_changed", () => {
  const e = casaBase();
  e[porId("porta_sala")] = est("on", { device_class: "door" }, 5);
  e[porId("luz_sala")] = est("on", { brightness: 153 });
  e[porId("ventilador_sala")] = est("on", { percentage: 50, oscillating: true });
  e[porId("tv_sala")] = est("on", { source: "Netflix" });
  const a = real(e);
  const sub = (id, c) => a.v(`subtitulo(estado.get("${CHV(c, id)}"))`);
  assert.match(sub("porta_sala", "sala_de_estar"), /^Aberta · há \d+ (min|h)/);
  assert.equal(sub("luz_sala", "sala_de_estar"), "Ligado · 60%");
  assert.equal(sub("ventilador_sala", "sala_de_estar"), "Ligado · 50% · Oscilando");
  assert.equal(sub("tv_sala", "sala_de_estar"), "Netflix");
  assert.equal(sub("painel", "sala_de_estar"), "Desligado");
  assert.match(sub("porta_quarto", "quarto"), /^Fechada · há /);
});

test("real: conectado:false = offline com o último estado; sem dados nenhum = offline 'Sem dados da casa' sem simular nada", () => {
  const e = casaBase(); e[porId("luz_sala")] = est("on");
  const a = real(e);
  a.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: false, estados: {} })})`);
  assert.equal(a.v("S.net"), "offline");
  assert.equal(a.v(`estado.get("${CHV("sala_de_estar", "luz_sala")}").on`), true);      // último estado conhecido, não limpa a tela
  assert.match(a.el("#status").innerHTML, /Offline · último estado/);
  assert.equal(a.el("#banner").hidden, false);
  assert.match(a.el("#banner-txt").textContent, /último estado conhecido/);
  assert.ok(a.el("#lista-comodos").innerHTML.includes('data-offline="true"'));
  a.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: {} })})`);
  assert.equal(a.v("S.net"), "online");
  // nada chegou em 8 s
  const b = real();
  b.v("semDadosDaCasa()");
  assert.equal(b.v("S.net"), "offline");
  assert.equal(b.v("esq()"), true);
  assert.match(b.el("#status").innerHTML, /Sem dados da casa/);
  assert.match(b.el("#banner-txt").textContent, /Sem dados da casa/);
  assert.ok(!/<b class="num">\d/.test(b.el("#resumo").innerHTML), "nenhum número inventado");
});

test("real: lote incremental atualiza só o que mudou e o completo substitui tudo", () => {
  const a = real(casaBase());
  const k = CHV("sala_de_estar", "luz_sala");
  a.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: { [porId("luz_sala")]: est("on") } })})`);
  assert.equal(a.v(`estado.get("${k}").on`), true);
  assert.equal(a.v(`estado.get("${CHV("sala_de_estar", "painel")}").on`), false);
  assert.equal(a.v(`estado.get("${CHV("sala_de_estar", "painel")}").indisp`), false);   // não vira indisponível por não vir no lote
  a.v(`recebeLote(${json({ tipo: "casa-estados", completo: true, conectado: true, estados: { [porId("painel")]: est("on") } })})`);
  assert.equal(a.v(`estado.get("${k}").indisp`), true);                                // completo sem a luz: sem leitura, indisponível
});

test("real: ajustes sobrevivem ao desligar (a HA zera brilho ao apagar), sem inventar para quem nunca foi lido", () => {
  const e = casaBase();
  e[porId("luz_sala")] = est("on", { brightness: 128 });
  const a = real(e);
  const k = CHV("sala_de_estar", "luz_sala");
  a.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: { [porId("luz_sala")]: est("off", { brightness: null }) } })})`);
  assert.deepEqual(J(a, `[estado.get("${k}").on, estado.get("${k}").bri, estado.get("${k}").semDimmer]`), [false, 50, false]);
  assert.equal(a.v(`subtitulo(estado.get("${k}"))`), "Desligado");
  // lâmpada nunca vista ligada: sem slider de brilho (não dá para saber se dimeriza)
  assert.ok(!a.v(`montaFolha(estado.get("${CHV("quarto", "luz_quarto")}"))`).includes('data-ctl="bri"'));
});

test("real: Manutenção usa baterias e offline reais (faixas 15/30, sem leitura própria, média sem os sem leitura)", () => {
  const e = casaBase();
  e["sensor.sensor_porta_sala_bateria"] = est("14");            // crítica
  e["sensor.porta_do_quarto_bateria"] = est("unknown");         // sem leitura
  e["sensor.sensor_lavanderia_bateria"] = est("30");            // baixa
  e["sensor.door_sensor_2_bateria"] = est("31");                // ok
  e["sensor.sensor_area_gourmet_bateria"] = est("100");
  e["sensor.sensor_temperatura_e_humidade_bateria"] = est("");  // sem leitura
  e[porId("tomada_luca_1")] = est("unavailable", {}, 180);
  const a = real(e);
  const bats = J(a, `itensBateria().map((i) => [i.bat, i.faixa])`);
  assert.deepEqual(bats, [[14, "critica"], [30, "baixa"], [31, "ok"], [100, "ok"], [null, "sem"], [null, "sem"]]);
  const r = J(a, "resumoManut()");
  assert.deepEqual([r.crit, r.baixa, r.ok, r.sem, r.total, r.offline], [1, 1, 2, 2, 6, 1]);
  assert.equal(r.media, Math.round((14 + 30 + 31 + 100) / 4));
  assert.equal(r.nivel, "critico");
  assert.equal(r.pend, 1 + 1 + 2 + 1);
  assert.match(a.v(`linhaOff(itensOffline()[0])`), /Tomada 1/);
  assert.match(a.v(`linhaOff(itensOffline()[0])`), /Fora do ar há 3 h/);
  assert.ok(!a.v(`linhaOff(itensOffline()[0])`).includes("Desligado"));
  const sem = a.v(`linhaBat(itensBateria().find((i) => i.faixa === "sem"))`);
  assert.ok(sem.includes('aria-label="sem leitura"') && sem.includes(">—<") && !sem.includes("bat-fill") && !/0\s?%/.test(sem));
  // nenhum extra simulado no modo real
  const nomes = J(a, `[...itensBateria(), ...itensOffline()].map((i) => i.nome).join("|")`);
  assert.ok(!/Controle da TV|Roteador|Canal 4/.test(nomes), nomes);
  // cartão de sensor com bateria crítica ganha o indicador
  assert.ok(a.v(`tileHtml("${CHV("sala_de_estar", "porta_sala")}", estado.get("${CHV("sala_de_estar", "porta_sala")}"))`).includes("Bateria crítica · 14 %"));
});

test("real: Manutenção sem pendências diz 'Tudo em ordem' e a folha continua sem nenhum controle de comando", () => {
  const a = real(casaBase());
  a.v("abrirManut()");
  assert.match(a.el("#manut-resumo").innerHTML, /Tudo em ordem/);
  assert.match(a.el("#manut-offs").innerHTML, /Nenhum dispositivo fora do ar/);
  assert.ok(!/data-dev|data-ctl|role="switch"|<button/.test(a.el("#manut-bats").innerHTML + a.el("#manut-offs").innerHTML));
});

test("real: câmeras - sem câmera no contrato, uma mensagem honesta; com câmera, ao vivo / sem sinal", () => {
  const a = real(casaBase());
  assert.match(a.el("#cameras").innerHTML, /Nenhuma câmera no contrato/);
  assert.ok(!a.el("#cameras").innerHTML.includes("Canal"));
  const c = JSON.parse(json(CONTRATO));
  c.comodos[0].dispositivos.push({ id: "cam1", entityId: "camera.rua", dominio: "camera", categoria: "seguranca", nome: "Rua" });
  const b = criaAmbiente(); b.v(`iniciaReal(${json(c)})`);
  b.v(`recebeLote(${json({ tipo: "casa-estados", completo: true, conectado: true, estados: { ...casaBase(), "camera.rua": est("idle") } })})`);
  assert.match(b.el("#cameras").innerHTML, /Ao vivo/);
  b.v(`recebeLote(${json({ tipo: "casa-estados", completo: false, conectado: true, estados: { "camera.rua": est("unavailable") } })})`);
  assert.match(b.el("#cameras").innerHTML, /Sem sinal/);
});

test("simulado intacto: sem iframe da HA (ou com ?fonte=simulado) o app não usa a ponte e mantém os dados do protótipo", () => {
  const a = criaAmbiente();
  assert.equal(a.v("REAL"), false);
  assert.equal(a.v("QUER_REAL"), false);
  assert.equal(a.v("SALAS.length"), 9);
  assert.ok(a.el("#resumo").innerHTML.includes("Ar livre"));
  assert.match(a.el("#banner-txt").textContent, /comandos pausados até reconectar/);
});

/* ---------- Ponte (conectar) com dublês ---------- */
function ponte({ contratoOk = true, regrasOk = true, buscaPai = "" } = {}) {
  const enviadas = [], ouvintes = [], relogios = [];
  const pai = { postMessage: (m, o) => enviadas.push([plano(m), o]), location: { search: buscaPai } };
  const janela = {
    parent: pai, location: { search: "?v=abc123", origin: "http://ha.local:8123" },
    addEventListener: (t, f) => { if (t === "message") ouvintes.push(f); },
  };
  const chamadas = [];
  const ctx = {
    window: janela, URLSearchParams, JSON, Promise, Math, Date, Object, Array, String, Number, Map, Set,
    fetch: (url, op) => {
      chamadas.push(url);
      if (url.startsWith("comandos.json")) return regrasOk ? Promise.resolve({ ok: true, json: () => Promise.resolve(COMANDOS) }) : Promise.resolve({ ok: false, status: 404 });
      return contratoOk ? Promise.resolve({ ok: true, json: () => Promise.resolve(CONTRATO) }) : Promise.resolve({ ok: false, status: 404 });
    },
    setTimeout: (f, ms) => { relogios.push([f, ms]); return 0; }, clearTimeout: () => {},
  };
  janela.window = janela; ctx.globalThis = ctx;
  vm.createContext(ctx); vm.runInContext(REAL_JS, ctx);
  return { ctx, enviadas, ouvintes, janela, pai, chamadas, relogios };
}
const espera = () => new Promise((r) => setImmediate(r));

test("ponte: carrega só contrato.json?v= e comandos.json?v=, monta a interface, avisa 'painel-pronto' UMA vez e repassa só mensagens do pai", async () => {
  const p = ponte();
  const log = [];
  p.janela.CasaReal.conectar({ aoContrato: (c, regras, cli) => log.push(["contrato", c.comodos.length, !!regras, !!cli]), aoLote: (m) => log.push(["lote", m.completo]), aoSemDados: () => log.push(["semdados"]), aoFalha: () => log.push(["falha"]) });
  await espera(); await espera();
  assert.deepEqual(p.chamadas, ["contrato.json?v=abc123", "comandos.json?v=abc123"]);
  assert.deepEqual(p.enviadas, [[{ tipo: "painel-pronto" }, "http://ha.local:8123"]]);
  assert.deepEqual(log[0], ["contrato", 10, true, true]);
  assert.equal(p.relogios[0][1], 8000);
  const ouve = p.ouvintes[0];
  ouve({ source: p.pai, origin: "http://ha.local:8123", data: { tipo: "casa-estados", completo: true, conectado: true, estados: {} } });
  ouve({ source: {}, origin: "http://ha.local:8123", data: { tipo: "casa-estados", completo: true, conectado: true, estados: {} } });          // não é o pai
  ouve({ source: p.pai, origin: "http://outra.origem", data: { tipo: "casa-estados", completo: true, conectado: true, estados: {} } });          // origem errada
  ouve({ source: p.pai, origin: "http://ha.local:8123", data: { tipo: "outra-coisa", estados: {} } });
  ouve({ source: p.pai, origin: "http://ha.local:8123", data: { tipo: "casa-estados", estados: null } });
  assert.deepEqual(log.filter(([t]) => t === "lote"), [["lote", true]]);
  p.relogios[0][0]();                                  // depois dos 8 s já houve lote: não acusa falta de dados
  assert.ok(!log.some(([t]) => t === "semdados"));
  assert.equal(p.enviadas.length, 1, "nenhuma outra mensagem saiu do painel (comando só quando a interface pede)");
});

test("ponte: sem nada em 8 s avisa 'sem dados'; contrato indisponível cai para o simulado (aoFalha)", async () => {
  const a = ponte(); const log = [];
  a.janela.CasaReal.conectar({ aoContrato: () => {}, aoLote: () => {}, aoSemDados: () => log.push("semdados"), aoFalha: () => log.push("falha") });
  await espera(); await espera();
  a.relogios[0][0]();
  assert.deepEqual(log, ["semdados"]);
  const b = ponte({ contratoOk: false }); const logB = [];
  b.janela.CasaReal.conectar({ aoContrato: () => logB.push("contrato"), aoLote: () => {}, aoSemDados: () => {}, aoFalha: () => logB.push("falha") });
  await espera(); await espera();
  assert.deepEqual(logB, ["falha"]);
  assert.equal(b.enviadas.length, 0, "sem contrato nada é pedido à HA");
});

/* ---------- Varredura de segurança: nenhum caminho de comando, nenhuma rede além de contrato.json ---------- */
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const PROIBIDOS_CMD = /callService|callApi|callWS|callHttp|\.callWS|hass\.call|\/api\/services|\/api\/states|Authorization|Bearer|HA_TOKEN|access_token|localStorage\.setItem\(["'`]token/i;

test("segurança (fase B): o carregador tem UM único callService, sem callApi/callWS/callHttp/token, e só aceita 3 tipos de mensagem", () => {
  const codigo = semComentarios(CARREGADOR);
  for (const f of ["callApi", "callWS", "callHttp"]) assert.ok(!codigo.includes(f), `o carregador não pode conter ${f}`);
  assert.equal((codigo.match(/callService/g) || []).length, 1, "callService só em _executar (depois de toda a validação)");
  assert.ok(!/Authorization|Bearer|access_token|HA_TOKEN/.test(codigo), "carregador sem token");
  assert.ok(/ev\.source !== this\._iframe\.contentWindow \|\| ev\.origin !== window\.location\.origin/.test(codigo), "origem e janela conferidas");
  const tipos = [...codigo.matchAll(/m\.tipo === "([a-z-]+)"/g)].map((x) => x[1]).sort();
  assert.deepEqual(tipos, ["comando", "comando-lote", "painel-pronto"], "só estes tipos de mensagem são tratados");
  assert.equal((codigo.match(/\.postMessage\(/g) || []).length, 2, "o carregador só responde ao iframe (estados e resultados)");
  assert.ok(/postMessage\(\{ tipo: "casa-estados"/.test(codigo) && /postMessage\(\{ tipo: "resultado"/.test(codigo));
});

test("segurança: o painel (app.js + casa-real.js) só fala com o pai (painel-pronto, comando, comando-lote), sem serviço/token e sem rede além dos estáticos do painel", () => {
  const app = semComentarios(APP), ponteJs = semComentarios(REAL_JS);
  for (const [nome, codigo] of [["app.js", app], ["casa-real.js", ponteJs]]) {
    assert.ok(!PROIBIDOS_CMD.test(codigo), `${nome} contém chamada de serviço/credencial`);
    assert.ok(!/XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|<form|window\.open|location\.(href|assign|replace)\s*=/.test(codigo), `${nome} abre outro canal`);
  }
  assert.ok(!/fetch\(|postMessage\(/.test(app), "app.js não faz rede nem manda mensagem: tudo passa pela ponte");
  const fetches = ponteJs.match(/\bfetch\(([^)]*)\)/g) || [];
  assert.equal(fetches.length, 2, "dois fetch: contrato.json e comandos.json (arquivos estáticos do próprio painel)");
  assert.deepEqual(fetches.map((f) => f.match(/^fetch\("([a-z]+\.json)"/)?.[1]).sort(), ["comandos.json", "contrato.json"], fetches.join(" | "));
  // únicas saídas ao pai: "painel-pronto" e o canal `postar` do cliente (ligado a window.parent.postMessage em conectar)
  const posts = [...ponteJs.matchAll(/(\S*)\.postMessage\(([^;]*);/g)];
  assert.equal(posts.length, 2, "duas chamadas de postMessage: painel-pronto e o canal de comandos");
  assert.ok(posts.every((p) => p[1] === "window.parent"), "só para window.parent");
  assert.ok(posts.some((p) => /^\{ tipo: "painel-pronto" \}, window\.location\.origin\)/.test(p[2])));
  assert.ok(posts.some((p) => /^m, window\.location\.origin\)/.test(p[2])), "targetOrigin = location.origin");
  // os tipos de mensagem montados pelo cliente: só comando e comando-lote
  assert.deepEqual([...ponteJs.matchAll(/enviar\("([a-z-]+)"/g)].map((x) => x[1]).sort(), ["comando", "comando-lote"]);
  assert.ok(/ev\.source !== window\.parent \|\| ev\.origin !== window\.location\.origin/.test(ponteJs), "só aceita mensagens do pai e da mesma origem");
  // o painel nunca informa entity_id/serviço nos comandos: o cliente só monta {dispositivo, acao, params, confirmado}
  assert.ok(!/entity_id|service/.test(ponteJs.slice(ponteJs.indexOf("function criarCliente"), ponteJs.indexOf("function conectar"))));
  // o único recurso externo do HTML é a fonte (já era assim no simulado); nenhum formulário
  assert.ok(!/<form|<iframe/.test(HTML));
  assert.ok(/<script src="casa-real\.js"><\/script>/.test(HTML), "index.html carrega a ponte");
});

test("segurança: o modo real nunca chama o código de comando do simulado (toque, cena, tudo, Desfazer)", () => {
  const app = APP.replace(/\r\n/g, "\n");
  // toque: no modo real o ramo do simulado (d.on = !d.on) não é alcançado; sem comandos, toqueReal só avisa "somente leitura"
  assert.ok(/if \(semDados\(\)\) return;\n\s*if \(REAL\) \{ toqueReal\(alvo\.dataset\.dev\); renderTudo\(\); return; \}/.test(app));
  assert.ok(/function toqueReal\(chave\) \{\n\s*const d = estado\.get\(chave\);\n\s*if \(!comandosAtivos\(\)\) \{ mostraToast\(DICA_LEITURA\); return; \}/.test(app));
  // "tudo" e cena: no real nunca caem no código simulado
  assert.ok(/if \(REAL && comandosAtivos\(\)\) \{ if \(!semDados\(\)\) todosReal\(/.test(app));
  assert.ok(/if \(REAL\) \{ if \(comandosAtivos\(\) && !semDados\(\)\) cenaReal\(/.test(app));
  assert.ok(/const travado = \(\) => semDados\(\) \|\| \(REAL && !comandosAtivos\(\)\);/.test(app));
  assert.ok(/function aplicarFolha\(fn, local = false\) \{\n\s*if \(!folhaChave \|\| \(local \? semDados\(\) : travado\(\)\)\) return;/.test(app));
  // todo envio passa por enviaComando, enviaLote ou cenaReal, e os três só rodam com comandosAtivos()
  assert.equal((app.match(/CMD\.cliente\.(comandar|comandarLote)\(/g) || []).length, 3, "só enviaComando, enviaLote e cenaReal falam com o cliente");
});
