const express = require('express');
const router = express.Router();
const db = require('../bd');
const { registrarEntrada, exigirForaDoPatio, STATUS_NO_PATIO, listaDeIds, buscarPorIds, exigirTodos } = require('../services/execucoesService');
const { ErroNegocio } = require('../services/erros');
const agenda = require('../services/agenda');
const { avaliarLevaTras } = require('../services/logistica');
const { estornarCuponsSeVazio } = require('../services/promocoes');
const { validarPeriodo, comissaoAtual, SQL_DIA_SERVICO } = require('../services/comissoes');

// Campos comuns às listas do pátio e dos próximos agendamentos
const CAMPOS_PATIO = `
                e.id, e.status, e.valor_total, e.valor_logistica, e.criado_em as data_entrada,
                e.chegada_em, e.inicio_em, e.agendamento_id,
                DATE_FORMAT(e.data_agendamento, '%Y-%m-%d %H:%i') AS data_agendamento,
                a.tipo_logistica, a.endereco_busca, a.logistica_status, a.motorista_id,
                (SELECT m.nome FROM funcionarios m WHERE m.id = a.motorista_id) AS motorista_nome,
                c.nome as cliente_nome, c.telefone as cliente_telefone, v.marca, v.modelo, v.placa, v.porte,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(f.nome SEPARATOR ', ') FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis,
                (SELECT GROUP_CONCAT(f.id) FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis_ids,
                (SELECT GROUP_CONCAT(ex.nome SEPARATOR ', ') FROM execucao_extras eex JOIN servicos_extras ex ON eex.extra_id = ex.id WHERE eex.execucao_id = e.id) as servicos_extras`;

const JOINS_PATIO = `
            FROM execucoes e
            JOIN clientes c ON e.cliente_id = c.id
            JOIN veiculos v ON e.veiculo_id = v.id
            LEFT JOIN pacotes p ON e.pacote_id = p.id
            LEFT JOIN agendamentos a ON e.agendamento_id = a.id`;

// Transições permitidas no pátio:
// Agendado -> Aguardando (carro chegou) ou Cancelado; Aguardando -> Em Andamento; Em Andamento -> Finalizado
const TRANSICOES = {
    'Agendado': ['Aguardando', 'Cancelado'],
    'Aguardando': ['Em Andamento'],
    'Em Andamento': ['Finalizado']
};
// Só o administrador: reabrir um serviço finalizado por engano (volta para "Lavando")
const TRANSICOES_ADMIN = {
    'Finalizado': ['Em Andamento']
};

function transicaoPermitida(de, para, perfil) {
    if ((TRANSICOES[de] || []).includes(para)) return true;
    return perfil === 'administrador' && (TRANSICOES_ADMIN[de] || []).includes(para);
}

// Troca a equipe de um serviço (quem lavou divide a comissão). Os ids precisam ser da equipe.
async function definirEquipe(conn, execucaoId, funcionarioIds) {
    const encontrados = await buscarPorIds(conn, 'SELECT id FROM funcionarios WHERE ativo = 1 AND id IN (#)', funcionarioIds);
    exigirTodos(encontrados, funcionarioIds, 404, 'Funcionário(s) não encontrado(s)');
    await conn.execute('DELETE FROM execucao_funcionarios WHERE execucao_id = ?', [execucaoId]);
    for (const funcionarioId of funcionarioIds) {
        await conn.execute('INSERT INTO execucao_funcionarios (execucao_id, funcionario_id) VALUES (?, ?)', [execucaoId, funcionarioId]);
    }
}

async function contarEquipe(conn, execucaoId) {
    const [[linha]] = await conn.execute('SELECT COUNT(*) AS total FROM execucao_funcionarios WHERE execucao_id = ?', [execucaoId]);
    return Number(linha.total);
}

