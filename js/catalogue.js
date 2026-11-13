/* =====================================================================
   VECTEUR — catalogue des agents
   Valeurs indicatives tirées de la littérature (sans vaccin, traitement ni mesures),
   arrondies pour le jeu. Les agents chimiques et toxines utilisent des valeurs de jeu
   simplifiées (rayon, persistance, gravité), pas des données toxicologiques.

   Format : [id, nom, catégorie, R0, incubation (j), contagiosité (j), létalité,
             modes, part d'asymptomatiques, survie sur surfaces (h), description, rayon (km, agents dispersés)]

   Modes de transmission :
     R gouttelettes (proximité)   A aérosols (air partagé)   C contact direct
     F surfaces contaminées       O eau / féco-oral          N aliments
     S voie sexuelle              B sang                     M moustiques
     T tiques                     P puces / rongeurs         L poux
     Z animaux (réservoir)        E source environnementale (pas de transmission interhumaine)
     K exposition chimique / toxique
   ===================================================================== */
window.CATALOGUE = [
  // ---------------- VIRUS respiratoires ----------------
  ['grippe', 'Grippe saisonnière', 'virus', 1.3, 2, 4, 0.001, 'RAF', 0.3, 24, 'Le classique de l’hiver.'],
  ['h1n1-1918', 'Grippe espagnole (H1N1, 1918)', 'virus', 2.0, 2, 4, 0.025, 'RAF', 0.2, 24, 'La pire pandémie du XXᵉ siècle : 50 millions de morts.'],
  ['h2n2-1957', 'Grippe asiatique (H2N2, 1957)', 'virus', 1.7, 2, 4, 0.0025, 'RAF', 0.3, 24, '1 à 2 millions de morts.'],
  ['h3n2-1968', 'Grippe de Hong Kong (H3N2, 1968)', 'virus', 1.8, 2, 4, 0.002, 'RAF', 0.3, 24, '1 à 4 millions de morts.'],
  ['h1n1-2009', 'Grippe A (H1N1, 2009)', 'virus', 1.5, 2, 4, 0.0002, 'RAF', 0.4, 24, 'Pandémie très contagieuse mais peu mortelle.'],
  ['h5n1', 'Grippe aviaire H5N1', 'virus', 0.2, 4, 7, 0.5, 'RZF', 0.1, 48, 'Rarement transmise entre humains, mais redoutable.'],
  ['h7n9', 'Grippe aviaire H7N9', 'virus', 0.1, 5, 7, 0.39, 'RZF', 0.1, 48, 'Issue des marchés de volailles.'],
  ['covid', 'Covid-19 (souche 2020)', 'virus', 2.7, 5, 7, 0.007, 'RAF', 0.35, 48, 'Le SARS-CoV-2 d’origine.'],
  ['delta', 'Covid-19 Delta', 'virus', 5, 4, 7, 0.009, 'RAF', 0.3, 48, 'Variant de 2021, plus contagieux et plus grave.'],
  ['omicron', 'Covid-19 Omicron', 'virus', 8, 3, 5, 0.002, 'RAF', 0.45, 48, 'Variant extrêmement contagieux.'],
  ['sras', 'SRAS (2003)', 'virus', 2.5, 5, 10, 0.1, 'RFC', 0.1, 72, 'Contenu en quelques mois.'],
  ['mers', 'MERS', 'virus', 0.7, 5, 10, 0.35, 'RZC', 0.2, 48, 'Transmis par les dromadaires, surtout à l’hôpital.'],
  ['rougeole', 'Rougeole', 'virus', 15, 11, 8, 0.003, 'RA', 0.05, 2, 'Un des virus les plus contagieux connus.'],
  ['oreillons', 'Oreillons', 'virus', 5, 17, 9, 0.0001, 'RC', 0.3, 4, 'Gonflement des glandes salivaires.'],
  ['rubeole', 'Rubéole', 'virus', 6, 17, 14, 0.00001, 'RC', 0.5, 4, 'Bénigne, mais dangereuse pendant la grossesse.'],
  ['varicelle', 'Varicelle', 'virus', 10, 14, 7, 0.0002, 'RAC', 0.05, 2, 'Très contagieuse, surtout chez l’enfant.'],
  ['variole', 'Variole majeure', 'virus', 5, 12, 14, 0.3, 'RCF', 0, 72, 'Éradiquée en 1980 après 300 millions de morts au XXᵉ siècle.'],
  ['variole-mineure', 'Variole mineure', 'virus', 5, 12, 14, 0.01, 'RCF', 0, 72, 'Forme atténuée de la variole.'],
  ['vrs', 'Virus respiratoire syncytial (VRS)', 'virus', 3, 5, 7, 0.0003, 'RCF', 0.3, 6, 'Bronchiolite des nourrissons.'],
  ['rhume', 'Rhume (rhinovirus)', 'virus', 2, 2, 7, 0, 'RCF', 0.3, 6, 'Inoffensif mais omniprésent.'],
  ['adenovirus', 'Adénovirus', 'virus', 2.5, 6, 10, 0.0001, 'RCF', 0.4, 168, 'Survit très longtemps sur les surfaces.'],
  ['metapneumo', 'Métapneumovirus humain', 'virus', 2, 5, 7, 0.0003, 'RCF', 0.3, 12, 'Proche du VRS.'],
  ['ev-d68', 'Entérovirus D68', 'virus', 1.8, 3, 7, 0.0001, 'RCF', 0.5, 24, 'Peut causer des paralysies chez l’enfant.'],
  // ---------------- VIRUS hémorragiques et de contact ----------------
  ['ebola', 'Ebola (Zaïre)', 'virus', 1.8, 9, 10, 0.5, 'CBFZ', 0, 48, 'Transmis par les fluides corporels, y compris des défunts.'],
  ['ebola-soudan', 'Ebola (Soudan)', 'virus', 1.5, 9, 10, 0.45, 'CBFZ', 0, 48, 'Autre souche d’Ebola.'],
  ['marburg', 'Marburg', 'virus', 1.5, 8, 10, 0.5, 'CBFZ', 0, 48, 'Cousin d’Ebola, porté par les chauves-souris.'],
  ['lassa', 'Fièvre de Lassa', 'virus', 0.3, 10, 14, 0.01, 'PZCB', 0.8, 24, 'Transmise par les rongeurs en Afrique de l’Ouest.'],
  ['nipah', 'Nipah', 'virus', 0.5, 9, 10, 0.6, 'ZRC', 0.1, 24, 'Porté par les chauves-souris frugivores.'],
  ['hendra', 'Hendra', 'virus', 0.1, 10, 10, 0.57, 'ZC', 0.1, 24, 'Transmis par les chevaux.'],
  ['ccfh', 'Fièvre hémorragique Crimée-Congo', 'virus', 0.4, 4, 10, 0.3, 'TCBZ', 0.5, 24, 'Tiques et contact avec le sang.'],
  ['hantavirus', 'Hantavirus (Andes)', 'virus', 0.6, 18, 10, 0.35, 'PZR', 0.1, 48, 'Rongeurs ; la souche Andes passe entre humains.'],
  ['mpox-1', 'Mpox (clade I)', 'virus', 1.1, 9, 21, 0.04, 'CSRF', 0.1, 72, 'Variole du singe, forme la plus grave.'],
  ['mpox-2', 'Mpox (clade II)', 'virus', 1.4, 9, 21, 0.002, 'SCF', 0.1, 72, 'Forme à l’origine de l’épidémie mondiale de 2022.'],
  ['vih', 'VIH (sans traitement)', 'virus', 3, 30, 3650, 0.95, 'SB', 0.9, 0, 'Lent, silencieux, mortel sans traitement.'],
  ['hepatite-b', 'Hépatite B', 'virus', 2, 90, 180, 0.01, 'SB', 0.7, 168, 'Très contagieuse par le sang.'],
  ['hepatite-c', 'Hépatite C', 'virus', 1.5, 50, 365, 0.02, 'B', 0.8, 96, 'Souvent chronique, attaque le foie.'],
  ['htlv', 'HTLV-1', 'virus', 1.2, 60, 3650, 0.04, 'SB', 0.95, 0, 'Rétrovirus silencieux.'],
  // ---------------- VIRUS digestifs ----------------
  ['norovirus', 'Norovirus (gastro-entérite)', 'virus', 2.5, 1.2, 3, 0.00002, 'OFNC', 0.3, 336, 'La gastro qui vide les bateaux de croisière.'],
  ['rotavirus', 'Rotavirus', 'virus', 3, 2, 6, 0.0003, 'OFC', 0.3, 240, 'Diarrhées sévères des jeunes enfants.'],
  ['hepatite-a', 'Hépatite A', 'virus', 2.5, 28, 14, 0.003, 'ONF', 0.7, 720, 'Eau et aliments contaminés.'],
  ['hepatite-e', 'Hépatite E', 'virus', 1.5, 40, 14, 0.01, 'ON', 0.7, 72, 'Eau souillée ; grave pendant la grossesse.'],
  ['polio', 'Poliomyélite', 'virus', 6, 10, 30, 0.005, 'OFR', 0.95, 168, 'Paralysante, presque éradiquée.'],
  // ---------------- VIRUS transmis par vecteurs ----------------
  ['dengue', 'Dengue', 'virus', 3, 6, 5, 0.0005, 'M', 0.75, 0, 'Moustique tigre (Aedes), en pleine expansion.'],
  ['zika', 'Zika', 'virus', 2.5, 6, 7, 0.00001, 'MS', 0.8, 0, 'Moustique Aedes ; malformations du fœtus.'],
  ['chikungunya', 'Chikungunya', 'virus', 3.5, 4, 7, 0.001, 'M', 0.2, 0, 'Douleurs articulaires durables.'],
  ['fievre-jaune', 'Fièvre jaune', 'virus', 4, 4, 5, 0.05, 'MZ', 0.6, 0, 'Moustiques et singes.'],
  ['nil-occidental', 'Virus du Nil occidental', 'virus', 0.2, 6, 5, 0.001, 'MZ', 0.8, 0, 'Moustiques et oiseaux.'],
  ['encephalite-japonaise', 'Encéphalite japonaise', 'virus', 0.2, 8, 7, 0.001, 'MZ', 0.99, 0, 'Moustiques, porcs et oiseaux.'],
  ['encephalite-tiques', 'Encéphalite à tiques', 'virus', 0.1, 8, 10, 0.01, 'TN', 0.7, 0, 'Tiques des forêts européennes.'],
  ['vallee-rift', 'Fièvre de la vallée du Rift', 'virus', 1.2, 4, 7, 0.01, 'MZ', 0.5, 24, 'Moustiques et bétail.'],
  ['oropouche', 'Oropouche', 'virus', 1.5, 6, 6, 0.0001, 'M', 0.4, 0, 'Petits moucherons, Amazonie.'],
  ['rage', 'Rage', 'virus', 0.05, 45, 7, 0.99, 'Z', 0, 0, 'Morsures d’animaux ; mortelle une fois déclarée.'],
  // ---------------- PRIONS ----------------
  ['vmcj', 'Variante de Creutzfeldt-Jakob', 'prion', 0.05, 3650, 400, 1, 'NB', 0, 8760, 'La « vache folle » : incubation de plusieurs années.'],
  ['kuru', 'Kuru', 'prion', 0.1, 3650, 365, 1, 'N', 0, 8760, 'Prion de Papouasie, transmis par des rites funéraires.'],
  ['ifm', 'Insomnie fatale', 'prion', 0, 3650, 500, 1, 'E', 0, 0, 'Prion héréditaire rarissime.'],
  // ---------------- BACTÉRIES ----------------
  ['peste-pulmonaire', 'Peste pulmonaire', 'bactérie', 1.3, 3, 3, 0.9, 'RAP', 0, 24, 'La forme la plus rapide et mortelle de la peste.'],
  ['peste-bubonique', 'Peste bubonique', 'bactérie', 1.5, 4, 7, 0.4, 'PZR', 0, 72, 'La peste noire : puces des rats.'],
  ['cholera', 'Choléra', 'bactérie', 2.5, 1.5, 5, 0.02, 'ONF', 0.8, 168, 'Eau contaminée ; déshydratation fulgurante.'],
  ['typhoide', 'Fièvre typhoïde', 'bactérie', 2.8, 10, 21, 0.1, 'ONF', 0.5, 168, 'Salmonella Typhi ; porteurs sains célèbres.'],
  ['shigellose', 'Dysenterie (shigellose)', 'bactérie', 2.5, 2, 7, 0.01, 'OFNS', 0.3, 168, 'Très peu de bactéries suffisent.'],
  ['ecoli', 'E. coli O157:H7', 'bactérie', 1.5, 3, 7, 0.005, 'NOF', 0.3, 72, 'Steaks hachés et légumes contaminés.'],
  ['salmonellose', 'Salmonellose', 'bactérie', 1.2, 1, 5, 0.001, 'NOF', 0.4, 96, 'Œufs, volailles.'],
  ['listeriose', 'Listériose', 'bactérie', 0.1, 21, 10, 0.2, 'N', 0.5, 720, 'Fromages et charcuteries ; survit au frigo.'],
  ['tuberculose', 'Tuberculose', 'bactérie', 2, 60, 365, 0.4, 'A', 0.9, 24, 'Encore la première cause de mort infectieuse au monde.'],
  ['lepre', 'Lèpre', 'bactérie', 1.1, 1500, 3650, 0.01, 'RC', 0.95, 24, 'Incubation de plusieurs années.'],
  ['coqueluche', 'Coqueluche', 'bactérie', 14, 8, 21, 0.001, 'RA', 0.3, 72, 'La « toux des 100 jours ».'],
  ['diphterie', 'Diphtérie', 'bactérie', 6, 3, 14, 0.05, 'RCF', 0.5, 168, 'Fausses membranes qui étouffent.'],
  ['meningocoque', 'Méningite à méningocoque', 'bactérie', 1.4, 4, 7, 0.1, 'RC', 0.9, 2, 'Foudroyante, surtout chez les jeunes.'],
  ['pneumocoque', 'Pneumonie à pneumocoque', 'bactérie', 1.3, 3, 10, 0.02, 'RC', 0.8, 24, 'Première cause de pneumonie bactérienne.'],
  ['strepto-a', 'Streptocoque A invasif', 'bactérie', 1.5, 3, 10, 0.1, 'RCF', 0.8, 72, 'La bactérie « mangeuse de chair ».'],
  ['scarlatine', 'Scarlatine', 'bactérie', 3, 3, 10, 0.0005, 'RC', 0.5, 72, 'Angine et éruption écarlate.'],
  ['legionellose', 'Légionellose', 'bactérie', 0, 6, 10, 0.1, 'E', 0.9, 0, 'Aérosols d’eau des tours de refroidissement.'],
  ['charbon-pulmonaire', 'Charbon (anthrax) inhalé', 'bactérie', 0, 4, 4, 0.85, 'EF', 0, 8760, 'Spores très résistantes ; pas de transmission interhumaine.', 2],
  ['charbon-cutane', 'Charbon cutané', 'bactérie', 0, 5, 10, 0.2, 'EZC', 0, 8760, 'Contact avec des animaux ou des peaux contaminées.'],
  ['tularemie', 'Tularémie', 'bactérie', 0, 4, 14, 0.07, 'TZE', 0.3, 720, 'Lièvres, tiques ; quelques bactéries suffisent.'],
  ['brucellose', 'Brucellose', 'bactérie', 0, 20, 60, 0.02, 'NZ', 0.5, 720, 'Lait cru et bétail.'],
  ['fievre-q', 'Fièvre Q', 'bactérie', 0, 18, 14, 0.01, 'EZ', 0.6, 8760, 'Poussières des élevages, portées par le vent.'],
  ['leptospirose', 'Leptospirose', 'bactérie', 0.1, 10, 10, 0.02, 'OPZ', 0.7, 720, 'Urine de rats dans l’eau douce.'],
  ['typhus', 'Typhus épidémique', 'bactérie', 2, 12, 14, 0.2, 'L', 0.1, 0, 'Poux de corps ; fléau des guerres.'],
  ['fievre-pourpree', 'Fièvre pourprée des Rocheuses', 'bactérie', 0, 7, 14, 0.2, 'T', 0.2, 0, 'Tiques américaines.'],
  ['lyme', 'Maladie de Lyme', 'bactérie', 0, 10, 60, 0.0001, 'T', 0.3, 0, 'Tiques ; rarement mortelle.'],
  ['syphilis', 'Syphilis', 'bactérie', 1.5, 21, 365, 0.05, 'SC', 0.5, 0, 'La « grande vérole ».'],
  ['gonorrhee', 'Gonorrhée', 'bactérie', 1.5, 5, 90, 0, 'S', 0.5, 0, 'De plus en plus résistante aux antibiotiques.'],
  ['chlamydia', 'Chlamydia', 'bactérie', 1.2, 14, 180, 0, 'S', 0.75, 0, 'L’IST la plus fréquente.'],
  ['sarm', 'Staphylocoque doré résistant (SARM)', 'bactérie', 1.2, 4, 30, 0.02, 'CF', 0.7, 720, 'Résiste aux antibiotiques classiques ; hôpitaux.'],
  ['c-difficile', 'Clostridioides difficile', 'bactérie', 1.1, 3, 14, 0.05, 'FOC', 0.5, 2000, 'Spores qui résistent à l’alcool.'],
  ['mycoplasma', 'Mycoplasma pneumoniae', 'bactérie', 2, 15, 21, 0.0005, 'R', 0.5, 12, 'La « pneumonie ambulante ».'],
  // ---------------- CHAMPIGNONS ----------------
  ['candida-auris', 'Candida auris', 'champignon', 1.2, 7, 60, 0.1, 'CF', 0.8, 336, 'Levure multirésistante qui colonise les hôpitaux.'],
  ['aspergillose', 'Aspergillose', 'champignon', 0, 7, 30, 0.05, 'E', 0.9, 8760, 'Spores omniprésentes dans l’air.', 1.5],
  ['coccidioidomycose', 'Coccidioïdomycose (fièvre de la vallée)', 'champignon', 0, 14, 30, 0.002, 'E', 0.6, 8760, 'Spores du sol soulevées par le vent.', 3],
  ['histoplasmose', 'Histoplasmose', 'champignon', 0, 10, 30, 0.001, 'EZ', 0.9, 8760, 'Fientes d’oiseaux et de chauves-souris.', 1],
  ['blastomycose', 'Blastomycose', 'champignon', 0, 40, 60, 0.05, 'E', 0.5, 8760, 'Sols humides d’Amérique du Nord.', 1],
  ['cryptococcose', 'Cryptococcose', 'champignon', 0, 30, 60, 0.15, 'E', 0.8, 8760, 'Grave chez les immunodéprimés.', 1],
  ['mucormycose', 'Mucormycose', 'champignon', 0, 5, 20, 0.5, 'EC', 0.5, 8760, 'Le « champignon noir ».', 0.5],
  ['pneumocystose', 'Pneumocystose', 'champignon', 0.6, 30, 30, 0.1, 'A', 0.9, 0, 'Pneumonie des immunodéprimés.'],
  ['sporotrichose', 'Sporotrichose', 'champignon', 0.3, 20, 60, 0.0001, 'ZC', 0.3, 720, 'La maladie du jardinier, transmise aussi par les chats.'],
  ['teigne', 'Teigne (dermatophytes)', 'champignon', 2, 10, 60, 0, 'CF', 0.2, 2000, 'Contagieuse, mais bénigne.'],
  // ---------------- PARASITES ----------------
  ['paludisme-f', 'Paludisme (P. falciparum)', 'parasite', 10, 10, 60, 0.003, 'MB', 0.5, 0, 'Moustique Anophèle ; plus de 600 000 morts par an.'],
  ['paludisme-v', 'Paludisme (P. vivax)', 'parasite', 5, 14, 90, 0.0001, 'MB', 0.5, 0, 'Peut rechuter des mois plus tard.'],
  ['trypanosomiase', 'Maladie du sommeil', 'parasite', 1.2, 21, 365, 0.9, 'MZ', 0.1, 0, 'Mouche tsé-tsé.'],
  ['chagas', 'Maladie de Chagas', 'parasite', 1.1, 10, 3650, 0.05, 'MNB', 0.7, 0, 'Punaises « baiseuses » d’Amérique latine.'],
  ['leishmaniose', 'Leishmaniose viscérale', 'parasite', 1.2, 90, 365, 0.9, 'MZ', 0.8, 0, 'Phlébotomes et chiens.'],
  ['toxoplasmose', 'Toxoplasmose', 'parasite', 0, 10, 30, 0.00001, 'NZ', 0.9, 8760, 'Chats et viande peu cuite.'],
  ['amibiase', 'Amibiase', 'parasite', 1.5, 14, 30, 0.002, 'ON', 0.9, 720, 'Eau et légumes souillés.'],
  ['giardiase', 'Giardiase', 'parasite', 1.5, 9, 30, 0, 'ON', 0.5, 2000, 'Eau des ruisseaux.'],
  ['cryptosporidiose', 'Cryptosporidiose', 'parasite', 2, 7, 14, 0.0005, 'OF', 0.3, 2000, 'Résiste au chlore des piscines.'],
  ['gale', 'Gale', 'parasite', 1.5, 30, 60, 0, 'CF', 0.1, 72, 'Acariens sous la peau.'],
  ['poux', 'Poux de tête', 'parasite', 2, 10, 60, 0, 'C', 0.5, 48, 'Les écoles les adorent.'],
  ['schistosomiase', 'Bilharziose', 'parasite', 0, 40, 365, 0.001, 'O', 0.5, 0, 'Vers dans les eaux douces.'],
  ['trichinellose', 'Trichinellose', 'parasite', 0, 10, 30, 0.002, 'N', 0.5, 0, 'Viande de porc ou de sanglier mal cuite.'],
  // ---------------- TOXINES (non transmissibles) ----------------
  ['botulisme', 'Toxine botulique', 'toxine', 0, 1, 14, 0.1, 'KN', 0, 72, 'La substance la plus toxique connue.', 0.5],
  ['ricine', 'Ricine', 'toxine', 0, 0.5, 3, 0.3, 'K', 0, 48, 'Extraite des graines de ricin.', 0.3],
  ['saxitoxine', 'Saxitoxine', 'toxine', 0, 0.02, 1, 0.1, 'KN', 0, 0, 'Fruits de mer et marées rouges.', 0.2],
  ['tetrodotoxine', 'Tétrodotoxine', 'toxine', 0, 0.02, 1, 0.3, 'KN', 0, 0, 'Le poison du poisson-globe.', 0.1],
  ['amatoxine', 'Amatoxine (amanite phalloïde)', 'toxine', 0, 0.5, 5, 0.2, 'KN', 0, 0, 'Le champignon le plus mortel.', 0.1],
  ['aflatoxine', 'Aflatoxine', 'toxine', 0, 2, 14, 0.2, 'KN', 0, 0, 'Moisissure des céréales mal stockées.', 0.5],
  // ---------------- AGENTS CHIMIQUES (valeurs de jeu simplifiées) ----------------
  ['sarin', 'Sarin', 'chimique', 0, 0.003, 0.5, 0.25, 'K', 0, 6, 'Neurotoxique (attentat de Tokyo, 1995).', 0.8],
  ['vx', 'VX', 'chimique', 0, 0.01, 0.5, 0.35, 'KF', 0, 168, 'Neurotoxique très persistant.', 0.6],
  ['tabun', 'Tabun', 'chimique', 0, 0.005, 0.5, 0.2, 'K', 0, 12, 'Premier neurotoxique de synthèse.', 0.7],
  ['moutarde', 'Gaz moutarde (ypérite)', 'chimique', 0, 0.3, 5, 0.03, 'KF', 0, 120, 'Brûlures et cloques ; Première Guerre mondiale.', 1],
  ['chlore', 'Chlore', 'chimique', 0, 0.01, 1, 0.05, 'K', 0, 2, 'Nuage jaune-vert qui suit le sol.', 1.5],
  ['phosgene', 'Phosgène', 'chimique', 0, 0.2, 2, 0.1, 'K', 0, 2, 'Odeur de foin coupé ; effets retardés.', 1.2],
  ['cyanure', 'Cyanure d’hydrogène', 'chimique', 0, 0.002, 0.3, 0.3, 'K', 0, 1, 'Agit en quelques minutes.', 0.6],
  ['ammoniac', 'Ammoniac (fuite industrielle)', 'chimique', 0, 0.01, 1, 0.02, 'K', 0, 2, 'Accident d’usine ou de transport.', 1],
  ['mic', 'Isocyanate de méthyle', 'chimique', 0, 0.02, 3, 0.08, 'K', 0, 4, 'La catastrophe de Bhopal (1984).', 2.5],
  ['h2s', 'Sulfure d’hydrogène', 'chimique', 0, 0.002, 0.5, 0.2, 'K', 0, 1, 'Odeur d’œuf pourri, puis plus rien.', 0.4],
  ['co', 'Monoxyde de carbone', 'chimique', 0, 0.05, 0.5, 0.1, 'K', 0, 1, 'Invisible et inodore.', 0.15],
  ['so2', 'Dioxyde de soufre', 'chimique', 0, 0.01, 1, 0.01, 'K', 0, 2, 'Fumées volcaniques ou industrielles.', 1.5],
  ['lacrymogene', 'Gaz lacrymogène (CS)', 'chimique', 0, 0.001, 0.05, 0, 'K', 0, 1, 'Irritant, rarement mortel.', 0.3],
  ['dioxine', 'Dioxine (TCDD)', 'chimique', 0, 5, 60, 0.001, 'KFN', 0, 8760, 'La catastrophe de Seveso (1976).', 1.5]
];

