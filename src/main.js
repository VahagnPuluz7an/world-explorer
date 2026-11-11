import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import * as db from './db.js';
import { t, lang, setLang, applyStatic, LANGS } from './i18n.js';
import countries from 'i18n-iso-countries';
import hyNames from 'i18n-iso-countries/langs/hy.json';
import ruNames from 'i18n-iso-countries/langs/ru.json';
import enNames from 'i18n-iso-countries/langs/en.json';
[hyNames, ruNames, enNames].forEach((l) => countries.registerLocale(l));
import { Protocol } from 'pmtiles';

const pmt = new Protocol(); maplibregl.addProtocol('pmtiles', pmt.tile);
const admUrl = (l) => `pmtiles://${new URL(import.meta.env.BASE_URL + 'tiles/' + l + '.pmtiles', location.origin)}`;
const LV = ['adm0', 'adm1', 'adm2', 'adm3'];

const $ = (s) => document.querySelector(s);
const COLORS = ['#ff3d7f', '#ff7a3d', '#ffd23d', '#5cff8a', '#3dd9ff', '#3d7bff', '#7b5cff', '#d13dff', '#ffffff'];
const COUNTRIES_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

const state = {
  user: null, marks: [], tool: 'pan', color: COLORS[0], size: 18, opacity: 0.65,
  undo: [], countries: null, drawing: null,
};

// ---------------- UI helpers ----------------
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
const HINTS = {
  get pan() { return t('hintPan'); },
  get brush() { return t('hintBrush'); },
  get fill() { return t('hintFillHover'); },
  get eraser() { return t('hintEraser'); },
};

// ---------------- MAP ----------------
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [105, 25], zoom: 1.5, maxPitch: 70,
  attributionControl: { compact: true },
  pixelRatio: Math.min(devicePixelRatio || 1, 2), // phones with 3x screens render 2.25x fewer pixels
  fadeDuration: 120,
});
// pause expensive CSS (glass blur, star drift) while the map moves
map.on('movestart', () => document.body.classList.add('moving'));
map.on('moveend', () => document.body.classList.remove('moving'));

// Boundary tiles are only downloaded for layers that are visible:
// hit/hover layers only while the fill tool is on, paint layers only for levels that have fills.
function updateAdmVisibility() {
  if (!map.getLayer('hit-adm0')) return;
  const used = new Set(state.marks.filter((m) => m.data?.tile).map((m) => m.data.tile.layer));
  for (const l of LV) {
    const pick = state.tool === 'fill' ? 'visible' : 'none';
    for (const id of [`hit-${l}`, `hover-${l}`, `hover-${l}-fill`]) map.setLayoutProperty(id, 'visibility', pick);
    for (const id of [`paint-${l}`, `paint-${l}-edge`]) map.setLayoutProperty(id, 'visibility', used.has(l) ? 'visible' : 'none');
  }
}
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
map.addControl(new maplibregl.GeolocateControl({ fitBoundsOptions: { maxZoom: 13 } }), 'bottom-right');

let spinning = true;
function spin() {
  if (!spinning || map.isMoving()) return;
  const c = map.getCenter(); c.lng -= 2.5; map.easeTo({ center: c, duration: 1000, easing: (t) => t });
}
map.on('moveend', spin);
['mousedown', 'touchstart', 'wheel'].forEach((e) => map.on(e, () => (spinning = false)));

