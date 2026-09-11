// Adiciona o YouTube Music ao Music Assistant sem passar pela interface.
//
// Por que assim: (1) o diálogo de provedor da UI do MA 2.10.2 congela o
// renderer, e (2) o cookie de sessão do Google é do André — desta forma ele
// vai direto do campo para o servidor local, sem passar por mim nem pela
// conversa.
//
// Como usar:
//   1. abrir a interface do MA (http://192.168.31.22:8095)
//   2. colar `api_console.js` no console (define `ma`)
//   3. colar ESTE arquivo
//   4. chamar:  youtubeMusic('usuario@gmail.com', '<cole o cookie aqui>')
//
// Onde achar o cookie: em music.youtube.com, já logado, abrir o DevTools na
// aba Network, clicar em qualquer requisição para o domínio e copiar o
// conteúdo inteiro do cabeçalho `Cookie` da requisição.
//
// ⚠️ `po_token_server_url` tem que ser `http://bgutil-provider:4416`. O padrão
// que o Music Assistant sugere é `http://127.0.0.1:4416`, e ele NÃO funciona
// nesta instalação: dentro do container, 127.0.0.1 é o próprio Music
// Assistant, não o host. Os dois containers foram postos na rede `casa-net`
// justamente para se enxergarem pelo nome.
window.youtubeMusic = async function (usuario, cookie) {
  if (!usuario || !cookie) return 'informe usuario e cookie';
  const inicio = await ma('config/providers/setup', { provider_domain: 'ytmusic' });
  if (inicio.error_code) return inicio;
  const flow = inicio.result.flow_id;
  const r = await ma('config/flows/submit', {
    flow_id: flow,
    values: {
      username: usuario,
      cookie: cookie,
      po_token_server_url: 'http://bgutil-provider:4416',
    },
  });
  if (r.error_code) return r;
  // o passo "finish" significa provedor criado; um "user" de volta traz o erro
  if (r.result.step_id === 'user') {
    return { falhou: true, erros: r.result.errors };
  }
  const cfg = await ma('config/providers');
  return {
    passo: r.result.step_id,
    provedores_de_musica: cfg.result.filter(p => p.type === 'music').map(p => p.domain),
  };
};
