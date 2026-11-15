import { useEffect, useState } from 'react';

const cache = new Map(); // código da marca -> lista de nomes de modelo

// Modelos da marca escolhida, da Tabela FIPE, para sugerir no campo "Modelo".
// O campo continua livre: se a FIPE estiver fora do ar, só não aparecem sugestões.
export function useModelosFipe(listaMarcas, marcaNome) {
  const [modelos, setModelos] = useState([]);
  const codigo = listaMarcas.find((m) => m.nome === marcaNome)?.codigo;

  useEffect(() => {
    if (!codigo) { setModelos([]); return; }
    if (cache.has(codigo)) { setModelos(cache.get(codigo)); return; }
    let ativo = true;
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${codigo}/modelos`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const nomes = [...new Set((json?.modelos || []).map((m) => m.nome))];
        cache.set(codigo, nomes);
        if (ativo) setModelos(nomes);
      })
      .catch(() => ativo && setModelos([]));
    return () => { ativo = false; };
  }, [codigo]);

  return modelos;
}
