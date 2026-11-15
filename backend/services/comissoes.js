const agenda = require('./agenda');
const { ErroNegocio } = require('./erros');
const { precoEmCentavos, centavosParaDecimal } = require('./precoExecucao');

// Comissão de cada serviço finalizado:
//   pacote (preço do porte x % do pacote) + cada extra (preço do porte x % do extra),
//   reduzida na mesma proporção do desconto de cupom, e dividida igualmente entre a equipe.
// A taxa do leva e traz não entra na comissão.
// Os preços e percentuais vêm do catálogo atual: se o admin mudar um preço, o relatório
// de períodos passados acompanha a mudança (o banco ainda não guarda o valor da época).

// Dia do serviço no fuso do lava-rápido: o dia agendado, ou o dia da entrada no pátio
// (criado_em é UTC; o Brasil não tem horário de verão, então -3h é exato).
// Com a hora de conclusão gravada (finalizado_em), vale o dia em que o carro ficou pronto.
const SQL_DIA_SERVICO = "DATE(COALESCE(e.finalizado_em - INTERVAL 3 HOUR, e.data_agendamento, e.criado_em - INTERVAL 3 HOUR))";

function validarPeriodo(inicio, fim) {
  const hoje = agenda.agoraLocal().data;
  const fimOk = fim || hoje;
  const inicioOk = inicio || `${fimOk.slice(0, 7)}-01`; // padrão: do dia 1 do mês até hoje
  if (!agenda.dataValida(inicioOk) || !agenda.dataValida(fimOk)) {
    throw new ErroNegocio('Informe as datas no formato AAAA-MM-DD.');
  }
  if (inicioOk > fimOk) throw new ErroNegocio('A data inicial é depois da final.');
  return { inicio: inicioOk, fim: fimOk };
}

// Lista de serviços finalizados no período, cada um com a equipe e a comissão por pessoa.
// funcionarioId opcional: só os serviços em que essa pessoa trabalhou.
async function servicosComComissao(db, { inicio, fim, funcionarioId = null }) {
  const filtroFuncionario = funcionarioId
    ? 'AND EXISTS (SELECT 1 FROM execucao_funcionarios x WHERE x.execucao_id = e.id AND x.funcionario_id = ?)'
    : '';
  const [servicos] = await db.execute(
    `SELECT e.id, e.valor_total, e.valor_logistica, e.valor_desconto, e.comissao_total AS comissao_congelada, v.porte,
            DATE_FORMAT(${SQL_DIA_SERVICO}, '%Y-%m-%d') AS dia,
            c.nome AS cliente_nome, v.marca, v.modelo, v.placa,
            p.id AS pacote_id, p.nome AS pacote_nome, p.preco_pequeno, p.preco_medio, p.preco_grande,
            p.comissao_porcentagem
       FROM execucoes e
       JOIN veiculos v ON v.id = e.veiculo_id
       JOIN clientes c ON c.id = e.cliente_id
       LEFT JOIN pacotes p ON p.id = e.pacote_id
      WHERE e.status = 'Finalizado'
        AND ${SQL_DIA_SERVICO} BETWEEN ? AND ?
        ${filtroFuncionario}
      ORDER BY dia DESC, e.id DESC`,
    funcionarioId ? [inicio, fim, funcionarioId] : [inicio, fim]
  );
  if (servicos.length === 0) return [];

  const ids = servicos.map((s) => s.id);
  const marcas = ids.map(() => '?').join(',');
  const [extras] = await db.execute(
    `SELECT ee.execucao_id, x.nome, x.preco_pequeno, x.preco_medio, x.preco_grande, x.comissao_porcentagem
       FROM execucao_extras ee JOIN servicos_extras x ON x.id = ee.extra_id
      WHERE ee.execucao_id IN (${marcas})`,
    ids
  );
  const [equipes] = await db.execute(
    `SELECT ef.execucao_id, f.id, f.nome
       FROM execucao_funcionarios ef JOIN funcionarios f ON f.id = ef.funcionario_id
      WHERE ef.execucao_id IN (${marcas})
      ORDER BY f.nome`,
    ids
  );

  const agrupar = (linhas) => {
    const mapa = new Map();
    for (const l of linhas) {
      if (!mapa.has(l.execucao_id)) mapa.set(l.execucao_id, []);
      mapa.get(l.execucao_id).push(l);
    }
    return mapa;
  };
  const extrasPor = agrupar(extras);
  const equipePor = agrupar(equipes);

  return servicos.map((s) => {
    // Valor de tabela e comissão de tabela, em centavos
    let tabela = 0;
    let comissao = 0;
    const somar = (item) => {
      const preco = precoEmCentavos(item, s.porte);
      tabela += preco;
      comissao += preco * (Number(item.comissao_porcentagem) || 0) / 100;
    };
    if (s.pacote_id) somar(s);
    for (const x of extrasPor.get(s.id) || []) somar(x);

    // O que o cliente pagou pelos serviços (sem a taxa do leva e traz), já com o desconto
    const cobrado = Math.round((Number(s.valor_total) - Number(s.valor_logistica || 0)) * 100);
    if (tabela > 0 && cobrado < tabela) comissao = comissao * Math.max(cobrado, 0) / tabela;

    const equipe = (equipePor.get(s.id) || []).map((f) => ({ id: f.id, nome: f.nome }));
    // Comissão gravada na conclusão vale mais que o cálculo pelo catálogo de hoje
    const comissaoTotal = s.comissao_congelada !== null && s.comissao_congelada !== undefined
      ? Math.round(Number(s.comissao_congelada) * 100)
      : Math.round(comissao);
    const porPessoa = equipe.length ? Math.floor(comissaoTotal / equipe.length) : 0;

    return {
      id: s.id,
      dia: s.dia,
      cliente_nome: s.cliente_nome,
      veiculo: `${s.marca} ${s.modelo}`,
      placa: s.placa,
      servico: [s.pacote_nome, ...(extrasPor.get(s.id) || []).map((x) => x.nome)].filter(Boolean).join(' + '),
      valor_servicos: centavosParaDecimal(Math.max(cobrado, 0)),
      comissao_total: centavosParaDecimal(comissaoTotal),
      comissao_por_pessoa: centavosParaDecimal(porPessoa),
      porPessoaCentavos: porPessoa,
      comissaoCentavos: comissaoTotal,
      equipe
    };
  });
}

