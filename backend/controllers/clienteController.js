const db = require('../bd'); // Caminho corrigido apontando para a raiz!

// 1. Listar todos os clientes e contar a frota
exports.listarClientes = async (req, res) => {
    try {
        const query = `
            SELECT c.*, COUNT(v.id) as frotaCount 
            FROM clientes c
            LEFT JOIN veiculos v ON c.id = v.cliente_id
            GROUP BY c.id
            ORDER BY c.nome ASC
        `;
        const [clientes] = await db.execute(query);
        res.status(200).json(clientes);
    } catch (erro) {
        console.error('Erro ao listar clientes:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar clientes.' });
    }
};

// 2. Cadastrar novo cliente (Pelo Painel Administrativo)
exports.cadastrarCliente = async (req, res) => {
    const { cpf, nome, email, telefone, endereco } = req.body;

    if (!cpf || !nome || !email || !telefone) {
        return res.status(400).json({ erro: 'CPF, Nome, E-mail e Telefone são obrigatórios.' });
    }

    const senhaInicial = cpf.replace(/\D/g, ''); 

    try {
        const query = `
            INSERT INTO clientes (cpf, nome, email, telefone, endereco, senha) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [resultado] = await db.execute(query, [cpf, nome, email, telefone, endereco, senhaInicial]);
        
        res.status(201).json({ 
            mensagem: 'Cliente cadastrado com sucesso!', 
            clienteId: resultado.insertId 
        });
    } catch (erro) {
        console.error('Erro ao cadastrar cliente:', erro);
        
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Este CPF ou E-mail já está cadastrado no sistema.' });
        }
        res.status(500).json({ erro: 'Erro interno ao cadastrar cliente.' });
    }
};

// 3. Atualizar o endereço do cliente
exports.atualizarEndereco = async (req, res) => {
    const { id } = req.params;
    const { endereco } = req.body;

    if (!endereco) {
        return res.status(400).json({ erro: 'O campo endereço é obrigatório.' });
    }

    try {
        const query = 'UPDATE clientes SET endereco = ? WHERE id = ?';
        await db.execute(query, [endereco, id]);

        res.status(200).json({ sucesso: true, mensagem: 'Endereço atualizado com sucesso!' });
    } catch (erro) {
        console.error('Erro ao atualizar endereço:', erro);
        res.status(500).json({ erro: 'Erro interno ao atualizar endereço.' });
    }
};