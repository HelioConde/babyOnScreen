#!/usr/bin/env bash
# Execute a partir da raiz do clone local do repositório.
set -euo pipefail
ZIP="${1:-baby-on-screen-sprites-preparados.zip}"
BRANCH="feat/revival-windows-2026"
if [[ ! -f "$ZIP" ]]; then echo "ZIP não encontrado: $ZIP" >&2; exit 1; fi
git fetch origin "$BRANCH"
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"
python3 tools/import_sprite_pack.py "$ZIP"
count=$(find assets/sprites/generated -type f -name '*.png' | wc -l)
echo "PNGs presentes: $count"
if [[ "$count" -lt 565 ]]; then echo "ERRO: esperado pelo menos 565 PNGs." >&2; exit 1; fi
git add assets/sprites/generated
if git diff --cached --quiet; then echo "Sem arquivos novos para enviar."; exit 0; fi
git commit -m "assets: import 565 organized Baby On Screen sprite PNGs"
git push origin "$BRANCH"
echo "Upload concluído; verifique a branch $BRANCH no GitHub."