window.CATEGORIES = [
  ['tout', 'Tout'], ['virus', 'Virus'], ['bactérie', 'Bactéries'], ['champignon', 'Champignons'],
  ['parasite', 'Parasites'], ['prion', 'Prions'], ['toxine', 'Toxines'], ['chimique', 'Chimiques']
];

window.MODES = {
  R: 'Gouttelettes', A: 'Aérosols', C: 'Contact', F: 'Surfaces', O: 'Eau', N: 'Aliments', S: 'Sexuelle', B: 'Sang',
  M: 'Moustiques', T: 'Tiques', P: 'Puces / rongeurs', L: 'Poux', Z: 'Animaux', E: 'Environnement', K: 'Exposition toxique'
};

/* ---------------- Patient zéro : professions ----------------
   [id, nom, lieux de travail (classes OSM), heures (début, fin), intensité de contacts, voyages/an,
    contact animaux (0-1), manipule des aliments (0-1), milieu de soins (0-1), travail de nuit] */
window.PROFESSIONS = [
  ['bureau', 'Employé de bureau', ['office', 'commercial'], 9, 18, 1, 2, 0, 0, 0, 0],
  ['sans-emploi', 'Sans emploi', [], 0, 0, 0.6, 0.5, 0, 0, 0, 0],
  ['etudiant', 'Étudiant', ['college', 'university', 'school'], 8.5, 17, 1.6, 2, 0, 0, 0, 0],
  ['enseignant', 'Enseignant', ['school', 'kindergarten'], 8, 17, 2.2, 1, 0, 0, 0, 0],
  ['soignant', 'Soignant (hôpital)', ['hospital', 'clinic', 'doctors'], 7, 19, 2, 0.5, 0, 0, 1, 0],
  ['commercant', 'Commerçant', ['shop', 'grocery', 'clothing_store', 'bakery'], 9, 19, 2.5, 0.5, 0, 0.3, 0, 0],
  ['serveur', 'Serveur / barman', ['bar', 'restaurant', 'cafe', 'pub', 'fast_food'], 17, 1, 3, 0.5, 0, 0.8, 0, 1],
  ['cuisinier', 'Cuisinier', ['restaurant', 'fast_food'], 10, 22, 1.2, 0.5, 0, 1, 0, 0],
  ['chauffeur', 'Chauffeur de bus', ['bus', 'bus_station'], 6, 15, 3, 0.2, 0, 0, 0, 0],
  ['livreur', 'Livreur', ['shop', 'restaurant'], 10, 21, 2, 0.2, 0, 0.3, 0, 0],
  ['ouvrier', 'Ouvrier', ['industrial'], 6, 14, 1, 0.3, 0, 0, 0, 0],
  ['aeroport', 'Personnel d’aéroport', ['aerodrome', 'airport'], 5, 13, 3, 8, 0, 0, 0, 0],
  ['pilote', 'Pilote / hôtesse de l’air', ['aerodrome', 'airport'], 6, 18, 2.5, 120, 0, 0.3, 0, 0],
  ['agriculteur', 'Agriculteur / éleveur', ['farm', 'farmyard'], 6, 18, 0.5, 0.3, 1, 0.3, 0, 0],
  ['veterinaire', 'Vétérinaire', ['veterinary'], 8, 18, 1.2, 1, 1, 0, 0.3, 0],
  ['militaire', 'Militaire', ['military'], 7, 18, 1.8, 3, 0, 0, 0, 0],
  ['commercial', 'Commercial itinérant', ['office', 'shop', 'restaurant'], 8, 19, 3, 30, 0, 0, 0, 0],
  ['retraite', 'Retraité', [], 0, 0, 0.7, 2, 0, 0, 0, 0],
  ['sdf', 'Sans-abri', [], 0, 0, 1.5, 0, 0.3, 0, 0, 1]
];

