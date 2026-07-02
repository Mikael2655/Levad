// ============================================================
//  VOS VERBES — c'est ICI que vous ajoutez des conjugaisons !
// ============================================================
//  Chaque verbe est un bloc { ... } avec :
//    inf      : l'infinitif en hébreu
//    translit : sa prononciation
//    fr       : la traduction française
//    temps    : un bloc par temps ("Présent", "Passé", "Futur"...
//               vous pouvez ajouter n'importe quel temps, il
//               apparaîtra automatiquement dans les exercices).
//
//  Chaque forme conjuguée est une ligne :
//    { p: "la personne", he: "forme en hébreu", t: "prononciation" },
//
//  Pour ajouter un verbe : copiez un bloc entier (de { à },),
//  collez-le et modifiez-le. N'oubliez pas les virgules !
//
//  NOTE IMPORTANTE : import automatique depuis votre Excel.
//  Pour chaque temps (Présent/Passé/Futur) où vous aviez déjà
//  rempli au moins une forme, les 4/8/9 formes ont été générées
//  automatiquement à partir des règles de conjugaison hébraïque.
//  Les temps qui étaient entièrement vides dans votre Excel sont
//  restés vides ici (mieux vaut rien qu'une conjugaison inventée
//  et fausse). Cherchez "// À COMPLÉTER" pour repérer les verbes
//  concernés.
// ============================================================