if (import.meta.env.DEV) { window.__map = map; window.__state = state; window.__render = () => render(); }
let firstSymbol;
map.on('style.load', () => {
  map.setProjection({ type: 'globe' });
  map.setSky({
    'sky-color': '#0b1240', 'horizon-color': '#3a5bd9', 'fog-color': '#ffffff',
    'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.9, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.4, 10, 0],
  });
  firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  grayscale();
  for (const id of ['building-3d']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  localizeLabels();
  setupLayers();
  spin();
});

// ---------- black & white base map so the paint pops ----------
const cctx = document.createElement('canvas').getContext('2d');
function toGray(str) {
  cctx.fillStyle = '#000'; cctx.fillStyle = str; const v = cctx.fillStyle;
  let r, g, b, a = 1;
  if (v[0] === '#') [r, g, b] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  else { const m = v.match(/[\d.]+/g); if (!m) return str; [r, g, b, a = 1] = m.map(Number); }
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return `rgba(${y},${y},${y},${a})`;
}
const isColor = (x) => typeof x === 'string' && /^(#|rgb|hsl)/i.test(x.trim());
const grayDeep = (v) => Array.isArray(v) ? v.map(grayDeep) : isColor(v) ? toGray(v) : v;
function localizeLabels() {
  for (const l of map.getStyle().layers) {
    if (l.type !== 'symbol' || !l.layout?.['text-field'] || !JSON.stringify(l.layout['text-field']).includes('name')) continue;
    map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:' + lang], ['get', 'name:en'], ['get', 'name']]);
  }
}
function grayscale() {
  for (const l of map.getStyle().layers) {
    if (l.type === 'raster') try { map.setPaintProperty(l.id, 'raster-saturation', -1); } catch {}
    for (const [k, v] of Object.entries(l.paint || {})) {
      if (k.endsWith('-color')) try { map.setPaintProperty(l.id, k, grayDeep(v)); } catch {}
    }
  }
}

const NONE = ['==', ['get', 'ADM0_A3'], '__none__'];
const NONE_ID = ['==', ['get', 'id'], '__none__'];
const lineWidth = ['interpolate', ['exponential', 2], ['zoom'],
  0, ['*', ['get', 'w'], ['^', 2, ['-', 0, ['get', 'z']]]],
  24, ['*', ['get', 'w'], ['^', 2, ['-', 24, ['get', 'z']]]]];

async function setupLayers() {
  const empty = { type: 'FeatureCollection', features: [] };
  map.addSource('marks', { type: 'geojson', data: empty });
  map.addSource('draft', { type: 'geojson', data: empty });
  map.addSource('countries', { type: 'geojson', data: empty });

  map.addLayer({ id: 'countries-fill', type: 'fill', source: 'countries', filter: NONE,
    paint: { 'fill-color': '#fff', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 0.35] } }, firstSymbol);
  map.addLayer({ id: 'countries-line', type: 'line', source: 'countries', filter: NONE,
    paint: { 'line-color': '#fff', 'line-width': 1.5, 'line-opacity': 0.8 } }, firstSymbol);

  for (const l of LV) map.addSource(l, { type: 'vector', url: admUrl(l), promoteId: 'id' });
  for (const l of LV) {
    map.addLayer({ id: `hit-${l}`, type: 'fill', source: l, 'source-layer': l, paint: { 'fill-opacity': 0 } }, firstSymbol);
    map.addLayer({ id: `paint-${l}`, type: 'fill', source: l, 'source-layer': l, filter: NONE_ID,
      paint: { 'fill-color': '#fff', 'fill-opacity': 0.55 } }, firstSymbol);
    map.addLayer({ id: `paint-${l}-edge`, type: 'line', source: l, 'source-layer': l, filter: NONE_ID,
      paint: { 'line-color': '#fff', 'line-width': 1.2, 'line-opacity': 0.9 } }, firstSymbol);
  }
  for (const l of LV) {
    map.addLayer({ id: `hover-${l}`, type: 'line', source: l, 'source-layer': l, filter: NONE_ID,
      paint: { 'line-color': '#111', 'line-width': 2.5, 'line-dasharray': [2, 1.2] } });
    map.addLayer({ id: `hover-${l}-fill`, type: 'fill', source: l, 'source-layer': l, filter: NONE_ID,
      paint: { 'fill-color': '#000', 'fill-opacity': 0.08 } });
  }

  const POLY = ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]];
  map.addLayer({ id: 'marks-area', type: 'fill', source: 'marks', filter: POLY,
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } }, firstSymbol);
  map.addLayer({ id: 'marks-area-edge', type: 'line', source: 'marks', filter: POLY,
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.9 } }, firstSymbol);
  map.addLayer({ id: 'marks-line', type: 'line', source: 'marks', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-opacity': ['get', 'opacity'], 'line-width': lineWidth, 'line-blur': 0.5 } }, firstSymbol);

  map.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft', filter: POLY,
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3, 'fill-opacity-transition': { duration: 400 } } });
  map.addLayer({ id: 'draft-edge', type: 'line', source: 'draft', filter: POLY,
    paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [2, 1] } });
  map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-opacity': ['get', 'opacity'], 'line-width': lineWidth } });

  try {
    const gj = await (await fetch(COUNTRIES_URL)).json();
    gj.features.forEach((f) => { for (const k of [f.properties.ADM0_A3, f.properties.ISO_A3]) ISO2[k] = { a2: f.properties.ISO_A2_EH || f.properties.ISO_A2, ru: f.properties.NAME_RU, en: f.properties.NAME }; f.properties = { ADM0_A3: f.properties.ADM0_A3, name: f.properties.NAME_RU || f.properties.NAME }; });
    state.countries = gj;
    map.getSource('countries').setData(gj);
  } catch { toast(t('bordersFail')); }
  render();
}

