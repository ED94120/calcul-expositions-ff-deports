# Calcul des expositions générées par les antennes-relais à faisceau fixe à partir de la distance et des déports à l'axe
**Lancer l’application :** [https://ed94120.github.io/calcul-expositions-ff-deports/](https://ed94120.github.io/calcul-expositions-ff-deports/)

## Présentation

Cette application web calcule l’exposition électrique générée au point d’intérêt (POI) par une **antenne à faisceau fixe**, à partir de ses **diagrammes de rayonnement** stockés dans des fichiers texte sur GitHub.

Le calcul est réalisé **par bande de fréquences** après lecture automatique du fichier diagramme de l’antenne sélectionnée.  
L’exposition totale est ensuite obtenue par **composition quadratique** des expositions calculées pour chaque bande.

L’application est destinée à l’évaluation de l’exposition dans des cas où l’on connaît :

- le modèle d’antenne à faisceau fixe,
- la distance 3D entre l’antenne et le POI,
- le type de vitrage interposé,
- la PIRE par bande,
- les déports angulaires en azimut et en élévation,
- les atténuations supplémentaires propres à chaque bande.

## Ce que fait l’application

L’application :

1. charge le fichier `antenna-specs.txt` pour lister les antennes disponibles ;
2. ne propose à l’utilisateur que les **antennes à faisceau fixe** ;
3. affiche les **remarques descriptives** liées à l’antenne sélectionnée ;
4. charge automatiquement le fichier diagramme `.txt` correspondant ;
5. détecte automatiquement si l’antenne comporte **2 bandes** ou **3 bandes** ;
6. lit pour chaque bande :
   - son libellé fréquentiel,
   - son diagramme en azimut,
   - son diagramme en élévation ;
7. demande à l’utilisateur, pour chaque bande :
   - la PIRE,
   - le déport angulaire en azimut,
   - le déport angulaire en élévation,
   - l’atténuation supplémentaire ;
8. calcule pour chaque bande :
   - l’atténuation azimutale,
   - l’atténuation en élévation,
   - l’atténuation angulaire totale,
   - l’atténuation vitrage,
   - l’atténuation ANFR,
   - l’atténuation totale,
   - la PIRE finale,
   - l’exposition électrique de la bande ;
9. calcule l’**exposition totale** au POI.

## Principes de calcul

Pour chaque bande, l’application :

- interpole les pertes du diagramme en fonction du déport en azimut ;
- interpole les pertes du diagramme en fonction du déport en élévation ;
- additionne les atténuations :
  - atténuation azimutale,
  - atténuation en élévation,
  - atténuation due au vitrage,
  - atténuation supplémentaire de la bande,
  - atténuation ANFR commune à toutes les bandes ;
- calcule la PIRE finale en dBW puis en watts ;
- calcule l’exposition au POI en V/m.

L’exposition totale est calculée par :

\[
E_{total}=\sqrt{E_1^2+E_2^2+\cdots+E_n^2}
\]

## Paramètres communs

Les paramètres communs à toutes les bandes sont :

- **Antenne à faisceau fixe**
- **Distance 3D antenne – POI**
- **Type de vitrage interposé**
- **Atténuation ANFR faisceau fixe**

Par défaut, l’atténuation ANFR est fixée à **4 dB**.

## Mode expert

L’application comporte un **mode expert**.

Quand le mode expert est désactivé :

- l’atténuation ANFR est imposée à **4 dB** ;
- le champ est en lecture seule.

Quand le mode expert est activé :

- l’atténuation ANFR devient modifiable ;
- cette valeur modifiée est appliquée à toutes les bandes.

## Données utilisées

Le code de l’application est hébergé dans ce dépôt.

Les fichiers de données sont hébergés dans un autre dépôt GitHub, dans le dossier `data` du projet :

- `antenna-specs.txt`
- les fichiers diagrammes `.txt` des antennes

L’application charge ces fichiers à distance via les URLs `raw.githubusercontent.com`.

## Structure du projet

```text
calcul-expositions-ff-deports/
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
└─ js/
   ├─ angles.js
   ├─ app.js
   ├─ calculations.js
   ├─ config.js
   ├─ constants.js
   ├─ diagramParser.js
   ├─ model.js
   ├─ specsParser.js
   ├─ ui.js
   ├─ utils.js
   └─ validation.js
