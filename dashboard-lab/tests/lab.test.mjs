// Testes do painel paralelo (Node puro, sem navegador e sem rede). Rodar: node --test dashboard-lab/tests/
// Carrega icons.js e app.js num contexto `vm` com um DOM de mentira e exercita a lógica de verdade:
// resumo, cenas, desfazer, offline, favoritos, subtítulos e o contrato entre HTML, CSS e JS.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");
const APP = ler("app.js"), ICONES = ler("icons.js"), HTML = ler("index.html"), CSS = ler("styles.css");

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
  const ouvintes = {};
  const armazenamento = new Map();
  const body = el("body"), docEl = el("html");
  const ctx = {
    console, URLSearchParams, Date, Math, JSON, Map, Set, Array, Object, String, Number, Promise,
    location: { search: consulta },
    localStorage: { getItem: (k) => (armazenamento.has(k) ? armazenamento.get(k) : null), setItem: (k, v) => armazenamento.set(k, String(v)) },
    navigator: {}, performance: { now: () => 0 },
    getComputedStyle: () => ({ getPropertyValue: () => "180", overflowY: "visible" }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    document: {
      querySelector: (s) => el(s), querySelectorAll: () => [], body, documentElement: docEl, activeElement: body,
      addEventListener: (t, f) => { (ouvintes[t] ||= []).push(f); },
    },
  };
  ctx.window = ctx; ctx.window.innerWidth = 1280;
  ctx.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  ctx.window.scrollTo = () => {};
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(ICONES, ctx);
  vm.runInContext(APP, ctx);
  const v = (codigo) => vm.runInContext(codigo, ctx);
  // simula um clique em um controle com os data-* informados (o app localiza o alvo por ev.target.closest)
  const clica = (data) => {
    const alvo = { dataset: data, hasAttribute: (n) => n.startsWith("data-") && Object.keys(data).some((k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) === n) };
    for (const f of ouvintes.click) f({ target: { closest: (s) => (s === ".dev" ? null : alvo) }, preventDefault() {} });
  };
  return { v, el, clica, armazenamento };
}

// o contexto `vm` tem os próprios Array/Object: serializa para comparar com deepEqual do realm principal
const ligadosAcionaveis = (a) => JSON.parse(a.v(`JSON.stringify([...estado.entries()].filter(([, d]) => !d.sensor && !d.info && !d.indisp && d.on).map(([k]) => k).sort())`));

test("o app carrega sem erro e renderiza o resumo", () => {
  const a = criaAmbiente();
  assert.match(a.el("#resumo").innerHTML, /Luzes/);
  assert.match(a.el("#resumo").innerHTML, /Ativos/);
});

test("resumo: luzes acesas e portas abertas batem com o estado", () => {
  const a = criaAmbiente();
  const esperado = a.v(`(() => { const t = [...estado.values()].filter((d) => !d.indisp); const l = t.filter((d) => d.tipo === "light" || d.tipo === "led"); return l.filter((d) => d.on).length + "/" + l.length; })()`);
  assert.ok(a.el("#resumo").innerHTML.includes(`<b class="num">${esperado}</b>`));
  assert.equal(a.v(`[...estado.values()].filter((d) => d.tipo === "door" && d.on).length`), 1);
});

test("estado desconhecido nunca vira zero: carregando mostra traço, não 0", () => {
  const a = criaAmbiente("?net=carregando");
  const html = a.el("#resumo").innerHTML;
  assert.ok(html.includes("sem leitura"));
  assert.ok(!/<b class="num">0/.test(html));
});

test("toda cena só liga aparelhos que existem", () => {
  const a = criaAmbiente();
  assert.equal(a.v(`CENAS.every((c) => c.liga.every((k) => estado.has(k)))`), true);
});

test("cena Cinema: só TV e painel ficam ligados; sensores e indisponíveis não mudam", () => {
  const a = criaAmbiente();
  const sensoresAntes = a.v(`JSON.stringify([...estado].filter(([, d]) => d.sensor || d.indisp).map(([k, d]) => [k, d.on]))`);
  a.clica({ cena: "cinema" });
  assert.deepEqual(ligadosAcionaveis(a), ["sala.painel", "sala.tv"]);
  assert.equal(a.v(`JSON.stringify([...estado].filter(([, d]) => d.sensor || d.indisp).map(([k, d]) => [k, d.on]))`), sensoresAntes);
  assert.equal(a.v(`S.cena`), "cinema");
});

test("Boa noite apaga tudo e Desfazer restaura exatamente o estado anterior", () => {
  const a = criaAmbiente();
  const antes = ligadosAcionaveis(a);
  assert.ok(antes.length > 0);
  a.clica({ cena: "boa-noite" });
  assert.deepEqual(ligadosAcionaveis(a), []);
  assert.match(a.el("#toast").innerHTML, /Cena Boa noite ativada/);
  a.clica({ desfazer: "" });
  assert.deepEqual(ligadosAcionaveis(a), antes);
});

test("Apagar tudo / Acender tudo afetam só aquele ambiente e têm Desfazer", () => {
  const a = criaAmbiente();
  const antes = ligadosAcionaveis(a);
  a.clica({ todos: "sala", valor: "0" });
  assert.deepEqual(ligadosAcionaveis(a).filter((k) => k.startsWith("sala.")), []);
  assert.deepEqual(ligadosAcionaveis(a).filter((k) => !k.startsWith("sala.")), antes.filter((k) => !k.startsWith("sala.")));
  a.clica({ desfazer: "" });
  assert.deepEqual(ligadosAcionaveis(a), antes);
});

