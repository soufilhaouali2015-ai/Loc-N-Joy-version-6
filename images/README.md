# Photos des voitures

Chaque voiture a son dossier, affiché en carrousel automatique sur sa carte.
La première photo sert aussi de visuel unique dans la fiche technique.

| Dossier | Photos |
|---|---|
| `clio-6-esprit-alpine/` | 01 à 08 |
| `mercedes-classe-a-pack-amg/` | 01 à 04 |
| `golf-8-r-line/` | 01 à 06 |
| `clio-5-e-tech/` | 01 à 07 |
| `megane-4-intense/` | 01 à 05 |
| `citroen-ds3-hdi-112/` | 01 à 06 |
| `peugeot-208/` | 01 à 05 |
| `renault-twingo-3/` | 01 à 05 |
| `fiat-500/` | 01 à 04 |

Format : JPG 1280 × 800 (16/10), qualité 85, progressif.

## Traitement appliqué

- **Plaques d'immatriculation effacées** : la zone est reconstruite par diffusion
  de la carrosserie qui l'entoure (résolution de Laplace sur les pixels du
  contour, plus un grain léger). Il ne reste ni plaque ni rectangle de masquage.
- **Enseignes et logos de professionnels floutés** : bandeaux de pare-brise,
  panneaux muraux et plaques publicitaires des garages.
- **Recadrage uniforme** pour que le carrousel ne saute jamais d'une photo à l'autre.

Le script de traitement est reproductible : voir la section « Retraiter les photos »
du README à la racine.

## Ajouter ou remplacer une photo

Déposez un JPG 1280 × 800 dans le dossier voulu en suivant la numérotation,
puis ajoutez son numéro à la liste `imgs` de la voiture dans `js/main.js`.
Si un fichier manque, la carte bascule automatiquement sur un visuel de
remplacement (dégradé aux couleurs de la voiture) : rien ne casse jamais.

## Logo

Déposez votre logo sous `images/logo.png` : il remplace automatiquement le
mot-symbole du header et du portail. Format conseillé : PNG à fond transparent,
hauteur 84 px minimum, version claire (le header est sombre).
