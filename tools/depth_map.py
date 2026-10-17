"""
Deriva mapas de un poster generado:
  - depth  : mapa de profundidad aproximado (grayscale) para parallax 2.5D
  - normal : mapa de normales derivado del depth (RGB) para relieve/luz
  - alpha  : recorte suave del sujeto (para separar capas)

No usa ControlNet (no hay modelos de depth instalados): la profundidad se
aproxima por luminancia + desenfoque guiado + sesgo radial. Es una
aproximacion honesta, suficiente para mover el poster en el navegador.

Uso: python tools/depth_map.py <slug>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTERS = os.path.join(ROOT, "public", "assets", "posters")


def load(path):
    im = Image.open(path).convert("RGB")
    return im, np.asarray(im).astype(np.float32) / 255.0


def luminance(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def blur(arr, radius):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), mode="L")
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255.0


def make_depth(rgb, im):
    lum = luminance(rgb)

    # 1) luminancia suavizada: lo brillante tiende a estar "delante"
    base = blur(lum, 6)

    # 2) sesgo radial: el centro del poster se lee mas cerca que los bordes
    w, h = im.size
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2.0, h / 2.0
    r = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    radial = np.clip(1.0 - r / 1.4, 0.0, 1.0)

    # 3) micro-detalle conservado (bordes) para que el parallax no sea una mancha
    detail = lum - blur(lum, 18)
    detail = np.clip(detail * 1.6, -0.5, 0.5)

    depth = 0.62 * base + 0.34 * radial + 0.18 * detail
    depth = (depth - depth.min()) / max(1e-6, (depth.max() - depth.min()))
    # contraste util para desplazamiento
    depth = np.clip((depth - 0.5) * 1.25 + 0.5, 0, 1)
    return depth


def make_normal(depth, strength=2.4):
    gy, gx = np.gradient(depth * strength)
    nz = np.ones_like(depth)
    length = np.sqrt(gx * gx + gy * gy + nz * nz)
    nx, ny = -gx / length, -gy / length
    nz = nz / length
    normal = np.stack([(nx * 0.5 + 0.5), (ny * 0.5 + 0.5), (nz * 0.5 + 0.5)], axis=-1)
    return np.clip(normal, 0, 1)


def main():
    slug = sys.argv[1]
    src = None
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = os.path.join(POSTERS, f"{slug}{ext}")
        if os.path.exists(cand):
            src = cand
            break
    if not src:
        print(f"no existe poster para {slug} en {POSTERS}")
        return 1

    im, rgb = load(src)
    depth = make_depth(rgb, im)
    normal = make_normal(depth)

    d_path = os.path.join(POSTERS, f"{slug}-depth.png")
    n_path = os.path.join(POSTERS, f"{slug}-normal.png")

    Image.fromarray((depth * 255).astype(np.uint8), mode="L").save(d_path, optimize=True)
    Image.fromarray((normal * 255).astype(np.uint8), mode="RGB").save(n_path, optimize=True)

    print(f"{slug}: depth -> {os.path.basename(d_path)}  normal -> {os.path.basename(n_path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
