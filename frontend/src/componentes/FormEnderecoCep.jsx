import React, { useId, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { buscarCep, mascaraCep, soDigitos } from '../utils/endereco';
import '../paginas_css/form_endereco_cep.css';

// Formulário de endereço com busca pelo CEP (ViaCEP).
// Controlado: `valor` = { cep, rua, numero, complemento, bairro, cidade, uf } e
// `aoMudar(novoValor)`. Ao digitar os 8 dígitos do CEP, preenche rua, bairro, cidade e UF
// e leva o cursor para o número. `tema`: 'claro' (padrão) ou 'escuro' (tela de cadastro).
export default function FormEnderecoCep({ valor, aoMudar, tema = 'claro', compacto = false, desabilitado = false }) {
  const id = useId();
  const numeroRef = useRef(null);
  const [buscando, setBuscando] = useState(false);
  const [erroCep, setErroCep] = useState(null);

  const mudar = (campo, texto) => {
    let v = texto;
    if (campo === 'cep') v = mascaraCep(texto);
    if (campo === 'uf') v = texto.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    aoMudar({ ...valor, [campo]: v });
    return v;
  };

  const consultar = async (cep = valor.cep) => {
    setErroCep(null);
    setBuscando(true);
    try {
      const achado = await buscarCep(cep);
      aoMudar({
        ...valor,
        cep: mascaraCep(cep),
        rua: achado.rua || valor.rua,
        bairro: achado.bairro || valor.bairro,
        cidade: achado.cidade || valor.cidade,
        uf: achado.uf || valor.uf
      });
      numeroRef.current?.focus();
    } catch (erro) {
      setErroCep(erro.message);
    } finally {
      setBuscando(false);
    }
  };

  const campo = (nome, rotulo, props = {}) => (
    <div className={`fe-campo fe-${nome}`}>
      <label htmlFor={`${id}-${nome}`}>{rotulo}</label>
      <input
        id={`${id}-${nome}`}
        value={valor[nome]}
        onChange={(e) => mudar(nome, e.target.value)}
        disabled={desabilitado}
        {...props}
      />
    </div>
  );

  return (
    <div className={`fe-form fe-tema-${tema}${compacto ? ' fe-compacto' : ''}`}>
      <div className="fe-campo fe-cep">
        <label htmlFor={`${id}-cep`}>CEP</label>
        <div className="fe-cep-linha">
          <input
            id={`${id}-cep`}
            inputMode="numeric"
            placeholder="00000-000"
            value={valor.cep}
            disabled={desabilitado}
            onChange={(e) => {
              const novo = mudar('cep', e.target.value);
              if (soDigitos(novo).length === 8 && soDigitos(novo) !== soDigitos(valor.cep)) consultar(novo);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                consultar();
              }
            }}
          />
          <button type="button" onClick={() => consultar()} disabled={buscando || desabilitado} title="Buscar CEP">
            {buscando ? <Loader2 className="fe-girando" size={16} /> : <Search size={16} />}
          </button>
        </div>
        {erroCep ? (
          <small className="fe-erro">{erroCep}</small>
        ) : (
          <small className="fe-ajuda">
            <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">
              Não sei o CEP
            </a>
          </small>
        )}
      </div>

      {campo('rua', 'Rua / Avenida', { placeholder: 'Preenchido pelo CEP', maxLength: 150 })}
      <div className="fe-campo fe-numero">
        <label htmlFor={`${id}-numero`}>Número</label>
        <input
          id={`${id}-numero`}
          ref={numeroRef}
          value={valor.numero}
          onChange={(e) => mudar('numero', e.target.value)}
          placeholder="Ex: 120"
          maxLength={10}
          disabled={desabilitado}
        />
      </div>
      {campo('complemento', 'Complemento', { placeholder: 'Apto, bloco (opcional)', maxLength: 60 })}
      {campo('bairro', 'Bairro', { maxLength: 100 })}
      {campo('cidade', 'Cidade', { maxLength: 100 })}
      {campo('uf', 'UF', { placeholder: 'SP', maxLength: 2 })}
    </div>
  );
}
