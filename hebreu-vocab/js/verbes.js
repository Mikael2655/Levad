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
// ============================================================

const VERBES = [
  {
    inf: "לכתוב", translit: "lichtov", fr: "écrire",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "כותב",   t: "kotev" },
        { p: "fém. sing. (אני/את/היא)",   he: "כותבת",  t: "kotevet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "כותבים", t: "kotvim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)",  he: "כותבות", t: "kotvot" },
      ],
      "Passé": [
        { p: "je (אני)",           he: "כתבתי",  t: "katavti" },
        { p: "tu masc. (אתה)",     he: "כתבת",   t: "katavta" },
        { p: "tu fém. (את)",       he: "כתבת",   t: "katavt" },
        { p: "il (הוא)",           he: "כתב",    t: "katav" },
        { p: "elle (היא)",         he: "כתבה",   t: "katva" },
        { p: "nous (אנחנו)",       he: "כתבנו",  t: "katavnu" },
        { p: "vous masc. (אתם)",   he: "כתבתם",  t: "ktavtem" },
        { p: "vous fém. (אתן)",    he: "כתבתן",  t: "ktavten" },
        { p: "ils / elles (הם/הן)", he: "כתבו", t: "katvu" },
      ],
      "Futur": [
        { p: "je (אני)",           he: "אכתוב",  t: "echtov" },
        { p: "tu masc. (אתה)",     he: "תכתוב",  t: "tichtov" },
        { p: "tu fém. (את)",       he: "תכתבי",  t: "tichtevi" },
        { p: "il (הוא)",           he: "יכתוב",  t: "yichtov" },
        { p: "elle (היא)",         he: "תכתוב",  t: "tichtov" },
        { p: "nous (אנחנו)",       he: "נכתוב",  t: "nichtov" },
        { p: "vous (אתם/אתן)",   he: "תכתבו",  t: "tichtevu" },
        { p: "ils / elles (הם/הן)", he: "יכתבו", t: "yichtevu" },
      ],
    },
  },

  {
    inf: "לדבר", translit: "ledaber", fr: "parler",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "מדבר",   t: "medaber" },
        { p: "fém. sing. (אני/את/היא)",   he: "מדברת",  t: "medaberet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "מדברים", t: "medabrim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)",  he: "מדברות", t: "medabrot" },
      ],
      "Passé": [
        { p: "je (אני)",           he: "דיברתי", t: "dibarti" },
        { p: "tu masc. (אתה)",     he: "דיברת",  t: "dibarta" },
        { p: "tu fém. (את)",       he: "דיברת",  t: "dibart" },
        { p: "il (הוא)",           he: "דיבר",   t: "diber" },
        { p: "elle (היא)",         he: "דיברה",  t: "dibra" },
        { p: "nous (אנחנו)",       he: "דיברנו", t: "dibarnu" },
        { p: "vous masc. (אתם)",   he: "דיברתם", t: "dibartem" },
        { p: "vous fém. (אתן)",    he: "דיברתן", t: "dibarten" },
        { p: "ils / elles (הם/הן)", he: "דיברו", t: "dibru" },
      ],
      "Futur": [
        { p: "je (אני)",           he: "אדבר",   t: "adaber" },
        { p: "tu masc. (אתה)",     he: "תדבר",   t: "tedaber" },
        { p: "tu fém. (את)",       he: "תדברי",  t: "tedabri" },
        { p: "il (הוא)",           he: "ידבר",   t: "yedaber" },
        { p: "elle (היא)",         he: "תדבר",   t: "tedaber" },
        { p: "nous (אנחנו)",       he: "נדבר",   t: "nedaber" },
        { p: "vous (אתם/אתן)",   he: "תדברו",  t: "tedabru" },
        { p: "ils / elles (הם/הן)", he: "ידברו", t: "yedabru" },
      ],
    },
  },

  {
    inf: "לאכול", translit: "le'echol", fr: "manger",
    temps: {
      "Présent": [
        { p: "masc. sing. (אני/אתה/הוא)", he: "אוכל",   t: "ochel" },
        { p: "fém. sing. (אני/את/היא)",   he: "אוכלת",  t: "ochelet" },
        { p: "masc. pluriel (אנחנו/אתם/הם)", he: "אוכלים", t: "ochlim" },
        { p: "fém. pluriel (אנחנו/אתן/הן)",  he: "אוכלות", t: "ochlot" },
      ],
      "Passé": [
        { p: "je (אני)",           he: "אכלתי",  t: "achalti" },
        { p: "tu masc. (אתה)",     he: "אכלת",   t: "achalta" },
        { p: "tu fém. (את)",       he: "אכלת",   t: "achalt" },
        { p: "il (הוא)",           he: "אכל",    t: "achal" },
        { p: "elle (היא)",         he: "אכלה",   t: "achla" },
        { p: "nous (אנחנו)",       he: "אכלנו",  t: "achalnu" },
        { p: "vous masc. (אתם)",   he: "אכלתם",  t: "achaltem" },
        { p: "vous fém. (אתן)",    he: "אכלתן",  t: "achalten" },
        { p: "ils / elles (הם/הן)", he: "אכלו", t: "achlu" },
      ],
      "Futur": [
        { p: "je (אני)",           he: "אוכל",   t: "ochal" },
        { p: "tu masc. (אתה)",     he: "תאכל",   t: "tochal" },
        { p: "tu fém. (את)",       he: "תאכלי",  t: "tochli" },
        { p: "il (הוא)",           he: "יאכל",   t: "yochal" },
        { p: "elle (היא)",         he: "תאכל",   t: "tochal" },
        { p: "nous (אנחנו)",       he: "נאכל",   t: "nochal" },
        { p: "vous (אתם/אתן)",   he: "תאכלו",  t: "tochlu" },
        { p: "ils / elles (הם/הן)", he: "יאכלו", t: "yochlu" },
      ],
    },
  },
];
