// Erro "esperado" de regra de negócio/validação: a rota o converte em resposta HTTP
// com o status e a mensagem abaixo, em vez de um 500 genérico.
// `detalhes` (opcional) vai junto na resposta, ex.: { sugestao: {...} }.
class ErroNegocio extends Error {
  constructor(mensagem, status = 400, detalhes = undefined) {
    super(mensagem);
    this.name = 'ErroNegocio';
    this.status = status;
    this.detalhes = detalhes;
  }
}

module.exports = { ErroNegocio };