test("offline e carregando recusam comandos (nada muda, sem trava fantasma)", () => {
  for (const net of ["offline", "carregando"]) {
    const a = criaAmbiente("?net=" + net);
    const antes = ligadosAcionaveis(a);
    a.clica({ dev: "sala.vent" });
    a.clica({ cena: "boa-noite" });
    a.clica({ todos: "sala", valor: "0" });
    assert.deepEqual(ligadosAcionaveis(a), antes, net);
  }
});

test("toque curto alterna o aparelho e limpa a cena ativa", () => {
  const a = criaAmbiente();
  a.clica({ cena: "cinema" });
  a.clica({ dev: "sala.vent" });
  assert.equal(a.v(`estado.get("sala.vent").on`), true);
  assert.equal(a.v(`S.cena`), null);
});

test("subtítulos: dimmer só onde existe, ventilador, sensor com tempo", () => {
  const a = criaAmbiente();
  a.v(`estado.get("sala.luz").bri = 60; estado.get("banheiro.i1").on = true; estado.get("banheiro.i1").bri = 40;`);
  assert.equal(a.v(`subtitulo(estado.get("sala.luz"))`), "Ligado · 60%");
  assert.equal(a.v(`subtitulo(estado.get("banheiro.i1"))`), "Ligado");     // interruptor não é dimerizável
  assert.equal(a.v(`subtitulo(estado.get("quarto.vent"))`), "Velocidade 2");
  assert.match(a.v(`subtitulo(estado.get("lavanderia.porta"))`), /^Aberta · há \d+ min$/);
  assert.match(a.v(`subtitulo(estado.get("quarto.porta"))`), /^Fechada · há 1 h/);
});

test("aparelho indisponível nunca aparece como desligado, nem entra nas contagens", () => {
  const a = criaAmbiente();
  const html = a.v(`tileHtml("luca.t1", estado.get("luca.t1"))`);
  assert.ok(html.includes("Indisponível"));
  assert.ok(!html.includes("Desligado"));
  assert.equal(a.v(`acionaveis("luca").some((d) => d.id === "t1")`), false);
});

test("favoritos: aparecem em seção própria e persistem no armazenamento local", () => {
  const a = criaAmbiente();
  a.v(`estado.get("sala.ps5").fav = true; salvaFavs(); renderComodos()`);
  assert.deepEqual(JSON.parse(a.armazenamento.get("lab.favoritos")), ["sala.ps5"]);
  assert.ok(a.el("#lista-comodos").innerHTML.includes('aria-label="Favoritos"'));
  const b = criaAmbiente();       // outro ambiente sem o armazenamento: nenhum favorito
  assert.ok(!b.el("#lista-comodos").innerHTML.includes('aria-label="Favoritos"'));
});

test("folha: interruptor não dimerizável não ganha slider de brilho; toda folha tem Favorito", () => {
  const a = criaAmbiente();
  const ban = a.v(`montaFolha(estado.get("banheiro.i1"))`);
  assert.ok(!ban.includes('data-ctl="bri"'));
  assert.ok(ban.includes('data-sw="fav"'));
  assert.ok(a.v(`montaFolha(estado.get("sala.luz"))`).includes('data-ctl="bri"'));
  assert.ok(a.v(`montaFolha(estado.get("sala.ps5"))`).includes('data-sw="fav"'));
});

test("simulação do aspirador: bateria desce limpando e volta à base ao ficar baixa", () => {
  const a = criaAmbiente();
  a.v(`estado.get("closet.aspirador").vst = "limpando"; estado.get("closet.aspirador").bat = 22;`);
  a.v(`tickSimulacao(); tickSimulacao();`);
  assert.equal(a.v(`estado.get("closet.aspirador").vst`), "base");
  assert.equal(a.v(`estado.get("closet.aspirador").bat`) <= 20, true);
  a.v(`tickSimulacao()`);
  assert.equal(a.v(`estado.get("closet.aspirador").bat`), 21);   // na base, recarrega 1 ponto por tick
});

test("contrato: todo seletor $(\"#x\") do app existe no HTML e todo ícone usado existe em icons.js", () => {
  for (const [, id] of APP.matchAll(/\$\("#([\w-]+)"\)/g)) assert.ok(HTML.includes(`id="${id}"`) || APP.includes(`id="${id}"`), "falta #" + id + " no HTML nem no markup gerado");
  const a = criaAmbiente();
  const nomes = new Set([...APP.matchAll(/\bic\("([\w]+)"/g)].map((m) => m[1]));
  for (const i of a.v(`SALAS.map((s) => s.icone)`)) nomes.add(i);
  for (const c of a.v(`CENAS.map((x) => x.icone)`)) nomes.add(c);
  for (const t of a.v(`[...new Set([...estado.values()].map((d) => d.tipo))]`)) nomes.add(t);
  for (const n of nomes) assert.ok(a.v(`!!window.ICONES["${n}"]`), "ícone ausente: " + n);
});

test("isolamento e regras do design: sem rede, sem transition: all, zoom bloqueado, sem barras aparentes", () => {
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(APP), "o lab não pode falar com a rede");
  assert.ok(!/transition:\s*all/.test(CSS), "proibido transition: all");
  assert.ok(/user-scalable=no/.test(HTML), "o zoom segue bloqueado por decisão do dono");
  assert.ok(/scrollbar-width:\s*none/.test(CSS) && /::-webkit-scrollbar\s*\{\s*display:\s*none/.test(CSS), "barras de rolagem ocultas");
});
