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

    // Tira os pontos e traços do CPF para usar como senha inicial provisória
    const senhaInicial = cpf.replace(/\D/g, ''); 

    try {
        const query = `
            INSERT INTO clientes (cpf, nome, email, telefone, endereco, senha) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // Passamos a senhaInicial para preencher o campo NOT NULL da sua tabela
        const [resultado] = await db.execute(query, [cpf, nome, email, telefone, endereco, senhaInicial]);
        
        res.status(201).json({ 
            mensagem: 'Cliente cadastrado com sucesso!', 
            clienteId: resultado.insertId 
        });
    } catch (erro) {
        console.error('Erro ao cadastrar cliente:', erro);
        
        // O código ER_DUP_ENTRY do MySQL avisa se o CPF ou E-mail já existirem
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Este CPF ou E-mail já está cadastrado no sistema.' });
        }
        res.status(500).json({ erro: 'Erro interno ao cadastrar cliente.' });
    }
};