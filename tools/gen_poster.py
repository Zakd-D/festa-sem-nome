"""
Genera posters con ComfyUI (Z-Image turbo + qwen_3_4b + ae VAE) y guarda
metadatos de cada imagen (prompt, seed, modelo, tamaño, nodos).

Uso:
  python tools/gen_poster.py <slug> "<prompt>" [ancho] [alto] [seed]
"""
import json
import os
import shutil
import sys
import time
import urllib.request
import urllib.error

HOST = "http://127.0.0.1:8188"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "assets", "posters")
META_DIR = os.path.join(ROOT, "data", "posters")
COMFY_OUT = r"C:\pinokio\api\comfy.git\app\output"

UNET = "z_image_int8_convrot.safetensors"
CLIP = "qwen_3_4b_fp4_mixed.safetensors"
VAE = "ae.safetensors"


def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(HOST + path, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def get(path, timeout=30):
    with urllib.request.urlopen(HOST + path, timeout=timeout) as r:
        return json.loads(r.read().decode())


def build(prompt, negative, w, h, seed, prefix, steps=9, shift=1.75):
    return {
        "1": {"class_type": "UNETLoader",
              "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader",
              "inputs": {"clip_name": CLIP, "type": "lumina2"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "4": {"class_type": "ModelSamplingAuraFlow",
              "inputs": {"model": ["1", 0], "shift": shift}},
        "5": {"class_type": "CLIPTextEncode",
              "inputs": {"text": prompt, "clip": ["2", 0]}},
        "6": {"class_type": "CLIPTextEncode",
              "inputs": {"text": negative, "clip": ["2", 0]}},
        "7": {"class_type": "EmptySD3LatentImage",
              "inputs": {"width": w, "height": h, "batch_size": 1}},
        "8": {"class_type": "KSampler",
              "inputs": {"model": ["4", 0], "seed": seed, "steps": steps,
                         "cfg": 1.0, "sampler_name": "heun",
                         "scheduler": "linear_quadratic",
                         "positive": ["5", 0], "negative": ["6", 0],
                         "latent_image": ["7", 0], "denoise": 1.0}},
        "9": {"class_type": "VAEDecode",
              "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage",
               "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def main():
    slug = sys.argv[1]
    prompt = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 832
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 1112
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else int(time.time()) % 100000

    negative = ("text, letters, words, logo, watermark, signature, frame, "
                "low contrast, blurry, photo of a person, crowd")

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(META_DIR, exist_ok=True)

    prefix = f"fs_{slug}"
    wf = build(prompt, negative, w, h, seed, prefix)
    res = post("/prompt", {"prompt": wf, "client_id": f"fs-{slug}"})
    pid = res["prompt_id"]
    print(f"[{slug}] prompt_id={pid} seed={seed} {w}x{h}")

    t0 = time.time()
    fname = None
    while time.time() - t0 < 900:
        time.sleep(4)
        hist = get(f"/history/{pid}")
        if pid in hist:
            outs = hist[pid].get("outputs", {})
            for node in outs.values():
                for img in node.get("images", []):
                    fname = img["filename"]
            if fname:
                break
        q = get("/queue")
        if not q.get("queue_running") and not q.get("queue_pending") and pid not in hist:
            time.sleep(3)
    if not fname:
        print(f"[{slug}] TIMEOUT sin imagen")
        return 2

    src = os.path.join(COMFY_OUT, fname)
    if not os.path.exists(src):
        alt = os.path.join(ROOT, "data", "posters", fname)
        if os.path.exists(alt):
            src = alt
    dst = os.path.join(OUT_DIR, f"{slug}.png")
    shutil.copy2(src, dst)

    meta = {
        "slug": slug, "file": f"/assets/posters/{slug}.png",
        "prompt": prompt, "negative": negative, "seed": seed,
        "size": [w, h], "steps": 9, "sampler": "heun",
        "scheduler": "linear_quadratic", "cfg": 1.0,
        "models": {"unet": UNET, "clip": CLIP, "vae": VAE},
        "shift": 1.75, "source": fname, "comfy_prompt_id": pid,
        "generado": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "segundos": round(time.time() - t0, 1)
    }
    with open(os.path.join(META_DIR, f"{slug}.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"[{slug}] OK -> {dst} ({meta['segundos']}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
