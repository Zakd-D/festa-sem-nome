"""
Extrae metadatos de la galeria de referencia (Neosdl) desde el HTML guardado.
El sitio es un export tipo Zyro: los textos viven en JSON serializado dentro de
`content:[0,"<p ...>TEXTO</p>"]`. Se deserializa, se limpian las etiquetas y se
emparejan titulo (mayusculas) + descripcion corta.

Salida: data/references-neosdl.json
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(ROOT), "Festa sin nome",
                   "Neosdl\u2122_ Galer\u00eda de p\u00f3steres Vaporwave y "
                   "Anti-Dise\u00f1o _ NEOSDL.html")


def texts(raw):
    out = []
    for m in re.finditer(r'content&quot;:\[0,&quot;(.*?)&quot;\]', raw, re.S):
        chunk = html.unescape(m.group(1))
        chunk = chunk.replace('\\"', '"')
        plain = re.sub(r"<[^>]+>", " ", chunk)
        plain = html.unescape(plain)
        plain = re.sub(r"\s+", " ", plain).strip(" ,.")
        if 2 <= len(plain) <= 140:
            out.append(plain)
    # dedup conservando orden
    seen, uniq = set(), []
    for t in out:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            uniq.append(t)
    return uniq


def main():
    if not os.path.exists(SRC):
        print("no encuentro el HTML de referencia:", SRC)
        return 1
    raw = open(SRC, encoding="utf-8", errors="ignore").read()
    ts = texts(raw)

    items, pending = [], None
    for t in ts:
        stripped = t.strip()
        is_title = (stripped.upper() == stripped and
                    any(c.isalpha() for c in stripped) and
                    len(stripped) <= 60 and
                    not re.search(r"(WORKS|GALLERY|STORE|CONTACT|VIEW|LEARN)", stripped))
        if is_title:
            if pending:
                items.append(pending)
            pending = {"title": stripped, "tagline": ""}
        elif pending and not pending["tagline"]:
            pending["tagline"] = stripped
    if pending:
        items.append(pending)

    # limpia duplicados de titulo exacto
    seen, final = set(), []
    for it in items:
        k = it["title"].lower()
        if k not in seen:
            seen.add(k)
            final.append(it)

    dst = os.path.join(ROOT, "data", "references-neosdl.json")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump({"fuente": "https://neosdl-work.com/gallery",
                   "estilo": ["vaporwave", "anti-design", "poster editorial",
                              "tipografia monoespaciada", "grano y scanlines",
                              "un solo elemento por pieza", "fondo negro"],
                   "items": final}, f, ensure_ascii=False, indent=2)

    print(f"{len(final)} items -> {dst}")
    for it in final[:20]:
        print(f"  - {it['title']} :: {it['tagline']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
