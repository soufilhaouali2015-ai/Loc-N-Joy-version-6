"""Traitement des photos Loc'N'Joy :
   - effacement RÉEL des plaques (diffusion de la carrosserie autour, pas de rectangle)
   - floutage des enseignes / logos de professionnels
   - recadrage uniforme 16/10 en 1280 x 800
"""
from PIL import Image, ImageFilter
import numpy as np
import os, shutil

SRC = '/tmp/claude-0/-home-user-LOCNJOY-V5/b4dac077-fc47-5784-9425-f3ee7d99678b/scratchpad/photos'
OUT = '/home/user/LOCNJOY-V5/images'
TW, TH = 1280, 800
clamp = lambda v, a, b: min(max(v, a), b)


def frac_box(size, f, pad=0):
    w, h = size
    x0 = int(f[0] * w) - pad; y0 = int(f[1] * h) - pad
    x1 = int(f[2] * w) + pad; y1 = int(f[3] * h) + pad
    return (max(0, x0), max(0, y0), min(w, x1), min(h, y1))


def blur_box(im, f):
    """Floute une zone (enseigne, logo de garage)."""
    x0, y0, x1, y1 = frac_box(im.size, f)
    if x1 <= x0 or y1 <= y0:
        return
    r = max(10, (x1 - x0) // 6)
    im.paste(im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(radius=r)), (x0, y0))


def erase(im, f, iters=420, grain=2.6):
    """Efface une plaque : la zone est reconstruite par diffusion de la
    carrosserie qui l'entoure, de sorte qu'il ne reste ni plaque ni rectangle."""
    x0, y0, x1, y1 = frac_box(im.size, f)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return
    m = 6  # marge de contexte utilisée comme condition aux limites
    ax0, ay0 = max(0, x0 - m), max(0, y0 - m)
    ax1, ay1 = min(im.size[0], x1 + m), min(im.size[1], y1 + m)

    a = np.asarray(im.crop((ax0, ay0, ax1, ay1)), dtype=np.float64)
    hole = np.zeros(a.shape[:2], dtype=bool)
    hole[y0 - ay0:y1 - ay0, x0 - ax0:x1 - ax0] = True

    # amorçage : moyenne du contour, puis diffusion de Laplace (bords figés)
    ring = (~hole) & np.pad(hole, 1)[1:-1, 1:-1]
    a[hole] = a[ring].mean(axis=0) if ring.any() else a[~hole].mean(axis=0)

    for _ in range(iters):
        nb = np.zeros_like(a)
        nb[1:-1, 1:-1] = (a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]) / 4.0
        a[hole] = nb[hole]

    # grain léger : une surface parfaitement lisse trahirait la retouche
    if grain:
        noise = np.random.default_rng(7).normal(0, grain, a.shape)
        a[hole] += noise[hole]

    im.paste(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), (ax0, ay0))


def crop_resize(im, fx=0.5, fy=0.5):
    w, h = im.size
    ratio = TW / TH
    if w / h > ratio:
        cw, ch = int(h * ratio), h
        x0, y0 = int(clamp(fx * w - cw / 2, 0, w - cw)), 0
    else:
        cw, ch = w, int(w / ratio)
        x0, y0 = 0, int(clamp(fy * h - ch / 2, 0, h - ch))
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize((TW, TH), Image.LANCZOS)


