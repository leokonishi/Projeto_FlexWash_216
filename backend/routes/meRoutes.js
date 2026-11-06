// Rotas da área do cliente: o id do cliente vem SEMPRE do token (req.usuarioLogado.id),
// nunca da URL, então um cliente não consegue ler nem alterar dados de outro.
// O acesso (só perfil 'cliente') é aplicado no server.js, em /api/me.
const express = require('express');
const router = express.Router();
const db = require('../bd');
const { normalizarPorte } = require('../services/precoExecucao');
const { montarEndereco, validarPartes } = require('../services/mapa');
const { ErroNegocio } = require('../services/erros');

// Valores do enum veiculos.porte
const PORTE_DO_BANCO = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };

const idDoCliente = (req) => req.usuarioLogado.id;

// 1. DADOS DO PRÓPRIO CLIENTE
router.get('/me', async (req, res) => {
    try {
        const [linhas] = await db.execute(
            'SELECT id, nome, email, telefone, endereco FROM clientes WHERE id = ?',
            [idDoCliente(req)]
        );
        if (linhas.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        res.status(200).json(linhas[0]);
    } catch (erro) {
        console.error('Erro ao buscar dados do cliente:', erro);
        res.status(500).json({ erro: 'Erro ao buscar os seus dados.' });
    }
});

// 2. ATUALIZAR O ENDEREÇO (usado no leva e traz)
// Formulário com CEP: o corpo traz `endereco_partes` ({ cep, rua, numero, complemento,
// bairro, cidade, uf }) e o texto é montado aqui, no formato que o mapa sabe separar.
// Sem as partes, aceita o texto livre antigo em `endereco`.
router.put('/me/endereco', async (req, res) => {
    let endereco;
    try {
        endereco = req.body?.endereco_partes
            ? montarEndereco(validarPartes(req.body.endereco_partes))
            : (typeof req.body?.endereco === 'string' ? req.body.endereco.trim() : '');
    } catch (erro) {
        if (erro instanceof ErroNegocio) return res.status(erro.status).json({ erro: erro.message });
        throw erro;
    }

    if (!endereco) return res.status(400).json({ erro: 'Informe o endereço.' });
    if (endereco.length > 255) return res.status(400).json({ erro: 'O endereço pode ter no máximo 255 caracteres.' });

    try {
        await db.execute('UPDATE clientes SET endereco = ? WHERE id = ?', [endereco, idDoCliente(req)]);
        res.status(200).json({ mensagem: 'Endereço atualizado com sucesso!', endereco });
    } catch (erro) {
        console.error('Erro ao atualizar endereço:', erro);
        res.status(500).json({ erro: 'Erro ao atualizar o endereço.' });
    }
});

// 3. VEÍCULOS DO PRÓPRIO CLIENTE
router.get('/me/veiculos', async (req, res) => {
    try {
        const [veiculos] = await db.execute(
            'SELECT id, marca, modelo, placa, cor, porte FROM veiculos WHERE cliente_id = ? ORDER BY created_at DESC',
            [idDoCliente(req)]
        );
        res.status(200).json(veiculos);
    } catch (erro) {
        console.error('Erro ao buscar veículos do cliente:', erro);
        res.status(500).json({ erro: 'Erro ao buscar os seus veículos.' });
    }
});

router.post('/me/veiculos', async (req, res) => {
    const texto = (campo) => (typeof req.body?.[campo] === 'string' ? req.body[campo].trim() : '');
    const marca = texto('marca');
    const modelo = texto('modelo');
    const cor = texto('cor');
    const placa = texto('placa').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const porte = PORTE_DO_BANCO[normalizarPorte(req.body?.porte)];

    if (!marca || !modelo || !cor || !placa) {
        return res.status(400).json({ erro: 'Preencha marca, modelo, placa e cor.' });
    }
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) {
        return res.status(400).json({ erro: 'Placa inválida. Use o formato ABC1234 ou ABC1D23.' });
    }
    if (!porte) return res.status(400).json({ erro: 'Escolha o porte do veículo.' });

    try {
        const [resultado] = await db.execute(
            'INSERT INTO veiculos (cliente_id, marca, modelo, placa, cor, porte) VALUES (?, ?, ?, ?, ?, ?)',
            [idDoCliente(req), marca, modelo, placa, cor, porte]
        );
        res.status(201).json({
            mensagem: 'Veículo cadastrado com sucesso!',
            veiculo: { id: resultado.insertId, marca, modelo, placa, cor, porte }
        });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Esta placa já está cadastrada no sistema.' });
        }
        console.error('Erro ao cadastrar veículo do cliente:', erro);
        res.status(500).json({ erro: 'Erro ao cadastrar o veículo.' });
    }
});

router.delete('/me/veiculos/:veiculo_id', async (req, res) => {
    try {
        // O "AND cliente_id = ?" garante que só o dono apaga o veículo
        const [resultado] = await db.execute(
            'DELETE FROM veiculos WHERE id = ? AND cliente_id = ?',
            [req.params.veiculo_id, idDoCliente(req)]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado na sua conta.' });
        }
        res.status(200).json({ mensagem: 'Veículo removido com sucesso.' });
    } catch (erro) {
        // execucoes.veiculo_id aponta para o veículo: com histórico, o banco não deixa apagar
        if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ erro: 'Este veículo já tem serviços no histórico e não pode ser removido.' });
        }
        console.error('Erro ao remover veículo do cliente:', erro);
        res.status(500).json({ erro: 'Erro ao remover o veículo.' });
    }
});

module.exports = router;