// ---------------- geometry helpers ----------------
function pip([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function countryAt(pt) {
  if (!state.countries) return null;
  for (const f of state.countries.features) {
    const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (polys.some((p) => pip(pt, p[0]))) return f.properties;
  }
  return null;
}
function coordsOf(m) {
  if (m.kind === 'country') {
    const f = state.countries?.features.find((x) => x.properties.ADM0_A3 === m.data.iso);
    if (!f) return [];
    return (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2);
  }
  if (m.data.bbox) { const [w, s, e, n] = m.data.bbox; return [[w, s], [e, n]]; }
  if (m.data.geom) { const g = m.data.geom; return (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flat(2); }
  return m.kind === 'area' ? m.data.coords[0] : m.data.coords;
}
function fitMarks(list) {
  const b = new maplibregl.LngLatBounds();
  list.forEach((m) => coordsOf(m).forEach((c) => b.extend(c)));
  if (!b.isEmpty()) map.fitBounds(b, { padding: 120, maxZoom: 15, duration: 2200, essential: true });
}

// ---------------- render ----------------
function render() {
  if (!map.getSource('marks')) return;
  const features = [];
  const countryMarks = [], tileMarks = [];
  for (const m of state.marks) {
    const props = { id: m.id, color: m.color, opacity: m.opacity, w: m.size, z: m.zoom };
    if (m.kind === 'stroke') features.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: m.data.coords } });
    else if (m.kind === 'area' && m.data.tile) tileMarks.push(m);
    else if (m.kind === 'area') features.push({ type: 'Feature', properties: props, geometry: m.data.geom || { type: 'Polygon', coordinates: m.data.coords } });
    else if (m.kind === 'country') countryMarks.push(m);
  }
  map.getSource('marks').setData({ type: 'FeatureCollection', features });
  for (const l of LV) {
    const ms = tileMarks.filter((m) => m.data.tile.layer === l);
    if (!ms.length) { map.setFilter(`paint-${l}`, NONE_ID); map.setFilter(`paint-${l}-edge`, NONE_ID); continue; }
    const f = ['in', ['get', 'id'], ['literal', ms.map((m) => m.data.tile.id)]];
    const pairs = [...new Map(ms.map((m) => [m.data.tile.id, m])).values()];
    map.setFilter(`paint-${l}`, f); map.setFilter(`paint-${l}-edge`, f);
    map.setPaintProperty(`paint-${l}`, 'fill-color', ['match', ['get', 'id'], ...pairs.flatMap((m) => [m.data.tile.id, m.color]), '#fff']);
    map.setPaintProperty(`paint-${l}`, 'fill-opacity', ['match', ['get', 'id'], ...pairs.flatMap((m) => [m.data.tile.id, m.opacity]), 0.5]);
    map.setPaintProperty(`paint-${l}-edge`, 'line-color', ['match', ['get', 'id'], ...pairs.flatMap((m) => [m.data.tile.id, m.color]), '#fff']);
  }
  if (countryMarks.length) {
    const isos = countryMarks.map((m) => m.data.iso);
    const filter = ['in', ['get', 'ADM0_A3'], ['literal', isos]];
    const color = ['match', ['get', 'ADM0_A3'], ...countryMarks.flatMap((m) => [m.data.iso, m.color]), '#fff'];
    map.setFilter('countries-fill', filter); map.setFilter('countries-line', filter);
    map.setPaintProperty('countries-fill', 'fill-color', color);
  } else { map.setFilter('countries-fill', NONE); map.setFilter('countries-line', NONE); }
  updateAdmVisibility();
  renderProfile();
}