JOBS = {
    'clio-6-esprit-alpine': [
        ('Clio_6_Esprit_Alpine/1057885603.png', dict(fy=0.55,
            blur=[(0.365, 0.085, 0.462, 0.130), (0.325, 0.260, 0.445, 0.335)],
            erase=[(0.762, 0.604, 0.836, 0.684)])),
        ('Clio_6_Esprit_Alpine/1619934549.png', dict(fy=0.52,
            blur=[(0.162, 0.088, 0.283, 0.138), (0.900, 0.315, 1.0, 0.470)])),
        ('Clio_6_Esprit_Alpine/221846061.png', dict(fy=0.52,
            blur=[(0.818, 0.243, 0.922, 0.298)],
            erase=[(0.103, 0.520, 0.212, 0.620)])),
        ('Clio_6_Esprit_Alpine/954966185.png', dict(fy=0.55,
            blur=[(0.320, 0.125, 0.445, 0.208), (0.382, 0.060, 0.518, 0.108)],
            erase=[(0.394, 0.776, 0.548, 0.868)])),
        ('Clio_6_Esprit_Alpine/509660342.png', dict(fy=0.52,
            blur=[(0.580, 0.072, 0.695, 0.165), (0.0, 0.200, 0.115, 0.285)],
            erase=[(0.606, 0.583, 0.822, 0.678)])),
        ('Clio_6_Esprit_Alpine/1674141924.png', dict(fy=0.5)),
        ('Clio_6_Esprit_Alpine/635891576.png', dict(fy=0.5)),
        ('Clio_6_Esprit_Alpine/239328678.png', dict(fy=0.5,
            blur=[(0.355, 0.0, 0.520, 0.045)])),
    ],
    'clio-5-e-tech': [
        ('Clio_5_E_tech/3310526_iuado.png', dict(fx=0.47,
            erase=[(0.176, 0.706, 0.256, 0.794)])),
        ('Clio_5_E_tech/3310526_admgc.png', dict(fx=0.5)),
        ('Clio_5_E_tech/3310526_sgnld.png', dict(fx=0.48,
            erase=[(0.184, 0.531, 0.254, 0.616)])),
        ('Clio_5_E_tech/3310526_hrumh.png', dict(fx=0.5,
            erase=[(0.422, 0.661, 0.561, 0.769)])),
        ('Clio_5_E_tech/clio_5.png', dict()),
        ('Clio_5_E_tech/Renault-Clio-V-188657.jpg', dict()),
        ('Clio_5_E_tech/renault-clio-v-tce-90-techno-phase-2--berline-38470km-essence-voiture-occasion-seine-et-marne-0845-0003440-14ee39.png', dict()),
    ],
    # Mercedes : les deux extérieurs de showroom sont remplacés par les photos
    # de rue fournies (plaques déjà retirées), les intérieurs sont conservés.
    'mercedes-classe-a-pack-amg': [
        ('Mercedes_v2/b05998b9-295a-47dc-84c2-48c1e4860e66.jpeg', dict(fy=0.62)),
        ('Mercedes_v2/7198b76b-94e6-4981-a7e7-f2a6c751c839.jpeg', dict(fy=0.60)),
        ('Mercedes_v2/WhatsApp-Image-2024-06-18-at-8.40.37-PM-3.png', dict(fy=0.60,
            blur=[(0.0, 0.112, 0.065, 0.212)])),
        ('Mercedes_v2/WhatsApp-Image-2024-06-18-at-8.40.38-PM.png', dict(fy=0.55)),
    ],
}

# Golf et Mégane : dossiers déjà calibrés (1280 x 800, plaques retirées)
READY = {
    'golf-8-r-line': 'Golf_v2/golf-8-r-line',
    'megane-4-intense': 'Megane_v2/megane-4-intense',
}

for slug, files in JOBS.items():
    outdir = os.path.join(OUT, slug)
    os.makedirs(outdir, exist_ok=True)
    for old in os.listdir(outdir):
        if old.endswith('.jpg'):
            os.remove(os.path.join(outdir, old))
    for i, (rel, ops) in enumerate(files, 1):
        im = Image.open(os.path.join(SRC, rel)).convert('RGB')
        for f in ops.get('blur', []):
            blur_box(im, f)
        for f in ops.get('erase', []):
            erase(im, f)
        path = os.path.join(outdir, f'{i:02d}.jpg')
        crop_resize(im, ops.get('fx', 0.5), ops.get('fy', 0.5)).save(
            path, 'JPEG', quality=85, optimize=True, progressive=True)
        print(f'{slug}/{i:02d}.jpg  <-  {rel}')

for slug, rel in READY.items():
    outdir = os.path.join(OUT, slug)
    os.makedirs(outdir, exist_ok=True)
    for old in os.listdir(outdir):
        if old.endswith('.jpg'):
            os.remove(os.path.join(outdir, old))
    srcdir = os.path.join(SRC, rel)
    for i, name in enumerate(sorted(os.listdir(srcdir)), 1):
        im = Image.open(os.path.join(srcdir, name)).convert('RGB')
        path = os.path.join(outdir, f'{i:02d}.jpg')
        (im if im.size == (TW, TH) else crop_resize(im)).save(
            path, 'JPEG', quality=85, optimize=True, progressive=True)
        print(f'{slug}/{i:02d}.jpg  <-  {rel}/{name}')
