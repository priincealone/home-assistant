// Painel paralelo: dados simulados, nenhuma chamada de rede. Tocar num aparelho só muda o estado local.
"use strict";

const P = {
  light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  fan: '<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4C12 6 14 3 16.5 4.2c2 1-.5 5.2-4.5 6.2zM13.6 12c4.4 0 7.4 2 6.2 4.5-1 2-5.200-.5-6.200-4.500zM12 13.6c0 4.4-2 7.4-4.5 6.2-2-1 .5-5.2 4.5-6.2zM10.4 12C6 12 3 10 4.2 7.5c1-2 5.2.5 6.2 4.500z"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  console: '<rect x="3" y="8" width="18" height="9" rx="4.500"/><path d="M8 11v3M6.500 12.500h3M15.500 11.500h.01M17.500 13.500h.01"/>',
  plug: '<path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14.500 12h.01"/>',
  motion: '<circle cx="12" cy="12" r="2"/><path d="M7.500 7.500a6 6 0 0 0 0 9M16.500 7.500a6 6 0 0 1 0 9M4.500 4.500a10 10 0 0 0 0 15M19.500 4.500a10 10 0 0 1 0 15"/>',
  vacuum: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  led: '<path d="M3 12h18M6 8v8M10 9v6M14 9v6M18 8v8"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
  room: '<path d="M4 20V8l8-5 8 5v12zM10 20v-6h4v6"/>',
  moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  clap: '<path d="M4 9h16v11H4zM4 9l2.500-5 3 1.500L12 4l3 1.500L17.500 4 20 9"/>',
  utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.500-3 4-3 7h3v11"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 10l5-3v10l-5-3"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.500 5.500 0 0 1 17 8.500 4.800 4.800 0 0 1 17.500 18z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
};
const ic = (nome, tam = 20) => `<svg class="ic ic-${tam}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[nome] || P.plug}</svg>`;

