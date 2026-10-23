// Testes do CARREGADOR da HA (config/www/casa-painel-secundario.js): o único lado confiável dos comandos (fase B).
// Tudo com um `hass` DE MENTIRA cujo callService só registra chamadas: nenhum teste toca a casa (CLAUDE.md §11).
// Rodar: node --test dashboard-lab/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CARREGADOR = readFileSync(join(RAIZ, "config", "www", "casa-painel-secundario.js"), "utf8");
const COMANDOS = JSON.parse(readFileSync(join(RAIZ, "dashboard-lab", "comandos.json"), "utf8"));
const CONTRATO = JSON.parse(readFileSync(join(RAIZ, "dashboard-lab", "contrato.json"), "utf8"));
const ORIGEM = "http://ha.teste";

function criar(estados = {}, { conectado = true, falhar = false, demora = 0 } = {}) {
  let Classe = null;
  const ctx = {
    console: { info() {}, warn() {}, log() {}, error() {} },
    Date, Promise, Number, Array, Object, JSON, RegExp, Math, String, Set, Map, Error,
    setTimeout, clearTimeout,
    HTMLElement: class { constructor() { this.style = {}; } appendChild() {} },
    customElements: { get: () => undefined, define: (_, c) => { Classe = c; } },
    window: { location: { origin: ORIGEM }, addEventListener() {}, removeEventListener() {} },
    document: {},
    fetch: async () => ({ ok: false }),
  };
  vm.createContext(ctx);
  vm.runInContext(CARREGADOR, ctx);
  const chamadas = [];
  const respostas = [];
  const el = new Classe();
  el._comandos = JSON.parse(JSON.stringify(COMANDOS));
  el._permitidas = new Set(CONTRATO.entidades);
  const janela = { postMessage: (msg) => respostas.push(msg) };
  el._iframe = { contentWindow: janela };
  el._hass = {
    connected: conectado,
    states: Object.fromEntries(Object.entries(estados).map(([k, v]) => [k, { state: v, attributes: {}, last_updated: "x", last_changed: "x" }])),
    callService: async (dominio, servico, dados) => {
      chamadas.push({ dominio, servico, dados });
      if (demora) await new Promise((r) => setTimeout(r, demora));
      if (falhar) throw new Error("HA recusou");
    },
  };
  // envia como se viesse do painel (mesma janela e mesma origem)
  const enviar = async (data, origem = ORIGEM, fonte = janela) => { await el._onMsg({ source: fonte, origin: origem, data }); await new Promise((r) => setImmediate(r)); };
  return { el, chamadas, respostas, enviar, janela };
}
const ultimo = (a) => a.respostas[a.respostas.length - 1];

