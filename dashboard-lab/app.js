// Painel paralelo: dados simulados, nenhuma chamada de rede. Tocar num aparelho só muda o estado local.
// Parâmetros de estudo: ?hora=19 (hora do dia) e ?net=offline|carregando|sincronizando|online.
"use strict";

/* ---------- Ícones: Phosphor, gerados em icons.js (r = contorno, f = preenchido) ---------- */
function ic(nome, tam = 20, ativo = false) {
  const i = window.ICONES[nome] || window.ICONES.plug;
  return `<svg class="ic ic-${tam}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${ativo ? i.f : i.r}"/></svg>`;
}

/* ---------- Dados simulados (nomes vêm do protótipo Lovable; não é o contrato lib/rooms.ts) ---------- */
// [id, nome, tipo, ligado, subtítulo ligado, texto ok, texto alerta, indisponível, sem dimmer, minutos desde a última mudança (sensores)]
const SALAS = [
  { id: "sala", icone: "couch", nome: "Sala de estar", t: 26, itens: [
    ["luz", "Luz da sala", "light", 1], ["vent", "Ventilador", "fan", 0], ["painel", "Painel", "light", 0],
    ["tv", "TV Samsung 65\"", "tv", 1, "Netflix"], ["ps5", "PlayStation 5", "console", 0], ["ventps5", "Ventilação PS5", "plug", 0]] },
  { id: "quarto", icone: "bed", nome: "Quarto", t: 25, itens: [
    ["luz", "Luz do quarto", "light", 0], ["vent", "Ventilador", "fan", 1], ["porta", "Porta", "door", 0, null, "Fechada", "Aberta", 0, 0, 95]] },
  { id: "luca", icone: "baby", nome: "Quarto Luca", t: 25, itens: [
    ["luz", "Luz", "light", 0], ["yeelink", "Luminária Yeelink", "light", 1], ["led", "Led", "led", 0],
    ["tledled", "Tomada do Led", "plug", 0], ["t1", "Tomada 1", "plug", 0, null, null, null, 1, 0, 25], ["t2", "Tomada 2", "plug", 0]] },
  { id: "closet", icone: "shirt", nome: "Closet", t: 26, itens: [
    ["luz", "Luz", "light", 0], ["led", "Led escritório", "led", 1], ["pc", "Computador", "plug", 1],
    ["t2", "Tomada 2", "plug", 0], ["aspirador", "Aspirador Dreame", "vacuum", null, "Na base · 100%"]] },
  { id: "cozinha", icone: "pot", nome: "Cozinha & Copa", t: 27, itens: [
    ["cozinha", "Cozinha", "light", 0], ["copa", "Copa", "light", 0]] },
  { id: "lavanderia", icone: "wash", nome: "Lavanderia", t: 27, itens: [
    ["luz", "Luz", "light", 0], ["mov", "Movimento", "motion", 0, null, "Sem movimento", "Movimento", 0, 0, 8], ["porta", "Porta", "door", 1, null, "Fechada", "Aberta", 0, 0, 12]] },
  { id: "gourmet", icone: "fire", nome: "Área Gourmet", t: 24, itens: [
    ["plafon", "Plafon", "light", 0], ["pendente", "Pendente", "light", 0], ["led", "Led", "led", 1],
    ["spots", "Spots", "light", 0], ["mov", "Movimento", "motion", 0, null, "Sem movimento", "Movimento", 0, 0, 41]] },
  { id: "circulacao", icone: "steps", nome: "Circulação", t: 24, itens: [
    ["muro", "Muro", "light", 1], ["corredor", "Corredor", "light", 0]] },
  { id: "banheiro", icone: "bath", nome: "Banheiro", t: 26, itens: [
    ["i1", "Interruptor 1", "light", 0, null, null, null, 0, 1], ["i2", "Interruptor 2", "light", 0, null, null, null, 0, 1]] },
];

const SENSORES = new Set(["door", "motion"]);
// Baterias simuladas (rodada 9). Quem não está aqui não tem bateria; o aspirador acompanha a simulação.
const BAT_INICIAL = { "quarto.porta": 82, "lavanderia.porta": 14, "lavanderia.mov": 37, "gourmet.mov": 9, "closet.aspirador": 100 };
const estado = new Map();
for (const s of SALAS) {
  for (const [id, nome, tipo, on, sub, txtOk, txtAlerta, indisp, semDimmer, min] of s.itens) {
    const chaveBat = `${s.id}.${id}`;
    estado.set(`${s.id}.${id}`, {
      sala: s.id, id, nome, tipo, on: !!on, subOn: tipo === "tv" || tipo === "vacuum" ? null : sub || null, txtOk, txtAlerta, indisp: !!indisp,
      sensor: SENSORES.has(tipo), info: tipo === "vacuum", semDimmer: !!semDimmer, fav: false,
      desde: min === undefined ? null : Date.now() - min * 60000,
      // ajustes simulados da folha (rodada 4)
      bri: 100, temp: 3500, cor: null, vel: 2, osc: false, vol: 30, mudo: false, app: sub || "Netflix", suc: 2, vst: "base",
      temBat: chaveBat in BAT_INICIAL, bat: chaveBat in BAT_INICIAL ? BAT_INICIAL[chaveBat] : null,
    });
  }
}

// Itens só de manutenção (não viram cartões nos cômodos). bat: null com temBat = aparelho sem leitura de bateria.
const MANUT_EXTRA = [
  { id: "ctrl-tv", nome: "Controle da TV", local: "Sala de estar", tipo: "tv", temBat: true, bat: null },
  { id: "cam4", nome: "Câmera Rua · Canal 4", local: "Rua", tipo: "camera", offline: true, desde: Date.now() - 180 * 60000, verbo: "Fora do ar", acao: "Conferir o cabo e a energia do DVR" },
  { id: "roteador", nome: "Roteador do quarto", local: "Quarto", tipo: "roteador", offline: true, desde: Date.now() - 12 * 60000, verbo: "Sem resposta", acao: "Reiniciar o roteador" },
];
const ACAO_OFFLINE = { "luca.t1": "Conferir se a tomada está energizada" };

const CENAS = [
  { id: "boa-noite", nome: "Boa noite", desc: "Apaga a casa inteira", icone: "moon", liga: [] },
  { id: "chegada", nome: "Chegada", desc: "Sala, corredor e cozinha", icone: "home", liga: ["sala.luz", "circulacao.corredor", "cozinha.cozinha"] },
  { id: "cinema", nome: "Cinema", desc: "TV e painel, resto apagado", icone: "clap", liga: ["sala.tv", "sala.painel"] },
  { id: "gourmet", nome: "Gourmet", desc: "Toda a área externa", icone: "utensils", liga: ["gourmet.plafon", "gourmet.pendente", "gourmet.led", "gourmet.spots", "circulacao.muro"] },
  { id: "jogar", nome: "Jogar", desc: "PS5, ventilação e TV", icone: "console", liga: ["sala.ps5", "sala.ventps5", "sala.tv"] },
];

