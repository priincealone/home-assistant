// Gera dashboard-lab/comandos.json (lista de permissão de COMANDOS do Painel Principal) a partir de
// dashboard-lab/contrato.json + dashboard-lab/comandos-regras.json. Não fala com a HA nem aciona a casa.
//   node scripts/manutencao/gerar_comandos_painel.mjs        e depois:  node scripts/manutencao/publicar_painel_secundario.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lab = (f) => join(RAIZ, "dashboard-lab", f);
const { comodos, cenas } = JSON.parse(readFileSync(lab("contrato.json"), "utf8"));
const regras = JSON.parse(readFileSync(lab("comandos-regras.json"), "utf8"));
const alvos = regras.alvosExtras || {};
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
writeFileSync(lab("comandos.json"), JSON.stringify({ geradoDe: "dashboard-lab/comandos-regras.json + contrato.json", alvos, dispositivos }, null, 2) + "\n");
console.log(`comandos.json: ${Object.keys(dispositivos).length} dispositivos comandáveis`);