function renderProfile() {
  const OCEAN = t('ocean');
  const groups = {};
  for (const m of state.marks) {
    if (!m.label && state.countries) { const c = coordsOf(m); m.label = countryAt(c[Math.floor(c.length / 2)])?.name || null; }
    const k = placeLabel(m) || OCEAN;
    (groups[k] ||= { list: [], color: m.color, full: false }).list.push(m);
    if (m.kind === 'country' || m.data?.level === 0) groups[k].full = true;
  }
  const names = Object.keys(groups).filter((n) => n !== OCEAN);
  $('#s-countries').textContent = names.length;
  $('#s-marks').textContent = state.marks.length;
  $('#s-world').textContent = Math.round((names.length / 195) * 1000) / 10 + '%';
  const box = $('#places'); box.innerHTML = '';
  if (!state.marks.length) box.innerHTML = `<p class="muted small">${t('empty')}</p>`;
  Object.entries(groups).sort((a, b) => b[1].list.length - a[1].list.length).forEach(([name, g], i) => {
    const b = document.createElement('button'); b.className = 'place'; b.style.animationDelay = i * 40 + 'ms';
    b.innerHTML = `<i style="background:${g.color};box-shadow:0 0 10px ${g.color}"></i><span></span><em>${g.full ? t('wholeCountry') : t('nMarks', { n: g.list.length })}</em>`;
    b.querySelector('span').textContent = name;
    b.onclick = () => { fitMarks(g.list); if (innerWidth < 640) $('#profile').classList.remove('open'); };
    box.appendChild(b);
  });
}

// ---------------- marks ----------------
async function addMark(kind, data, labelPt, label) {
  const c = label ? { name: label } : countryAt(labelPt);
  if (!data.iso && (c?.ADM0_A3 || data.tileIso)) data.iso = data.tileIso || c.ADM0_A3;
  delete data.tileIso;
  const m = { id: crypto.randomUUID(), kind, color: state.color, opacity: state.opacity, size: state.size,
    zoom: map.getZoom(), data, label: kind === 'country' ? data.name : c?.name || null, created_at: new Date().toISOString() };
  state.marks.push(m); state.undo.push(m.id); render();
  try { await db.saveMark(state.user.id, m); }
  catch (e) { state.marks = state.marks.filter((x) => x.id !== m.id); render(); toast(t('saveErr') + e.message); }
}
async function removeMark(id) {
  const m = state.marks.find((x) => x.id === id); if (!m) return;
  state.marks = state.marks.filter((x) => x.id !== id); render();
  try { await db.deleteMark(state.user.id, id); }
  catch (e) { state.marks.push(m); render(); toast(t('delErr') + e.message); }
}

// ---------------- tools ----------------
function setTool(t) {
  state.tool = t;
  updateAdmVisibility();
  document.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  const el = $('#map'); el.classList.remove('painting', 'erasing', 'picking');
  if (t === 'brush') el.classList.add('painting');
  if (t === 'eraser') el.classList.add('erasing');
  if (t === 'fill') el.classList.add('picking');
  const free = t === 'pan' || t === 'fill';
  free ? map.dragPan.enable() : map.dragPan.disable();
  free ? map.dragRotate.enable() : map.dragRotate.disable();
  const h = $('#hint'); h.classList.remove('hidden'); h.style.animation = 'none'; h.offsetHeight; h.style.animation = '';
  updateHint();
}

// ---------- smart fill: picks the biggest boundary that fits on screen ----------
// All boundaries containing a point (country → province/island → regency → town → district) via Nominatim.
// Requests go through a queue (Nominatim policy: ≤1 req/s) with retries.
const NOM = 'https://nominatim.openstreetmap.org';
let lastReq = 0, chain = Promise.resolve();
function getJSON(u) {
  const job = chain.then(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = lastReq + 1100 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastReq = Date.now();
      try { const r = await fetch(u); if (r.ok) return r.json(); } catch {}
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    throw new Error(t('busy'));
  });
  chain = job.catch(() => {});
  return job;
}
const bbArea = (bb) => {
  const [s, n, w, e] = bb.map(Number); const k = Math.cos(((s + n) / 2) * Math.PI / 180);
  return { w: (e - w) * k, h: n - s };
};
const isPoly = (g) => g && /Polygon/.test(g.type);
const containCache = new Map();
async function containing(lng, lat) {
  const key = lng.toFixed(2) + ',' + lat.toFixed(2);
  if (containCache.has(key)) return containCache.get(key);
  const rv = await getJSON(`${NOM}/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}&accept-language=${lang}&addressdetails=1`);
  if (rv.error) { containCache.set(key, []); return []; }
  const d = await getJSON(`${NOM}/details?osmtype=${rv.osm_type[0].toUpperCase()}&osmid=${rv.osm_id}&addressdetails=1&format=json`);
  const ids = [...new Set((d.address || []).filter((x) => x.osm_id && x.isaddress !== false && x.rank_address >= 5 && x.rank_address <= 25)
    .map((x) => x.osm_type + x.osm_id))];
  const lk = ids.length ? await getJSON(`${NOM}/lookup?format=geojson&polygon_geojson=1&polygon_threshold=0.0005&accept-language=${lang}&osm_ids=${ids.join(',')}`) : { features: [] };
  const country = rv.address?.country || null;
  const list = lk.features.filter((f) => isPoly(f.geometry)).map((f) => ({
    osm: f.properties.osm_type[0].toUpperCase() + f.properties.osm_id, name: f.properties.name || f.properties.display_name.split(',')[0],
    ...bbArea([f.bbox[1], f.bbox[3], f.bbox[0], f.bbox[2]]), geom: f.geometry, country, lat: rv.lat, lon: rv.lon,
  }));
  list.push({ osm: 'country', name: country, w: Infinity, h: Infinity, country, lat, lng, isCountry: true });
  const uniq = [...new Map(list.map((x) => [x.osm, x])).values()].sort((x, y) => y.w * y.h - x.w * x.h);
  containCache.set(key, uniq);
  return uniq;
}
async function countryGeom(a) {
  const f = (await getJSON(`${NOM}/reverse?format=geojson&zoom=3&polygon_geojson=1&polygon_threshold=0.02&accept-language=${lang}&lat=${a.lat}&lon=${a.lng}`)).features?.[0];
  if (!f || !isPoly(f.geometry)) return null;
  return { osm: f.properties.osm_type[0].toUpperCase() + f.properties.osm_id, name: f.properties.name, geom: f.geometry };
}
// Detailed water polygons only exist when zoomed in; at low zoom rely on Nominatim (ocean → no result).
const onWater = (pt) => map.getZoom() >= 9 && map.queryRenderedFeatures(pt).some((f) => f.sourceLayer === 'water');

