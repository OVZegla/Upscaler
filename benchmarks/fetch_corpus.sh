#!/usr/bin/env bash
# Downloads the test corpus into benchmarks/gt/.
#
# The images are the standard super-resolution benchmark sets (Set5, Set14,
# Urban100), mirrored by the SelfExSR project. They are third-party material
# under their own terms and are deliberately NOT committed to this repository
# — fetch them when you want to reproduce a measurement.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GT="$HERE/gt"
BASE="https://raw.githubusercontent.com/jbhuang0604/SelfExSR/master/data"

mkdir -p "$GT"

fetch() {
  curl -sSL --max-time 90 -o "$2" "$1"
  # A redirect or an error page is far smaller than any of these PNGs.
  if [ "$(stat -c%s "$2" 2>/dev/null || echo 0)" -lt 10000 ]; then
    rm -f "$2"
    echo "failed: $1" >&2
  fi
}

for i in $(seq 1 5); do
  n=$(printf %03d "$i")
  fetch "$BASE/Set5/image_SRF_4/img_${n}_SRF_4_HR.png" "$GT/set5_${n}.png" &
done
wait

for i in $(seq 1 14); do
  n=$(printf %03d "$i")
  fetch "$BASE/Set14/image_SRF_4/img_${n}_SRF_4_HR.png" "$GT/set14_${n}.png" &
done
wait

for i in 1 2 4 6 11 20 44 76 92 99; do
  n=$(printf %03d "$i")
  fetch "$BASE/Urban100/image_SRF_4/img_${n}_SRF_4_HR.png" "$GT/urban_${n}.png" &
done
wait

echo "corpus: $(ls -1 "$GT" | wc -l) images in $GT"
echo "now run: python3 benchmarks/make_synth.py   (adds the text / chart / line-art cases)"
