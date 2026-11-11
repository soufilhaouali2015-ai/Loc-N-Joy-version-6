# Loc'N'Joy · Location de voitures à Paris

Site vitrine one page de location de voitures (agence à Paris), en vanilla HTML/CSS/JS (zéro dépendance).
Direction artistique « route de nuit » : asphalte bleu nuit, ambre des phares, rouge feux arrière.

## Lancer le site

Aucun build nécessaire :

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

Ou simplement ouvrir `index.html` dans un navigateur.

## Ce qu'il contient

- **Loader compteur de vitesse** : aiguille, arc et check-list de départ animés.
- **Hero génératif** : canvas « autoroute de nuit » (marquage défilant, phares et feux arrière), le pointeur braque le point de fuite.
- **Recherche de disponibilité** : ville, dates, catégorie → filtre la flotte et pré-remplit le calculateur.
- **Catalogue flotte** (9 voitures : citadines premium en boîte automatique, citadines petit budget en boîte manuelle et sans caution) : cartes 3D tilt en rangées de 3, carrousel photo automatique par carte, fiche technique complète en modale façon constructeur (une seule photo). Voir `images/README.md`.
- **Espace Loc'N'Joy** (`espace.html`, hors référencement) : portail à deux entrées, compte particulier avec suivi des réservations, espace admin protégé avec KPI, filtres, recherche, changement de statut et export CSV. Les demandes envoyées depuis le site arrivent directement dans l'espace admin.
- **Calculateur de prix** : durée, options, remise longue durée (−10 % dès 7 jours), total en direct.
- **Mini-jeu « Le Slalom »** : évitez les cônes sur 800 m et gagnez un code promo (clavier, swipe, d-pad).
- **Signature** : ligne médiane de route dessinée au scroll avec marqueur-voiture, scroll inertiel avec skew, traînée de phares derrière le curseur, marquee, textes scramble, compteurs, accordéons, avis rotatifs, formulaire conversationnel, stickers draggables, easter egg (tapez `vroom`).

## Images

Les photos des voitures sont dans `images/`, une par dossier de modèle. Elles ont
été traitées pour effacer les plaques d'immatriculation et flouter les enseignes
des professionnels (voir `images/README.md`). Chaque visuel possède un **secours
génératif intégré** (dégradé + silhouette SVG) : si une photo manque, le site
reste impeccable, aucune image cassée possible.

### Retraiter les photos

Le script de traitement (recadrage, effacement des plaques, floutage) se relance avec :

```bash
pip install pillow numpy
python3 scripts/process-photos.py
```

## Réservations par email

Le formulaire « Réserver » (véhicule, agence d'Aubervilliers ou livraison, dates et
heures, extras, coordonnées) envoie chaque demande à **locnjoy75@gmail.com** via
[FormSubmit](https://formsubmit.co), sans serveur à gérer.

**À faire une seule fois** : à la toute première demande envoyée depuis le site en
ligne, FormSubmit envoie à locnjoy75@gmail.com un email « Activate Form ». Cliquez sur
le lien : les demandes suivantes arrivent directement. Tant que ce n'est pas fait, le
client voit un bouton pour envoyer sa demande par email lui-même.

Les extras et leurs prix se modifient dans la liste `EXTRAS` en haut de la section
« 9. RÉSERVATION » de `js/main.js`.

## Espace et stockage des données

`espace.html` sert à la fois le compte particulier et l'espace admin. Tout est
stocké dans le `localStorage` du navigateur (clés `lnj_*`), donc les données
restent sur l'appareil et ne partent sur aucun serveur.

**À savoir avant une mise en ligne réelle** : une page statique ne peut pas garder
un secret. Le mot de passe admin est vérifié dans le navigateur, ce qui filtre les
visiteurs mais ne protège pas de quelqu'un qui lit le code. Pour un vrai verrou, il
faut une authentification côté serveur et une base de données.

## Accessibilité & robustesse

- `prefers-reduced-motion` respecté (canvas et animations désactivés).
- Fallbacks tactiles (d-pad du jeu, scroll natif, pas de curseur custom).
- Navigation clavier : focus visibles, modale fermable à Échap, ARIA sur menus/accordéons/onglets.
- Responsive jusqu'à 360 px, sans débordement horizontal.
