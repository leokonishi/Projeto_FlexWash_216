// Data de hoje no fuso do navegador (toISOString usaria UTC e, à noite, já mostraria o dia seguinte)
export const hojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// AAAA-MM-DD -> DD/MM/AAAA
export const formatarDataBr = (dataIso) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
};