// ---------- picking from our own boundary tiles ----------
// bbox of a feature from all loaded tiles (if it spills past the loaded area it's bigger than the screen anyway)
function featBBox(layer, id) {
  let w = 180, s = 90, e = -180, n = -90;
  for (const f of map.querySourceFeatures(layer, { sourceLayer: layer, filter: ['==', ['get', 'id'], id] })) {
    const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of polys) for (const [x, y] of p[0]) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  }
  return w <= e ? [w, s, e, n] : null;
}
function fitsView(bb) {
  if (!bb) return false;
  const c = map.getCanvas(); const W = c.clientWidth, H = c.clientHeight, pad = 0.04;
  const pts = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]], [(bb[0] + bb[2]) / 2, bb[1]], [(bb[0] + bb[2]) / 2, bb[3]]];
  // on a globe, far-side points are hidden — treat whole-earth spans as not fitting unless zoomed out
  if (bb[2] - bb[0] > 170 && map.getZoom() > 2.2) return false;
  return pts.every(([x, y]) => { const p = map.project([x, y]); return p.x >= -W * pad && p.x <= W * (1 + pad) && p.y >= -H * pad && p.y <= H * (1 + pad); });
}
// at a screen point: biggest boundary that fits on screen; if none fits — the most detailed one
function pickAt(point) {
  const cands = [];
  for (const l of LV) {
    // MapLibre's globe hit-test can be off at low zoom → verify with our own point-in-polygon
    const r = 6, ll = map.unproject(point), pt = [ll.lng, ll.lat];
    const f = map.queryRenderedFeatures([[point.x - r, point.y - r], [point.x + r, point.y + r]], { layers: [`hit-${l}`] })
      .find((f) => { const g = f.geometry; return (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some((p) => pip(pt, p[0]) && !p.slice(1).some((h) => pip(pt, h))); });
    if (f) cands.push({ layer: l, id: f.properties.id, name: f.properties.name, iso: f.properties.iso });
  }
  if (!cands.length) return null;
  for (const c of cands) { c.bbox = featBBox(c.layer, c.id); if (fitsView(c.bbox)) return c; }
  return { ...cands[cands.length - 1], deepest: true };
}
// country names in the UI language (Armenian via the browser's Intl data)
const ISO2 = {};
function countryName(iso) {
  const c = ISO2[iso] || { a2: countries.alpha3ToAlpha2(iso) };
  const n = countries.getName(c.a2 && c.a2 !== '-99' ? c.a2 : iso, lang);
  return n || (lang === 'ru' && c.ru) || c.en || iso;
}
const placeLabel = (m) => (m.data?.iso ? countryName(m.data.iso) : m.label);

let hovered = null;
function setHover(c) {
  const key = c ? c.layer + c.id : '';
  if ((hovered ? hovered.layer + hovered.id : '') === key) return;
  if (hovered) { map.setFilter(`hover-${hovered.layer}`, NONE_ID); map.setFilter(`hover-${hovered.layer}-fill`, NONE_ID); }
  hovered = c;
  const h = $('#hint');
  if (!c) { h.textContent = touch ? t('hintAimLand') : t('hintFillHover'); return; }
  const f = ['==', ['get', 'id'], c.id];
  map.setFilter(`hover-${c.layer}`, f); map.setFilter(`hover-${c.layer}-fill`, f);
  const lvl = t('lvl_' + c.layer);
  h.textContent = `🪣 ${c.layer === 'adm0' ? countryName(c.iso) : c.name} · ${lvl}`;
}
let raf = 0, lastPt = null;
canvasElHover();
function canvasElHover() {
  map.on('mousemove', (e) => {
    if (state.tool !== 'fill') return;
    lastPt = e.point; if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; setHover(pickAt(lastPt)); });
  });
  map.on('mouseout', () => state.tool === 'fill' && setHover(null));
  map.on('moveend', () => { if (state.tool === 'fill' && lastPt) setHover(pickAt(lastPt)); });
}
// touch screens have no hover: show a crosshair and preview what's under the screen center
const touch = matchMedia('(hover: none)').matches;
function centerPreview() {
  if (!touch || state.tool !== 'fill') return;
  const c = map.getCanvas(); setHover(pickAt({ x: c.clientWidth / 2, y: c.clientHeight / 2 }));
}
map.on('moveend', centerPreview);
map.on('idle', () => !hovered && centerPreview());
$('#more-btn').onclick = () => { $('#palette').classList.toggle('more'); document.body.classList.toggle('pal-more'); };
function updateHint() {
  $('#crosshair').classList.toggle('hidden', !(touch && state.tool === 'fill'));
  const h = $('#hint');
  if (state.tool !== 'fill') { if (hovered) setHover(null); h.textContent = HINTS[state.tool]; return; }
  h.textContent = touch ? t('hintFillTouch') : t('hintFillHover');
  centerPreview();
}

