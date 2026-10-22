// Gera dashboard-lab/contrato.json a partir do contrato canônico do Painel Primário (dashboard-app/lib/rooms.ts).
// SOMENTE LEITURA em dashboard-app: este script não o altera. Rodar sempre que lib/rooms.ts mudar:
//   node --experimental-strip-types scripts/manutencao/gerar_contrato_painel_secundario.mjs
// O contrato.json é a lista de permissão do Painel Secundário na HA: só entidades daqui são repassadas ao painel
// e, na fase B, só `id`s daqui viram comando, pelas regras de dashboard-lab/comandos-regras.json (gera comandos.json).
// Ver specs/features/painel-secundario-casa-real.md.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { comodosCompletos } = await import(pathToFileURL(join(RAIZ, "dashboard-app", "lib", "rooms.ts")).href);

// As cenas permitidas vivem na rota do Painel Primário (lista de permissão de lá); lê o texto para não duplicar à mão.
const rotaCenas = readFileSync(join(RAIZ, "dashboard-app", "app", "api", "scene", "route.ts"), "utf8");
const cenas = [...rotaCenas.matchAll(/^\s*(\w+):\s*"(script\.[\w]+)"/gm)].map(([, chave, entityId]) => ({ chave, entityId }));

const comodos = comodosCompletos.map((c) => ({
  id: c.id,
  nome: c.nome,
  vazio: !!c.vazio,
  dispositivos: c.dispositivos.map((d) => ({
    id: d.id,
    entityId: d.entityId,
    dominio: d.dominio,
    categoria: d.categoria,
    nome: d.nome,
    ...(d.unidade ? { unidade: d.unidade } : {}),
    ...(d.batteryEntityId ? { batteryEntityId: d.batteryEntityId } : {}),
  })),
}));

const todas = new Set();
for (const c of comodos) for (const d of c.dispositivos) { todas.add(d.entityId); if (d.batteryEntityId) todas.add(d.batteryEntityId); }
for (const c of cenas) todas.add(c.entityId);

// ---- Fase B: comandos.json (lista de permissão de comandos) = contrato + comandos-regras.json ----
const regras = JSON.parse(readFileSync(join(RAIZ, "dashboard-lab", "comandos-regras.json"), "utf8"));
const alvos = regras.alvosExtras || {};
for (const chave of regras.estadosExtras || []) { if (!alvos[chave]) throw new Error(`estadosExtras: alvo desconhecido ${chave}`); todas.add(alvos[chave]); }
const dispositivos = {};
const limpa = (acoes) => JSON.parse(JSON.stringify(acoes));
for (const c of comodos) for (const d of c.dispositivos) {
  if (dispositivos[d.id]) throw new Error(`id de dispositivo duplicado no contrato: ${d.id}`);
  const acoes = regras.porId?.[d.id] ?? regras.porDominioCategoria?.[`${d.dominio}:${d.categoria}`] ?? regras.porDominio?.[d.dominio];
  if (!acoes) continue;   // sem regra = somente leitura (sensores, câmeras…)
  dispositivos[d.id] = { entityId: d.entityId, dominio: d.dominio, nome: d.nome, comodo: c.id, acoes: limpa(acoes) };
}
for (const [id, e] of Object.entries(regras.extras || {})) {
  if (dispositivos[id]) throw new Error(`extra duplicado: ${id}`);
  if (!alvos[e.alvo]) throw new Error(`extra ${id}: alvo desconhecido ${e.alvo}`);
  const acoes = limpa(e.acoes);
  for (const a of Object.values(acoes)) if (!a.alvo) a.alvo = e.alvo;
  dispositivos[id] = { entityId: alvos[e.alvo], dominio: e.dominio, nome: e.nome, comodo: null, acoes };
}
for (const ch of cenas) {
  const id = `cena_${ch.chave}`;
  const acoes = limpa(regras.cenas.acoes); acoes.executar.confirmar = regras.cenas.confirmar;
  dispositivos[id] = { entityId: ch.entityId, dominio: "script", nome: `Cena ${ch.chave}`, comodo: null, acoes };
}
for (const d of Object.values(dispositivos)) for (const [nome, a] of Object.entries(d.acoes)) {
  if (!/^[a-z_]+\.[a-z_]+$/.test(a.servico)) throw new Error(`serviço inválido em ${d.nome}/${nome}`);
  if (a.alvo && !alvos[a.alvo]) throw new Error(`alvo desconhecido em ${d.nome}/${nome}: ${a.alvo}`);
}
writeFileSync(join(RAIZ, "dashboard-lab", "comandos.json"), JSON.stringify({ geradoDe: "dashboard-lab/comandos-regras.json + contrato.json", alvos, dispositivos }, null, 2) + "\n");
console.log(`comandos.json: ${Object.keys(dispositivos).length} dispositivos comandáveis, ${Object.values(dispositivos).reduce((n, d) => n + Object.keys(d.acoes).length, 0)} ações, ${Object.keys(alvos).length} alvos extras`);

const saida = { geradoDe: "dashboard-app/lib/rooms.ts + app/api/scene/route.ts", comodos, cenas, entidades: [...todas].sort() };
writeFileSync(join(RAIZ, "dashboard-lab", "contrato.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`contrato.json: ${comodos.length} cômodos, ${comodos.reduce((n, c) => n + c.dispositivos.length, 0)} dispositivos, ${cenas.length} cenas, ${todas.size} entidades permitidas`);