// 1. REGISTRAR NOVA ENTRADA (POST)
// Validação, cálculo do preço (pelo banco, nunca pelo valor enviado) e gravação em transação
// ficam em services/execucoesService.js.
router.post('/execucoes', async (req, res) => {
    try {
        const resultado = await registrarEntrada(db, req.body);
        return res.status(201).json({ mensagem: 'Serviços registrados com sucesso no pátio!', ...resultado });
    } catch (erro) {
        if (erro instanceof ErroNegocio) {
            return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes || {}) });
        }
        console.error('Erro ao registrar execução:', erro);
        return res.status(500).json({ erro: 'Erro interno ao iniciar o serviço.' });
    }
});

// 1b. LEVA E TRAZ PARA UM CLIENTE (Nova entrada no pátio)
// Mesma regra do agendamento do cliente: mede a distância até o endereço cadastrado
// e diz se está dentro do raio (e a taxa por veículo).
router.get('/execucoes/leva-e-traz/:cliente_id', async (req, res) => {
    const clienteId = Number(req.params.cliente_id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({ erro: 'Cliente inválido.' });
    }
    try {
        res.status(200).json(await avaliarLevaTras(db, clienteId));
    } catch (erro) {
        console.error('Erro ao verificar o leva e traz:', erro);
        res.status(500).json({ erro: 'Erro ao verificar o leva e traz.' });
    }
});

// 2. LISTAR PÁTIO (GET)
// Carros no pátio (Aguardando / Em Andamento) + agendados de hoje (e atrasados) que ainda não chegaram.
router.get('/execucoes/patio', async (req, res) => {
    try {
        const amanha = agenda.somarDias(agenda.agoraLocal().data, 1);
        const query = `
            SELECT ${CAMPOS_PATIO}
            ${JOINS_PATIO}
            WHERE e.status IN ('Aguardando', 'Em Andamento')
               OR (e.status = 'Agendado' AND e.data_agendamento < ?)
            ORDER BY FIELD(e.status, 'Em Andamento', 'Aguardando', 'Agendado'), COALESCE(e.data_agendamento, e.criado_em) ASC
        `;
        const [patio] = await db.execute(query, [`${amanha} 00:00:00`]);
        res.status(200).json(patio);
    } catch (erro) {
        console.error('Erro ao buscar o pátio:', erro);
        res.status(500).json({ erro: 'Erro ao buscar o fluxo do pátio.' });
    }
});

// 2b. PRÓXIMOS AGENDAMENTOS (a partir de amanhã, até 7 dias)
router.get('/execucoes/agendados', async (req, res) => {
    try {
        const amanha = agenda.somarDias(agenda.agoraLocal().data, 1);
        const query = `
            SELECT ${CAMPOS_PATIO}
            ${JOINS_PATIO}
            WHERE e.status = 'Agendado' AND e.data_agendamento >= ? AND e.data_agendamento < ?
            ORDER BY e.data_agendamento ASC
        `;
        const [agendados] = await db.execute(query, [`${amanha} 00:00:00`, `${agenda.somarDias(amanha, 7)} 00:00:00`]);
        res.status(200).json(agendados);
    } catch (erro) {
        console.error('Erro ao buscar os próximos agendamentos:', erro);
        res.status(500).json({ erro: 'Erro ao buscar os próximos agendamentos.' });
    }
});