let filling = false;
map.on('click', async (e) => {
  if (state.tool !== 'fill' || filling) return;
  const c = pickAt(e.point);
  if (!c) return toast(t('noLand'));
  // deeper than our data (zoomed into a city)? try OSM for the town/district, fall back to our boundary
  if (c.deepest && map.getZoom() >= 11) {
    filling = true; $('#map').classList.add('loading');
    try {
      const list = (await containing(e.lngLat.lng, e.lngLat.lat)).filter((a) => !a.isCountry);
      const v = viewSize(); const a = list.find((x) => x.w <= v.w * 1.1 && x.h <= v.h * 1.1) || list[list.length - 1];
      if (a) {
        const dup = state.marks.find((m) => m.data.osm === a.osm);
        if (dup) { await removeMark(dup.id); return toast(t('unfilled', { name: a.name })); }
        await addMark('area', { geom: a.geom, name: a.name, osm: a.osm }, [e.lngLat.lng, e.lngLat.lat], countryName(c.iso));
        return toast(t('filled', { name: a.name }));
      }
    } catch {} finally { filling = false; $('#map').classList.remove('loading'); }
  }
  const dup = state.marks.find((m) => m.data.tile?.id === c.id);
  const name = c.layer === 'adm0' ? countryName(c.iso) : c.name;
  if (dup) { await removeMark(dup.id); return toast(t('unfilled', { name })); }
  await addMark('area', { tile: { layer: c.layer, id: c.id }, name, tileIso: c.iso, bbox: c.bbox || featBBox(c.layer, c.id) }, [e.lngLat.lng, e.lngLat.lat], countryName(c.iso));
  toast(t('filled', { name }));
});
function viewSize() {
  const b = map.getBounds(); const c = map.getCenter();
  const k = Math.cos(c.lat * Math.PI / 180);
  let dl = b.getEast() - b.getWest(); if (dl < 0) dl += 360;
  return { w: Math.min(dl, 360) * k, h: Math.min(b.getNorth() - b.getSouth(), 180) };
}

