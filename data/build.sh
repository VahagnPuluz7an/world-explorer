#!/bin/sh
# Builds public/tiles/admin.pmtiles from data/build/*.ndjson (run data/prep.py first).
set -e
cd "$(dirname "$0")/build"
common="--no-feature-limit --no-tile-size-limit --detect-shared-borders --simplification=4 -P --force -q"
tippecanoe -o adm0.pmtiles -l adm0 -Z0 -z6 $common adm0.ndjson
tippecanoe -o adm1.pmtiles -l adm1 -Z1 -z8 $common adm1.ndjson
tippecanoe -o adm2.pmtiles -l adm2 -Z3 -z9 $common adm2.ndjson
tippecanoe -o adm3.pmtiles -l adm3 -Z5 -z9 $common adm3.ndjson
mkdir -p ../../public/tiles
cp adm0.pmtiles adm1.pmtiles adm2.pmtiles adm3.pmtiles ../../public/tiles/
ls -lh ../../public/tiles/
