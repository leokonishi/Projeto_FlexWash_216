const db = require('../bd');

exports.adicionarVeiculo = async (req, res) => {
    const { cliente_id } = req.params;
    const { marca, modelo, placa, cor, porte } = req.body;

    if (!marca || !modelo || !placa || !cor || !porte) {
        return res.status(400).json({ erro: 'Todos os campos do veículo são obrigatórios.' });
    }

    try {
        const query = 'INSERT INTO veiculos (cliente_id, marca, modelo, placa, cor, porte) VALUES (?, ?, ?, ?, ?, ?)';
        const [resultado] = await db.execute(query, [cliente_id, marca, modelo, placa, cor, porte]);
        
        res.status(201).json({ mensagem: 'Veículo atrelado com sucesso!', veiculoId: resultado.insertId });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Esta placa já está cadastrada no sistema.' });
        }
        res.status(500).json({ erro: 'Erro ao cadastrar veículo.' });
    }
};

exports.listarVeiculosDoCliente = async (req, res) => {
    const { cliente_id } = req.params;
    try {
        const query = 'SELECT * FROM veiculos WHERE cliente_id = ? ORDER BY created_at DESC';
        const [veiculos] = await db.execute(query, [cliente_id]);
        res.status(200).json(veiculos);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar a frota.' });
    }
};

exports.removerVeiculo = async (req, res) => {
    const { veiculo_id } = req.params;
    try {
        await db.execute('DELETE FROM veiculos WHERE id = ?', [veiculo_id]);
        res.status(200).json({ mensagem: 'Veículo removido com sucesso.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao remover veículo.' });
    }
};