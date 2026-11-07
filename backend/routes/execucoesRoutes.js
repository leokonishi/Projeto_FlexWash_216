const express = require('express');
const router = express.Router();
const db = require('../bd');
const { registrarEntrada, exigirForaDoPatio, STATUS_NO_PATIO } = require('../services/execucoesService');
const { ErroNegocio } = require('../services/erros');
const agenda = require('../services/agenda');
const { avaliarLevaTras } = require('../services/logistica');

// Campos comuns às listas do pátio e dos próximos agendamentos
const CAMPOS_PATIO = `
                e.id, e.status, e.valor_total, e.valor_logistica, e.criado_em as data_entrada,
                DATE_FORMAT(e.data_agendamento, '%Y-%m-%d %H:%i') AS data_agendamento,
                a.tipo_logistica, a.endereco_busca,
                c.nome as cliente_nome, c.telefone as cliente_telefone, v.marca, v.modelo, v.placa, v.porte,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(f.nome SEPARATOR ', ') FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis,
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
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[execucao]] = await conn.execute('SELECT status, veiculo_id FROM execucoes WHERE id = ? FOR UPDATE', [id]);
        if (!execucao) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Serviço não encontrado.' });
        }

        if (!(TRANSICOES[execucao.status] || []).includes(novoStatus)) {
            await conn.rollback();
            return res.status(409).json({ erro: `Não é possível mudar de "${execucao.status}" para "${novoStatus}".` });
        }

        if (STATUS_NO_PATIO.includes(novoStatus) && !STATUS_NO_PATIO.includes(execucao.status)) {
            await exigirForaDoPatio(conn, [execucao.veiculo_id], { ignorarExecucaoId: Number(id) });
        }

        // O "AND status = ?" evita que dois cliques ao mesmo tempo avancem duas vezes
        const [resultado] = await conn.execute(
            'UPDATE execucoes SET status = ? WHERE id = ? AND status = ?',
            [novoStatus, id, execucao.status]
        );
        if (resultado.affectedRows === 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'O status mudou enquanto isso. Atualize a tela.' });
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

// 4. EXCLUIR SERVIÇO DO PÁTIO (DELETE) - Apenas Administrador
router.delete('/execucoes/:id', async (req, res) => {
    try {
        // execucao_extras e execucao_funcionarios saem junto (ON DELETE CASCADE)
        const [resultado] = await db.execute('DELETE FROM execucoes WHERE id = ?', [req.params.id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Serviço não encontrado. Atualize a tela.' });
        }
        res.status(200).json({ mensagem: 'Serviço removido!' });
    } catch (erro) {
        console.error('Erro ao remover serviço:', erro);
        res.status(500).json({ erro: 'Erro ao remover serviço.' });
    }
});

router.get('/execucoes/historico', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id, e.status, e.valor_total, e.criado_em as data_entrada, 
                c.nome as cliente_nome, v.marca, v.modelo, v.placa, v.porte,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(f.nome SEPARATOR ', ') FROM execucao_funcionarios ef JOIN funcionarios f ON ef.funcionario_id = f.id WHERE ef.execucao_id = e.id) as responsaveis,
                (SELECT GROUP_CONCAT(ex.nome SEPARATOR ', ') FROM execucao_extras eex JOIN servicos_extras ex ON eex.extra_id = ex.id WHERE eex.execucao_id = e.id) as servicos_extras
            FROM execucoes e
            JOIN clientes c ON e.cliente_id = c.id
            JOIN veiculos v ON e.veiculo_id = v.id
            LEFT JOIN pacotes p ON e.pacote_id = p.id
            WHERE e.status = 'Finalizado'
            ORDER BY e.id DESC
        `;
        const [historico] = await db.execute(query);
        res.status(200).json(historico);
    } catch (erro) {
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
                e.id, e.status, e.valor_total, e.valor_logistica, e.criado_em,
                DATE_FORMAT(e.data_agendamento, '%Y-%m-%d %H:%i') AS data_agendamento, -- texto, sem conversão de fuso
                v.marca, v.modelo, v.placa,
                p.nome as pacote_nome,
                (SELECT GROUP_CONCAT(ex.nome SEPARATOR ', ') FROM execucao_extras eex JOIN servicos_extras ex ON eex.extra_id = ex.id WHERE eex.execucao_id = e.id) as servicos_extras
            FROM execucoes e
            JOIN veiculos v ON e.veiculo_id = v.id
            LEFT JOIN pacotes p ON e.pacote_id = p.id
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