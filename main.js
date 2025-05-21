let totalScore = 0;
let roundCount = 0;
const maxRounds = 10;
const bestScoreKey = "bestScore";
const eloKey = "eloScore";
const pseudoKey = "playerPseudo";


// Initialiser ELO
let elo = parseInt(localStorage.getItem(eloKey)) || 600; // valeur initiale par défaut


// 🗺️ Carte
const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});

const countryLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: './countries.geojson',
    format: new ol.format.GeoJSON()
  }),
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: 'rgba(200, 200, 200, 0.1)' }),
    stroke: new ol.style.Stroke({ color: 'gray', width: 1 })
  })
});
map.addLayer(countryLayer);

// 📍 Couche point rouge
const clickLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({ color: 'red' }),
      stroke: new ol.style.Stroke({ color: 'white', width: 1.5 })
    })
  }),
  zIndex: 1000
});
map.addLayer(clickLayer);

// 📦 Variables
let currentLeader = null;
let allLeaders = [];
let selectedCountry = null;

// ✅ Charger dirigeants
async function fetchLeaders() {
  const response = await fetch('./dirigeants_avec_pays.json');
  return await response.json();
}

function pickRandomLeader(leaders) {
  let leader;
  do {
    leader = leaders[Math.floor(Math.random() * leaders.length)];
  } while (leader.Nom?.toLowerCase().includes("charles"));
  return leader;
}

// ✅ Affichage dirigeant
function updateLeaderDisplay(leader) {
  const img = document.getElementById("leaderImage");
  img.src = leader["Lien de la photo"];
  img.onerror = () => {
    img.src = "https://via.placeholder.com/60?text=Image+non+dispo";
  };
  document.getElementById("leaderName").textContent = leader.Nom;
  img.dataset.indice = leader.indice;
}


document.addEventListener("DOMContentLoaded", async () => {
  // 🔐 Forcer un pseudo valide si aucun stocké
  let pseudo = localStorage.getItem(pseudoKey);

  while (!pseudo || pseudo.trim() === "") {
    pseudo = prompt("Quel est ton pseudo ? (obligatoire)").trim();
  }
  localStorage.setItem(pseudoKey, pseudo);

  // ✅ Chargement normal du jeu
  allLeaders = await fetchLeaders();
  currentLeader = pickRandomLeader(allLeaders);
  updateLeaderDisplay(currentLeader);

  document.getElementById("eloDisplay").textContent =
    `ELO : ${elo} (${getRang(elo)})`;

  document.getElementById("bestScoreDisplay").textContent =
    `Meilleur score de ${pseudo} : ${localStorage.getItem(bestScoreKey) || 0}`;
});


// ✅ Clic sur un pays
map.on('singleclick', function (evt) {
  clickLayer.getSource().clear();
  selectedCountry = null;

  const pointFeature = new Feature(new Point(evt.coordinate));
  clickLayer.getSource().addFeature(pointFeature);

  const features = countryLayer.getSource().getFeatures();
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (geometry && geometry.intersectsCoordinate(evt.coordinate)) {
      selectedCountry = feature.get('ADMIN') || feature.get('name') || feature.get('NAME');
      break;
    }
  }

  if (!selectedCountry) {
    alert("❌ Aucun pays trouvé à cet endroit.");
  } else {
    //console.log("✅ Pays sélectionné :", selectedCountry);
  }
});

function updateElo(scoreTotal, eloActuel) {
  const eloAttendu = eloActuel * 20;
  let variation = (scoreTotal - eloAttendu) / 200;

  // ✅ Appliquer un plafond de variation
  const maxVariation = 75;
  if (variation > maxVariation) variation = maxVariation;
  if (variation < -maxVariation) variation = -maxVariation;

  let newElo = Math.round(eloActuel + variation);
  newElo = Math.max(0, Math.min(5000, newElo)); // borné

  return { newElo, variation };
}



