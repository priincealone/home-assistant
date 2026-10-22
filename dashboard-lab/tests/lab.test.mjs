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

/* ---------- Rodada 9: Manutenção ---------- */
const json = (a, codigo) => JSON.parse(a.v(`JSON.stringify(${codigo})`));

test("manutenção: baterias ordenadas da menor para a maior, sem leitura por último", () => {
  const a = criaAmbiente();
  const l = json(a, `itensBateria().map((i) => [i.nome, i.bat])`);
  assert.deepEqual(l.map(([n]) => n), ["Movimento", "Porta", "Movimento", "Porta", "Aspirador Dreame", "Controle da TV"]);
  assert.deepEqual(l.map(([, b]) => b), [9, 14, 37, 82, 100, null]);
  const nums = l.map(([, b]) => b).filter((b) => b !== null);
  assert.deepEqual(nums, [...nums].sort((x, y) => x - y));
});

test("manutenção: faixas crítica ≤ 15, baixa ≤ 30, ok acima; sem leitura é própria", () => {
  const a = criaAmbiente();
  const f = (p) => a.v(`faixaBat(${p})`);
  assert.deepEqual([f(0), f(15), f(16), f(30), f(31), f(100), f("null")], ["critica", "critica", "baixa", "baixa", "ok", "ok", "sem"]);
  assert.deepEqual(json(a, `itensBateria().map((i) => i.faixa)`), ["critica", "critica", "ok", "ok", "ok", "sem"]);
});

test("manutenção: média e contagens por faixa batem com os dados", () => {
  const a = criaAmbiente();
  const r = json(a, `resumoManut()`);
  assert.equal(r.media, Math.round((9 + 14 + 37 + 82 + 100) / 5));     // o aparelho sem leitura fica fora da média
  assert.deepEqual([r.crit, r.baixa, r.ok, r.sem, r.total], [2, 0, 3, 1, 6]);
  assert.equal(r.offline, 3);
  assert.equal(r.pend, 2 + 0 + 1 + 3);
  assert.equal(r.nivel, "critico");
});

test("manutenção: sem leitura nunca vira 0 %", () => {
  const a = criaAmbiente();
  const html = a.v(`linhaBat(itensBateria().find((i) => i.nome === "Controle da TV"))`);
  assert.ok(html.includes("Sem leitura de bateria"));
  assert.ok(html.includes('aria-label="sem leitura"') && html.includes(">—<"));
  assert.ok(!/0\s?%|bat-fill/.test(html), "sem leitura não tem barra nem porcentagem");
  a.v(`estado.forEach((d) => { if (d.temBat) d.bat = null; }); MANUT_EXTRA.forEach((e) => { if (e.temBat) e.bat = null; })`);
  assert.equal(a.v(`resumoManut().media`), null);                       // todos sem leitura: média sem leitura, não 0
  assert.equal(json(a, `itensBateria().every((i) => i.bat === null && i.faixa === "sem")`), true);
});

test("manutenção: offline inclui indisponíveis e os itens extras, os mais antigos primeiro", () => {
  const a = criaAmbiente();
  const l = json(a, `itensOffline().map((i) => [i.nome, i.verbo])`);
  assert.deepEqual(l, [["Câmera Rua · Canal 4", "Fora do ar"], ["Tomada 1", "Fora do ar"], ["Roteador do quarto", "Sem resposta"]]);
  assert.match(a.v(`linhaOff(itensOffline()[0])`), /Fora do ar há 3 h/);
  assert.match(a.v(`linhaOff(itensOffline()[2])`), /Sem resposta há 12 min/);
  assert.ok(!a.v(`linhaOff(itensOffline()[1])`).includes("Desligado"));   // indisponível não aparenta desligado
});

test("manutenção: sem pendências a folha diz que está tudo em ordem", () => {
  const a = criaAmbiente();
  a.v(`estado.forEach((d) => { d.indisp = false; if (d.temBat) d.bat = 100; }); MANUT_EXTRA.forEach((e) => { e.offline = false; if (e.temBat) e.bat = 100; }); renderManutChip()`);
  assert.equal(a.v(`resumoManut().pend`), 0);
  a.v(`abrirManut()`);
  assert.match(a.el("#manut-resumo").innerHTML, /Tudo em ordem/);
  assert.match(a.el("#manut-offs").innerHTML, /Nenhum dispositivo fora do ar/);
  assert.ok(!a.el("#manut-chip").innerHTML.includes("manut-dot"), "sem pendência o chip não mostra ponto");
});