// 3. AVANÇAR STATUS (PUT) - só nas transições do fluxo (ver TRANSICOES)
// Quando o carro chega (Agendado -> Aguardando), confere que ele não tem outro serviço
// aberto no pátio: cada carro só pode ter um por vez.
router.put('/execucoes/:id/status', async (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;
    let funcionarioIds;
    try {
        // Opcional: ao iniciar a lavagem, quem vai lavar (divide a comissão)
        funcionarioIds = req.body.funcionarios === undefined ? null : listaDeIds(req.body.funcionarios, 'funcionarios');
    } catch (erro) {
        return res.status(erro.status || 400).json({ erro: erro.message });
    }
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[execucao]] = await conn.execute('SELECT status, veiculo_id, agendamento_id FROM execucoes WHERE id = ? FOR UPDATE', [id]);
        if (!execucao) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Serviço não encontrado.' });
        }

        if (!transicaoPermitida(execucao.status, novoStatus, req.usuarioLogado.perfil)) {
            await conn.rollback();
            return res.status(409).json({ erro: `Não é possível mudar de "${execucao.status}" para "${novoStatus}".` });
        }

        if (STATUS_NO_PATIO.includes(novoStatus) && !STATUS_NO_PATIO.includes(execucao.status)) {
            await exigirForaDoPatio(conn, [execucao.veiculo_id], { ignorarExecucaoId: Number(id) });
        }

        // Para começar a lavar, o serviço precisa ter equipe: é ela que recebe a comissão
        if (novoStatus === 'Em Andamento' && execucao.status === 'Aguardando') {
            if (funcionarioIds && funcionarioIds.length > 0) await definirEquipe(conn, Number(id), funcionarioIds);
            else if (await contarEquipe(conn, id) === 0) {
                await conn.rollback();
                return res.status(422).json({ erro: 'Escolha quem vai lavar este carro.', motivo: 'sem_equipe' });
            }
        }

        // Hora de cada etapa e, ao concluir, a comissão congelada com os preços de agora.
        // Reabrir (admin) apaga a conclusão: ela é gravada de novo quando concluir outra vez.
        let extrasSql = '';
        const extrasValores = [];
        if (novoStatus === 'Aguardando') extrasSql = ', chegada_em = NOW()';
        else if (novoStatus === 'Em Andamento' && execucao.status === 'Aguardando') extrasSql = ', inicio_em = NOW()';
        else if (novoStatus === 'Em Andamento' && execucao.status === 'Finalizado') extrasSql = ', finalizado_em = NULL, comissao_total = NULL';
        else if (novoStatus === 'Finalizado') {
            extrasSql = ', finalizado_em = NOW(), comissao_total = ?';
            extrasValores.push(await comissaoAtual(conn, id));
        }

        // O "AND status = ?" evita que dois cliques ao mesmo tempo avancem duas vezes
        const [resultado] = await conn.execute(
            `UPDATE execucoes SET status = ?${extrasSql} WHERE id = ? AND status = ?`,
            [novoStatus, ...extrasValores, id, execucao.status]
        );
        if (resultado.affectedRows === 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'O status mudou enquanto isso. Atualize a tela.' });
        }
        // Agendamento cancelado por inteiro: o cupom usado nele volta para o cliente
        if (novoStatus === 'Cancelado') await estornarCuponsSeVazio(conn, execucao.agendamento_id);
        // Leva e traz: o carro chegou, então foi coletado
        if (novoStatus === 'Aguardando' && execucao.agendamento_id) {
            await conn.execute(
                `UPDATE agendamentos SET logistica_status = 'coletado', logistica_atualizado_em = NOW()
                  WHERE id = ? AND tipo_logistica = 'leva_tras' AND logistica_status IN ('a_buscar', 'buscando')`,
                [execucao.agendamento_id]
            );
        }
        await conn.commit();
        res.status(200).json({ mensagem: 'Status atualizado!' });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        if (erro instanceof ErroNegocio) {
            return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes || {}) });
        }
        console.error('Erro ao atualizar status:', erro);
        res.status(500).json({ erro: 'Erro ao atualizar o status.' });
    } finally {
        conn.release();
    }
});

