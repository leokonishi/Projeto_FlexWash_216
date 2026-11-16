const bcrypt = require('bcrypt');
const db = require('../bd');
const { montarEndereco, validarPartes } = require('../services/mapa');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const validar = require('../services/validacao');
const { ErroNegocio } = require('../services/erros');
const acesso = require('../services/acessoCliente');

// Quem está cadastrando: a própria pessoa (rota pública, sem token) ou a equipe (balcão/painel)
function cadastroPelaEquipe(req) {
    const [esquema, token] = String(req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) return false;
    try {
        const { perfil } = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return perfil === 'funcionario' || perfil === 'administrador';
    } catch {
        return false;
    }
}

const responderErro = (res, erro, contexto) => {
    if (erro instanceof ErroNegocio) {
        return res.status(erro.status).json({ sucesso: false, mensagem: erro.message, erro: erro.message });
    }
    if (erro.code === 'ER_DUP_ENTRY') {
        const campo = String(erro.sqlMessage || '').includes('cpf') ? 'CPF' : 'e-mail';
        const msg = `Já existe um cliente com este ${campo}.`;
        return res.status(409).json({ sucesso: false, mensagem: msg, erro: msg });
    }
    console.error(contexto, erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar o cliente.', erro: 'Erro ao salvar o cliente.' });
};

// CADASTRAR CLIENTE (POST /api/clientes)
// - Pela própria pessoa (app): e-mail, telefone e senha obrigatórios.
// - Pela equipe: e-mail opcional e SEM senha. O cliente cria a senha depois, no "Primeiro acesso".
//   (Nada de senha padrão: antes era "123" e qualquer um entrava na conta.)
const cadastrar = async (req, res) => {
    const pelaEquipe = cadastroPelaEquipe(req);
    try {
        const dados = {
            nome: validar.nome(req.body.nome),
            cpf: validar.cpf(req.body.cpf),
            email: validar.email(req.body.email, { obrigatorio: !pelaEquipe }),
            telefone: validar.telefone(req.body.telefone),
        };
        const senha = pelaEquipe ? null : validar.senha(req.body.senha);

        // Endereço (opcional): pelo formulário com CEP vem em `endereco_partes`
        let endereco = typeof req.body.endereco === 'string' ? req.body.endereco.trim() : '';
        if (req.body.endereco_partes) endereco = montarEndereco(validarPartes(req.body.endereco_partes));
        if (endereco.length > 255) throw new ErroNegocio('O endereço pode ter no máximo 255 caracteres.');

        const senhaHash = senha ? await bcrypt.hash(senha, 10) : null;
        const [resultado] = await db.execute(
            'INSERT INTO clientes (nome, cpf, email, telefone, endereco, senha) VALUES (?, ?, ?, ?, ?, ?)',
            [dados.nome, dados.cpf, dados.email, dados.telefone, endereco, senhaHash]
        );
        // Cadastro no balcão com e-mail: o cliente já recebe o link para criar a senha
        let acessoEnviado = false;
        if (pelaEquipe && dados.email) {
            try {
                acessoEnviado = (await acesso.enviarLink({ id: resultado.insertId, ...dados, senha: null })).enviado;
            } catch (erroEmail) {
                console.error('Cliente cadastrado, mas o e-mail de acesso falhou:', erroEmail.message);
            }
        }
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Cliente cadastrado com sucesso!',
            id: resultado.insertId,
            acesso_enviado: acessoEnviado
        });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao cadastrar cliente:');
    }
};

// REENVIAR O LINK DE ACESSO (POST /api/clientes/:id/acesso) - equipe
// Para o cliente de balcão que não recebeu o e-mail, ou que esqueceu a senha.
const enviarAcesso = async (req, res) => {
    try {
        const [[cliente]] = await db.execute('SELECT id, nome, email, senha FROM clientes WHERE id = ?', [req.params.id]);
        if (!cliente) return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        if (!cliente.email) {
            return res.status(422).json({ sucesso: false, erro: 'Cadastre o e-mail do cliente antes de enviar o acesso.' });
        }
        const { enviado } = await acesso.enviarLink(cliente);
        return res.status(200).json({
            sucesso: true,
            enviado,
            mensagem: enviado ? `Link enviado para ${cliente.email}.` : 'O envio de e-mail não está configurado no servidor.'
        });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao enviar o acesso do cliente:');
    }
};

const listarClientes = async (req, res) => {
    try {
        // A MÁGICA ESTÁ AQUI: O sub-select (SELECT COUNT(*)...) conta os veículos do cliente!
        const query = `
            SELECT 
                c.id, c.nome, c.cpf, c.telefone, c.endereco, c.email,
                (c.senha IS NOT NULL) AS tem_senha, -- já criou a senha do app
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
    try {
        const nome = validar.nome(req.body.nome);
        const [[atual]] = await db.execute('SELECT cpf FROM clientes WHERE id = ?', [req.params.id]);
        if (!atual) return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        const cpf = validar.cpfNaEdicao(req.body.cpf, atual.cpf);
        const email = validar.email(req.body.email);
        const telefone = validar.telefone(req.body.telefone);
        const endereco = typeof req.body.endereco === 'string' ? req.body.endereco.trim() : '';
        if (endereco.length > 255) throw new ErroNegocio('O endereço pode ter no máximo 255 caracteres.');

        const [resultado] = await db.execute(
            'UPDATE clientes SET nome = ?, cpf = ?, email = ?, telefone = ?, endereco = ? WHERE id = ?',
            [nome, cpf, email, telefone, endereco, req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        }
        return res.status(200).json({ sucesso: true, mensagem: 'Cliente atualizado com sucesso!' });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao atualizar cliente:');
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

module.exports = { cadastrar, listarClientes, atualizarCliente, excluirCliente, enviarAcesso };
