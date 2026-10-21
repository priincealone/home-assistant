// Painel paralelo: dados simulados, nenhuma chamada de rede. Tocar num aparelho só muda o estado local.
// Parâmetros de estudo: ?hora=19 (hora do dia) e ?net=offline|carregando|sincronizando|online.
"use strict";

/* ---------- Ícones: Phosphor, gerados em icons.js (r = contorno, f = preenchido) ---------- */
function ic(nome, tam = 20, ativo = false) {
  const i = window.ICONES[nome] || window.ICONES.plug;
  return `<svg class="ic ic-${tam}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${ativo ? i.f : i.r}"/></svg>`;
}

/* ---------- Dados simulados (nomes vêm do protótipo Lovable; não é o contrato lib/rooms.ts) ---------- */
// [id, nome, tipo, ligado, subtítulo ligado, texto ok, texto alerta, indisponível]
const SALAS = [
  { id: "sala", nome: "Sala de estar", itens: [
    ["luz", "Luz da sala", "light", 1], ["vent", "Ventilador", "fan", 0], ["painel", "Painel", "light", 0],
    ["tv", "TV Samsung 65\"", "tv", 1, "Netflix"], ["ps5", "PlayStation 5", "console", 0], ["ventps5", "Ventilação PS5", "plug", 0]] },
  { id: "quarto", nome: "Quarto", itens: [
    ["luz", "Luz do quarto", "light", 0], ["vent", "Ventilador", "fan", 1], ["porta", "Porta", "door", 0, null, "Fechada", "Aberta"]] },
  { id: "luca", nome: "Quarto Luca", itens: [
    ["luz", "Luz", "light", 0], ["yeelink", "Luminária Yeelink", "light", 1], ["led", "Led", "led", 0],
    ["tledled", "Tomada do Led", "plug", 0], ["t1", "Tomada 1", "plug", 0, null, null, null, 1], ["t2", "Tomada 2", "plug", 0]] },
  { id: "closet", nome: "Closet", itens: [
    ["luz", "Luz", "light", 0], ["led", "Led escritório", "led", 1], ["pc", "Computador", "plug", 1],
    ["t2", "Tomada 2", "plug", 0], ["aspirador", "Aspirador Dreame", "vacuum", null, "Na base · 100%"]] },
  { id: "cozinha", nome: "Cozinha & Copa", itens: [
    ["cozinha", "Cozinha", "light", 0], ["copa", "Copa", "light", 0]] },
  { id: "lavanderia", nome: "Lavanderia", itens: [
    ["luz", "Luz", "light", 0], ["mov", "Movimento", "motion", 0, null, "Sem movimento", "Movimento"], ["porta", "Porta", "door", 1, null, "Fechada", "Aberta"]] },
  { id: "gourmet", nome: "Área Gourmet", itens: [
    ["plafon", "Plafon", "light", 0], ["pendente", "Pendente", "light", 0], ["led", "Led", "led", 1],
    ["spots", "Spots", "light", 0], ["mov", "Movimento", "motion", 0, null, "Sem movimento", "Movimento"]] },
  { id: "circulacao", nome: "Circulação", itens: [
    ["muro", "Muro", "light", 1], ["corredor", "Corredor", "light", 0]] },
  { id: "banheiro", nome: "Banheiro", itens: [
    ["i1", "Interruptor 1", "light", 0], ["i2", "Interruptor 2", "light", 0]] },
];

const SENSORES = new Set(["door", "motion"]);
const estado = new Map();
for (const s of SALAS) {
  for (const [id, nome, tipo, on, sub, txtOk, txtAlerta, indisp] of s.itens) {
    estado.set(`${s.id}.${id}`, { sala: s.id, id, nome, tipo, on: !!on, subOn: sub || null, txtOk, txtAlerta, indisp: !!indisp, sensor: SENSORES.has(tipo), info: tipo === "vacuum" });
  }
}

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
const acionaveis = (salaId) => [...estado.values()].filter((d) => d.sala === salaId && !d.sensor && !d.info && !d.indisp);
const ligados = (salaId) => acionaveis(salaId).filter((d) => d.on).length;
const subtitulo = (d) => {
  if (d.indisp) return "Indisponível";
  if (d.sensor) return d.on ? d.txtAlerta : d.txtOk;
  if (d.info) return d.subOn;
  return d.on ? d.subOn || "Ligado" : "Desligado";
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
}

