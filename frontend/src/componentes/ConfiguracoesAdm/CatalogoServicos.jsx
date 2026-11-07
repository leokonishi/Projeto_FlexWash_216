import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Secao } from '../ui/CabecalhoPagina';
import ModalPasso from '../ui/ModalPasso';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const FORM_VAZIO = { nome: '', descricao: '', precoPequeno: '', precoMedio: '', precoGrande: '', comissao: '' };

// Lista + cadastro de itens do catálogo com preço por porte (pacotes de lavagem e extras).
// `rota`: '/api/pacotes' ou '/api/extras'. `textos`: rótulos da tela para cada tipo.
export default function CatalogoServicos({ abrirAlerta, rota, icone, textos }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null); // null = cadastro novo
  const [salvando, setSalvando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const mudar = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

  // 1. Busca os itens reais do banco de dados
  const buscarItens = async () => {
    try {
      setCarregando(true);
      const res = await apiFetch(`${API_URL}${rota}`);
      if (res.ok) setItens(await res.json());
    } catch (erro) {
      console.error(`Erro ao buscar ${rota}:`, erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarItens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rota]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (item) => {
    setEditandoId(item.id);
    setForm({
      nome: item.nome || '',
      descricao: item.descricao || '',
      precoPequeno: String(Number(item.preco_pequeno ?? 0)),
      precoMedio: String(Number(item.preco_medio ?? 0)),
      precoGrande: String(Number(item.preco_grande ?? 0)),
      comissao: String(Number(item.comissao_porcentagem ?? 0)),
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  // 2. Salva um item novo (POST) ou editado (PUT)
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (salvando) return;
    const { nome, descricao, precoPequeno, precoMedio, precoGrande, comissao } = form;
    if (!nome.trim() || precoPequeno === '' || precoMedio === '' || precoGrande === '') {
      abrirAlerta('Atenção', 'Preencha o nome e os preços para os 3 portes.', () => {}, 'aviso');
      return;
    }

    const novoItem = {
      nome,
      descricao,
      preco_pequeno: Number(precoPequeno),
      preco_medio: Number(precoMedio),
      preco_grande: Number(precoGrande),
      comissao_porcentagem: Number(comissao || 0)
    };

    const editando = editandoId !== null;
    setSalvando(true);
    try {
      const res = await apiFetch(editando ? `${API_URL}${rota}/${editandoId}` : `${API_URL}${rota}`, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoItem)
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        abrirAlerta('Sucesso', editando ? textos.sucessoEdicao : textos.sucesso, () => {}, 'aviso');
        fecharModal();
        buscarItens(); // Atualiza a lista na tela
      } else {
        abrirAlerta('Atenção', json.erro || 'Não foi possível salvar.', () => {}, 'perigo');
      }
    } catch {
      abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    } finally {
      setSalvando(false);
    }
  };

  // 3. Exclui um item
  const handleExcluir = (id, nomeItem) => {
    abrirAlerta(
      textos.tituloExcluir,
      `Deseja excluir "${nomeItem}"? Ele deixa de aparecer nas novas lavagens e nos agendamentos.`,
      async () => {
        try {
          const res = await apiFetch(`${API_URL}${rota}/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setItens(prev => prev.filter(i => i.id !== id));
          } else {
            const json = await res.json().catch(() => ({}));
            abrirAlerta('Não foi possível excluir', json.erro || 'Erro ao excluir.', () => {}, 'perigo');
          }
        } catch {
          abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
        }
      },
      'perigo'
    );
  };

  return (
    <Secao
      titulo={textos.titulo}
      subtitulo={textos.subtitulo}
      icone={icone}
      acoes={<button onClick={abrirNovo} className="fw-btn-contorno h-9 px-3"><Plus size={16} /> {textos.botaoNovo}</button>}
    >
      {carregando ? (
        <div className="space-y-3">{[0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-tinta-100" />)}</div>
      ) : itens.length === 0 ? (
        <p className="py-8 text-center text-sm text-tinta-500">{textos.vazio}</p>
      ) : (
        <ul className="space-y-3">
          {itens.map(item => (
            <li key={item.id} className="rounded-2xl border border-tinta-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-tinta-950">{item.nome}</p>
                  <p className="mt-0.5 text-sm text-tinta-500">{item.descricao || 'Sem descrição.'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => abrirEdicao(item)} className="grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Editar" aria-label={`Editar ${item.nome}`}><Edit2 size={15} /></button>
                  <button onClick={() => handleExcluir(item.id, item.nome)} className="fw-btn-perigo" title="Excluir" aria-label={`Excluir ${item.nome}`}><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['Pequeno', item.preco_pequeno], ['Médio', item.preco_medio], ['Grande', item.preco_grande]].map(([porte, preco]) => (
                  <div key={porte} className="rounded-xl bg-tinta-50 px-2 py-2 text-center ring-1 ring-tinta-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta-400">{porte}</p>
                    <p className="text-sm font-bold text-verde-700">{moeda(preco)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-tinta-500">
                Comissão da equipe: <span className="font-semibold text-ouro-600">{Number(item.comissao_porcentagem)}%</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <ModalPasso
          titulo={editandoId !== null ? textos.tituloEditar : textos.tituloModal}
          subtitulo={editandoId !== null ? 'O novo preço vale para as próximas entradas; serviços já registrados mantêm o valor.' : undefined}
          aoFechar={fecharModal}
          rodape={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={fecharModal} className="fw-btn-contorno">Cancelar</button>
              <button type="submit" form={`form-${rota}`} className="fw-btn-primario" disabled={salvando}><Check size={17} /> {salvando ? 'Salvando...' : editandoId !== null ? 'Salvar alterações' : 'Salvar'}</button>
            </div>
          }
        >
          <form id={`form-${rota}`} onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="fw-label">Nome</label>
              <input className="fw-input" type="text" value={form.nome} onChange={mudar('nome')} required placeholder={textos.exemploNome} />
            </div>
            <div>
              <label className="fw-label">Descrição <span className="font-normal text-tinta-400">(opcional)</span></label>
              <input className="fw-input" type="text" value={form.descricao} onChange={mudar('descricao')} />
            </div>

            <div>
              <span className="fw-label">Preço por porte (R$)</span>
              <div className="grid grid-cols-3 gap-2">
                {[['precoPequeno', 'Pequeno'], ['precoMedio', 'Médio'], ['precoGrande', 'Grande']].map(([campo, rotulo]) => (
                  <div key={campo}>
                    <input className="fw-input text-center" type="number" step="0.01" min="0" inputMode="decimal" value={form[campo]} onChange={mudar(campo)} required aria-label={`Preço ${rotulo}`} placeholder="0,00" />
                    <p className="mt-1 text-center text-xs text-tinta-500">{rotulo}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="fw-label">Comissão da equipe (%)</label>
              <input className="fw-input" type="number" step="0.1" min="0" value={form.comissao} onChange={mudar('comissao')} placeholder="Ex: 5" />
            </div>
          </form>
        </ModalPasso>
      )}
    </Secao>
  );
}
