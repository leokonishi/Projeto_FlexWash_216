const bcrypt = require('bcrypt');
const db = require('../bd');
const { montarEndereco, validarPartes } = require('../services/mapa');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const validar = require('../services/validacao');
const { ErroNegocio } = require('../services/erros');
const acesso = require('../services/acessoCliente');
const { cadastroPublico } = require('../services/limitePorIp');
const { perfilAtual, esquecerUsuario } = require('../middleware/auth');

// Quem está cadastrando: a própria pessoa (rota pública, sem token) ou a equipe (balcão/painel)
async function cadastroPelaEquipe(req) {
    const [esquema, token] = String(req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) return false;
    try {
        const { perfil, id } = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (perfil !== 'funcionario' && perfil !== 'administrador') return false;
        const atual = await perfilAtual(perfil, id); // funcionário excluído não conta como equipe
        return atual === 'funcionario' || atual === 'administrador';
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
        const msg = erro.clienteInativo
            ? `Este ${campo} é de um cliente inativo. Reative o cadastro na aba "Inativos".`
            : `Já existe um cliente com este ${campo}.`;
        return res.status(409).json({ sucesso: false, mensagem: msg, erro: msg });
    }
    console.error(contexto, erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar o cliente.', erro: 'Erro ao salvar o cliente.' });
};

// O CPF/e-mail repetido é de um cliente inativado? (para a mensagem indicar "reative")
async function duplicadoInativo(corpo) {
    const cpf = String(corpo.cpf || '').replace(/\D/g, '');
    const email = String(corpo.email || '').trim().toLowerCase();
    const [[linha]] = await db.execute(
        "SELECT ativo FROM clientes WHERE (REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? AND ? <> '') OR (email = ? AND ? <> '') LIMIT 1",
        [cpf, cpf, email, email]
    );
    return Boolean(linha && !linha.ativo);
}

// CADASTRAR CLIENTE (POST /api/clientes)
// - Pela própria pessoa (app): e-mail, telefone e senha obrigatórios.
// - Pela equipe: e-mail opcional e SEM senha. O cliente cria a senha depois, no "Primeiro acesso".
//   (Nada de senha padrão: antes era "123" e qualquer um entrava na conta.)
const cadastrar = async (req, res) => {
    const pelaEquipe = await cadastroPelaEquipe(req);
    // Auto-cadastro (sem login da equipe): limite por aparelho contra cadastros em massa
    if (!pelaEquipe) {
        const minutos = cadastroPublico.consumir(req.ip);
        if (minutos) {
            const mensagem = `Muitos cadastros seguidos deste aparelho. Tente de novo em ${minutos} min.`;
            return res.status(429).json({ sucesso: false, mensagem, erro: mensagem });
        }
    }
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
        if (erro.code === 'ER_DUP_ENTRY') erro.clienteInativo = await duplicadoInativo(req.body).catch(() => false);
        return responderErro(res, erro, 'Erro ao cadastrar cliente:');
    }
};

// REENVIAR O LINK DE ACESSO (POST /api/clientes/:id/acesso) - equipe
// Para o cliente de balcão que não recebeu o e-mail, ou que esqueceu a senha.
const enviarAcesso = async (req, res) => {
    try {
        const [[cliente]] = await db.execute('SELECT id, nome, email, senha, ativo FROM clientes WHERE id = ?', [req.params.id]);
        if (!cliente) return res.status(404).json({ sucesso: false, erro: 'Cliente não encontrado.' });
        if (!cliente.ativo) return res.status(409).json({ sucesso: false, erro: 'Este cliente está inativo. Reative o cadastro antes.' });
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

// ?inativos=1 lista só os inativados (aba "Inativos"); sem ele, só os ativos
const listarClientes = async (req, res) => {
    const inativos = req.query.inativos === '1' && req.usuarioLogado?.perfil === 'administrador';
    try {
        // A MÁGICA ESTÁ AQUI: O sub-select (SELECT COUNT(*)...) conta os veículos do cliente!
        const query = `
            SELECT 
                c.id, c.nome, c.cpf, c.telefone, c.endereco, c.email, c.ativo, c.inativado_em,
                (SELECT COUNT(*) FROM execucoes e WHERE e.cliente_id = c.id) AS lavagens,
                (c.cpf IS NULL AND c.nome = 'Cliente removido') AS dados_apagados, -- LGPD
                (c.senha IS NOT NULL) AS tem_senha, -- já criou a senha do app
                (SELECT COUNT(*) FROM veiculos v WHERE v.cliente_id = c.id) AS frota,
                (SELECT GROUP_CONCAT(v.placa SEPARATOR ',') FROM veiculos v WHERE v.cliente_id = c.id) AS placas
            FROM clientes c 
            WHERE c.ativo = ?
            ORDER BY c.nome ASC
        `;
        const [clientes] = await db.execute(query, [inativos ? 0 : 1]);
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

// Serviço agendado ou no pátio impede excluir/inativar/anonimizar
async function exigirSemServicoAberto(conn, cliente) {
    const [[ativos]] = await conn.execute(
        `SELECT COUNT(*) AS total FROM execucoes WHERE cliente_id = ? AND status IN (${MARCADORES_ATIVOS})`,
        [cliente.id, ...STATUS_ATIVOS]
    );
    if (Number(ativos.total) > 0) {
        throw new ErroNegocio(
            `${cliente.nome} tem ${ativos.total} serviço(s) agendado(s) ou no pátio. Finalize ou cancele antes.`, 409
        );
    }
}

const ehAdmin = (req) => req.usuarioLogado?.perfil === 'administrador';

// EXCLUIR CLIENTE (DELETE /api/clientes/:id) - só administrador
// - Com serviço agendado ou no pátio: bloqueia (cancele/finalize antes).
// - Com histórico de lavagens: INATIVA. O cliente some das listas e não entra mais no app,
//   mas as lavagens continuam no histórico e nos relatórios. Dá para reativar depois.
// - Sem histórico: apaga de vez (veículos, endereços e agendamentos saem pelo ON DELETE CASCADE).
const excluirCliente = async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[cliente]] = await conn.execute('SELECT id, nome, ativo FROM clientes WHERE id = ? FOR UPDATE', [id]);
        if (!cliente) throw new ErroNegocio('Cliente não encontrado.', 404);
        await exigirSemServicoAberto(conn, cliente);

        const [[historico]] = await conn.execute('SELECT COUNT(*) AS total FROM execucoes WHERE cliente_id = ?', [id]);
        const totalHistorico = Number(historico.total);
        let inativado = false;
        if (totalHistorico > 0) {
            if (!cliente.ativo) throw new ErroNegocio('Este cliente já está inativo.', 409);
            await conn.execute('UPDATE clientes SET ativo = 0, inativado_em = NOW() WHERE id = ?', [id]);
            inativado = true;
        } else {
            await conn.execute('DELETE FROM clientes WHERE id = ?', [id]);
        }
        await conn.commit();
        esquecerUsuario('cliente', id);

        return res.status(200).json({
            sucesso: true,
            inativado,
            mensagem: inativado
                ? `${cliente.nome} foi inativado. O histórico de lavagens continua nos relatórios.`
                : 'Cliente excluído.'
        });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ sucesso: false, erro: 'O cliente ainda tem registros ligados a ele e não pode ser excluído.' });
        }
        return responderErro(res, erro, 'Erro ao excluir cliente:');
    } finally {
        conn.release();
    }
};

