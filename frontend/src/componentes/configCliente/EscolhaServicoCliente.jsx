import React, { useState, useEffect } from 'react';
import { apiFetch, API_URL } from "../../utils/api";

export default function EscolhaServicoCliente({ aoAvancar, aoCancelar }) {
    const [servicos, setServicos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [servicoSelecionado, setServicoSelecionado] = useState(null);

    useEffect(() => {
        async function carregarServicos() {
            try {
                const resposta = await apiFetch(`${API_URL}/api/servicos?ativos=true`);
                const json = await resposta.json();
                
                if (json.sucesso) {
                    setServicos(json.dados);
                } else {
                    setErro(json.mensagem || 'Erro ao carregar os serviços.');
                }
            } catch (e) {
                setErro('Falha de conexão com o servidor.');
            } finally {
                setCarregando(false);
            }
        }
        carregarServicos();
    }, []);

    return (
        /* Fundo escuro translúcido cobrindo a tela (Modal Backdrop) */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            
            {/* Caixa branca centralizada do Pop-up */}
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Cabeçalho do Pop-up */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Qual tipo de lavagem precisa?</h2>
                    <button 
                        onClick={aoCancelar}
                        className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 py-1 rounded-lg"
                    >
                        &times;
                    </button>
                </div>

                {/* Conteúdo rolável caso haja muitos serviços */}
                <div className="p-6 overflow-y-auto flex-1">
                    {carregando && (
                        <div className="flex justify-center items-center py-10">
                            <p className="text-gray-500 animate-pulse">Buscando opções disponíveis...</p>
                        </div>
                    )}
                    
                    {erro && (
                        <p className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">{erro}</p>
                    )}

                    {!carregando && !erro && (
                        <div className="grid grid-cols-1 gap-3">
                            {servicos.map((servico) => {
                                const isSelecionado = servicoSelecionado?.id === servico.id;
                                
                                return (
                                    <div 
                                        key={servico.id}
                                        onClick={() => setServicoSelecionado(servico)}
                                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                                            isSelecionado 
                                            ? 'border-blue-600 bg-blue-50 shadow-md' 
                                            : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-semibold text-base ${isSelecionado ? 'text-blue-800' : 'text-gray-800'}`}>
                                                {servico.nome}
                                            </h3>
                                            <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md text-sm">
                                                {Number(servico.preco_base).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                        
                                        <p className="text-gray-600 text-xs mb-3">
                                            {servico.descricao || 'Sem descrição.'}
                                        </p>
                                        
                                        <div className="text-xs text-gray-500 flex items-center font-medium">
                                            <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Tempo estimado: {servico.duracao_estimada} min
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Rodapé com os botões de ação */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={aoCancelar}
                        className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        disabled={!servicoSelecionado}
                        onClick={() => aoAvancar(servicoSelecionado)}
                        className={`px-6 py-2.5 rounded-lg font-bold text-white transition-colors ${
                            servicoSelecionado 
                            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md' 
                            : 'bg-gray-300 cursor-not-allowed opacity-75'
                        }`}
                    >
                        Próximo
                    </button>
                </div>
            </div>
        </div>
    );
}