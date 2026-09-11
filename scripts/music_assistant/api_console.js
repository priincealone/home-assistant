// Cliente da API do Music Assistant para rodar no console do navegador.
//
// Por que existe: a interface do MA 2.10.2 CONGELA o renderer ao abrir o
// diálogo de configuração de um provedor (reproduzido duas vezes, a aba trava
// e só volta com reload). Pela API o mesmo trabalho é feito sem tocar na UI.
//
// Abra a interface do MA (http://192.168.31.22:8095), cole isto no console e
// use `ma(comando, args)`.
//
// ⚠️ O token de acesso sai do localStorage da própria página e nunca deixa o
// navegador. Não copie o valor para lugar nenhum.
//
// Comandos mapeados (os nomes NÃO são adivinháveis; foram lidos de
// controllers/config/flows.py dentro do container):
//
//   providers/manifests                      todos os 132 provedores existentes
//   config/providers                         os que já estão configurados
//   config/players                           os players registrados
//   config/providers/setup {provider_domain} INICIA o fluxo -> devolve flow_id
//   config/flows/submit {flow_id, values}    AVANÇA o fluxo (este é o pulo do gato)
//   config/flows/get {flow_id}               lê o passo atual (e a url do passo externo)
//   config/flows/abort {flow_id}             cancela
//
// Para o som ambiente, a cadeia é: `hass` (plugin, conecta ao Home Assistant)
// e, dependente dele, `hass_players` (deixa o MA tocar nos media_players do HA).
// O passo `auth` de `hass` abre a tela de login do Home Assistant — essa parte
// é do André, credencial não passa por aqui.
window.ma = async function (comando, args) {
  const bruto = localStorage.getItem('ma_access_token') || '';
  let tok;
  try { const p = JSON.parse(bruto); tok = typeof p === 'string' ? p : (p.token || p.access_token); }
  catch (e) { tok = bruto; }
  const ws = new WebSocket('ws://' + location.hostname + ':8095/ws');
  let id = 0; const pend = {};
  const pronto = new Promise((res, rej) => {
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      // a saudação do servidor vem sem message_id; é a deixa para autenticar
      if (m.server_id && m.message_id === undefined) {
        ws.send(JSON.stringify({ command: 'auth', message_id: 'auth', args: { token: tok } }));
        return;
      }
      if (m.message_id === 'auth') { m.error_code ? rej(m.details || m.error_code) : res(); return; }
      if (pend[m.message_id]) { pend[m.message_id](m); delete pend[m.message_id]; }
    };
    ws.onerror = () => rej('socket');
    setTimeout(() => rej('timeout'), 8000);
  });
  try { await pronto; } catch (e) { ws.close(); return { erro_auth: String(e) }; }
  const r = await new Promise(res => {
    const mid = String(++id); pend[mid] = res;
    ws.send(JSON.stringify({ command: comando, message_id: mid, args: args || {} }));
    setTimeout(() => res({ timeout: true }), 15000);
  });
  ws.close();
  return r;
};
