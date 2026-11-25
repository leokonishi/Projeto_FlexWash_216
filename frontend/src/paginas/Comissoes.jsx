import React, { useEffect, useState } from 'react';
import { BadgeDollarSign, AlertTriangle, ListChecks, Pencil, Users } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import ModalEquipe from '../componentes/ModalEquipe';
import { apiFetch, API_URL } from '../utils/api';
import { obterPerfil } from '../utils/sessao';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Hoje e o dia 1 do mês no fuso do navegador (o lava-rápido e a equipe estão no mesmo fuso)
function periodoDoMes() {
  const hoje = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fim = `${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}`;
  return { inicio: `${fim.slice(0, 7)}-01`, fim };
}

// Administrador: comissão de cada pessoa da equipe no período + serviços sem equipe.
// Funcionário: o próprio extrato.
export default function Comissoes({ abrirAlerta }) {
  const ehAdmin = obterPerfil() === 'administrador';
  const [periodo, setPeriodo] = useState(periodoDoMes);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // serviço com a equipe sendo corrigida

  const buscar = async () => {
    setCarregando(true);
    try {
      const rota = ehAdmin ? 'admin/comissoes' : 'funcionario/comissoes';
      const res = await apiFetch(`${API_URL}/api/${rota}?inicio=${periodo.inicio}&fim=${periodo.fim}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        abrirAlerta?.('Atenção', json.erro || 'Não foi possível carregar as comissões.', () => {}, 'erro');
        return;
      }
      setDados(json);
    } catch {
      abrirAlerta?.('Erro', 'Falha ao conectar com o servidor.', () => {}, 'erro');
    } finally {
      setCarregando(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- busca de novo só quando o período muda
  useEffect(() => { buscar(); }, [periodo.inicio, periodo.fim]);

  const salvarEquipe = async (ids) => {
    const servico = editando;
    setEditando(null);
    const res = await apiFetch(`${API_URL}/api/execucoes/${servico.id}/equipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcionarios: ids })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      abrirAlerta?.('Não foi possível salvar', json.erro || 'Erro ao salvar a equipe.', () => {}, 'erro');
    }
    buscar();
  };

  const filtroPeriodo = (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-tinta-500">
        De
        <input type="date" className="fw-input mt-1 h-10" value={periodo.inicio} max={periodo.fim}
          onChange={(e) => e.target.value && setPeriodo((p) => ({ ...p, inicio: e.target.value }))} />
      </label>
      <label className="text-xs font-semibold text-tinta-500">
        Até
        <input type="date" className="fw-input mt-1 h-10" value={periodo.fim} min={periodo.inicio}
          onChange={(e) => e.target.value && setPeriodo((p) => ({ ...p, fim: e.target.value }))} />
      </label>
    </div>
  );

  const semDados = !carregando && dados && (ehAdmin ? dados.servicos.length === 0 : dados.servicos.length === 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CabecalhoPagina
        titulo={ehAdmin ? 'Comissões' : 'Minhas comissões'}
        subtitulo={ehAdmin
          ? 'Quanto cada pessoa da equipe tem a receber pelos carros finalizados no período. A comissão de cada carro é dividida entre quem lavou.'
          : 'Sua parte da comissão em cada carro finalizado no período.'}
      >
        {filtroPeriodo}
      </CabecalhoPagina>

      {carregando && !dados ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-tinta-100" />)}</div>
      ) : !dados ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-2xl">
            <div className="fw-card p-4 sm:p-5">
              <p className="text-sm font-semibold text-tinta-500">{ehAdmin ? 'Total de comissões' : 'Você tem a receber'}</p>
              <p className="mt-1 truncate font-display text-2xl font-extrabold text-verde-700 sm:text-3xl">
                {moeda(ehAdmin ? dados.total_comissoes : dados.total_comissao)}
              </p>
            </div>
            <div className="fw-card p-4 sm:p-5">
              <p className="text-sm font-semibold text-tinta-500">Carros finalizados</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-tinta-950 sm:text-3xl">{dados.servicos.length}</p>
            </div>
          </div>

          {ehAdmin && dados.sem_equipe.servicos > 0 && (
            <div className="flex items-start gap-3 rounded-2xl bg-ouro-50 p-4 text-sm text-ouro-800 ring-1 ring-ouro-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                <strong>{dados.sem_equipe.servicos} {dados.sem_equipe.servicos === 1 ? 'carro' : 'carros'} sem equipe</strong> no período, somando {moeda(dados.sem_equipe.comissao)} de comissão
                que ninguém recebe. Use o lápis na lista abaixo para dizer quem lavou.
              </p>
            </div>
          )}

          {ehAdmin && (
            <Secao titulo="Por funcionário" icone={BadgeDollarSign} semPadding>
              {dados.funcionarios.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-tinta-500">Nenhuma comissão no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="fw-tabela">
                    <thead>
                      <tr><th>Funcionário</th><th className="text-right">Carros</th><th className="text-right">A receber</th></tr>
                    </thead>
                    <tbody>
                      {dados.funcionarios.map((f) => (
                        <tr key={f.funcionario_id}>
                          <td className="font-semibold text-tinta-900">{f.nome}</td>
                          <td className="text-right">{f.servicos}</td>
                          <td className="text-right font-semibold text-verde-700">{moeda(f.total_comissao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Secao>
          )}

          <Secao titulo="Carros finalizados no período" icone={ListChecks} semPadding>
            {semDados ? (
              <p className="px-5 py-10 text-center text-sm text-tinta-500">Nenhum carro finalizado no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="fw-tabela">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Veículo</th>
                      <th>Serviço</th>
                      <th>Equipe</th>
                      {ehAdmin && <th className="text-right">Serviços</th>}
                      <th className="text-right">{ehAdmin ? 'Comissão' : 'Sua parte'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.servicos.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap">{dataBR(s.dia)}</td>
                        <td>
                          <p className="whitespace-nowrap font-semibold text-tinta-900">{s.veiculo}</p>
                          <span className="fw-placa text-xs">{s.placa}</span>
                        </td>
                        <td className="text-sm">{s.servico || 'Serviço avulso'}</td>
                        <td className="text-xs text-tinta-600">
                          {ehAdmin ? (
                            <span className="flex items-center gap-1.5">
                              {s.equipe.length ? s.equipe.map((f) => f.nome).join(', ') : <span className="font-semibold text-ouro-700">Sem equipe</span>}
                              <button onClick={() => setEditando(s)} className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Corrigir equipe" aria-label="Corrigir equipe">
                                <Pencil size={13} />
                              </button>
                            </span>
                          ) : s.equipe.join(', ')}
                        </td>
                        {ehAdmin && <td className="whitespace-nowrap text-right">{moeda(s.valor_servicos)}</td>}
                        <td className="whitespace-nowrap text-right font-semibold text-tinta-900">
                          {moeda(ehAdmin ? s.comissao_total : s.comissao)}
                          {ehAdmin && s.equipe.length > 1 && (
                            <p className="text-[11px] font-normal text-tinta-400">{moeda(s.comissao_por_pessoa)} cada</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <p className="flex items-center gap-2 text-xs text-tinta-400">
            <Users size={13} /> A taxa do leva e traz não entra na comissão. Com cupom, a comissão cai na mesma proporção do desconto.
          </p>
        </>
      )}

      {editando && (
        <ModalEquipe
          titulo="Corrigir equipe"
          descricao={`${editando.veiculo} · ${editando.placa} · ${dataBR(editando.dia)}`}
          selecionadosIniciais={editando.equipe.map((f) => f.id)}
          textoConfirmar="Salvar equipe"
          aoFechar={() => setEditando(null)}
          aoConfirmar={salvarEquipe}
        />
      )}
    </div>
  );
}