// 3b. TROCAR A EQUIPE DE UM SERVIÇO (PUT)
// Equipe: enquanto o carro está no pátio. Administrador: também depois de finalizado
// (corrigir quem lavou muda a comissão do período).
router.put('/execucoes/:id/equipe', async (req, res) => {
    let funcionarioIds;
    try {
        funcionarioIds = listaDeIds(req.body.funcionarios, 'funcionarios');
    } catch (erro) {
        return res.status(erro.status || 400).json({ erro: erro.message });
    }
    if (funcionarioIds.length === 0) return res.status(400).json({ erro: 'Escolha pelo menos uma pessoa da equipe.' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[execucao]] = await conn.execute('SELECT status FROM execucoes WHERE id = ? FOR UPDATE', [req.params.id]);
        if (!execucao) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Serviço não encontrado.' });
        }
        const permitidos = req.usuarioLogado.perfil === 'administrador'
            ? ['Aguardando', 'Em Andamento', 'Finalizado']
            : ['Aguardando', 'Em Andamento'];
        if (!permitidos.includes(execucao.status)) {
            await conn.rollback();
            return res.status(409).json({ erro: `Não dá para mudar a equipe de um serviço "${execucao.status}".` });
        }
        await definirEquipe(conn, Number(req.params.id), funcionarioIds);
        await conn.commit();
        res.status(200).json({ mensagem: 'Equipe atualizada!' });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        if (erro instanceof ErroNegocio) return res.status(erro.status).json({ erro: erro.message });
        console.error('Erro ao trocar a equipe:', erro);
        res.status(500).json({ erro: 'Erro ao trocar a equipe.' });
    } finally {
        conn.release();
    }
});

// 3c. LEVA E TRAZ: ETAPAS DO MOTORISTA (por pedido de agendamento)
// a_buscar -> buscando (escolhe o motorista) -> coletado (automático no "Carro chegou")
// -> entregando (todos os carros do pedido prontos) -> entregue
const ETAPAS_LOGISTICA = {
    buscando: ['a_buscar'],
    a_buscar: ['buscando'], // desfaz uma saída marcada por engano
    entregando: ['coletado'],
    entregue: ['entregando']
};

router.put('/execucoes/agendamentos/:id/logistica', async (req, res) => {
    const etapa = req.body?.etapa;
    if (!ETAPAS_LOGISTICA[etapa]) return res.status(400).json({ erro: 'Etapa do leva e traz inválida.' });
    const motoristaId = req.body?.motorista_id === undefined || req.body?.motorista_id === null ? null : Number(req.body.motorista_id);
    if (motoristaId !== null && (!Number.isInteger(motoristaId) || motoristaId <= 0)) return res.status(400).json({ erro: 'Motorista inválido.' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[ag]] = await conn.execute(
            'SELECT id, tipo_logistica, logistica_status, motorista_id FROM agendamentos WHERE id = ? FOR UPDATE',
            [req.params.id]
        );
        if (!ag || ag.tipo_logistica !== 'leva_tras') {
            await conn.rollback();
            return res.status(404).json({ erro: 'Pedido de leva e traz não encontrado.' });
        }
        if (!ETAPAS_LOGISTICA[etapa].includes(ag.logistica_status)) {
            await conn.rollback();
            return res.status(409).json({ erro: 'O leva e traz mudou enquanto isso. Atualize a tela.' });
        }

        let motorista = ag.motorista_id;
        if (etapa === 'buscando' || etapa === 'entregando') {
            motorista = motoristaId ?? ag.motorista_id;
            if (!motorista) {
                await conn.rollback();
                return res.status(422).json({ erro: 'Escolha o motorista.', motivo: 'sem_motorista' });
            }
            const [[existe]] = await conn.execute('SELECT id FROM funcionarios WHERE id = ? AND ativo = 1', [motorista]);
            if (!existe) {
                await conn.rollback();
                return res.status(404).json({ erro: 'Motorista não encontrado.' });
            }
        }
        if (etapa === 'entregando') {
            const [[abertos]] = await conn.execute(
                "SELECT COUNT(*) AS total FROM execucoes WHERE agendamento_id = ? AND status IN ('Agendado', 'Aguardando', 'Em Andamento')",
                [ag.id]
            );
            if (Number(abertos.total) > 0) {
                await conn.rollback();
                return res.status(409).json({ erro: 'Ainda há carro deste pedido sendo lavado. Conclua todos antes de sair para entregar.' });
            }
        }

        await conn.execute(
            'UPDATE agendamentos SET logistica_status = ?, motorista_id = ?, logistica_atualizado_em = NOW() WHERE id = ?',
            [etapa, motorista, ag.id]
        );
        await conn.commit();
        res.status(200).json({ mensagem: 'Leva e traz atualizado!', etapa });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        console.error('Erro ao atualizar o leva e traz:', erro);
        res.status(500).json({ erro: 'Erro ao atualizar o leva e traz.' });
    } finally {
        conn.release();
    }
});

