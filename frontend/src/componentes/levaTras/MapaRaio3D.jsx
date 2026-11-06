import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, Map as MapaIcone, LocateFixed } from 'lucide-react';

// Mapa 3D interativo do raio do leva e traz.
// - Mapa: MapLibre GL com o estilo gratuito do OpenFreeMap (dados do OpenStreetMap, sem chave).
// - Mostra o lava-rápido (marcador que pode ser arrastado para ajustar o ponto) e a área
//   atendida: um círculo com o raio em km, com uma "parede" em 3D na borda.
// - Arraste para mover, Ctrl/botão direito para girar e inclinar, roda do mouse para zoom.
const ESTILO_MAPA = import.meta.env.VITE_MAPA_ESTILO_URL || 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_PADRAO = [-46.6333, -23.5505]; // São Paulo, enquanto não há endereço
const PONTOS_CIRCULO = 128;
const COR = '#2563eb';

// Polígono (anel) de um círculo de `raioKm` em volta de [lon, lat]
function anelCirculo([lon, lat], raioKm) {
  const pontos = [];
  const kmPorGrauLat = 110.574;
  const kmPorGrauLon = 111.32 * Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= PONTOS_CIRCULO; i++) {
    const angulo = (i / PONTOS_CIRCULO) * 2 * Math.PI;
    pontos.push([lon + (raioKm * Math.cos(angulo)) / kmPorGrauLon, lat + (raioKm * Math.sin(angulo)) / kmPorGrauLat]);
  }
  return pontos;
}

function geometrias(centro, raioKm) {
  const raio = Math.max(Number(raioKm) || 0, 0.05);
  const externo = anelCirculo(centro, raio);
  const interno = anelCirculo(centro, raio * 0.985).reverse(); // espessura da parede 3D
  return {
    area: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [externo] }, properties: {} },
    parede: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [externo, interno] }, properties: {} },
    externo
  };
}

function limites(pontos) {
  const b = new maplibregl.LngLatBounds(pontos[0], pontos[0]);
  pontos.forEach((p) => b.extend(p));
  return b;
}

export default function MapaRaio3D({ latitude, longitude, raioKm, aoMoverPonto }) {
  const containerRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const aoMoverRef = useRef(aoMoverPonto);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const [modo3D, setModo3D] = useState(true);

  aoMoverRef.current = aoMoverPonto;
  const temPonto = Number.isFinite(latitude) && Number.isFinite(longitude);

  // Cria o mapa uma vez
  useEffect(() => {
    const mapa = new maplibregl.Map({
      container: containerRef.current,
      style: ESTILO_MAPA,
      center: CENTRO_PADRAO,
      zoom: 10,
      pitch: 55,
      bearing: -18,
      maxPitch: 75,
      attributionControl: { compact: true }
    });
    mapaRef.current = mapa;
    mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapa.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapa.on('load', () => {
      const vazio = { type: 'FeatureCollection', features: [] };
      mapa.addSource('raio-area', { type: 'geojson', data: vazio });
      mapa.addSource('raio-parede', { type: 'geojson', data: vazio });
      mapa.addLayer({ id: 'raio-preenchimento', type: 'fill', source: 'raio-area', paint: { 'fill-color': COR, 'fill-opacity': 0.12 } });
      mapa.addLayer({ id: 'raio-borda', type: 'line', source: 'raio-area', paint: { 'line-color': COR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      mapa.addLayer({
        id: 'raio-parede-3d',
        type: 'fill-extrusion',
        source: 'raio-parede',
        paint: { 'fill-extrusion-color': COR, 'fill-extrusion-height': 180, 'fill-extrusion-opacity': 0.55 }
      });
      setCarregado(true);
    });

    mapa.on('error', (e) => {
      // Falha ao baixar o estilo/tiles (sem internet ou serviço fora do ar)
      if (!mapa.isStyleLoaded()) setErro('Não foi possível carregar o mapa. Verifique a conexão.');
      console.error('[mapa]', e?.error?.message || e);
    });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  // Atualiza marcador e círculo quando muda o ponto ou o raio
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !carregado) return;

    if (!temPonto) {
      marcadorRef.current?.remove();
      marcadorRef.current = null;
      const vazio = { type: 'FeatureCollection', features: [] };
      mapa.getSource('raio-area')?.setData(vazio);
      mapa.getSource('raio-parede')?.setData(vazio);
      return;
    }

    const centro = [longitude, latitude];
    if (!marcadorRef.current) {
      const el = document.createElement('div');
      el.className = 'lt-marcador';
      el.innerHTML = '<span class="lt-marcador-pulso"></span><span class="lt-marcador-ponto"></span>';
      marcadorRef.current = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(centro).addTo(mapa);
      marcadorRef.current.on('dragend', () => {
        const { lng, lat } = marcadorRef.current.getLngLat();
        aoMoverRef.current?.(lat, lng);
      });
    } else {
      marcadorRef.current.setLngLat(centro);
    }

    const { area, parede, externo } = geometrias(centro, raioKm);
    mapa.getSource('raio-area')?.setData(area);
    mapa.getSource('raio-parede')?.setData(parede);
    mapa.fitBounds(limites(externo), { padding: 48, pitch: modo3D ? 55 : 0, bearing: modo3D ? -18 : 0, duration: 900, maxZoom: 15 });
    // modo3D fica fora das dependências de propósito: trocar o modo não deve reenquadrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado, temPonto, latitude, longitude, raioKm]);

  const alternarModo = () => {
    const proximo = !modo3D;
    setModo3D(proximo);
    mapaRef.current?.easeTo({ pitch: proximo ? 55 : 0, bearing: proximo ? -18 : 0, duration: 700 });
  };

  const centralizar = () => {
    if (!temPonto || !mapaRef.current) return;
    const { externo } = geometrias([longitude, latitude], raioKm);
    mapaRef.current.fitBounds(limites(externo), { padding: 48, pitch: modo3D ? 55 : 0, bearing: modo3D ? -18 : 0, duration: 700, maxZoom: 15 });
  };

  return (
    <div className="lt-mapa">
      <div ref={containerRef} className="lt-mapa-canvas" />

      <div className="lt-mapa-acoes">
        <button type="button" onClick={alternarModo} title={modo3D ? 'Ver de cima (2D)' : 'Ver inclinado (3D)'}>
          {modo3D ? <MapaIcone size={15} /> : <Box size={15} />} {modo3D ? '2D' : '3D'}
        </button>
        <button type="button" onClick={centralizar} disabled={!temPonto} title="Enquadrar a área atendida">
          <LocateFixed size={15} />
        </button>
      </div>

      {!temPonto && !erro && (
        <div className="lt-mapa-aviso">
          <strong>Informe o endereço</strong>
          <span>Digite o CEP e o número e clique em "Ver no mapa" para mostrar a área atendida.</span>
        </div>
      )}
      {erro && (
        <div className="lt-mapa-aviso lt-mapa-aviso-erro">
          <strong>Mapa indisponível</strong>
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
}
