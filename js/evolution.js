/* =====================================================================
   VECTEUR — arbre d'évolution du pathogène (mode campagne)
   [id, catégorie, nom, coût, prérequis, effets, description]
   Effets : r0 (+% de contagiosité), lethal (létalité ajoutée), severity (gravité visible :
   accélère la détection et la riposte), stealth (discrétion), cold / heat (résistance au froid /
   à la chaleur), drug (résistance aux traitements), cureSlow (ralentit le vaccin), air, water,
   vector, animal, blood (nouvelles voies), modes (lettres ajoutées pour la vue rue), cure (recul
   immédiat de la recherche, en points).
   ===================================================================== */
window.EVOLUTION = [
  // ---------------- TRANSMISSION ----------------
  ['air1', 'transmission', 'Aérosols I', 9, [], { air: 0.5, r0: 0.06, modes: 'A' }, 'Reste en suspension dans l’air des lieux clos ; voyage mieux en avion.'],
  ['air2', 'transmission', 'Aérosols II', 15, ['air1'], { air: 0.5, r0: 0.08 }, 'Particules ultrafines : les systèmes de ventilation deviennent des alliés.'],
  ['eau1', 'transmission', 'Eau I', 8, [], { water: 0.5, r0: 0.04, modes: 'O' }, 'Survit dans l’eau ; redoutable là où l’assainissement est faible.'],
  ['eau2', 'transmission', 'Eau II', 13, ['eau1'], { water: 0.5, r0: 0.05 }, 'Résiste au traitement de l’eau.'],
  ['surf1', 'transmission', 'Surfaces I', 7, [], { r0: 0.05, modes: 'F' }, 'Persiste sur les poignées, les comptoirs, les barres de métro.'],
  ['surf2', 'transmission', 'Contact II', 12, ['surf1'], { r0: 0.07, modes: 'C' }, 'Une poignée de main suffit.'],
  ['ins1', 'transmission', 'Insectes I', 10, [], { vector: 0.5, modes: 'M' }, 'Les moustiques le transportent ; fort en climat chaud.'],
  ['ins2', 'transmission', 'Insectes II', 16, ['ins1'], { vector: 0.5, r0: 0.05 }, 'S’adapte aux moustiques des régions tempérées.'],
  ['ani1', 'transmission', 'Rongeurs', 8, [], { animal: 0.5, modes: 'P' }, 'Rats et puces deviennent porteurs.'],
  ['ani2', 'transmission', 'Bétail et faune', 12, ['ani1'], { animal: 0.5, r0: 0.03, modes: 'Z' }, 'Réservoir animal dans les campagnes.'],
  ['sang', 'transmission', 'Sang', 9, [], { blood: 0.6, r0: 0.03, modes: 'B' }, 'Transfusions, seringues, soins.'],
  ['sexe', 'transmission', 'Voie sexuelle', 7, [], { blood: 0.4, r0: 0.03, modes: 'S' }, 'Discret et durable.'],
  ['alim', 'transmission', 'Aliments', 7, [], { water: 0.3, r0: 0.03, modes: 'N' }, 'Se glisse dans la chaîne alimentaire.'],
  ['ultra', 'transmission', 'Contagiosité extrême', 25, ['air2', 'surf2'], { r0: 0.25 }, 'Combinaison de toutes les voies aériennes et de contact.'],
  // ---------------- SYMPTÔMES ----------------
  ['toux', 'symptome', 'Toux', 3, [], { r0: 0.05, severity: 0.3, modes: 'R' }, 'Projette des gouttelettes autour du malade.'],
  ['eternue', 'symptome', 'Éternuements', 4, ['toux'], { r0: 0.07, severity: 0.3 }, 'Nuage de gouttelettes à plusieurs mètres.'],
  ['fievre', 'symptome', 'Fièvre', 4, [], { r0: 0.02, severity: 0.6, lethal: 0.002 }, 'Affaiblit, mais se remarque.'],
  ['sueurs', 'symptome', 'Sueurs', 3, ['fievre'], { r0: 0.03, severity: 0.3 }, 'Contamine les surfaces touchées.'],
  ['nausee', 'symptome', 'Nausées', 2, [], { severity: 0.3 }, 'Premier signe digestif.'],
  ['vomi', 'symptome', 'Vomissements', 5, ['nausee'], { r0: 0.05, severity: 0.8, lethal: 0.003, modes: 'O' }, 'Projections très contagieuses.'],
  ['diarrhee', 'symptome', 'Diarrhée', 6, ['nausee'], { r0: 0.06, severity: 0.8, lethal: 0.004, modes: 'O' }, 'Contamine l’eau et les sanitaires.'],
  ['eruption', 'symptome', 'Éruption cutanée', 3, [], { r0: 0.03, severity: 0.4, modes: 'C' }, 'Lésions contagieuses au toucher.'],
  ['insomnie', 'symptome', 'Insomnie', 3, [], { severity: 0.4, lethal: 0.001 }, 'Épuise les malades.'],
  ['paranoia', 'symptome', 'Paranoïa', 4, ['insomnie'], { severity: 0.6, stealth: 0.2 }, 'Les malades fuient les médecins.'],
  ['pneumonie', 'symptome', 'Pneumonie', 8, ['toux'], { r0: 0.06, severity: 1, lethal: 0.01 }, 'Les poumons se remplissent.'],
  ['lesions', 'symptome', 'Lésions pulmonaires', 12, ['pneumonie'], { severity: 1, lethal: 0.04 }, 'Fibrose irréversible.'],
  ['hemo', 'symptome', 'Hémorragies', 15, ['fievre'], { r0: 0.05, severity: 2, lethal: 0.08, modes: 'B' }, 'Saignements internes et externes.'],
  ['cerveau', 'symptome', 'Atteinte cérébrale', 14, ['paranoia'], { severity: 1.5, lethal: 0.06 }, 'Encéphalite, confusion.'],
  ['coma', 'symptome', 'Coma', 18, ['cerveau'], { severity: 2, lethal: 0.15 }, 'Les malades ne se réveillent plus.'],
  ['paralysie', 'symptome', 'Paralysie', 16, ['coma'], { severity: 2, lethal: 0.1 }, 'Le système nerveux lâche.'],
  ['organes', 'symptome', 'Défaillance d’organes', 20, ['hemo'], { severity: 2, lethal: 0.2 }, 'Foie, reins, cœur s’arrêtent un à un.'],
  ['arret', 'symptome', 'Arrêt cardiaque', 28, ['organes'], { severity: 3, lethal: 0.35 }, 'Mort subite.'],
  // ---------------- CAPACITÉS ----------------
  ['froid1', 'capacite', 'Résistance au froid I', 6, [], { cold: 0.5 }, 'Survit mieux dans les pays froids.'],
  ['froid2', 'capacite', 'Résistance au froid II', 10, ['froid1'], { cold: 0.5 }, 'Indifférent à l’hiver.'],
  ['chaud1', 'capacite', 'Résistance à la chaleur I', 6, [], { heat: 0.5 }, 'Supporte la chaleur et l’humidité.'],
  ['chaud2', 'capacite', 'Résistance à la chaleur II', 10, ['chaud1'], { heat: 0.5 }, 'Prospère sous les tropiques.'],
  ['medoc1', 'capacite', 'Résistance aux traitements I', 8, [], { drug: 0.4 }, 'Les soins des pays riches sauvent moins de malades.'],
  ['medoc2', 'capacite', 'Résistance aux traitements II', 14, ['medoc1'], { drug: 0.4 }, 'Multirésistance.'],
  ['durci1', 'capacite', 'Durcissement génétique I', 12, [], { cureSlow: 0.3 }, 'Ralentit la recherche du vaccin.'],
  ['durci2', 'capacite', 'Durcissement génétique II', 20, ['durci1'], { cureSlow: 0.3 }, 'Le vaccin devient un casse-tête.'],
  ['reorg1', 'capacite', 'Réorganisation génétique I', 15, [], { cure: -15 }, 'Mutation soudaine : la recherche recule de 15 points.'],
  ['reorg2', 'capacite', 'Réorganisation génétique II', 25, ['reorg1'], { cure: -25 }, 'Mutation majeure : la recherche recule de 25 points.'],
  ['discret', 'capacite', 'Discrétion', 8, [], { stealth: 1, severity: -0.3 }, 'Plus de porteurs sans symptômes ; détection retardée.']
];
window.EVO_CATS = [['transmission', 'Transmission'], ['symptome', 'Symptômes'], ['capacite', 'Capacités']];