test("manutenção: o chip mostra a contagem de pendências com o ponto de nível", () => {
  const a = criaAmbiente();
  const chip = a.el("#manut-chip").innerHTML;
  assert.ok(chip.includes('data-nivel="critico"') && chip.includes('<b class="num">6</b>') && chip.includes("Manutenção"));
  a.v(`estado.get("lavanderia.porta").bat = 90; estado.get("gourmet.mov").bat = 90; MANUT_EXTRA.forEach((e) => { if (e.offline) e.offline = false; }); estado.get("luca.t1").indisp = false; MANUT_EXTRA[0].bat = 50; estado.get("closet.aspirador").bat = 25; renderManutChip()`);
  const c2 = a.el("#manut-chip").innerHTML;
  assert.ok(c2.includes('data-nivel="atencao"') && c2.includes('<b class="num">1</b>'), c2);   // só o aspirador em 25 % (baixa)
});

test("manutenção: carregando mostra traço no chip e na folha (sem números inventados); offline mantém o último estado", () => {
  const car = criaAmbiente("?net=carregando");
  const c = car.el("#manut-chip").innerHTML;
  assert.ok(c.includes("sem leitura") && !c.includes("manut-dot") && !/<b class="num">\d/.test(c));
  car.v(`abrirManut()`);
  assert.ok(car.el("#manut-resumo").innerHTML.includes("sk"));
  assert.ok(!/m-big/.test(car.el("#manut-resumo").innerHTML));
  const off = criaAmbiente("?net=offline");
  assert.ok(off.el("#manut-chip").innerHTML.includes('<b class="num">6</b>'));
  off.v(`abrirManut()`);
  assert.match(off.el("#manut-aviso").textContent, /último estado conhecido/);
  assert.equal(off.el("#manut-aviso").hidden, false);
});

test("manutenção: a bateria do aspirador aparece na lista e o chip acompanha tickSimulacao", () => {
  const a = criaAmbiente();
  assert.equal(json(a, `itensBateria().find((i) => i.aspirador).faixa`), "ok");
  a.v(`const v = estado.get("closet.aspirador"); v.vst = "limpando"; v.bat = 31; tickSimulacao();`);
  assert.equal(a.v(`itensBateria().find((i) => i.aspirador).bat`), 30);
  assert.equal(a.v(`itensBateria().find((i) => i.aspirador).faixa`), "baixa");
  const chip = a.el("#manut-chip").innerHTML;
  assert.ok(chip.includes('<b class="num">7</b>'), chip);          // 6 pendências + o aspirador em faixa baixa
  assert.match(a.v(`linhaBat(itensBateria().find((i) => i.aspirador))`), /Recarregar em breve/);
});

test("manutenção: cartão de sensor com bateria ≤ 15 % ganha o indicador; os demais não", () => {
  const a = criaAmbiente();
  const alerta = a.v(`tileHtml("gourmet.mov", estado.get("gourmet.mov"))`);
  assert.ok(alerta.includes("Bateria crítica · 9 %") && alerta.includes("bat-ico"));
  assert.ok(!a.v(`tileHtml("quarto.porta", estado.get("quarto.porta"))`).includes("bat-ico"));
  assert.ok(!a.v(`tileHtml("lavanderia.mov", estado.get("lavanderia.mov"))`).includes("bat-ico"));   // 37 %
  assert.ok(a.v(`tileHtml("lavanderia.porta", estado.get("lavanderia.porta"))`).includes("Bateria crítica · 14 %"));
});

test("manutenção: abrir a folha usa inert, bloqueia a folha de ajustes e não tem nenhum controle de comando", () => {
  const a = criaAmbiente();
  a.v(`abrirManut()`);
  assert.equal(a.v(`manutAberta`), true);
  assert.equal(a.el("#manutencao").hidden, false);
  assert.equal(a.v(`document.querySelector(".wrap").inert`), true);
  assert.match(a.el("#manut-bats").innerHTML, /Trocar a pilha agora/);
  a.v(`abrirFolha("sala.luz")`);                                        // com a manutenção aberta, a folha de ajustes não abre
  assert.equal(a.v(`folhaChave`), null);
  assert.ok(!/data-dev|data-ctl|role="switch"|<button/.test(a.el("#manut-bats").innerHTML + a.el("#manut-offs").innerHTML), "nenhum controle de comando");
  const fn = APP.slice(APP.indexOf("function fecharManut"), APP.indexOf("function fecharManut") + 700);
  assert.ok(fn.includes("durFast()"), "fechar dura var(--dur-fast), lido do token");
});

test("manutenção: ícones usados existem em icons.js (inclui os dos itens extras)", () => {
  const a = criaAmbiente();
  for (const n of ["ferramenta", "bateria-baixa", "bateria-alerta", "ok", "offline", "fechar", "roteador", "camera"]) assert.ok(a.v(`!!window.ICONES["${n}"]`), n);
  for (const t of json(a, `[...itensBateria(), ...itensOffline()].map((i) => i.tipo)`)) assert.ok(a.v(`!!window.ICONES["${t}"]`), t);
});
