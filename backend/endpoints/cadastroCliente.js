const bcrypt = require('bcrypt');
const db = require('../bd');

const cadastrar = async (req, res) => {
    const { nome, cpf, email, telefone, endereco, senha } = req.body;

    // Se o Admin cadastrou pelo painel, a senha pode vir vazia. Definimos uma padrão se necessário.
    const senhaParaUsar = senha ? senha : '123'; 

    if (!nome || !cpf) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e CPF são obrigatórios.' });
    }

    try {
        const senhaHash = await bcrypt.hash(senhaParaUsar, 10);
        const query = `
            INSERT INTO clientes (nome, cpf, email, telefone, endereco, senha) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.execute(query, [
            nome, 
            cpf, 
            email || '', 
            telefone || '', 
            endereco || '', 
            senhaHash
        ]);
        
        return res.status(201).json({ sucesso: true, mensagem: 'Cliente cadastrado com sucesso!' });
    } catch (erro) {
        console.error('Erro ao cadastrar cliente:', erro);
        return res.status(400).json({ 
            sucesso: false, 
            mensagem: 'Erro ao cadastrar. Verifique se o CPF ou E-mail já estão registados.' 
        });
    }
};

const listarClientes = async (req, res) => {
    try {
        // A MÁGICA ESTÁ AQUI: O sub-select (SELECT COUNT(*)...) conta os veículos do cliente!
        const query = `
            SELECT 
                c.id, c.nome, c.cpf, c.telefone, c.endereco, c.email,
                (SELECT COUNT(*) FROM veiculos v WHERE v.cliente_id = c.id) AS frota
            FROM clientes c 
            ORDER BY c.nome ASC
        `;
        const [clientes] = await db.execute(query);
        return res.status(200).json(clientes);
    } catch (erro) {
        console.error('Erro ao listar clientes:', erro);
        return res.status(500).json({ erro: 'Erro ao listar clientes.' });
    }
};
module.exports = { cadastrar, listarClientes };