/* Lieux fréquentés : [id, nom, classes OSM, intensité de contacts, heures typiques] */
window.LIEUX = [
  ['bars', 'Bars', ['bar', 'pub', 'biergarten'], 2.5, [19, 24]],
  ['restaurants', 'Restaurants', ['restaurant', 'fast_food', 'cafe'], 1.8, [12, 14]],
  ['boites', 'Boîtes de nuit', ['nightclub'], 3.5, [23, 28]],
  ['sport', 'Salle de sport', ['fitness_centre', 'sports_centre', 'fitness'], 2, [18, 20]],
  ['culte', 'Lieu de culte', ['place_of_worship'], 2.2, [10, 12]],
  ['concerts', 'Concerts / stades', ['stadium', 'theatre', 'arts_centre', 'cinema'], 3, [20, 23]],
  ['commerces', 'Centres commerciaux', ['mall', 'department_store', 'supermarket', 'shop'], 1.5, [15, 17]],
  ['marches', 'Marchés', ['marketplace', 'grocery', 'greengrocer'], 1.8, [9, 11]],
  ['ecoles', 'Écoles (parent)', ['school', 'kindergarten'], 1.5, [8, 9]],
  ['hopital', 'Hôpital (visites)', ['hospital', 'clinic'], 2, [14, 16]],
  ['piscine', 'Piscine', ['swimming_pool', 'water_park'], 1.8, [16, 18]],
  ['transports', 'Gares / transports', ['railway', 'bus', 'bus_station', 'subway'], 2.5, [8, 9]]
];

