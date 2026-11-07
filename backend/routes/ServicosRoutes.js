const express = require('express');
const router = express.Router();
const db = require('../bd');

// Status em que um serviço ainda está "vivo" (agendado ou no pátio).
const STATUS_ATIVOS = ['Agendado', 'Aguardando', 'Em Andamento'];

// Valida e normaliza o corpo de um pacote/extra. Devolve { erro } ou { valores }.
function lerItemDoCorpo(body) {
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
    if (!nome) return { erro: 'Informe o nome.' };

    const precos = ['preco_pequeno', 'preco_medio', 'preco_grande'].map((c) => Number(body[c]));
    if (precos.some((p) => !Number.isFinite(p) || p < 0)) {
        return { erro: 'Informe preços válidos (zero ou mais) para os 3 portes.' };
    }

    const comissao = Number(body.comissao_porcentagem || 0);
    if (!Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
        return { erro: 'A comissão deve ficar entre 0 e 100%.' };
    }

    return { valores: [nome, descricao, ...precos, comissao] };
}

// Pacotes e extras têm o mesmo formato; muda só a tabela e como a execução aponta para eles.
const CATALOGOS = [
    {
        rota: '/pacotes',
        tabela: 'pacotes',
        ordem: 'preco_medio ASC',
        nome: 'Pacote',
        // Quantos serviços ainda abertos usam este pacote
        sqlEmUso: `SELECT COUNT(*) AS total FROM execucoes WHERE pacote_id = ? AND status IN (${STATUS_ATIVOS.map(() => '?').join(', ')})`,
    },
    {
        rota: '/extras',
        tabela: 'servicos_extras',
        ordem: 'id DESC',
        nome: 'Serviço extra',
        sqlEmUso: `SELECT COUNT(*) AS total FROM execucao_extras eex JOIN execucoes e ON e.id = eex.execucao_id
                   WHERE eex.extra_id = ? AND e.status IN (${STATUS_ATIVOS.map(() => '?').join(', ')})`,
    },
];

for (const cat of CATALOGOS) {
    // LISTAR (qualquer usuário logado)
    router.get(cat.rota, async (req, res) => {
        try {
            const [itens] = await db.execute(`SELECT * FROM ${cat.tabela} ORDER BY ${cat.ordem}`);
            res.status(200).json(itens);
        } catch (erro) {
            console.error(`Erro ao buscar ${cat.tabela}:`, erro);
            res.status(500).json({ erro: 'Erro interno ao buscar o catálogo de serviços.' });
        }
    });

    // CADASTRAR (admin)
    router.post(cat.rota, async (req, res) => {
        const { erro, valores } = lerItemDoCorpo(req.body);
        if (erro) return res.status(400).json({ erro });
        try {
            const [resultado] = await db.execute(
                `INSERT INTO ${cat.tabela} (nome, descricao, preco_pequeno, preco_medio, preco_grande, comissao_porcentagem)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                valores
            );
            res.status(201).json({ mensagem: `${cat.nome} cadastrado com sucesso!`, id: resultado.insertId });
        } catch (erro) {
            console.error(`Erro ao cadastrar em ${cat.tabela}:`, erro);
            res.status(500).json({ erro: `Erro ao cadastrar ${cat.nome.toLowerCase()}.` });
        }
    });

    // EDITAR (admin). Serviços já registrados guardam o valor total, então mudar o preço
    // aqui só vale para as próximas entradas.
    router.put(`${cat.rota}/:id`, async (req, res) => {
        const { erro, valores } = lerItemDoCorpo(req.body);
        if (erro) return res.status(400).json({ erro });
        try {
            const [resultado] = await db.execute(
                `UPDATE ${cat.tabela}
                 SET nome = ?, descricao = ?, preco_pequeno = ?, preco_medio = ?, preco_grande = ?, comissao_porcentagem = ?
                 WHERE id = ?`,
                [...valores, req.params.id]
            );
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ erro: `${cat.nome} não encontrado.` });
            }
            res.status(200).json({ mensagem: `${cat.nome} atualizado com sucesso!` });
        } catch (erro) {
            console.error(`Erro ao editar ${cat.tabela}:`, erro);
            res.status(500).json({ erro: `Erro ao editar ${cat.nome.toLowerCase()}.` });
        }
    });

    // EXCLUIR (admin). Bloqueia se algum serviço agendado ou no pátio ainda usa o item.
    router.delete(`${cat.rota}/:id`, async (req, res) => {
        try {
            const [[uso]] = await db.execute(cat.sqlEmUso, [req.params.id, ...STATUS_ATIVOS]);
            if (Number(uso.total) > 0) {
                return res.status(409).json({
                    erro: `Não dá para excluir: ${uso.total} serviço(s) agendado(s) ou no pátio usam este item. Finalize ou cancele esses serviços antes.`
                });
            }
            const [resultado] = await db.execute(`DELETE FROM ${cat.tabela} WHERE id = ?`, [req.params.id]);
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ erro: `${cat.nome} não encontrado.` });
            }
            res.status(200).json({ mensagem: `${cat.nome} removido com sucesso!` });
        } catch (erro) {
            if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
                return res.status(409).json({ erro: 'Este item está ligado a serviços já registrados e não pode ser excluído.' });
            }
            console.error(`Erro ao excluir de ${cat.tabela}:`, erro);
            res.status(500).json({ erro: `Erro ao remover ${cat.nome.toLowerCase()}.` });
        }
    });
}

module.exports = router;
