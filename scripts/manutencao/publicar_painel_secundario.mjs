// Publica o Painel Secundário (dashboard-lab) DENTRO da Home Assistant: copia os 4 arquivos estáticos para
// config/www/painel-secundario/ (a HA serve config/www em /local/). Não precisa de servidor, de porta nem do PC ligado.
//   node scripts/manutencao/publicar_painel_secundario.mjs
// A HA entrega /local com cache de 31 dias; por isso cada arquivo vai com ?v=<hash do conteúdo> e o módulo do painel
// lê versao.json (com carimbo de tempo, que fura o cache) para montar o endereço certo. Atualizar = rodar este script;
// não exige reiniciar a HA. O código-fonte continua em dashboard-lab/ (este script não o altera).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORIGEM = join(RAIZ, "dashboard-lab");
const DESTINO = join(RAIZ, "config", "www", "painel-secundario");
// Arquivos publicados (index.html é reescrito com ?v=; os demais são copiados). Novo arquivo do painel: acrescentar aqui
// e em dashboard-lab/serve.mjs (PUBLICOS). contrato.json = lista de permissão de entidades (gerar_contrato_painel_secundario.mjs).
const ARQUIVOS = ["index.html", "styles.css", "app.js", "icons.js", "contrato.json"];
const ESTATICOS = ARQUIVOS.filter((f) => f !== "index.html");
const COM_VERSAO = ESTATICOS.filter((f) => f.endsWith(".css") || f.endsWith(".js")); // referenciados no index.html

const conteudos = Object.fromEntries(ARQUIVOS.map((f) => [f, readFileSync(join(ORIGEM, f), "utf8").replace(/\r\n/g, "\n")]));
const hash = createHash("sha256").update(ARQUIVOS.map((f) => conteudos[f]).join("\u0000")).digest("hex").slice(0, 10);

mkdirSync(DESTINO, { recursive: true });
let html = conteudos["index.html"];
for (const f of COM_VERSAO) {
  const antes = html;
  html = html.replace(new RegExp(`(href|src)="${f.replace(".", "\\.")}"`), `$1="${f}?v=${hash}"`);
  if (html === antes) throw new Error(`index.html não referencia ${f}; abortando sem publicar`);
}
writeFileSync(join(DESTINO, "index.html"), html);
for (const f of ESTATICOS) copyFileSync(join(ORIGEM, f), join(DESTINO, f));
writeFileSync(join(DESTINO, "versao.json"), JSON.stringify({ versao: hash, publicado: new Date().toISOString() }) + "\n");
console.log(`Painel Secundário publicado em config/www/painel-secundario (versão ${hash}); URL: /local/painel-secundario/index.html?v=${hash}`);
