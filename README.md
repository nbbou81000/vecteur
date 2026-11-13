# Vecteur

Jeu de simulation de pandémie sur une Terre 3D réaliste (prototype).

- Étape 1 : le globe (MapLibre GL, imagerie satellite, relief, bâtiments 3D, recherche de lieux).
- Étape 2 : la population mondiale — 1,37 million de points (≈ 6 000 habitants chacun) avec trajets domicile-travail selon l'heure locale, jour/nuit réel, horloge accélérable.
- Vue rue (zoom ≥ 13,5) : habitants individuels générés à partir des bâtiments et rues OpenStreetMap, avec emploi du temps et itinéraires A* à pied ou en voiture.
- Étape 3 : moteur épidémique SEIRD (Web Worker, `js/epidemie.js`) sur 165 000 cellules de 0,25°, contagion de proche en proche et par 37 000 lignes aériennes réelles ; 12 pathogènes réels + réglages bac à sable ; patient zéro au doigt ; statistiques et courbe.
- Contagion v2 : catalogue de 130 agents (`js/catalogue.js` : virus, bactéries, champignons, parasites, prions, toxines, agents chimiques en valeurs de jeu simplifiées) avec modes de transmission réels et hybrides ; profil comportemental complet du patient zéro ; contagion personne par personne dans la vue rue (`js/ville-epi.js` : air partagé, rue, transports, surfaces, eau, aliments, moustiques/tiques/puces, réservoir animal, partenaires, hôpitaux, nuages poussés par le vent) synchronisée avec le modèle mondial.

Données : population GHS-POP 2025 (Commission européenne, JRC — CC BY 4.0), imagerie Esri, cartes OpenFreeMap / OpenStreetMap, relief Mapzen/AWS, réseau aérien OpenFlights (ODbL).
