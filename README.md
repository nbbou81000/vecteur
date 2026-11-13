# Vecteur

Jeu de simulation de pandémie sur une Terre 3D réaliste (prototype).

- Étape 1 : le globe (MapLibre GL, imagerie satellite, relief, bâtiments 3D, recherche de lieux).
- Étape 2 : la population mondiale — 1,37 million de points (≈ 6 000 habitants chacun) avec trajets domicile-travail selon l'heure locale, jour/nuit réel, horloge accélérable.
- Vue rue (zoom ≥ 13,5) : habitants individuels générés à partir des bâtiments et rues OpenStreetMap, avec emploi du temps et itinéraires A* à pied ou en voiture.

Données : population GHS-POP 2025 (Commission européenne, JRC — CC BY 4.0), imagerie Esri, cartes OpenFreeMap / OpenStreetMap, relief Mapzen/AWS.