// 3d. LEVA E TRAZ A DEVOLVER: pedidos com todos os carros prontos e ainda não entregues
router.get('/execucoes/entregas', async (req, res) => {
    try {
        const [linhas] = await db.execute(`
            SELECT a.id AS agendamento_id, a.logistica_status, a.endereco_busca, a.motorista_id,
                   (SELECT m.nome FROM funcionarios m WHERE m.id = a.motorista_id) AS motorista_nome,
                   c.nome AS cliente_nome, c.telefone AS cliente_telefone,
                   GROUP_CONCAT(CONCAT(v.marca, ' ', v.modelo, ' · ', v.placa) ORDER BY e.id SEPARATOR '|') AS carros
              FROM agendamentos a
              JOIN clientes c ON c.id = a.cliente_id
              JOIN execucoes e ON e.agendamento_id = a.id AND e.status = 'Finalizado'
              JOIN veiculos v ON v.id = e.veiculo_id
             WHERE a.tipo_logistica = 'leva_tras'
               AND a.logistica_status IN ('coletado', 'entregando')
               AND NOT EXISTS (SELECT 1 FROM execucoes x WHERE x.agendamento_id = a.id
                                AND x.status IN ('Agendado', 'Aguardando', 'Em Andamento'))
             GROUP BY a.id
             ORDER BY a.logistica_atualizado_em ASC, a.id ASC`);
        res.status(200).json(linhas.map((l) => ({ ...l, carros: l.carros ? l.carros.split('|') : [] })));
    } catch (erro) {
        console.error('Erro ao buscar as entregas:', erro);
        res.status(500).json({ erro: 'Erro ao buscar as entregas do leva e traz.' });
    }
});

// 4. EXCLUIR SERVIÇO DO PÁTIO (DELETE) - Apenas Administrador
router.delete('/execucoes/:id', async (req, res) => {
    try {
        const [[execucao]] = await db.execute('SELECT agendamento_id FROM execucoes WHERE id = ?', [req.params.id]);
        if (!execucao) {
            return res.status(404).json({ erro: 'Serviço não encontrado. Atualize a tela.' });
        }
        // execucao_extras e execucao_funcionarios saem junto (ON DELETE CASCADE).
        // A contagem de fidelidade é recalculada pelo trigger do banco.
        await db.execute('DELETE FROM execucoes WHERE id = ?', [req.params.id]);
        // Sem nenhum carro sobrando no agendamento, o cupom usado nele volta para o cliente
        await estornarCuponsSeVazio(db, execucao.agendamento_id);
        res.status(200).json({ mensagem: 'Serviço removido!' });
    } catch (erro) {
        console.error('Erro ao remover serviço:', erro);
        res.status(500).json({ erro: 'Erro ao remover serviço.' });
    }
});

