// ============================================================
//  VOTRE VOCABULAIRE — c'est ICI que vous ajoutez des mots !
// ============================================================
//  Chaque mot est une ligne { ... } avec 4 champs :
//    he     : le mot en hébreu
//    translit : la translittération (prononciation)
//    fr     : la traduction française
//             (plusieurs traductions possibles, séparées par " / ")
//    cat    : la catégorie / le thème
//
//  Pour ajouter un mot : copiez une ligne, collez-la, modifiez-la.
//  N'oubliez pas la virgule à la fin de chaque ligne !
// ============================================================

const VOCAB = [
  // --- Salutations & politesse ---
  { he: "שלום",    translit: "shalom",    fr: "bonjour / paix",        cat: "Salutations" },
  { he: "תודה",    translit: "toda",      fr: "merci",                 cat: "Salutations" },
  { he: "בבקשה",   translit: "bevakasha", fr: "s'il te plaît / de rien", cat: "Salutations" },
  { he: "סליחה",   translit: "slicha",    fr: "pardon / excuse-moi",   cat: "Salutations" },
  { he: "בוקר טוב", translit: "boker tov", fr: "bonjour (le matin)",   cat: "Salutations" },
  { he: "להתראות", translit: "lehitraot", fr: "au revoir",             cat: "Salutations" },

  // --- Mots de base ---
  { he: "כן",      translit: "ken",       fr: "oui",                   cat: "Base" },
  { he: "לא",      translit: "lo",        fr: "non",                   cat: "Base" },
  { he: "מה",      translit: "ma",        fr: "quoi / que",            cat: "Base" },
  { he: "מי",      translit: "mi",        fr: "qui",                   cat: "Base" },
  { he: "איפה",    translit: "eifo",      fr: "où",                    cat: "Base" },
  { he: "למה",     translit: "lama",      fr: "pourquoi",              cat: "Base" },

  // --- Nourriture & boissons ---
  { he: "מים",     translit: "mayim",     fr: "eau",                   cat: "Nourriture" },
  { he: "לחם",     translit: "lechem",    fr: "pain",                  cat: "Nourriture" },
  { he: "יין",     translit: "yayin",     fr: "vin",                   cat: "Nourriture" },
  { he: "חלב",     translit: "chalav",    fr: "lait",                  cat: "Nourriture" },
  { he: "קפה",     translit: "kafe",      fr: "café",                  cat: "Nourriture" },
  { he: "תה",      translit: "te",        fr: "thé",                   cat: "Nourriture" },
  { he: "פרי",     translit: "pri",       fr: "fruit",                 cat: "Nourriture" },
  { he: "ביצה",    translit: "beitsa",    fr: "œuf",                   cat: "Nourriture" },

  // --- Maison ---
  { he: "בית",     translit: "bayit",     fr: "maison",                cat: "Maison" },
  { he: "דלת",     translit: "delet",     fr: "porte",                 cat: "Maison" },
  { he: "חלון",    translit: "chalon",    fr: "fenêtre",               cat: "Maison" },
  { he: "שולחן",   translit: "shulchan",  fr: "table",                 cat: "Maison" },
  { he: "כיסא",    translit: "kise",      fr: "chaise",                cat: "Maison" },
  { he: "מיטה",    translit: "mita",      fr: "lit",                   cat: "Maison" },
  { he: "ספר",     translit: "sefer",     fr: "livre",                 cat: "Maison" },

  // --- Famille & personnes ---
  { he: "אבא",     translit: "aba",       fr: "papa",                  cat: "Famille" },
  { he: "אמא",     translit: "ima",       fr: "maman",                 cat: "Famille" },
  { he: "אח",      translit: "ach",       fr: "frère",                 cat: "Famille" },
  { he: "אחות",    translit: "achot",     fr: "sœur",                  cat: "Famille" },
  { he: "ילד",     translit: "yeled",     fr: "enfant / garçon",       cat: "Famille" },
  { he: "ילדה",    translit: "yalda",     fr: "fille",                 cat: "Famille" },
  { he: "משפחה",   translit: "mishpacha", fr: "famille",               cat: "Famille" },
  { he: "חבר",     translit: "chaver",    fr: "ami",                   cat: "Famille" },

  // --- Nombres ---
  { he: "אחת",     translit: "achat",     fr: "un / une (1)",          cat: "Nombres" },
  { he: "שתיים",   translit: "shtayim",   fr: "deux (2)",              cat: "Nombres" },
  { he: "שלוש",    translit: "shalosh",   fr: "trois (3)",             cat: "Nombres" },
  { he: "ארבע",    translit: "arba",      fr: "quatre (4)",            cat: "Nombres" },
  { he: "חמש",     translit: "chamesh",   fr: "cinq (5)",              cat: "Nombres" },

  // --- Temps ---
  { he: "יום",     translit: "yom",       fr: "jour",                  cat: "Temps" },
  { he: "לילה",    translit: "layla",     fr: "nuit",                  cat: "Temps" },
  { he: "בוקר",    translit: "boker",     fr: "matin",                 cat: "Temps" },
  { he: "ערב",     translit: "erev",      fr: "soir",                  cat: "Temps" },
  { he: "שבוע",    translit: "shavua",    fr: "semaine",               cat: "Temps" },
  { he: "שנה",     translit: "shana",     fr: "année",                 cat: "Temps" },
  { he: "היום",    translit: "hayom",     fr: "aujourd'hui",           cat: "Temps" },
  { he: "מחר",     translit: "machar",    fr: "demain",                cat: "Temps" },

  // --- Verbes ---
  { he: "ללכת",    translit: "lalechet",  fr: "aller / marcher",       cat: "Verbes" },
  { he: "לאכול",   translit: "le'echol",  fr: "manger",                cat: "Verbes" },
  { he: "לשתות",   translit: "lishtot",   fr: "boire",                 cat: "Verbes" },
  { he: "לדבר",    translit: "ledaber",   fr: "parler",                cat: "Verbes" },
  { he: "לקרוא",   translit: "likro",     fr: "lire",                  cat: "Verbes" },
  { he: "לכתוב",   translit: "lichtov",   fr: "écrire",                cat: "Verbes" },
  { he: "לישון",   translit: "lishon",    fr: "dormir",                cat: "Verbes" },
  { he: "לרצות",   translit: "lirtsot",   fr: "vouloir",               cat: "Verbes" },

  // --- Adjectifs ---
  { he: "גדול",    translit: "gadol",     fr: "grand",                 cat: "Adjectifs" },
  { he: "קטן",     translit: "katan",     fr: "petit",                 cat: "Adjectifs" },
  { he: "טוב",     translit: "tov",       fr: "bon",                   cat: "Adjectifs" },
  { he: "יפה",     translit: "yafe",      fr: "beau / joli",           cat: "Adjectifs" },
  { he: "חדש",     translit: "chadash",   fr: "nouveau",               cat: "Adjectifs" },
  { he: "חם",      translit: "cham",      fr: "chaud",                 cat: "Adjectifs" },
  { he: "קר",      translit: "kar",       fr: "froid",                 cat: "Adjectifs" },
];
