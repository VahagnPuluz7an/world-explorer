"""Builds the light self-hosted basemap: public/tiles/base.pmtiles
Layers: land, lakes, places (cities with en/ru/hy names), countries (label points with en/ru/hy names).
Inputs: data/raw/ne/*.geojson (Natural Earth), Armenian names from Wikidata (cached in data/raw/ne/hy_cache.json).
Usage: python3 data/base.py && sh data/build_base.sh"""
import json, os, time, subprocess, urllib.parse

NE = os.path.join(os.path.dirname(__file__), 'raw', 'ne')
OUT = os.path.join(os.path.dirname(__file__), 'build')
os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(NE, 'hy_cache.json')
hy = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


def wikidata_hy(ids):
    todo = [i for i in ids if i and i not in hy]
    for k in range(0, len(todo), 50):
        chunk = todo[k:k + 50]
        url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
            {'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': 'labels', 'languages': 'hy', 'format': 'json'})
        for attempt in range(4):
            try:
                out = subprocess.run(['curl', '-s', '-m', '30', '-A', 'world-explorer-build/1.0', url], capture_output=True, check=True).stdout
                ents = json.loads(out)['entities']
                break
            except Exception:
                time.sleep(2 * (attempt + 1))
        else:
            continue
        for i in chunk:
            hy[i] = ents.get(i, {}).get('labels', {}).get('hy', {}).get('value', '')
        json.dump(hy, open(CACHE, 'w'), ensure_ascii=False)
        time.sleep(0.2)


def nd(path, feats):
    with open(path, 'w') as f:
        for ft in feats:
            f.write(json.dumps(ft, ensure_ascii=False, separators=(',', ':')) + '\n')


# cities
pp = json.load(open(os.path.join(NE, 'pp.geojson')))['features']
wikidata_hy([f['properties'].get('WIKIDATAID') for f in pp] + [])
places = []
for f in pp:
    p = f['properties']
    en = p.get('NAME_EN') or p.get('NAME')
    places.append({'type': 'Feature', 'geometry': f['geometry'],
                   'tippecanoe': {'minzoom': max(1, int(float(p.get('MIN_ZOOM') or 6)) - 1)},
                   'properties': {'en': en, 'ru': p.get('NAME_RU') or en, 'hy': hy.get(p.get('WIKIDATAID') or '', '') or en,
                                  'rank': p.get('SCALERANK', 10), 'cap': 1 if p.get('FEATURECLA', '').startswith('Admin-0 cap') else 0}})
nd(os.path.join(OUT, 'places.ndjson'), places)

# country label points
cs = json.load(open(os.path.join(NE, 'ne_110m_admin_0_countries.geojson')))['features']
wikidata_hy([f['properties'].get('WIKIDATAID') for f in cs])
labels = []
for f in cs:
    p = f['properties']
    en = p.get('NAME') or p.get('NAME_EN')
    labels.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [p['LABEL_X'], p['LABEL_Y']]},
                   'tippecanoe': {'minzoom': 0, 'maxzoom': 7},
                   'properties': {'en': en, 'ru': p.get('NAME_RU') or en, 'hy': hy.get(p.get('WIKIDATAID') or '', '') or en,
                                  'rank': p.get('LABELRANK', 5)}})
nd(os.path.join(OUT, 'countries.ndjson'), labels)
print('places', len(places), 'hy names', sum(1 for x in places if x['properties']['hy'] != x['properties']['en']), 'countries', len(labels))