/* ---------- Estado da tela ---------- */
const URL_P = new URLSearchParams(location.search);
const S = {
  filtro: "todos", cena: null, aba: "casa",
  net: ["online", "offline", "carregando", "sincronizando"].includes(URL_P.get("net")) ? URL_P.get("net") : "carregando",
  hora: URL_P.has("hora") && Number.isFinite(+URL_P.get("hora")) ? Math.min(23.99, Math.max(0, +URL_P.get("hora"))) : null,
};
const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const travado = () => S.net === "offline" || S.net === "carregando";

const agora = () => {
  const d = new Date();
  if (S.hora !== null) { d.setHours(Math.floor(S.hora), Math.round((S.hora % 1) * 60), 0, 0); }
  return d;
};
const FAV_KEY = "lab.favoritos";
function carregaFavs() {
  try { const l = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); if (Array.isArray(l)) l.forEach((k) => { if (estado.has(k)) estado.get(k).fav = true; }); } catch { /* sem armazenamento */ }
}
function salvaFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...estado].filter(([, d]) => d.fav).map(([k]) => k))); } catch { /* sem armazenamento */ }
}
const acionaveis = (salaId) => [...estado.values()].filter((d) => d.sala === salaId && !d.sensor && !d.info && !d.indisp);
const ligados = (salaId) => acionaveis(salaId).filter((d) => d.on).length;
const tempoDesde = (ts) => {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};
const subtitulo = (d) => {
  if (d.indisp) return "Indisponível";
  if (d.sensor) return `${d.on ? d.txtAlerta : d.txtOk}${d.desde ? ` · ${tempoDesde(d.desde)}` : ""}`;
  if (d.tipo === "vacuum") return { base: `Na base · ${d.bat}%`, limpando: `Aspirando · ${d.bat}%`, pausado: "Pausado" }[d.vst];
  if (!d.on) return "Desligado";
  if (d.tipo === "light" || d.tipo === "led") return !d.semDimmer && d.bri < 100 ? `Ligado · ${d.bri}%` : "Ligado";
  if (d.tipo === "fan") return `Velocidade ${d.vel}${d.osc ? " · Oscilando" : ""}`;
  if (d.tipo === "tv") return d.app;
  return d.subOn || "Ligado";
};
const temAjustes = (d) => !d.sensor && !d.indisp;   // toda a folha tem ao menos "Ligado" e "Favorito"
const DICA = "Segure para ajustar";

/* ---------- Manutenção (rodada 9): só leitura, calculada do mesmo estado dos cartões ---------- */
const nomeSala = (id) => (SALAS.find((s) => s.id === id) || { nome: "" }).nome;
const faixaBat = (p) => (p == null ? "sem" : p <= 15 ? "critica" : p <= 30 ? "baixa" : "ok");   // sem leitura nunca vira 0 %
function itensBateria() {
  const l = [];
  estado.forEach((d, k) => { if (d.temBat) l.push({ chave: k, nome: d.nome, local: nomeSala(d.sala), tipo: d.tipo, bat: d.bat, aspirador: d.tipo === "vacuum", naBase: d.vst === "base" }); });
  MANUT_EXTRA.forEach((e) => { if (e.temBat) l.push({ chave: `extra.${e.id}`, nome: e.nome, local: e.local, tipo: e.tipo, bat: e.bat, aspirador: false, naBase: false }); });
  l.forEach((i) => { i.bat = i.bat == null ? null : Math.round(i.bat); i.faixa = faixaBat(i.bat); });
  return l.sort((a, b) => (a.bat == null) - (b.bat == null) || a.bat - b.bat || a.nome.localeCompare(b.nome, "pt-BR"));
}
function itensOffline() {
  const l = [];
  estado.forEach((d, k) => { if (d.indisp) l.push({ chave: k, nome: d.nome, local: nomeSala(d.sala), tipo: d.tipo, desde: d.desde, verbo: "Fora do ar", acao: ACAO_OFFLINE[k] || "Conferir a energia e a conexão" }); });
  MANUT_EXTRA.forEach((e) => { if (e.offline) l.push({ chave: `extra.${e.id}`, nome: e.nome, local: e.local, tipo: e.tipo, desde: e.desde, verbo: e.verbo, acao: e.acao }); });
  return l.sort((a, b) => (a.desde ?? Infinity) - (b.desde ?? Infinity));   // fora do ar há mais tempo primeiro
}
function resumoManut() {
  const b = itensBateria(), o = itensOffline(), com = b.filter((i) => i.bat != null);
  const n = (f) => b.filter((i) => i.faixa === f).length;
  const r = { crit: n("critica"), baixa: n("baixa"), ok: n("ok"), sem: n("sem"), offline: o.length, total: b.length };
  r.media = com.length ? Math.round(com.reduce((s, i) => s + i.bat, 0) / com.length) : null;
  r.pend = r.crit + r.baixa + r.sem + r.offline;
  r.nivel = r.crit || r.offline ? "critico" : r.baixa || r.sem ? "atencao" : "ok";   // carmesim = crítico, âmbar = atenção
  return r;
}
const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const acaoBat = (i) => {
  if (i.faixa === "sem") return "Sem leitura de bateria";
  if (i.aspirador) return i.naBase && i.bat < 100 ? "Carregando na base" : i.faixa === "critica" ? "Recarregar agora" : i.faixa === "baixa" ? "Recarregar em breve" : "";
  return i.faixa === "critica" ? "Trocar a pilha agora" : i.faixa === "baixa" ? "Trocar a pilha em breve" : "";
};
const indBat = (d) => {   // indicador discreto no cartão: não muda layout nem altura
  if (!d.temBat || d.bat == null || d.bat > 15) return "";
  const t = `Bateria crítica · ${Math.round(d.bat)} %`;
  return `<span class="bat-ico" role="img" aria-label="${t}" title="${t}">${ic("bateria-baixa", 16)}</span>`;
};

/* ---------- Céu do hero: reage à hora do dia ---------- */
const FASES = [
  { ate: 5,  id: "madrugada",  c: ["#05070d", "#0b1020", "#16162b"], m: ["#0d1018", "#07090e"], estrelas: 0.9, astro: "#cbd5e1" },
  { ate: 8,  id: "amanhecer",  c: ["#1b2447", "#7a5a7a", "#e0956a"], m: ["#2a2233", "#12101a"], estrelas: 0.2, astro: "#fde68a" },
  { ate: 16, id: "dia",        c: ["#16324d", "#2b5d82", "#6aa3c4"], m: ["#1c2b3a", "#0d141c"], estrelas: 0,   astro: "#fef3c7" },
  { ate: 19, id: "entardecer", c: ["#1b1830", "#5b3a4a", "#c2764a"], m: ["#2a1f2b", "#12101a"], estrelas: 0.1, astro: "#fde68a" },
  { ate: 24, id: "noite",      c: ["#070a14", "#101830", "#1d2342"], m: ["#0d1119", "#07090e"], estrelas: 0.85, astro: "#cbd5e1" },
];
function renderCeu() {
  const d = agora();
  const h = d.getHours() + d.getMinutes() / 60;
  const f = FASES.find((x) => h < x.ate);
  const sol = h >= 6 && h < 18;
  const t = sol ? (h - 6) / 12 : ((h + 6) % 24) / 12;           // 0..1 ao longo do arco do astro
  const bg = $(".hero-bg");
  const v = bg.style;
  v.setProperty("--sky0", f.c[0]); v.setProperty("--sky1", f.c[1]); v.setProperty("--sky2", f.c[2]);
  v.setProperty("--m1", f.m[0]); v.setProperty("--m2", f.m[1]);
  v.setProperty("--stars", f.estrelas); v.setProperty("--astro", f.astro);
  v.setProperty("--ax", `${Math.round(200 + 1200 * t)}px`);
  v.setProperty("--ay", `${Math.round(470 - 240 * Math.sin(Math.PI * t))}px`);
  bg.dataset.fase = f.id; bg.dataset.astro = sol ? "sol" : "lua";
}
function desenharEstrelas() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  $("#estrelas").innerHTML = Array.from({ length: 46 }, () =>
    `<circle cx="${Math.round(rnd() * 1600)}" cy="${Math.round(rnd() * 300)}" r="${(0.8 + rnd() * 1.4).toFixed(1)}" opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`).join("");
}