/* ---------- Dados simulados (nomes vêm do protótipo Lovable; não é o contrato lib/rooms.ts) ---------- */
// tipo: aparelho com interruptor. sensor: só leitura (porta/movimento). info: leitura sem interruptor.
const SALAS = [
  { id: "sala", nome: "Sala de estar", itens: [
    ["luz", "Luz da sala", "light", 1], ["vent", "Ventilador", "fan", 0], ["painel", "Painel", "light", 0],
    ["tv", "TV Samsung 65\"", "tv", 1, "Netflix"], ["ps5", "PlayStation 5", "console", 0], ["ventps5", "Ventilação PS5", "plug", 0]] },
  { id: "quarto", nome: "Quarto", itens: [
    ["luz", "Luz do quarto", "light", 0], ["vent", "Ventilador", "fan", 1], ["porta", "Porta", "door", 0, null, "Fechada", "Aberta"]] },
  { id: "luca", nome: "Quarto Luca", itens: [
    ["luz", "Luz", "light", 0], ["yeelink", "Luminária Yeelink", "light", 1], ["led", "Led", "led", 0],
    ["tledled", "Tomada do Led", "plug", 0], ["t1", "Tomada 1", "plug", 0], ["t2", "Tomada 2", "plug", 0]] },
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
const estado = new Map();           // "sala.luz" -> { sala, id, nome, tipo, on, sub, ok, alerta }
for (const s of SALAS) {
  for (const [id, nome, tipo, on, sub, txtOk, txtAlerta] of s.itens) {
    estado.set(`${s.id}.${id}`, { sala: s.id, id, nome, tipo, on: !!on, subOn: sub || null, txtOk, txtAlerta, sensor: SENSORES.has(tipo), info: tipo === "vacuum" });
  }
}

const CENAS = [
  { id: "boa-noite", nome: "Boa noite", desc: "Apaga a casa inteira", icone: "moon", liga: [] },
  { id: "chegada", nome: "Chegada", desc: "Sala, corredor e cozinha", icone: "home", liga: ["sala.luz", "circulacao.corredor", "cozinha.cozinha"] },
  { id: "cinema", nome: "Cinema", desc: "TV e painel, resto apagado", icone: "clap", liga: ["sala.tv", "sala.painel"] },
  { id: "gourmet", nome: "Gourmet", desc: "Toda a área externa", icone: "utensils", liga: ["gourmet.plafon", "gourmet.pendente", "gourmet.led", "gourmet.spots", "circulacao.muro"] },
  { id: "jogar", nome: "Jogar", desc: "PS5, ventilação e TV", icone: "console", liga: ["sala.ps5", "sala.ventps5", "sala.tv"] },
];

const S = { filtro: "todos", cena: null, aba: "casa" };
const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const acionaveis = (salaId) => [...estado.values()].filter((d) => d.sala === salaId && !d.sensor && !d.info);
const ligados = (salaId) => acionaveis(salaId).filter((d) => d.on).length;
const subtitulo = (d) => {
  if (d.sensor) return d.on ? d.txtAlerta : d.txtOk;
  if (d.info) return d.subOn;
  return d.on ? d.subOn || "Ligado" : "Desligado";
};

/* ---------- Renderização ---------- */
function renderResumo() {
  const todos = [...estado.values()];
  const luzes = todos.filter((d) => d.tipo === "light" || d.tipo === "led");
  const acesas = luzes.filter((d) => d.on).length;
  const ativos = todos.filter((d) => !d.sensor && !d.info && d.on).length;
  const portas = todos.filter((d) => d.tipo === "door" && d.on).length;
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("#resumo").innerHTML = `
    <li class="clock num">${hora}</li>
    <li>${ic("cloud", 16)}<b class="num">24°</b> Ar livre <span class="eyebrow">simulado</span></li>
    <li>${ic("light", 16)}<b class="num">${acesas}/${luzes.length}</b> Luzes</li>
    <li>${ic("bolt", 16)}<b class="num">${ativos}</b> Ativos</li>
    <li class="${portas ? "warn" : ""}">${ic("door", 16)}<b class="num">${portas}</b> ${portas === 1 ? "Porta aberta" : "Portas abertas"}</li>`;
}

function renderSaudacao() {
  const agora = new Date();
  const h = agora.getHours();
  const periodo = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("#saudacao").innerHTML = `${periodo}, <em>André.</em>`;
  $("#data-hoje").textContent = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function renderCenas() {
  $("#cenas").innerHTML = CENAS.map((c) => `
    <button type="button" class="scene glass" data-cena="${c.id}" aria-pressed="${S.cena === c.id}">
      <span class="ico">${ic(c.icone, 20)}</span>
      <span class="txt"><span class="nome">${esc(c.nome)}</span><span class="desc">${esc(c.desc)}</span></span>
    </button>`).join("");
}

function renderAmbientes() {
  const total = [...estado.values()].filter((d) => !d.sensor && !d.info && d.on).length;
  const item = (id, nome, icone, n) => `
    <li><button type="button" class="amb" data-amb="${id}" aria-current="${S.filtro === id}">
      ${ic(icone, 16)}<span class="n">${esc(nome)}</span><span class="count num">${n || ""}</span></button></li>`;
  $("#lista-ambientes").innerHTML = item("todos", "Todos", "grid", total) +
    SALAS.map((s) => item(s.id, s.nome, "room", ligados(s.id))).join("");
}

function tileHtml(chave, d) {
  const sub = esc(subtitulo(d) ?? "");
  if (d.sensor || d.info) {
    const alerta = d.sensor && d.on;
    return `<div class="dev sensor glass" data-tipo="${d.tipo}" data-alerta="${alerta}">
      <div class="dev-top"><span class="chip">${ic(d.tipo, 20)}</span>${d.sensor ? '<i class="dot-state"></i>' : ""}</div>
      <div><div class="name">${esc(d.nome)}</div><div class="sub">${sub}</div></div></div>`;
  }
  return `<button type="button" class="dev glass" role="switch" aria-checked="${d.on}" data-dev="${chave}" data-tipo="${d.tipo}">
    <div class="dev-top"><span class="chip">${ic(d.tipo, 20)}</span><span class="sw" aria-hidden="true"></span></div>
    <div><div class="name">${esc(d.nome)}</div><div class="sub">${sub}</div></div></button>`;
}

function renderComodos() {
  const lista = SALAS.filter((s) => S.filtro === "todos" || s.id === S.filtro);
  $("#secao-casa").innerHTML = lista.map((s) => {
    const itens = acionaveis(s.id);
    const n = itens.filter((d) => d.on).length;
    const acao = itens.length === 0 ? "" : n === 0
      ? `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="1">Acender tudo</button>`
      : `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="0">Apagar tudo</button>`;
    const tiles = [...estado.entries()].filter(([, d]) => d.sala === s.id).map(([k, d]) => tileHtml(k, d)).join("");
    return `<section aria-label="${esc(s.nome)}">
      <div class="room-head"><div><h2>${esc(s.nome)}</h2><p class="muted num">${n} de ${itens.length} ligados</p></div>${acao}</div>
      <div class="devs">${tiles}</div></section>`;
  }).join("");
}

function renderCameras() {
  $("#cameras").innerHTML = ["Rua · Canal 2", "Rua · Canal 4"].map((n) => `
    <div class="cam glass"><div class="cam-view"><span class="live"><i></i>Ao vivo</span>${ic("camera", 24)}</div>
    <div class="cam-foot"><span>${n}</span><span>1080P</span></div></div>`).join("");
}

function renderAbas() {
  const abas = { casa: ["home", "Casa"], cenas: ["clap", "Cenas"], cameras: ["camera", "Câmeras"] };
  document.querySelectorAll("[data-tab-btn]").forEach((b) => {
    const [icone, rotulo] = abas[b.dataset.tabBtn];
    b.innerHTML = `${ic(icone, 24)}<span>${rotulo}</span>`;
    b.setAttribute("aria-pressed", String(S.aba === b.dataset.tabBtn));
  });
  document.body.dataset.tab = S.aba;
}

function renderTudo() {
  renderResumo(); renderCenas(); renderAmbientes(); renderComodos(); renderAbas();
}

/* ---------- Interação (otimista: muda na hora; não há HA para confirmar) ---------- */
const vibrar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* sem suporte */ } };

document.addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-dev],[data-todos],[data-cena],[data-amb],[data-tab-btn]");
  if (!alvo) return;
  if (alvo.dataset.dev) {
    const d = estado.get(alvo.dataset.dev); d.on = !d.on; S.cena = null; vibrar();
  } else if (alvo.dataset.todos) {
    acionaveis(alvo.dataset.todos).forEach((d) => { d.on = alvo.dataset.valor === "1"; }); S.cena = null; vibrar();
  } else if (alvo.dataset.cena) {
    const c = CENAS.find((x) => x.id === alvo.dataset.cena);
    estado.forEach((d) => { if (!d.sensor && !d.info) d.on = false; });
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
  if (novo && novo !== document.activeElement && document.activeElement === document.body) novo.focus({ preventScroll: true });
});

renderSaudacao(); renderCameras(); renderTudo();
setInterval(() => { renderSaudacao(); renderResumo(); }, 30000);
