// Painel paralelo: dados simulados, nenhuma chamada de rede. Tocar num aparelho só muda o estado local.
// Parâmetros de estudo: ?hora=19 (hora do dia) e ?net=offline|carregando|sincronizando|online.
// Modo real (dentro da HA): leitura + comandos (fase B) pela ponte casa-real.js; ?leitura=1 volta tudo para somente leitura.
"use strict";

/* ---------- Ícones: Phosphor, gerados em icons.js (r = contorno, f = preenchido) ---------- */
function ic(nome, tam = 20, ativo = false) {
  const i = window.ICONES[nome] || window.ICONES.plug;
  return `<svg class="ic ic-${tam}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="${ativo ? i.f : i.r}"/></svg>`;
}

/* ---------- Dados simulados (nomes vêm do protótipo Lovable; não é o contrato lib/rooms.ts) ---------- */
// [id, nome, tipo, ligado, subtítulo ligado, texto ok, texto alerta, indisponível, sem dimmer, minutos desde a última mudança (sensores)]
const SALAS_SIM = [
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
// Modo simulado (padrão) usa SALAS_SIM; o modo real (dentro da HA, rodada 11) monta SALAS e estado a partir do contrato.json.
let SALAS = [];
const estado = new Map();
function montaSimulado() {
  SALAS = SALAS_SIM; estado.clear();
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
}

// Itens só de manutenção (não viram cartões nos cômodos). bat: null com temBat = aparelho sem leitura de bateria.
let MANUT_EXTRA = [
  { id: "ctrl-tv", nome: "Controle da TV", local: "Sala de estar", tipo: "tv", temBat: true, bat: null },
  { id: "cam4", nome: "Câmera Rua · Canal 4", local: "Rua", tipo: "camera", offline: true, desde: Date.now() - 180 * 60000, verbo: "Fora do ar", acao: "Conferir o cabo e a energia do DVR" },
  { id: "roteador", nome: "Roteador do quarto", local: "Quarto", tipo: "roteador", offline: true, desde: Date.now() - 12 * 60000, verbo: "Sem resposta", acao: "Reiniciar o roteador" },
];
const ACAO_OFFLINE = { "luca.t1": "Conferir se a tomada está energizada" };

const CENAS_SIM = [
  { id: "boa-noite", nome: "Boa noite", desc: "Apaga a casa inteira", icone: "moon", liga: [] },
  { id: "chegada", nome: "Chegada", desc: "Sala, corredor e cozinha", icone: "home", liga: ["sala.luz", "circulacao.corredor", "cozinha.cozinha"] },
  { id: "cinema", nome: "Cinema", desc: "TV e painel, resto apagado", icone: "clap", liga: ["sala.tv", "sala.painel"] },
  { id: "gourmet", nome: "Gourmet", desc: "Toda a área externa", icone: "utensils", liga: ["gourmet.plafon", "gourmet.pendente", "gourmet.led", "gourmet.spots", "circulacao.muro"] },
  { id: "jogar", nome: "Jogar", desc: "PS5, ventilação e TV", icone: "console", liga: ["sala.ps5", "sala.ventps5", "sala.tv"] },
];

let CENAS = CENAS_SIM;

/* ---------- Estado da tela ---------- */
const URL_P = new URLSearchParams(location.search);
// Modo real (rodada 11, fase A, SOMENTE LEITURA): só dentro do iframe da HA e sem ?fonte=simulado. Fora disso nada muda.
const DENTRO_HA = (() => { try { return !!window.parent && window.parent !== window; } catch { return false; } })();
const QUER_REAL = DENTRO_HA && URL_P.get("fonte") !== "simulado" && typeof fetch === "function" && !!window.CasaReal;
let REAL = false;
let CONTRATO = null, ESTADOS = {}, REAL_BATS = [], REAL_OFF = [], REAL_CAMS = [];
// Comandos (fase B): regras = comandos.json (mesma lista de permissão do carregador); cliente = ponte de mensagens.
// Qualquer um nulo (?leitura=1, comandos.json ausente/ilegível) = somente leitura, como na fase A.
let CMD = { regras: null, cliente: null };
const comandosAtivos = () => REAL && !!CMD.regras && !!CMD.cliente;
const S = {
  filtro: "todos", cena: null, aba: "casa", recebeu: false, semDados: false, loteOcupado: null, cenaOcupada: null,
  net: ["online", "offline", "carregando", "sincronizando"].includes(URL_P.get("net")) ? URL_P.get("net") : "carregando",
  hora: URL_P.has("hora") && Number.isFinite(+URL_P.get("hora")) ? Math.min(23.99, Math.max(0, +URL_P.get("hora"))) : null,
};
const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const semDados = () => S.net === "offline" || S.net === "carregando";
const travado = () => semDados() || (REAL && !comandosAtivos());   // comandos recusados: offline/carregando ou modo real somente leitura
const ctxCmd = () => ({ net: S.net, recebeu: S.recebeu });
const esq = () => S.net === "carregando" || (REAL && !S.recebeu);   // esqueletos até chegar o primeiro lote da casa
const DICA_LEITURA = "Somente leitura — comandos desativados";

const agora = () => {
  const d = new Date();
  if (S.hora !== null) { d.setHours(Math.floor(S.hora), Math.round((S.hora % 1) * 60), 0, 0); }
  return d;
};
const favKey = () => (REAL ? "lab.favoritos.real" : "lab.favoritos");   // as chaves de cartão diferem entre os modos
function carregaFavs() {
  try { const l = JSON.parse(localStorage.getItem(favKey()) || "[]"); if (Array.isArray(l)) l.forEach((k) => { if (estado.has(k)) estado.get(k).fav = true; }); } catch { /* sem armazenamento */ }
}
function salvaFavs() {
  try { localStorage.setItem(favKey(), JSON.stringify([...estado].filter(([, d]) => d.fav).map(([k]) => k))); } catch { /* sem armazenamento */ }
}
const cartoesSala = (salaId) => [...estado.values()].filter((d) => d.sala === salaId);
const acionaveis = (salaId) => [...estado.values()].filter((d) => d.sala === salaId && !d.sensor && !d.info && !d.indisp);
const ligados = (salaId) => acionaveis(salaId).filter((d) => d.on).length;
const tempoDesde = (ts) => {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};
const ROT_VAC = { base: "Na base", limpando: "Aspirando", pausado: "Pausado", retornando: "Voltando à base", parado: "Parado", erro: "Com erro" };
const subtitulo = (d) => {
  if (d.indisp) return "Indisponível";
  if (d.sensor) return `${d.on ? d.txtAlerta : d.txtOk}${d.desde ? ` · ${tempoDesde(d.desde)}` : ""}`;
  if (d.tipo === "vacuum" && d.real) return `${ROT_VAC[d.vst] || "Estado desconhecido"}${d.bat != null ? ` · ${d.bat}%` : ""}`;
  if (d.tipo === "vacuum") return { base: `Na base · ${d.bat}%`, limpando: `Aspirando · ${d.bat}%`, pausado: "Pausado" }[d.vst];
  if (!d.on) return "Desligado";
  if (d.tipo === "light" || d.tipo === "led") return !d.semDimmer && d.bri != null && d.bri < 100 ? `Ligado · ${d.bri}%` : "Ligado";
  if (d.tipo === "fan") return d.real ? `Ligado${d.pct != null ? ` · ${d.pct}%` : ""}${d.osc ? " · Oscilando" : ""}` : `Velocidade ${d.vel}${d.osc ? " · Oscilando" : ""}`;
  if (d.tipo === "tv") return d.app || "Ligado";
  return d.subOn || "Ligado";
};
const temAjustes = (d) => !d.sensor && !d.indisp;
// Toque simples abre o popup (folha com dial) só onde há o que ajustar; tomadas, interruptores, PS5 etc. seguem alternando no toque.
const abrePopup = (d) => temAjustes(d) && (d.tipo === "light" || d.tipo === "led" ? !d.semDimmer || d.temp != null : d.tipo === "fan" || d.tipo === "tv");   // toda a folha tem ao menos "Ligado" e "Favorito"
const DICA = "Segure para ajustar";

/* ---------- Manutenção (rodada 9): só leitura, calculada do mesmo estado dos cartões ---------- */
const nomeSala = (id) => (SALAS.find((s) => s.id === id) || { nome: "" }).nome;
const faixaBat = (p) => (p == null ? "sem" : p <= 15 ? "critica" : p <= 30 ? "baixa" : "ok");   // sem leitura nunca vira 0 %
function itensBateria() {
  const l = [];
  if (REAL) REAL_BATS.forEach((b) => l.push({ chave: b.chave, nome: b.nome, local: b.local, tipo: b.tipo, bat: b.bat, aspirador: false, naBase: false }));
  else estado.forEach((d, k) => { if (d.temBat) l.push({ chave: k, nome: d.nome, local: nomeSala(d.sala), tipo: d.tipo, bat: d.bat, aspirador: d.tipo === "vacuum", naBase: d.vst === "base" }); });
  if (!REAL) MANUT_EXTRA.forEach((e) => { if (e.temBat) l.push({ chave: `extra.${e.id}`, nome: e.nome, local: e.local, tipo: e.tipo, bat: e.bat, aspirador: false, naBase: false }); });
  l.forEach((i) => { i.bat = i.bat == null ? null : Math.round(i.bat); i.faixa = faixaBat(i.bat); });
  return l.sort((a, b) => (a.bat == null) - (b.bat == null) || a.bat - b.bat || a.nome.localeCompare(b.nome, "pt-BR"));
}
function itensOffline() {
  const l = [];
  if (REAL) return REAL_OFF.map((o) => ({ ...o }));   // já vem ordenado: fora do ar há mais tempo primeiro
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
// Pontos-chave do dia (hora, 4 cores do céu do zênite ao horizonte, serra distante / média / próxima, estrelas, astro, nuvem).
// O céu NÃO salta de fase em fase: as cores são interpoladas entre o ponto anterior e o seguinte, minuto a minuto.
const CEU = [
  { h: 0,    c: ["#03050c", "#0a1226", "#141c3a", "#1d2750"], m: ["#111a2e", "#0b1120", "#060810"], est: 0.95, astro: "#dbe4f0", nuv: ["#1d2644", 0.30] },
  { h: 4.6,  c: ["#04060e", "#0b1229", "#17204a", "#263262"], m: ["#131c32", "#0c1222", "#070911"], est: 0.9,  astro: "#dbe4f0", nuv: ["#222c52", 0.30] },
  { h: 5.7,  c: ["#0e1838", "#2a3068", "#7b4f80", "#d9826a"], m: ["#2c2742", "#1d1a30", "#0d0b16"], est: 0.3,  astro: "#fde7b0", nuv: ["#7a5078", 0.42] },
  { h: 6.7,  c: ["#223f7a", "#587aae", "#e0a07e", "#ffc98a"], m: ["#4b4864", "#2c2a40", "#14111c"], est: 0,    astro: "#ffe6a8", nuv: ["#f4b999", 0.50] },
  { h: 8.8,  c: ["#163d6c", "#2a6396", "#5f9cc4", "#9cc4de"], m: ["#3d5877", "#243a52", "#101c2a"], est: 0,    astro: "#fff1c4", nuv: ["#e8f1fa", 0.38] },
  { h: 12.5, c: ["#11345a", "#215c8c", "#4f93bf", "#86b6d6"], m: ["#35506d", "#1f3448", "#0e1824"], est: 0,    astro: "#fff6d6", nuv: ["#f1f6fc", 0.40] },
  { h: 16.4, c: ["#143a66", "#2a6190", "#5a95bb", "#a7c4d2"], m: ["#3a5069", "#233649", "#101b27"], est: 0,    astro: "#ffeab8", nuv: ["#f7ecd8", 0.40] },
  { h: 18.0, c: ["#1f2e66", "#5e5a98", "#d98a6c", "#ffb069"], m: ["#4b3d5e", "#2b2140", "#140f1e"], est: 0.05, astro: "#ffc078", nuv: ["#ffb28a", 0.52] },
  { h: 19.2, c: ["#121842", "#41376f", "#a8536a", "#e0795a"], m: ["#2e2545", "#1c1630", "#0d0a16"], est: 0.3,  astro: "#ffd9a0", nuv: ["#9a5b7c", 0.42] },
  { h: 20.6, c: ["#070b1e", "#131b40", "#262c58", "#363a68"], m: ["#171d33", "#0f1424", "#070911"], est: 0.8,  astro: "#dbe4f0", nuv: ["#2a3158", 0.32] },
  { h: 24,   c: ["#03050c", "#0a1226", "#141c3a", "#1d2750"], m: ["#111a2e", "#0b1120", "#060810"], est: 0.95, astro: "#dbe4f0", nuv: ["#1d2644", 0.30] },
];
const hex2 = (x) => [1, 3, 5].map((k) => parseInt(x.slice(k, k + 2), 16));
const mistura = (a, b, t) => "#" + hex2(a).map((v, k) => Math.round(v + (hex2(b)[k] - v) * t).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => a + (b - a) * t;
const suave = (t) => t * t * (3 - 2 * t);
function ceuEm(h) {
  let k = CEU.findIndex((x) => h < x.h) - 1; if (k < 0) k = CEU.length - 2;
  const A = CEU[k], B = CEU[k + 1], t = suave((h - A.h) / (B.h - A.h));
  return {
    c: A.c.map((x, n) => mistura(x, B.c[n], t)), m: A.m.map((x, n) => mistura(x, B.m[n], t)),
    est: mix(A.est, B.est, t), astro: mistura(A.astro, B.astro, t), nuv: mistura(A.nuv[0], B.nuv[0], t), nuvo: mix(A.nuv[1], B.nuv[1], t),
  };
}
function nomeFase(h) { return h < 5 ? "madrugada" : h < 8 ? "amanhecer" : h < 16 ? "dia" : h < 19 ? "entardecer" : "noite"; }
function renderCeu() {
  const d = agora();
  const h = d.getHours() + d.getMinutes() / 60;
  const f = ceuEm(h);
  const sol = h >= 6 && h < 18;
  const t = sol ? (h - 6) / 12 : ((h + 6) % 24) / 12;           // 0..1 ao longo do arco do astro
  const bg = $(".hero-bg");
  const v = bg.style;
  f.c.forEach((x, n) => v.setProperty(`--sky${n}`, x));
  v.setProperty("--mf", f.m[0]); v.setProperty("--m1c", f.m[1]); v.setProperty("--m2", f.m[2]);
  v.setProperty("--stars", f.est.toFixed(2)); v.setProperty("--astro", f.astro);
  v.setProperty("--cloud", f.nuv); v.setProperty("--cloudo", f.nuvo.toFixed(2));
  v.setProperty("--ax", `${Math.round(200 + 1200 * t)}px`);
  v.setProperty("--ay", `${Math.round(470 - 240 * Math.sin(Math.PI * t))}px`);
  bg.dataset.fase = nomeFase(h); bg.dataset.astro = sol ? "sol" : "lua";
}
// Estrelas (algumas maiores e cintilantes) e serras de relevo natural (deslocamento do ponto médio, semente fixa: sempre o mesmo desenho).
function desenharEstrelas() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  $("#estrelas").innerHTML = Array.from({ length: 96 }, (_, n) => {
    const grande = n % 9 === 0, o = (0.4 + rnd() * 0.6).toFixed(2);
    const cx = Math.round(rnd() * 1600), cy = Math.round(rnd() * rnd() * 330 + 6), r = grande ? (1.6 + rnd() * 0.9).toFixed(1) : (0.6 + rnd() * 1.1).toFixed(1);
    return n % 3 === 0 ? `<circle class="tw" cx="${cx}" cy="${cy}" r="${r}" opacity="${o}" style="--tw-o:${o};--tw-d:${(3 + rnd() * 5).toFixed(1)}s;--tw-a:-${(rnd() * 6).toFixed(1)}s"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" opacity="${o}"/>`;
  }).join("");
  const serra = (base, amp, rug, sem) => {
    let sd = (sem * 48271 + 1013904223) % 2147483647; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let b = 0; b < 8; b++) r();   // descarta as primeiras (semente pequena dá sequência quase constante)
    let pts = [base + (r() - 0.5) * amp, base + (r() - 0.5) * amp];
    for (let n = 0, desl = amp; n < 7; n++, desl *= rug) {
      const novo = [];
      for (let k = 0; k < pts.length - 1; k++) { novo.push(pts[k], (pts[k] + pts[k + 1]) / 2 + (r() - 0.5) * desl); }
      novo.push(pts[pts.length - 1]); pts = novo;
    }
    const passo = 1600 / (pts.length - 1);
    return "M0 600V" + pts[0].toFixed(1) + pts.map((y, k) => "L" + (k * passo).toFixed(1) + " " + y.toFixed(1)).join("") + "V600Z";
  };
  $("#serra0").setAttribute("d", serra(400, 150, 0.52, 11));
  $("#serra1").setAttribute("d", serra(450, 150, 0.55, 29));
  $("#serra2").setAttribute("d", serra(512, 100, 0.55, 47));
}

/* ---------- Renderização ---------- */
// Só reescreve o HTML quando mudou (a tela ao vivo não recria controles à toa e o foco não se perde).
function setHtml(el, html) { if (el.__h === html) return; el.__h = html; el.innerHTML = html; }
const tituloLeit = () => (REAL && !comandosAtivos() ? ` title="${DICA_LEITURA}"` : "");
// cena: sem regra "executar", offline/carregando, ou uma cena/lote em andamento = desabilitada (evita toque duplo)
const cenaBloqueada = (c) => (REAL ? !comandosAtivos() || semDados() || !!S.cenaOcupada || !window.CasaReal.acaoRegra(CMD.regras, c.disp, "executar") : travado());
const traco = '<span class="num" aria-label="sem leitura">—</span>';
function renderResumo() {
  const todos = [...estado.values()].filter((d) => !d.indisp);
  const luzes = todos.filter((d) => d.tipo === "light" || d.tipo === "led");
  const acesas = luzes.filter((d) => d.on).length;
  const ativos = todos.filter((d) => !d.sensor && !d.info && d.on).length;
  const portas = todos.filter((d) => d.tipo === "door" && d.on).length;
  const hora = agora().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const car = esq();
  const b = (v) => (car ? traco : `<b class="num">${v}</b>`);
  setHtml($("#resumo"), `
    <li class="clock num">${hora}</li>
    ${REAL ? "" : `<li>${ic("cloud", 16)}${car ? traco : '<b class="num">24°</b>'} Ar livre <span class="eyebrow">simulado</span></li>`}
    <li>${ic("light", 16)}${b(`${acesas}/${luzes.length}`)} Luzes</li>
    <li>${ic("bolt", 16)}${b(ativos)} Ativos</li>
    <li class="${!car && portas ? "warn" : ""}">${ic("door", 16, !car && portas > 0)}${b(portas)} ${portas === 1 ? "Porta aberta" : "Portas abertas"}</li>`);
  renderManutChip();
}

// Chip de Manutenção: botão persistente (só o conteúdo muda; foco e clique não se perdem a cada tick).
let chipHtml = "";
function renderManutChip() {
  const el = $("#manut-chip");
  if (!el) return;
  const car = esq(), r = resumoManut();
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
  const m = { online: ["ok", REAL ? (comandosAtivos() ? "Ao vivo" : "Ao vivo · somente leitura") : "Sistema online"], sincronizando: ["warn", "Sincronizando"], carregando: ["warn", "Conectando"], offline: ["bad", REAL && !S.recebeu ? "Sem dados da casa" : "Offline · último estado"] }[S.net];
  $("#status").innerHTML = `<i class="dot dot-${m[0]}"></i>${m[1]}`;
  $("#banner").hidden = S.net !== "offline";
  $("#banner-txt").textContent = !REAL ? "Sem conexão com a casa. Mostrando o último estado conhecido; comandos pausados até reconectar."
    : S.recebeu ? `Sem conexão com a casa. Mostrando o último estado conhecido. ${comandosAtivos() ? "Comandos pausados até reconectar." : "Somente leitura."}`
    : "Sem dados da casa. Abra o painel pela Home Assistant e aguarde a conexão; nada é simulado.";
  document.body.dataset.net = S.net;
}

const skTile = '<div class="dev glass sk" aria-hidden="true"><div class="dev-top"><span class="chip"></span></div><div><div class="sk-l w60"></div><div class="sk-l w40"></div></div></div>';

function renderCenas() {
  if (esq()) {
    setHtml($("#cenas"), Array.from({ length: REAL ? 4 : 5 }, () => '<div class="scene glass sk" aria-hidden="true"><span class="ico"></span><span class="txt"><span class="sk-l w60"></span><span class="sk-l w80"></span></span></div>').join(""));
    return;
  }
  setHtml($("#cenas"), CENAS.map((c) => `
    <button type="button" class="scene glass" data-cena="${c.id}" aria-pressed="${S.cena === c.id}" ${cenaBloqueada(c) ? "disabled" : ""}${S.cenaOcupada === c.id ? ' aria-busy="true"' : ""}${tituloLeit()}>
      <span class="ico">${ic(c.icone, 20, S.cena === c.id)}</span>
      <span class="txt"><span class="nome">${esc(c.nome)}</span><span class="desc">${esc(c.desc)}</span></span>
    </button>`).join(""));
}

function renderAmbientes() {
  const total = [...estado.values()].filter((d) => !d.sensor && !d.info && !d.indisp && d.on).length;
  const car = esq();
  const item = (id, nome, icone, n) => `
    <li><button type="button" class="amb" data-amb="${id}" aria-current="${S.filtro === id}">
      ${ic(icone, 16, S.filtro === id)}<span class="n">${esc(nome)}</span><span class="count num">${car ? "" : n || ""}</span></button></li>`;
  setHtml($("#lista-ambientes"), item("todos", "Todos", "grid", total) +
    SALAS.map((s) => item(s.id, s.nome, "room", ligados(s.id))).join(""));
  renderRail();
}

// Rail do celular: criado uma vez (preserva a rolagem e o foco); depois só atualiza aria-current e o ícone.
const RAIL = () => [["todos", "Todos", "grid"], ...SALAS.map((s) => [s.id, s.nome, s.icone])];
function renderRail() {
  const ul = $("#rail");
  const sigRail = RAIL().map((r) => r[0]).join(",");
  if (!ul.children.length || ul.dataset.sig !== sigRail) {
    ul.dataset.sig = sigRail;
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
  const off = semDados();
  const selo = (off || d.indisp) ? `<span class="selo" title="${d.indisp ? "Indisponível" : "Sem conexão"}">${ic("offline", 12)}</span>` : "";
  const bat = indBat(d);
  const aj = temAjustes(d) && !off;
  const pop = aj && abrePopup(d);
  const dica = pop ? "Toque para abrir os controles. Use o interruptor do cartão para ligar ou desligar"
    : REAL ? (comandosAtivos() ? "Toque para alternar. Segure para ajustar" : `${DICA_LEITURA}. Segure para ver os detalhes`) : DICA;
  const ajAttr = aj ? ` data-ajustes="true"${pop ? ' data-popup="true" aria-haspopup="dialog"' : ""} title="${dica}" aria-description="${dica}. Pelo teclado: Shift+Enter."` : "";
  // somente leitura (kill-switch ou aparelho sem regra de comando): não é botão quebrado, só não comanda
  const leitAttr = REAL && !off && !podeToque(d) ? ' aria-disabled="true" data-leitura="true"' : "";
  const pendAttr = pendente(chave) ? ' data-pendente="true" aria-busy="true"' : "";
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
  return `<button type="button" class="dev glass" role="switch" aria-checked="${d.on}" data-dev="${chave}" data-tipo="${d.tipo}"${pendAttr} ${off ? 'data-offline="true" disabled' : ajAttr + leitAttr}>
    <div class="dev-top"><span class="chip">${ic(d.tipo, 20, d.on)}${selo}</span><span class="sw" aria-hidden="true"></span></div>
    <div><div class="name">${esc(d.nome)}${d.fav ? `<span class="fav-ico" title="Favorito">${ic("star", 12, true)}</span>` : ""}</div><div class="sub" data-sub="${chave}">${sub}</div></div>${ajIco}</button>`;
}

function secaoHtml(s, entradas) {
  const itens = acionaveis(s.id);
  const n = itens.filter((d) => d.on).length;
  let acao = itens.length === 0 ? "" : n === 0
    ? `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="1" ${travado() ? "disabled" : ""}${tituloLeit()}>${REAL ? "Acender luzes" : "Acender tudo"}</button>`
    : `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="0" ${travado() ? "disabled" : ""}${tituloLeit()}>${REAL ? "Apagar luzes" : "Apagar tudo"}</button>`;
  if (comandosAtivos()) {   // só as luzes (e o interruptor de luz) do cômodo; cômodo sem luz comandável = sem botão
    const cs = cartoesSala(s.id), R = window.CasaReal;
    const apagar = R.itensLote(cs, false, CMD.regras).length > 0, acender = R.itensLote(cs, true, CMD.regras).length > 0;
    const ocupado = semDados() || !!S.loteOcupado;
    acao = !apagar && !acender ? "" : `<button type="button" class="pill-btn" data-todos="${s.id}" data-valor="${apagar ? 0 : 1}" ${ocupado ? "disabled" : ""}${S.loteOcupado === s.id ? ' aria-busy="true"' : ""} title="${apagar ? "Apaga" : "Acende"} as luzes deste cômodo" aria-label="${apagar ? "Apagar luzes: apaga as luzes de" : "Acender luzes: acende as luzes de"} ${esc(s.nome)}">${apagar ? "Apagar luzes" : "Acender luzes"}</button>`;
  }
  const resumo = `${REAL ? (s.leitura ? s.leitura + " · " : "") : s.t + "° · "}${n} de ${itens.length} ligados`;
  return `<section aria-label="${esc(s.nome)}">
    <div class="room-head"><div><h2>${esc(s.nome)}</h2><p class="muted num">${resumo}</p></div>${acao}</div>
    <div class="devs">${entradas.map(([k, d]) => tileHtml(k, d)).join("")}</div></section>`;
}

function renderComodos() {
  const alvo = $("#lista-comodos");
  if (esq()) {
    setHtml(alvo, [0, 1].map(() => `<section aria-hidden="true">
      <div class="room-head"><div><div class="sk-l w120"></div><div class="sk-l w60"></div></div></div>
      <div class="devs">${skTile.repeat(4)}</div></section>`).join(""));
    alvo.dataset.sig = ""; alvo.__p = null;
    return;
  }
  const lista = SALAS.filter((s) => S.filtro === "todos" || s.id === S.filtro);
  const favs = [...estado.entries()].filter(([, d]) => d.fav);
  const favAc = favs.filter(([, d]) => !d.sensor && !d.info);
  const favHtml = S.filtro === "todos" && favs.length
    ? `<section aria-label="Favoritos"><div class="room-head"><div><h2>${ic("star", 20, true)} Favoritos</h2><p class="muted num">${favAc.filter(([, d]) => d.on).length} de ${favAc.length} ligados</p></div></div>
      <div class="devs">${favs.map(([k, d]) => tileHtml(k, d)).join("")}</div></section>` : "";
  const partes = (favHtml ? [favHtml] : []).concat(lista.map((s) => secaoHtml(s, [...estado.entries()].filter(([, d]) => d.sala === s.id))));
  const sig = `${S.filtro}|${partes.length}|${favHtml ? 1 : 0}`, filhos = alvo.children;
  if (alvo.dataset.sig === sig && alvo.__p && filhos && filhos.length === partes.length) {
    // tempo real: troca só as seções que mudaram (rolagem e foco do resto ficam intactos)
    const ativo = document.activeElement, chaveAtiva = ativo && ativo.dataset && ativo.dataset.dev;
    partes.forEach((h, i) => { if (alvo.__p[i] !== h) filhos[i].outerHTML = h; });
    if (chaveAtiva && document.activeElement === document.body) {
      const novo = alvo.querySelector(`[data-dev="${chaveAtiva}"]`);
      if (novo && !novo.disabled) novo.focus({ preventScroll: true });
    }
  } else alvo.innerHTML = partes.join("");
  alvo.dataset.sig = sig; alvo.__p = partes;
}

function renderCameras() {
  const off = S.net === "offline", car = esq();
  if (REAL && !car) {   // câmeras da HA que estiverem no contrato: só o estado (sem miniatura nem stream nesta fase)
    setHtml($("#cameras"), REAL_CAMS.length ? REAL_CAMS.map((c) => `
      <div class="cam glass"><div class="cam-view">
        ${c.indisp || off ? `<span class="live live-off">${ic("offline", 12)}Sem sinal</span>` : '<span class="live"><i></i>Ao vivo</span>'}${ic("camera", 24)}</div>
      <div class="cam-foot"><span>${esc(c.nome)}</span><span>HA</span></div></div>`).join("") : `
      <div class="cam glass"><div class="cam-view"><span class="live live-off">${ic("offline", 12)}Sem câmeras</span>${ic("camera", 24)}</div>
      <div class="cam-foot"><span>Nenhuma câmera no contrato da casa</span><span>—</span></div></div>`);
    return;
  }
  setHtml($("#cameras"), ["Rua · Canal 2", "Rua · Canal 4"].map((n) => `
    <div class="cam glass ${car ? "sk" : ""}"><div class="cam-view">
      ${car ? "" : off ? `<span class="live live-off">${ic("offline", 12)}Sem sinal</span>` : '<span class="live"><i></i>Ao vivo</span>'}${car ? "" : ic("camera", 24)}</div>
    <div class="cam-foot"><span>${n}</span><span>1080P</span></div></div>`).join(""));
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

let entradaFeita = false;
function renderTudo() {
  renderStatus(); renderCeu(); renderSaudacao(); renderResumo(); renderCenas(); renderAmbientes(); renderComodos(); renderCameras(); renderAbas(); atualizaFolha(); atualizaManut(); dicasRolagem();
  if (!entradaFeita && !esq()) {   // cascata de entrada dos cartões: só na primeira vez que o dado chega
    entradaFeita = true;
    try { document.body.dataset.entrada = "1"; setTimeout(() => { delete document.body.dataset.entrada; }, 1500); } catch { /* sem DOM completo */ }
  }
}

/* ---------- Interação (otimista: muda na hora; offline e carregando recusam comando, sem trava fantasma) ---------- */
const vibrar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* sem suporte */ } };
let timerNet = null;

/* aviso curto com "Desfazer" (cenas e "Apagar/Acender luzes"; no simulado "Apagar/Acender tudo") */
let toastT = null, toastUndo = null;
const instantaneo = () => ({ ons: new Map([...estado].map(([k, d]) => [k, d.on])), cena: S.cena });
const restaura = (s) => { s.ons.forEach((v, k) => { estado.get(k).on = v; }); S.cena = s.cena; };
function mostraToast(msg, desfazer, tom) {
  const t = $("#toast");
  toastUndo = desfazer || null;
  t.dataset.tom = tom || ""; t.setAttribute("role", tom === "erro" ? "alert" : "status");
  t.innerHTML = `<span class="toast-t">${esc(msg)}</span>${desfazer ? `<button type="button" class="toast-b" data-desfazer>${ic("undo", 16)}<span>Desfazer</span></button>` : ""}`;
  t.hidden = false; void t.offsetWidth; t.dataset.estado = "aberto";
  clearTimeout(toastT); toastT = setTimeout(escondeToast, tom === "erro" ? 7000 : 5000);
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
    if (semDados()) return;
    const dd = estado.get(alvo.dataset.dev);
    if (dd && abrePopup(dd) && !ev.target.closest(".sw")) { abrirFolha(alvo.dataset.dev); return; }   // popup; o interruptor do cartão é que liga/desliga
    if (REAL) { toqueReal(alvo.dataset.dev); renderTudo(); return; }   // só comanda com regras; senão avisa "somente leitura"
    const d = estado.get(alvo.dataset.dev);
    if (d.tipo === "vacuum") { abrirFolha(alvo.dataset.dev); return; }   // aspirador: toque curto abre a folha
    d.on = !d.on; S.cena = null; vibrar();
  } else if (alvo.dataset.todos) {
    if (REAL && comandosAtivos()) { if (!semDados()) todosReal(alvo.dataset.todos, alvo.dataset.valor === "1"); renderTudo(); return; }
    if (travado()) return;
    const antes = instantaneo(), ligar = alvo.dataset.valor === "1", nomeSala = SALAS.find((s) => s.id === alvo.dataset.todos).nome;
    acionaveis(alvo.dataset.todos).forEach((d) => { d.on = ligar; }); S.cena = null; vibrar();
    mostraToast(`${nomeSala}: ${ligar ? "tudo aceso" : "tudo apagado"}`, () => restaura(antes));
  } else if (alvo.dataset.cena) {
    if (REAL) { if (comandosAtivos() && !semDados()) cenaReal(alvo.dataset.cena); renderTudo(); return; }
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
  pct: { rot: "Velocidade", min: 0, max: 100, step: 1, get: (d) => d.pct ?? 0, set: () => {}, txt: (v) => `${v}%`, vt: (v) => `${v} por cento` },   // só modo real (percentage do ventilador)
  vol: { rot: "Volume", min: 0, max: 100, step: 1, get: (d) => d.vol, set: (d, v) => { d.vol = v; if (v > 0) d.mudo = false; }, txt: (v) => `${v}%`, vt: (v) => `${v} por cento` },
};
const DIRECOES = { forward: "Ventilador (descer ar)", reverse: "Exaustor (subir ar)" };
const SEGS = {
  vel: { rot: "Velocidade", valores: [1, 2, 3], rotulo: (v) => String(v), aria: (v) => `Velocidade ${v}`, get: (d) => d.vel, set: (d, v) => { d.vel = v; } },
  dir: { rot: "Modo", valores: ["forward", "reverse"], rotulo: (v) => DIRECOES[v], aria: (v) => `Modo ${DIRECOES[v]}`, get: (d) => d.dir, set: () => {} },   // só modo real; nomes do Painel Primário (FanControlCard)
  suc: { rot: "Sucção", valores: [1, 2, 3], rotulo: (v) => SUCCAO[v - 1], aria: (v) => `Sucção ${SUCCAO[v - 1].toLowerCase()}`, get: (d) => d.suc, set: (d, v) => { d.suc = v; } },
};
const VAC = { limpando: ["play", "Iniciar"], pausado: ["pause", "Pausar"], base: ["base", "Voltar à base"] };

let folhaChave = null, folhaFechando = false, folhaAbertaEm = 0, lp = null;
const durFast = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-fast")) || 180;

// Dial do popup: anel de 270° (abertura embaixo). O valor vem do input[type=range] correspondente (atualizaFolha escreve --r e o número).
function dialHtml(d, id, temOn) {
  const centro = `<span class="dial-ico" aria-hidden="true">${ic(d.tipo, 34, true)}</span><span class="dial-val num" data-dialval="${id}"></span><span class="dial-rot" data-rot="on">Ligado</span>`;
  return `<div class="dial" data-dial="${id}" style="--r:0">
    <svg class="dial-svg" viewBox="0 0 220 220" focusable="false" aria-hidden="true">
      <circle class="dial-trilha" cx="110" cy="110" r="88" pathLength="360"/>
      <circle class="dial-prog" cx="110" cy="110" r="88" pathLength="360"/>
      <circle class="dial-pino" cx="198" cy="110" r="10"/>
    </svg>
    ${temOn ? `<button type="button" class="dial-power" role="switch" aria-checked="false" data-sw="on">${centro}</button>` : `<div class="dial-power">${centro}</div>`}
  </div>`;
}
function montaFolha(d) {
  const slider = (id, mn = SLIDERS[id].min, mx = SLIDERS[id].max) => `<div class="ctl"><div class="ctl-linha"><label class="rot" for="f-${id}">${SLIDERS[id].rot}</label><output class="num val" for="f-${id}" data-val="${id}"></output></div>
    <input class="rng" type="range" id="f-${id}" data-ctl="${id}" min="${mn}" max="${mx}" step="${SLIDERS[id].step}"></div>`;
  const sw = (id, rot) => `<button type="button" class="ctl-sw" role="switch" aria-checked="false" data-sw="${id}"><span class="rot" data-rot="${id}">${rot}</span><span class="sw" aria-hidden="true"></span></button>`;
  const seg = (id) => `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-${id}-r">${SEGS[id].rot}</span></div>
    <div class="${id === "dir" ? "segs segs-app" : "segs"}" role="group" aria-labelledby="f-${id}-r">${SEGS[id].valores.map((v) => `<button type="button" class="segbtn" data-seg="${id}" data-v="${v}" aria-pressed="false" aria-label="${SEGS[id].aria(v)}">${SEGS[id].rotulo(v)}</button>`).join("")}</div></div>`;
  let h = "";
  if (comandosAtivos() && d.real) {
    h += controlesReais(d, slider, sw, seg);
  } else if (d.tipo === "vacuum") {
    h += `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-vac-r">Operação</span></div>
      <div class="segs segs-vac" role="group" aria-labelledby="f-vac-r">${Object.entries(VAC).map(([k, [i, t]]) => `<button type="button" class="segbtn segbtn-v" data-vac="${k}" aria-pressed="false">${ic(i, 20)}<span>${t}</span></button>`).join("")}</div></div>` + seg("suc");
  } else {
    h += sw("on", "Ligado");
    if ((d.tipo === "light" || d.tipo === "led") && !d.semDimmer) h += slider("bri");
    if (d.real ? d.temp != null : d.tipo === "led" || ["sala.painel", "luca.yeelink", "closet.led", "gourmet.led"].includes(`${d.sala}.${d.id}`)) h += slider("temp");
    if (d.tipo === "led" && !d.real) h += `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-cor-r">Cor</span></div>
      <div class="cores" role="group" aria-labelledby="f-cor-r">${CORES.map(([k, n, c]) => `<button type="button" class="cor" data-cor="${k}" style="--c:${c}" aria-pressed="false" aria-label="${n}"></button>`).join("")}</div></div>`;
    if (d.tipo === "fan") h += d.real ? (d.pct != null ? slider("pct") : "") + (d.osc != null ? sw("osc", "Oscilar") : "") : seg("vel") + sw("osc", "Oscilar");
    if (d.tipo === "tv" && d.real) h += (d.vol != null ? slider("vol") : "") + (d.mudo != null ? sw("mudo", "Mudo") : "");
    else if (d.tipo === "tv") h += slider("vol") + sw("mudo", "Mudo") +
      `<div class="ctl"><div class="ctl-linha"><span class="rot" id="f-app-r">Entrada</span></div>
      <div class="segs segs-app" role="group" aria-labelledby="f-app-r">${APPS.map((a) => `<button type="button" class="segbtn" data-app="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join("")}</div></div>`;
  }
  const prim = d.tipo === "vacuum" ? null : ["bri", "pct", "vol"].find((id) => h.includes(`data-ctl="${id}"`));
  if (prim) {   // dial circular no topo; o input[type=range] segue no DOM (teclado, leitor de tela), só escondido
    const reOn = /<button type="button" class="ctl-sw"[^>]*data-sw="on">[\s\S]*?<\/button>/;
    const temOn = reOn.test(h);
    h = h.replace(reOn, "").replace(`<div class="ctl"><div class="ctl-linha"><label class="rot" for="f-${prim}"`, `<div class="ctl ctl-dial"><div class="ctl-linha"><label class="rot" for="f-${prim}"`);
    h = dialHtml(d, prim, temOn) + h;
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
  const semTv = comandosAtivos() && d.tipo === "tv" && !d.on;   // TV apagada: volume, mudo, entrada e controle remoto não fazem sentido
  $("#folha-s").textContent = subtitulo(d);
  const av = $("#folha-aviso");
  av.hidden = !bloq;
  av.textContent = S.net === "offline" ? "Sem conexão com a casa. Ajustes pausados até reconectar." : S.net === "carregando" ? "Conectando à casa. Ajustes pausados." : "Somente leitura. Comandos desativados neste painel.";
  f.querySelectorAll("[data-ctl]").forEach((el) => {
    const c = SLIDERS[el.dataset.ctl], v = c.get(d);
    const mn = el.getAttribute("min") != null && el.getAttribute("min") !== "" ? +el.getAttribute("min") : c.min, mx = el.getAttribute("max") != null && el.getAttribute("max") !== "" ? +el.getAttribute("max") : c.max;
    if (+el.value !== v) el.value = String(v);
    el.style.setProperty("--r", String(Math.min(1, Math.max(0, (v - mn) / (mx - mn)))));
    el.setAttribute("aria-valuetext", c.vt(v));
    f.querySelector(`[data-val="${el.dataset.ctl}"]`).textContent = c.txt(v);
    el.disabled = bloq || (semTv && el.dataset.ctl === "vol");
    const dial = f.querySelector(`.dial[data-dial="${el.dataset.ctl}"]`);
    if (dial) {
      dial.style.setProperty("--r", String(Math.min(1, Math.max(0, (v - mn) / (mx - mn)))));
      dial.dataset.bloq = String(el.disabled);
      dial.querySelector("[data-dialval]").textContent = c.txt(v);
    }
  });
  f.querySelectorAll("[data-sw]").forEach((el) => {
    const id = el.dataset.sw, v = id === "on" ? d.on : d[id];
    el.setAttribute("aria-checked", String(!!v)); el.disabled = id === "fav" ? semDados() : bloq || (semTv && id === "mudo");   // Favorito é local: segue valendo no modo real
    if (id === "on") el.querySelector("[data-rot]").textContent = v ? "Ligado" : "Desligado";
  });
  f.querySelectorAll("[data-seg]").forEach((el) => { el.setAttribute("aria-pressed", String(String(SEGS[el.dataset.seg].get(d)) === el.dataset.v)); el.disabled = bloq || (el.dataset.seg === "dir" && !d.on); });
  f.querySelectorAll("[data-app]").forEach((el) => { el.setAttribute("aria-pressed", String(d.app === el.dataset.app)); el.disabled = bloq || semTv; });
  f.querySelectorAll("[data-rem]").forEach((el) => { el.disabled = bloq || semTv; });
  f.querySelectorAll("[data-modo]").forEach((el) => { el.setAttribute("aria-pressed", String(d.modo === el.dataset.modo)); el.disabled = bloq; });
  f.querySelectorAll("[data-vacacao]").forEach((el) => {
    const a = el.dataset.vacacao;
    el.setAttribute("aria-pressed", String((a === "iniciar" && d.vst === "limpando") || (a === "pausar" && d.vst === "pausado") || (a === "base" && d.vst === "retornando")));
    el.disabled = bloq;
  });
  f.querySelectorAll("[data-cor]").forEach((el) => { el.setAttribute("aria-pressed", String(d.cor === el.dataset.cor)); el.disabled = bloq; });
  f.querySelectorAll("[data-vac]").forEach((el) => { el.setAttribute("aria-pressed", String(d.vst === el.dataset.vac)); el.disabled = bloq; });
}

function abrirFolha(chave) {
  const d = estado.get(chave);
  if (folhaChave || folhaFechando || manutAberta || manutFechando || !d || !temAjustes(d) || semDados()) return;
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

function aplicarFolha(fn, local = false) {
  if (!folhaChave || (local ? semDados() : travado())) return;   // só o Favorito (local) escapa do modo somente leitura
  fn(estado.get(folhaChave)); S.cena = null; salvaFavs();
  renderTudo();                              // também chama atualizaFolha(); a folha em si não é recriada
}

$("#folha").addEventListener("input", (ev) => {
  const el = ev.target.closest("[data-ctl]");
  if (!el) return;
  if (comandosAtivos()) { ajusteReal(el.dataset.ctl, +el.value, false); return; }   // modo real com comandos: valor local + comando com debounce
  aplicarFolha((d) => SLIDERS[el.dataset.ctl].set(d, +el.value));
});
$("#folha").addEventListener("change", (ev) => {   // soltou o deslizante: envia na hora o valor final
  const el = ev.target.closest && ev.target.closest("[data-ctl]");
  if (el && comandosAtivos()) ajusteReal(el.dataset.ctl, +el.value, true);
});
$("#folha").addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-folha-fechar],[data-sw],[data-seg],[data-app],[data-cor],[data-vac],[data-vacacao],[data-modo],[data-rem]");
  if (!alvo) return;
  if (alvo.hasAttribute("data-folha-fechar")) {
    if (alvo.classList.contains("folha-fundo") && performance.now() - folhaAbertaEm < 300) return;
    fecharFolha(); return;
  }
  const dt = alvo.dataset;
  if (comandosAtivos() && dt.sw !== "fav") { folhaClickReal(dt); return; }   // só o Favorito continua local
  if (dt.sw) aplicarFolha((d) => { if (dt.sw === "on") d.on = !d.on; else d[dt.sw] = !d[dt.sw]; }, dt.sw === "fav");
  else if (dt.seg && dt.seg !== "dir") aplicarFolha((d) => SEGS[dt.seg].set(d, +dt.v));
  else if (dt.app) aplicarFolha((d) => { d.app = dt.app; });
  else if (dt.cor) aplicarFolha((d) => { d.cor = dt.cor; d.on = true; });
  else if (dt.vac) aplicarFolha((d) => { d.vst = dt.vac; });
});
// Arrasto do dial: converte o ângulo do ponteiro em valor, move o input[type=range] e dispara os MESMOS eventos input/change de antes.
let dialAtivo = null;
// luz que acompanha o ponteiro nos cartões e cenas (só escreve --mx/--my; o brilho é CSS)
let quadroLuz = 0;
function luzNoPonteiro(ev) {
  const t = ev.target && ev.target.closest && ev.target.closest(".dev,.scene");
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty("--mx", `${Math.round(ev.clientX - r.left)}px`); t.style.setProperty("--my", `${Math.round(ev.clientY - r.top)}px`);
}
document.addEventListener("pointerdown", luzNoPonteiro, { passive: true });
document.addEventListener("pointermove", (ev) => {
  if (quadroLuz || ev.pointerType === "touch") return;
  quadroLuz = requestAnimationFrame(() => { quadroLuz = 0; luzNoPonteiro(ev); });
}, { passive: true });
function moverDial(ev) {
  const { dial, el } = dialAtivo, r = dial.querySelector("svg").getBoundingClientRect();
  const rel = ((Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)) * 180) / Math.PI - 135 + 720) % 360;
  let f = rel <= 270 ? rel / 270 : rel - 270 < 45 ? 1 : 0;           // a abertura de baixo gruda no fim mais próximo
  if (dialAtivo.f > 0.75 && f < 0.25) f = 1; else if (dialAtivo.f < 0.25 && f > 0.75) f = 0;   // não dá a volta de um fim ao outro
  dialAtivo.f = f;
  const mn = +el.min, mx = +el.max, passo = +el.step || 1;
  const v = Math.min(mx, Math.max(mn, Math.round((mn + f * (mx - mn)) / passo) * passo));
  if (String(v) === el.value) return;
  el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true }));
}
$("#folha").addEventListener("pointerdown", (ev) => {
  const dial = ev.target.closest && ev.target.closest(".dial");
  if (!dial || ev.target.closest(".dial-power") || (ev.pointerType === "mouse" && ev.button !== 0)) return;
  const el = $("#folha").querySelector(`[data-ctl="${dial.dataset.dial}"]`);
  if (!el || el.disabled) return;
  ev.preventDefault(); dial.setPointerCapture(ev.pointerId); dial.dataset.arrasta = "1";
  dialAtivo = { dial, el, f: (+el.value - +el.min) / (+el.max - +el.min) };
  moverDial(ev);
});
$("#folha").addEventListener("pointermove", (ev) => { if (dialAtivo) moverDial(ev); });
const fimDial = () => { if (!dialAtivo) return; const { el, dial } = dialAtivo; dialAtivo = null; delete dial.dataset.arrasta; el.dispatchEvent(new Event("change", { bubbles: true })); };
$("#folha").addEventListener("pointerup", fimDial);
$("#folha").addEventListener("pointercancel", fimDial);
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
  if (!card || semDados() || folhaChave) return;
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
document.addEventListener("selectstart", (ev) => ev.preventDefault());   // sem seleção de texto/conteúdo
document.addEventListener("dragstart", (ev) => ev.preventDefault());
document.addEventListener("contextmenu", (ev) => {
  ev.preventDefault();   // nenhum menu do navegador (copiar, salvar imagem…); o toque longo em cartão abre a folha abaixo
  const card = cartaoAjustes(ev);
  if (!card) return;
  if (!semDados()) abrirFolha(card.dataset.dev);
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

/* ---------- Comandos (fase B): só no modo real com regras (comandos.json) e ponte; senão tudo segue somente leitura ---------- */
// O painel só pede {dispositivo (id do contrato), ação, params}; o carregador valida e chama a HA. Nada de entity_id/serviço aqui.
const CR = window.CasaReal;
const TRAVA_MS = 5000, DEBOUNCE_MS = 200, BLOQUEIO_CENA_MS = 1000;
const travas = new Map();   // `${cartão}|${campo}` -> { v, extra, t }: valor otimista até a HA confirmar (ou 5 s)
const chaveTrava = (chave, campo) => `${chave}|${campo}`;
const pendente = (chave) => { for (const k of travas.keys()) if (k.startsWith(chave + "|")) return true; return false; };
const podeToque = (d) => comandosAtivos() && ["ligar", "desligar", "repouso"].some((a) => !!CR.acaoRegra(CMD.regras, d.id, a));
function limpaTrava(k) { const t = travas.get(k); if (t) { clearTimeout(t.t); travas.delete(k); } }
function armaTrava(chave, campo, v, extra, ms) {
  const k = chaveTrava(chave, campo); limpaTrava(k);
  travas.set(k, { v, extra: extra || null, t: setTimeout(() => expiraTrava(k), ms || TRAVA_MS) });
  const d = estado.get(chave);
  if (d) { d[campo] = v; if (extra) Object.assign(d, extra); }
}
function expiraTrava(k) {
  if (!travas.has(k)) return;
  travas.delete(k);   // a HA não confirmou no prazo da ação (5 s; TV/PS5 mais): volta ao estado REAL (que sempre prevalece)
  sincronizaReal(); mostraToast("A casa não confirmou. Mostrando o estado real.", null, "erro"); renderTudo();
}
const valorReal = (c, campo) => (campo === "cor" ? CR.corDoRgb(c.rgbCor) : c[campo]);
// chamado por aplicaCartao: o estado real confirma a trava (limpa) ou a trava segue valendo até expirar
function aplicaTravas(d, c) {
  for (const [k, t] of [...travas]) {
    if (!k.startsWith(c.chave + "|")) continue;
    const campo = k.slice(c.chave.length + 1);
    if (CR.iguais(campo, valorReal(c, campo), t.v)) { limpaTrava(k); continue; }
    d[campo] = t.v; if (t.extra) Object.assign(d, t.extra);
  }
}

// Envia um comando (com a trava otimista); em erro/timeout reverte na hora e avisa; nunca reenvia sozinho.
function enviaComando(chave, acao, params, info, confirmado) {
  const d = estado.get(chave);
  if (!d || !comandosAtivos() || semDados()) return Promise.resolve(null);
  const espera = CR.confirmaMsDaAcao(CMD.regras, d.id, acao);   // 5 s; TV e PS5 esperam mais (comandos.json)
  (info || []).forEach(([campo, v, extra]) => armaTrava(chave, campo, v, extra, espera));
  S.cena = null; vibrar();
  const p = CMD.cliente.comandar(d.id, acao, params || null, { confirmado: confirmado === true }).then((r) => {
    if (r.ok) return r;                                   // aceito: o cartão só vale de verdade quando a HA confirmar
    (info || []).forEach(([campo]) => limpaTrava(chaveTrava(chave, campo)));
    sincronizaReal();
    if (r.erro === "confirmacao_necessaria" && !confirmado && r.confirmar) {
      abrirConfirma({ titulo: d.nome, texto: r.confirmar, rotulo: "Confirmar", aoConfirmar: () => enviaComando(chave, acao, params, info, true) });
    } else mostraToast(CR.mensagemErro(r.erro), null, "erro");
    renderTudo();
    return r;
  });
  renderTudo();
  return p;
}
// Ação com confirmação (texto de comandos.json) abre o diálogo antes de enviar; sem confirmação envia direto.
function executa(chave, acao, params, info) {
  const d = estado.get(chave);
  const texto = CR.textoConfirmacao(CMD.regras, d.id, acao);
  if (texto) { abrirConfirma({ titulo: d.nome, texto, rotulo: "Confirmar", aoConfirmar: () => enviaComando(chave, acao, params, info, true) }); return null; }
  return enviaComando(chave, acao, params, info, false);
}
// Toque curto no cartão (ou o interruptor "Ligado" da folha).
function toqueReal(chave) {
  const d = estado.get(chave);
  if (!comandosAtivos()) { mostraToast(DICA_LEITURA); return; }
  if (d.tipo === "vacuum") { abrirFolha(chave); return; }
  const acao = CR.escolherAcaoToque(d, CMD.regras);
  if (!acao || !CR.podeComandar(CMD.regras, ctxCmd(), d, acao)) { mostraToast("Este aparelho não aceita comandos agora."); return; }
  executa(chave, acao, null, [["on", acao === "ligar"]]);
}

// "Apagar/Acender luzes": um lote só com luzes (e interruptor de luz) do cômodo; Desfazer reaplica o inverso pelas mesmas ações.
function todosReal(salaId, ligar) {
  if (S.loteOcupado) return;
  const itens = CR.itensLote(cartoesSala(salaId), ligar, CMD.regras);
  if (!itens.length) return;
  enviaLote(salaId, itens, ligar, (SALAS.find((s) => s.id === salaId) || { nome: "" }).nome, true);
}
function enviaLote(salaId, itens, ligar, nome, comDesfazer) {
  const chaves = itens.map((i) => `${salaId}.${i.dispositivo}`);
  chaves.forEach((ch) => armaTrava(ch, "on", ligar));
  S.loteOcupado = salaId; S.cena = null; vibrar();
  const p = CMD.cliente.comandarLote(itens).then((r) => {
    S.loteOcupado = null;
    if (r.ok) {
      if (comDesfazer) mostraToast(`Luzes de ${nome} ${ligar ? "acesas" : "apagadas"}`, () => enviaLote(salaId, CR.loteInverso(itens), !ligar, nome, false));
      else mostraToast(`Luzes de ${nome}: desfeito`);
    } else {
      const parcial = Array.isArray(r.resultados) && r.resultados.length === itens.length;
      chaves.forEach((ch, i) => { if (!parcial || !r.resultados[i] || !r.resultados[i].ok) limpaTrava(chaveTrava(ch, "on")); });
      sincronizaReal();
      mostraToast(parcial ? "Algumas luzes não responderam. Confira o estado." : CR.mensagemErro(r.erro), null, "erro");
    }
    renderTudo();
    return r;
  });
  renderTudo();
  return p;
}

// Cena: SEMPRE com confirmação, sem Desfazer; aviso de sucesso só depois do resultado; botões travados por ≥ 1 s (toque duplo).
function cenaReal(id) {
  const c = CENAS.find((x) => x.id === id);
  if (!c || S.cenaOcupada || cenaBloqueada(c)) return;
  const texto = CR.textoConfirmacao(CMD.regras, c.disp, "executar") || "Executar esta cena agora?";
  abrirConfirma({
    titulo: `Cena ${c.nome}`, texto, rotulo: "Executar", aoConfirmar: () => {
      const t0 = performance.now();
      S.cenaOcupada = c.id; S.cena = null; vibrar(); renderTudo();
      CMD.cliente.comandar(c.disp, "executar", null, { confirmado: true }).then((r) => {
        if (r.ok) mostraToast(`Cena ${c.nome} executada`); else mostraToast(CR.mensagemErro(r.erro), null, "erro");
        setTimeout(() => { S.cenaOcupada = null; renderTudo(); }, Math.max(0, BLOQUEIO_CENA_MS - (performance.now() - t0)));
        renderTudo();
      });
    },
  });
}

// Ajuste da folha (brilho, temperatura, cor, velocidade, oscilar, volume, mudo, entrada, modo): valor local na hora + comando.
// Deslizantes enviam com debounce de 200 ms e ao soltar (imediato = true).
const debAjuste = new Map();
function infoAjuste(d, campo, valor) {
  const info = [[campo, valor, campo === "vel" ? { pct: CR.velParaPct(valor) } : null]];
  if (["bri", "temp", "cor", "vel"].includes(campo) && !d.on) info.push(["on", true, null]);   // "ajustar"/"velocidade" também ligam
  return info;
}
function ajusteReal(campo, valor, imediato) {
  if (!folhaChave || !comandosAtivos() || semDados()) return;
  const chave = folhaChave, d = estado.get(chave), cmd = CR.comandoDoCampo(campo, valor);
  if (!d || !cmd || !CR.acaoRegra(CMD.regras, d.id, cmd.acao)) return;
  const info = infoAjuste(d, campo, valor), k = chave + "|" + campo;
  info.forEach(([c, v, e]) => armaTrava(chave, c, v, e));
  clearTimeout(debAjuste.get(k)); debAjuste.delete(k);
  const enviar = () => { debAjuste.delete(k); executa(chave, cmd.acao, cmd.params, info); };
  if (imediato) enviar(); else { debAjuste.set(k, setTimeout(enviar, DEBOUNCE_MS)); renderTudo(); }
}
function folhaClickReal(dt) {
  if (!folhaChave || semDados()) return;
  const chave = folhaChave, d = estado.get(chave);
  if (dt.sw === "on") toqueReal(chave);
  else if (dt.sw === "osc") ajusteReal("osc", !d.osc, true);
  else if (dt.sw === "mudo") ajusteReal("mudo", !d.mudo, true);
  else if (dt.seg === "vel") ajusteReal("vel", +dt.v, true);
  else if (dt.seg === "dir") { if (d.on && CR.DIRECOES_OK.includes(dt.v)) ajusteReal("dir", dt.v, true); }
  else if (dt.app) ajusteReal("app", dt.app, true);
  else if (dt.cor) ajusteReal("cor", dt.cor, true);
  else if (dt.modo) ajusteReal("modo", dt.modo, true);
  else if (dt.vacacao) executa(chave, dt.vacacao, null, []);
  else if (dt.rem) executa(chave, "controleRemoto", { command: dt.rem }, []);
}

// Controles da folha no modo real com comandos: só o que tem ação em comandos.json E atributo de suporte no estado real.
function controlesReais(d, slider, sw, seg) {
  const tem = (a) => !!CR.acaoRegra(CMD.regras, d.id, a);
  const grupo = (idr, rot, cls, corpo) => `<div class="ctl"><div class="ctl-linha"><span class="rot" id="${idr}">${rot}</span></div><div class="${cls}" role="group" aria-labelledby="${idr}">${corpo}</div></div>`;
  let h = "";
  if (d.tipo === "vacuum") {
    const ops = [["iniciar", "play", "Iniciar"], ["pausar", "pause", "Pausar"], ["base", "base", "Voltar à base"], ["parar", null, "Parar"], ["localizar", null, "Localizar"], ["limpezaLocal", null, "Limpeza local"]].filter(([a]) => tem(a));
    h += grupo("f-vac-r", "Operação", "segs segs-vac", ops.map(([a, i, t]) => `<button type="button" class="segbtn segbtn-v" data-vacacao="${a}" aria-pressed="false">${i ? ic(i, 20) : ""}<span>${t}</span></button>`).join(""));
    const ms = CR.MODOS_ASPIRADOR.filter(([v]) => !d.modoOpcoes || d.modoOpcoes.includes(v));
    if (tem("modo") && ms.length) h += grupo("f-modo-r", "Sucção", "segs segs-app", ms.map(([v, t]) => `<button type="button" class="segbtn" data-modo="${esc(v)}" aria-pressed="false">${t}</button>`).join(""));
    return h;
  }
  if (tem("ligar") || tem("desligar") || tem("repouso")) h += sw("on", "Ligado");
  if ((d.tipo === "light" || d.tipo === "led") && tem("ajustar")) {
    if (!d.semDimmer) h += slider("bri");
    if (d.temp != null) h += slider("temp", Math.max(1500, d.kmin ?? 2700), Math.min(9000, d.kmax ?? 6500));
    if (d.rgb) h += grupo("f-cor-r", "Cor", "cores", CORES.map(([k, n, c]) => `<button type="button" class="cor" data-cor="${k}" style="--c:${c}" aria-pressed="false" aria-label="${n}"></button>`).join(""));
  }
  if (d.tipo === "fan") {
    if (tem("velocidade")) h += seg("vel");
    if (d.osc != null && tem("oscilar")) h += sw("osc", "Oscilar");
    if (d.dir != null && tem("direcao")) h += seg("dir");   // só se o estado real traz o atributo direction
  }
  if (d.tipo === "tv") {
    if (d.vol != null && tem("volume")) h += slider("vol");
    if (d.mudo != null && tem("mudo")) h += sw("mudo", "Mudo");
    const fs = (d.fontes || []).filter((f) => CR.FONTE_OK.test(f));
    if (tem("fonte") && fs.length) h += grupo("f-app-r", "Entrada", "segs segs-app", fs.map((a) => `<button type="button" class="segbtn" data-app="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join(""));
    if (tem("controleRemoto")) h += grupo("f-rem-r", "Controle remoto", "segs segs-rem", CR.BOTOES_REMOTO.map(([c, t, a]) => `<button type="button" class="segbtn" data-rem="${c}"${a ? ` aria-label="${a}"` : ""}>${t}</button>`).join(""));
  }
  return h;
}

/* ---------- Confirmação (mesma casca da folha): diálogo curto, foco preso, Esc cancela ---------- */
let confirmaEstado = null, confirmaAbertaEm = 0;
const aliviaInert = () => {   // devolve o "inert" ao que valia antes do diálogo (folha/manutenção abertas mantêm a página inerte)
  const algum = !!folhaChave || manutAberta;
  document.querySelector(".wrap").inert = algum; document.querySelector(".tabbar").inert = algum;
  $("#folha").inert = false; $("#manutencao").inert = false;
};
// o cartão é recriado a cada renderização: o foco volta ao controle de origem achado por seletor, não pelo nó antigo
function seletorDe(el) {
  const e = el && el.closest ? el.closest("[data-dev],[data-todos],[data-cena]") : null;
  if (!e) return null;
  const a = e.hasAttribute("data-dev") ? "data-dev" : e.hasAttribute("data-todos") ? "data-todos" : "data-cena";
  return `[${a}="${e.getAttribute(a).replace(/["\\]/g, "\\$&")}"]`;
}
function abrirConfirma(o) {
  if (confirmaEstado) return;
  const el = $("#confirma");
  confirmaEstado = { aoConfirmar: o.aoConfirmar, aoCancelar: o.aoCancelar, voltar: document.activeElement, voltarSel: seletorDe(document.activeElement), setouBody: !document.body.dataset.folha };
  confirmaAbertaEm = performance.now();
  if (toastUndo) escondeToast();
  el.innerHTML = `<div class="folha-fundo" data-confirma-fechar></div>
    <div class="folha-painel confirma-painel glass" role="alertdialog" aria-modal="true" aria-labelledby="conf-t conf-d" tabindex="-1" data-tom="ambar">
      <div class="folha-cab"><div class="folha-tit"><h2 id="conf-t">${esc(o.titulo)}</h2></div></div>
      <div class="folha-corpo"><p class="conf-txt" id="conf-d">${esc(o.texto)}</p>
        <div class="conf-acoes"><button type="button" class="conf-b" data-confirma="nao">Cancelar</button><button type="button" class="conf-b conf-ok" data-confirma="sim">${esc(o.rotulo || "Confirmar")}</button></div></div>
    </div>`;
  el.hidden = false; el.dataset.estado = "entrando";
  document.querySelector(".wrap").inert = true; document.querySelector(".tabbar").inert = true; $("#folha").inert = true; $("#manutencao").inert = true;
  if (confirmaEstado.setouBody) document.body.dataset.folha = "confirma";
  void el.offsetWidth; el.dataset.estado = "aberta";
  const nao = el.querySelector('[data-confirma="nao"]');   // o foco começa no lado seguro (Cancelar)
  (nao || el.querySelector(".folha-painel")).focus({ preventScroll: true });
}
function fecharConfirma(confirmou) {
  const c = confirmaEstado; if (!c) return;
  confirmaEstado = null;
  const el = $("#confirma");
  el.dataset.estado = "saindo";
  setTimeout(() => {
    el.hidden = true; el.innerHTML = ""; el.dataset.estado = "";
    aliviaInert();
    if (c.setouBody) delete document.body.dataset.folha;
    const origem = c.voltarSel ? document.querySelector(c.voltarSel) : null;
    const v = origem || c.voltar;
    if (v && v !== document.body && document.contains(v) && !v.disabled) v.focus({ preventScroll: true });
    else if (folhaChave) { const p = document.querySelector("#folha .folha-painel"); if (p) p.focus({ preventScroll: true }); }
  }, durFast());
  if (confirmou) { if (c.aoConfirmar) c.aoConfirmar(); } else if (c.aoCancelar) c.aoCancelar();
}
$("#confirma").addEventListener("click", (ev) => {
  const alvo = ev.target.closest("[data-confirma],[data-confirma-fechar]");
  if (!alvo) return;
  if (alvo.dataset.confirma === "sim") { fecharConfirma(true); return; }
  if (alvo.hasAttribute("data-confirma-fechar") && performance.now() - confirmaAbertaEm < 300) return;
  fecharConfirma(false);
});
$("#confirma").addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { ev.preventDefault(); fecharConfirma(false); return; }
  if (ev.key === "Tab") prendeTab(ev, $("#confirma"));
});

/* ---------- Modo real (rodada 11 leitura + rodada 12 comandos): contrato.json, comandos.json e estados da HA ---------- */
// Campos de ajuste que sobrevivem enquanto o aparelho está desligado (a HA zera brilho/temperatura de cor ao apagar).
const CAMPOS_AJUSTE = ["bri", "temp", "vel", "pct", "osc", "dir", "vol", "mudo", "app", "subOn"];
function aplicaCartao(d, c) {
  ["sala", "id", "entityId", "nome", "tipo", "indisp", "on", "sensor", "info", "txtOk", "txtAlerta", "desde", "temBat", "batEntityId", "bat",
    "estado", "dominio", "vst", "modo", "modoOpcoes", "rgb", "kmin", "kmax", "fontes"].forEach((k) => { d[k] = c[k]; });
  d.real = true; d.cor = c.on ? window.CasaReal.corDoRgb(c.rgbCor) : null;
  CAMPOS_AJUSTE.forEach((k) => { if (c[k] != null) d[k] = c[k]; else if (c.on || !(k in d)) d[k] = null; });
  if (c.dimmer === true) d.semDimmer = false; else if (c.dimmer === false) d.semDimmer = true; else if (!("semDimmer" in d)) d.semDimmer = true;
  aplicaTravas(d, c);   // valor otimista (comandos) vale até a HA confirmar ou a trava de 5 s expirar
}
function sincronizaReal() {
  const m = window.CasaReal.estadoReal(CONTRATO, ESTADOS, CMD.regras);
  m.salas.forEach((s) => {
    const sala = SALAS.find((x) => x.id === s.id);
    if (sala) sala.leitura = s.leitura;
    s.cartoes.forEach((c) => { const d = estado.get(c.chave); if (d) aplicaCartao(d, c); });
  });
  REAL_BATS = m.baterias; REAL_OFF = m.offline; REAL_CAMS = m.cameras;
  return m;
}
function iniciaReal(contrato, regras, cliente) {
  REAL = true; CONTRATO = contrato; ESTADOS = {}; MANUT_EXTRA = []; estado.clear();
  travas.forEach((t) => clearTimeout(t.t)); travas.clear();
  CMD = regras && cliente ? { regras, cliente } : { regras: null, cliente: null };   // sem os dois = somente leitura
  const m = window.CasaReal.estadoReal(contrato, ESTADOS, CMD.regras);
  SALAS = m.salas.map((s) => ({ id: s.id, icone: s.icone, nome: s.nome, leitura: "", t: null }));
  CENAS = m.cenas;
  m.salas.forEach((s) => s.cartoes.forEach((c) => {
    const d = { fav: false, semDimmer: true, bri: null, temp: null, cor: null, vel: null, pct: null, osc: null, vol: null, mudo: null, app: null, subOn: null };
    aplicaCartao(d, c); estado.set(c.chave, d);
  }));
  carregaFavs(); sincronizaReal();
  document.querySelector(".proto").textContent = comandosAtivos() ? "Casa real · comandos ativos · cada toque aciona a casa" : "Casa real · somente leitura · nenhum comando chega à casa";
  document.querySelector("#secao-cameras .muted").textContent = "Câmeras da Home Assistant";
  S.net = "carregando"; S.recebeu = false; S.semDados = false;
  renderTudo();
}
function recebeLote(msg) {
  ESTADOS = msg.completo ? { ...msg.estados } : Object.assign(ESTADOS, msg.estados);
  S.recebeu = true; S.semDados = false; S.net = msg.conectado === false ? "offline" : "online";
  sincronizaReal(); renderTudo();
}
function semDadosDaCasa() { S.semDados = true; if (!S.recebeu) { S.net = "offline"; renderTudo(); } }

function iniciaSimulado() {
  REAL = false; montaSimulado(); carregaFavs(); renderTudo();
  if (S.net === "carregando") timerNet = setTimeout(() => { S.net = "online"; renderTudo(); }, 1200);
}
desenharEstrelas();
if (QUER_REAL) {
  S.net = "carregando"; renderTudo();   // esqueletos até o contrato e o primeiro lote chegarem; falhou o contrato: segue simulado
  window.CasaReal.conectar({ aoContrato: iniciaReal, aoLote: recebeLote, aoSemDados: semDadosDaCasa, aoFalha: () => iniciaSimulado() });
} else iniciaSimulado();
setInterval(() => { if (S.hora === null) { renderCeu(); renderSaudacao(); renderResumo(); } }, 30000);