// 5. HISTÓRICO (GET) - serviços finalizados, com filtros opcionais:
//   inicio / fim (AAAA-MM-DD, dia do serviço; padrão: mês atual até hoje),
//   funcionario_id (quem lavou) e busca (nome do cliente ou placa)
router.get('/execucoes/historico', async (req, res) => {
    try {
        const { inicio, fim } = validarPeriodo(req.query.inicio, req.query.fim);
        const condicoes = ["e.status = 'Finalizado'", `${SQL_DIA_SERVICO} BETWEEN ? AND ?`];
        const valores = [inicio, fim];

        const funcionarioId = Number(req.query.funcionario_id);
        if (req.query.funcionario_id) {
            if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) return res.status(400).json({ erro: 'Funcionário inválido.' });
            condicoes.push('EXISTS (SELECT 1 FROM execucao_funcionarios x WHERE x.execucao_id = e.id AND x.funcionario_id = ?)');
            valores.push(funcionarioId);
        }
        const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().slice(0, 60) : '';
        if (busca) {
            condicoes.push('(c.nome LIKE ? OR v.placa LIKE ?)');
            valores.push(`%${busca}%`, `%${busca.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}%`);
        }

        const query = `
            SELECT 
                e.id, e.status, e.valor_total, e.valor_logistica, e.valor_desconto, e.criado_em as data_entrada,
                TIMESTAMPDIFF(MINUTE, e.inicio_em, e.finalizado_em) AS minutos_lavagem,
                DATE_FORMAT(${SQL_DIA_SERVICO}, '%Y-%m-%d') AS dia,
                c.nome as cliente_nome, v.marca, v.modelo, v.placa, v.porte,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(f.nome SEPARATOR ', ') FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis,
                (SELECT GROUP_CONCAT(f.id) FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis_ids,
                (SELECT GROUP_CONCAT(ex.nome SEPARATOR ', ') FROM execucao_extras eex JOIN servicos_extras ex ON eex.extra_id = ex.id WHERE eex.execucao_id = e.id) as servicos_extras
            FROM execucoes e
            JOIN clientes c ON e.cliente_id = c.id
            JOIN veiculos v ON e.veiculo_id = v.id
            LEFT JOIN pacotes p ON e.pacote_id = p.id
            WHERE ${condicoes.join(' AND ')}
            ORDER BY dia DESC, e.id DESC
        `;
        const [historico] = await db.execute(query, valores);
        // Valores em dinheiro só para o administrador; a equipe vê os carros e quem lavou
        if (req.usuarioLogado.perfil !== 'administrador') {
            return res.status(200).json(historico.map(({ valor_total, valor_logistica, valor_desconto, ...resto }) => resto));
        }
        res.status(200).json(historico);
    } catch (erro) {
        if (erro instanceof ErroNegocio) return res.status(erro.status).json({ erro: erro.message });
        console.error('Erro ao buscar histórico:', erro);
        res.status(500).json({ erro: 'Erro ao buscar o histórico.' });
    }
});

// 6. BUSCAR SERVIÇOS DE UM CLIENTE ESPECÍFICO (GET)
router.get('/execucoes/cliente/:cliente_id', async (req, res) => {
    const { cliente_id } = req.params;

    // Cliente só enxerga os próprios serviços (o id vem do token, não da URL).
    // Funcionário e administrador podem consultar qualquer cliente.
    const { perfil, id: usuarioId } = req.usuarioLogado || {};
    if (perfil === 'cliente' && String(usuarioId) !== String(cliente_id)) {
        return res.status(403).json({ erro: 'Acesso negado. Você só pode consultar os seus próprios serviços.' });
    }

    try {
        const query = `
            SELECT 
                e.id, e.status, e.valor_total, e.valor_logistica, e.criado_em, e.agendamento_id,
                DATE_FORMAT(e.data_agendamento, '%Y-%m-%d %H:%i') AS data_agendamento, -- texto, sem conversão de fuso
                a.tipo_logistica, a.logistica_status,
                (SELECT SUBSTRING_INDEX(m.nome, ' ', 1) FROM funcionarios m WHERE m.id = a.motorista_id) AS motorista_nome,
                v.marca, v.modelo, v.placa,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(ex.nome SEPARATOR ', ') FROM execucao_extras eex JOIN servicos_extras ex ON eex.extra_id = ex.id WHERE eex.execucao_id = e.id) as servicos_extras
            FROM execucoes e
            JOIN veiculos v ON e.veiculo_id = v.id
            LEFT JOIN pacotes p ON e.pacote_id = p.id
            LEFT JOIN agendamentos a ON a.id = e.agendamento_id
            WHERE e.cliente_id = ?
            ORDER BY e.id DESC
        `;
        const [servicos] = await db.execute(query, [cliente_id]);
        res.status(200).json(servicos);
    } catch (erro) {
        console.error('Erro ao buscar serviços do cliente:', erro);
        res.status(500).json({ erro: 'Erro ao buscar os serviços.' });
    }
});

module.exports = router;