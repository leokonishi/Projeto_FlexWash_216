import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, MapPin } from 'lucide-react';
import { aplicarMascaraCPF, aplicarMascaraTelefone } from '../utils/mascaras'; // Importando as máscaras reutilizáveis!
import FormEnderecoCep from '../componentes/FormEnderecoCep';
import LayoutAcesso from '../componentes/ui/LayoutAcesso';
import { ENDERECO_VAZIO, enderecoCompleto, enderecoVazio, partesParaApi } from '../utils/endereco';

export default function CadastroCliente() {
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({
    cpf: '',
    nome: '',
    email: '',
    senha: '',
    telefone: ''
  });
  // Endereço (opcional no cadastro, usado no leva e traz), com busca pelo CEP
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
  const [mostrarEndereco, setMostrarEndereco] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Aplica as máscaras em tempo real
  const aoMudarCampo = (e) => {
    let { name, value } = e.target;

    if (name === 'cpf') value = aplicarMascaraCPF(value);
    if (name === 'telefone') value = aplicarMascaraTelefone(value);

    setFormulario({ ...formulario, [name]: value });
  };

  const aoEnviarFormulario = async (e) => {
    e.preventDefault();
    setErro(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    // Endereço é opcional, mas se começou a preencher, precisa estar completo
    if (!enderecoVazio(endereco) && !enderecoCompleto(endereco)) {
      setErro('Complete o endereço (CEP, rua, número, bairro, cidade e UF) ou deixe todos os campos em branco.');
      return;
    }
    const dados = { ...formulario, ...(enderecoCompleto(endereco) ? { endereco_partes: partesParaApi(endereco) } : {}) };

    setEnviando(true);
    try {
      const resposta = await fetch(`${API_URL}/api/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        navigate('/login', { state: { cadastrado: true } });
      } else {
        // E-mail ou CPF já existente: mostra a mensagem do backend
        setErro(resultado.erro || 'Erro ao realizar cadastro.');
      }
    } catch (erro) {
      console.error('Erro na conexão com o servidor:', erro);
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const campo = (name, rotulo, { wrapper = '', ...props } = {}) => (
    <div className={wrapper}>
      <label htmlFor={`cad-${name}`} className="fw-label">{rotulo}</label>
      <input
        id={`cad-${name}`}
        name={name}
        required
        className="fw-input"
        value={formulario[name]}
        onChange={aoMudarCampo}
        {...props}
      />
    </div>
  );

  return (
    <LayoutAcesso
      titulo="Crie sua conta"
      subtitulo="Leva menos de um minuto. Depois é só agendar."
      rodape={<>Já tem uma conta? <Link to="/login" className="font-semibold text-marca-600 hover:text-marca-700">Entrar</Link></>}
    >
      <form onSubmit={aoEnviarFormulario} className="grid grid-cols-2 gap-4">
        {erro && <div className="fw-alerta-erro col-span-2" role="alert">{erro}</div>}

        {campo('nome', 'Nome completo', { placeholder: 'Como podemos te chamar?', autoComplete: 'name', wrapper: 'col-span-2' })}
        {campo('cpf', 'CPF', { placeholder: '000.000.000-00', inputMode: 'numeric', wrapper: 'col-span-2 sm:col-span-1' })}
        {campo('telefone', 'WhatsApp', { placeholder: '(11) 99999-9999', inputMode: 'tel', autoComplete: 'tel', wrapper: 'col-span-2 sm:col-span-1' })}
        {campo('email', 'E-mail', { type: 'email', placeholder: 'seu.email@exemplo.com', autoComplete: 'email', wrapper: 'col-span-2' })}
        {campo('senha', 'Senha', { type: 'password', placeholder: 'Crie uma senha', autoComplete: 'new-password', wrapper: 'col-span-2' })}

        {/* Endereço (para o leva e traz): opcional, com busca pelo CEP */}
        <div className="col-span-2 rounded-2xl border border-dashed border-tinta-200 bg-tinta-50/60 p-4">
          {mostrarEndereco ? (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-tinta-800">
                <MapPin size={16} className="text-marca-600" /> Endereço para o leva e traz
                <span className="font-normal text-tinta-400">(opcional)</span>
              </p>
              <FormEnderecoCep valor={endereco} aoMudar={setEndereco} />
            </>
          ) : (
            <button type="button" onClick={() => setMostrarEndereco(true)} className="flex w-full items-center gap-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600"><MapPin size={18} /></span>
              <span>
                <span className="block text-sm font-semibold text-tinta-800">Adicionar endereço</span>
                <span className="block text-xs text-tinta-500">Opcional. Usado quando buscamos o carro na sua casa.</span>
              </span>
            </button>
          )}
        </div>

        <button type="submit" disabled={enviando} className="fw-btn-primario col-span-2 mt-1 h-12 w-full text-[15px]">
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <>Criar conta <ArrowRight size={18} /></>}
        </button>
      </form>
    </LayoutAcesso>
  );
}
