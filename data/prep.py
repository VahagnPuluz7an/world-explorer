"""Normalize geoBoundaries files to line-delimited GeoJSON with {id, name, iso} for tippecanoe.
Usage: python3 data/prep.py  (reads data/raw, writes data/build/*.ndjson)"""
import json, glob, os

RAW = os.path.join(os.path.dirname(__file__), 'raw')
OUT = os.path.join(os.path.dirname(__file__), 'build')
os.makedirs(OUT, exist_ok=True)


def write(features, path, iso_default=None):
    n = 0
    with open(path, 'a') as f:
        for ft in features:
            p = ft.get('properties') or {}
            g = ft.get('geometry')
            if not g or g.get('type') not in ('Polygon', 'MultiPolygon'):
                continue
            iso = p.get('shapeGroup') or p.get('shapeISO', '')[:3] or iso_default
            sid = p.get('shapeID') or f"{iso}-{p.get('shapeName')}-{n}"
            f.write(json.dumps({'type': 'Feature', 'geometry': g,
                                'properties': {'id': sid, 'name': p.get('shapeName') or '', 'iso': iso}},
                               separators=(',', ':')) + '\n')
            n += 1
    return n


for lvl in (0, 1, 2):
    out = os.path.join(OUT, f'adm{lvl}.ndjson')
    open(out, 'w').close()
    with open(os.path.join(RAW, f'cgaz{lvl}.geojson')) as f:
        print(f'adm{lvl}', write(json.load(f)['features'], out))

out = os.path.join(OUT, 'adm3.ndjson')
open(out, 'w').close()
total = 0
for path in sorted(glob.glob(os.path.join(RAW, 'adm3', '*.geojson'))):
    iso = os.path.basename(path)[:3]
    try:
        with open(path) as f:
            total += write(json.load(f)['features'], out, iso)
    except Exception as e:  # broken/missing download
        print('skip', iso, e)
print('adm3', total)