const canvasEl = map.getCanvasContainer();
let pointers = 0;
const pos = (e) => { const r = canvasEl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
canvasEl.addEventListener('pointerdown', (e) => {
  pointers++;
  if (pointers > 1) { state.drawing = null; map.getSource('draft')?.setData({ type: 'FeatureCollection', features: [] }); return; }
  if (state.tool === 'brush') {
    const ll = map.unproject(pos(e));
    state.drawing = { pts: [[ll.lng, ll.lat]], px: pos(e) };
    canvasEl.setPointerCapture(e.pointerId);
    drawDraft();
  } else if (state.tool === 'eraser') { state.erasing = true; eraseAt(...pos(e)); }
});
canvasEl.addEventListener('pointermove', (e) => {
  if (state.erasing) return eraseAt(...pos(e));
  const d = state.drawing; if (!d) return;
  const p = pos(e);
  if (Math.hypot(p[0] - d.px[0], p[1] - d.px[1]) < 3) return;
  d.px = p;
  const ll = map.unproject(d.px); d.pts.push([ll.lng, ll.lat]);
  drawDraft();
});
const endPointer = () => {
  pointers = Math.max(0, pointers - 1);
  state.erasing = false;
  const d = state.drawing; state.drawing = null;
  if (!d) return;
  map.getSource('draft')?.setData({ type: 'FeatureCollection', features: [] });
  if (d.pts.length === 1) d.pts.push([d.pts[0][0] + 1e-9, d.pts[0][1]]);
  addMark('stroke', { coords: d.pts }, d.pts[Math.floor(d.pts.length / 2)]);
};
canvasEl.addEventListener('pointerup', endPointer);
canvasEl.addEventListener('pointercancel', endPointer);

function drawDraft() {
  const d = state.drawing;
  const props = { color: state.color, opacity: state.opacity, w: state.size, z: map.getZoom() };
  const pts = d.pts.length === 1 ? [d.pts[0], [d.pts[0][0] + 1e-9, d.pts[0][1]]] : d.pts;
  map.getSource('draft').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: pts } }] });
}

function eraseAt(x, y) {
  const r = 8;
  const hits = map.queryRenderedFeatures([[x - r, y - r], [x + r, y + r]], { layers: ['marks-line', 'marks-area', 'countries-fill'] });
  const ids = new Set();
  hits.forEach((f) => {
    if (f.layer.id === 'countries-fill') { const m = state.marks.find((m) => m.kind === 'country' && m.data.iso === f.properties.ADM0_A3); if (m) ids.add(m.id); }
    else ids.add(f.properties.id);
  });
  ids.forEach(removeMark);
}

async function undo() {
  while (state.undo.length) {
    const id = state.undo.pop();
    if (state.marks.some((m) => m.id === id)) { await removeMark(id); toast(t('undone')); return; }
  }
  toast(t('nothingUndo'));
}

// ---------------- palette ----------------
function setColor(c) {
  state.color = c;
  document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.c === c));
  $('#size-preview').style.setProperty('--c', c);
}
COLORS.forEach((c) => {
  const s = document.createElement('button'); s.className = 'swatch'; s.dataset.c = c; s.style.background = c; s.style.color = c;
  s.onclick = () => setColor(c); $('#colors').appendChild(s);
});
$('#custom-color').oninput = (e) => setColor(e.target.value);
$('#size').oninput = (e) => { state.size = +e.target.value; $('#size-preview').style.setProperty('--s', Math.min(30, state.size) + 'px'); };
$('#opacity').oninput = (e) => { state.opacity = e.target.value / 100; $('#size-preview').style.opacity = state.opacity; };
setColor(COLORS[0]); $('#size').oninput({ target: $('#size') }); $('#opacity').oninput({ target: $('#opacity') });

document.querySelectorAll('.tool[data-tool]').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
$('#undo').onclick = undo;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); return undo(); }
  const k = { v: 'pan', b: 'brush', f: 'fill', g: 'fill', e: 'eraser' }[e.key.toLowerCase()];
  if (k) setTool(k);
});