/* ---------- Renderização ---------- */
const traco = '<span class="num" aria-label="sem leitura">—</span>';
function renderResumo() {
  const todos = [...estado.values()].filter((d) => !d.indisp);
  const luzes = todos.filter((d) => d.tipo === "light" || d.tipo === "led");
  const acesas = luzes.filter((d) => d.on).length;
  const ativos = todos.filter((d) => !d.sensor && !d.info && d.on).length;
  const portas = todos.filter((d) => d.tipo === "door" && d.on).length;
  const hora = agora().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const car = S.net === "carregando";
  const b = (v) => (car ? traco : `<b class="num">${v}</b>`);
  $("#resumo").innerHTML = `
    <li class="clock num">${hora}</li>
    <li>${ic("cloud", 16)}${car ? traco : '<b class="num">24°</b>'} Ar livre <span class="eyebrow">simulado</span></li>
    <li>${ic("light", 16)}${b(`${acesas}/${luzes.length}`)} Luzes</li>
    <li>${ic("bolt", 16)}${b(ativos)} Ativos</li>
    <li class="${!car && portas ? "warn" : ""}">${ic("door", 16, !car && portas > 0)}${b(portas)} ${portas === 1 ? "Porta aberta" : "Portas abertas"}</li>`;
  renderManutChip();
}

// Chip de Manutenção: botão persistente (só o conteúdo muda; foco e clique não se perdem a cada tick).
let chipHtml = "";
function renderManutChip() {
  const el = $("#manut-chip");
  if (!el) return;
  const car = S.net === "carregando", r = resumoManut();
  const html = `${ic("ferramenta", 16)}<span>Manutenção</span>${car ? traco : r.pend ? `<i class="manut-dot" data-nivel="${r.nivel}" aria-hidden="true"></i><b class="num">${r.pend}</b>` : ""}`;
  el.dataset.nivel = car ? "carregando" : r.nivel;
  el.setAttribute("aria-label", car ? "Manutenção, carregando" : r.pend ? `Manutenção, ${pl(r.pend, "pendência", "pendências")}` : "Manutenção, tudo em ordem");
  if (html !== chipHtml) { chipHtml = html; el.innerHTML = html; }
}

