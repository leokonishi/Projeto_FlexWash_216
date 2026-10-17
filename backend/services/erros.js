// Erro "esperado" de regra de negócio/validação: a rota o converte em resposta HTTP
// com o status e a mensagem abaixo, em vez de um 500 genérico.
class ErroNegocio extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'ErroNegocio';
    this.status = status;
  }
}

module.exports = { ErroNegocio };