/* Profils types */
window.PRESETS = {
  normal:    { label: 'Personne ordinaire', age: 38, prof: 'bureau', contacts: 12, hygiene: 0.6, mask: 0, transport: 'voiture', foyer: 3, lieux: ['restaurants', 'commerces'], partenaires: 1, animaux: 'aucun', voyages: 2, isolement: 'severe', cache: false },
  affaires:  { label: 'Voyageur d’affaires', age: 45, prof: 'commercial', contacts: 30, hygiene: 0.5, mask: 0, transport: 'taxi', foyer: 2, lieux: ['restaurants', 'bars', 'transports'], partenaires: 1, animaux: 'aucun', voyages: 40, isolement: 'jamais', cache: false },
  etudiant:  { label: 'Étudiant fêtard', age: 21, prof: 'etudiant', contacts: 45, hygiene: 0.3, mask: 0, transport: 'transports', foyer: 4, lieux: ['bars', 'boites', 'concerts', 'sport'], partenaires: 3, animaux: 'aucun', voyages: 4, isolement: 'jamais', cache: true },
  soignant:  { label: 'Soignant', age: 34, prof: 'soignant', contacts: 35, hygiene: 0.9, mask: 1, transport: 'transports', foyer: 3, lieux: ['commerces'], partenaires: 1, animaux: 'compagnie', voyages: 1, isolement: 'premiers', cache: false },
  retraite:  { label: 'Retraité casanier', age: 78, prof: 'retraite', contacts: 4, hygiene: 0.7, mask: 0, transport: 'marche', foyer: 2, lieux: ['marches', 'culte'], partenaires: 1, animaux: 'compagnie', voyages: 0.5, isolement: 'severe', cache: false },
  enfant:    { label: 'Enfant d’école', age: 8, prof: 'etudiant', contacts: 30, hygiene: 0.2, mask: 0, transport: 'marche', foyer: 4, lieux: ['ecoles', 'piscine'], partenaires: 0, animaux: 'compagnie', voyages: 1, isolement: 'severe', cache: false },
  eleveur:   { label: 'Éleveur', age: 52, prof: 'agriculteur', contacts: 6, hygiene: 0.4, mask: 0, transport: 'voiture', foyer: 4, lieux: ['marches'], partenaires: 1, animaux: 'elevage', voyages: 0.5, isolement: 'jamais', cache: false },
  super:     { label: 'Super-propagateur', age: 29, prof: 'serveur', contacts: 90, hygiene: 0.1, mask: 0, transport: 'transports', foyer: 6, lieux: ['bars', 'boites', 'concerts', 'transports', 'sport', 'commerces'], partenaires: 6, animaux: 'sauvage', voyages: 24, isolement: 'jamais', cache: true }
};