function renderSaudacao() {
  const d = agora(); const h = d.getHours();
  const periodo = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("#saudacao").innerHTML = `${periodo}, <em>André.</em>`;
  $("#data-hoje").textContent = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function renderStatus() {
  const m = { online: ["ok", "Sistema online"], sincronizando: ["warn", "Sincronizando"], carregando: ["warn", "Conectando"], offline: ["bad", "Offline · último estado"] }[S.net];
  $("#status").innerHTML = `<i class="dot dot-${m[0]}"></i>${m[1]}`;
  $("#banner").hidden = S.net !== "offline";
  document.body.dataset.net = S.net;
}

const skTile = '<div class="dev glass sk" aria-hidden="true"><div class="dev-top"><span class="chip"></span></div><div><div class="sk-l w60"></div><div class="sk-l w40"></div></div></div>';

function renderCenas() {
  if (S.net === "carregando") {
    $("#cenas").innerHTML = Array.from({ length: 5 }, () => '<div class="scene glass sk" aria-hidden="true"><span class="ico"></span><span class="txt"><span class="sk-l w60"></span><span class="sk-l w80"></span></span></div>').join("");
    return;
  }
  $("#cenas").innerHTML = CENAS.map((c) => `
    <button type="button" class="scene glass" data-cena="${c.id}" aria-pressed="${S.cena === c.id}" ${travado() ? "disabled" : ""}>
      <span class="ico">${ic(c.icone, 20, S.cena === c.id)}</span>
      <span class="txt"><span class="nome">${esc(c.nome)}</span><span class="desc">${esc(c.desc)}</span></span>
    </button>`).join("");
}

function renderAmbientes() {
  const total = [...estado.values()].filter((d) => !d.sensor && !d.info && !d.indisp && d.on).length;
  const car = S.net === "carregando";
  const item = (id, nome, icone, n) => `
    <li><button type="button" class="amb" data-amb="${id}" aria-current="${S.filtro === id}">
      ${ic(icone, 16, S.filtro === id)}<span class="n">${esc(nome)}</span><span class="count num">${car ? "" : n || ""}</span></button></li>`;
  $("#lista-ambientes").innerHTML = item("todos", "Todos", "grid", total) +
    SALAS.map((s) => item(s.id, s.nome, "room", ligados(s.id))).join("");
  renderRail();
}

// Rail do celular: criado uma vez (preserva a rolagem e o foco); depois só atualiza aria-current e o ícone.
const RAIL = () => [["todos", "Todos", "grid"], ...SALAS.map((s) => [s.id, s.nome, s.icone])];
function renderRail() {
  const ul = $("#rail");
  if (!ul.children.length) {
    ul.innerHTML = RAIL().map(([id, nome, icone]) => `
      <li><button type="button" class="rail-btn" data-rail="${id}" data-icone="${icone}" aria-label="${esc(nome)}" title="${esc(nome)}" aria-current="false">${ic(icone, 24)}</button></li>`).join("");
  }
  ul.querySelectorAll("[data-rail]").forEach((b) => {
    const ativo = S.filtro === b.dataset.rail;
    b.setAttribute("aria-current", String(ativo));
    const i = window.ICONES[b.dataset.icone] || window.ICONES.plug;
    b.querySelector("path").setAttribute("d", ativo ? i.f : i.r);
    if (ativo) {   // mantém o ícone ativo à vista dentro do rail, sem mover a página
      if (b.offsetTop < ul.scrollTop) ul.scrollTop = Math.max(0, b.offsetTop - 4);
      else if (b.offsetTop + b.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = b.offsetTop + b.offsetHeight - ul.clientHeight + 4;
    }
  });
}

function tileHtml(chave, d) {
  const sub = esc(subtitulo(d) ?? "");
  const off = S.net === "offline";
  const selo = (off || d.indisp) ? `<span class="selo" title="${d.indisp ? "Indisponível" : "Sem conexão"}">${ic("offline", 12)}</span>` : "";
  const bat = indBat(d);
  const aj = temAjustes(d) && !off;
  const ajAttr = aj ? ` data-ajustes="true" title="${DICA}" aria-description="${DICA}. Pelo teclado: Shift+Enter."` : "";
  const ajIco = aj ? `<span class="aj" aria-hidden="true">${ic("ajustes", 16)}</span>` : "";
  if (d.indisp) {
    return `<div class="dev sensor glass" data-tipo="${d.tipo}" data-indisp="true">
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20)}${selo}</span></div>
      <div><div class="name">${esc(d.nome)}${d.fav ? `<span class="fav-ico" title="Favorito">${ic("star", 12, true)}</span>` : ""}</div><div class="sub" data-sub="${chave}">${sub}</div></div></div>`;
  }
  if (d.tipo === "vacuum") {
    const ativo = d.vst === "limpando";
    return `<button type="button" class="dev glass" data-dev="${chave}" data-tipo="vacuum" data-ativo="${ativo}" aria-haspopup="dialog" ${off ? 'data-offline="true" disabled' : ajAttr}>
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20, ativo)}${selo}</span>${bat ? `<span class="dev-ind">${bat}</span>` : ""}</div>
      <div><div class="name">${esc(d.nome)}${d.fav ? `<span class="fav-ico" title="Favorito">${ic("star", 12, true)}</span>` : ""}</div><div class="sub" data-sub="${chave}">${sub}</div></div>${ajIco}</button>`;
  }
  if (d.sensor || d.info) {
    const alerta = d.sensor && d.on;
    return `<div class="dev sensor glass" data-tipo="${d.tipo}" data-alerta="${alerta}" ${off ? 'data-offline="true"' : ""}>
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20, alerta)}${selo}</span>${d.sensor ? `<span class="dev-ind">${bat}<i class="dot-state"></i></span>` : ""}</div>
      <div><div class="name">${esc(d.nome)}${d.fav ? `<span class="fav-ico" title="Favorito">${ic("star", 12, true)}</span>` : ""}</div><div class="sub" data-sub="${chave}">${sub}</div></div></div>`;
  }
  return `<button type="button" class="dev glass" role="switch" aria-checked="${d.on}" data-dev="${chave}" data-tipo="${d.tipo}" ${off ? 'data-offline="true" disabled' : ajAttr}>
    <div class="dev-top"><span class="chip">${ic(d.tipo, 20, d.on)}${selo}</span><span class="sw" aria-hidden="true"></span></div>
    <div><div class="name">${esc(d.nome)}${d.fav ? `<span class="fav-ico" title="Favorito">${ic("star", 12, true)}</span>` : ""}</div><div class="sub" data-sub="${chave}">${sub}</div></div>${ajIco}</button>`;
}

function secaoHtml(s, entradas) {
  const itens = acionaveis(s.id);
  const n = itens.filter((d) => d.on).length;
  const acao = itens.length === 0 ? "" : n === 0
    ? `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="1" ${travado() ? "disabled" : ""}>Acender tudo</button>`
    : `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="0" ${travado() ? "disabled" : ""}>Apagar tudo</button>`;
  const resumo = `${s.t}° · ${n} de ${itens.length} ligados`;
  return `<section aria-label="${esc(s.nome)}">
    <div class="room-head"><div><h2>${esc(s.nome)}</h2><p class="muted num">${resumo}</p></div>${acao}</div>
    <div class="devs">${entradas.map(([k, d]) => tileHtml(k, d)).join("")}</div></section>`;
}

function renderComodos() {
  const alvo = $("#lista-comodos");
  if (S.net === "carregando") {
    alvo.innerHTML = [0, 1].map(() => `<section aria-hidden="true">
      <div class="room-head"><div><div class="sk-l w120"></div><div class="sk-l w60"></div></div></div>
      <div class="devs">${skTile.repeat(4)}</div></section>`).join("");
    return;
  }
  const lista = SALAS.filter((s) => S.filtro === "todos" || s.id === S.filtro);
  const favs = [...estado.entries()].filter(([, d]) => d.fav);
  const favAc = favs.filter(([, d]) => !d.sensor && !d.info);
  const favHtml = S.filtro === "todos" && favs.length
    ? `<section aria-label="Favoritos"><div class="room-head"><div><h2>${ic("star", 20, true)} Favoritos</h2><p class="muted num">${favAc.filter(([, d]) => d.on).length} de ${favAc.length} ligados</p></div></div>
      <div class="devs">${favs.map(([k, d]) => tileHtml(k, d)).join("")}</div></section>` : "";
  alvo.innerHTML = favHtml + lista.map((s) => secaoHtml(s, [...estado.entries()].filter(([, d]) => d.sala === s.id))).join("");
}

function renderCameras() {
  const off = S.net === "offline", car = S.net === "carregando";
  $("#cameras").innerHTML = ["Rua · Canal 2", "Rua · Canal 4"].map((n) => `
    <div class="cam glass ${car ? "sk" : ""}"><div class="cam-view">
      ${car ? "" : off ? `<span class="live live-off">${ic("offline", 12)}Sem sinal</span>` : '<span class="live"><i></i>Ao vivo</span>'}${car ? "" : ic("camera", 24)}</div>
    <div class="cam-foot"><span>${n}</span><span>1080P</span></div></div>`).join("");
}

function renderAbas() {
  const abas = { casa: ["home", "Casa"], cenas: ["clap", "Cenas"], cameras: ["camera", "Câmeras"] };
  document.querySelectorAll("[data-tab-btn]").forEach((b) => {
    const [icone, rotulo] = abas[b.dataset.tabBtn];
    const ativa = S.aba === b.dataset.tabBtn;
    b.innerHTML = `${ic(icone, 24, ativa)}<span>${rotulo}</span>`;
    b.setAttribute("aria-pressed", String(ativa));
  });
  document.body.dataset.tab = S.aba;
}

function renderTudo() {
  renderStatus(); renderCeu(); renderSaudacao(); renderResumo(); renderCenas(); renderAmbientes(); renderComodos(); renderCameras(); renderAbas(); atualizaFolha(); atualizaManut(); dicasRolagem();
}

/* ---------- Interação (otimista: muda na hora; offline e carregando recusam comando, sem trava fantasma) ---------- */
const vibrar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* sem suporte */ } };
let timerNet = null;

/* aviso curto com "Desfazer" (cenas e "Apagar/Acender tudo") */
let toastT = null, toastUndo = null;
const instantaneo = () => ({ ons: new Map([...estado].map(([k, d]) => [k, d.on])), cena: S.cena });
const restaura = (s) => { s.ons.forEach((v, k) => { estado.get(k).on = v; }); S.cena = s.cena; };
function mostraToast(msg, desfazer) {
  const t = $("#toast");
  toastUndo = desfazer || null;
  t.innerHTML = `<span class="toast-t">${esc(msg)}</span>${desfazer ? `<button type="button" class="toast-b" data-desfazer>${ic("undo", 16)}<span>Desfazer</span></button>` : ""}`;
  t.hidden = false; void t.offsetWidth; t.dataset.estado = "aberto";
  clearTimeout(toastT); toastT = setTimeout(escondeToast, 5000);
}
function escondeToast() {
  const t = $("#toast");
  clearTimeout(toastT); toastUndo = null; t.dataset.estado = "saindo";
  setTimeout(() => { if (t.dataset.estado === "saindo") { t.hidden = true; t.innerHTML = ""; t.dataset.estado = ""; } }, durFast());
}