const VERBES = [
  // Acheter
  {
    inf: "לקנות", translit: "Liknot", fr: "Acheter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קונה", t: "Kone" },
        { p: "fém. sing. (אני/את/היא)", he: "קונה", t: "Kona" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קונים", t: "Konim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קונות", t: "Konot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "קניתי", t: "Kaniti" },
        { p: "tu masc. (אתה)", he: "קנית", t: "Kanita" },
        { p: "tu fém. (את)", he: "קנית", t: "Kanit" },
        { p: "il (הוא)", he: "קנה", t: "Kana" },
        { p: "elle (היא)", he: "קנתה", t: "Kanta" },
        { p: "nous (אנחנו)", he: "קנינו", t: "Kaninu" },
        { p: "vous masc. (אתם)", he: "קניתם", t: "Kanitem" },
        { p: "vous fém. (אתן)", he: "קניתן", t: "Kaniten" },
        { p: "ils / elles (הם/הן)", he: "קנו", t: "Kanu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אקנה", t: "ekene" },
        { p: "tu masc. (אתה)", he: "תקנה", t: "tikene" },
        { p: "tu fém. (את)", he: "תקני", t: "tikeni" },
        { p: "il (הוא)", he: "יקנה", t: "Ikene" },
        { p: "elle (היא)", he: "תקנה", t: "tikene" },
        { p: "nous (אנחנו)", he: "נקנה", t: "nikene" },
        { p: "vous (אתם/אתן)", he: "תקנו", t: "tikenu" },
        { p: "ils / elles (הם/הן)", he: "יקנו", t: "yikenu" },
      ],
    },
  },

  // Aider  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעזור", translit: "La'azor", fr: "Aider",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוזר", t: "Ozer" },
        { p: "fém. sing. (אני/את/היא)", he: "עוזרת", t: "Ozeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עוזרים", t: "Ozrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עוזרות", t: "Ozrot" },
      ],
    },
  },

  // Aimer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאהוב", translit: "Leehov", fr: "Aimer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אוהב", t: "Ohev" },
        { p: "fém. sing. (אני/את/היא)", he: "אוהבת", t: "Ohevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "אוהבים", t: "Ohvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "אוהבות", t: "Ohvot" },
      ],
    },
  },

  // Ajouter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להוסיף", translit: "Lehosif", fr: "Ajouter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוסיף", t: "Mosif" },
        { p: "fém. sing. (אני/את/היא)", he: "מוסיףת", t: "Mosifet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מוסיףים", t: "Mosfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מוסיףות", t: "Mosfot" },
      ],
    },
  },

  // Aller / marcher  // À COMPLÉTER : Passé, Futur
  {
    inf: "ללכת", translit: "Lalekhet", fr: "Aller / marcher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הולך", t: "Olekh" },
        { p: "fém. sing. (אני/את/היא)", he: "הולךת", t: "Olekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "הולךים", t: "Olkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "הולךות", t: "Olkhot" },
      ],
    },
  },

  // Aller avec / matcher  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתאים", translit: "Lehat'im", fr: "Aller avec / matcher",
    temps: {},
  },

  // Ameliorer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשפר", translit: "Lechaper", fr: "Ameliorer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משפר", t: "Mechaper" },
        { p: "fém. sing. (אני/את/היא)", he: "משפרת", t: "Mechaperet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משפרים", t: "Mechaprim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משפרות", t: "Mechaprot" },
      ],
    },
  },

  // Appeler  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lehitkacher", fr: "Appeler",
    temps: {},
  },

  // Apporter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להביא", translit: "Lehavi", fr: "Apporter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מביא", t: "Mevi" },
        { p: "fém. sing. (אני/את/היא)", he: "מביאה", t: "Mevia" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מביאים", t: "Meviim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מביאות", t: "Meviot" },
      ],
    },
  },

  // Arrêter / s'arrêter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להפסיק", translit: "Lehafsik", fr: "Arrêter / s'arrêter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפסיק", t: "Mafsik" },
        { p: "fém. sing. (אני/את/היא)", he: "מפסיקה", t: "Mafsika" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מפסיקים", t: "Mafsikim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מפסיקות", t: "Mafsikot" },
      ],
    },
  },

  // Arriver  // À COMPLÉTER : Passé, Futur
  {
    inf: "להגיע", translit: "Lehagia", fr: "Arriver",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגיע", t: "Magia" },
        { p: "fém. sing. (אני/את/היא)", he: "מגיעה", t: "Magiaa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מגיעים", t: "Magiaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מגיעות", t: "Magiaot" },
      ],
    },
  },

  // Attendre  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחכות", translit: "Lekhakot", fr: "Attendre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחכה", t: "Mekhake" },
        { p: "fém. sing. (אני/את/היא)", he: "מחכה", t: "Mekhaka" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מחכים", t: "Mekhakim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מחכות", t: "Mekhakot" },
      ],
    },
  },

  // Avoir besoin / devoir  // À COMPLÉTER : Passé, Futur
  {
    inf: "", translit: "", fr: "Avoir besoin / devoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צריך", t: "Tsarikh" },
        { p: "fém. sing. (אני/את/היא)", he: "צריךת", t: "Tsarikhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "צריךים", t: "Tsarkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "צריךות", t: "Tsarkhot" },
      ],
    },
  },

  // Avoir mal  // À COMPLÉTER : Passé, Futur
  {
    inf: "לכאוב", translit: "Likh'ov", fr: "Avoir mal",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "כואב", t: "Co'ev" },
        { p: "fém. sing. (אני/את/היא)", he: "כואבת", t: "Co'evet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "כואבים", t: "Co'vim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "כואבות", t: "Co'vot" },
      ],
    },
  },

  // Avoir raison  // À COMPLÉTER : Passé, Futur
  {
    inf: "לצדוק", translit: "Litzdok", fr: "Avoir raison",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צודק", t: "Tsodek" },
        { p: "fém. sing. (אני/את/היא)", he: "צודקת", t: "Tsodeket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "צודקים", t: "Tsodkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "צודקות", t: "Tsodkot" },
      ],
    },
  },

  // Boire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשתות", translit: "Lichtot", fr: "Boire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שותה", t: "Chote" },
        { p: "fém. sing. (אני/את/היא)", he: "שותה", t: "Chota" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שותים", t: "Chotim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שותות", t: "Chotot" },
      ],
    },
  },

  // Bouger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לזוז", translit: "Lazouz", fr: "Bouger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "זז", t: "Zaz" },
        { p: "fém. sing. (אני/את/היא)", he: "זזת", t: "Zazet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "זזים", t: "Zzim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "זזות", t: "Zzot" },
      ],
    },
  },

  // Changer / modifier  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשנות", translit: "Lechanot", fr: "Changer / modifier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משנה", t: "Mechane" },
        { p: "fém. sing. (אני/את/היא)", he: "משנה", t: "Mechana" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משנים", t: "Mechanim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משנות", t: "Mechanot" },
      ],
    },
  },

  // Chanter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשיר", translit: "Lachir", fr: "Chanter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שר", t: "Char" },
        { p: "fém. sing. (אני/את/היא)", he: "שרת", t: "Charet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שרים", t: "Chrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שרות", t: "Chrot" },
      ],
    },
  },

  // Checker/vérifier  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבדוק", translit: "Livdok", fr: "Checker/vérifier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בודק", t: "Bodek" },
        { p: "fém. sing. (אני/את/היא)", he: "בודקת", t: "Bodeket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בודקים", t: "Bodkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בודקות", t: "Bodkot" },
      ],
    },
  },

  // Chercher  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחפש", translit: "Lekhapes", fr: "Chercher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחפש", t: "Mekhapes" },
        { p: "fém. sing. (אני/את/היא)", he: "מחפשת", t: "Mekhapeset" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מחפשים", t: "Mekhapsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מחפשות", t: "Mekhapsot" },
      ],
    },
  },

  // Choisir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבחור", translit: "Livkhor", fr: "Choisir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוחר", t: "Bokher" },
        { p: "fém. sing. (אני/את/היא)", he: "בוחרת", t: "Bokheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בוחרים", t: "Bokhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בוחרות", t: "Bokhrot" },
      ],
    },
  },

  // Commander/réserver/inviter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להזמין", translit: "Lehazmine", fr: "Commander/réserver/inviter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזמין", t: "Mazmin" },
        { p: "fém. sing. (אני/את/היא)", he: "מזמיןה", t: "Mazmina" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מזמיןים", t: "Mazminim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מזמיןות", t: "Mazminot" },
      ],
    },
  },

  // Commencer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתחיל", translit: "Lehatkhil", fr: "Commencer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחיל", t: "Matkhil" },
        { p: "fém. sing. (אני/את/היא)", he: "מתחילה", t: "Matkhila" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתחילים", t: "Matkhilim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתחילות", t: "Matkhilot" },
      ],
    },
  },

  // Comprendre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להבין", translit: "Lehavin", fr: "Comprendre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבין", t: "Mevin" },
        { p: "fém. sing. (אני/את/היא)", he: "מביןה", t: "Mevina" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מביןים", t: "Mevinim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מביןות", t: "Mevinot" },
      ],
    },
  },

  // Conduire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנהוג", translit: "Linhog", fr: "Conduire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוהג", t: "Noheg" },
        { p: "fém. sing. (אני/את/היא)", he: "נוהגת", t: "Noheget" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נוהגים", t: "Nohgim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נוהגות", t: "Nohgot" },
      ],
    },
  },

  // Connaître/savoir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להכיר", translit: "Lehakir", fr: "Connaître/savoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכיר", t: "Makir" },
        { p: "fém. sing. (אני/את/היא)", he: "מכירה", t: "Makira" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מכירים", t: "Makirim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מכירות", t: "Makirot" },
      ],
    },
  },

  // Construire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבנות", translit: "Livnot", fr: "Construire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בונה", t: "Bone" },
        { p: "fém. sing. (אני/את/היא)", he: "בונה", t: "Bona" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בונים", t: "Bonim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בונות", t: "Bonot" },
      ],
    },
  },

  // Continuer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמשיך", translit: "Leamchikh", fr: "Continuer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממשיך", t: "Mamchikh" },
        { p: "fém. sing. (אני/את/היא)", he: "ממשיךת", t: "Mamchikhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ממשיךים", t: "Mamchkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ממשיךות", t: "Mamchkhot" },
      ],
    },
  },

  // Courir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרוץ", translit: "Larouts", fr: "Courir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רץ", t: "Rats" },
        { p: "fém. sing. (אני/את/היא)", he: "רץת", t: "Ratset" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "רץים", t: "Rtsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "רץות", t: "Rtsot" },
      ],
    },
  },

  // Coûter / monter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעלות", translit: "Laalot", fr: "Coûter / monter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עולה", t: "Ole" },
        { p: "fém. sing. (אני/את/היא)", he: "עולה", t: "Ola" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עולים", t: "Olim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עולות", t: "Olot" },
      ],
    },
  },

  // Croire  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמין", translit: "Lehamin", fr: "Croire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהמין", t: "Maamin" },
        { p: "fém. sing. (אני/את/היא)", he: "מהמיןה", t: "Maamina" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהמיןים", t: "Maaminim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהמיןות", t: "Maaminot" },
      ],
    },
  },

  // Cuisiner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבשל", translit: "Levachel", fr: "Cuisiner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבשל", t: "Mevachel" },
        { p: "fém. sing. (אני/את/היא)", he: "מבשלת", t: "Mevachelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מבשלים", t: "Mevachlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מבשלות", t: "Mevachlot" },
      ],
    },
  },

  // Préparer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להכין", translit: "Lehakhine", fr: "Préparer",
    temps: {},
  },

  // Danser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרקוד", translit: "Lirkod", fr: "Danser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוקד", t: "Roked" },
        { p: "fém. sing. (אני/את/היא)", he: "רוקדת", t: "Rokedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "רוקדים", t: "Rokdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "רוקדות", t: "Rokdot" },
      ],
    },
  },

  // Décider  // À COMPLÉTER : Passé, Futur
  {
    inf: "להחליט", translit: "Lehakhlit", fr: "Décider",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחליט", t: "Makhlit" },
        { p: "fém. sing. (אני/את/היא)", he: "מחליטה", t: "Makhlita" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מחליטים", t: "Makhlitim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מחליטות", t: "Makhlitot" },
      ],
    },
  },

  // Découvrir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגלות", translit: "Legalot", fr: "Découvrir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגלה", t: "Megale" },
        { p: "fém. sing. (אני/את/היא)", he: "מגלה", t: "Megala" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מגלים", t: "Megalim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מגלות", t: "Megalot" },
      ],
    },
  },

  // Décrire  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לתאר", translit: "Leta'er", fr: "Décrire",
    temps: {},
  },

  // Demander/exiger/réclamer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבקש", translit: "Levakesh", fr: "Demander/exiger/réclamer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבקש", t: "Mevakesh" },
        { p: "fém. sing. (אני/את/היא)", he: "מבקשת", t: "Mevakeshet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מבקשים", t: "Mevakshim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מבקשות", t: "Mevakshot" },
      ],
    },
  },

  // Demander/questionner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשאול", translit: "Lich'ol", fr: "Demander/questionner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שואל", t: "Cho'el" },
        { p: "fém. sing. (אני/את/היא)", he: "שואלת", t: "Cho'elet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שואלים", t: "Cho'lim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שואלות", t: "Cho'lot" },
      ],
    },
  },

  // Descendre / tomber  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרדת", translit: "Laredet", fr: "Descendre / tomber",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יורד", t: "Yored" },
        { p: "fém. sing. (אני/את/היא)", he: "יורדת", t: "Yoredet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יורדים", t: "Yordim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יורדות", t: "Yordot" },
      ],
    },
  },

  // Dessiner / peindre  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לציר", translit: "Letsayer", fr: "Dessiner / peindre",
    temps: {},
  },

  // Détester  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשנוא", translit: "Lisno", fr: "Détester",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שונא", t: "Sone" },
        { p: "fém. sing. (אני/את/היא)", he: "שונאת", t: "Soneet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שונאים", t: "Sneim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שונאות", t: "Sneot" },
      ],
    },
  },

  // Devenir fou  // À COMPLÉTER : Passé, Futur
  {
    inf: "להשתגע", translit: "Lehichtagea", fr: "Devenir fou",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתגע", t: "Michtagea" },
        { p: "fém. sing. (אני/את/היא)", he: "משתגעת", t: "Michtageaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משתגעים", t: "Michtagaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משתגעות", t: "Michtagaot" },
      ],
    },
  },

  // Dire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לומר", translit: "Lomar", fr: "Dire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אומר", t: "Omer" },
        { p: "fém. sing. (אני/את/היא)", he: "אומרת", t: "Omeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "אומרים", t: "Omrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "אומרות", t: "Omrot" },
      ],
    },
  },

  // Dire  // À COMPLÉTER : Passé, Futur
  {
    inf: "להגיד", translit: "Lehagid", fr: "Dire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגיד", t: "Magid" },
        { p: "fém. sing. (אני/את/היא)", he: "מגידה", t: "Magida" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מגידים", t: "Magidim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מגידות", t: "Magidot" },
      ],
    },
  },

  // Diriger (patron)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנהל", translit: "Lenahel", fr: "Diriger (patron)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנהל", t: "Menahel" },
        { p: "fém. sing. (אני/את/היא)", he: "מנהלת", t: "Menahelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנהלים", t: "Menahlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנהלות", t: "Menahlot" },
      ],
    },
  },

  // Divorcer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתגרש", translit: "Lehitgarech", fr: "Divorcer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתגרש", t: "Mitgarech" },
        { p: "fém. sing. (אני/את/היא)", he: "מתגרשת", t: "Mitgarechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתגרשים", t: "Mitgarchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתגרשות", t: "Mitgarchot" },
      ],
    },
  },

  // Donner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לתת", translit: "Latet", fr: "Donner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נותן", t: "Noten" },
        { p: "fém. sing. (אני/את/היא)", he: "נותןת", t: "Notenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נותןים", t: "Notnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נותןות", t: "Notnot" },
      ],
    },
  },

  // Dormir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לישון", translit: "Lichon", fr: "Dormir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ישן", t: "Yachen" },
        { p: "fém. sing. (אני/את/היא)", he: "ישןת", t: "Yachenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ישןים", t: "Yachnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ישןות", t: "Yachnot" },
      ],
    },
  },

  // Draguer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לפלרטט", translit: "Leflartet", fr: "Draguer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפלרטט", t: "Meflartet" },
        { p: "fém. sing. (אני/את/היא)", he: "מפלרטטת", t: "Meflartetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מפלרטטים", t: "Meflarttim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מפלרטטות", t: "Meflarttot" },
      ],
    },
  },

  // Ecouter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשמוע", translit: "Lichmoa", fr: "Ecouter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שומע", t: "Chomea" },
        { p: "fém. sing. (אני/את/היא)", he: "שומעת", t: "Chomeaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שומעים", t: "Chomaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שומעות", t: "Chomaot" },
      ],
    },
  },

  // Ecouter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להקשיב", translit: "Leakchiv", fr: "Ecouter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקשיב", t: "Makchiv" },
        { p: "fém. sing. (אני/את/היא)", he: "מקשיבת", t: "Makchivet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מקשיבים", t: "Makchvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מקשיבות", t: "Makchvot" },
      ],
    },
  },

  // Ecrire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לכתוב", translit: "Likhtov", fr: "Ecrire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "כותב", t: "Kotev" },
        { p: "fém. sing. (אני/את/היא)", he: "כותבת", t: "Kotevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "כותבים", t: "Kotvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "כותבות", t: "Kotvot" },
      ],
    },
  },

  // Enseigner  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "ללמד", translit: "Lelamed", fr: "Enseigner",
    temps: {},
  },

  // Entrer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להכנס", translit: "Lehikanes", fr: "Entrer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נכנס", t: "Nikhnas" },
        { p: "fém. sing. (אני/את/היא)", he: "נכנסת", t: "Nikhnaset" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נכנסים", t: "Nikhnsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נכנסות", t: "Nikhnsot" },
      ],
    },
  },

  // Entretenir (embauche)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתראיין", translit: "Lehitrayen", fr: "Entretenir (embauche)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתראיין", t: "Mitrayen" },
        { p: "fém. sing. (אני/את/היא)", he: "מתראייןת", t: "Mitrayenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתראייןים", t: "Mitraynim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתראייןות", t: "Mitraynot" },
      ],
    },
  },

  // Envoyer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשלוח", translit: "Lichloakh", fr: "Envoyer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שולח", t: "Choleakh" },
        { p: "fém. sing. (אני/את/היא)", he: "שולחת", t: "Choleakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שולחים", t: "Cholekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שולחות", t: "Cholekhot" },
      ],
    },
  },

  // Espérer  // À COMPLÉTER : Futur
  {
    inf: "לקוות", translit: "Lekavot", fr: "Espérer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקווה", t: "Mekave" },
        { p: "fém. sing. (אני/את/היא)", he: "מקווה", t: "Mekava" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מקווים", t: "Mekavim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מקווות", t: "Mekavot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "קיוויתי", t: "Kiviti" },
        { p: "tu masc. (אתה)", he: "קיווית", t: "Kivita" },
        { p: "tu fém. (את)", he: "קיווית", t: "Kivit" },
        { p: "il (הוא)", he: "קיווה", t: "Kiva" },
        { p: "elle (היא)", he: "קיוותה", t: "Kivta" },
        { p: "nous (אנחנו)", he: "קיווינו", t: "Kivinu" },
        { p: "vous masc. (אתם)", he: "קיוויתם", t: "Kivitem" },
        { p: "vous fém. (אתן)", he: "קיוויתן", t: "Kiviten" },
        { p: "ils / elles (הם/הן)", he: "קיווו", t: "Kivu" },
      ],
    },
  },

  // Espérer (fort) / désirer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לייחל", translit: "Leyakhel", fr: "Espérer (fort) / désirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מייחל", t: "Meyakhel" },
        { p: "fém. sing. (אני/את/היא)", he: "מייחלת", t: "Meyakhelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מייחלים", t: "Meyakhlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מייחלות", t: "Meyakhlot" },
      ],
    },
  },

  // Essayer / tenter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנסות", translit: "Lenasot", fr: "Essayer / tenter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנסה", t: "Menase" },
        { p: "fém. sing. (אני/את/היא)", he: "מנסה", t: "Menasa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנסים", t: "Menasim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנסות", t: "Menasot" },
      ],
    },
  },

  // Essayer / tester  // À COMPLÉTER : Passé, Futur
  {
    inf: "למדוד", translit: "Limdod", fr: "Essayer / tester",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מודד", t: "Moded" },
        { p: "fém. sing. (אני/את/היא)", he: "מודדת", t: "Modedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מודדים", t: "Moddim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מודדות", t: "Moddot" },
      ],
    },
  },

  // Être  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיות", translit: "Lehiyot", fr: "Être",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הווה", t: "Hove" },
        { p: "fém. sing. (אני/את/היא)", he: "הווה", t: "Hova" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "הווים", t: "Hovim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "הווות", t: "Hovot" },
      ],
    },
  },

  // Être accepté / admis  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתקבל", translit: "Lehitkabel", fr: "Être accepté / admis",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקבל", t: "Mitkabel" },
        { p: "fém. sing. (אני/את/היא)", he: "מתקבלת", t: "Mitkabelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתקבלים", t: "Mitkablim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתקבלות", t: "Mitkablot" },
      ],
    },
  },

  // Être d'accord  // À COMPLÉTER : Passé, Futur
  {
    inf: "להסכים", translit: "Lehaskim", fr: "Être d'accord",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסכים", t: "Maskim" },
        { p: "fém. sing. (אני/את/היא)", he: "מסכיםה", t: "Maskima" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסכיםים", t: "Maskimim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסכיםות", t: "Maskimot" },
      ],
    },
  },

  // Être debout  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעמוד", translit: "Lahamod", fr: "Être debout",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עומד", t: "Omed" },
        { p: "fém. sing. (אני/את/היא)", he: "עומדת", t: "Omedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עומדים", t: "Omdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עומדות", t: "Omdot" },
      ],
    },
  },

  // Être en retard  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאחר", translit: "Le'akher", fr: "Être en retard",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאחר", t: "Me'akher" },
        { p: "fém. sing. (אני/את/היא)", he: "מאחרת", t: "Me'akheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאחרים", t: "Me'akhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאחרות", t: "Me'akhrot" },
      ],
    },
  },

  // Etre prêt  // À COMPLÉTER : Passé, Futur
  {
    inf: "", translit: "Lehiot Moukhan", fr: "Etre prêt",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממוכן", t: "Memoukhan" },
        { p: "fém. sing. (אני/את/היא)", he: "ממוכןת", t: "Memoukhanet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ממוכןים", t: "Memoukhnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ממוכןות", t: "Memoukhnot" },
      ],
    },
  },

  // Etudier  // À COMPLÉTER : Passé, Futur
  {
    inf: "ללמוד", translit: "Lilmod", fr: "Etudier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "לומד", t: "Lomed" },
        { p: "fém. sing. (אני/את/היא)", he: "לומדת", t: "Lomedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "לומדים", t: "Lomdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "לומדות", t: "Lomdot" },
      ],
    },
  },

  // Eviter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "", fr: "Eviter",
    temps: {},
  },

  // Exciter (pas sexuel)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתרגש", translit: "Lehitragech", fr: "Exciter (pas sexuel)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתרגש", t: "Mitragech" },
        { p: "fém. sing. (אני/את/היא)", he: "מתרגשת", t: "Mitragechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתרגשים", t: "Mitragchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתרגשות", t: "Mitragchot" },
      ],
    },
  },

  // Expliquer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להסביר", translit: "Lehasbir", fr: "Expliquer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסביר", t: "Masbir" },
        { p: "fém. sing. (אני/את/היא)", he: "מסבירה", t: "Masbira" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסבירים", t: "Masbirim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסבירות", t: "Masbirot" },
      ],
    },
  },

  // Faire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעשות", translit: "Laassot", fr: "Faire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עושה", t: "Osse" },
        { p: "fém. sing. (אני/את/היא)", he: "עושה", t: "Ossa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עושים", t: "Ossim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עושות", t: "Ossot" },
      ],
    },
  },

  // Faire du bénévolat  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתנדב", translit: "Lehitnadev", fr: "Faire du bénévolat",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנדב", t: "Mitnadev" },
        { p: "fém. sing. (אני/את/היא)", he: "מתנדבת", t: "Mitnadevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתנדבים", t: "Mitnadvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתנדבות", t: "Mitnadvot" },
      ],
    },
  },

  // Faire rire/être drôle/plaisanter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להצחיק", translit: "Lehatskhik", fr: "Faire rire/être drôle/plaisanter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצחיק", t: "Matskhik" },
        { p: "fém. sing. (אני/את/היא)", he: "מצחיקה", t: "Matskhika" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצחיקים", t: "Matskhikim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצחיקות", t: "Matskhikot" },
      ],
    },
  },

  // Fermer à clé  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לנעול דלת", translit: "Linhol delet", fr: "Fermer à clé",
    temps: {},
  },

  // Fêter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחגוג", translit: "Lakhgog", fr: "Fêter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוגג", t: "Khogeg" },
        { p: "fém. sing. (אני/את/היא)", he: "חוגגת", t: "Khogeget" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חוגגים", t: "Khoggim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חוגגות", t: "Khoggot" },
      ],
    },
  },

  // Finir/terminer (achever) / causer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגמור", translit: "Ligmor", fr: "Finir/terminer (achever) / causer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גומר", t: "Gomer" },
        { p: "fém. sing. (אני/את/היא)", he: "גומרת", t: "Gomeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "גומרים", t: "Gomrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "גומרות", t: "Gomrot" },
      ],
    },
  },

  // Finir/terminer (complètement)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לסיים", translit: "Lesayem", fr: "Finir/terminer (complètement)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסיים", t: "Mesayem" },
        { p: "fém. sing. (אני/את/היא)", he: "מסייםת", t: "Mesayemet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסייםים", t: "Mesaymim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסייםות", t: "Mesaymot" },
      ],
    },
  },

  // Finir (être fini)  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lehigamer", fr: "Finir (être fini)",
    temps: {},
  },

  // Fixer / prevoir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקבוע", translit: "Likboa", fr: "Fixer / prevoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קובע", t: "Kovea" },
        { p: "fém. sing. (אני/את/היא)", he: "קובעת", t: "Koveaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קובעים", t: "Kovaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קובעות", t: "Kovaot" },
      ],
    },
  },

  // Flotter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לצוף", translit: "Latsouf", fr: "Flotter",
    temps: {},
  },

  // Gagner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנצח", translit: "Lenatseakh", fr: "Gagner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנצח", t: "Menatseakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מנצחת", t: "Menatseakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנצחים", t: "Menatsekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנצחות", t: "Menatsekhot" },
      ],
    },
  },

  // Garder / proteger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשמור", translit: "Lichmor", fr: "Garder / proteger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שומר", t: "Chomer" },
        { p: "fém. sing. (אני/את/היא)", he: "שומרת", t: "Chomeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שומרים", t: "Chomrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שומרות", t: "Chomrot" },
      ],
    },
  },

  // Grandir  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לגדול", translit: "Ligdol", fr: "Grandir",
    temps: {},
  },

  // Grignoter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנשנש", translit: "Lenachnech", fr: "Grignoter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנשנש", t: "Menachnech" },
        { p: "fém. sing. (אני/את/היא)", he: "מנשנשת", t: "Menachnechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנשנשים", t: "Menachnchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנשנשות", t: "Menachnchot" },
      ],
    },
  },

  // Inventer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמציא", translit: "Lehamtsi", fr: "Inventer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממציא", t: "Mamtsi" },
        { p: "fém. sing. (אני/את/היא)", he: "ממציאה", t: "Mamtsia" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ממציאים", t: "Mamtsiim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ממציאות", t: "Mamtsiot" },
      ],
    },
  },

  // Jouer (foot)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשחק", translit: "Lessakhek", fr: "Jouer (foot)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משחק", t: "Messakhek" },
        { p: "fém. sing. (אני/את/היא)", he: "משחקת", t: "Messakheket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משחקים", t: "Messakhkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משחקות", t: "Messakhkot" },
      ],
    },
  },

  // Jouer (instrument)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנגן", translit: "Lenagen", fr: "Jouer (instrument)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנגן", t: "Menagen" },
        { p: "fém. sing. (אני/את/היא)", he: "מנגןת", t: "Menagenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנגןים", t: "Menagnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנגןות", t: "Menagnot" },
      ],
    },
  },

  // Lire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקרוא", translit: "Likro", fr: "Lire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קורא", t: "Kore" },
        { p: "fém. sing. (אני/את/היא)", he: "קוראת", t: "Koreet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קוראים", t: "Kreim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קוראות", t: "Kreot" },
      ],
    },
  },

  // Louer un appart (locataire)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשכור", translit: "Liskor", fr: "Louer un appart (locataire)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכר", t: "Sokher" },
        { p: "fém. sing. (אני/את/היא)", he: "שוכרת", t: "Sokheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוכרים", t: "Sokhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוכרות", t: "Sokhrot" },
      ],
    },
  },

  // Louer un appart (proprietaire)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להשכיר", translit: "Lehaskir", fr: "Louer un appart (proprietaire)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משכיר", t: "Maskir" },
        { p: "fém. sing. (אני/את/היא)", he: "משכירה", t: "Maskira" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משכירים", t: "Maskirim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משכירות", t: "Maskirot" },
      ],
    },
  },

  // Manger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאכול", translit: "Leekhol", fr: "Manger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אוכל", t: "Okhel" },
        { p: "fém. sing. (אני/את/היא)", he: "אוכלת", t: "Okhelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "אוכלים", t: "Okhlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "אוכלות", t: "Okhlot" },
      ],
    },
  },

  // Mentir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשקר", translit: "Lechaker", fr: "Mentir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משקר", t: "Mechaker" },
        { p: "fém. sing. (אני/את/היא)", he: "משקרת", t: "Mechakeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משקרים", t: "Mechakrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משקרות", t: "Mechakrot" },
      ],
    },
  },

  // Mettre/poser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשים", translit: "Lassim", fr: "Mettre/poser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שם", t: "Sam" },
        { p: "fém. sing. (אני/את/היא)", he: "שםת", t: "Samet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שםים", t: "Smim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שםות", t: "Smot" },
      ],
    },
  },

  // Montrer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להראות", translit: "Lehar'ot", fr: "Montrer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מראה", t: "Mar'é" },
        { p: "fém. sing. (אני/את/היא)", he: "מראה", t: "Mar'éa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מראים", t: "Mar'éim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מראות", t: "Mar'éot" },
      ],
    },
  },

  // Nager  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשחות", translit: "Liskhot", fr: "Nager",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוחה", t: "Sokhe" },
        { p: "fém. sing. (אני/את/היא)", he: "שוחה", t: "Sokha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוחים", t: "Sokhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוחות", t: "Sokhot" },
      ],
    },
  },

  // Naitre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיוולד", translit: "Lehivaled", fr: "Naitre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נולד", t: "Nolad" },
        { p: "fém. sing. (אני/את/היא)", he: "נולדת", t: "Noladet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נולדים", t: "Noldim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נולדות", t: "Noldot" },
      ],
    },
  },

  // Necessiter/exiger/impliquer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להצריך", translit: "Lehatsrikh", fr: "Necessiter/exiger/impliquer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצריך", t: "Matsrikh" },
        { p: "fém. sing. (אני/את/היא)", he: "מצריךה", t: "Matsrikha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצריךים", t: "Matsrikhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצריךות", t: "Matsrikhot" },
      ],
    },
  },

  // Oublier  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשכוח", translit: "Lichkoakh", fr: "Oublier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכח", t: "Chokheakh" },
        { p: "fém. sing. (אני/את/היא)", he: "שוכחת", t: "Chokheakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוכחים", t: "Chokhekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוכחות", t: "Chokhekhot" },
      ],
    },
  },

  // Ouvrir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לפתוח", translit: "Liftoakh", fr: "Ouvrir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פותח", t: "Poteakh" },
        { p: "fém. sing. (אני/את/היא)", he: "פותחת", t: "Poteakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "פותחים", t: "Potekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "פותחות", t: "Potekhot" },
      ],
    },
  },

  // Parler  // À COMPLÉTER : Passé, Futur
  {
    inf: "לדבר", translit: "Ledaber", fr: "Parler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדבר", t: "Medaber" },
        { p: "fém. sing. (אני/את/היא)", he: "מדברת", t: "Medaberet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מדברים", t: "Medabrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מדברות", t: "Medabrot" },
      ],
    },
  },

  // Passer / franchir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעבור", translit: "La'avor", fr: "Passer / franchir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עובר", t: "Hover" },
        { p: "fém. sing. (אני/את/היא)", he: "עוברת", t: "Hoveret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עוברים", t: "Hovrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עוברות", t: "Hovrot" },
      ],
    },
  },

  // Passer au dessus/ enjamber  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lifsoakh", fr: "Passer au dessus/ enjamber",
    temps: {},
  },

  // Payer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשלם", translit: "Lechalem", fr: "Payer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משלם", t: "Mechalem" },
        { p: "fém. sing. (אני/את/היא)", he: "משלםת", t: "Mechalemet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משלםים", t: "Mechalmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משלםות", t: "Mechalmot" },
      ],
    },
  },

  // Penser / Réfléchir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחשוב", translit: "Lakhchov", fr: "Penser / Réfléchir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חושב", t: "Khochev" },
        { p: "fém. sing. (אני/את/היא)", he: "חושבת", t: "Khochevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חושבים", t: "Khochvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חושבות", t: "Khochvot" },
      ],
    },
  },

  // Perdre  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאבד", translit: "Leabed", fr: "Perdre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאבד", t: "Meabed" },
        { p: "fém. sing. (אני/את/היא)", he: "מאבדת", t: "Meabedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאבדים", t: "Meabdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאבדות", t: "Meabdot" },
      ],
    },
  },

  // Peser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשקול", translit: "Lichkol", fr: "Peser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוקל", t: "Chokel" },
        { p: "fém. sing. (אני/את/היא)", he: "שוקלת", t: "Chokelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוקלים", t: "Choklim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוקלות", t: "Choklot" },
      ],
    },
  },

  // Pleurer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבכות", translit: "Livkot", fr: "Pleurer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוכה", t: "Bokhe" },
        { p: "fém. sing. (אני/את/היא)", he: "בוכה", t: "Bokha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בוכים", t: "Bokhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בוכות", t: "Bokhot" },
      ],
    },
  },

  // Porter ceinture sécurité  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחגור", translit: "Lakhgor", fr: "Porter ceinture sécurité",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוגר", t: "Khoger" },
        { p: "fém. sing. (אני/את/היא)", he: "חוגרת", t: "Khogeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חוגרים", t: "Khogrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חוגרות", t: "Khogrot" },
      ],
    },
  },

  // Porter des chaussettes  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגרוב", translit: "Ligrov", fr: "Porter des chaussettes",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גורב", t: "Gorev" },
        { p: "fém. sing. (אני/את/היא)", he: "גורבת", t: "Gorevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "גורבים", t: "Gorvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "גורבות", t: "Gorvot" },
      ],
    },
  },

  // Porter des chaussures  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנעול", translit: "Lin'ol", fr: "Porter des chaussures",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נועל", t: "No'el" },
        { p: "fém. sing. (אני/את/היא)", he: "נועלת", t: "No'elet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נועלים", t: "No'lim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נועלות", t: "No'lot" },
      ],
    },
  },

  // Porter des lunettes  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להרכיב", translit: "Learkiv", fr: "Porter des lunettes",
    temps: {},
  },

  // Porter écharp/mask/foular  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעטות", translit: "Lahatot", fr: "Porter écharp/mask/foular",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוטה", t: "Hote" },
        { p: "fém. sing. (אני/את/היא)", he: "עוטה", t: "Hota" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עוטים", t: "Hotim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עוטות", t: "Hotot" },
      ],
    },
  },

  // Porter un bijou  // À COMPLÉTER : Passé, Futur
  {
    inf: "לענוד", translit: "Lahanod", fr: "Porter un bijou",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עונד", t: "Honed" },
        { p: "fém. sing. (אני/את/היא)", he: "עונדת", t: "Honedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עונדים", t: "Hondim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עונדות", t: "Hondot" },
      ],
    },
  },

  // Porter un chapeau  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחבוש", translit: "Lakhboch", fr: "Porter un chapeau",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חובש", t: "Khovech" },
        { p: "fém. sing. (אני/את/היא)", he: "חובשת", t: "Khovechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חובשים", t: "Khovchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חובשות", t: "Khovchot" },
      ],
    },
  },

  // Habiller (porter des vêtements)  // À COMPLÉTER : Passé, Futur
  {
    inf: "ללבוש", translit: "Lilboch", fr: "Habiller (porter des vêtements)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "לובש", t: "Lovech" },
        { p: "fém. sing. (אני/את/היא)", he: "לובשת", t: "Lovechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "לובשים", t: "Lovchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "לובשות", t: "Lovchot" },
      ],
    },
  },

  // Pouvoir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לוכל", translit: "Loukhal", fr: "Pouvoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יכול", t: "Yakhol" },
        { p: "fém. sing. (אני/את/היא)", he: "יכולת", t: "Yakholet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יכולים", t: "Yakhlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יכולות", t: "Yakhlot" },
      ],
    },
  },

  // Préférer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להעדיף", translit: "Lea'adif", fr: "Préférer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעדיף", t: "Ma'adif" },
        { p: "fém. sing. (אני/את/היא)", he: "מעדיףת", t: "Ma'adifet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מעדיףים", t: "Ma'adfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מעדיףות", t: "Ma'adfot" },
      ],
    },
  },

  // Prier  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתפלל", translit: "Lehitpalel", fr: "Prier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתפלל", t: "Mitpalel" },
        { p: "fém. sing. (אני/את/היא)", he: "מתפללת", t: "Mitpalelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתפללים", t: "Mitpallim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתפללות", t: "Mitpallot" },
      ],
    },
  },

  // Progresser / avancer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתקדם", translit: "Lehitkadem", fr: "Progresser / avancer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקדם", t: "Mitkadem" },
        { p: "fém. sing. (אני/את/היא)", he: "מתקדםת", t: "Mitkademet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתקדםים", t: "Mitkadmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתקדםות", t: "Mitkadmot" },
      ],
    },
  },

  // Promettre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להבטיח", translit: "Lehavtiakh", fr: "Promettre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטיח", t: "Mavtiakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מבטיחה", t: "Mavtiakha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מבטיחים", t: "Mavtiakhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מבטיחות", t: "Mavtiakhot" },
      ],
    },
  },

  // Promettre  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להבטיח", translit: "Lehavtiakh", fr: "Promettre",
    temps: {},
  },

  // Quitter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לעזוב", translit: "Lahazov", fr: "Quitter",
    temps: {},
  },

  // Raconter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לספר", translit: "Lesaper", fr: "Raconter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מספר", t: "Mesaper" },
        { p: "fém. sing. (אני/את/היא)", he: "מספרת", t: "Mesaperet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מספרים", t: "Mesaprim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מספרות", t: "Mesaprot" },
      ],
    },
  },

  // Ranger / organiser  // À COMPLÉTER : Futur
  {
    inf: "לסדר", translit: "Lesader", fr: "Ranger / organiser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסדר", t: "Mesader" },
        { p: "fém. sing. (אני/את/היא)", he: "מסדרת", t: "Mesaderet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסדרים", t: "Mesadrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסדרות", t: "Mesadrot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "סידרתי", t: "Siderti" },
        { p: "tu masc. (אתה)", he: "סידרת", t: "Siderta" },
        { p: "tu fém. (את)", he: "סידרת", t: "Sidert" },
        { p: "il (הוא)", he: "סידר", t: "Sider" },
        { p: "elle (היא)", he: "סידרה", t: "Sidra" },
        { p: "nous (אנחנו)", he: "סידרנו", t: "Sidernu" },
        { p: "vous masc. (אתם)", he: "סידרתם", t: "Sdertem" },
        { p: "vous fém. (אתן)", he: "סידרתן", t: "Sderten" },
        { p: "ils / elles (הם/הן)", he: "סידרו", t: "Sidru" },
      ],
    },
  },

  // Recevoir (un cadeau)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקבל", translit: "Lekabel", fr: "Recevoir (un cadeau)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקבל", t: "Mekabel" },
        { p: "fém. sing. (אני/את/היא)", he: "מקבלת", t: "Mekabelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מקבלים", t: "Mekablim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מקבלות", t: "Mekablot" },
      ],
    },
  },

  // Recommander / conseiller  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמליץ", translit: "Lehamlitz", fr: "Recommander / conseiller",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממליץ", t: "Mamlitz" },
        { p: "fém. sing. (אני/את/היא)", he: "ממליץה", t: "Mamlitza" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ממליץים", t: "Mamlitzim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ממליץות", t: "Mamlitzot" },
      ],
    },
  },

  // Regarder  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיסתכל", translit: "Lehistakel", fr: "Regarder",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מיסתכל", t: "Mistakel" },
        { p: "fém. sing. (אני/את/היא)", he: "מיסתכלת", t: "Mistakelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מיסתכלים", t: "Mistaklim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מיסתכלות", t: "Mistaklot" },
      ],
    },
  },

  // Remplacer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להחליף", translit: "Lehakhlif", fr: "Remplacer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחליף", t: "Makhlif" },
        { p: "fém. sing. (אני/את/היא)", he: "מחליףה", t: "Makhlifa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מחליףים", t: "Makhlifim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מחליףות", t: "Makhlifot" },
      ],
    },
  },

  // Rencontrer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לפגוש", translit: "Lifgoch", fr: "Rencontrer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פוגש", t: "Pogech" },
        { p: "fém. sing. (אני/את/היא)", he: "פוגשת", t: "Pogechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "פוגשים", t: "Pogchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "פוגשות", t: "Pogchot" },
      ],
    },
  },

  // Rentrer/revenir/réviser/répéter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחזור", translit: "Lakhzor", fr: "Rentrer/revenir/réviser/répéter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוזר", t: "Khozer" },
        { p: "fém. sing. (אני/את/היא)", he: "חוזרת", t: "Khozeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חוזרים", t: "Khozrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חוזרות", t: "Khozrot" },
      ],
    },
  },

  // Répondre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להנות", translit: "Lehanot", fr: "Répondre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהנה", t: "Mehane" },
        { p: "fém. sing. (אני/את/היא)", he: "מהנה", t: "Mehana" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהנים", t: "Mehanim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהנות", t: "Mehanot" },
      ],
    },
  },

  // Ressembler  // À COMPLÉTER : Passé, Futur
  {
    inf: "לדמות", translit: "Lidmot", fr: "Ressembler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דומה", t: "Dome" },
        { p: "fém. sing. (אני/את/היא)", he: "דומה", t: "Doma" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "דומים", t: "Domim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "דומות", t: "Domot" },
      ],
    },
  },

  // Réussir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להצליח", translit: "Lehatsliakh", fr: "Réussir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצליח", t: "Matsliakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מצליחה", t: "Matsliakha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצליחים", t: "Matsliakhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצליחות", t: "Matsliakhot" },
      ],
    },
  },

  // Rigoler / plaisanter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לצחוק", translit: "Litskhok", fr: "Rigoler / plaisanter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צוחק", t: "Tsokhek" },
        { p: "fém. sing. (אני/את/היא)", he: "צוחקת", t: "Tsokheket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "צוחקים", t: "Tsokhkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "צוחקות", t: "Tsokhkot" },
      ],
    },
  },

  // S'asseoir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשבת", translit: "Lachevet", fr: "S'asseoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יושב", t: "Yochev" },
        { p: "fém. sing. (אני/את/היא)", he: "יושבת", t: "Yochevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יושבים", t: "Yochvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יושבות", t: "Yochvot" },
      ],
    },
  },

  // S'écrire  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתכתב", translit: "Lehitkhatev", fr: "S'écrire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתכתב", t: "Mitkhatev" },
        { p: "fém. sing. (אני/את/היא)", he: "מתכתבת", t: "Mitkhatevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתכתבים", t: "Mitkhatvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתכתבות", t: "Mitkhatvot" },
      ],
    },
  },

  // S'ennuyer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לשעמם", translit: "Lechaamem", fr: "S'ennuyer",
    temps: {},
  },

  // Habiller (action : se vêtir)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתלבש", translit: "Lehitlabech", fr: "Habiller (action : se vêtir)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתלבש", t: "Mitlabech" },
        { p: "fém. sing. (אני/את/היא)", he: "מתלבשת", t: "Mitlabechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתלבשים", t: "Mitlabchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתלבשות", t: "Mitlabchot" },
      ],
    },
  },

  // Se balader (trip)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לטייל", translit: "Letayel", fr: "Se balader (trip)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מטייל", t: "Metayel" },
        { p: "fém. sing. (אני/את/היא)", he: "מטיילת", t: "Metayelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מטיילים", t: "Metaylim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מטיילות", t: "Metaylot" },
      ],
    },
  },

  // Se deguiser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתחפש", translit: "Lehitkhapes", fr: "Se deguiser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחפש", t: "Mitkhapes" },
        { p: "fém. sing. (אני/את/היא)", he: "מתחפשת", t: "Mitkhapeset" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתחפשים", t: "Mitkhapsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתחפשות", t: "Mitkhapsot" },
      ],
    },
  },

  // Se déplacer (en avion)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לטוס", translit: "Latous", fr: "Se déplacer (en avion)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טס", t: "Tass" },
        { p: "fém. sing. (אני/את/היא)", he: "טסת", t: "Tasset" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "טסים", t: "Tssim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "טסות", t: "Tssot" },
      ],
    },
  },

  // Se déplacer (voiture, bus…)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לינסוע", translit: "Linsoa", fr: "Se déplacer (voiture, bus…)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוסע", t: "Nossea" },
        { p: "fém. sing. (אני/את/היא)", he: "נוסעת", t: "Nosseaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נוסעים", t: "Nossaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נוסעות", t: "Nossaot" },
      ],
    },
  },

  // Se doucher  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתקלח", translit: "Lehitkalakh", fr: "Se doucher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקלח", t: "Mitkaleakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מתקלחת", t: "Mitkaleakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתקלחים", t: "Mitkalekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתקלחות", t: "Mitkalekhot" },
      ],
    },
  },

  // Se laver  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשטוף", translit: "Lichtof", fr: "Se laver",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוטף", t: "Chotef" },
        { p: "fém. sing. (אני/את/היא)", he: "שוטףת", t: "Chotefet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוטףים", t: "Chotfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוטףות", t: "Chotfot" },
      ],
    },
  },

  // Se maquiller  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתאפר", translit: "Lehit'aper", fr: "Se maquiller",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאפר", t: "Mit'aper" },
        { p: "fém. sing. (אני/את/היא)", he: "מתאפרת", t: "Mit'aperet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתאפרים", t: "Mit'aprim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתאפרות", t: "Mit'aprot" },
      ],
    },
  },

  // Se marier  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתחתן", translit: "Lehitkhaten", fr: "Se marier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחתן", t: "Mitkhaten" },
        { p: "fém. sing. (אני/את/היא)", he: "מתחתןת", t: "Mitkhatenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתחתןים", t: "Mitkhatnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתחתןות", t: "Mitkhatnot" },
      ],
    },
  },

  // Se reposer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנוח", translit: "Lanouakh", fr: "Se reposer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נח", t: "Nakh" },
        { p: "fém. sing. (אני/את/היא)", he: "נחת", t: "Nakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נחים", t: "Nkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נחות", t: "Nkhot" },
      ],
    },
  },

  // Se retourner  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתפך", translit: "Lehit'apekh", fr: "Se retourner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתהפך", t: "Mit'hapekh" },
        { p: "fém. sing. (אני/את/היא)", he: "מתהפךת", t: "Mit'hapekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתהפךים", t: "Mit'hapkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתהפךות", t: "Mit'hapkhot" },
      ],
    },
  },

  // Se retrouver  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיפגש", translit: "Lehipagech", fr: "Se retrouver",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נפגש", t: "Nifgach" },
        { p: "fém. sing. (אני/את/היא)", he: "נפגשת", t: "Nifgachet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נפגשים", t: "Nifgchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נפגשות", t: "Nifgchot" },
      ],
    },
  },

  // Se lever  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקום", translit: "Lakoum", fr: "Se lever",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קם", t: "Kam" },
        { p: "fém. sing. (אני/את/היא)", he: "קםת", t: "Kamet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קםים", t: "Kmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קםות", t: "Kmot" },
      ],
    },
  },

  // Se saouler  // À COMPLÉTER : Passé, Futur
  {
    inf: "להשתכר", translit: "Lehichtaker", fr: "Se saouler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתכר", t: "Michtaker" },
        { p: "fém. sing. (אני/את/היא)", he: "משתכרת", t: "Michtakeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משתכרים", t: "Michtakrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משתכרות", t: "Michtakrot" },
      ],
    },
  },

  // Se sentir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרגיש", translit: "Lehargich", fr: "Se sentir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרגיש", t: "Margich" },
        { p: "fém. sing. (אני/את/היא)", he: "מרגישה", t: "Margicha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרגישים", t: "Margichim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרגישות", t: "Margichot" },
      ],
    },
  },

  // Se tromper  // À COMPLÉTER : Passé, Futur
  {
    inf: "לטעות", translit: "Lit'ot", fr: "Se tromper",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טועה", t: "To'e" },
        { p: "fém. sing. (אני/את/היא)", he: "טועה", t: "To'a" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "טועים", t: "To'im" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "טועות", t: "To'ot" },
      ],
    },
  },

  // Se trouver  // À COMPLÉTER : Passé, Futur
  {
    inf: "למצא", translit: "Limtso", fr: "Se trouver",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נמצא", t: "Nimtsa" },
        { p: "fém. sing. (אני/את/היא)", he: "נמצאת", t: "Nimtsaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נמצאים", t: "Nmtsaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נמצאות", t: "Nmtsaot" },
      ],
    },
  },

  // Sortir (au resto, avec des amis…)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לצאת", translit: "Latset", fr: "Sortir (au resto, avec des amis…)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יוצא", t: "Yots'e" },
        { p: "fém. sing. (אני/את/היא)", he: "יוצאת", t: "Yots'eet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יוצאים", t: "Yts'eim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יוצאות", t: "Yts'eot" },
      ],
    },
  },

  // Souffler (vent)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנשוב", translit: "Linchov", fr: "Souffler (vent)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נושב", t: "Nochev" },
        { p: "fém. sing. (אני/את/היא)", he: "נושבת", t: "Nochevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נושבים", t: "Nochvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נושבות", t: "Nochvot" },
      ],
    },
  },

  // Souhaiter / te souhaiter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאחל", translit: "Le'akhel", fr: "Souhaiter / te souhaiter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאחל", t: "Me'akhel" },
        { p: "fém. sing. (אני/את/היא)", he: "מאחלת", t: "Me'akhelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאחלים", t: "Me'akhlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאחלות", t: "Me'akhlot" },
      ],
    },
  },

  // Survivre  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשרוד", translit: "Lisrod", fr: "Survivre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שורד", t: "Sored" },
        { p: "fém. sing. (אני/את/היא)", he: "שורדת", t: "Soredet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שורדים", t: "Sordim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שורדות", t: "Sordot" },
      ],
    },
  },

  // Tomber malade  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחלות", translit: "Lakhlot", fr: "Tomber malade",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חולה", t: "Khole" },
        { p: "fém. sing. (אני/את/היא)", he: "חולה", t: "Khola" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חולים", t: "Kholim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חולות", t: "Kholot" },
      ],
    },
  },

  // Tourner (changer de direction)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לפנות", translit: "Lifnot", fr: "Tourner (changer de direction)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פונה", t: "Pone" },
        { p: "fém. sing. (אני/את/היא)", he: "פונה", t: "Pona" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "פונים", t: "Ponim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "פונות", t: "Ponot" },
      ],
    },
  },

  // Travailler  // À COMPLÉTER : Passé, Futur
  {
    inf: "לעבוד", translit: "La'avod", fr: "Travailler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עובד", t: "Oved" },
        { p: "fém. sing. (אני/את/היא)", he: "עובדת", t: "Ovedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עובדים", t: "Ovdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עובדות", t: "Ovdot" },
      ],
    },
  },

  // Tuer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרוג", translit: "Laharog", fr: "Tuer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הורג", t: "Oreg" },
        { p: "fém. sing. (אני/את/היא)", he: "הורגת", t: "Oreget" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "הורגים", t: "Orgim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "הורגות", t: "Orgot" },
      ],
    },
  },

  // Tuer (abattage rituel)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשחוט", translit: "Lichkhot", fr: "Tuer (abattage rituel)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוחט", t: "Chokhet" },
        { p: "fém. sing. (אני/את/היא)", he: "שוחטת", t: "Chokhetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוחטים", t: "Chokhtim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוחטות", t: "Chokhtot" },
      ],
    },
  },

  // Utiliser  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lehichtamech", fr: "Utiliser",
    temps: {},
  },

  // Vendre  // À COMPLÉTER : Passé, Futur
  {
    inf: "למכור", translit: "Limkor", fr: "Vendre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוכר", t: "Mokher" },
        { p: "fém. sing. (אני/את/היא)", he: "מוכרת", t: "Mokheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מוכרים", t: "Mokhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מוכרות", t: "Mokhrot" },
      ],
    },
  },

  // Venir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבוא", translit: "Lavo", fr: "Venir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בא", t: "Ba" },
        { p: "fém. sing. (אני/את/היא)", he: "באת", t: "Baet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "באים", t: "Baim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "באות", t: "Baot" },
      ],
    },
  },

  // Visiter quelqu'un (et)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבקר", translit: "Levaker", fr: "Visiter quelqu'un (et)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבקר", t: "Mevaker" },
        { p: "fém. sing. (אני/את/היא)", he: "מבקרת", t: "Mevakeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מבקרים", t: "Mevakrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מבקרות", t: "Mevakrot" },
      ],
    },
  },

  // Vivre / habiter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגור", translit: "Lagour", fr: "Vivre / habiter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גר", t: "Gar" },
        { p: "fém. sing. (אני/את/היא)", he: "גרת", t: "Garet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "גרים", t: "Grim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "גרות", t: "Grot" },
      ],
    },
  },

  // Voir (film)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לראות", translit: "Lir'ot", fr: "Voir (film)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רואה", t: "Roe" },
        { p: "fém. sing. (אני/את/היא)", he: "רואה", t: "Roa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "רואים", t: "Roim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "רואות", t: "Root" },
      ],
    },
  },

  // Voter / indiquer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להצביע", translit: "Lehatsbia", fr: "Voter / indiquer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצביע", t: "Matsbia" },
        { p: "fém. sing. (אני/את/היא)", he: "מצביעה", t: "Matsbiaa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצביעים", t: "Matsbiaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצביעות", t: "Matsbiaot" },
      ],
    },
  },

  // Vouloir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרצות", translit: "Lirtsot", fr: "Vouloir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוצה", t: "Rotse" },
        { p: "fém. sing. (אני/את/היא)", he: "רוצה", t: "Rotsa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "רוצים", t: "Rotsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "רוצות", t: "Rotsot" },
      ],
    },
  },

  // Corriger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לתקן", translit: "Letaken", fr: "Corriger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקן", t: "Metaken" },
        { p: "fém. sing. (אני/את/היא)", he: "מתקןת", t: "Metakenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתקןים", t: "Metaknim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתקןות", t: "Metaknot" },
      ],
    },
  },

  // Rester  // À COMPLÉTER : Passé, Futur
  {
    inf: "להישאר", translit: "Lehicha'er", fr: "Rester",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נשאר", t: "Nich'ar" },
        { p: "fém. sing. (אני/את/היא)", he: "נשארת", t: "Nich'aret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נשארים", t: "Nich'rim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נשארות", t: "Nich'rot" },
      ],
    },
  },

  // Durer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להימשך", translit: "Lehimachekh", fr: "Durer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נמשך", t: "Nimchakh" },
        { p: "fém. sing. (אני/את/היא)", he: "נמשךת", t: "Nimchakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נמשךים", t: "Nimchkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נמשךות", t: "Nimchkhot" },
      ],
    },
  },

  // Se souvenir (passif)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לזכור", translit: "Lizcor", fr: "Se souvenir (passif)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "זוכר", t: "Zokher" },
        { p: "fém. sing. (אני/את/היא)", he: "זוכרת", t: "Zokheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "זוכרים", t: "Zokhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "זוכרות", t: "Zokhrot" },
      ],
    },
  },

  // Se souvenir (actif : action de réflechir)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיזכר", translit: "Lehizakher (be)", fr: "Se souvenir (actif : action de réflechir)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נזכר", t: "Nizcar" },
        { p: "fém. sing. (אני/את/היא)", he: "נזכרת", t: "Nizcaret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נזכרים", t: "Nizcrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נזכרות", t: "Nizcrot" },
      ],
    },
  },

  // Echouer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיכשל", translit: "Lehicachel (be)", fr: "Echouer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נכשל", t: "Nikhchal" },
        { p: "fém. sing. (אני/את/היא)", he: "נכשלת", t: "Nikhchalet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נכשלים", t: "Nikhchlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נכשלות", t: "Nikhchlot" },
      ],
    },
  },

  // S'inscrire  // À COMPLÉTER : Passé, Futur
  {
    inf: "להירשם", translit: "Lehirachem", fr: "S'inscrire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נרשם", t: "Nircham" },
        { p: "fém. sing. (אני/את/היא)", he: "נרשםת", t: "Nirchamet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נרשםים", t: "Nirchmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נרשםות", t: "Nirchmot" },
      ],
    },
  },

  // Réaliser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להגשים", translit: "Lehagchim", fr: "Réaliser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגשים", t: "Magchim" },
        { p: "fém. sing. (אני/את/היא)", he: "מגשיםה", t: "Magchima" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מגשיםים", t: "Magchimim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מגשיםות", t: "Magchimot" },
      ],
    },
  },

  // Gagner (de l'argent)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרוויח כסף", translit: "Learviakh kesef", fr: "Gagner (de l'argent)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרוויח", t: "Marvikh" },
        { p: "fém. sing. (אני/את/היא)", he: "מרוויחת", t: "Marvikhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרוויחים", t: "Marvkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרוויחות", t: "Marvkhot" },
      ],
    },
  },

  // Influencer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להשפיע", translit: "Lehachpiha", fr: "Influencer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משפיע", t: "Machpiha" },
        { p: "fém. sing. (אני/את/היא)", he: "משפיעה", t: "Machpihaa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משפיעים", t: "Machpihaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משפיעות", t: "Machpihaot" },
      ],
    },
  },

  // Attacher / nouer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקשור", translit: "Likchor", fr: "Attacher / nouer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קושר", t: "Kocher" },
        { p: "fém. sing. (אני/את/היא)", he: "קושרת", t: "Kocheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קושרים", t: "Kochrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קושרות", t: "Kochrot" },
      ],
    },
  },

  // Sacrifier  // À COMPLÉTER : Passé, Futur
  {
    inf: "להקריב", translit: "Lehakriv", fr: "Sacrifier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקריב", t: "Makriv" },
        { p: "fém. sing. (אני/את/היא)", he: "מקריבה", t: "Makriva" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מקריבים", t: "Makrivim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מקריבות", t: "Makrivot" },
      ],
    },
  },

  // Respecter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לכבד", translit: "Lekhabed", fr: "Respecter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכבד", t: "Mekhabed" },
        { p: "fém. sing. (אני/את/היא)", he: "מכבדת", t: "Mekhabedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מכבדים", t: "Mekhabdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מכבדות", t: "Mekhabdot" },
      ],
    },
  },

  // Egorger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשחוט", translit: "Lichkot", fr: "Egorger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוקט", t: "Choket" },
        { p: "fém. sing. (אני/את/היא)", he: "שוקטת", t: "Choketet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוקטים", t: "Choktim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוקטות", t: "Choktot" },
      ],
    },
  },

  // Voler (dérober)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגנוב", translit: "Lignov", fr: "Voler (dérober)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גונב", t: "Gonev" },
        { p: "fém. sing. (אני/את/היא)", he: "גונבת", t: "Gonevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "גונבים", t: "Gonvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "גונבות", t: "Gonvot" },
      ],
    },
  },

  // Tromper / trahir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבגוד", translit: "Livgod", fr: "Tromper / trahir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוגד", t: "Boged" },
        { p: "fém. sing. (אני/את/היא)", he: "בוגדת", t: "Bogedet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בוגדים", t: "Bogdim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בוגדות", t: "Bogdot" },
      ],
    },
  },

  // Deviner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנחש", translit: "Lenakhech", fr: "Deviner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנחש", t: "Menakhech" },
        { p: "fém. sing. (אני/את/היא)", he: "מנחשת", t: "Menakhechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מנחשים", t: "Menakhchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מנחשות", t: "Menakhchot" },
      ],
    },
  },

  // Lever  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרים", translit: "Leharim", fr: "Lever",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרים", t: "Marim" },
        { p: "fém. sing. (אני/את/היא)", he: "מריםה", t: "Marima" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מריםים", t: "Marimim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מריםות", t: "Marimot" },
      ],
    },
  },

  // Toucher (physique)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגעת", translit: "Lagahat", fr: "Toucher (physique)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוגע", t: "Nogea" },
        { p: "fém. sing. (אני/את/היא)", he: "נוגעת", t: "Nogeaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נוגעים", t: "Nogaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נוגעות", t: "Nogaot" },
      ],
    },
  },

  // Copier / tricher  // À COMPLÉTER : Passé, Futur
  {
    inf: "להעתיק", translit: "Leahetik", fr: "Copier / tricher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעדיק", t: "Mahetik" },
        { p: "fém. sing. (אני/את/היא)", he: "מעדיקת", t: "Mahetiket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מעדיקים", t: "Mahetkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מעדיקות", t: "Mahetkot" },
      ],
    },
  },

  // Tomber amoureux  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתאהב", translit: "Lehit'aev", fr: "Tomber amoureux",
    temps: {},
  },

  // S'opposer à  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתנגד", translit: "Lehitnaged", fr: "S'opposer à",
    temps: {},
  },

  // Prendre quelqu'un dans ses bras  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתחבק", translit: "Lehitkhabek", fr: "Prendre quelqu'un dans ses bras",
    temps: {},
  },

  // S'éloigner de (מ)  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתרחק", translit: "Lehitrakhek", fr: "S'éloigner de (מ)",
    temps: {},
  },

  // S'approcher de (ל)  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתקרב", translit: "Lehitkarev", fr: "S'approcher de (ל)",
    temps: {},
  },

  // Ressentir un manque (ל)  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתגעגע", translit: "Lehitgahageha", fr: "Ressentir un manque (ל)",
    temps: {},
  },

  // Être désolé / regretter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להצטער", translit: "Lehitstaher", fr: "Être désolé / regretter",
    temps: {},
  },

  // Annuler/supprimer/abandonner  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לבטל", translit: "Levatel", fr: "Annuler/supprimer/abandonner",
    temps: {},
  },

  // Accoucher  // À COMPLÉTER : Passé, Futur
  {
    inf: "ללדת", translit: "Laledet", fr: "Accoucher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יולד", t: "Yoled" },
        { p: "fém. sing. (אני/את/היא)", he: "יולדת", t: "Yoledet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יולדים", t: "Yoldim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יולדות", t: "Yoldot" },
      ],
    },
  },

  // Chasser  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לצוד", translit: "Latsoud", fr: "Chasser",
    temps: {},
  },

  // Souhaiter / saluer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לברך", translit: "Levarekh", fr: "Souhaiter / saluer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מברך", t: "Mevarekh" },
        { p: "fém. sing. (אני/את/היא)", he: "מברךת", t: "Mevarekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מברךים", t: "Mevarkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מברךות", t: "Mevarkhot" },
      ],
    },
  },

  // Tricher / arnaquer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרמות", translit: "Leramot", fr: "Tricher / arnaquer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרמה", t: "Merame" },
        { p: "fém. sing. (אני/את/היא)", he: "מרמה", t: "Merama" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרמים", t: "Meramim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרמות", t: "Meramot" },
      ],
    },
  },

  // Goûter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לטעום", translit: "Lit'om", fr: "Goûter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טועם", t: "Tohem" },
        { p: "fém. sing. (אני/את/היא)", he: "טועםת", t: "Tohemet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "טועםים", t: "Tohmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "טועםות", t: "Tohmot" },
      ],
    },
  },

  // Avoir honte  // À COMPLÉTER : Futur
  {
    inf: "לבוש", translit: "Levoch", fr: "Avoir honte",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוש", t: "Boch" },
        { p: "fém. sing. (אני/את/היא)", he: "בושת", t: "Bochet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בושים", t: "Bchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בושות", t: "Bchot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "בושתי", t: "Bochti" },
        { p: "tu masc. (אתה)", he: "בושת", t: "Bochta" },
        { p: "tu fém. (את)", he: "בושת", t: "Bocht" },
        { p: "il (הוא)", he: "בוש", t: "Boch" },
        { p: "elle (היא)", he: "בושה", t: "Bcha" },
        { p: "nous (אנחנו)", he: "בושנו", t: "Bochnu" },
        { p: "vous masc. (אתם)", he: "בושתם", t: "Bchtem" },
        { p: "vous fém. (אתן)", he: "בושתן", t: "Bchten" },
        { p: "ils / elles (הם/הן)", he: "בושו", t: "Bchu" },
      ],
    },
  },

  // Compléter / remplir  // À COMPLÉTER : Futur
  {
    inf: "להשלים", translit: "Lehachlim", fr: "Compléter / remplir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משלים", t: "Machlim" },
        { p: "fém. sing. (אני/את/היא)", he: "משליםה", t: "Machlima" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משליםים", t: "Machlimim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משליםות", t: "Machlimot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "ברחתי", t: "Barakhti" },
        { p: "tu masc. (אתה)", he: "ברחת", t: "Barakhta" },
        { p: "tu fém. (את)", he: "ברחת", t: "Barakht" },
        { p: "il (הוא)", he: "ברח", t: "Barakh" },
        { p: "elle (היא)", he: "ברחה", t: "Barkha" },
        { p: "nous (אנחנו)", he: "ברחנו", t: "Barakhnu" },
        { p: "vous masc. (אתם)", he: "ברחתם", t: "Brakhtem" },
        { p: "vous fém. (אתן)", he: "ברחתן", t: "Brakhten" },
        { p: "ils / elles (הם/הן)", he: "ברחו", t: "Barkhu" },
      ],
    },
  },

  // Avoir raconté  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "מסופר", translit: "Mesoupar", fr: "Avoir raconté",
    temps: {},
  },

  // Toucher (atteindre)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנגוע", translit: "Lingoa", fr: "Toucher (atteindre)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוגע", t: "Nogea" },
        { p: "fém. sing. (אני/את/היא)", he: "נוגעת", t: "Nogeaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נוגעים", t: "Nogaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נוגעות", t: "Nogaot" },
      ],
    },
  },

  // S'être terminé  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lehistayem", fr: "S'être terminé",
    temps: {},
  },

  // Crier  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לצעוק", translit: "Lits'ok", fr: "Crier",
    temps: {},
  },

  // Blesser / vexer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לפגוע", translit: "Lifgoa", fr: "Blesser / vexer",
    temps: {},
  },

  // Déplacer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להזיז", translit: "Lehaziz", fr: "Déplacer",
    temps: {},
  },

  // Réveiller  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להעיר", translit: "Leha'ir", fr: "Réveiller",
    temps: {},
  },

  // Se réveiller  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתעורר", translit: "Lehit'orer", fr: "Se réveiller",
    temps: {},
  },

  // Proposer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להציע", translit: "Lehatsia", fr: "Proposer",
    temps: {},
  },

  // Acquérir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרכוש", translit: "Lirkoch", fr: "Acquérir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוכש", t: "Rokech" },
        { p: "fém. sing. (אני/את/היא)", he: "רוכשת", t: "Rokechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "רוכשים", t: "Rokchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "רוכשות", t: "Rokchot" },
      ],
    },
  },

  // Interpréter / expliquer / traduire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לפרש", translit: "Lefarech", fr: "Interpréter / expliquer / traduire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פורש", t: "Porech" },
        { p: "fém. sing. (אני/את/היא)", he: "פורשת", t: "Porechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "פורשים", t: "Porchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "פורשות", t: "Porchot" },
      ],
    },
  },

  // Présenter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להציג", translit: "Lehatsig", fr: "Présenter",
    temps: {},
  },

  // Passer/amuser/rester/vivre  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לבלות", translit: "Levalot", fr: "Passer/amuser/rester/vivre",
    temps: {},
  },

  // Regarder  // À COMPLÉTER : Passé, Futur
  {
    inf: "להביט", translit: "Lehabit", fr: "Regarder",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מביט", t: "Mabit" },
        { p: "fém. sing. (אני/את/היא)", he: "מביטה", t: "Mabita" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מביטים", t: "Mabitim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מביטות", t: "Mabitot" },
      ],
    },
  },

  // Rendre/causer/faire  // À COMPLÉTER : Passé, Futur
  {
    inf: "לגרום", translit: "Ligrom", fr: "Rendre/causer/faire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גורם", t: "Gorem" },
        { p: "fém. sing. (אני/את/היא)", he: "גורםת", t: "Goremet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "גורםים", t: "Gormim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "גורםות", t: "Gormot" },
      ],
    },
  },

  // Perdre  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להפסיד", translit: "Leafsid", fr: "Perdre",
    temps: {},
  },

  // Faire le deuil  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתאבל", translit: "Lehit'abel", fr: "Faire le deuil",
    temps: {},
  },

  // Pêcher (heb moderne : pas très grave)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לחטוא", translit: "Lakhto", fr: "Pêcher (heb moderne : pas très grave)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוטא", t: "Khote" },
        { p: "fém. sing. (אני/את/היא)", he: "חוטאת", t: "Khoteet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חוטאים", t: "Khteim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חוטאות", t: "Khteot" },
      ],
    },
  },

  // Arroser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להשקות", translit: "Lehachkot", fr: "Arroser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משקה", t: "Machke" },
        { p: "fém. sing. (אני/את/היא)", he: "משקה", t: "Machka" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משקים", t: "Machkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משקות", t: "Machkot" },
      ],
    },
  },

  // Excuser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לסלוח", translit: "Lisloakh", fr: "Excuser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "סולח", t: "Soleakh" },
        { p: "fém. sing. (אני/את/היא)", he: "סולחת", t: "Soleakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "סולחים", t: "Solekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "סולחות", t: "Solekhot" },
      ],
    },
  },

  // Faire l'amour/s'allonger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשכב", translit: "Lichkav", fr: "Faire l'amour/s'allonger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכב", t: "Sokhev" },
        { p: "fém. sing. (אני/את/היא)", he: "שוכבת", t: "Sokhevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוכבים", t: "Sokhvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוכבות", t: "Sokhvot" },
      ],
    },
  },

  // Punir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להעניש", translit: "Leha'anich", fr: "Punir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעניש", t: "Ma'anich" },
        { p: "fém. sing. (אני/את/היא)", he: "מענישה", t: "Ma'anicha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מענישים", t: "Ma'anichim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מענישות", t: "Ma'anichot" },
      ],
    },
  },

  // Se débrouiller  // À COMPLÉTER : Passé, Futur
  {
    inf: "להסתדר", translit: "Lehistader", fr: "Se débrouiller",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסתדר", t: "Mistader" },
        { p: "fém. sing. (אני/את/היא)", he: "מסתדרת", t: "Mistaderet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסתדרים", t: "Mistadrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסתדרות", t: "Mistadrot" },
      ],
    },
  },

  // Faire la guerre  // À COMPLÉTER : Passé, Futur
  {
    inf: "לההילחם", translit: "Lehilakhem", fr: "Faire la guerre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נלחם", t: "Nilkham" },
        { p: "fém. sing. (אני/את/היא)", he: "נלחםת", t: "Nilkhamet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נלחםים", t: "Nilkhmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נלחםות", t: "Nilkhmot" },
      ],
    },
  },

  // Se comporter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתנהג", translit: "Lehitnaheg", fr: "Se comporter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנהג", t: "Mitnaheg" },
        { p: "fém. sing. (אני/את/היא)", he: "מתנהגת", t: "Mitnaheget" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתנהגים", t: "Mitnahgim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתנהגות", t: "Mitnahgot" },
      ],
    },
  },

  // Se changer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "", translit: "Lehichtanot", fr: "Se changer",
    temps: {},
  },

  // S'intéresser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתעניין", translit: "Lehit'anien", fr: "S'intéresser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתעניין", t: "Mit'anien" },
        { p: "fém. sing. (אני/את/היא)", he: "מתענייןת", t: "Mit'anienet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתענייןים", t: "Mit'aninim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתענייןות", t: "Mit'aninot" },
      ],
    },
  },

  // être timide  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתבייש", translit: "Lehitbayech", fr: "être timide",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתבייש", t: "Mitbayech" },
        { p: "fém. sing. (אני/את/היא)", he: "מתביישת", t: "Mitbayechet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתביישים", t: "Mitbaychim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתביישות", t: "Mitbaychot" },
      ],
    },
  },

  // être déçu  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתאכזב", translit: "Lehit'akhzev", fr: "être déçu",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאכזב", t: "Mit'akhzev" },
        { p: "fém. sing. (אני/את/היא)", he: "מתאכזבת", t: "Mit'akhzevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתאכזבים", t: "Mit'akhzvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתאכזבות", t: "Mit'akhzvot" },
      ],
    },
  },

  // S'inquiéter  // À COMPLÉTER : Passé, Futur
  {
    inf: "לדאוג", translit: "Lid'og", fr: "S'inquiéter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דואג", t: "Do'eg" },
        { p: "fém. sing. (אני/את/היא)", he: "דואגת", t: "Do'eget" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "דואגים", t: "Do'gim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "דואגות", t: "Do'got" },
      ],
    },
  },

  // Sourire  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לחייך", translit: "Lekhayekh", fr: "Sourire",
    temps: {},
  },

  // Soupirer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להאנח", translit: "Lehe'aneakh", fr: "Soupirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נאנח", t: "Ne'enakh" },
        { p: "fém. sing. (אני/את/היא)", he: "נאנחת", t: "Ne'enakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נאנחים", t: "Ne'enkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נאנחות", t: "Ne'enkhot" },
      ],
    },
  },

  // S'arrêter  // À COMPLÉTER : Futur
  {
    inf: "לעצור", translit: "La'atsor", fr: "S'arrêter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוצר", t: "Otser" },
        { p: "fém. sing. (אני/את/היא)", he: "עוצרת", t: "Otseret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "עוצרים", t: "Otsrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "עוצרות", t: "Otsrot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "עצרתי", t: "Atsarti" },
        { p: "tu masc. (אתה)", he: "עצרת", t: "Atsarta" },
        { p: "tu fém. (את)", he: "עצרת", t: "Atsart" },
        { p: "il (הוא)", he: "עצר", t: "Atsar" },
        { p: "elle (היא)", he: "עצרה", t: "Atsra" },
        { p: "nous (אנחנו)", he: "עצרנו", t: "Atsarnu" },
        { p: "vous masc. (אתם)", he: "עצרתם", t: "Atsartem" },
        { p: "vous fém. (אתן)", he: "עצרתן", t: "Atsarten" },
        { p: "ils / elles (הם/הן)", he: "עצרו", t: "Atsru" },
      ],
    },
  },

  // Juger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשפות", translit: "Lichpot", fr: "Juger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שופת", t: "Chofet" },
        { p: "fém. sing. (אני/את/היא)", he: "שופתת", t: "Chofetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שופתים", t: "Choftim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שופתות", t: "Choftot" },
      ],
    },
  },

  // Jeuner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לצום", translit: "Latsoum", fr: "Jeuner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צם", t: "Tsam" },
        { p: "fém. sing. (אני/את/היא)", he: "צםת", t: "Tsamet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "צםים", t: "Tsmim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "צםות", t: "Tsmot" },
      ],
    },
  },

  // Discuter / juger  // À COMPLÉTER : Passé, Futur
  {
    inf: "לדון", translit: "Ladoun", fr: "Discuter / juger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דן", t: "Dan" },
        { p: "fém. sing. (אני/את/היא)", he: "דןת", t: "Danet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "דןים", t: "Dnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "דןות", t: "Dnot" },
      ],
    },
  },

  // Oser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להעז", translit: "Lahahez", fr: "Oser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעז", t: "Mehez" },
        { p: "fém. sing. (אני/את/היא)", he: "מעזת", t: "Mehezet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מעזים", t: "Mehzim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מעזות", t: "Mehzot" },
      ],
    },
  },

  // Créer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לברוא", translit: "Livro", fr: "Créer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בורא", t: "Bore" },
        { p: "fém. sing. (אני/את/היא)", he: "בוראת", t: "Boreet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "בוראים", t: "Breim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "בוראות", t: "Breot" },
      ],
    },
  },

  // Cueillir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לקטוף", translit: "Liktof", fr: "Cueillir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קוטף", t: "Kotef" },
        { p: "fém. sing. (אני/את/היא)", he: "קוטףת", t: "Kotefet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "קוטףים", t: "Kotfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "קוטףות", t: "Kotfot" },
      ],
    },
  },

  // Blesser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להכאיב", translit: "Leakh'iv", fr: "Blesser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכאיב", t: "Makh'iv" },
        { p: "fém. sing. (אני/את/היא)", he: "מכאיבת", t: "Makh'ivet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מכאיבים", t: "Makh'vim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מכאיבות", t: "Makh'vot" },
      ],
    },
  },

  // Casser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשבור", translit: "Lichbor", fr: "Casser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שובר", t: "Chover" },
        { p: "fém. sing. (אני/את/היא)", he: "שוברת", t: "Choveret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שוברים", t: "Chovrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שוברות", t: "Chovrot" },
      ],
    },
  },

  // Tomber  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנפול", translit: "Linpol", fr: "Tomber",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נופל", t: "Nofel" },
        { p: "fém. sing. (אני/את/היא)", he: "נופלת", t: "Nofelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נופלים", t: "Noflim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נופלות", t: "Noflot" },
      ],
    },
  },

  // S'occuper de  // À COMPLÉTER : Passé, Futur
  {
    inf: "לטפל", translit: "Letapel", fr: "S'occuper de",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מטפל", t: "Metapel" },
        { p: "fém. sing. (אני/את/היא)", he: "מטפלת", t: "Metapelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מטפלים", t: "Metaplim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מטפלות", t: "Metaplot" },
      ],
    },
  },

  // Parler sur qq'un / jaser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לרכל", translit: "Lerakhel", fr: "Parler sur qq'un / jaser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרכל", t: "Merakel" },
        { p: "fém. sing. (אני/את/היא)", he: "מרכלת", t: "Merakelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרכלים", t: "Meraklim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרכלות", t: "Meraklot" },
      ],
    },
  },

  // Transpirer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להזיה", translit: "Lehazia", fr: "Transpirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזיה", t: "Mazia" },
        { p: "fém. sing. (אני/את/היא)", he: "מזיה", t: "Maziaa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מזיים", t: "Maziaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מזיות", t: "Maziaot" },
      ],
    },
  },

  // Habiller (quelqu'un d'autre)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להלביש", translit: "Lehalbich", fr: "Habiller (quelqu'un d'autre)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מלביש", t: "Malbich" },
        { p: "fém. sing. (אני/את/היא)", he: "מלבישה", t: "Malbicha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מלבישים", t: "Malbichim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מלבישות", t: "Malbichot" },
      ],
    },
  },

  // Exprimer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לבטא", translit: "Levate", fr: "Exprimer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטא", t: "Mevate" },
        { p: "fém. sing. (אני/את/היא)", he: "מבטאת", t: "Mevateet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מבטאים", t: "Mevteim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מבטאות", t: "Mevteot" },
      ],
    },
  },

  // Contratrier  // À COMPLÉTER : Passé, Futur
  {
    inf: "לצער", translit: "Letsaer", fr: "Contratrier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצער", t: "Metsaer" },
        { p: "fém. sing. (אני/את/היא)", he: "מצערת", t: "Metsaeret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצערים", t: "Metsarim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצערות", t: "Metsarot" },
      ],
    },
  },

  // Frapper  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרביץ", translit: "Leharbitz", fr: "Frapper",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרביץ", t: "Marbitz" },
        { p: "fém. sing. (אני/את/היא)", he: "מרביץה", t: "Marbitza" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרביץים", t: "Marbitzim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרביץות", t: "Marbitzot" },
      ],
    },
  },

  // Contacter  // À COMPLÉTER : Passé, Futur
  {
    inf: "ליצור קשר", translit: "Litsor kecher", fr: "Contacter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יוצר", t: "Yotser" },
        { p: "fém. sing. (אני/את/היא)", he: "יוצרת", t: "Yotseret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יוצרים", t: "Yotsrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יוצרות", t: "Yotsrot" },
      ],
    },
  },

  // Remercier  // À COMPLÉTER : Passé, Futur
  {
    inf: "להודות", translit: "Lehodot", fr: "Remercier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מודה", t: "Mode" },
        { p: "fém. sing. (אני/את/היא)", he: "מודה", t: "Moda" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מודים", t: "Modim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מודות", t: "Modot" },
      ],
    },
  },

  // Permettre / autoriser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאפשר", translit: "Le'afcher", fr: "Permettre / autoriser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאפשר", t: "Me'afcher" },
        { p: "fém. sing. (אני/את/היא)", he: "מאפשרת", t: "Me'afcheret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאפשרים", t: "Me'afchrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאפשרות", t: "Me'afchrot" },
      ],
    },
  },

  // Rejoindre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להצטרף", translit: "Lehitstaref", fr: "Rejoindre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצטרף", t: "Mitstaref" },
        { p: "fém. sing. (אני/את/היא)", he: "מצטרףת", t: "Mitstarefet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מצטרףים", t: "Mitstarfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מצטרףות", t: "Mitstarfot" },
      ],
    },
  },

  // Se détacher  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתנתק", translit: "Lehitnatek", fr: "Se détacher",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנתק", t: "Mitnatek" },
        { p: "fém. sing. (אני/את/היא)", he: "מתנתקת", t: "Mitnateket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתנתקים", t: "Mitnatkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתנתקות", t: "Mitnatkot" },
      ],
    },
  },

  // Tirer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לירות", translit: "Lirot", fr: "Tirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יורה", t: "Yore" },
        { p: "fém. sing. (אני/את/היא)", he: "יורה", t: "Yora" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "יורים", t: "Yorim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "יורות", t: "Yorot" },
      ],
    },
  },

  // Réfléchir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להרהר", translit: "Leharher", fr: "Réfléchir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהרהר", t: "Meharher" },
        { p: "fém. sing. (אני/את/היא)", he: "מהרהרה", t: "Meharhera" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהרהרים", t: "Meharherim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהרהרות", t: "Meharherot" },
      ],
    },
  },

  // Faire attenttion  // À COMPLÉTER : Passé, Futur
  {
    inf: "להיזהר", translit: "Lehizaher", fr: "Faire attenttion",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נזהר", t: "Nizhar" },
        { p: "fém. sing. (אני/את/היא)", he: "נזהרת", t: "Nizharet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נזהרים", t: "Nizhrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נזהרות", t: "Nizhrot" },
      ],
    },
  },

  // Demander conseil  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתייעץ", translit: "Lehityaetz", fr: "Demander conseil",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתייעץ", t: "Mityaetz" },
        { p: "fém. sing. (אני/את/היא)", he: "מתייעץת", t: "Mityaetzet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתייעץים", t: "Mityatzim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתייעץות", t: "Mityatzot" },
      ],
    },
  },

  // Imaginer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לדמיין", translit: "Ledamien", fr: "Imaginer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדמיין", t: "Medamien" },
        { p: "fém. sing. (אני/את/היא)", he: "מדמייןת", t: "Medamienet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מדמייןים", t: "Medaminim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מדמייןות", t: "Medaminot" },
      ],
    },
  },

  // Hésiter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתלבט", translit: "Lehitlabet", fr: "Hésiter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתלבט", t: "Mitlabet" },
        { p: "fém. sing. (אני/את/היא)", he: "מתלבטת", t: "Mitlabetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתלבטים", t: "Mitlabtim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתלבטות", t: "Mitlabtot" },
      ],
    },
  },

  // Culpabiliser  // À COMPLÉTER : Passé, Futur
  {
    inf: "להאשים", translit: "Lehaachim", fr: "Culpabiliser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאשים", t: "Maachim" },
        { p: "fém. sing. (אני/את/היא)", he: "מאשיםה", t: "Maachima" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאשיםים", t: "Maachimim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאשיםות", t: "Maachimot" },
      ],
    },
  },

  // Parier  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמר", translit: "Lehamer", fr: "Parier",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהמר", t: "Mehamer" },
        { p: "fém. sing. (אני/את/היא)", he: "מהמרה", t: "Mehamera" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהמרים", t: "Mehamerim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהמרות", t: "Mehamerot" },
      ],
    },
  },

  // Intervenir / se mêler  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתערב", translit: "Lehit'arev", fr: "Intervenir / se mêler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתערב", t: "Mit'arev" },
        { p: "fém. sing. (אני/את/היא)", he: "מתערבת", t: "Mit'arevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתערבים", t: "Mit'arvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתערבות", t: "Mit'arvot" },
      ],
    },
  },

  // Faire fonctionner / activer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להפעיל", translit: "Lehaf'il", fr: "Faire fonctionner / activer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפעיל", t: "Maf'il" },
        { p: "fém. sing. (אני/את/היא)", he: "מפעילה", t: "Maf'ila" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מפעילים", t: "Maf'ilim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מפעילות", t: "Maf'ilot" },
      ],
    },
  },

  // Papoter  // À COMPLÉTER : Futur
  {
    inf: "לפטפט", translit: "Lefatpet", fr: "Papoter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפטפט", t: "Mefatpet" },
        { p: "fém. sing. (אני/את/היא)", he: "מפטפטת", t: "Mefatpetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מפטפטים", t: "Mefatptim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מפטפטות", t: "Mefatptot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "פטפטתי", t: "Pitpetti" },
        { p: "tu masc. (אתה)", he: "פטפטת", t: "Pitpetta" },
        { p: "tu fém. (את)", he: "פטפטת", t: "Pitpett" },
        { p: "il (הוא)", he: "פטפט", t: "Pitpet" },
        { p: "elle (היא)", he: "פטפטה", t: "Pitpta" },
        { p: "nous (אנחנו)", he: "פטפטנו", t: "Pitpetnu" },
        { p: "vous masc. (אתם)", he: "פטפטתם", t: "Ptpettem" },
        { p: "vous fém. (אתן)", he: "פטפטתן", t: "Ptpetten" },
        { p: "ils / elles (הם/הן)", he: "פטפטו", t: "Pitptu" },
      ],
    },
  },

  // Regarder / mâter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להציץ", translit: "Lehatzits", fr: "Regarder / mâter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מציץ", t: "Metsits" },
        { p: "fém. sing. (אני/את/היא)", he: "מציץה", t: "Metsitsa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מציץים", t: "Metsitsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מציץות", t: "Metsitsot" },
      ],
    },
  },

  // Servir (armée)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשרת", translit: "Lecharet", fr: "Servir (armée)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משרת", t: "Merachet" },
        { p: "fém. sing. (אני/את/היא)", he: "משרתת", t: "Merachetet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "משרתים", t: "Merachtim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "משרתות", t: "Merachtot" },
      ],
    },
  },

  // Abandonner  // À COMPLÉTER : Passé, Futur
  {
    inf: "לוותר", translit: "Levater", fr: "Abandonner",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוותר", t: "Mevater" },
        { p: "fém. sing. (אני/את/היא)", he: "מוותרת", t: "Mevateret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מוותרים", t: "Mevatrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מוותרות", t: "Mevatrot" },
      ],
    },
  },

  // Surfer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לגלוש", translit: "Ligloch", fr: "Surfer",
    temps: {},
  },

  // Adopter  // À COMPLÉTER : Passé, Futur
  {
    inf: "להמלץ", translit: "Lehamets", fr: "Adopter",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממלץ", t: "Mamlets" },
        { p: "fém. sing. (אני/את/היא)", he: "ממלץה", t: "Mamletsa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "ממלץים", t: "Mamletsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "ממלץות", t: "Mamletsot" },
      ],
    },
  },

  // Admirer
  {
    inf: "להעריץ", translit: "Leha'arits", fr: "Admirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעריץ", t: "Ma'arits" },
        { p: "fém. sing. (אני/את/היא)", he: "מעריץה", t: "Ma'aritsa" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מעריץים", t: "Ma'aritsim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מעריץות", t: "Ma'aritsot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "העריץתי", t: "He'eritsti" },
        { p: "tu masc. (אתה)", he: "העריץת", t: "He'eritsta" },
        { p: "tu fém. (את)", he: "העריץת", t: "He'eritst" },
        { p: "il (הוא)", he: "העריץ", t: "He'erits" },
        { p: "elle (היא)", he: "העריץה", t: "He'ertsa" },
        { p: "nous (אנחנו)", he: "העריץנו", t: "He'eritsnu" },
        { p: "vous masc. (אתם)", he: "העריץתם", t: "He'eritstem" },
        { p: "vous fém. (אתן)", he: "העריץתן", t: "He'eritsten" },
        { p: "ils / elles (הם/הן)", he: "העריץו", t: "He'ertsu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אעריץ", t: "ea'erits" },
        { p: "tu masc. (אתה)", he: "תעריץ", t: "tia'erits" },
        { p: "tu fém. (את)", he: "תעריץי", t: "tia'eritsi" },
        { p: "il (הוא)", he: "יעריץ", t: "Ya'erits" },
        { p: "elle (היא)", he: "תעריץ", t: "tia'erits" },
        { p: "nous (אנחנו)", he: "נעריץ", t: "nia'erits" },
        { p: "vous (אתם/אתן)", he: "תעריץו", t: "tia'eritsu" },
        { p: "ils / elles (הם/הן)", he: "יעריץו", t: "yia'eritsu" },
      ],
    },
  },

  // Murir  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתבגר", translit: "Lehitbager", fr: "Murir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהתבגר", t: "Mitbager" },
        { p: "fém. sing. (אני/את/היא)", he: "מהתבגרת", t: "Mitbageret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהתבגרים", t: "Mitbagrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהתבגרות", t: "Mitbagrot" },
      ],
    },
  },

  // Rééduquer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לשקם", translit: "Lechakem", fr: "Rééduquer",
    temps: {},
  },

  // Sauver  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להציל", translit: "Lehatsil", fr: "Sauver",
    temps: {},
  },

  // Laisser  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להשאיר", translit: "Lehachir", fr: "Laisser",
    temps: {},
  },

  // Faire exprès  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתכוון", translit: "Lehitkaven", fr: "Faire exprès",
    temps: {},
  },

  // Errer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לשוטט", translit: "Lechotet", fr: "Errer",
    temps: {},
  },

  // Abuser  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתעלל", translit: "Lehit'alel", fr: "Abuser",
    temps: {},
  },

  // Faire un effort  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתאמץ", translit: "Lehit'amets", fr: "Faire un effort",
    temps: {},
  },

  // Tourner (se balader/circuler)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להסתובב", translit: "Lehistovev", fr: "Tourner (se balader/circuler)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסתובב", t: "Mistovev" },
        { p: "fém. sing. (אני/את/היא)", he: "מסתובבת", t: "Mistovevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסתובבים", t: "Mistovvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסתובבות", t: "Mistovvot" },
      ],
    },
  },

  // Dresser  // À COMPLÉTER : Passé, Futur
  {
    inf: "לאלף", translit: "Le'alef", fr: "Dresser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאלף", t: "Me'alef" },
        { p: "fém. sing. (אני/את/היא)", he: "מאלףת", t: "Me'alefet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאלףים", t: "Me'alfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאלףות", t: "Me'alfot" },
      ],
    },
  },

  // Aboyer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לנבוח", translit: "Linboakh", fr: "Aboyer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נובח", t: "Noveakh" },
        { p: "fém. sing. (אני/את/היא)", he: "נובחת", t: "Noveakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "נובחים", t: "Novekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "נובחות", t: "Novekhot" },
      ],
    },
  },

  // Autoriser
  {
    inf: "להרשות", translit: "Leharchot", fr: "Autoriser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרשה", t: "Marche" },
        { p: "fém. sing. (אני/את/היא)", he: "מרשה", t: "Marcha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מרשים", t: "Marchim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מרשות", t: "Marchot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "הרשהתי", t: "Hircheti" },
        { p: "tu masc. (אתה)", he: "הרשהת", t: "Hircheta" },
        { p: "tu fém. (את)", he: "הרשהת", t: "Hirchet" },
        { p: "il (הוא)", he: "הרשה", t: "Hirche" },
        { p: "elle (היא)", he: "הרשהה", t: "Hrchea" },
        { p: "nous (אנחנו)", he: "הרשהנו", t: "Hirchenu" },
        { p: "vous masc. (אתם)", he: "הרשהתם", t: "Hirchetem" },
        { p: "vous fém. (אתן)", he: "הרשהתן", t: "Hircheten" },
        { p: "ils / elles (הם/הן)", he: "הרשהו", t: "Hrcheu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "ארשה", t: "earche" },
        { p: "tu masc. (אתה)", he: "תרשה", t: "tiarche" },
        { p: "tu fém. (את)", he: "תרשי", t: "tiarchi" },
        { p: "il (הוא)", he: "ירשה", t: "Yarche" },
        { p: "elle (היא)", he: "תרשה", t: "tiarche" },
        { p: "nous (אנחנו)", he: "נרשה", t: "niarche" },
        { p: "vous (אתם/אתן)", he: "תרשו", t: "tiarchu" },
        { p: "ils / elles (הם/הן)", he: "ירשו", t: "yiarchu" },
      ],
    },
  },

  // Emigrer
  {
    inf: "להגר", translit: "Lehager", fr: "Emigrer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהגר", t: "Mehager" },
        { p: "fém. sing. (אני/את/היא)", he: "מהגרה", t: "Mehagera" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מהגרים", t: "Mehagerim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מהגרות", t: "Mehagerot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "היגרתי", t: "Higerti" },
        { p: "tu masc. (אתה)", he: "היגרת", t: "Higerta" },
        { p: "tu fém. (את)", he: "היגרת", t: "Higert" },
        { p: "il (הוא)", he: "היגר", t: "Higer" },
        { p: "elle (היא)", he: "היגרה", t: "Higra" },
        { p: "nous (אנחנו)", he: "היגרנו", t: "Higernu" },
        { p: "vous masc. (אתם)", he: "היגרתם", t: "Higertem" },
        { p: "vous fém. (אתן)", he: "היגרתן", t: "Higerten" },
        { p: "ils / elles (הם/הן)", he: "היגרו", t: "Higru" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אהגר", t: "eehager" },
        { p: "tu masc. (אתה)", he: "תהגר", t: "tiehager" },
        { p: "tu fém. (את)", he: "תהגרי", t: "tiehageri" },
        { p: "il (הוא)", he: "יהגר", t: "Yehager" },
        { p: "elle (היא)", he: "תהגר", t: "tiehager" },
        { p: "nous (אנחנו)", he: "נהגר", t: "niehager" },
        { p: "vous (אתם/אתן)", he: "תהגרו", t: "tiehageru" },
        { p: "ils / elles (הם/הן)", he: "יהגרו", t: "yiehageru" },
      ],
    },
  },

  // Prolonger
  {
    inf: "להאריך", translit: "Leha'arikh", fr: "Prolonger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאריך", t: "Ma'arikh" },
        { p: "fém. sing. (אני/את/היא)", he: "מאריךה", t: "Ma'arikha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מאריךים", t: "Ma'arikhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מאריךות", t: "Ma'arikhot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "האריךתי", t: "He'erikhti" },
        { p: "tu masc. (אתה)", he: "האריךת", t: "He'erikhta" },
        { p: "tu fém. (את)", he: "האריךת", t: "He'erikht" },
        { p: "il (הוא)", he: "האריך", t: "He'erikh" },
        { p: "elle (היא)", he: "האריךה", t: "He'erkha" },
        { p: "nous (אנחנו)", he: "האריךנו", t: "He'erikhnu" },
        { p: "vous masc. (אתם)", he: "האריךתם", t: "He'erikhtem" },
        { p: "vous fém. (אתן)", he: "האריךתן", t: "He'erikhten" },
        { p: "ils / elles (הם/הן)", he: "האריךו", t: "He'erkhu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אאריך", t: "ea'arikh" },
        { p: "tu masc. (אתה)", he: "תאריך", t: "tia'arikh" },
        { p: "tu fém. (את)", he: "תאריךי", t: "tia'arikhi" },
        { p: "il (הוא)", he: "יאריך", t: "Ya'arikh" },
        { p: "elle (היא)", he: "תאריך", t: "tia'arikh" },
        { p: "nous (אנחנו)", he: "נאריך", t: "nia'arikh" },
        { p: "vous (אתם/אתן)", he: "תאריךו", t: "tia'arikhu" },
        { p: "ils / elles (הם/הן)", he: "יאריךו", t: "yia'arikhu" },
      ],
    },
  },

  // Résoudre
  {
    inf: "לפתור", translit: "Liftor", fr: "Résoudre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פותר", t: "Poter" },
        { p: "fém. sing. (אני/את/היא)", he: "פותרת", t: "Poteret" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "פותרים", t: "Potrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "פותרות", t: "Potrot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "פתרתי", t: "Patarti" },
        { p: "tu masc. (אתה)", he: "פתרת", t: "Patarta" },
        { p: "tu fém. (את)", he: "פתרת", t: "Patart" },
        { p: "il (הוא)", he: "פתר", t: "Patar" },
        { p: "elle (היא)", he: "פתרה", t: "Patra" },
        { p: "nous (אנחנו)", he: "פתרנו", t: "Patarnu" },
        { p: "vous masc. (אתם)", he: "פתרתם", t: "Ptartem" },
        { p: "vous fém. (אתן)", he: "פתרתן", t: "Ptarten" },
        { p: "ils / elles (הם/הן)", he: "פתרו", t: "Patru" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אפתור", t: "eftor" },
        { p: "tu masc. (אתה)", he: "תפתור", t: "tiftor" },
        { p: "tu fém. (את)", he: "תפתורי", t: "tiftori" },
        { p: "il (הוא)", he: "יפתור", t: "Yiftor" },
        { p: "elle (היא)", he: "תפתור", t: "tiftor" },
        { p: "nous (אנחנו)", he: "נפתור", t: "niftor" },
        { p: "vous (אתם/אתן)", he: "תפתורו", t: "tiftoru" },
        { p: "ils / elles (הם/הן)", he: "יפתורו", t: "yiftoru" },
      ],
    },
  },

  // Financer
  {
    inf: "לממן", translit: "Lemamen", fr: "Financer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מממן", t: "Memamen" },
        { p: "fém. sing. (אני/את/היא)", he: "מממןת", t: "Memamenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מממןים", t: "Memamnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מממןות", t: "Memamnot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "מימןתי", t: "Mimenti" },
        { p: "tu masc. (אתה)", he: "מימןת", t: "Mimenta" },
        { p: "tu fém. (את)", he: "מימןת", t: "Miment" },
        { p: "il (הוא)", he: "מימן", t: "Mimen" },
        { p: "elle (היא)", he: "מימןה", t: "Mimna" },
        { p: "nous (אנחנו)", he: "מימןנו", t: "Mimennu" },
        { p: "vous masc. (אתם)", he: "מימןתם", t: "Mmentem" },
        { p: "vous fém. (אתן)", he: "מימןתן", t: "Mmenten" },
        { p: "ils / elles (הם/הן)", he: "מימןו", t: "Mimnu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אממן", t: "eemamen" },
        { p: "tu masc. (אתה)", he: "תממן", t: "tiemamen" },
        { p: "tu fém. (את)", he: "תממןי", t: "tiemameni" },
        { p: "il (הוא)", he: "יממן", t: "Yemamen" },
        { p: "elle (היא)", he: "תממן", t: "tiemamen" },
        { p: "nous (אנחנו)", he: "נממן", t: "niemamen" },
        { p: "vous (אתם/אתן)", he: "תממןו", t: "tiemamenu" },
        { p: "ils / elles (הם/הן)", he: "יממןו", t: "yiemamenu" },
      ],
    },
  },

  // Se préparer
  {
    inf: "להתכונן", translit: "Lehitkonen", fr: "Se préparer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתכונן", t: "Mitkonen" },
        { p: "fém. sing. (אני/את/היא)", he: "מתכונןת", t: "Mitkonenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתכונןים", t: "Mitkonnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתכונןות", t: "Mitkonnot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "התכונןתי", t: "Hitkonenti" },
        { p: "tu masc. (אתה)", he: "התכונןת", t: "Hitkonenta" },
        { p: "tu fém. (את)", he: "התכונןת", t: "Hitkonent" },
        { p: "il (הוא)", he: "התכונן", t: "Hitkonen" },
        { p: "elle (היא)", he: "התכונןה", t: "Hitkonna" },
        { p: "nous (אנחנו)", he: "התכונןנו", t: "Hitkonennu" },
        { p: "vous masc. (אתם)", he: "התכונןתם", t: "Hitkonentem" },
        { p: "vous fém. (אתן)", he: "התכונןתן", t: "Hitkonenten" },
        { p: "ils / elles (הם/הן)", he: "התכונןו", t: "Hitkonnu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אתכונן", t: "etkonen" },
        { p: "tu masc. (אתה)", he: "תתכונן", t: "titkonen" },
        { p: "tu fém. (את)", he: "תתכונןי", t: "titkoneni" },
        { p: "il (הוא)", he: "יתכונן", t: "Yitkonen" },
        { p: "elle (היא)", he: "תתכונן", t: "titkonen" },
        { p: "nous (אנחנו)", he: "נתכונן", t: "nitkonen" },
        { p: "vous (אתם/אתן)", he: "תתכונןו", t: "titkonenu" },
        { p: "ils / elles (הם/הן)", he: "יתכונןו", t: "yitkonenu" },
      ],
    },
  },

  // Couper
  {
    inf: "לחתוך", translit: "Lakhtor", fr: "Couper",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חותך", t: "Khotekh" },
        { p: "fém. sing. (אני/את/היא)", he: "חותךת", t: "Khotekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "חותךים", t: "Khotkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "חותךות", t: "Khotkhot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "חתךתי", t: "Khatakhti" },
        { p: "tu masc. (אתה)", he: "חתךת", t: "Khatakhta" },
        { p: "tu fém. (את)", he: "חתךת", t: "Khatakht" },
        { p: "il (הוא)", he: "חתך", t: "Khatakh" },
        { p: "elle (היא)", he: "חתךה", t: "Khatkha" },
        { p: "nous (אנחנו)", he: "חתךנו", t: "Khatakhnu" },
        { p: "vous masc. (אתם)", he: "חתךתם", t: "Khatakhtem" },
        { p: "vous fém. (אתן)", he: "חתךתן", t: "Khatakhten" },
        { p: "ils / elles (הם/הן)", he: "חתךו", t: "Khatkhu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אחתוך", t: "eakhatokh" },
        { p: "tu masc. (אתה)", he: "תחתוך", t: "tiakhatokh" },
        { p: "tu fém. (את)", he: "תחתוךי", t: "tiakhatokhi" },
        { p: "il (הוא)", he: "יחתוך", t: "Yakhatokh" },
        { p: "elle (היא)", he: "תחתוך", t: "tiakhatokh" },
        { p: "nous (אנחנו)", he: "נחתוך", t: "niakhatokh" },
        { p: "vous (אתם/אתן)", he: "תחתוךו", t: "tiakhatokhu" },
        { p: "ils / elles (הם/הן)", he: "יחתוךו", t: "yiakhatokhu" },
      ],
    },
  },

  // Fournir  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לספק (ל)", translit: "Lesapek (le)", fr: "Fournir",
    temps: {},
  },

  // S'entrainer (bé ou lé)  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתאמן", translit: "Lehit'amen", fr: "S'entrainer (bé ou lé)",
    temps: {},
  },

  // Avoir besoin (plus soutenu)  // À COMPLÉTER : Passé, Futur
  {
    inf: "להזדקק", translit: "Lehizdakek", fr: "Avoir besoin (plus soutenu)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזדקק", t: "Mizdakek" },
        { p: "fém. sing. (אני/את/היא)", he: "מזדקקת", t: "Mizdakeket" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מזדקקים", t: "Mizdakkim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מזדקקות", t: "Mizdakkot" },
      ],
    },
  },

  // Accompagner / conduire  // À COMPLÉTER : Passé, Futur
  {
    inf: "ללוות", translit: "Lelavot", fr: "Accompagner / conduire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מלוה", t: "Melave" },
        { p: "fém. sing. (אני/את/היא)", he: "מלוה", t: "Melava" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מלוים", t: "Melavim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מלוות", t: "Melavot" },
      ],
    },
  },

  // Soutenir  // À COMPLÉTER : Passé, Futur
  {
    inf: "לתמוך", translit: "Litmokh", fr: "Soutenir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "תומך", t: "Tomekh" },
        { p: "fém. sing. (אני/את/היא)", he: "תומךת", t: "Tomekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "תומךים", t: "Tomkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "תומךות", t: "Tomkhot" },
      ],
    },
  },

  // Aider (plus soutenu)  // À COMPLÉTER : Passé, Futur
  {
    inf: "לסייע", translit: "Lesaya", fr: "Aider (plus soutenu)",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסייע", t: "Mesayea" },
        { p: "fém. sing. (אני/את/היא)", he: "מסייעת", t: "Mesayeaet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מסייעים", t: "Mesayaim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מסייעות", t: "Mesayaot" },
      ],
    },
  },

  // S'exprimer  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתבטא", translit: "Lehitbate", fr: "S'exprimer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתבטא", t: "Mitbate" },
        { p: "fém. sing. (אני/את/היא)", he: "מתבטאת", t: "Mitbateet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתבטאים", t: "Mitbteim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתבטאות", t: "Mitbteot" },
      ],
    },
  },

  // Discuter / débattre  // À COMPLÉTER : Passé, Futur
  {
    inf: "להתווכח", translit: "Lehitvakeakh", fr: "Discuter / débattre",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתווכח", t: "Mitvakeakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מתווכחת", t: "Mitvakeakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מתווכחים", t: "Mitvakekhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מתווכחות", t: "Mitvakekhot" },
      ],
    },
  },

  // Dégainer / tirer  // À COMPLÉTER : Passé, Futur
  {
    inf: "לשלוף", translit: "Lichlof", fr: "Dégainer / tirer",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שולף", t: "Cholef" },
        { p: "fém. sing. (אני/את/היא)", he: "שולףת", t: "Cholefet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "שולףים", t: "Cholfim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "שולףות", t: "Cholfot" },
      ],
    },
  },

  // Souligner / mettre en valeur  // À COMPLÉTER : Passé, Futur
  {
    inf: "להדגיש", translit: "Lehadgich", fr: "Souligner / mettre en valeur",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדגיש", t: "Madgich" },
        { p: "fém. sing. (אני/את/היא)", he: "מדגישה", t: "Madgicha" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מדגישים", t: "Madgichim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מדגישות", t: "Madgichot" },
      ],
    },
  },

  // Prouver
  {
    inf: "להוכיח", translit: "Leokhiakh", fr: "Prouver",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוכיח", t: "Mokhiakh" },
        { p: "fém. sing. (אני/את/היא)", he: "מוכיחת", t: "Mokhiakhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מוכיחים", t: "Mokhikhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מוכיחות", t: "Mokhikhot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "הוכיחתי", t: "Hokhiakhti" },
        { p: "tu masc. (אתה)", he: "הוכיחת", t: "Hokhiakhta" },
        { p: "tu fém. (את)", he: "הוכיחת", t: "Hokhiakht" },
        { p: "il (הוא)", he: "הוכיח", t: "Hokhiakh" },
        { p: "elle (היא)", he: "הוכיחה", t: "Hokhikha" },
        { p: "nous (אנחנו)", he: "הוכיחנו", t: "Hokhiakhnu" },
        { p: "vous masc. (אתם)", he: "הוכיחתם", t: "Hokhiakhtem" },
        { p: "vous fém. (אתן)", he: "הוכיחתן", t: "Hokhiakhten" },
        { p: "ils / elles (הם/הן)", he: "הוכיחו", t: "Hokhikhu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אוכיח", t: "eokhiakh" },
        { p: "tu masc. (אתה)", he: "תוכיח", t: "tiokhiakh" },
        { p: "tu fém. (את)", he: "תוכיחי", t: "tiokhiakhi" },
        { p: "il (הוא)", he: "יוכיח", t: "Yokhiakh" },
        { p: "elle (היא)", he: "תוכיח", t: "tiokhiakh" },
        { p: "nous (אנחנו)", he: "נוכיח", t: "niokhiakh" },
        { p: "vous (אתם/אתן)", he: "תוכיחו", t: "tiokhiakhu" },
        { p: "ils / elles (הם/הן)", he: "יוכיחו", t: "yiokhiakhu" },
      ],
    },
  },

  // Allaiter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להניק", translit: "Lehenik", fr: "Allaiter",
    temps: {},
  },

  // Argumenter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לטעון", translit: "Lit'on", fr: "Argumenter",
    temps: {},
  },

  // Expliquer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "לנמק", translit: "Lenamek", fr: "Expliquer",
    temps: {},
  },

  // Détruire  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להרוס", translit: "Laharos", fr: "Détruire",
    temps: {},
  },

  // Parier / risquer  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להמר", translit: "Lehamer", fr: "Parier / risquer",
    temps: {},
  },

  // Exister  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתקיים", translit: "Lehitkayem", fr: "Exister",
    temps: {},
  },

  // Appartenir à  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להשתייך", translit: "Lehichtayakh", fr: "Appartenir à",
    temps: {},
  },

  // Considérer / traiter  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתייחס", translit: "Lehityakhes", fr: "Considérer / traiter",
    temps: {},
  },

  // Affronter / gérer / faire face  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתמודד", translit: "Lehitmoded", fr: "Affronter / gérer / faire face",
    temps: {},
  },

  // Se plaindre  // À COMPLÉTER : Présent, Passé, Futur
  {
    inf: "להתלונן", translit: "Lehitlonen", fr: "Se plaindre",
    temps: {},
  },

  // Préparer / organiser
  {
    inf: "לארגן", translit: "Le'argen", fr: "Préparer / organiser",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מארגן", t: "Me'argen" },
        { p: "fém. sing. (אני/את/היא)", he: "מארגןת", t: "Me'argenet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מארגןים", t: "Me'argnim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "מארגןות", t: "Me'argnot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "ארגןתי", t: "Irgenti" },
        { p: "tu masc. (אתה)", he: "ארגןת", t: "Irgenta" },
        { p: "tu fém. (את)", he: "ארגןת", t: "Irgent" },
        { p: "il (הוא)", he: "ארגן", t: "Irgen" },
        { p: "elle (היא)", he: "ארגןה", t: "Irgna" },
        { p: "nous (אנחנו)", he: "ארגןנו", t: "Irgennu" },
        { p: "vous masc. (אתם)", he: "ארגןתם", t: "Irgentem" },
        { p: "vous fém. (אתן)", he: "ארגןתן", t: "Irgenten" },
        { p: "ils / elles (הם/הן)", he: "ארגןו", t: "Irgnu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אארגן", t: "ee'argen" },
        { p: "tu masc. (אתה)", he: "תארגן", t: "tie'argen" },
        { p: "tu fém. (את)", he: "תארגןי", t: "tie'argeni" },
        { p: "il (הוא)", he: "יארגן", t: "Ye'argen" },
        { p: "elle (היא)", he: "תארגן", t: "tie'argen" },
        { p: "nous (אנחנו)", he: "נארגן", t: "nie'argen" },
        { p: "vous (אתם/אתן)", he: "תארגןו", t: "tie'argenu" },
        { p: "ils / elles (הם/הן)", he: "יארגןו", t: "yie'argenu" },
      ],
    },
  },

  // Devenir
  {
    inf: "להפוך", translit: "Lahafokh", fr: "Devenir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הופך", t: "Hofekh" },
        { p: "fém. sing. (אני/את/היא)", he: "הופךת", t: "Hofekhet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "הופךים", t: "Hofkhim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)", he: "הופךות", t: "Hofkhot" },
      ],
      "Passé": [
        { p: "je (אני)", he: "הפךתי", t: "Hafakhti" },
        { p: "tu masc. (אתה)", he: "הפךת", t: "Hafakhta" },
        { p: "tu fém. (את)", he: "הפךת", t: "Hafakht" },
        { p: "il (הוא)", he: "הפך", t: "Hafakh" },
        { p: "elle (היא)", he: "הפךה", t: "Hafkha" },
        { p: "nous (אנחנו)", he: "הפךנו", t: "Hafakhnu" },
        { p: "vous masc. (אתם)", he: "הפךתם", t: "Hafakhtem" },
        { p: "vous fém. (אתן)", he: "הפךתן", t: "Hafakhten" },
        { p: "ils / elles (הם/הן)", he: "הפךו", t: "Hafkhu" },
      ],
      "Futur": [
        { p: "je (אני)", he: "אהפוך", t: "eahafokh" },
        { p: "tu masc. (אתה)", he: "תהפוך", t: "tiahafokh" },
        { p: "tu fém. (את)", he: "תהפוךי", t: "tiahafokhi" },
        { p: "il (הוא)", he: "יהפוך", t: "Yahafokh" },
        { p: "elle (היא)", he: "תהפוך", t: "tiahafokh" },
        { p: "nous (אנחנו)", he: "נהפוך", t: "niahafokh" },
        { p: "vous (אתם/אתן)", he: "תהפוךו", t: "tiahafokhu" },
        { p: "ils / elles (הם/הן)", he: "יהפוךו", t: "yiahafokhu" },
      ],
    },
  },

];