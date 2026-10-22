// Contrato do Painel Secundário (contrato.json) x registro da Home Assistant. Somente leitura de arquivos.
// Rodar a partir da raiz do repositório:  node --test dashboard-lab/tests/*.test.mjs   (ou este arquivo sozinho)
// Onde estão os registros: HA_STORAGE (padrão ../config/.storage). Sem a pasta, este arquivo SAI com código 3 e avisa em
// voz alta: nunca passa em silêncio. Regerar o contrato quando lib/rooms.ts mudar:
//   node --experimental-strip-types scripts/manutencao/gerar_contrato_painel_secundario.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.HA_STORAGE ?? path.resolve(aqui, "../../config/.storage");
const registroArq = path.join(pasta, "core.entity_registry");
if (!fs.existsSync(registroArq)) {
  console.log(`PULADO: não achei ${registroArq}. Aponte HA_STORAGE para config/.storage.`);
  process.exit(3);
}
const contrato = JSON.parse(fs.readFileSync(path.join(aqui, "..", "contrato.json"), "utf8"));
const registro = new Map(JSON.parse(fs.readFileSync(registroArq, "utf8")).data.entities.map((e) => [e.entity_id, e]));
const dispositivos = contrato.comodos.flatMap((c) => c.dispositivos.map((d) => ({ ...d, comodo: c.id })));

test("contrato: sanidade (cômodos, aparelhos, cenas e lista de entidades)", () => {
  assert.ok(contrato.comodos.length >= 8, "poucos cômodos");
  assert.ok(dispositivos.length >= 30, "poucos aparelhos");
  assert.equal(contrato.cenas.length, 4);
  assert.ok(contrato.entidades.length >= dispositivos.length);
});

test("contrato x registro: toda entidade existe no core.entity_registry e não está desativada", () => {
  const todas = new Set([...contrato.entidades, ...contrato.cenas.map((c) => c.entityId)]);
  const ausentes = [...todas].filter((id) => !registro.has(id));
  const desativadas = [...todas].filter((id) => registro.get(id)?.disabled_by);
  assert.deepEqual(ausentes, [], `não estão no registro:\n  - ${ausentes.join("\n  - ")}`);
  assert.deepEqual(desativadas, [], `desativadas no registro:\n  - ${desativadas.join("\n  - ")}`);
});

test("contrato x registro: o domínio declarado confere com o prefixo do entity_id e com o registro", () => {
  const erradas = dispositivos.filter((d) => d.entityId.split(".")[0] !== d.dominio || registro.get(d.entityId)?.entity_id.split(".")[0] !== d.dominio);
  assert.deepEqual(erradas.map((d) => `${d.entityId} (declarado ${d.dominio})`), []);
  for (const c of contrato.cenas) assert.ok(c.entityId.startsWith("script."), c.entityId);
});

test("contrato: a lista de permissão cobre cada aparelho e cada bateria", () => {
  const lista = new Set(contrato.entidades);
  for (const d of dispositivos) {
    assert.ok(lista.has(d.entityId), `${d.entityId} fora da lista de permissão`);
    if (d.batteryEntityId) assert.ok(lista.has(d.batteryEntityId), `${d.batteryEntityId} fora da lista de permissão`);
  }
});

test("contrato: ids de aparelho únicos por cômodo e entity_id sem repetição", () => {
  const ids = dispositivos.map((d) => d.entityId);
  assert.equal(new Set(ids).size, ids.length, "entity_id repetido no contrato");
  const chaves = dispositivos.map((d) => `${d.comodo}.${d.id}`);
  assert.equal(new Set(chaves).size, chaves.length, "chave comodo.id repetida");
});
