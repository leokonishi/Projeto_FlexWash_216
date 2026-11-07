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

const PORTES = ['Pequeno', 'Médio', 'Grande'];
const STATUS_ATIVOS = ['Agendado', 'Aguardando', 'Em Andamento'];

// EDITAR VEÍCULO (PUT /api/veiculos/:veiculo_id) - equipe
exports.atualizarVeiculo = async (req, res) => {
    const { veiculo_id } = req.params;
    const texto = (v) => (typeof v === 'string' ? v.trim() : '');
    const marca = texto(req.body.marca);
    const modelo = texto(req.body.modelo);
    const placa = texto(req.body.placa).toUpperCase();
    const cor = texto(req.body.cor);
    const porte = texto(req.body.porte);

    if (!marca || !modelo || !placa || !cor || !porte) {
        return res.status(400).json({ erro: 'Todos os campos do veículo são obrigatórios.' });
    }
    if (!PORTES.includes(porte)) {
        return res.status(400).json({ erro: 'Porte inválido. Use Pequeno, Médio ou Grande.' });
    }

    try {
        const [resultado] = await db.execute(
            'UPDATE veiculos SET marca = ?, modelo = ?, placa = ?, cor = ?, porte = ? WHERE id = ?',
            [marca, modelo, placa, cor, porte, veiculo_id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }
        res.status(200).json({ mensagem: 'Veículo atualizado com sucesso.' });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Esta placa já está cadastrada em outro veículo.' });
        }
        console.error('Erro ao atualizar veículo:', erro);
        res.status(500).json({ erro: 'Erro ao atualizar o veículo.' });
    }
};

// EXCLUIR VEÍCULO (DELETE /api/veiculos/:veiculo_id)
// - Com serviço agendado ou no pátio: bloqueia.
// - Com histórico: só o administrador apaga, e só com ?incluirHistorico=1 (2ª confirmação no painel).
exports.removerVeiculo = async (req, res) => {
    const { veiculo_id } = req.params;
    const incluirHistorico = req.query.incluirHistorico === '1' || req.query.incluirHistorico === 'true';
    const ehAdmin = req.usuarioLogado?.perfil === 'administrador';
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[veiculo]] = await conn.execute('SELECT id, modelo, placa FROM veiculos WHERE id = ? FOR UPDATE', [veiculo_id]);
        if (!veiculo) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }

        const [[ativos]] = await conn.execute(
            `SELECT COUNT(*) AS total FROM execucoes WHERE veiculo_id = ? AND status IN (${STATUS_ATIVOS.map(() => '?').join(', ')})`,
            [veiculo_id, ...STATUS_ATIVOS]
        );
        if (Number(ativos.total) > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: `O ${veiculo.modelo} (${veiculo.placa}) tem serviço agendado ou no pátio. Finalize ou cancele antes de remover.` });
        }

        const [[historico]] = await conn.execute('SELECT COUNT(*) AS total FROM execucoes WHERE veiculo_id = ?', [veiculo_id]);
        const totalHistorico = Number(historico.total);
        if (totalHistorico > 0) {
            if (!ehAdmin) {
                await conn.rollback();
                return res.status(409).json({ erro: 'Este veículo tem lavagens no histórico. Só o administrador pode removê-lo.' });
            }
            if (!incluirHistorico) {
                await conn.rollback();
                return res.status(409).json({
                    precisaConfirmarHistorico: true,
                    historico: totalHistorico,
                    erro: `Este veículo tem ${totalHistorico} lavagem(ns) no histórico.`
                });
            }
            await conn.execute('DELETE FROM execucoes WHERE veiculo_id = ?', [veiculo_id]);
        }

        await conn.execute('DELETE FROM veiculos WHERE id = ?', [veiculo_id]);
        await conn.commit();
        res.status(200).json({ mensagem: 'Veículo removido com sucesso.' });
    } catch (erro) {
        await conn.rollback().catch(() => {});
        if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ erro: 'Este veículo ainda tem registros ligados a ele e não pode ser removido.' });
        }
        console.error('Erro ao remover veículo:', erro);
        res.status(500).json({ erro: 'Erro ao remover veículo.' });
    } finally {
        conn.release();
    }
};
