#!/usr/bin/env python3
"""Importa o ZIP de sprites preparado, preservando PNGs e manifesto."""
import json, pathlib, shutil, sys, zipfile
src=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "baby-on-screen-sprites-preparados.zip")
root=pathlib.Path(__file__).resolve().parents[1]
dest=root/"assets"/"sprites"/"generated"
allowed={"banho","fralda","alimentacao","sono","crescimento","quarto","casa","quintal","escola","npcs"}
if not src.is_file(): raise SystemExit(f"Arquivo não encontrado: {src}")
count=0
with zipfile.ZipFile(src) as z:
    for item in z.infolist():
        path=pathlib.PurePosixPath(item.filename)
        if item.is_dir() or path.is_absolute() or ".." in path.parts: continue
        parts=path.parts
        if len(parts)<2 or parts[0]!="baby_sprite_pack": continue
        relative=pathlib.Path(*parts[1:])
        if relative.parts[0] not in allowed and relative.name not in {"manifest.json","README.md"}: continue
        if relative.suffix.lower() not in {".png",".json",".md"}: continue
        target=dest/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        with z.open(item) as source, target.open("wb") as out: shutil.copyfileobj(source,out)
        count+=1
print(f"Importados {count} arquivos para {dest}")