// REATIVAR CLIENTE (POST /api/clientes/:id/reativar) - só administrador
const reativarCliente = async (req, res) => {
    if (!ehAdmin(req)) return res.status(403).json({ sucesso: false, erro: 'Apenas o administrador pode reativar clientes.' });
    try {
        const [[cliente]] = await db.execute('SELECT nome, cpf, ativo FROM clientes WHERE id = ?', [req.params.id]);
        if (!cliente || cliente.ativo) return res.status(404).json({ sucesso: false, erro: 'Cliente inativo não encontrado.' });
        if (!cliente.cpf && cliente.nome === NOME_ANONIMO) {
            return res.status(409).json({ sucesso: false, erro: 'Os dados deste cliente foram apagados (LGPD). Faça um novo cadastro.' });
        }
        await db.execute('UPDATE clientes SET ativo = 1, inativado_em = NULL WHERE id = ?', [req.params.id]);
        esquecerUsuario('cliente', req.params.id);
        return res.status(200).json({ sucesso: true, mensagem: `${cliente.nome} foi reativado.` });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao reativar cliente:');
    }
};

// APAGAR DADOS PESSOAIS (POST /api/clientes/:id/anonimizar) - só administrador
// Pedido do cliente pela LGPD: tira nome, CPF, contatos, endereços e placas, mas mantém as
// lavagens (valores, datas, pacotes) para os relatórios e as comissões não mudarem.
const NOME_ANONIMO = 'Cliente removido';
const anonimizarCliente = async (req, res) => {
    if (!ehAdmin(req)) return res.status(403).json({ sucesso: false, erro: 'Apenas o administrador pode apagar dados pessoais.' });
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[cliente]] = await conn.execute('SELECT id, nome FROM clientes WHERE id = ? FOR UPDATE', [id]);
        if (!cliente) throw new ErroNegocio('Cliente não encontrado.', 404);
        await exigirSemServicoAberto(conn, cliente);

        await conn.execute(
            `UPDATE clientes SET nome = ?, cpf = NULL, email = NULL, telefone = NULL, senha = NULL, endereco = '',
                    ativo = 0, inativado_em = COALESCE(inativado_em, NOW())
             WHERE id = ?`,
            [NOME_ANONIMO, id]
        );
        // Placa identifica a pessoa: troca por um código interno (a coluna é única)
        await conn.execute("UPDATE veiculos SET placa = CONCAT('#', id) WHERE cliente_id = ?", [id]);
        await conn.execute('DELETE FROM enderecos_clientes WHERE cliente_id = ?', [id]);
        await conn.execute('UPDATE agendamentos SET endereco_busca = NULL WHERE cliente_id = ?', [id]);
        await conn.commit();
        esquecerUsuario('cliente', id);
        return res.status(200).json({ sucesso: true, mensagem: 'Dados pessoais apagados. As lavagens continuam no histórico como "Cliente removido".' });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        return responderErro(res, erro, 'Erro ao apagar os dados do cliente:');
    } finally {
        conn.release();
    }
};

module.exports = { cadastrar, listarClientes, atualizarCliente, excluirCliente, enviarAcesso, reativarCliente, anonimizarCliente };
