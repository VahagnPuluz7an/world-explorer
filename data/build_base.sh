#!/bin/sh
# Light basemap tiles (land, lakes, labels) -> public/tiles/base.pmtiles. Run data/base.py first.
set -e
cd "$(dirname "$0")"
NE=raw/ne
tippecanoe -o build/base.pmtiles --force -q -Z0 -z7 --no-tile-size-limit --simplification=2 --detect-shared-borders \
  -L land:$NE/ne_10m_land.geojson -L lakes:$NE/ne_50m_lakes.geojson \
  -L places:build/places.ndjson -L countries:build/countries.ndjson -r1
cp build/base.pmtiles ../public/tiles/
ls -lh ../public/tiles/base.pmtiles