let bloqueioClique = false;   // depois de um toque longo bem-sucedido, o clique que o encerra não alterna o aparelho
document.addEventListener("click", (ev) => {
  if (bloqueioClique && ev.target.closest(".dev")) { ev.preventDefault(); return; }
  const alvo = ev.target.closest("[data-dev],[data-todos],[data-cena],[data-amb],[data-rail],[data-tab-btn],[data-desfazer],[data-manut]");
  if (!alvo) return;
  if ("manut" in alvo.dataset) { abrirManut(); return; }
  if (alvo.hasAttribute("data-desfazer")) { const u = toastUndo; escondeToast(); if (u) { u(); renderTudo(); } return; }
  if (alvo.dataset.dev) {
    if (travado()) return;
    const d = estado.get(alvo.dataset.dev);
    if (d.tipo === "vacuum") { abrirFolha(alvo.dataset.dev); return; }   // aspirador: toque curto abre a folha
    d.on = !d.on; S.cena = null; vibrar();
  } else if (alvo.dataset.todos) {
    if (travado()) return;
    const antes = instantaneo(), ligar = alvo.dataset.valor === "1", nomeSala = SALAS.find((s) => s.id === alvo.dataset.todos).nome;
    acionaveis(alvo.dataset.todos).forEach((d) => { d.on = ligar; }); S.cena = null; vibrar();
    mostraToast(`${nomeSala}: ${ligar ? "tudo aceso" : "tudo apagado"}`, () => restaura(antes));
  } else if (alvo.dataset.cena) {
    if (travado()) return;
    const c = CENAS.find((x) => x.id === alvo.dataset.cena), antes = instantaneo();
    estado.forEach((d) => { if (!d.sensor && !d.info && !d.indisp) d.on = false; });
    c.liga.forEach((k) => { estado.get(k).on = true; });
    S.cena = c.id; vibrar();
    mostraToast(`Cena ${c.nome} ativada`, () => restaura(antes));
  } else if (alvo.dataset.amb || alvo.dataset.rail) {
    S.filtro = alvo.dataset.amb || alvo.dataset.rail;
  } else if (alvo.dataset.tabBtn) {
    S.aba = alvo.dataset.tabBtn; window.scrollTo(0, 0);
  }
  renderTudo();
  // a renderização recria os botões; devolve o foco ao mesmo controle para quem usa teclado
  const chave = Object.entries(alvo.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${v}"]`).join("");
  const novo = document.querySelector(chave);
  if (novo && document.activeElement === document.body) novo.focus({ preventScroll: true });
});

/* ---------- Folha de ajustes (rodada 4): toque longo ≈ 450 ms, Shift+Enter, F10, botão direito ---------- */
const CORES = [["ambar", "Âmbar", "#fbbf24"], ["vermelho", "Vermelho", "#ef4444"], ["verde", "Verde", "#10b981"], ["ciano", "Ciano", "#38bdf8"], ["violeta", "Violeta", "#a78bfa"]];
const APPS = ["Netflix", "YouTube", "HDMI 1", "HDMI 2"];
const SUCCAO = ["Silencioso", "Padrão", "Forte"];
const rotTemp = (k) => (k < 3500 ? "quente" : k < 5000 ? "neutra" : "fria");
const SLIDERS = {
  bri: { rot: "Brilho", min: 1, max: 100, step: 1, get: (d) => d.bri, set: (d, v) => { d.bri = v; d.on = true; }, txt: (v) => `${v}%`, vt: (v) => `${v} por cento` },
  temp: { rot: "Temperatura da cor", min: 2700, max: 6500, step: 100, get: (d) => d.temp, set: (d, v) => { d.temp = v; d.cor = null; }, txt: (v) => `${v} K · ${rotTemp(v)}`, vt: (v) => `${v} kelvin, ${rotTemp(v)}` },
  vol: { rot: "Volume", min: 0, max: 100, step: 1, get: (d) => d.vol, set: (d, v) => { d.vol = v; if (v > 0) d.mudo = false; }, txt: (v) => `${v}%`, vt: (v) => `${v} por cento` },
};
const SEGS = {
  vel: { rot: "Velocidade", valores: [1, 2, 3], rotulo: (v) => String(v), aria: (v) => `Velocidade ${v}`, get: (d) => d.vel, set: (d, v) => { d.vel = v; } },
  suc: { rot: "Sucção", valores: [1, 2, 3], rotulo: (v) => SUCCAO[v - 1], aria: (v) => `Sucção ${SUCCAO[v - 1].toLowerCase()}`, get: (d) => d.suc, set: (d, v) => { d.suc = v; } },
};
const VAC = { limpando: ["play", "Iniciar"], pausado: ["pause", "Pausar"], base: ["base", "Voltar à base"] };

let folhaChave = null, folhaFechando = false, folhaAbertaEm = 0, lp = null;
const durFast = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-fast")) || 180;

function montaFolha(d) {
  const slider = (id) => `<div class="ctl"><div class="ctl-linha"><label class="rot" for="f-${id}">${SLIDERS[id].rot}</label><output class="num val" for="f-${id}" data-val="${id}"></output></div>
    <input class="rng" type="range" id="f-${id}" data-ctl="${id}" min="${SLIDERS[id].min}" max="${SLIDERS[id].max}" step="${SLIDERS[id].step}"></div>`;
  const sw = (id, rot) => `<button type="button" class="ctl-sw" role="switch" aria-checked="false" data-sw="${id}"><span class="rot" data-rot="${id}">${rot}</span><span class="sw" aria-hidden="true"></span></button>`;
  const seg = (id) => `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-${id}-r">${SEGS[id].rot}</span></div>
    <div class="segs" role="group" aria-labelledby="f-${id}-r">${SEGS[id].valores.map((v) => `<button type="button" class="segbtn" data-seg="${id}" data-v="${v}" aria-pressed="false" aria-label="${SEGS[id].aria(v)}">${SEGS[id].rotulo(v)}</button>`).join("")}</div></div>`;
  let h = "";
  if (d.tipo === "vacuum") {
    h += `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-vac-r">Operação</span></div>
      <div class="segs segs-vac" role="group" aria-labelledby="f-vac-r">${Object.entries(VAC).map(([k, [i, t]]) => `<button type="button" class="segbtn segbtn-v" data-vac="${k}" aria-pressed="false">${ic(i, 20)}<span>${t}</span></button>`).join("")}</div></div>` + seg("suc");
  } else {
    h += sw("on", "Ligado");
    if ((d.tipo === "light" || d.tipo === "led") && !d.semDimmer) h += slider("bri");
    if (d.tipo === "led" || ["sala.painel", "luca.yeelink", "closet.led", "gourmet.led"].includes(`${d.sala}.${d.id}`)) h += slider("temp");
    if (d.tipo === "led") h += `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-cor-r">Cor</span></div>
      <div class="cores" role="group" aria-labelledby="f-cor-r">${CORES.map(([k, n, c]) => `<button type="button" class="cor" data-cor="${k}" style="--c:${c}" aria-pressed="false" aria-label="${n}"></button>`).join("")}</div></div>`;
    if (d.tipo === "fan") h += seg("vel") + sw("osc", "Oscilar");
    if (d.tipo === "tv") h += slider("vol") + sw("mudo", "Mudo") +
      `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-app-r">Entrada</span></div>
      <div class="segs segs-app" role="group" aria-labelledby="f-app-r">${APPS.map((a) => `<button type="button" class="segbtn" data-app="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join("")}</div></div>`;
  }
  h += sw("fav", "Favorito");
  const sala = SALAS.find((x) => x.id === d.sala).nome;
  return `<div class="folha-fundo" data-folha-fechar></div>
    <div class="folha-painel glass" role="dialog" aria-modal="true" aria-labelledby="folha-t folha-c" tabindex="-1" data-tom="${d.tipo === "tv" || d.tipo === "vacuum" ? "ciano" : "ambar"}">
      <div class="folha-cab">
        <div class="folha-tit"><h2 id="folha-t">${esc(d.nome)}</h2><p class="muted" id="folha-c">${esc(sala)}</p><p class="folha-sub" id="folha-s"></p></div>
        <button type="button" class="folha-x" data-folha-fechar aria-label="Fechar ajustes">${ic("fechar", 20)}</button>
      </div>
      <p class="folha-aviso" id="folha-aviso" role="status" hidden></p>
      <div class="folha-corpo">${h}</div>
    </div>`;
}

function atualizaFolha() {
  if (!folhaChave) return;
  const d = estado.get(folhaChave), f = $("#folha"), bloq = travado();
  $("#folha-s").textContent = subtitulo(d);
  const av = $("#folha-aviso");
  av.hidden = !bloq;
  av.textContent = S.net === "offline" ? "Sem conexão com a casa. Ajustes pausados até reconectar." : "Conectando à casa. Ajustes pausados.";
  f.querySelectorAll("[data-ctl]").forEach((el) => {
    const c = SLIDERS[el.dataset.ctl], v = c.get(d);
    if (+el.value !== v) el.value = String(v);
    el.style.setProperty("--r", String((v - c.min) / (c.max - c.min)));
    el.setAttribute("aria-valuetext", c.vt(v));
    f.querySelector(`[data-val="${el.dataset.ctl}"]`).textContent = c.txt(v);
    el.disabled = bloq;
  });
  f.querySelectorAll("[data-sw]").forEach((el) => {
    const id = el.dataset.sw, v = id === "on" ? d.on : d[id];
    el.setAttribute("aria-checked", String(v)); el.disabled = bloq;
    if (id === "on") el.querySelector("[data-rot]").textContent = v ? "Ligado" : "Desligado";
  });
  f.querySelectorAll("[data-seg]").forEach((el) => { el.setAttribute("aria-pressed", String(SEGS[el.dataset.seg].get(d) === +el.dataset.v)); el.disabled = bloq; });
  f.querySelectorAll("[data-app]").forEach((el) => { el.setAttribute("aria-pressed", String(d.app === el.dataset.app)); el.disabled = bloq; });
  f.querySelectorAll("[data-cor]").forEach((el) => { el.setAttribute("aria-pressed", String(d.cor === el.dataset.cor)); el.disabled = bloq; });
  f.querySelectorAll("[data-vac]").forEach((el) => { el.setAttribute("aria-pressed", String(d.vst === el.dataset.vac)); el.disabled = bloq; });
}

function abrirFolha(chave) {
  const d = estado.get(chave);
  if (folhaChave || folhaFechando || manutAberta || manutFechando || !d || !temAjustes(d) || travado()) return;
  const f = $("#folha");
  folhaChave = chave; folhaAbertaEm = performance.now();
  if (toastUndo) escondeToast();
  f.innerHTML = montaFolha(d);
  f.hidden = false; f.dataset.estado = "entrando";
  document.querySelector(".wrap").inert = true; document.querySelector(".tabbar").inert = true;
  document.body.dataset.folha = "aberta";
  void f.offsetWidth;                       // fixa o estado inicial antes de animar
  f.dataset.estado = "aberta";
  atualizaFolha();
  f.querySelector(".folha-painel").focus({ preventScroll: true });
}

function fecharFolha() {
  if (!folhaChave || folhaFechando) return;
  const f = $("#folha"), chave = folhaChave;
  folhaFechando = true; f.dataset.estado = "saindo";
  setTimeout(() => {
    f.hidden = true; f.innerHTML = ""; f.dataset.estado = "";
    document.querySelector(".wrap").inert = false; document.querySelector(".tabbar").inert = false;
    delete document.body.dataset.folha;
    folhaChave = null; folhaFechando = false;
    const origem = document.querySelector(`[data-dev="${chave}"]`);
    if (origem && !origem.disabled) origem.focus({ preventScroll: true });
    else {   // cartão desabilitado (ex.: a conexão caiu): o foco vai para a seção do cômodo, nunca para o body
      const nome = SALAS.find((x) => x.id === estado.get(chave).sala).nome;
      const sec = [...document.querySelectorAll("#lista-comodos section")].find((s) => s.getAttribute("aria-label") === nome) || $("#secao-casa");
      sec.tabIndex = -1; sec.focus({ preventScroll: true });
    }
  }, durFast());
}

function aplicarFolha(fn) {
  if (!folhaChave || travado()) return;
  fn(estado.get(folhaChave)); S.cena = null; salvaFavs();
  renderTudo();                              // também chama atualizaFolha(); a folha em si não é recriada
}

$("#folha").addEventListener("input", (ev) => {
  const el = ev.target.closest("[data-ctl]");
  if (el) aplicarFolha((d) => SLIDERS[el.dataset.ctl].set(d, +el.value));
});
$("#folha").addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-folha-fechar],[data-sw],[data-seg],[data-app],[data-cor],[data-vac]");
  if (!alvo) return;
  if (alvo.hasAttribute("data-folha-fechar")) {
    if (alvo.classList.contains("folha-fundo") && performance.now() - folhaAbertaEm < 300) return;
    fecharFolha(); return;
  }
  const dt = alvo.dataset;
  if (dt.sw) aplicarFolha((d) => { if (dt.sw === "on") d.on = !d.on; else d[dt.sw] = !d[dt.sw]; });
  else if (dt.seg) aplicarFolha((d) => SEGS[dt.seg].set(d, +dt.v));
  else if (dt.app) aplicarFolha((d) => { d.app = dt.app; });
  else if (dt.cor) aplicarFolha((d) => { d.cor = dt.cor; d.on = true; });
  else if (dt.vac) aplicarFolha((d) => { d.vst = dt.vac; });
});
// Foco preso dentro de uma folha (ajustes ou manutenção): Tab/Shift+Tab circulam; sem alvos, o foco fica no painel.
function prendeTab(ev, raiz) {
  const alvos = [...raiz.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')];
  const painel = raiz.querySelector(".folha-painel");
  if (!alvos.length) { ev.preventDefault(); painel.focus(); return; }
  const primeiro = alvos[0], ultimo = alvos[alvos.length - 1], ativo = document.activeElement;
  if (ev.shiftKey && (ativo === primeiro || ativo === painel)) { ev.preventDefault(); ultimo.focus(); }
  else if (!ev.shiftKey && ativo === ultimo) { ev.preventDefault(); primeiro.focus(); }
}
$("#folha").addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { ev.preventDefault(); fecharFolha(); return; }
  if (ev.key === "Tab") prendeTab(ev, $("#folha"));
});