// ---------------- search (OpenStreetMap Nominatim) ----------------
let st;
$('#search').addEventListener('input', (e) => {
  clearTimeout(st); const q = e.target.value.trim(); const box = $('#search-results');
  if (q.length < 2) return box.classList.add('hidden');
  st = setTimeout(async () => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=${lang}&q=${encodeURIComponent(q)}`);
      const res = await r.json(); box.innerHTML = '';
      res.forEach((p) => {
        const b = document.createElement('button'); b.textContent = p.display_name;
        b.onclick = () => {
          box.classList.add('hidden'); $('#search').value = p.display_name.split(',')[0]; spinning = false;
          const [s, n, w, ea] = p.boundingbox.map(Number);
          map.fitBounds([[w, s], [ea, n]], { padding: 80, duration: 3000, maxZoom: 16, essential: true });
        };
        box.appendChild(b);
      });
      box.classList.toggle('hidden', !res.length);
    } catch {}
  }, 400);
});

// ---------------- profile ----------------
$('#profile-btn').onclick = () => $('#profile').classList.toggle('open');
$('#profile-close').onclick = () => $('#profile').classList.remove('open');
$('#clear-all').onclick = async () => {
  if (!state.marks.length) return toast(t('alreadyEmpty'));
  if (!confirm(t('confirmClear', { n: state.marks.length }))) return;
  for (const m of [...state.marks]) await removeMark(m.id);
  state.undo = []; toast(t('cleared'));
};
$('#logout').onclick = async () => { await db.signOut(); location.reload(); };

// ---------------- auth ----------------
let authMode = 'login';
document.querySelectorAll('.tab').forEach((tab) => (tab.onclick = () => {
  authMode = tab.dataset.mode;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === tab));
  $('#auth-form').classList.toggle('signup', authMode === 'signup');
  $('#auth-submit').textContent = authMode === 'signup' ? t('doSignup') : t('doLogin');
  $('#auth-msg').textContent = '';
}));
$('#auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = $('#f-email').value.trim().toLowerCase(), pass = $('#f-pass').value, name = $('#f-name').value.trim();
  const msg = $('#auth-msg'); msg.className = 'msg'; msg.textContent = ''; $('#auth-submit').disabled = true;
  try {
    if (authMode === 'signup') {
      const r = await db.signUp(email, pass, name);
      if (r.needsConfirm) { msg.className = 'msg ok'; msg.textContent = t('checkEmail'); return; }
      await enter(r.user);
    } else await enter(await db.signIn(email, pass));
  } catch (err) { msg.textContent = err.message; }
  finally { $('#auth-submit').disabled = false; }
};

function buildLangSwitches() {
  for (const box of document.querySelectorAll('.lang-switch')) {
    box.innerHTML = '';
    for (const [code, label] of Object.entries(LANGS)) {
      const b = document.createElement('button'); b.textContent = label; b.classList.toggle('active', code === lang);
      b.onclick = () => changeLang(code); box.appendChild(b);
    }
  }
}
function changeLang(code) {
  setLang(code); buildLangSwitches();
  $('#auth-submit').textContent = authMode === 'signup' ? t('doSignup') : t('doLogin');
  $('#mode-note').textContent = db.cloud ? t('modeCloud') : t('modeLocal');
  if (map.isStyleLoaded()) localizeLabels();
  if (state.user) { updateHint(); renderProfile(); }
}
// keep the globe centered whenever the visible area changes (mobile keyboard, rotation, login overlay)
const refit = () => map.resize();
window.visualViewport?.addEventListener('resize', refit);
addEventListener('orientationchange', () => setTimeout(refit, 300));

async function enter(user) {
  state.user = user;
  $('#auth').classList.add('fade'); setTimeout(() => $('#auth').classList.add('hidden'), 600);
  ['#topbar', '#toolbar', '#palette'].forEach((s) => $(s).classList.remove('hidden'));
  $('#profile-btn').textContent = $('#p-avatar').textContent = (user.name || user.email)[0].toUpperCase();
  $('#p-name').textContent = user.name; $('#p-email').textContent = user.email;
  $('#mode-note').textContent = db.cloud ? t('modeCloud') : t('modeLocal');
  setTool('pan');
  try { state.marks = await db.loadMarks(user.id); } catch (e) { toast(t('loadErr') + e.message); }
  const go = () => {
    map.resize(); render();
    if (state.marks.length) { spinning = false; setTimeout(() => fitMarks(state.marks), 400); }
    else map.easeTo({ center: map.getCenter(), zoom: Math.max(1.6, Math.min(map.getZoom(), 2.2)), padding: 0, duration: 800 });
  };
  setTimeout(() => map.resize(), 650); // after the login overlay fades out
  // map.loaded() is false while tiles stream in, and 'load' fires only once — so wait for our own layers instead
  const ready = () => map.getSource('marks') && map.getLayer('paint-adm3');
  if (ready()) go(); else { const iv = setInterval(() => { if (ready()) { clearInterval(iv); go(); } }, 150); }
  toast(t('hello', { name: user.name }));
}

(async () => {
  applyStatic(); buildLangSwitches(); $('#auth-submit').textContent = t('doLogin');
  if (!db.cloud) $('#local-note').classList.remove('hidden');
  const u = await db.currentUser();
  if (u) enter(u);
})();
