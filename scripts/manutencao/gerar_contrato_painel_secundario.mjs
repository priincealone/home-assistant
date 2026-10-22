// Gera dashboard-lab/contrato.json a partir do contrato canônico do Painel Primário (dashboard-app/lib/rooms.ts).
// SOMENTE LEITURA em dashboard-app: este script não o altera. Rodar sempre que lib/rooms.ts mudar:
//   node --experimental-strip-types scripts/manutencao/gerar_contrato_painel_secundario.mjs
// O contrato.json é a lista de permissão do Painel Secundário na HA: só entidades daqui são repassadas ao painel
// (e, na fase B, só `id`s daqui poderão virar comando). Ver specs/features/painel-secundario-casa-real.md.
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

const saida = { geradoDe: "dashboard-app/lib/rooms.ts + app/api/scene/route.ts", comodos, cenas, entidades: [...todas].sort() };
writeFileSync(join(RAIZ, "dashboard-lab", "contrato.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`contrato.json: ${comodos.length} cômodos, ${comodos.reduce((n, c) => n + c.dispositivos.length, 0)} dispositivos, ${cenas.length} cenas, ${todas.size} entidades permitidas`);
