// ============================================================
//  VOS VERBES — générés depuis votre Excel (onglet "Verbes")
// ============================================================
//  Fidèle au tableau : UNE forme de référence par temps
//  (présent masc. sing., passé "il", futur "il"), plus la racine
//  (racine) et la construction (binyan), affichées dans l'app.
//
//  Pour enrichir : modifiez l'Excel et redonnez-le moi, ou
//  éditez ce fichier sur GitHub. Vous pouvez aussi ajouter
//  d'autres personnes à un temps (une ligne { p, he, t } de plus)
//  ou d'autres temps : ils apparaîtront automatiquement.
// ============================================================

const VERBES = [
  {
    inf: "לקנות", translit: "Liknot", fr: "Acheter",
    racine: "קנה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קונה", t: "Kone" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קנה", t: "Kana" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקנה", t: "Ikene" },
      ],
    },
  },
  {
    inf: "לעזור", translit: "La'azor", fr: "Aider",
    racine: "עזר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוזר", t: "Ozer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עזר", t: "Azar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעזור", t: "Ya'azor" },
      ],
    },
  },
  {
    inf: "לאהוב", translit: "Leehov", fr: "Aimer",
    racine: "אהב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אוהב", t: "Ohev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "אהב", t: "A'av" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאהב", t: "Ye'ehav" },
      ],
    },
  },
  {
    inf: "להוסיף", translit: "Lehosif", fr: "Ajouter",
    racine: "יסף", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוסיף", t: "Mosif" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הוסיף", t: "Hosif" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יוסיף", t: "Yosif" },
      ],
    },
  },
  {
    inf: "ללכת", translit: "Lalekhet", fr: "Aller / marcher",
    racine: "הלך", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הולך", t: "Olekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הלך", t: "Halakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילך", t: "Yelekh" },
      ],
    },
  },
  {
    inf: "להתאים", translit: "Lehat'im", fr: "Aller avec / matcher",
    racine: "תאם", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאים", t: "Mat'im" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאים", t: "Hit'im" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאים", t: "Yat'im" },
      ],
    },
  },
  {
    inf: "לשפר", translit: "Lechaper", fr: "Ameliorer",
    racine: "שפר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משפר", t: "Mechaper" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שיפר", t: "Chiper" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישפר", t: "Yechaper" },
      ],
    },
  },
  {
    inf: "להתקשר", translit: "Lehitkacher", fr: "Appeler",
    racine: "קשר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקשר", t: "Mitkacher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקשר", t: "Hitkacher" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקשר", t: "Yitkacher" },
      ],
    },
  },
  {
    inf: "להביא", translit: "Lehavi", fr: "Apporter",
    racine: "בוא", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מביא", t: "Mevi" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הביא", t: "Hevi" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יביא", t: "Yavi" },
      ],
    },
  },
  {
    inf: "להפסיק", translit: "Lehafsik", fr: "Arrêter / s'arrêter",
    racine: "פסק", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפסיק", t: "Mafsik" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הפסיק", t: "Hifsik" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפסיק", t: "Yafsik" },
      ],
    },
  },
  {
    inf: "להגיע", translit: "Lehagia", fr: "Arriver",
    racine: "נגע", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגיע", t: "Magia" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הגיע", t: "Higia" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגיע", t: "Yagia" },
      ],
    },
  },
  {
    inf: "לחכות", translit: "Lekhakot", fr: "Attendre",
    racine: "חכה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחכה", t: "Mekhake" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חיכה", t: "Khika" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחכה", t: "Yekhake" },
      ],
    },
  },
  {
    inf: "להיות צריך", translit: "Lihiyot tsarikh", fr: "Avoir besoin / devoir",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צריך", t: "Tsarikh" },
      ],
    },
  },
  {
    inf: "לכאוב", translit: "Likh'ov", fr: "Avoir mal",
    racine: "כאב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "כואב", t: "Co'ev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "כאב", t: "Ka'av" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכאב", t: "Yikh'av" },
      ],
    },
  },
  {
    inf: "לצדוק", translit: "Litzdok", fr: "Avoir raison",
    racine: "צדק", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צודק", t: "Tsodek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צדק", t: "Tsadak" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצדק", t: "Yitsdak" },
      ],
    },
  },
  {
    inf: "לשתות", translit: "Lichtot", fr: "Boire",
    racine: "שתה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שותה", t: "Chote" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שתה", t: "Chata" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתה", t: "Yichte" },
      ],
    },
  },
  {
    inf: "לזוז", translit: "Lazouz", fr: "Bouger",
    racine: "זוז", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "זז", t: "Zaz" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "זז", t: "Zaz" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזוז", t: "Yazouz" },
      ],
    },
  },
  {
    inf: "לשנות", translit: "Lechanot", fr: "Changer / modifier",
    racine: "שנה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משנה", t: "Mechane" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שינה", t: "China" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישנה", t: "Yechane" },
      ],
    },
  },
  {
    inf: "לשיר", translit: "Lachir", fr: "Chanter",
    racine: "שיר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שר", t: "Char" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שר", t: "Char" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישיר", t: "Yachir" },
      ],
    },
  },
  {
    inf: "לבדוק", translit: "Livdok", fr: "Checker/vérifier",
    racine: "בדק", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בודק", t: "Bodek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בדק", t: "Badak" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבדוק", t: "Yivdok" },
      ],
    },
  },
  {
    inf: "לחפש", translit: "Lekhapes", fr: "Chercher",
    racine: "חפש", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחפש", t: "Mekhapes" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חיפש", t: "Khipes" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחפש", t: "Yekhapes" },
      ],
    },
  },
  {
    inf: "לבחור", translit: "Livkhor", fr: "Choisir",
    racine: "בחר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוחר", t: "Bokher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בחר", t: "Bakhar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבחר", t: "Yivkhar" },
      ],
    },
  },
  {
    inf: "להזמין", translit: "Lehazmine", fr: "Commander/réserver/inviter",
    racine: "זמן", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזמין", t: "Mazmin" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הזמין", t: "Hizmin" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזמין", t: "Yazmin" },
      ],
    },
  },
  {
    inf: "להתחיל", translit: "Lehatkhil", fr: "Commencer",
    racine: "תחל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחיל", t: "Matkhil" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התחיל", t: "Hikhil" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתחיל", t: "Yatkhil" },
      ],
    },
  },
  {
    inf: "להבין", translit: "Lehavin", fr: "Comprendre",
    racine: "בין", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבין", t: "Mevin" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הבין", t: "Hevin" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבין", t: "Yavin" },
      ],
    },
  },
  {
    inf: "לנהוג", translit: "Linhog", fr: "Conduire",
    racine: "נהג", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוהג", t: "Noheg" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נהג", t: "Nahag" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינהג", t: "Yinhag" },
      ],
    },
  },
  {
    inf: "להכיר", translit: "Lehakir", fr: "Connaître/savoir",
    racine: "נכר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכיר", t: "Makir" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הכיר", t: "Hikir" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכיר", t: "Yakir" },
      ],
    },
  },
  {
    inf: "לבנות", translit: "Livnot", fr: "Construire",
    racine: "בנה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בונה", t: "Bone" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בנה", t: "Bana" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבנה", t: "Yivne" },
      ],
    },
  },
  {
    inf: "להמשיך", translit: "Leamchikh", fr: "Continuer",
    racine: "משך", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממשיך", t: "Mamchikh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המשיך", t: "Himshikh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימשיך", t: "Yamshikh" },
      ],
    },
  },
  {
    inf: "לרוץ", translit: "Larouts", fr: "Courir",
    racine: "רוץ", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רץ", t: "Rats" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "רץ", t: "Rats" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירוץ", t: "Yaruts" },
      ],
    },
  },
  {
    inf: "לעלות", translit: "Laalot", fr: "Coûter / monter",
    racine: "עלה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עולה", t: "Ole" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עלה", t: "Ala" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעלה", t: "Ya'ale" },
      ],
    },
  },
  {
    inf: "להמין", translit: "Lehamin", fr: "Croire",
    racine: "אמן", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאמין", t: "Maamin" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "האמין", t: "Hehemin" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאמין", t: "Ya'amin" },
      ],
    },
  },
  {
    inf: "לבשל", translit: "Levachel", fr: "Cuisiner",
    racine: "בשל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבשל", t: "Mevachel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בישל", t: "Bishel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבשל", t: "Yevachel" },
      ],
    },
  },
  {
    inf: "להכין", translit: "Lehakhine", fr: "Préparer",
    racine: "כון", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכין", t: "Mekhin" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הכין", t: "Hekhin" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכין", t: "Yakhin" },
      ],
    },
  },
  {
    inf: "לרקוד", translit: "Lirkod", fr: "Danser",
    racine: "רקד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוקד", t: "Roked" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "רקד", t: "Rakad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירקוד", t: "Yirkod" },
      ],
    },
  },
  {
    inf: "להחליט", translit: "Lehakhlit", fr: "Décider",
    racine: "חלט", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחליט", t: "Makhlit" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "החליט", t: "Hikhlit" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחליט", t: "Yakhlit" },
      ],
    },
  },
  {
    inf: "לגלות", translit: "Legalot", fr: "Découvrir",
    racine: "גלה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגלה", t: "Megale" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גילה", t: "Gila" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגלה", t: "Yegale" },
      ],
    },
  },
  {
    inf: "לתאר", translit: "Leta'er", fr: "Décrire",
    racine: "תאר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאר", t: "Metaer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "תיאר", t: "Tiar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאר", t: "Yetaer" },
      ],
    },
  },
  {
    inf: "לבקש", translit: "Levakesh", fr: "Demander/exiger/réclamer",
    racine: "בקש", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבקש", t: "Mevakesh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ביקש", t: "Bikesh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבקש", t: "Yevakesh" },
      ],
    },
  },
  {
    inf: "לשאול", translit: "Lich'ol", fr: "Demander/questionner",
    racine: "שאל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שואל", t: "Cho'el" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שאל", t: "Cha'al" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישאל", t: "Yich'al" },
      ],
    },
  },
  {
    inf: "לרדת", translit: "Laredet", fr: "Descendre / tomber",
    racine: "ירד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יורד", t: "Yored" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ירד", t: "Yarad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירד", t: "Yered" },
      ],
    },
  },
  {
    inf: "לציר", translit: "Letsayer", fr: "Dessiner / peindre",
    racine: "ציר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצייר", t: "Metsayer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צייר", t: "Tsiyer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצייר", t: "Yetsayer" },
      ],
    },
  },
  {
    inf: "לשנוא", translit: "Lisno", fr: "Détester",
    racine: "שנא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שונא", t: "Sone" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שנא", t: "Sana" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישנא", t: "Yisna" },
      ],
    },
  },
  {
    inf: "להשתגע", translit: "Lehichtagea", fr: "Devenir fou",
    racine: "שגע", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתגע", t: "Michtagea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השתגע", t: "Hishtagea" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתגע", t: "Yishtagea" },
      ],
    },
  },
  {
    inf: "לומר", translit: "Lomar", fr: "Dire",
    racine: "אמר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אומר", t: "Omer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "אמר", t: "Amar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאמר", t: "Yomar" },
      ],
    },
  },
  {
    inf: "להגיד", translit: "Lehagid", fr: "Dire",
    racine: "נגד", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגיד", t: "Magid" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הגיד", t: "Higid" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגיד", t: "Yagid" },
      ],
    },
  },
  {
    inf: "לנהל", translit: "Lenahel", fr: "Diriger (patron)",
    racine: "נהל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנהל", t: "Menahel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ניהל", t: "Nihel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינהל", t: "Yenahel" },
      ],
    },
  },
  {
    inf: "להתגרש", translit: "Lehitgarech", fr: "Divorcer",
    racine: "גרש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתגרש", t: "Mitgarech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התגרש", t: "Hitgaresh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתגרש", t: "Yitgaresh" },
      ],
    },
  },
  {
    inf: "לתת", translit: "Latet", fr: "Donner",
    racine: "נתן", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נותן", t: "Noten" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נתן", t: "Natan" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייתן", t: "Yiten" },
      ],
    },
  },
  {
    inf: "לישון", translit: "Lichon", fr: "Dormir",
    racine: "ישן", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ישן", t: "Yachen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ישן", t: "Yachen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יישן", t: "Yishan" },
      ],
    },
  },
  {
    inf: "לפלרטט", translit: "Leflartet", fr: "Draguer",
    racine: "פלרטט", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפלרטט", t: "Meflartet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פלרטט", t: "Flirtet" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפלרטט", t: "Yeflartet" },
      ],
    },
  },
  {
    inf: "לשמוע", translit: "Lichmoa", fr: "Ecouter",
    racine: "שמע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שומע", t: "Chomea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שמע", t: "Chama" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישמע", t: "Yichma" },
      ],
    },
  },
  {
    inf: "להקשיב", translit: "Leakchiv", fr: "Ecouter",
    racine: "קשב", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקשיב", t: "Makchiv" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הקשיב", t: "Hikshiv" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקשיב", t: "Yakshiv" },
      ],
    },
  },
  {
    inf: "לכתוב", translit: "Likhtov", fr: "Ecrire",
    racine: "כתב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "כותב", t: "Kotev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "כתב", t: "Katav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכתוב", t: "Yikhtov" },
      ],
    },
  },
  {
    inf: "ללמד", translit: "Lelamed", fr: "Enseigner",
    racine: "למד", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מלמד", t: "Melamed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "לימד", t: "Limed" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילמד", t: "Yelamed" },
      ],
    },
  },
  {
    inf: "להכנס", translit: "Lehikanes", fr: "Entrer",
    racine: "כנס", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נכנס", t: "Nikhnas" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נכנס", t: "Nikhnas" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכנס", t: "Yikhnas" },
      ],
    },
  },
  {
    inf: "להתראיין", translit: "Lehitrayen", fr: "Entretenir (embauche)",
    racine: "ריין", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתראיין", t: "Mitrayen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התראיין", t: "Hitrayen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתראיין", t: "Yitrayen" },
      ],
    },
  },
  {
    inf: "לשלוח", translit: "Lichloakh", fr: "Envoyer",
    racine: "שלח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שולח", t: "Choleakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שלח", t: "Chalakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישלח", t: "Yichlakh" },
      ],
    },
  },
  {
    inf: "לקוות", translit: "Lekavot", fr: "Espérer",
    racine: "קוה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקווה", t: "Mekave" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קיווה", t: "Kiva" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקווה", t: "Yekave" },
      ],
    },
  },
  {
    inf: "לייחל", translit: "Leyakhel", fr: "Espérer (fort) / désirer",
    racine: "יחל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מייחל", t: "Meyakhel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ייחל", t: "Yikhel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייחל", t: "Yeyakhel" },
      ],
    },
  },
  {
    inf: "לנסות", translit: "Lenasot", fr: "Essayer / tenter",
    racine: "נסה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנסה", t: "Menase" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ניסה", t: "Nisa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינסה", t: "Yenase" },
      ],
    },
  },
  {
    inf: "למדוד", translit: "Limdod", fr: "Essayer / tester",
    racine: "מדד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מודד", t: "Moded" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "מדד", t: "Madad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימוד", t: "Yamod" },
      ],
    },
  },
  {
    inf: "להיות", translit: "Lehiyot", fr: "Être",
    racine: "היה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הווה", t: "Hove" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "היה", t: "Aya" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהיה", t: "Yihye" },
      ],
    },
  },
  {
    inf: "להתקבל", translit: "Lehitkabel", fr: "Être accepté / admis",
    racine: "קבל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקבל", t: "Mitkabel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקבל", t: "Hitkabel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקבל", t: "Yitkabel" },
      ],
    },
  },
  {
    inf: "להסכים", translit: "Lehaskim", fr: "Être d'accord",
    racine: "סכם", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסכים", t: "Maskim" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסכים", t: "Hiskim" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסכים", t: "Yaskim" },
      ],
    },
  },
  {
    inf: "לעמוד", translit: "Lahamod", fr: "Être debout",
    racine: "עמד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עומד", t: "Omed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עמד", t: "Amad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעמוד", t: "Ya'amod" },
      ],
    },
  },
  {
    inf: "לאחר", translit: "Le'akher", fr: "Être en retard",
    racine: "אחר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאחר", t: "Me'akher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "איחר", t: "Ikher" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאחר", t: "Ye'akher" },
      ],
    },
  },
  {
    inf: "להיות מוכן", translit: "Lehiot Moukhan", fr: "Etre prêt",
    racine: "כון", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממוכן", t: "Memoukhan" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הוכן", t: "Hukhan" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יוכן", t: "Yukhan" },
      ],
    },
  },
  {
    inf: "ללמוד", translit: "Lilmod", fr: "Etudier",
    racine: "למד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "לומד", t: "Lomed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "למד", t: "Lamad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילמד", t: "Yilmad" },
      ],
    },
  },
  {
    inf: "לפסוח", translit: "Lifsoakh", fr: "Sauter / ignoser",
    racine: "מנע", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פוסח", t: "Poseakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פסח", t: "Pasakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפסח", t: "Yifsakh" },
      ],
    },
  },
  {
    inf: "להתרגש", translit: "Lehitragech", fr: "Exciter (pas sexuel)",
    racine: "רגש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתרגש", t: "Mitragech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התרגש", t: "Hitragesh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתרגש", t: "Yitragesh" },
      ],
    },
  },
  {
    inf: "להסביר", translit: "Lehasbir", fr: "Expliquer",
    racine: "סבר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסביר", t: "Masbir" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסביר", t: "Hisbir" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסביר", t: "Yasbir" },
      ],
    },
  },
  {
    inf: "לעשות", translit: "Laassot", fr: "Faire",
    racine: "עשה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עושה", t: "Osse" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עשה", t: "Asa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעשה", t: "Ya'ase" },
      ],
    },
  },
  {
    inf: "להתנדב", translit: "Lehitnadev", fr: "Faire du bénévolat",
    racine: "נדב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנדב", t: "Mitnadev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התנדב", t: "Hitnadev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתנדב", t: "Yitnadev" },
      ],
    },
  },
  {
    inf: "להצחיק", translit: "Lehatskhik", fr: "Faire rire/être drôle/plaisanter",
    racine: "צחק", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצחיק", t: "Matskhik" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצחיק", t: "Hitskhik" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצחיק", t: "Yatskhik" },
      ],
    },
  },
  {
    inf: "לנעול דלת", translit: "Linhol delet", fr: "Fermer à clé",
    racine: "נעל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נועל", t: "No'el" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נעל", t: "Na'al" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינעל", t: "Yin'al" },
      ],
    },
  },
  {
    inf: "לחגוג", translit: "Lakhgog", fr: "Fêter",
    racine: "חגג", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוגג", t: "Khogeg" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חגג", t: "Khagag" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחוג", t: "Yakhog" },
      ],
    },
  },
  {
    inf: "לגמור", translit: "Ligmor", fr: "Finir/terminer (achever) / causer",
    racine: "גמר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גומר", t: "Gomer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גמר", t: "Gamar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגמור", t: "Yigmor" },
      ],
    },
  },
  {
    inf: "לסיים", translit: "Lesayem", fr: "Finir/terminer (complètement)",
    racine: "סים", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסיים", t: "Mesayem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סיים", t: "Siyem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסיים", t: "Yesayem" },
      ],
    },
  },
  {
    inf: "להיגמר", translit: "Lehigamer", fr: "Finir (être fini)",
    racine: "גמר", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נגמר", t: "Nigmar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נגמר", t: "Nigmar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייגמר", t: "Yigmar" },
      ],
    },
  },
  {
    inf: "לקבוע", translit: "Likboa", fr: "Fixer / prevoir",
    racine: "קבע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קובע", t: "Kovea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קבע", t: "Kava" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקבע", t: "Yikba" },
      ],
    },
  },
  {
    inf: "לצוף", translit: "Latsouf", fr: "Flotter",
    racine: "צוף", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צף", t: "Tsaf" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צף", t: "Tsaf" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצוף", t: "Yatsouf" },
      ],
    },
  },
  {
    inf: "לנצח", translit: "Lenatseakh", fr: "Gagner",
    racine: "נצח", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנצח", t: "Menatseakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ניצח", t: "Nitseakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינצח", t: "Yenatseakh" },
      ],
    },
  },
  {
    inf: "לשמור", translit: "Lichmor", fr: "Garder / proteger",
    racine: "שמר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שומר", t: "Chomer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שמר", t: "Chamar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישמור", t: "Yichmor" },
      ],
    },
  },
  {
    inf: "לגדול", translit: "Ligdol", fr: "Grandir",
    racine: "גדל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גדל", t: "Gadel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גדל", t: "Gadal" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגדל", t: "Yigdal" },
      ],
    },
  },
  {
    inf: "לנשנש", translit: "Lenachnech", fr: "Grignoter",
    racine: "נשנש", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנשנש", t: "Menachnech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נשנש", t: "Nishnesh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינשנש", t: "Yenashnesh" },
      ],
    },
  },
  {
    inf: "להמציא", translit: "Lehamtsi", fr: "Inventer",
    racine: "מצא", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממציא", t: "Mamtsi" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המציא", t: "Himtsi" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימציא", t: "Yamtsi" },
      ],
    },
  },
  {
    inf: "לשחק", translit: "Lessakhek", fr: "Jouer (foot)",
    racine: "שחק", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משחק", t: "Messakhek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שיחק", t: "Sikhek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישחק", t: "Yesakhek" },
      ],
    },
  },
  {
    inf: "לנגן", translit: "Lenagen", fr: "Jouer (instrument)",
    racine: "נגן", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנגן", t: "Menagen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ניגן", t: "Nigen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינגן", t: "Yenagen" },
      ],
    },
  },
  {
    inf: "לקרוא", translit: "Likro", fr: "Lire",
    racine: "קרא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קורא", t: "Kore" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קרא", t: "Kara" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקרא", t: "Yikra" },
      ],
    },
  },
  {
    inf: "לשכור", translit: "Liskor", fr: "Louer un appart (locataire)",
    racine: "שכר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכר", t: "Sokher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שכר", t: "Sakhar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישכור", t: "Yiskor" },
      ],
    },
  },
  {
    inf: "להשכיר", translit: "Lehaskir", fr: "Louer un appart (proprietaire)",
    racine: "שכר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משכיר", t: "Maskir" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השכיר", t: "Hiskir" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישכיר", t: "Yaskir" },
      ],
    },
  },
  {
    inf: "לאכול", translit: "Leekhol", fr: "Manger",
    racine: "אכל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אוכל", t: "Okhel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "אכל", t: "Akhal" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאכל", t: "Yokhal" },
      ],
    },
  },
  {
    inf: "לשקר", translit: "Lechaker", fr: "Mentir",
    racine: "שקר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משקר", t: "Mechaker" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שיקר", t: "Chiker" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישקר", t: "Yeshaker" },
      ],
    },
  },
  {
    inf: "לשים", translit: "Lassim", fr: "Mettre/poser",
    racine: "שים", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שם", t: "Sam" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שם", t: "Sam" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישים", t: "Yasim" },
      ],
    },
  },
  {
    inf: "להראות", translit: "Lehar'ot", fr: "Montrer",
    racine: "ראה", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מראה", t: "Mar'é" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הראה", t: "Her'a" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יראה", t: "Yar'e" },
      ],
    },
  },
  {
    inf: "לשחות", translit: "Liskhot", fr: "Nager",
    racine: "שחה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוחה", t: "Sokhe" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שחה", t: "Sakha" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישחה", t: "Yiskhe" },
      ],
    },
  },
  {
    inf: "להיוולד", translit: "Lehivaled", fr: "Naitre",
    racine: "ילד", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נולד", t: "Nolad" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נולד", t: "Nolad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייוולד", t: "Yivaled" },
      ],
    },
  },
  {
    inf: "להצריך", translit: "Lehatsrikh", fr: "Necessiter/exiger/impliquer",
    racine: "צרך", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצריך", t: "Matsrikh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצריך", t: "Hitsrikh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצריך", t: "Yatsrikh" },
      ],
    },
  },
  {
    inf: "לשכוח", translit: "Lichkoakh", fr: "Oublier",
    racine: "שכח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכח", t: "Chokheakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שכח", t: "Chakhakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישכח", t: "Yichkakh" },
      ],
    },
  },
  {
    inf: "לפתוח", translit: "Liftoakh", fr: "Ouvrir",
    racine: "פתח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פותח", t: "Poteakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פתח", t: "Patakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפתח", t: "Yiftakh" },
      ],
    },
  },
  {
    inf: "לדבר", translit: "Ledaber", fr: "Parler",
    racine: "דבר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדבר", t: "Medaber" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "דיבר", t: "Diber" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידבר", t: "Yedaber" },
      ],
    },
  },
  {
    inf: "לעבור", translit: "La'avor", fr: "Passer / franchir",
    racine: "עבר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עובר", t: "Hover" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עבר", t: "Avar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעבור", t: "Ya'avor" },
      ],
    },
  },
  {
    inf: "לשלם", translit: "Lechalem", fr: "Payer",
    racine: "שלם", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משלם", t: "Mechalem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שילם", t: "Chilem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישלם", t: "Yeshalem" },
      ],
    },
  },
  {
    inf: "לחשוב", translit: "Lakhchov", fr: "Penser / Réfléchir",
    racine: "חשב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חושב", t: "Khochev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חשב", t: "Khachav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחשוב", t: "Yakhchov" },
      ],
    },
  },
  {
    inf: "לאבד", translit: "Leabed", fr: "Perdre",
    racine: "אבד", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאבד", t: "Meabed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "איבד", t: "Ibed" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאבד", t: "Ye'abed" },
      ],
    },
  },
  {
    inf: "לשקול", translit: "Lichkol", fr: "Peser",
    racine: "שקל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוקל", t: "Chokel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שקל", t: "Chakal" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישקול", t: "Yishkol" },
      ],
    },
  },
  {
    inf: "לבכות", translit: "Livkot", fr: "Pleurer",
    racine: "בכה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוכה", t: "Bokhe" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בכה", t: "Bakha" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבכה", t: "Yivke" },
      ],
    },
  },
  {
    inf: "לחגור", translit: "Lakhgor", fr: "Porter ceinture sécurité",
    racine: "חגר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוגר", t: "Khoger" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חגר", t: "Khagar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחגור", t: "Yakhgor" },
      ],
    },
  },
  {
    inf: "לגרוב", translit: "Ligrov", fr: "Porter des chaussettes",
    racine: "גרב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גורב", t: "Gorev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גרב", t: "Garav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגרוב", t: "Yigrov" },
      ],
    },
  },
  {
    inf: "לנעול", translit: "Lin'ol", fr: "Porter des chaussures",
    racine: "נעל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נועל", t: "No'el" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נעל", t: "Na'al" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינעל", t: "Yin'al" },
      ],
    },
  },
  {
    inf: "להרכיב", translit: "Learkiv", fr: "Porter des lunettes",
    racine: "רכב", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרכיב", t: "Markiv" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרכיב", t: "Hirkiv" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירכיב", t: "Yarkiv" },
      ],
    },
  },
  {
    inf: "לעטות", translit: "Lahatot", fr: "Porter écharp/mask/foular",
    racine: "עטה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוטה", t: "Hote" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עטה", t: "Ata" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעטה", t: "Ya'ate" },
      ],
    },
  },
  {
    inf: "לענוד", translit: "Lahanod", fr: "Porter un bijou",
    racine: "ענד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עונד", t: "Honed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ענד", t: "Anad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יענוד", t: "Ya'anod" },
      ],
    },
  },
  {
    inf: "לחבוש", translit: "Lakhboch", fr: "Porter un chapeau",
    racine: "חבש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חובש", t: "Khovech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חבש", t: "Khavach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחבוש", t: "Yakhbosh" },
      ],
    },
  },
  {
    inf: "ללבוש", translit: "Lilboch", fr: "Habiller (porter des vêtements)",
    racine: "לבש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "לובש", t: "Lovech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "לבש", t: "Lavach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילבש", t: "Yilbach" },
      ],
    },
  },
  {
    inf: "לוכל", translit: "Loukhal", fr: "Pouvoir",
    racine: "יכל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יכול", t: "Yakhol" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "יכול", t: "Yakhol" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יוכל", t: "Yukhal" },
      ],
    },
  },
  {
    inf: "להעדיף", translit: "Lea'adif", fr: "Préférer",
    racine: "עדף", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעדיף", t: "Ma'adif" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העדיף", t: "He'edif" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעדיף", t: "Ya'adif" },
      ],
    },
  },
  {
    inf: "להתפלל", translit: "Lehitpalel", fr: "Prier",
    racine: "פלל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתפלל", t: "Mitpalel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התפלל", t: "Hitpalel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתפלל", t: "Yitpalel" },
      ],
    },
  },
  {
    inf: "להתקדם", translit: "Lehitkadem", fr: "Progresser / avancer",
    racine: "קדם", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקדם", t: "Mitkadem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקדם", t: "Hitkadem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקדם", t: "Yitkadem" },
      ],
    },
  },
  {
    inf: "להבטיח", translit: "Lehavtiakh", fr: "Promettre",
    racine: "בטח", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטיח", t: "Mavtiakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הבטיח", t: "Hivtiakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבטיח", t: "Yavtiakh" },
      ],
    },
  },
  {
    inf: "להבטיח", translit: "Lehavtiakh", fr: "Promettre",
    racine: "בטח", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטיח", t: "Mavtiakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הבטיח", t: "Hivtiakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבטיח", t: "Yavtiakh" },
      ],
    },
  },
  {
    inf: "לעזוב", translit: "Lahazov", fr: "Quitter",
    racine: "עזב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוזב", t: "Ozev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עזב", t: "Azav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעזוב", t: "Ya'azov" },
      ],
    },
  },
  {
    inf: "לספר", translit: "Lesaper", fr: "Raconter",
    racine: "ספר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מספר", t: "Mesaper" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סיפר", t: "Siper" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יספר", t: "Yesaper" },
      ],
    },
  },
  {
    inf: "לסדר", translit: "Lesader", fr: "Ranger / organiser",
    racine: "סדר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסדר", t: "Mesader" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סידר", t: "Sider" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסדר", t: "Yesader" },
      ],
    },
  },
  {
    inf: "לקבל", translit: "Lekabel", fr: "Recevoir (un cadeau)",
    racine: "קבל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקבל", t: "Mekabel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קיבל", t: "Kibel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקבל", t: "Yekabel" },
      ],
    },
  },
  {
    inf: "להמליץ", translit: "Lehamlitz", fr: "Recommander / conseiller",
    racine: "מלץ", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממליץ", t: "Mamlitz" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המליץ", t: "Himlitz" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימליץ", t: "Yamlitz" },
      ],
    },
  },
  {
    inf: "להיסתכל", translit: "Lehistakel", fr: "Regarder",
    racine: "סכל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מיסתכל", t: "Mistakel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסתכל", t: "Histakel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסתכל", t: "Yistakel" },
      ],
    },
  },
  {
    inf: "להחליף", translit: "Lehakhlif", fr: "Remplacer",
    racine: "חלף", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחליף", t: "Makhlif" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "החליף", t: "Hekhlif" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחליף", t: "Yakhlif" },
      ],
    },
  },
  {
    inf: "לפגוש", translit: "Lifgoch", fr: "Rencontrer",
    racine: "פגש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פוגש", t: "Pogech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פגש", t: "Pagach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפגוש", t: "Yifgoch" },
      ],
    },
  },
  {
    inf: "לחזור", translit: "Lakhzor", fr: "Rentrer/revenir/réviser/répéter",
    racine: "חזר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוזר", t: "Khozer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חזר", t: "Khazar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחזור", t: "Yakhzor" },
      ],
    },
  },
  {
    inf: "להנות", translit: "Lehanot", fr: "Répondre",
    racine: "הנה", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהנה", t: "Mehane" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הנה", t: "Ina" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהנה", t: "Yehane" },
      ],
    },
  },
  {
    inf: "לדמות", translit: "Lidmot", fr: "Ressembler",
    racine: "דמה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דומה", t: "Dome" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "דמה", t: "Dama" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידמה", t: "Yidme" },
      ],
    },
  },
  {
    inf: "להצליח", translit: "Lehatsliakh", fr: "Réussir",
    racine: "צלח", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצליח", t: "Matsliakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצליח", t: "Hitsliakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצליח", t: "Yatsliakh" },
      ],
    },
  },
  {
    inf: "לצחוק", translit: "Litskhok", fr: "Rigoler / plaisanter",
    racine: "צחק", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צוחק", t: "Tsokhek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צחק", t: "Tsakhak" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצחק", t: "Yitskhak" },
      ],
    },
  },
  {
    inf: "לשבת", translit: "Lachevet", fr: "S'asseoir",
    racine: "ישב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יושב", t: "Yochev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ישב", t: "Yachav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישב", t: "Yechev" },
      ],
    },
  },
  {
    inf: "להתכתב", translit: "Lehitkhatev", fr: "S'écrire",
    racine: "כתב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתכתב", t: "Mitkhatev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התכתב", t: "Hitkhatev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתכתב", t: "Yitkhatev" },
      ],
    },
  },
  {
    inf: "לשעמם", translit: "Lechaamem", fr: "S'ennuyer",
    racine: "שעמם", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משעמם", t: "Meshaamem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שיעמם", t: "Shi'amem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישעמם", t: "Yeshaamem" },
      ],
    },
  },
  {
    inf: "להתלבש", translit: "Lehitlabech", fr: "Habiller (action : se vêtir)",
    racine: "לבש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתלבש", t: "Mitlabech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התלבש", t: "Hitlabech" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתלבש", t: "Yitlabech" },
      ],
    },
  },
  {
    inf: "לטייל", translit: "Letayel", fr: "Se balader (trip)",
    racine: "טייל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מטייל", t: "Metayel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טייל", t: "Tiyel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטייל", t: "Yetayel" },
      ],
    },
  },
  {
    inf: "להתחפש", translit: "Lehitkhapes", fr: "Se deguiser",
    racine: "חפש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחפש", t: "Mitkhapes" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התחפש", t: "Hitkhapes" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתחפש", t: "Yitkhapes" },
      ],
    },
  },
  {
    inf: "לטוס", translit: "Latous", fr: "Se déplacer (en avion)",
    racine: "טוס", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טס", t: "Tass" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טס", t: "Tas" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטוס", t: "Yatus" },
      ],
    },
  },
  {
    inf: "לינסוע", translit: "Linsoa", fr: "Se déplacer (voiture, bus…)",
    racine: "נסע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוסע", t: "Nossea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נסע", t: "Nasa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייסע", t: "Yisa" },
      ],
    },
  },
  {
    inf: "להתקלח", translit: "Lehitkalakh", fr: "Se doucher",
    racine: "קלח", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקלח", t: "Mitkaleakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקלח", t: "Hitkalakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקלח", t: "Yitkaleakh" },
      ],
    },
  },
  {
    inf: "לשטוף", translit: "Lichtof", fr: "Se laver",
    racine: "שטף", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוטף", t: "Chotef" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שטף", t: "Chataf" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישטוף", t: "Yishtof" },
      ],
    },
  },
  {
    inf: "להתאפר", translit: "Lehit'aper", fr: "Se maquiller",
    racine: "אפר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאפר", t: "Mit'aper" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאפר", t: "Hit'aper" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאפר", t: "Yit'aper" },
      ],
    },
  },
  {
    inf: "להתחתן", translit: "Lehitkhaten", fr: "Se marier",
    racine: "חתן", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחתן", t: "Mitkhaten" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התחתן", t: "Hitkhaten" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתחתן", t: "Yitkhaten" },
      ],
    },
  },
  {
    inf: "לנוח", translit: "Lanouakh", fr: "Se reposer",
    racine: "נוח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נח", t: "Nakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נח", t: "Nakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינוח", t: "Yanuakh" },
      ],
    },
  },
  {
    inf: "להתפך", translit: "Lehit'apekh", fr: "Se retourner",
    racine: "הפך", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתהפך", t: "Mit'hapekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התהפך", t: "Hit'hapekh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתהפך", t: "Yit'hapekh" },
      ],
    },
  },
  {
    inf: "להיפגש", translit: "Lehipagech", fr: "Se retrouver",
    racine: "פגש", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נפגש", t: "Nifgach" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נפגש", t: "Nifgach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייפגש", t: "Yipagech" },
      ],
    },
  },
  {
    inf: "לקום", translit: "Lakoum", fr: "Se lever",
    racine: "קום", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קם", t: "Kam" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קם", t: "Kam" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקום", t: "Yakum" },
      ],
    },
  },
  {
    inf: "להשתכר", translit: "Lehichtaker", fr: "Se saouler",
    racine: "שכר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתכר", t: "Michtaker" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השתכר", t: "Hishtaker" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתכר", t: "Yishtaker" },
      ],
    },
  },
  {
    inf: "להרגיש", translit: "Lehargich", fr: "Se sentir",
    racine: "רגש", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרגיש", t: "Margich" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרגיש", t: "Hirgish" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירגיש", t: "Yargish" },
      ],
    },
  },
  {
    inf: "לטעות", translit: "Lit'ot", fr: "Se tromper",
    racine: "טעה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טועה", t: "To'e" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טעה", t: "Ta'a" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטעה", t: "Yit'e" },
      ],
    },
  },
  {
    inf: "למצא", translit: "Limtso", fr: "Se trouver",
    racine: "מצא", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נמצא", t: "Nimtsa" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נמצא", t: "Nimtsa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימצא", t: "Yimatse" },
      ],
    },
  },
  {
    inf: "לצאת", translit: "Latset", fr: "Sortir (au resto, avec des amis…)",
    racine: "יצא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יוצא", t: "Yots'e" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "יצא", t: "Yatsa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצא", t: "Yetse" },
      ],
    },
  },
  {
    inf: "לנשוב", translit: "Linchov", fr: "Souffler (vent)",
    racine: "נשב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נושב", t: "Nochev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נשב", t: "Nachav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינשוב", t: "Yinchov" },
      ],
    },
  },
  {
    inf: "לאחל", translit: "Le'akhel", fr: "Souhaiter / te souhaiter",
    racine: "אחל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאחל", t: "Me'akhel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "איחל", t: "Ikhel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאחל", t: "Ye'akhel" },
      ],
    },
  },
  {
    inf: "לשרוד", translit: "Lisrod", fr: "Survivre",
    racine: "שרד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שורד", t: "Sored" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שרד", t: "Sarad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישרוד", t: "Yisrod" },
      ],
    },
  },
  {
    inf: "לחלות", translit: "Lakhlot", fr: "Tomber malade",
    racine: "חלה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חולה", t: "Khole" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חלה", t: "Khala" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחלה", t: "Yekhele" },
      ],
    },
  },
  {
    inf: "לפנות", translit: "Lifnot", fr: "Tourner (changer de direction)",
    racine: "פנה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פונה", t: "Pone" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פנה", t: "Pana" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפנה", t: "Yifne" },
      ],
    },
  },
  {
    inf: "לעבוד", translit: "La'avod", fr: "Travailler",
    racine: "עבד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עובד", t: "Oved" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עבד", t: "Avad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעבוד", t: "Ya'avod" },
      ],
    },
  },
  {
    inf: "להרוג", translit: "Laharog", fr: "Tuer",
    racine: "הרג", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הורג", t: "Oreg" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרג", t: "Harag" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהרוג", t: "Yahrog" },
      ],
    },
  },
  {
    inf: "לשחוט", translit: "Lichkhot", fr: "Tuer (abattage rituel)",
    racine: "שחט", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוחט", t: "Chokhet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שחט", t: "Chakhat" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישחט", t: "Yishkhat" },
      ],
    },
  },
  {
    inf: "להשתמש", translit: "Lehichtamech", fr: "Utiliser",
    racine: "שמש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתמש", t: "Mishtamesh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השתמש", t: "Hishtamech" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתמש", t: "Yishtamech" },
      ],
    },
  },
  {
    inf: "למכור", translit: "Limkor", fr: "Vendre",
    racine: "מכר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוכר", t: "Mokher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "מכר", t: "Makhar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימכור", t: "Yimkor" },
      ],
    },
  },
  {
    inf: "לבוא", translit: "Lavo", fr: "Venir",
    racine: "בוא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בא", t: "Ba" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בא", t: "Ba" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבוא", t: "Yavo" },
      ],
    },
  },
  {
    inf: "לבקר", translit: "Levaker", fr: "Visiter quelqu'un (et)",
    racine: "בקר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבקר", t: "Mevaker" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ביקר", t: "Biker" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבקר", t: "Yevaker" },
      ],
    },
  },
  {
    inf: "לגור", translit: "Lagour", fr: "Vivre / habiter",
    racine: "גור", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גר", t: "Gar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גר", t: "Gar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגור", t: "Yagur" },
      ],
    },
  },
  {
    inf: "לראות", translit: "Lir'ot", fr: "Voir (film)",
    racine: "ראה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רואה", t: "Roe" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ראה", t: "Raa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יראה", t: "Yir'e" },
      ],
    },
  },
  {
    inf: "להצביע", translit: "Lehatsbia", fr: "Voter / indiquer",
    racine: "צבע", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצביע", t: "Matsbia" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצביע", t: "Hitsbia" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצביע", t: "Yatsbia" },
      ],
    },
  },
  {
    inf: "לרצות", translit: "Lirtsot", fr: "Vouloir",
    racine: "רצה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוצה", t: "Rotse" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "רצה", t: "Ratsa" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירצה", t: "Yirtse" },
      ],
    },
  },
  {
    inf: "לתקן", translit: "Letaken", fr: "Corriger",
    racine: "תקן", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקן", t: "Metaken" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "תיקן", t: "Tiken" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקן", t: "Yetaken" },
      ],
    },
  },
  {
    inf: "להישאר", translit: "Lehicha'er", fr: "Rester",
    racine: "שאר", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נשאר", t: "Nich'ar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נשאר", t: "Nich'ar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישאר", t: "Yich'ar" },
      ],
    },
  },
  {
    inf: "להימשך", translit: "Lehimachekh", fr: "Durer",
    racine: "משך", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נמשך", t: "Nimchakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נמשך", t: "Nimchakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימשך", t: "Yimchakh" },
      ],
    },
  },
  {
    inf: "לזכור", translit: "Lizcor", fr: "Se souvenir (passif)",
    racine: "זכר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "זוכר", t: "Zokher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "זכר", t: "Zakhar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזכור", t: "Yizkor" },
      ],
    },
  },
  {
    inf: "להיזכר", translit: "Lehizakher (be)", fr: "Se souvenir (actif : action de réflechir)",
    racine: "זכר", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נזכר", t: "Nizcar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נזכר", t: "Nizcar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזכר", t: "Yizcar" },
      ],
    },
  },
  {
    inf: "להיכשל", translit: "Lehicachel (be)", fr: "Echouer",
    racine: "כשל", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נכשל", t: "Nikhchal" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נכשל", t: "Nikhchal" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכשל", t: "Yikhchal" },
      ],
    },
  },
  {
    inf: "להירשם", translit: "Lehirachem", fr: "S'inscrire",
    racine: "רשם", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נרשם", t: "Nircham" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נרשם", t: "Nircham" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירשם", t: "Yircham" },
      ],
    },
  },
  {
    inf: "להגשים", translit: "Lehagchim", fr: "Réaliser",
    racine: "גשם", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מגשים", t: "Magchim" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הגשים", t: "Higshim" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגשים", t: "Yagshim" },
      ],
    },
  },
  {
    inf: "להרוויח כסף", translit: "Learviakh kesef", fr: "Gagner (de l'argent)",
    racine: "רוח", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרוויח", t: "Marvikh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרוויח", t: "Hirviakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירוויח", t: "Yarviakh" },
      ],
    },
  },
  {
    inf: "להשפיע", translit: "Lehachpiha", fr: "Influencer",
    racine: "שפע", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משפיע", t: "Machpiha" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השפיע", t: "Hishpia" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישפיע", t: "Yashpia" },
      ],
    },
  },
  {
    inf: "לקשור", translit: "Likchor", fr: "Attacher / nouer",
    racine: "קשר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קושר", t: "Kocher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קשר", t: "Kachar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקשור", t: "Yikchor" },
      ],
    },
  },
  {
    inf: "להקריב", translit: "Lehakriv", fr: "Sacrifier",
    racine: "קרב", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקריב", t: "Makriv" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הקריב", t: "Hikriv" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקריב", t: "Yakriv" },
      ],
    },
  },
  {
    inf: "לכבד", translit: "Lekhabed", fr: "Respecter",
    racine: "כבד", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכבד", t: "Mekhabed" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "כיבד", t: "Kibed" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכבד", t: "Yekhabed" },
      ],
    },
  },
  {
    inf: "לשחוט", translit: "Lichkot", fr: "Egorger",
    racine: "שחט", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוקט", t: "Choket" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שחט", t: "Chakhat" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישחט", t: "Yishkhat" },
      ],
    },
  },
  {
    inf: "לגנוב", translit: "Lignov", fr: "Voler (dérober)",
    racine: "גנב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גונב", t: "Gonev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גנב", t: "Ganav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגנוב", t: "Yignov" },
      ],
    },
  },
  {
    inf: "לבגוד", translit: "Livgod", fr: "Tromper / trahir",
    racine: "בגד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוגד", t: "Boged" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בגד", t: "Bagad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבגוד", t: "Yivgod" },
      ],
    },
  },
  {
    inf: "לנחש", translit: "Lenakhech", fr: "Deviner",
    racine: "נחש", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנחש", t: "Menakhech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ניחש", t: "Nikhesh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינחש", t: "Yenakhesh" },
      ],
    },
  },
  {
    inf: "להרים", translit: "Leharim", fr: "Lever",
    racine: "רום", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרים", t: "Marim" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרים", t: "Herim" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירים", t: "Yarim" },
      ],
    },
  },
  {
    inf: "לגעת", translit: "Lagahat", fr: "Toucher (physique)",
    racine: "נגע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוגע", t: "Nogea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נגע", t: "Naga" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייגע", t: "Yiga" },
      ],
    },
  },
  {
    inf: "להעתיק", translit: "Leahetik", fr: "Copier / tricher",
    racine: "עתק", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעדיק", t: "Mahetik" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העתיק", t: "He'etik" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעתיק", t: "Ya'atik" },
      ],
    },
  },
  {
    inf: "להתאהב", translit: "Lehit'aev", fr: "Tomber amoureux",
    racine: "אהב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאהב", t: "Mit'aev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאהב", t: "Hit'aev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאהב", t: "Yit'aev" },
      ],
    },
  },
  {
    inf: "להתנגד", translit: "Lehitnaged", fr: "S'opposer à",
    racine: "נגד", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנגד", t: "Mitnaged" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התנגד", t: "Hitnaged" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתנגד", t: "Yitnaged" },
      ],
    },
  },
  {
    inf: "להתחבק", translit: "Lehitkhabek", fr: "Prendre quelqu'un dans ses bras",
    racine: "חבק", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתחבק", t: "Mitkhabek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התחבק", t: "Hitkhabek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתחבק", t: "Yitkhabek" },
      ],
    },
  },
  {
    inf: "להתרחק", translit: "Lehitrakhek", fr: "S'éloigner de (מ)",
    racine: "רחק", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתרחק", t: "Mitrakhek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התרחק", t: "Hitrakhek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתרחק", t: "Yitrakhek" },
      ],
    },
  },
  {
    inf: "להתקרב", translit: "Lehitkarev", fr: "S'approcher de (ל)",
    racine: "קרב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקרב", t: "Mitkarev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקרב", t: "Hitkarev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקרב", t: "Yitkarev" },
      ],
    },
  },
  {
    inf: "להתגעגע", translit: "Lehitgahageha", fr: "Ressentir un manque (ל)",
    racine: "געגע", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתגעגע", t: "Mitgaageha" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התגעגע", t: "Hitgaageha" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתגעגע", t: "Yitgaageha" },
      ],
    },
  },
  {
    inf: "להצטער", translit: "Lehitstaher", fr: "Être désolé / regretter",
    racine: "צער", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצטער", t: "Mitstaer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצטער", t: "Hitstaer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצטער", t: "Yitstaer" },
      ],
    },
  },
  {
    inf: "לבטל", translit: "Levatel", fr: "Annuler/supprimer/abandonner",
    racine: "בטל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטל", t: "Mevatel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ביטל", t: "Bitel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבטל", t: "Yevatel" },
      ],
    },
  },
  {
    inf: "ללדת", translit: "Laledet", fr: "Accoucher",
    racine: "ילד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יולד", t: "Yoled" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ילד", t: "Yalad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילד", t: "Yeled" },
      ],
    },
  },
  {
    inf: "לצוד", translit: "Latsoud", fr: "Chasser",
    racine: "צוד", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צד", t: "Tsad" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צד", t: "Tsad" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצוד", t: "Yatsud" },
      ],
    },
  },
  {
    inf: "לברך", translit: "Levarekh", fr: "Souhaiter / saluer",
    racine: "ברך", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מברך", t: "Mevarekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ברך", t: "Berakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יברך", t: "Yevarekh" },
      ],
    },
  },
  {
    inf: "לרמות", translit: "Leramot", fr: "Tricher / arnaquer",
    racine: "רמה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרמה", t: "Merame" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "רימה", t: "Rima" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירמה", t: "Yerame" },
      ],
    },
  },
  {
    inf: "לטעום", translit: "Lit'om", fr: "Goûter",
    racine: "טעם", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טועם", t: "Tohem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טעם", t: "Taham" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטעם", t: "Yit'am" },
      ],
    },
  },
  {
    inf: "לבוש", translit: "Levoch", fr: "Avoir honte",
    racine: "בוש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בוש", t: "Boch" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בוש", t: "Boch" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבוש", t: "Yevoch" },
      ],
    },
  },
  {
    inf: "להשלים", translit: "Lehachlim", fr: "Compléter / remplir",
    racine: "שלם", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משלים", t: "Machlim" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ברח", t: "Barakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישלים", t: "Yashlim" },
      ],
    },
  },
  {
    inf: "מסופר", translit: "Mesoupar", fr: "Avoir raconté",
    racine: "ספר", binyan: "פועל (סביל)",
    temps: {

    },
  },
  {
    inf: "לנגוע", translit: "Lingoa", fr: "Toucher (atteindre)",
    racine: "נגע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נוגע", t: "Nogea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נגע", t: "Naga" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייגע", t: "Yiga" },
      ],
    },
  },
  {
    inf: "להסתיים", translit: "Lehistayem", fr: "S'être terminé",
    racine: "סים", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסתיים", t: "Mistayem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסתיים", t: "Histayem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסתיים", t: "Yistayem" },
      ],
    },
  },
  {
    inf: "לצעוק", translit: "Lits'ok", fr: "Crier",
    racine: "צעק", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צועק", t: "Tsoek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צעק", t: "Tsa'ak" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצעק", t: "Yitsak" },
      ],
    },
  },
  {
    inf: "לפגוע", translit: "Lifgoa", fr: "Blesser / vexer",
    racine: "פגע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פוגע", t: "Poge'a" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פגע", t: "Paga" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפגע", t: "Yifga" },
      ],
    },
  },
  {
    inf: "להזיז", translit: "Lehaziz", fr: "Déplacer",
    racine: "זוז", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזיז", t: "Meziz" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הזיז", t: "Heziz" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזיז", t: "Yaziz" },
      ],
    },
  },
  {
    inf: "להעיר", translit: "Leha'ir", fr: "Réveiller",
    racine: "עור", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעיר", t: "Meir" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העיר", t: "He'ir" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעיר", t: "Ya'ir" },
      ],
    },
  },
  {
    inf: "להתעורר", translit: "Lehit'orer", fr: "Se réveiller",
    racine: "עור", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתעורר", t: "Mit'orer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התעורר", t: "Hit'orer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתעורר", t: "Yit'orer" },
      ],
    },
  },
  {
    inf: "להציע", translit: "Lehatsia", fr: "Proposer",
    racine: "יצע", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מציע", t: "Matsia" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הציע", t: "Hetsia" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יציע", t: "Yatsia" },
      ],
    },
  },
  {
    inf: "לרכוש", translit: "Lirkoch", fr: "Acquérir",
    racine: "רכש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "רוכש", t: "Rokech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "רכש", t: "Rakhach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירכוש", t: "Yirkoch" },
      ],
    },
  },
  {
    inf: "לפרש", translit: "Lefarech", fr: "Interpréter / expliquer / traduire",
    racine: "פרש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פורש", t: "Porech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פרש", t: "Parach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפרוש", t: "Yifroch" },
      ],
    },
  },
  {
    inf: "להציג", translit: "Lehatsig", fr: "Présenter",
    racine: "יצג", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מציג", t: "Matsig" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הציג", t: "Hetsig" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יציג", t: "Yatsig" },
      ],
    },
  },
  {
    inf: "לבלות", translit: "Levalot", fr: "Passer/amuser/rester/vivre",
    racine: "בלה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבלה", t: "Mevale" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "בילה", t: "Bila" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבלה", t: "Yevale" },
      ],
    },
  },
  {
    inf: "להביט", translit: "Lehabit", fr: "Regarder",
    racine: "נבט", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מביט", t: "Mabit" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הביט", t: "Hibit" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יביט", t: "Yabit" },
      ],
    },
  },
  {
    inf: "לגרום", translit: "Ligrom", fr: "Rendre/causer/faire",
    racine: "גרם", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גורם", t: "Gorem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גרם", t: "Garam" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגרום", t: "Yigrom" },
      ],
    },
  },
  {
    inf: "להפסיד", translit: "Leafsid", fr: "Perdre",
    racine: "פסד", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפסיד", t: "Mafsid" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הפסיד", t: "Hifsid" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפסיד", t: "Yafsid" },
      ],
    },
  },
  {
    inf: "להתאבל", translit: "Lehit'abel", fr: "Faire le deuil",
    racine: "אבל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאבל", t: "Mit'abel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאבל", t: "Hit'abel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאבל", t: "Yit'abel" },
      ],
    },
  },
  {
    inf: "לחטוא", translit: "Lakhto", fr: "Pêcher (heb moderne : pas très grave)",
    racine: "חטא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חוטא", t: "Khote" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חטא", t: "Khata" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחטא", t: "Yekhta" },
      ],
    },
  },
  {
    inf: "להשקות", translit: "Lehachkot", fr: "Arroser",
    racine: "שקה", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משקה", t: "Machke" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השקה", t: "Hishka" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישקה", t: "Yashke" },
      ],
    },
  },
  {
    inf: "לסלוח", translit: "Lisloakh", fr: "Excuser",
    racine: "סלח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "סולח", t: "Soleakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סלח", t: "Salakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסלח", t: "Yislakh" },
      ],
    },
  },
  {
    inf: "לשכב", translit: "Lichkav", fr: "Faire l'amour/s'allonger",
    racine: "שכב", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שוכב", t: "Sokhev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שכב", t: "Chakhav" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישכב", t: "Yishkav" },
      ],
    },
  },
  {
    inf: "להעניש", translit: "Leha'anich", fr: "Punir",
    racine: "ענש", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעניש", t: "Ma'anich" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העניש", t: "He'enich" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעניש", t: "Ya'anich" },
      ],
    },
  },
  {
    inf: "להסתדר", translit: "Lehistader", fr: "Se débrouiller",
    racine: "סדר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסתדר", t: "Mistader" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסתדר", t: "Histader" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסתדר", t: "Yistader" },
      ],
    },
  },
  {
    inf: "לההילחם", translit: "Lehilakhem", fr: "Faire la guerre",
    racine: "לחם", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נלחם", t: "Nilkham" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נלחם", t: "Nilkham" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילחם", t: "Yilkham" },
      ],
    },
  },
  {
    inf: "להתנהג", translit: "Lehitnaheg", fr: "Se comporter",
    racine: "נהג", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנהג", t: "Mitnaheg" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התנהג", t: "Hitnaheg" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתנהג", t: "Yitnaheg" },
      ],
    },
  },
  {
    inf: "להשתנות", translit: "Lehichtanot", fr: "Se changer",
    racine: "שנה", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתנה", t: "Mishtane" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השתנה", t: "Hishtana" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתנה", t: "Yishtane" },
      ],
    },
  },
  {
    inf: "להתעניין", translit: "Lehit'anien", fr: "S'intéresser",
    racine: "ענין", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתעניין", t: "Mit'anien" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התעניין", t: "Hit'anien" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתעניין", t: "Yit'anien" },
      ],
    },
  },
  {
    inf: "להתבייש", translit: "Lehitbayech", fr: "être timide",
    racine: "בוש", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתבייש", t: "Mitbayech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התבייש", t: "Hitbayech" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתבייש", t: "Yitbayech" },
      ],
    },
  },
  {
    inf: "להתאכזב", translit: "Lehit'akhzev", fr: "être déçu",
    racine: "אכזב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאכזב", t: "Mit'akhzev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאכזב", t: "Hit'akhzev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאכזב", t: "Yit'akhzev" },
      ],
    },
  },
  {
    inf: "לדאוג", translit: "Lid'og", fr: "S'inquiéter",
    racine: "דאג", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דואג", t: "Do'eg" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "דאג", t: "Da'ag" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידאג", t: "Yid'ag" },
      ],
    },
  },
  {
    inf: "לחייך", translit: "Lekhayekh", fr: "Sourire",
    racine: "חייך", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מחייך", t: "Mekhayekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חייך", t: "Khiyekh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחייך", t: "Yekhayekh" },
      ],
    },
  },
  {
    inf: "להאנח", translit: "Lehe'aneakh", fr: "Soupirer",
    racine: "אנח", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נאנח", t: "Ne'enakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נאנח", t: "Ne'enakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאנח", t: "Ye'enakh" },
      ],
    },
  },
  {
    inf: "לעצור", translit: "La'atsor", fr: "S'arrêter",
    racine: "עצר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "עוצר", t: "Otser" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "עצר", t: "Atsar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעצור", t: "Ya'atsor" },
      ],
    },
  },
  {
    inf: "לשפות", translit: "Lichpot", fr: "Juger",
    racine: "שפט", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שופת", t: "Chofet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שפט", t: "Chafat" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישפוט", t: "Yichpot" },
      ],
    },
  },
  {
    inf: "לצום", translit: "Latsoum", fr: "Jeuner",
    racine: "צום", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צם", t: "Tsam" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צם", t: "Tsam" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצום", t: "Yatsum" },
      ],
    },
  },
  {
    inf: "לדון", translit: "Ladoun", fr: "Discuter / juger",
    racine: "דון", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "דן", t: "Dan" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "דן", t: "Dan" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידון", t: "Yadun" },
      ],
    },
  },
  {
    inf: "להעז", translit: "Lahahez", fr: "Oser",
    racine: "עז", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעז", t: "Mehez" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העז", t: "He'ez" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעז", t: "Ya'ez" },
      ],
    },
  },
  {
    inf: "לברוא", translit: "Livro", fr: "Créer",
    racine: "ברא", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "בורא", t: "Bore" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ברא", t: "Bara" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יברא", t: "Yivra" },
      ],
    },
  },
  {
    inf: "לקטוף", translit: "Liktof", fr: "Cueillir",
    racine: "קטף", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "קוטף", t: "Kotef" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "קטף", t: "Kataf" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקטוף", t: "Yiktof" },
      ],
    },
  },
  {
    inf: "להכאיב", translit: "Leakh'iv", fr: "Blesser",
    racine: "כאב", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מכאיב", t: "Makh'iv" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הכאיב", t: "Hikh'iv" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יכאיב", t: "Yakh'iv" },
      ],
    },
  },
  {
    inf: "לשבור", translit: "Lichbor", fr: "Casser",
    racine: "שבר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שובר", t: "Chover" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שבר", t: "Chavar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישבור", t: "Yishbor" },
      ],
    },
  },
  {
    inf: "לנפול", translit: "Linpol", fr: "Tomber",
    racine: "נפל", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נופל", t: "Nofel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נפל", t: "Nafal" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפול", t: "Yipol" },
      ],
    },
  },
  {
    inf: "לטפל", translit: "Letapel", fr: "S'occuper de",
    racine: "טפל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מטפל", t: "Metapel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טיפל", t: "Tipel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטפל", t: "Yetapel" },
      ],
    },
  },
  {
    inf: "לרכל", translit: "Lerakhel", fr: "Parler sur qq'un / jaser",
    racine: "רכל", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרכל", t: "Merakel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ריכל", t: "Rikel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירכל", t: "Yerakel" },
      ],
    },
  },
  {
    inf: "להזיה", translit: "Lehazia", fr: "Transpirer",
    racine: "זיע", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזיה", t: "Mazia" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הזיע", t: "Heziya" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזיע", t: "Yazia" },
      ],
    },
  },
  {
    inf: "להלביש", translit: "Lehalbich", fr: "Habiller (quelqu'un d'autre)",
    racine: "לבש", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מלביש", t: "Malbich" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הלביש", t: "Hilbish" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילביש", t: "Yalbish" },
      ],
    },
  },
  {
    inf: "לבטא", translit: "Levate", fr: "Exprimer",
    racine: "בטא", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מבטא", t: "Mevate" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ביטא", t: "Bita" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יבטא", t: "Yevate" },
      ],
    },
  },
  {
    inf: "לצער", translit: "Letsaer", fr: "Contratrier",
    racine: "צער", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצער", t: "Metsaer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צער", t: "Tsier" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצער", t: "Yetsaer" },
      ],
    },
  },
  {
    inf: "להרביץ", translit: "Leharbitz", fr: "Frapper",
    racine: "רבץ", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרביץ", t: "Marbitz" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרביץ", t: "Hirbits" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירביץ", t: "Yarbits" },
      ],
    },
  },
  {
    inf: "ליצור קשר", translit: "Litsor kecher", fr: "Contacter",
    racine: "יצר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יוצר", t: "Yotser" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "יצר", t: "Yatsar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ייצור", t: "Yitsor" },
      ],
    },
  },
  {
    inf: "להודות", translit: "Lehodot", fr: "Remercier",
    racine: "ידה", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מודה", t: "Mode" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הודה", t: "Hoda" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יודה", t: "Yode" },
      ],
    },
  },
  {
    inf: "לאפשר", translit: "Le'afcher", fr: "Permettre / autoriser",
    racine: "אפשר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאפשר", t: "Me'afcher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "אפשר", t: "Ifsher" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאפשר", t: "Ye'afsher" },
      ],
    },
  },
  {
    inf: "להצטרף", translit: "Lehitstaref", fr: "Rejoindre",
    racine: "צרף", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מצטרף", t: "Mitstaref" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הצטרף", t: "Hitstaref" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצטרף", t: "Yitstaref" },
      ],
    },
  },
  {
    inf: "להתנתק", translit: "Lehitnatek", fr: "Se détacher",
    racine: "נתק", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתנתק", t: "Mitnatek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התנתק", t: "Hitnatek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתנתק", t: "Yitnatek" },
      ],
    },
  },
  {
    inf: "לירות", translit: "Lirot", fr: "Tirer",
    racine: "ירה", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "יורה", t: "Yore" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ירה", t: "Yara" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יירה", t: "Yire" },
      ],
    },
  },
  {
    inf: "להרהר", translit: "Leharher", fr: "Réfléchir",
    racine: "הרהר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהרהר", t: "Meharher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרהר", t: "Hirher" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהרהר", t: "Yeharher" },
      ],
    },
  },
  {
    inf: "להיזהר", translit: "Lehizaher", fr: "Faire attenttion",
    racine: "זהר", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נזהר", t: "Nizhar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נזהר", t: "Nizhar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזהר", t: "Yizhar" },
      ],
    },
  },
  {
    inf: "להתייעץ", translit: "Lehityaetz", fr: "Demander conseil",
    racine: "יעץ", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתייעץ", t: "Mityaetz" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התייעץ", t: "Hityaetz" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתייעץ", t: "Yityaetz" },
      ],
    },
  },
  {
    inf: "לדמיין", translit: "Ledamien", fr: "Imaginer",
    racine: "דמין", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדמיין", t: "Medamien" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "דמיין", t: "Dimyen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידמיין", t: "Yedamien" },
      ],
    },
  },
  {
    inf: "להתלבט", translit: "Lehitlabet", fr: "Hésiter",
    racine: "לבט", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתלבט", t: "Mitlabet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התלבט", t: "Hitlabet" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתלבט", t: "Yitlabet" },
      ],
    },
  },
  {
    inf: "להאשים", translit: "Lehaachim", fr: "Culpabiliser",
    racine: "אשם", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאשים", t: "Maachim" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "האשים", t: "He'achim" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאשים", t: "Ya'achim" },
      ],
    },
  },
  {
    inf: "להמר", translit: "Lehamer", fr: "Parier",
    racine: "מר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהמר", t: "Mehamer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המר", t: "Himer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימר", t: "Yamer" },
      ],
    },
  },
  {
    inf: "להתערב", translit: "Lehit'arev", fr: "Intervenir / se mêler",
    racine: "ערב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתערב", t: "Mit'arev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התערב", t: "Hit'arev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתערב", t: "Yit'arev" },
      ],
    },
  },
  {
    inf: "להפעיל", translit: "Lehaf'il", fr: "Faire fonctionner / activer",
    racine: "פעל", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפעיל", t: "Maf'il" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הפעיל", t: "Hif'il" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפעיל", t: "Yaf'il" },
      ],
    },
  },
  {
    inf: "לפטפט", translit: "Lefatpet", fr: "Papoter",
    racine: "פטפט", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מפטפט", t: "Mefatpet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פטפט", t: "Pitpet" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפטפט", t: "Yefatpet" },
      ],
    },
  },
  {
    inf: "להציץ", translit: "Lehatzits", fr: "Regarder / mâter",
    racine: "ציץ", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מציץ", t: "Metsits" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הציץ", t: "Hetsits" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יציץ", t: "Yatsits" },
      ],
    },
  },
  {
    inf: "לשרת", translit: "Lecharet", fr: "Servir (armée)",
    racine: "שרת", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משרת", t: "Merachet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שירת", t: "Cheret" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישרת", t: "Yesharet" },
      ],
    },
  },
  {
    inf: "לוותר", translit: "Levater", fr: "Abandonner",
    racine: "ותר", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוותר", t: "Mevater" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ויתר", t: "Viter" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יוותר", t: "Yevater" },
      ],
    },
  },
  {
    inf: "לגלוש", translit: "Ligloch", fr: "Surfer",
    racine: "גלש", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "גולש", t: "Golech" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "גלש", t: "Galach" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יגלוש", t: "Yiglosh" },
      ],
    },
  },
  {
    inf: "להמלץ", translit: "Lehamets", fr: "Adopter",
    racine: "מלץ", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "ממלץ", t: "Mamlets" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המליץ", t: "Himlits" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימליץ", t: "Yamlits" },
      ],
    },
  },
  {
    inf: "להעריץ", translit: "Leha'arits", fr: "Admirer",
    racine: "ערץ", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מעריץ", t: "Ma'arits" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "העריץ", t: "He'erits" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יעריץ", t: "Ya'erits" },
      ],
    },
  },
  {
    inf: "להתבגר", translit: "Lehitbager", fr: "Murir",
    racine: "בגר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהתבגר", t: "Mitbager" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התבגר", t: "Hitbager" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתבגר", t: "Yitbager" },
      ],
    },
  },
  {
    inf: "לשקם", translit: "Lechakem", fr: "Rééduquer",
    racine: "שקם", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משקם", t: "Meshakem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שיקם", t: "Shikem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישקם", t: "Yeshakem" },
      ],
    },
  },
  {
    inf: "להציל", translit: "Lehatsil", fr: "Sauver",
    racine: "נצל", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מציל", t: "Matsil" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הציל", t: "Hitsil" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יציל", t: "Yatsil" },
      ],
    },
  },
  {
    inf: "להשאיר", translit: "Lehachir", fr: "Laisser",
    racine: "שאר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משאיר", t: "Mash'ir" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השאיר", t: "Hish'ir" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישאיר", t: "Yash'ir" },
      ],
    },
  },
  {
    inf: "להתכוון", translit: "Lehitkaven", fr: "Faire exprès",
    racine: "כון", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתכוון", t: "Mitkaven" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התכוון", t: "Hitkaven" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתכוון", t: "Yitkaven" },
      ],
    },
  },
  {
    inf: "לשוטט", translit: "Lechotet", fr: "Errer",
    racine: "שוט", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משוטט", t: "Meshotet" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שוטט", t: "Shotet" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישוטט", t: "Yeshotet" },
      ],
    },
  },
  {
    inf: "להתעלל", translit: "Lehit'alel", fr: "Abuser",
    racine: "עלל", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתעלל", t: "Mit'alel" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התעלל", t: "Hit'alel" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתעלל", t: "Yit'alel" },
      ],
    },
  },
  {
    inf: "להתאמץ", translit: "Lehit'amets", fr: "Faire un effort",
    racine: "אמץ", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאמץ", t: "Mit'amets" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאמץ", t: "Hit'amets" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאמץ", t: "Yit'amets" },
      ],
    },
  },
  {
    inf: "להסתובב", translit: "Lehistovev", fr: "Tourner (se balader/circuler)",
    racine: "סבב", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסתובב", t: "Mistovev" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הסתובב", t: "Histovev" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסתובב", t: "Yistovev" },
      ],
    },
  },
  {
    inf: "לאלף", translit: "Le'alef", fr: "Dresser",
    racine: "אלף", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאלף", t: "Me'alef" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "אילף", t: "Ilef" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאלף", t: "Ye'alef" },
      ],
    },
  },
  {
    inf: "לנבוח", translit: "Linboakh", fr: "Aboyer",
    racine: "נבח", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נובח", t: "Noveakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נבח", t: "Navakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינבח", t: "Yinbakh" },
      ],
    },
  },
  {
    inf: "להרשות", translit: "Leharchot", fr: "Autoriser",
    racine: "רשה", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מרשה", t: "Marche" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרשה", t: "Hirche" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ירשה", t: "Yarche" },
      ],
    },
  },
  {
    inf: "להגר", translit: "Lehager", fr: "Emigrer",
    racine: "הגר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהגר", t: "Mehager" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "היגר", t: "Higer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהגר", t: "Yehager" },
      ],
    },
  },
  {
    inf: "להאריך", translit: "Leha'arikh", fr: "Prolonger",
    racine: "ארך", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מאריך", t: "Ma'arikh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "האריך", t: "He'erikh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יאריך", t: "Ya'arikh" },
      ],
    },
  },
  {
    inf: "לפתור", translit: "Liftor", fr: "Résoudre",
    racine: "פתר", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "פותר", t: "Poter" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "פתר", t: "Patar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יפתור", t: "Yiftor" },
      ],
    },
  },
  {
    inf: "לממן", translit: "Lemamen", fr: "Financer",
    racine: "ממן", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מממן", t: "Memamen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "מימן", t: "Mimen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יממן", t: "Yemamen" },
      ],
    },
  },
  {
    inf: "להתכונן", translit: "Lehitkonen", fr: "Se préparer",
    racine: "כון", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתכונן", t: "Mitkonen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התכונן", t: "Hitkonen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתכונן", t: "Yitkonen" },
      ],
    },
  },
  {
    inf: "לחתוך", translit: "Lakhtor", fr: "Couper",
    racine: "חתך", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "חותך", t: "Khotekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "חתך", t: "Khatakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יחתוך", t: "Yakhatokh" },
      ],
    },
  },
  {
    inf: "לספק (ל)", translit: "Lesapek (le)", fr: "Fournir",
    racine: "ספק", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מספק", t: "Mesapek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סיפק", t: "Sipek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יספק", t: "Yesapek" },
      ],
    },
  },
  {
    inf: "להתאמן", translit: "Lehit'amen", fr: "S'entrainer (bé ou lé)",
    racine: "אמן", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתאמן", t: "Mit'amen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התאמן", t: "Hit'amen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתאמן", t: "Yit'amen" },
      ],
    },
  },
  {
    inf: "להזדקק", translit: "Lehizdakek", fr: "Avoir besoin (plus soutenu)",
    racine: "זקק", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מזדקק", t: "Mizdakek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הזדקק", t: "Hizdakek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזדקק", t: "Yizdakek" },
      ],
    },
  },
  {
    inf: "ללוות", translit: "Lelavot", fr: "Accompagner / conduire",
    racine: "לוה", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מלוה", t: "Melave" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ליווה", t: "Liva" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ילווה", t: "Yelave" },
      ],
    },
  },
  {
    inf: "לתמוך", translit: "Litmokh", fr: "Soutenir",
    racine: "תמך", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "תומך", t: "Tomekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "תמך", t: "Tamakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתמוך", t: "Yitmokh" },
      ],
    },
  },
  {
    inf: "לסייע", translit: "Lesaya", fr: "Aider (plus soutenu)",
    racine: "סיע", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מסייע", t: "Mesayea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "סייע", t: "Siyea" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יסייע", t: "Yesaye'a" },
      ],
    },
  },
  {
    inf: "להתבטא", translit: "Lehitbate", fr: "S'exprimer",
    racine: "בטא", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתבטא", t: "Mitbate" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התבטא", t: "Hitbate" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתבטא", t: "Yitbate" },
      ],
    },
  },
  {
    inf: "להתווכח", translit: "Lehitvakeakh", fr: "Discuter / débattre",
    racine: "וכח", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתווכח", t: "Mitvakeakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התווכח", t: "Hitvakeakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתווכח", t: "Yitvakeakh" },
      ],
    },
  },
  {
    inf: "לשלוף", translit: "Lichlof", fr: "Dégainer / tirer",
    racine: "שלף", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "שולף", t: "Cholef" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שלף", t: "Chalaf" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישלוף", t: "Yishlof" },
      ],
    },
  },
  {
    inf: "להדגיש", translit: "Lehadgich", fr: "Souligner / mettre en valeur",
    racine: "דגש", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדגיש", t: "Madgich" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הדגיש", t: "Hidgish" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ידגיש", t: "Yadgish" },
      ],
    },
  },
  {
    inf: "להוכיח", translit: "Leokhiakh", fr: "Prouver",
    racine: "יכח", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מוכיח", t: "Mokhiakh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הוכיח", t: "Hokhiakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יוכיח", t: "Yokhiakh" },
      ],
    },
  },
  {
    inf: "להניק", translit: "Lehenik", fr: "Allaiter",
    racine: "ינק", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מניק", t: "Menik" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הניק", t: "Henik" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יניק", t: "Yanik" },
      ],
    },
  },
  {
    inf: "לטעון", translit: "Lit'on", fr: "Argumenter",
    racine: "טען", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "טוען", t: "Toen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "טען", t: "Ta'an" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יטען", t: "Yit'an" },
      ],
    },
  },
  {
    inf: "לנמק", translit: "Lenamek", fr: "Expliquer",
    racine: "נמק", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מנמק", t: "Menamek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נימק", t: "Nimek" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ינמק", t: "Yenamek" },
      ],
    },
  },
  {
    inf: "להרוס", translit: "Laharos", fr: "Détruire",
    racine: "הרס", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הורס", t: "Hores" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הרס", t: "Haras" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהרוס", t: "Yaharos" },
      ],
    },
  },
  {
    inf: "להמר", translit: "Lehamer", fr: "Parier / risquer",
    racine: "מר", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מהמר", t: "Mehamer" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "המר", t: "Himer" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימר", t: "Yamer" },
      ],
    },
  },
  {
    inf: "להתקיים", translit: "Lehitkayem", fr: "Exister",
    racine: "קים", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתקיים", t: "Mitkayem" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התקיים", t: "Hitkayem" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתקיים", t: "Yitkayem" },
      ],
    },
  },
  {
    inf: "להשתייך", translit: "Lehichtayakh", fr: "Appartenir à",
    racine: "שייך", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משתייך", t: "Mishtayekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "השתייך", t: "Hishtayekh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישתייך", t: "Yishtayekh" },
      ],
    },
  },
  {
    inf: "להתייחס", translit: "Lehityakhes", fr: "Considérer / traiter",
    racine: "יחס", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתייחס", t: "Mityakhes" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התייחס", t: "Hityakhes" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתייחס", t: "Yityakhes" },
      ],
    },
  },
  {
    inf: "להתמודד", translit: "Lehitmoded", fr: "Affronter / gérer / faire face",
    racine: "מודד", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתמודד", t: "Mitmoded" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התמודד", t: "Hitmoded" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתמודד", t: "Yitmoded" },
      ],
    },
  },
  {
    inf: "להתלונן", translit: "Lehitlonen", fr: "Se plaindre",
    racine: "לונן", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתלונן", t: "Mitlonen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התלונן", t: "Hitlonen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתלונן", t: "Yitlonen" },
      ],
    },
  },
  {
    inf: "לארגן", translit: "Le'argen", fr: "Préparer / organiser",
    racine: "ארגן", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מארגן", t: "Me'argen" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "ארגן", t: "Irgen" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יארגן", t: "Ye'argen" },
      ],
    },
  },
  {
    inf: "להפוך", translit: "Lahafokh", fr: "Devenir",
    racine: "הפך", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "הופך", t: "Hofekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הפך", t: "Hafakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יהפוך", t: "Yahafokh" },
      ],
    },
  },
  {
    inf: "להתפשר", translit: "Lehipacher", fr: "Faire des compromis",
    racine: "פשר", binyan: "התפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מתפשר", t: "Mitpacher" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "התפשר", t: "Hitpacher" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יתפשר", t: "Yitpacher" },
      ],
    },
  },
  {
    inf: "להפטר", translit: "Lehipater", fr: "Mourir / se débarasser",
    racine: "פטר", binyan: "נפעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "נפטר", t: "Niftar" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "נפטר", t: "Niftar" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "נפטר", t: "Yipater" },
      ],
    },
  },
  {
    inf: "לזרוק", translit: "Lizrok", fr: "Jeter / balancer",
    racine: "זרק", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "זורק", t: "Zorek" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "זרק", t: "Zarak" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יזרוק", t: "Yizrok" },
      ],
    },
  },
  {
    inf: "לשכנע", translit: "Lesakhnea", fr: "Convaincre",
    racine: "שכנע", binyan: "פיעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "משכנע", t: "Mesakhnea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "שכנע", t: "Sikhnea" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ישכנע", t: "Yisakhnea" },
      ],
    },
  },
  {
    inf: "לצבוע", translit: "Litsboa", fr: "Peindre",
    racine: "צבע", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "צובע", t: "Tsovea" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "צבע", t: "Tsava" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יצבע", t: "Yitseva" },
      ],
    },
  },
  {
    inf: "להקיא", translit: "Lehaki", fr: "Vomir",
    racine: "קיא", binyan: "הפעיל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מקיא", t: "Meki" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "הקיא", t: "Heki" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "יקיא", t: "Yaki" },
      ],
    },
  },
  {
    inf: "למשוך", translit: "Limchokh", fr: "Attirer",
    racine: "משך", binyan: "פעל",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מושך", t: "Mochekh" },
      ],
      "Passé": [
        { p: "il (הוא)", he: "משך", t: "Machakh" },
      ],
      "Futur": [
        { p: "il (הוא)", he: "ימשוך", t: "Yimchokh" },
      ],
    },
  },
];