function tileHtml(chave, d) {
  const sub = esc(subtitulo(d) ?? "");
  const off = S.net === "offline";
  const selo = (off || d.indisp) ? `<span class="selo" title="${d.indisp ? "Indisponível" : "Sem conexão"}">${ic("offline", 12)}</span>` : "";
  if (d.indisp) {
    return `<div class="dev sensor glass" data-tipo="${d.tipo}" data-indisp="true">
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20)}${selo}</span></div>
      <div><div class="name">${esc(d.nome)}</div><div class="sub">${sub}</div></div></div>`;
  }
  if (d.sensor || d.info) {
    const alerta = d.sensor && d.on;
    return `<div class="dev sensor glass" data-tipo="${d.tipo}" data-alerta="${alerta}" ${off ? 'data-offline="true"' : ""}>
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20, alerta)}${selo}</span>${d.sensor ? '<i class="dot-state"></i>' : ""}</div>
      <div><div class="name">${esc(d.nome)}</div><div class="sub">${sub}</div></div></div>`;
  }
  return `<button type="button" class="dev glass" role="switch" aria-checked="${d.on}" data-dev="${chave}" data-tipo="${d.tipo}" ${off ? 'data-offline="true" disabled' : ""}>
    <div class="dev-top"><span class="chip">${ic(d.tipo, 20, d.on)}${selo}</span><span class="sw" aria-hidden="true"></span></div>
    <div><div class="name">${esc(d.nome)}</div><div class="sub">${sub}</div></div></button>`;
}

function renderComodos() {
  if (S.net === "carregando") {
    $("#secao-casa").innerHTML = [0, 1].map(() => `<section aria-hidden="true">
      <div class="room-head"><div><div class="sk-l w120"></div><div class="sk-l w60"></div></div></div>
      <div class="devs">${skTile.repeat(4)}</div></section>`).join("");
    return;
  }
  const lista = SALAS.filter((s) => S.filtro === "todos" || s.id === S.filtro);
  $("#secao-casa").innerHTML = lista.map((s) => {
    const itens = acionaveis(s.id);
    const n = itens.filter((d) => d.on).length;
    const acao = itens.length === 0 ? "" : n === 0
      ? `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="1" ${travado() ? "disabled" : ""}>Acender tudo</button>`
      : `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="0" ${travado() ? "disabled" : ""}>Apagar tudo</button>`;
    const tiles = [...estado.entries()].filter(([, d]) => d.sala === s.id).map(([k, d]) => tileHtml(k, d)).join("");
    return `<section aria-label="${esc(s.nome)}">
      <div class="room-head"><div><h2>${esc(s.nome)}</h2><p class="muted num">${n} de ${itens.length} ligados</p></div>${acao}</div>
      <div class="devs">${tiles}</div></section>`;
  }).join("");
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

function renderLab() {
  document.querySelectorAll("[data-net]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.net === S.net)));
  const auto = S.hora === null;
  const h = agora();
  $("#lab-hora").value = String(h.getHours());
  $("#lab-hora-txt").textContent = auto ? "Auto" : `${String(Math.floor(S.hora)).padStart(2, "0")}h`;
  $("[data-hora-auto]").setAttribute("aria-pressed", String(auto));
}

function renderTudo() {
  renderStatus(); renderCeu(); renderSaudacao(); renderResumo(); renderCenas(); renderAmbientes(); renderComodos(); renderCameras(); renderAbas(); renderLab();
}

/* ---------- Interação (otimista: muda na hora; offline e carregando recusam comando, sem trava fantasma) ---------- */
const vibrar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* sem suporte */ } };
let timerNet = null;
function definirNet(n) {
  clearTimeout(timerNet);
  S.net = n;
  renderTudo();
  if (n === "carregando") timerNet = setTimeout(() => { S.net = "online"; renderTudo(); }, 1200);
}

document.addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-dev],[data-todos],[data-cena],[data-amb],[data-tab-btn],[data-net],[data-hora-auto]");
  if (!alvo) return;
  if (alvo.dataset.net) { definirNet(alvo.dataset.net); return; }
  if (alvo.hasAttribute("data-hora-auto")) { S.hora = null; renderTudo(); return; }
  if (alvo.dataset.dev) {
    if (travado()) return;
    const d = estado.get(alvo.dataset.dev); d.on = !d.on; S.cena = null; vibrar();
  } else if (alvo.dataset.todos) {
    if (travado()) return;
    acionaveis(alvo.dataset.todos).forEach((d) => { d.on = alvo.dataset.valor === "1"; }); S.cena = null; vibrar();
  } else if (alvo.dataset.cena) {
    if (travado()) return;
    const c = CENAS.find((x) => x.id === alvo.dataset.cena);
    estado.forEach((d) => { if (!d.sensor && !d.info && !d.indisp) d.on = false; });
    c.liga.forEach((k) => { estado.get(k).on = true; });
    S.cena = c.id; vibrar();
  } else if (alvo.dataset.amb) {
    S.filtro = alvo.dataset.amb;
  } else if (alvo.dataset.tabBtn) {
    S.aba = alvo.dataset.tabBtn; window.scrollTo(0, 0);
  }
  renderTudo();
  // a renderização recria os botões; devolve o foco ao mesmo controle para quem usa teclado
  const chave = Object.entries(alvo.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${v}"]`).join("");
  const novo = document.querySelector(chave);
  if (novo && document.activeElement === document.body) novo.focus({ preventScroll: true });
});

$("#lab-hora").addEventListener("input", (ev) => { S.hora = +ev.target.value; renderTudo(); });

desenharEstrelas();
renderTudo();
if (S.net === "carregando") timerNet = setTimeout(() => { S.net = "online"; renderTudo(); }, 1200);
setInterval(() => { if (S.hora === null) { renderCeu(); renderSaudacao(); renderResumo(); } }, 30000);