test("luz: ligar, desligar e ajustar chamam o serviço certo com entity_id do contrato", async () => {
  const a = criar();
  await a.enviar({ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" });
  await a.enviar({ tipo: "comando", id: 2, dispositivo: "luz_sala", acao: "desligar" });
  await a.enviar({ tipo: "comando", id: 3, dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 128, color_temp_kelvin: 3000 } });
  assert.deepEqual(a.chamadas.map((c) => [c.dominio, c.servico, c.dados.entity_id]), [
    ["light", "turn_on", "light.luz_sala"], ["light", "turn_off", "light.luz_sala"], ["light", "turn_on", "light.luz_sala"]]);
  assert.equal(a.chamadas[2].dados.brightness, 128);
  assert.equal(a.respostas.every((r) => r.ok === true), true);
});

test("tudo que não está em comandos.json é recusado e NÃO chama a HA", async () => {
  const a = criar({ "media_player.tv_un65du8000gxzd": "on" });
  const casos = [
    [{ dispositivo: "nao_existe", acao: "ligar" }, "dispositivo_nao_comandavel"],
    [{ dispositivo: "luz_sala", acao: "formatar" }, "acao_nao_permitida"],
    [{ dispositivo: "temp_sala", acao: "ligar" }, "dispositivo_nao_comandavel"],          // sensor: somente leitura
    [{ dispositivo: "porta_sala", acao: "desligar" }, "dispositivo_nao_comandavel"],
    [{ dispositivo: "__proto__", acao: "ligar" }, "dispositivo_nao_comandavel"],
    [{ dispositivo: "luz_sala", acao: "constructor" }, "acao_nao_permitida"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { entity_id: "switch.computador_socket_1", brightness: 10 } }, "parametro_nao_permitido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 300 } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 0 } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { brightness: "100" } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { brightness: NaN } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { rgb_color: [1, 2] } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar", params: { rgb_color: [1, 2, 999] } }, "parametro_invalido"],
    [{ dispositivo: "luz_sala", acao: "ajustar" }, "parametros_ausentes"],
    [{ dispositivo: "ventilador_sala", acao: "velocidade", params: { percentage: 101 } }, "parametro_invalido"],
    [{ dispositivo: "ventilador_sala", acao: "direcao", params: { direction: "sideways" } }, "parametro_invalido"],
    [{ dispositivo: "tv_sala", acao: "controleRemoto", params: { command: "KEY_POWER" } }, "parametro_invalido"],   // tecla POWER alterna: fora da lista
    [{ dispositivo: "tv_sala", acao: "abrirApp", params: { media_content_id: "x; y" } }, "parametro_invalido"],
    [{ dispositivo: "aspirador", acao: "modo", params: { option: "turbo-secreto" } }, "parametro_invalido"],
    [null, "pedido_invalido"], [{ acao: "ligar" }, "pedido_invalido"], [{ dispositivo: "luz_sala" }, "pedido_invalido"],
  ];
  for (const [item, erro] of casos) {
    await a.enviar({ tipo: "comando", id: "c", ...(item || {}), ...(item === null ? { dispositivo: 5 } : {}) });
    assert.equal(ultimo(a).ok, false, JSON.stringify(item));
    assert.equal(ultimo(a).erro, erro, JSON.stringify(item));
  }
  assert.equal(a.chamadas.length, 0, "nenhuma chamada à HA para pedidos inválidos");
});

