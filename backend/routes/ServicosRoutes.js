const express = require('express');
const router = express.Router();
const db = require('../bd');

router.get('/pacotes', async (req, res) => {
    try {
        const [pacotes] = await db.execute('SELECT * FROM pacotes ORDER BY preco_medio ASC');
        res.status(200).json(pacotes);
    } catch (erro) {
        console.error('Erro ao buscar pacotes:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar pacotes de lavagem.' });
    }
});

router.post('/pacotes', async (req, res) => {
    const { nome, descricao, preco_pequeno, preco_medio, preco_grande, comissao_porcentagem } = req.body;
    try {
        const query = `
            INSERT INTO pacotes (nome, descricao, preco_pequeno, preco_medio, preco_grande, comissao_porcentagem) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.execute(query, [nome, descricao || '', preco_pequeno || 0, preco_medio || 0, preco_grande || 0, comissao_porcentagem || 0]);
        res.status(201).json({ mensagem: 'Pacote de lavagem cadastrado com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar pacote de lavagem.' });
    }
});

router.delete('/pacotes/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM pacotes WHERE id = ?', [req.params.id]);
        res.status(200).json({ mensagem: 'Pacote removido com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao remover pacote.' });
    }
});

router.get('/extras', async (req, res) => {
    try {
        const [extras] = await db.execute('SELECT * FROM servicos_extras ORDER BY id DESC');
        res.status(200).json(extras);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro interno ao buscar serviços adicionais.' });
    }
});

router.post('/extras', async (req, res) => {
    const { nome, descricao, preco_pequeno, preco_medio, preco_grande, comissao_porcentagem } = req.body;
    try {
        const query = `
            INSERT INTO servicos_extras (nome, descricao, preco_pequeno, preco_medio, preco_grande, comissao_porcentagem) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.execute(query, [nome, descricao || '', preco_pequeno || 0, preco_medio || 0, preco_grande || 0, comissao_porcentagem || 0]);
        res.status(201).json({ mensagem: 'Extra cadastrado com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar serviço extra.' });
    }
});

router.delete('/extras/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM servicos_extras WHERE id = ?', [req.params.id]);
        res.status(200).json({ mensagem: 'Extra removido com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao remover serviço extra.' });
    }
});

module.exports = router;