function getRang(elo) {
  if (elo < 300) return "Bronze I🥉";
  if (elo < 600) return "Bronze II🥉";
  if (elo < 900) return "Bronze III🥉";
  if (elo < 1200) return "Bronze IV🥉";
  if (elo < 1500) return "Bronze V🥉";

  if (elo < 1700) return "Argent I🥈";
  if (elo < 1900) return "Argent II🥈";
  if (elo < 2100) return "Argent III🥈";
  if (elo < 2300) return "Argent IV🥈";
  if (elo < 2500) return "Argent V🥈";

  if (elo < 2670) return "Or I🥇";
  if (elo < 2840) return "Or II🥇";
  if (elo < 3010) return "Or III🥇";
  if (elo < 3180) return "Or IV🥇";
  if (elo < 3350) return "Or V🥇";

  if (elo < 3520) return "Platine I🔷";
  if (elo < 3690) return "Platine II🔷";
  if (elo < 3860) return "Platine III🔷";
  if (elo < 4030) return "Platine IV🔷";
  if (elo < 4200) return "Platine V🔷";

  if (elo < 4280) return "Diamant I💎";
  if (elo < 4360) return "Diamant II💎";
  if (elo < 4440) return "Diamant III💎";
  if (elo < 4520) return "Diamant IV💎";
  if (elo < 4600) return "Diamant V💎";

  if (elo < 4680) return "Divin I👑";
  if (elo < 4760) return "Divin II👑";
  if (elo < 4840) return "Divin III👑";
  if (elo < 4920) return "Divin IV👑";
  return "Divin V👑";
}

// ✅ Calcul du score
function calculateScore(userIndex, realIndex) {
  const maxScore = 5000;
  const distance = Math.abs(userIndex - realIndex);
  const k = 0.7;

  if (isNaN(userIndex) || isNaN(realIndex)) {
    const randomScore = Math.floor(Math.random() * (1000 - 700 + 1)) + 700;
    //alert(`score marqué: ${randomScore}`);
    return randomScore;
  }

  const score = Math.floor(maxScore * Math.exp(-k * distance));
  //alert(`score marqué: ${score}`);
  return score;
}

// ✅ Mise à jour du meilleur score
function updateBestScore(totalScore) {
  const saved = parseInt(localStorage.getItem(bestScoreKey)) || 0;
  if (totalScore > saved) {
    localStorage.setItem(bestScoreKey, totalScore);
    document.getElementById("bestScoreDisplay").textContent = `Meilleur score : ${totalScore}`;
  } else {
    document.getElementById("bestScoreDisplay").textContent = `Meilleur score : ${saved}`;
  }
}