test("desconectado: nenhum comando é aceito nem guardado para reenviar depois", async () => {
  const a = criar({}, { conectado: false });
  await a.enviar({ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" });
  assert.equal(ultimo(a).erro, "desconectado");
  a.el._hass.connected = true;
  await a.enviar({ tipo: "painel-pronto" });        // reconectar não reenvia nada
  assert.equal(a.chamadas.length, 0);
});

test("mensagens de outra origem, de outra janela ou de tipo desconhecido são ignoradas", async () => {
  const a = criar();
  await a.enviar({ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" }, "http://evil.example");
  await a.enviar({ tipo: "comando", id: 2, dispositivo: "luz_sala", acao: "ligar" }, ORIGEM, { postMessage() {} });
  await a.enviar({ tipo: "executar-qualquer-coisa", dominio: "homeassistant", servico: "restart" });
  await a.enviar("ligar tudo");
  assert.equal(a.chamadas.length, 0);
  assert.equal(a.respostas.length, 0);
});

test("TV: desligar só se estiver ligada (a tecla POWER alterna); ligar não tem trava", async () => {
  for (const estado of ["off", "standby", "unavailable", "unknown"]) {
    const a = criar({ "media_player.tv_un65du8000gxzd": estado });
    await a.enviar({ tipo: "comando", id: 1, dispositivo: "tv_sala", acao: "desligar" });
    assert.equal(ultimo(a).erro, "estado_nao_permite", estado);
    assert.equal(a.chamadas.length, 0, estado);
  }
  const ligada = criar({ "media_player.tv_un65du8000gxzd": "on" });
  await ligada.enviar({ tipo: "comando", id: 1, dispositivo: "tv_sala", acao: "desligar" });
  assert.deepEqual(ligada.chamadas.map((c) => [c.dominio, c.servico, c.dados.entity_id]), [["media_player", "turn_off", "media_player.tv_un65du8000gxzd"]]);
  const sem = criar({});
  await sem.enviar({ tipo: "comando", id: 1, dispositivo: "tv_sala", acao: "desligar" });
  assert.equal(ultimo(sem).erro, "estado_desconhecido");     // sem leitura do estado, nada é enviado
  await ligada.enviar({ tipo: "comando", id: 9, dispositivo: "tv_sala", acao: "ligar" });
  assert.equal(ligada.chamadas.at(-1).servico, "turn_on");
});

test("TV: volume, mudo e controle remoto usam os alvos extras declarados, nunca um entity_id do painel", async () => {
  const a = criar({ "media_player.tv_un65du8000gxzd": "on" });
  await a.enviar({ tipo: "comando", id: 1, dispositivo: "tv_sala", acao: "volume", params: { volume_level: 0.4 } });
  await a.enviar({ tipo: "comando", id: 2, dispositivo: "tv_sala", acao: "mudo", params: { is_volume_muted: true } });
  await a.enviar({ tipo: "comando", id: 3, dispositivo: "tv_sala", acao: "controleRemoto", params: { command: "KEY_HOME" } });
  await a.enviar({ tipo: "comando", id: 4, dispositivo: "tv_sala", acao: "abrirApp", params: { media_content_id: "3201907018807" } });
  assert.deepEqual(a.chamadas.map((c) => [c.dominio, c.servico, c.dados.entity_id]), [
    ["media_player", "volume_set", "media_player.sala_de_estar_tv"],
    ["media_player", "volume_mute", "media_player.sala_de_estar_tv"],
    ["remote", "send_command", "remote.tv_un65du8000gxzd"],
    ["media_player", "play_media", "media_player.tv_un65du8000gxzd"]]);
  assert.equal(a.chamadas[3].dados.media_content_type, "app");
});

test("PS5: ligar só em repouso; repouso só ligado e com confirmação", async () => {
  const E = "media_player.sala_de_estar_ps5";
  const ligado = criar({ [E]: "on" });
  await ligado.enviar({ tipo: "comando", id: 1, dispositivo: "ps5_sala", acao: "ligar" });
  assert.equal(ultimo(ligado).erro, "estado_nao_permite");
  await ligado.enviar({ tipo: "comando", id: 2, dispositivo: "ps5_sala", acao: "repouso" });
  assert.equal(ultimo(ligado).erro, "confirmacao_necessaria");
  assert.match(ultimo(ligado).confirmar, /repouso/i);
  assert.equal(ligado.chamadas.length, 0);
  await ligado.enviar({ tipo: "comando", id: 3, dispositivo: "ps5_sala", acao: "repouso", confirmado: true });
  assert.deepEqual(ligado.chamadas.map((c) => [c.servico, c.dados.entity_id]), [["turn_off", E]]);
  const sem = criar({ [E]: "unavailable" });
  await sem.enviar({ tipo: "comando", id: 4, dispositivo: "ps5_sala", acao: "ligar" });
  await sem.enviar({ tipo: "comando", id: 5, dispositivo: "ps5_sala", acao: "repouso", confirmado: true });
  assert.equal(sem.chamadas.length, 0, "PS5 sem resposta não é comandado às cegas");
  const repouso = criar({ [E]: "standby" });
  await repouso.enviar({ tipo: "comando", id: 6, dispositivo: "ps5_sala", acao: "ligar" });
  assert.equal(repouso.chamadas.length, 1);
});

test("tomadas do PC e bloqueio infantil exigem confirmação explícita (o comando segue disponível)", async () => {
  const a = criar();
  for (const d of ["pc_socket_1", "pc_socket_2"]) {
    await a.enviar({ tipo: "comando", id: d, dispositivo: d, acao: "desligar" });
    assert.equal(ultimo(a).erro, "confirmacao_necessaria", d);
    assert.match(ultimo(a).confirmar, /computador/i);
    await a.enviar({ tipo: "comando", id: d + "b", dispositivo: d, acao: "ligar" });   // ligar não precisa de confirmação
    assert.equal(ultimo(a).ok, true);
  }
  assert.equal(a.chamadas.length, 2);
  await a.enviar({ tipo: "comando", id: "b", dispositivo: "bloqueio_luca", acao: "ligar" });
  assert.equal(ultimo(a).erro, "confirmacao_necessaria");
  await a.enviar({ tipo: "comando", id: "b2", dispositivo: "bloqueio_luca", acao: "ligar", confirmado: true });
  assert.equal(a.chamadas.at(-1).dados.entity_id, "switch.tomada_inteligente_bloqueio_para_criancas");
  await a.enviar({ tipo: "comando", id: "t", dispositivo: "tomada_luca_1", acao: "desligar" });   // tomada comum: direto
  assert.equal(ultimo(a).ok, true);
});

test("cenas: só os 4 scripts do contrato, sempre com confirmação", async () => {
  const a = criar();
  const cenas = Object.keys(COMANDOS.dispositivos).filter((k) => k.startsWith("cena_"));
  assert.equal(cenas.length, 4);
  for (const c of cenas) {
    await a.enviar({ tipo: "comando", id: c, dispositivo: c, acao: "executar" });
    assert.equal(ultimo(a).erro, "confirmacao_necessaria", c);
  }
  assert.equal(a.chamadas.length, 0);
  await a.enviar({ tipo: "comando", id: "x", dispositivo: "cena_cinema", acao: "executar", confirmado: true });
  assert.deepEqual(a.chamadas.map((c) => [c.dominio, c.servico, c.dados.entity_id]), [["script", "turn_on", "script.cena_cinema"]]);
});

test("aspirador: ações e modos do Painel Primário; modo inválido recusado", async () => {
  const a = criar();
  for (const [acao, svc] of [["iniciar", "start"], ["pausar", "pause"], ["base", "return_to_base"], ["parar", "stop"], ["localizar", "locate"], ["limpezaLocal", "clean_spot"]]) {
    await a.enviar({ tipo: "comando", id: acao, dispositivo: "aspirador", acao });
    assert.equal(a.chamadas.at(-1).servico, svc);
    assert.equal(a.chamadas.at(-1).dados.entity_id, "vacuum.dreame_us_415783444_mc1808");
  }
  await a.enviar({ tipo: "comando", id: "m", dispositivo: "aspirador", acao: "modo", params: { option: "标准" } });
  assert.deepEqual([a.chamadas.at(-1).dominio, a.chamadas.at(-1).servico, a.chamadas.at(-1).dados.entity_id], ["select", "select_option", "select.dreame_us_415783444_mc1808_mode_p_18_6"]);
});

test("lote (Apagar/Acender luzes): só ações marcadas como lote; tudo é validado antes de executar qualquer uma", async () => {
  const a = criar();
  const luzes = (acao) => ["luz_sala", "painel", "cozinha", "banheiro_switch_1"].map((dispositivo) => ({ dispositivo, acao }));
  await a.enviar({ tipo: "comando-lote", id: 1, itens: luzes("desligar") });
  assert.equal(ultimo(a).ok, true);
  assert.deepEqual(a.chamadas.map((c) => c.dados.entity_id).sort(), ["light.cozinha_copa_varanda_switch_1", "light.luz_sala", "light.painel", "switch.banheiro_switch_1"]);
  const n = a.chamadas.length;
  // misturar uma tomada, a TV ou uma cena derruba o lote inteiro (nenhuma chamada nova)
  for (const intruso of [{ dispositivo: "tomada_luca_1", acao: "desligar" }, { dispositivo: "tv_sala", acao: "desligar" }, { dispositivo: "pc_socket_1", acao: "desligar" }, { dispositivo: "cena_cinema", acao: "executar" }, { dispositivo: "luz_sala", acao: "ajustar", params: { brightness: 5 } }]) {
    await a.enviar({ tipo: "comando-lote", id: 2, itens: [...luzes("desligar"), intruso] });
    assert.equal(ultimo(a).ok, false, JSON.stringify(intruso));
  }
  assert.equal(a.chamadas.length, n);
  await a.enviar({ tipo: "comando-lote", id: 3, itens: [] });
  assert.equal(ultimo(a).erro, "lote_invalido");
  await a.enviar({ tipo: "comando-lote", id: 4, itens: Array.from({ length: 25 }, () => ({ dispositivo: "luz_sala", acao: "desligar" })) });
  assert.equal(ultimo(a).erro, "lote_invalido");
  assert.equal(a.chamadas.length, n);
});

test("falha da HA e timeout viram erro visível; timeout é 'sem confirmação', não 'falhou'", async () => {
  const f = criar({}, { falhar: true });
  await f.enviar({ tipo: "comando", id: 1, dispositivo: "luz_sala", acao: "ligar" });
  assert.equal(ultimo(f).ok, false);
  assert.equal(ultimo(f).erro, "falha_na_ha");
  const t = criar({}, { demora: 80 });
  t.el._comandos.dispositivos.luz_sala.acoes.ligar.timeoutMs = 10;
  await t.enviar({ tipo: "comando", id: 2, dispositivo: "luz_sala", acao: "ligar" });
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(ultimo(t).erro, "timeout_sem_confirmacao");
});

test("limite de taxa: rajada de comandos é contida", async () => {
  const a = criar();
  for (let i = 0; i < 30; i++) await a.enviar({ tipo: "comando", id: i, dispositivo: "luz_sala", acao: "ligar" });
  assert.equal(a.chamadas.length, 12);
  assert.equal(a.respostas.filter((r) => r.erro === "muitos_comandos").length, 18);
});

test("o carregador só repassa estados de entidades do contrato (e atributos em lista de permissão)", async () => {
  const a = criar({ "light.luz_sala": "on", "switch.entidade_fora_do_contrato": "on" });
  a.el._hass.states["light.luz_sala"].attributes = { brightness: 200, entity_picture: "/api/token-secreto", friendly_name: "Luz", access_token: "x" };
  a.el._hass.states["switch.entidade_fora_do_contrato"].attributes = { friendly_name: "Intruso" };
  a.el._pronto = true;
  a.el._enviar(true);
  const m = a.respostas.find((r) => r.tipo === "casa-estados");
  assert.ok(m, "enviou o lote");
  assert.ok(m.estados["light.luz_sala"]);
  assert.equal("switch.entidade_fora_do_contrato" in m.estados, false);
  assert.deepEqual(Object.keys(m.estados["light.luz_sala"].attributes).sort(), ["brightness", "friendly_name"]);
});

test("contrato × comandos: todo alvo e todo dispositivo comandável existem; nada fora das regras", () => {
  const entidades = new Set(CONTRATO.entidades);
  for (const [id, d] of Object.entries(COMANDOS.dispositivos)) {
    for (const [nome, a] of Object.entries(d.acoes)) {
      const alvo = a.alvo ? COMANDOS.alvos[a.alvo] : d.entityId;
      assert.ok(alvo, `${id}.${nome}: alvo`);
      assert.ok(entidades.has(alvo) || Object.values(COMANDOS.alvos).includes(alvo), `${id}.${nome}: ${alvo} fora das entidades conhecidas`);
      assert.match(a.servico, /^[a-z_]+\.[a-z_]+$/);
      assert.ok(!["homeassistant", "hassio", "shell_command", "python_script", "automation", "config_entry", "persistent_notification", "lock", "cover", "climate", "water_heater", "alarm_control_panel"].includes(a.servico.split(".")[0]), `${id}.${nome}: domínio de serviço proibido`);
    }
  }
  // sem tranca, portão ou aquecedor no contrato comandável (CLAUDE.md §11.4)
  const dominios = new Set(Object.values(COMANDOS.dispositivos).map((d) => d.dominio));
  for (const proibido of ["lock", "cover", "climate", "water_heater"]) assert.equal(dominios.has(proibido), false, proibido);
});

test("varredura de código: o iframe do painel não chama a HA; só o carregador tem callService", () => {
  for (const f of ["app.js", "casa-real.js", "index.html"]) {
    const t = readFileSync(join(RAIZ, "dashboard-lab", f), "utf8");
    assert.ok(!/callService|callApi|callWS|callHttp|\/api\/services/.test(t), `${f} não pode falar com a HA`);
  }
  assert.equal((CARREGADOR.match(/callService/g) || []).length >= 1, true);
});