/* ---------- Folha de Manutenção (rodada 9): mesmo mecanismo da folha de ajustes, só leitura ---------- */
let manutAberta = false, manutFechando = false, manutAbertaEm = 0, manutSig = "", manutResHtml = "", manutOffHtml = "";
const skRow = '<li class="m-row sk" aria-hidden="true"><span class="m-ico"></span><span class="m-txt"><span class="sk-l w60"></span><span class="sk-l w40"></span></span></li>';

function montaManut() {
  return `<div class="folha-fundo" data-folha-fechar></div>
    <div class="folha-painel manut-painel glass" role="dialog" aria-modal="true" aria-labelledby="manut-t manut-c" tabindex="-1" data-tom="ambar">
      <div class="folha-cab">
        <div class="folha-tit"><h2 id="manut-t">Manutenção</h2><p class="muted" id="manut-c">Baterias e aparelhos fora do ar · só leitura</p></div>
        <button type="button" class="folha-x" data-folha-fechar aria-label="Fechar manutenção">${ic("fechar", 20)}</button>
      </div>
      <p class="folha-aviso" id="manut-aviso" role="status" hidden></p>
      <div class="folha-corpo manut-corpo" id="manut-corpo" data-pronto="false" tabindex="0" role="region" aria-label="Detalhes de manutenção">
        <div id="manut-resumo"></div>
        <section aria-labelledby="manut-h-bat"><h3 class="manut-h" id="manut-h-bat">Baterias</h3><ul class="m-lista" id="manut-bats"></ul></section>
        <section aria-labelledby="manut-h-off"><h3 class="manut-h" id="manut-h-off">Offline e indisponíveis</h3><ul class="m-lista" id="manut-offs"></ul></section>
      </div>
    </div>`;
}