// 🌍 Dictionnaire de traduction
const englishToFrenchMap = {
  "Afghanistan": "Afghanistan", "Albania": "Albanie", "Algeria": "Algérie", "Andorra": "Andorre",
  "Angola": "Angola", "Argentina": "Argentine", "Armenia": "Arménie", "Australia": "Australie",
  "Austria": "Autriche", "Azerbaijan": "Azerbaïdjan", "The Bahamas": "Bahamas", "Bangladesh": "Bangladesh",
  "Belarus": "Biélorussie", "Belgium": "Belgique", "Belize": "Belize", "Benin": "Bénin", "Bhutan": "Bhoutan",
  "Bolivia": "Bolivie", "Bosnia and Herzegovina": "Bosnie-Herzégovine", "Botswana": "Botswana", "Brazil": "Brésil",
  "Bulgaria": "Bulgarie", "Burkina Faso": "Burkina Faso", "Burundi": "Burundi", "Cambodia": "Cambodge",
  "Cameroon": "Cameroun", "Canada": "Canada", "Cape Verde": "Cap-Vert", "Central African Republic": "Centrafrique",
  "Chad": "Tchad", "Chile": "Chili", "China": "Chine", "Colombia": "Colombie", "Comoros": "Comores", "Republic of the Congo": "République du Congo",
  "Costa Rica": "Costa Rica", "Croatia": "Croatie", "Cuba": "Cuba", "Cyprus": "Chypre", "Czech Republic": "Tchéquie",
  "Denmark": "Danemark", "Djibouti": "Djibouti", "Dominican Republic": "République dominicaine", "Democratic Republic of the Congo": "République démocratique du Congo",
  "Ecuador": "Équateur", "Egypt": "Égypte", "El Salvador": "Salvador", "Equatorial Guinea": "Guinée équatoriale",
  "Eritrea": "Érythrée", "Estonia": "Estonie", "Eswatini": "Eswatini", "Ethiopia": "Éthiopie", "Fiji": "Fidji",
  "Finland": "Finlande", "France": "France", "Gabon": "Gabon", "Gambia": "Gambie", "Georgia": "Géorgie", "Germany": "Allemagne",
  "Ghana": "Ghana", "Greece": "Grèce", "Guatemala": "Guatemala", "Guinea": "Guinée", "Guinea Bissau": "Guinée-Bissau",
  "Guyana": "Guyane", "Haiti": "Haïti", "Honduras": "Honduras", "Hungary": "Hongrie", "Iceland": "Islande", "India": "Inde",
  "Indonesia": "Indonésie", "Iran": "Iran", "Iraq": "Irak", "Ireland": "Irlande", "Israel": "Israël", "Italy": "Italie",
  "Ivory Coast": "Côte d'Ivoire", "Jamaica": "Jamaïque", "Japan": "Japon", "Jordan": "Jordanie", "Kazakhstan": "Kazakhstan",
  "Kenya": "Kenya", "Kosovo": "Kosovo", "Kuwait": "Koweït", "Kyrgyzstan": "Kirghizistan", "Laos": "Laos", "Latvia": "Lettonie",
  "Lebanon": "Liban", "Lesotho": "Lesotho", "Liberia": "Liberia", "Libya": "Libye", "Liechtenstein": "Liechtenstein",
  "Lithuania": "Lituanie", "Luxembourg": "Luxembourg", "Madagascar": "Madagascar", "Malawi": "Malawi", "Malaysia": "Malaisie",
  "Maldives": "Maldives", "Mali": "Mali", "Malta": "Malte", "Mauritania": "Mauritanie", "Mauritius": "Maurice",
  "Mexico": "Mexique", "Moldova": "Moldavie", "Monaco": "Monaco", "Mongolia": "Mongolie", "Montenegro": "Monténégro",
  "Morocco": "Maroc", "Mozambique": "Mozambique", "Myanmar": "Birmanie", "Namibia": "Namibie", "Nepal": "Népal",
  "Netherlands": "Pays-Bas", "New Zealand": "Nouvelle-Zélande", "Nicaragua": "Nicaragua", "Niger": "Niger",
  "Nigeria": "Nigeria", "North Korea": "Corée du Nord", "Macedonia": "Macédoine du Nord", "Norway": "Norvège",
  "Oman": "Oman", "Pakistan": "Pakistan", "Panama": "Panama", "Papua New Guinea": "Papouasie-Nouvelle-Guinée",
  "Paraguay": "Paraguay", "Peru": "Pérou", "Philippines": "Philippines", "Poland": "Pologne", "Portugal": "Portugal",
  "Qatar": "Qatar", "Romania": "Roumanie", "Russia": "Russie", "Rwanda": "Rwanda", "San Marino": "Saint-Marin",
  "Saudi Arabia": "Arabie saoudite", "Senegal": "Sénégal", "Serbia": "Serbie", "Seychelles": "Seychelles",
  "Sierra Leone": "Sierra Leone", "Singapore": "Singapour", "Slovakia": "Slovaquie", "Slovenia": "Slovénie",
  "Somalia": "Somalie", "South Africa": "Afrique du Sud", "South Korea": "Corée du Sud", "South Sudan": "Soudan du Sud",
  "Spain": "Espagne", "Sri Lanka": "Sri Lanka", "Sudan": "Soudan", "Suriname": "Suriname", "Sweden": "Suède",
  "Switzerland": "Suisse", "Syria": "Syrie", "Taiwan": "Taïwan", "Tajikistan": "Tadjikistan", "United Republic of Tanzania": "Tanzanie",
  "Thailand": "Thaïlande", "Togo": "Togo", "Trinidad and Tobago": "Trinité-et-Tobago", "Tunisia": "Tunisie",
  "Turkey": "Turquie", "Turkmenistan": "Turkménistan", "Uganda": "Ouganda", "Ukraine": "Ukraine",
  "United Arab Emirates": "Émirats arabes unis", "United Kingdom": "Royaume-Uni", "United States of America": "États-Unis",
  "Uruguay": "Uruguay", "Uzbekistan": "Ouzbékistan", "Vatican": "Vatican", "Venezuela": "Venezuela",
  "Vietnam": "Viêt Nam", "Yemen": "Yémen", "Zambia": "Zambie", "Zimbabwe": "Zimbabwe", "East Timor": "Timor-Oriental" , "Greenland" : "Groenland", "Palestine": "Palestine", "Vanuatu" : "Vanuatu", "French Southern And Antarctic Lands": "French Southern And Antarctic Lands" , "Antarctica" : "Antartique", 
   "The Bahamas" : "Bahamas", "Puerto Rico" : "Porto Rico", "Bermuda": "Bermudes", "New Caledonia": "Nouvelle-Calédonie"
};

