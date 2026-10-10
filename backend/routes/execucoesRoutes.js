const express = require('express');
const router = express.Router();
const db = require('../bd');

// 1. REGISTRAR NOVA ENTRADA (POST)
router.post('/execucoes', async (req, res) => {
    const { cliente_id, veiculos } = req.body;

    if (!cliente_id || !veiculos || veiculos.length === 0) {
        return res.status(400).json({ erro: 'Dados incompletos para iniciar o serviço.' });
    }

    try {
        for (const veiculo of veiculos) {
            const pacoteIdFinal = veiculo.pacote_id ? veiculo.pacote_id : null;

            const queryExecucao = `
                INSERT INTO execucoes (cliente_id, veiculo_id, pacote_id, valor_total) 
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await db.execute(queryExecucao, [
                cliente_id, 
                veiculo.veiculo_id, 
                pacoteIdFinal, 
                veiculo.valor_total || 0
            ]);
            
            const execucaoId = result.insertId;

            if (veiculo.extras && veiculo.extras.length > 0) {
                const queryExtra = 'INSERT INTO execucao_extras (execucao_id, extra_id) VALUES (?, ?)';
                for (const extraId of veiculo.extras) {
                    await db.execute(queryExtra, [execucaoId, extraId]);
                }
            }

            if (veiculo.funcionarios && veiculo.funcionarios.length > 0) {
                const queryFunc = 'INSERT INTO execucao_funcionarios (execucao_id, funcionario_id) VALUES (?, ?)';
                for (const funcId of veiculo.funcionarios) {
                    await db.execute(queryFunc, [execucaoId, funcId]);
                }
            }
        }
        res.status(201).json({ mensagem: 'Serviços registrados com sucesso no pátio!' });
    } catch (erro) {
        console.error('Erro ao registrar execução:', erro);
        res.status(500).json({ erro: 'Erro interno ao iniciar o serviço.' });
    }
});

// 2. LISTAR PÁTIO (GET)
router.get('/execucoes/patio', async (req, res) => {
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
            WHERE e.status IN ('Aguardando', 'Em Andamento')
            ORDER BY e.criado_em ASC
        `;
        const [patio] = await db.execute(query);
        res.status(200).json(patio);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar o fluxo do pátio.' });
    }
});

// 3. AVANÇAR STATUS (PUT)
router.put('/execucoes/:id/status', async (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;
    try {
        await db.execute('UPDATE execucoes SET status = ? WHERE id = ?', [novoStatus, id]);
        res.status(200).json({ mensagem: 'Status atualizado!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atualizar o status.' });
    }
});

// 4. EXCLUIR SERVIÇO DO PÁTIO (DELETE) - Apenas Administrador
router.delete('/execucoes/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM execucoes WHERE id = ?', [req.params.id]);
        res.status(200).json({ mensagem: 'Serviço removido do pátio!' });
    } catch (erro) {
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
    try {
        const query = `
            SELECT 
                e.id, e.status, e.valor_total, e.criado_em, 
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