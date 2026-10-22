// Servidor estático mínimo do painel paralelo. Só lê arquivos desta pasta; não fala com o Home Assistant.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL(".", import.meta.url));
const PORTA = Number(process.env.PORT || 3011);
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
const PUBLICOS = new Set(["/index.html", "/styles.css", "/app.js", "/icons.js", "/contrato.json"]);

createServer(async (req, res) => {
  const caminho = new URL(req.url, "http://x").pathname;
  const alvo = caminho === "/" ? "/index.html" : normalize(caminho).replace(/\\/g, "/");
  if (!PUBLICOS.has(alvo)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("não encontrado");
    return;
  }
  try {
    const corpo = await readFile(join(RAIZ, alvo));
    res.writeHead(200, { "content-type": TIPOS[extname(alvo)], "cache-control": "no-store" }).end(corpo);
  } catch {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end("erro de leitura");
  }
}).listen(PORTA, () => console.log(`dashboard-lab em http://localhost:${PORTA}`));
