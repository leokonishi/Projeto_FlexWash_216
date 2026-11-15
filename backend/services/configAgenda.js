const agenda = require('./agenda');
const { ErroNegocio } = require('./erros');

// Agenda configurada pelo administrador (tabela config_agenda + agenda_bloqueios).
// Lida a cada pedido, com um cache curto para não consultar o banco toda hora.
const CACHE_MS = 30000;
let cache = null;

const DIAS_NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function lerLista(texto) {
  return String(texto || '').split(',').map((x) => x.trim()).filter(Boolean);
}

async function obter(db) {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.cfg;
  const [[linha]] = await db.execute('SELECT * FROM config_agenda WHERE id = 1');
  const [bloqueios] = await db.execute(
    "SELECT DATE_FORMAT(data, '%Y-%m-%d') AS data, motivo FROM agenda_bloqueios WHERE data >= CURDATE() - INTERVAL 1 DAY ORDER BY data"
  );
  const cfg = linha
    ? {
        horarios: lerLista(linha.horarios).sort(),
        capacidade: Number(linha.capacidade_por_horario),
        diasSemana: lerLista(linha.dias_semana).map(Number),
        antecedenciaCancelamentoHoras: Number(linha.antecedencia_cancelamento_horas),
        bloqueios: new Map(bloqueios.map((b) => [b.data, b.motivo]))
      }
    : { ...agenda.PADRAO, antecedenciaCancelamentoHoras: 2, bloqueios: new Map(bloqueios.map((b) => [b.data, b.motivo])) };
  cache = { em: Date.now(), cfg };
  return cfg;
}

function limparCache() {
  cache = null;
}

// Formato para o painel do admin
async function paraPainel(db) {
  const cfg = await obter(db);
  return {
    dias_semana: cfg.diasSemana,
    horarios: cfg.horarios,
    capacidade_por_horario: cfg.capacidade,
    antecedencia_cancelamento_horas: cfg.antecedenciaCancelamentoHoras,
    bloqueios: [...cfg.bloqueios].map(([data, motivo]) => ({ data, motivo })),
    dias_nomes: DIAS_NOMES
  };
}

async function salvar(db, corpo) {
  const dias = Array.isArray(corpo?.dias_semana) ? [...new Set(corpo.dias_semana.map(Number))] : null;
  if (!dias || dias.length === 0 || dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ErroNegocio('Escolha pelo menos um dia da semana em que o lava-rápido abre.');
  }
  const horarios = Array.isArray(corpo?.horarios) ? [...new Set(corpo.horarios.map((h) => String(h).trim()))].sort() : null;
  if (!horarios || horarios.length === 0) throw new ErroNegocio('Cadastre pelo menos um horário de atendimento.');
  if (horarios.length > 24 || horarios.some((h) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(h))) {
    throw new ErroNegocio('Horários inválidos. Use o formato HH:MM, por exemplo 08:00.');
  }
  const capacidade = Number(corpo?.capacidade_por_horario);
  if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 50) {
    throw new ErroNegocio('Vagas por horário: informe um número de 1 a 50.');
  }
  const antecedencia = Number(corpo?.antecedencia_cancelamento_horas ?? 2);
  if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 72) {
    throw new ErroNegocio('Prazo de cancelamento: informe de 0 a 72 horas.');
  }
  await db.execute(
    `INSERT INTO config_agenda (id, dias_semana, horarios, capacidade_por_horario, antecedencia_cancelamento_horas)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE dias_semana = VALUES(dias_semana), horarios = VALUES(horarios),
       capacidade_por_horario = VALUES(capacidade_por_horario),
       antecedencia_cancelamento_horas = VALUES(antecedencia_cancelamento_horas)`,
    [dias.sort().join(','), horarios.join(','), capacidade, antecedencia]
  );
  limparCache();
  return paraPainel(db);
}

async function adicionarBloqueio(db, corpo) {
  const data = String(corpo?.data || '');
  if (!agenda.dataValida(data)) throw new ErroNegocio('Informe a data no formato AAAA-MM-DD.');
  if (data < agenda.agoraLocal().data) throw new ErroNegocio('Essa data já passou.');
  const motivo = String(corpo?.motivo || '').trim().slice(0, 100) || null;
  await db.execute(
    'INSERT INTO agenda_bloqueios (data, motivo) VALUES (?, ?) ON DUPLICATE KEY UPDATE motivo = VALUES(motivo)',
    [data, motivo]
  );
  // Agendamentos já marcados nesse dia continuam valendo: avisa quantos são
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM execucoes WHERE status = 'Agendado' AND DATE(data_agendamento) = ?",
    [data]
  );
  limparCache();
  return { ...(await paraPainel(db)), agendados_no_dia: Number(total) };
}

async function removerBloqueio(db, data) {
  await db.execute('DELETE FROM agenda_bloqueios WHERE data = ?', [data]);
  limparCache();
  return paraPainel(db);
}

module.exports = { obter, limparCache, paraPainel, salvar, adicionarBloqueio, removerBloqueio };