// Relatório do admin: total por funcionário + serviços sem equipe (comissão que ninguém recebe)
async function relatorioAdmin(db, filtros) {
  const periodo = validarPeriodo(filtros.inicio, filtros.fim);
  const servicos = await servicosComComissao(db, periodo);

  const porFuncionario = new Map();
  let semEquipe = 0;
  let semEquipeValor = 0;
  for (const s of servicos) {
    if (s.equipe.length === 0) {
      semEquipe += 1;
      semEquipeValor += s.comissaoCentavos;
      continue;
    }
    for (const f of s.equipe) {
      const atual = porFuncionario.get(f.id) || { funcionario_id: f.id, nome: f.nome, servicos: 0, centavos: 0 };
      atual.servicos += 1;
      atual.centavos += s.porPessoaCentavos;
      porFuncionario.set(f.id, atual);
    }
  }

  const funcionarios = [...porFuncionario.values()]
    .sort((a, b) => b.centavos - a.centavos)
    .map(({ centavos, ...f }) => ({ ...f, total_comissao: centavosParaDecimal(centavos) }));

  return {
    periodo,
    total_comissoes: centavosParaDecimal(funcionarios.reduce((t, f) => t + Math.round(Number(f.total_comissao) * 100), 0)),
    funcionarios,
    sem_equipe: { servicos: semEquipe, comissao: centavosParaDecimal(semEquipeValor) },
    servicos: servicos.map(({ porPessoaCentavos, comissaoCentavos, ...s }) => s)
  };
}

// Extrato de uma pessoa da equipe (o que ela mesma vê)
async function extratoFuncionario(db, funcionarioId, filtros) {
  const periodo = validarPeriodo(filtros.inicio, filtros.fim);
  const servicos = await servicosComComissao(db, { ...periodo, funcionarioId });
  const total = servicos.reduce((t, s) => t + s.porPessoaCentavos, 0);
  return {
    periodo,
    total_comissao: centavosParaDecimal(total),
    servicos: servicos.map((s) => ({
      id: s.id,
      dia: s.dia,
      veiculo: s.veiculo,
      placa: s.placa,
      servico: s.servico,
      equipe: s.equipe.map((f) => f.nome),
      comissao: s.comissao_por_pessoa
    }))
  };
}

// Comissão de UM carro com os preços de agora, em reais ('12.34'). Gravada ao concluir.
async function comissaoAtual(conn, execucaoId) {
  const [[s]] = await conn.execute(
    `SELECT e.valor_total, e.valor_logistica, v.porte, p.id AS pacote_id, p.nome,
            p.preco_pequeno, p.preco_medio, p.preco_grande, p.comissao_porcentagem
       FROM execucoes e JOIN veiculos v ON v.id = e.veiculo_id LEFT JOIN pacotes p ON p.id = e.pacote_id
      WHERE e.id = ?`,
    [execucaoId]
  );
  if (!s) return null;
  const [extras] = await conn.execute(
    `SELECT x.nome, x.preco_pequeno, x.preco_medio, x.preco_grande, x.comissao_porcentagem
       FROM execucao_extras ee JOIN servicos_extras x ON x.id = ee.extra_id WHERE ee.execucao_id = ?`,
    [execucaoId]
  );
  let tabela = 0;
  let comissao = 0;
  const somar = (item) => {
    const preco = precoEmCentavos(item, s.porte);
    tabela += preco;
    comissao += preco * (Number(item.comissao_porcentagem) || 0) / 100;
  };
  if (s.pacote_id) somar(s);
  extras.forEach(somar);
  const cobrado = Math.round((Number(s.valor_total) - Number(s.valor_logistica || 0)) * 100);
  if (tabela > 0 && cobrado < tabela) comissao = comissao * Math.max(cobrado, 0) / tabela;
  return centavosParaDecimal(Math.round(comissao));
}

module.exports = { relatorioAdmin, extratoFuncionario, validarPeriodo, comissaoAtual, SQL_DIA_SERVICO };