const rotFaixa = { critica: "crítica", baixa: "baixa", ok: "ok", sem: "sem leitura" };
function linhaBat(i) {
  const acao = acaoBat(i), sem = i.faixa === "sem";
  return `<li class="m-row" data-bk="${i.chave}" data-faixa="${i.faixa}">
    <span class="m-ico">${ic(i.tipo, 20)}</span>
    <span class="m-txt"><span class="m-nome">${esc(i.nome)}</span><span class="m-sub">${esc(i.local)}</span><span class="m-acao" data-acao>${esc(acao)}</span></span>
    <span class="m-val num" ${sem ? 'aria-label="sem leitura"' : `aria-label="${i.bat} por cento, bateria ${rotFaixa[i.faixa]}"`} data-pct>${sem ? "—" : `${i.bat}%`}</span>
    ${sem ? "" : `<span class="bat-barra" aria-hidden="true"><span class="bat-fill" style="--p:${i.bat / 100}"></span></span>`}
  </li>`;
}
function linhaOff(i) {
  return `<li class="m-row" data-off="true">
    <span class="m-ico">${ic(i.tipo, 20)}<span class="selo" aria-hidden="true">${ic("offline", 12)}</span></span>
    <span class="m-txt"><span class="m-nome">${esc(i.nome)}</span><span class="m-sub">${esc(i.local)}</span>
      <span class="m-acao">${i.desde ? `${i.verbo} ${tempoDesde(i.desde)}` : i.verbo}</span><span class="m-sub">${esc(i.acao)}</span></span>
  </li>`;
}

function atualizaManut() {
  if (!manutAberta) return;
  const car = S.net === "carregando", off = S.net === "offline", r = resumoManut();
  const av = $("#manut-aviso");
  av.hidden = !(off || car);
  av.textContent = off ? "Sem conexão com a casa. Mostrando o último estado conhecido." : "Conectando à casa. As leituras aparecem em instantes.";
  // resumo do topo
  const faixas = [["critica", r.crit, "crítica", "críticas"], ["baixa", r.baixa, "baixa", "baixas"], ["ok", r.ok, "ok", "ok"]]
    .concat(r.sem ? [["sem", r.sem, "sem leitura", "sem leitura"]] : [])
    .map(([f, n, um, varios]) => `<li data-f="${f}"><b class="num">${n}</b> ${n === 1 ? um : varios}</li>`).join("");
  const resHtml = car
    ? '<div class="m-resumo" aria-hidden="true"><div class="m-card sk"><span class="sk-l w60"></span><span class="sk-l w40"></span></div><div class="m-card sk"><span class="sk-l w60"></span><span class="sk-l w40"></span></div></div>'
    : `<div class="m-resumo">
        <div class="m-card" data-nivel="${r.crit ? "critico" : r.baixa || r.sem ? "atencao" : "ok"}"><p class="eyebrow">Índice de baterias</p>
          <p class="m-big num" ${r.media == null ? 'aria-label="sem leitura"' : ""}>${r.media == null ? "—" : `${r.media}%`}</p>
          <ul class="m-faixas">${faixas}</ul></div>
        <div class="m-card" data-nivel="${r.offline ? "critico" : "ok"}"><p class="eyebrow">Offline</p>
          <p class="m-big num">${r.offline}</p><p class="m-leg">${r.offline === 1 ? "dispositivo" : "dispositivos"}</p></div>
      </div>${r.pend === 0 ? `<p class="m-ok" role="status">${ic("ok", 20, true)}<span>Tudo em ordem. Nenhuma pendência.</span></p>` : ""}`;
  if (resHtml !== manutResHtml) { manutResHtml = resHtml; $("#manut-resumo").innerHTML = resHtml; }
  // baterias: reconstrói só se a lista, a ordem ou a faixa mudou; senão atualiza no lugar (a barra anima com scaleX)
  const bats = itensBateria(), ul = $("#manut-bats");
  const sig = (car ? "c|" : "") + bats.map((i) => `${i.chave}:${i.faixa}:${i.naBase}`).join("|");
  if (sig !== manutSig) {
    manutSig = sig;
    ul.innerHTML = car ? skRow.repeat(3) : bats.length ? bats.map(linhaBat).join("") : '<li class="m-vazio">Nenhum aparelho com bateria.</li>';
  } else if (!car) {
    bats.forEach((i) => {
      const li = ul.querySelector(`[data-bk="${i.chave}"]`);
      if (!li || i.bat == null) return;
      const pct = li.querySelector("[data-pct]"), fill = li.querySelector(".bat-fill");
      if (pct) { pct.textContent = `${i.bat}%`; pct.setAttribute("aria-label", `${i.bat} por cento, bateria ${rotFaixa[i.faixa]}`); }
      if (fill) fill.style.setProperty("--p", String(i.bat / 100));
      const ac = li.querySelector("[data-acao]"); if (ac) ac.textContent = acaoBat(i);
    });
  }
  // offline: reconstrói quando o texto muda (o tempo "há X" passa)
  const offs = itensOffline();
  const offHtml = car ? skRow.repeat(2) : offs.length ? offs.map(linhaOff).join("") : `<li class="m-vazio">${ic("ok", 16, true)} Nenhum dispositivo fora do ar.</li>`;
  if (offHtml !== manutOffHtml) { manutOffHtml = offHtml; $("#manut-offs").innerHTML = offHtml; }
  dicasRolagem();
}

