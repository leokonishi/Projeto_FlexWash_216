// Regras de horário do agendamento do cliente.
// As datas são tratadas como texto 'AAAA-MM-DD' e 'HH:MM' no fuso do lava-rápido,
// para não depender do fuso do servidor de deploy (que costuma ser UTC).

const FUSO = 'America/Sao_Paulo';

// Horários de atendimento (sem o das 12h, que é almoço)
const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// Quantos carros podem ser marcados no mesmo horário
const CAPACIDADE_POR_HORARIO = 2;

// Até quantos dias à frente procuramos o próximo horário livre para sugerir
const DIAS_BUSCA_SUGESTAO = 30;

// "Agora" no fuso do lava-rápido: { data: 'AAAA-MM-DD', hora: 'HH:MM' }
function agoraLocal(referencia = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(referencia)
      .map((p) => [p.type, p.value])
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function somarDias(data, dias) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Um horário já passou se for de um dia anterior, ou de hoje com hora <= agora
function horarioPassou(data, horario, agora) {
  return data < agora.data || (data === agora.data && horario <= agora.hora);
}

// 'AAAA-MM-DD' + 'HH:MM' -> 'AAAA-MM-DD HH:MM:00' (formato do DATETIME)
function paraDatetime(data, horario) {
  return `${data} ${horario}:00`;
}

// Distribui `quantidade` carros a partir de `horarioInicial`, no mesmo dia.
// `ocupacao` é um Map 'HH:MM' -> carros já marcados. Cada carro ocupa o primeiro
// horário >= horarioInicial que ainda tenha vaga. Retorna a lista de horários
// (um por carro) ou null se não couber até o fim do dia.
function distribuirNoDia({ data, horarioInicial, quantidade, ocupacao, agora }) {
  const usados = new Map(ocupacao);
  const alocados = [];

  for (const horario of HORARIOS) {
    if (horario < horarioInicial || horarioPassou(data, horario, agora)) continue;
    while (alocados.length < quantidade && (usados.get(horario) || 0) < CAPACIDADE_POR_HORARIO) {
      alocados.push(horario);
      usados.set(horario, (usados.get(horario) || 0) + 1);
    }
    if (alocados.length === quantidade) return alocados;
  }
  return null;
}

module.exports = {
  FUSO,
  HORARIOS,
  CAPACIDADE_POR_HORARIO,
  DIAS_BUSCA_SUGESTAO,
  agoraLocal,
  dataValida,
  somarDias,
  horarioPassou,
  paraDatetime,
  distribuirNoDia
};
