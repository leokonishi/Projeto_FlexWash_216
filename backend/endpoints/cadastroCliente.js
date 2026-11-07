const bcrypt = require('bcrypt');
const db = require('../bd');
const { montarEndereco, validarPartes } = require('../services/mapa');

const cadastrar = async (req, res) => {
    const { nome, cpf, email, telefone, senha } = req.body;

    // Endereço (opcional): pelo formulário com CEP vem em `endereco_partes`
    let endereco = typeof req.body.endereco === 'string' ? req.body.endereco.trim() : '';
    if (req.body.endereco_partes) {
        try {
            endereco = montarEndereco(validarPartes(req.body.endereco_partes));
        } catch (erro) {
            return res.status(400).json({ sucesso: false, mensagem: erro.message, erro: erro.message });
        }
    }

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
                (SELECT COUNT(*) FROM veiculos v WHERE v.cliente_id = c.id) AS frota,
                (SELECT GROUP_CONCAT(v.placa SEPARATOR ',') FROM veiculos v WHERE v.cliente_id = c.id) AS placas
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

// Status em que o serviço ainda está aberto (agendado ou no pátio)
const STATUS_ATIVOS = ['Agendado', 'Aguardando', 'Em Andamento'];
const MARCADORES_ATIVOS = STATUS_ATIVOS.map(() => '?').join(', ');

// EDITAR CLIENTE (PUT /api/clientes/:id) - equipe
const atualizarCliente = async (req, res) => {
    const texto = (v) => (typeof v === 'string' ? v.trim() : '');
    const nome = texto(req.body.nome);
    const cpf = texto(req.body.cpf);
    const email = texto(req.body.email);
    const telefone = texto(req.body.telefone);
    const endereco = texto(req.body.endereco);

    if (!nome || !cpf) {
        return res.status(400).json({ sucesso: false, erro: 'Nome e CPF são obrigatórios.' });
    }

    try {
        const [resultado] = await db.execute(
            'UPDATE clientes SET nome = ?, cpf = ?, email = ?, telefone = ?, endereco = ? WHERE id = ?',
            [nome, cpf, email, telefone, endereco, req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        }
        return res.status(200).json({ sucesso: true, mensagem: 'Cliente atualizado com sucesso!' });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ sucesso: false, erro: 'Já existe outro cliente com este CPF ou e-mail.' });
        }
        console.error('Erro ao atualizar cliente:', erro);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar o cliente.' });
    }
};

// EXCLUIR CLIENTE (DELETE /api/clientes/:id) - só administrador
// - Com serviço agendado ou no pátio: bloqueia (cancele/finalize antes).
// - Com histórico de lavagens: só apaga se vier ?incluirHistorico=1 (o painel pede uma 2ª confirmação),
//   porque o histórico some junto e sai dos relatórios.
// Veículos, endereços e agendamentos do cliente são removidos pelo ON DELETE CASCADE do banco.
const excluirCliente = async (req, res) => {
    const { id } = req.params;
    const incluirHistorico = req.query.incluirHistorico === '1' || req.query.incluirHistorico === 'true';
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[cliente]] = await conn.execute('SELECT id, nome FROM clientes WHERE id = ? FOR UPDATE', [id]);
        if (!cliente) {
            await conn.rollback();
            return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        }

        const [[ativos]] = await conn.execute(
            `SELECT COUNT(*) AS total FROM execucoes WHERE cliente_id = ? AND status IN (${MARCADORES_ATIVOS})`,
            [id, ...STATUS_ATIVOS]
        );
        if (Number(ativos.total) > 0) {
            await conn.rollback();
            return res.status(409).json({
                sucesso: false,
                erro: `${cliente.nome} tem ${ativos.total} serviço(s) agendado(s) ou no pátio. Finalize ou cancele antes de excluir.`
            });
        }

        const [[historico]] = await conn.execute('SELECT COUNT(*) AS total FROM execucoes WHERE cliente_id = ?', [id]);
        const totalHistorico = Number(historico.total);
        if (totalHistorico > 0 && !incluirHistorico) {
            await conn.rollback();
            return res.status(409).json({
                sucesso: false,
                precisaConfirmarHistorico: true,
                historico: totalHistorico,
                erro: `${cliente.nome} tem ${totalHistorico} lavagem(ns) no histórico.`
            });
        }

        if (totalHistorico > 0) {
            // execucao_extras e execucao_funcionarios saem pelo ON DELETE CASCADE
            await conn.execute('DELETE FROM execucoes WHERE cliente_id = ?', [id]);
        }
        await conn.execute('DELETE FROM clientes WHERE id = ?', [id]);
        await conn.commit();

        return res.status(200).json({ sucesso: true, mensagem: 'Cliente excluído com sucesso.' });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ sucesso: false, erro: 'O cliente ainda tem registros ligados a ele e não pode ser excluído.' });
        }
        console.error('Erro ao excluir cliente:', erro);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao excluir o cliente.' });
    } finally {
        conn.release();
    }
};

module.exports = { cadastrar, listarClientes, atualizarCliente, excluirCliente };