function abrirManut() {
  if (manutAberta || manutFechando || folhaChave || folhaFechando) return;
  const f = $("#manutencao");
  manutAberta = true; manutAbertaEm = performance.now(); manutSig = manutResHtml = manutOffHtml = "";
  if (toastUndo) escondeToast();
  f.innerHTML = montaManut();
  f.hidden = false; f.dataset.estado = "entrando";
  document.querySelector(".wrap").inert = true; document.querySelector(".tabbar").inert = true;
  document.body.dataset.folha = "manutencao";
  atualizaManut();
  void f.offsetWidth;                       // fixa o estado inicial (barras a zero) antes de animar
  f.dataset.estado = "aberta";
  $("#manut-corpo").dataset.pronto = "true";
  dicasRolagem();
  f.querySelector(".folha-painel").focus({ preventScroll: true });
}

function fecharManut() {
  if (!manutAberta || manutFechando) return;
  const f = $("#manutencao");
  manutFechando = true; f.dataset.estado = "saindo";
  setTimeout(() => {
    f.hidden = true; f.innerHTML = ""; f.dataset.estado = "";
    document.querySelector(".wrap").inert = false; document.querySelector(".tabbar").inert = false;
    delete document.body.dataset.folha;
    manutAberta = false; manutFechando = false;
    const chip = $("#manut-chip");
    if (chip) chip.focus({ preventScroll: true });   // o chip é persistente: o foco volta ao botão de origem
  }, durFast());
}

$("#manutencao").addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-folha-fechar]");
  if (!alvo) return;
  if (alvo.classList.contains("folha-fundo") && performance.now() - manutAbertaEm < 300) return;
  fecharManut();
});
$("#manutencao").addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { ev.preventDefault(); fecharManut(); return; }
  if (ev.key === "Tab") prendeTab(ev, $("#manutencao"));
});

/* gestos: Pointer Events; cancela se mover > 8 px ou soltar antes de 450 ms */
const cartaoAjustes = (ev) => ev.target.closest && ev.target.closest(".dev[data-ajustes]");
function cancelaLp() { if (lp) clearTimeout(lp.t); }
document.addEventListener("pointerdown", (ev) => {
  if (!ev.isPrimary || (ev.pointerType === "mouse" && ev.button !== 0)) return;
  const card = cartaoAjustes(ev);
  if (!card || travado() || folhaChave) return;
  cancelaLp();
  const atual = lp = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, disparou: false, t: 0 };
  atual.t = setTimeout(() => {
    atual.disparou = true; bloqueioClique = true; vibrar();
    setTimeout(() => { bloqueioClique = false; }, 3000);   // rede de segurança se o pointerup se perder
    abrirFolha(card.dataset.dev);
  }, 450);
});
document.addEventListener("pointermove", (ev) => {
  if (lp && ev.pointerId === lp.id && !lp.disparou && Math.hypot(ev.clientX - lp.x, ev.clientY - lp.y) > 8) cancelaLp();
});
const fimGesto = (ev) => {
  if (!lp || ev.pointerId !== lp.id) return;
  const disparou = lp.disparou; cancelaLp(); lp = null;
  if (disparou) setTimeout(() => { bloqueioClique = false; }, 400);
};
document.addEventListener("pointerup", fimGesto);
document.addEventListener("pointercancel", fimGesto);
document.addEventListener("contextmenu", (ev) => {
  const card = cartaoAjustes(ev);
  if (!card) return;
  ev.preventDefault();
  if (!travado()) abrirFolha(card.dataset.dev);
});
document.addEventListener("keydown", (ev) => {
  const card = cartaoAjustes(ev);
  if (!card || folhaChave) return;
  if ((ev.key === "Enter" && ev.shiftKey) || ev.key === "F10") { ev.preventDefault(); abrirFolha(card.dataset.dev); }
});



/* ---------- Deslizar entre ambientes (celular, só toque) ---------- */
const ORDEM = () => ["todos", ...SALAS.map((s) => s.id)];
let sw0 = null;
function trocaAmbiente(dir) {
  const ids = ORDEM(), i = ids.indexOf(S.filtro), j = i + dir;
  if (j < 0 || j >= ids.length) return;
  S.filtro = ids[j];
  const lista = $("#lista-comodos");
  lista.dataset.slide = dir > 0 ? "proximo" : "anterior";
  renderTudo();
  setTimeout(() => { delete lista.dataset.slide; }, 260);
  window.scrollTo(0, 0);
}
document.addEventListener("pointerdown", (ev) => {
  if (!ev.isPrimary || ev.pointerType !== "touch" || !ev.target.closest || !ev.target.closest("#lista-comodos")) return;
  sw0 = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
});
document.addEventListener("pointerup", (ev) => {
  if (!sw0 || ev.pointerId !== sw0.id) return;
  const dx = ev.clientX - sw0.x, dy = ev.clientY - sw0.y; sw0 = null;
  if (folhaChave || manutAberta || bloqueioClique || window.innerWidth >= 768 || S.aba !== "casa") return;
  if (Math.abs(dx) < 64 || Math.abs(dx) < 1.6 * Math.abs(dy)) return;
  trocaAmbiente(dx < 0 ? 1 : -1);
});
document.addEventListener("pointercancel", () => { sw0 = null; });

/* ---------- Dica de rolagem: esmaecido na borda que tem mais conteúdo (as barras ficam ocultas) ---------- */
function dicasRolagem() {
  ["#lista-comodos", "#rail", "#manut-corpo"].forEach((sel) => {
    const el = $(sel);
    if (!el || !el.style) return;
    const rola = ["auto", "scroll"].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1;
    el.dataset.rola = String(rola);
    el.style.setProperty("--fade-t", rola && el.scrollTop > 4 ? "24px" : "0px");
    el.style.setProperty("--fade-b", rola && el.scrollTop + el.clientHeight < el.scrollHeight - 4 ? "28px" : "0px");
  });
}
["#lista-comodos", "#rail"].forEach((sel) => $(sel).addEventListener("scroll", dicasRolagem, { passive: true }));
$("#manutencao").addEventListener("scroll", dicasRolagem, { passive: true, capture: true });   // scroll não borbulha: captura o do corpo da folha
window.addEventListener("resize", dicasRolagem);

/* ---------- Simulação: bateria do aspirador e tempos dos sensores (só textos; não recria botões) ---------- */
function atualizaTextos() {
  document.querySelectorAll("[data-sub]").forEach((el) => {
    const d = estado.get(el.dataset.sub), t = d && subtitulo(d);
    if (t != null && el.textContent !== t) el.textContent = t;
  });
  atualizaFolha();
  renderManutChip(); atualizaManut();
}
function tickSimulacao() {
  let mudouEstado = false;
  estado.forEach((d) => {
    if (d.tipo !== "vacuum") return;
    if (d.vst === "limpando") { d.bat = Math.max(15, d.bat - 1); if (d.bat <= 20) { d.vst = "base"; mudouEstado = true; } }
    else if (d.vst === "base" && d.bat < 100) d.bat = Math.min(100, d.bat + 1);
  });
  if (mudouEstado) renderTudo(); else atualizaTextos();
}
setInterval(() => { if (S.net === "online" && !lp) tickSimulacao(); }, 5000);

carregaFavs();
desenharEstrelas();
renderTudo();
if (S.net === "carregando") timerNet = setTimeout(() => { S.net = "online"; renderTudo(); }, 1200);
setInterval(() => { if (S.hora === null) { renderCeu(); renderSaudacao(); renderResumo(); } }, 30000);