// ✅ Bouton "Valider"
document.getElementById("validateBtn").addEventListener("click", () => {
  const userIndex = parseFloat(document.getElementById("democracyIndex").value);
  const realIndex = parseFloat(document.getElementById("leaderImage").dataset.indice);
  const expectedCountry = currentLeader?.Pays;
  const guessedCountryEnglish = selectedCountry;
  const guessedCountryFrench = englishToFrenchMap[guessedCountryEnglish] || guessedCountryEnglish;

  if (!guessedCountryEnglish) {
    alert("❌ Vous devez d'abord cliquer sur un pays.");
    return;
  }

  if (isNaN(userIndex) || userIndex < 0 || userIndex > 10) {
    alert("❌ Entrez un indice de démocratie valide entre 0 et 10.");
    return;
  }

  // Score base via indice
  const baseScore = calculateScore(userIndex, realIndex);

  // Bonus si bon pays
  let bonusPoints = 0;
  let bonusMessage = "";
  if (guessedCountryFrench === expectedCountry) {
    bonusPoints = 5000;
    bonusMessage = "✅ +5000 pts pour le bon pays sélectionné !";
  }

  const roundScore = baseScore + bonusPoints;
  totalScore += roundScore;
  roundCount++;

  // Mise à jour du score affiché
  const scoreDisplay = document.getElementById("scoreDisplay");
  scoreDisplay.textContent = `Score total : ${totalScore} (${roundCount}/${maxRounds} tours joués)`;



  // ✅ Message final d’alerte
  const message = `
🎯 Pays attendu : ${expectedCountry}
📌 Pays choisi : ${guessedCountryFrench}
📊 Indice attendu : ${realIndex}
🧠 Indice entré : ${userIndex}


🏅 Score du tour : ${roundScore}
${bonusMessage}
  `;
  alert(message);
  
  // Passage au tour suivant ou fin
  if (roundCount >= maxRounds) {
    document.getElementById("validateBtn").disabled = true;
    updateBestScore(totalScore);


    // ✅ Mise à jour ELO uniquement ici
     const { newElo, variation } = updateElo(totalScore, elo);
     elo = newElo;
     localStorage.setItem(eloKey, elo);
     document.getElementById("eloDisplay").textContent =
     `ELO : ${elo} (${getRang(elo)})`;
      const roundedVariation = Math.abs(Math.round(variation));
      const sign = variation >= 0 ? "+" : "-";
      alert(`🔥 Variation de ELO : ${sign}${roundedVariation}`);

    scoreDisplay.textContent += " 🎉 RAFRAICHIR POUR RELANCER !";
  } else {
    currentLeader = pickRandomLeader(allLeaders);
    updateLeaderDisplay(currentLeader);
  }
  // Reset champ et carte
  document.getElementById("democracyIndex").value = "";
  clickLayer.getSource().clear();
  selectedCountry = null;
});


