const express = require('express');
const router = express.Router();
const db = require('../bd');

const verificarToken = require('../middleware/auth');
const verificarPerfil = require('../middleware/perfil');

// Apenas administrador (token válido + perfil 'administrador')
const verificarAdmin = [verificarToken, verificarPerfil([])];

const ServicoDB = {
    listarTodos: async (apenasAtivos = false) => {
        let sql = 'SELECT id, nome, descricao, preco_base, duracao_estimada, ativo, criado_em FROM servicos';
        if (apenasAtivos) {
            sql += ' WHERE ativo = 1';
        }
        sql += ' ORDER BY nome ASC';
        
        const [resultados] = await db.execute(sql);
        return resultados;
    },

    inserir: async (dados) => {
        const sql = `
            INSERT INTO servicos (nome, descricao, preco_base, duracao_estimada, ativo)
            VALUES (?, ?, ?, ?, ?)
        `;
        const valores = [dados.nome, dados.descricao, dados.preco_base, dados.duracao_estimada, true];
        const [res] = await db.execute(sql, valores);
        return { id: res.insertId, ...dados, ativo: true };
    },

    atualizar: async (id, dados) => {
        const sql = `
            UPDATE servicos 
            SET nome = ?, descricao = ?, preco_base = ?, duracao_estimada = ?, ativo = ?
            WHERE id = ?
        `;
        const valores = [dados.nome, dados.descricao, dados.preco_base, dados.duracao_estimada, dados.ativo, id];
        await db.execute(sql, valores);
        return { id, ...dados };
    }
};

router.get('/servicos', async (req, res) => {
    const apenasAtivos = req.query.ativos === 'true';
    try {
        const lista = await ServicoDB.listarTodos(apenasAtivos);
        return res.status(200).json({ sucesso: true, dados: lista });
    } catch (erro) {
        console.error('Erro ao buscar serviços:', erro);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar servicos.' });
    }
});

router.post('/servicos', verificarAdmin, async (req, res) => {
    const { nome, descricao, preco_base, duracao_estimada } = req.body;

    if (!nome || nome.trim() === '') {
        return res.status(400).json({ sucesso: false, mensagem: 'O nome do servico e obrigatorio.' });
    }

    if (preco_base === undefined || parseFloat(preco_base) < 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'O preco base e obrigatorio e nao pode ser negativo.' });
    }

    if (duracao_estimada !== undefined && parseInt(duracao_estimada) < 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'A duracao estimada nao pode ser negativa.' });
    }

    try {
        const novo = await ServicoDB.inserir({
            nome: nome.trim(),
            descricao: descricao ? descricao.trim() : '',
            preco_base: parseFloat(preco_base),
            duracao_estimada: parseInt(duracao_estimada) || 0
        });
        return res.status(201).json({ sucesso: true, mensagem: 'Servico cadastrado.', dados: novo });
    } catch (erro) {
        console.error('Erro ao cadastrar serviço:', erro);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar servico.' });
    }
});

router.put('/servicos/:id', verificarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, preco_base, duracao_estimada, ativo } = req.body;

    if (!nome || nome.trim() === '') {
        return res.status(400).json({ sucesso: false, mensagem: 'O nome do servico e obrigatorio.' });
    }

    if (preco_base === undefined || parseFloat(preco_base) < 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'O preco base nao pode ser negativo.' });
    }

    if (duracao_estimada !== undefined && parseInt(duracao_estimada) < 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'A duracao estimada nao pode ser negativa.' });
    }

    try {
        const atualizado = await ServicoDB.atualizar(id, {
            nome: nome.trim(),
            descricao: descricao ? descricao.trim() : '',
            preco_base: parseFloat(preco_base),
            duracao_estimada: parseInt(duracao_estimada) || 0,
            ativo: Boolean(ativo)
        });

        return res.status(200).json({ sucesso: true, mensagem: 'Servico atualizado!', dados: atualizado });
    } catch (erro) {
        console.error('Erro ao atualizar serviço:', erro);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao editar.' });
    }
});

module.exports = router;