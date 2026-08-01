import type { SubjectDef } from "./types";

/**
 * The "Know" shelf: subjects you pick up rather than study — general knowledge,
 * oddities, and the myth cycles.
 *
 * Mythology is shelved here on purpose. The Greek and Egyptian subjects treat
 * the stories as stories; the historical record lives in History, in the
 * `ancient-egypt` and `ancient-rome` collections.
 */
export const KNOW: SubjectDef[] = [
  {
    slug: "general-knowledge",
    section: "know",
    theme: "general",
    names: {
      en: "General Knowledge",
      fr: "Culture générale",
      ar: "معلومات عامة",
    },
    descriptions: {
      en: "A little of everything, in no particular order.",
      fr: "Un peu de tout, sans ordre particulier.",
      ar: "قليل من كل شيء، بلا ترتيب معيّن.",
    },
    collections: [
      {
        slug: "gk-science",
        names: { en: "Science", fr: "Sciences", ar: "العلوم" },
        descriptions: {
          en: "The parts that escaped the classroom.",
          fr: "Ce qui a survécu à l'école.",
          ar: "ما بقي في الذاكرة بعد المدرسة.",
        },
      },
      {
        slug: "gk-history",
        names: { en: "History", fr: "Histoire", ar: "التاريخ" },
      },
      {
        slug: "gk-geography",
        names: { en: "Geography", fr: "Géographie", ar: "الجغرافيا" },
      },
      {
        slug: "gk-art",
        names: { en: "Art", fr: "Art", ar: "الفنون" },
        descriptions: {
          en: "Painters, movements and the works you half-remember.",
          fr: "Peintres, mouvements et œuvres à moitié retenues.",
          ar: "رسّامون ومدارس وأعمال نتذكرها نصف تذكّر.",
        },
      },
      {
        slug: "gk-language",
        names: { en: "Language", fr: "Langue", ar: "اللغة" },
        descriptions: {
          en: "Words, origins and borrowed spellings.",
          fr: "Mots, origines et orthographes empruntées.",
          ar: "كلمات وأصول وهجاء مستعار.",
        },
      },
      {
        slug: "gk-culture",
        names: { en: "Culture", fr: "Culture", ar: "الثقافة" },
      },
      {
        slug: "gk-inventions",
        names: { en: "Inventions", fr: "Inventions", ar: "الاختراعات" },
        descriptions: {
          en: "Who built what, and roughly when.",
          fr: "Qui a fabriqué quoi, et à peu près quand.",
          ar: "من صنع ماذا، ومتى تقريبًا.",
        },
      },
      {
        slug: "gk-food",
        names: { en: "Food", fr: "Cuisine", ar: "الطعام" },
      },
      {
        slug: "gk-famous-people",
        names: { en: "Famous people", fr: "Personnalités célèbres", ar: "شخصيات مشهورة" },
      },
      {
        slug: "gk-nature",
        names: { en: "Nature", fr: "Nature", ar: "الطبيعة" },
      },
      {
        slug: "gk-sports",
        names: { en: "Sports", fr: "Sport", ar: "الرياضة" },
      },
      {
        slug: "gk-entertainment",
        names: { en: "Entertainment", fr: "Divertissement", ar: "الترفيه" },
      },
    ],
  },

  {
    slug: "fun-facts",
    section: "know",
    theme: "funfacts",
    names: { en: "Fun Facts", fr: "Faits insolites", ar: "طرائف ومعارف" },
    descriptions: {
      en: "The pleasantly useless end of knowing things.",
      fr: "Le versant agréablement inutile du savoir.",
      ar: "الجانب الممتع غير النافع من المعرفة.",
    },
    collections: [
      {
        slug: "weird-animal-facts",
        names: {
          en: "Weird animal facts",
          fr: "Curiosités animales",
          ar: "طرائف عن الحيوانات",
        },
      },
      {
        slug: "strange-laws",
        names: {
          en: "Strange laws throughout history",
          fr: "Lois étranges à travers l'histoire",
          ar: "قوانين غريبة عبر التاريخ",
        },
        descriptions: {
          en: "Rules that once made sense to somebody.",
          fr: "Des règles qui ont eu du sens pour quelqu'un.",
          ar: "قواعد كانت منطقية عند أحدهم يومًا.",
        },
      },
      {
        slug: "unusual-inventions",
        names: {
          en: "Unusual inventions",
          fr: "Inventions insolites",
          ar: "اختراعات غير مألوفة",
        },
      },
      {
        slug: "accidental-discoveries",
        names: {
          en: "Accidental discoveries",
          fr: "Découvertes accidentelles",
          ar: "اكتشافات بالمصادفة",
        },
        descriptions: {
          en: "Found while looking for something else.",
          fr: "Trouvé en cherchant autre chose.",
          ar: "وُجدت أثناء البحث عن شيء آخر.",
        },
      },
      {
        slug: "bizarre-historical-events",
        names: {
          en: "Bizarre historical events",
          fr: "Événements historiques loufoques",
          ar: "أحداث تاريخية عجيبة",
        },
      },
      {
        slug: "space-facts",
        names: { en: "Space facts", fr: "L'espace en bref", ar: "طرائف الفضاء" },
      },
      {
        slug: "human-body-facts",
        names: {
          en: "Human body facts",
          fr: "Le corps humain en bref",
          ar: "طرائف عن جسم الإنسان",
        },
      },
      {
        slug: "food-origins",
        names: {
          en: "Food origins",
          fr: "Origines des aliments",
          ar: "أصول الأطعمة",
        },
        descriptions: {
          en: "Where dishes and ingredients came from.",
          fr: "D'où viennent plats et ingrédients.",
          ar: "من أين جاءت الأطباق والمكوّنات.",
        },
      },
      {
        slug: "world-records",
        names: { en: "World records", fr: "Records du monde", ar: "الأرقام القياسية" },
      },
      {
        slug: "true-but-unbelievable",
        names: {
          en: "Things that sound false but are true",
          fr: "Ce qui semble faux et ne l'est pas",
          ar: "أمور تبدو كاذبة وهي صحيحة",
        },
        descriptions: {
          en: "Checked twice, still true.",
          fr: "Vérifié deux fois, toujours vrai.",
          ar: "تحققنا مرتين، وما زالت صحيحة.",
        },
      },
    ],
  },

  {
    slug: "mythology",
    section: "know",
    theme: "mythology",
    names: { en: "Mythology", fr: "Mythologie", ar: "الأساطير" },
    descriptions: {
      en: "The stories cultures told to explain themselves — the general shelf, with Greek and Egyptian kept separately.",
      fr: "Les récits par lesquels les cultures s'expliquent — l'étagère générale, le grec et l'égyptien à part.",
      ar: "الحكايات التي فسّرت بها الثقافات نفسها — الرفّ العام، واليوناني والمصري في موضعهما الخاص.",
    },
    collections: [
      {
        slug: "creation-myths",
        names: {
          en: "World creation myths",
          fr: "Mythes de la création",
          ar: "أساطير خلق العالم",
        },
        descriptions: {
          en: "How things began, told many ways.",
          fr: "Comment tout a commencé, en plusieurs versions.",
          ar: "كيف بدأ كل شيء، بروايات متعددة.",
        },
      },
      {
        slug: "tricksters",
        names: { en: "Tricksters", fr: "Filous et fripons", ar: "المخاتلون في الأساطير" },
        descriptions: {
          en: "The figures who break the rules on purpose.",
          fr: "Ceux qui enfreignent les règles exprès.",
          ar: "من يخرقون القواعد بقصد.",
        },
      },
      {
        slug: "mythical-creatures",
        names: {
          en: "Mythical creatures",
          fr: "Créatures mythiques",
          ar: "مخلوقات أسطورية",
        },
      },
      {
        slug: "norse-mythology",
        names: {
          en: "Norse mythology",
          fr: "Mythologie nordique",
          ar: "الأساطير الإسكندنافية",
        },
      },
      {
        slug: "mesopotamian-mythology",
        names: {
          en: "Mesopotamian mythology",
          fr: "Mythologie mésopotamienne",
          ar: "أساطير بلاد الرافدين",
        },
      },
      {
        slug: "comparative-mythology",
        names: {
          en: "Comparative mythology",
          fr: "Mythologie comparée",
          ar: "الأساطير المقارنة",
        },
        descriptions: {
          en: "The same story, in different hands.",
          fr: "La même histoire, en d'autres mains.",
          ar: "الحكاية نفسها بأيدٍ مختلفة.",
        },
      },
    ],
  },

  {
    slug: "greek-mythology",
    section: "know",
    theme: "greek",
    names: {
      en: "Greek Mythology",
      fr: "Mythologie grecque",
      ar: "الأساطير اليونانية",
    },
    descriptions: {
      en: "Olympus, its households and its long list of grudges.",
      fr: "L'Olympe, ses maisonnées et sa longue liste de rancunes.",
      ar: "الأوليمب وبيوته وقائمته الطويلة من الأحقاد.",
    },
    collections: [
      {
        slug: "olympian-gods",
        names: { en: "The Olympian gods", fr: "Les dieux olympiens", ar: "آلهة الأوليمب" },
        descriptions: {
          en: "The twelve, and their portfolios.",
          fr: "Les douze, et leurs attributions.",
          ar: "الاثنا عشر ومجال كل منهم.",
        },
      },
      {
        slug: "greek-heroes",
        names: { en: "Heroes", fr: "Héros", ar: "الأبطال" },
      },
      {
        slug: "greek-monsters",
        names: { en: "Monsters", fr: "Monstres", ar: "الوحوش" },
      },
      {
        slug: "trojan-war",
        names: { en: "The Trojan War", fr: "La guerre de Troie", ar: "حرب طروادة" },
      },
      {
        slug: "the-odyssey",
        names: { en: "The Odyssey", fr: "L'Odyssée", ar: "الأوديسة" },
        descriptions: {
          en: "Ten years of not getting home.",
          fr: "Dix ans à ne pas rentrer.",
          ar: "عشر سنوات من تعذّر العودة.",
        },
      },
      {
        slug: "the-iliad",
        names: { en: "The Iliad", fr: "L'Iliade", ar: "الإلياذة" },
      },
      {
        slug: "greek-mythical-places",
        names: {
          en: "Mythological places",
          fr: "Lieux mythologiques",
          ar: "أماكن أسطورية",
        },
      },
      {
        slug: "divine-family-trees",
        names: {
          en: "Divine family trees",
          fr: "Généalogies divines",
          ar: "أنساب الآلهة",
        },
        descriptions: {
          en: "Who begat whom, and how awkwardly.",
          fr: "Qui engendre qui, et avec quelle gêne.",
          ar: "من أنجب من، وبأي إحراج.",
        },
      },
      {
        slug: "famous-greek-myths",
        names: { en: "Famous myths", fr: "Mythes célèbres", ar: "أساطير شهيرة" },
      },
      {
        slug: "greek-symbols-and-sacred-animals",
        names: {
          en: "Symbols and sacred animals",
          fr: "Symboles et animaux sacrés",
          ar: "الرموز والحيوانات المقدسة",
        },
      },
    ],
  },

  {
    slug: "egyptian-mythology",
    section: "know",
    theme: "egyptian",
    names: {
      en: "Egyptian Mythology",
      fr: "Mythologie égyptienne",
      ar: "الأساطير المصرية",
    },
    descriptions: {
      en: "Gods, the afterlife and the cosmology of the Nile. This subject is the mythology; the historical record of dynasties and excavations is kept apart, in the Ancient Egypt collection under History.",
      fr: "Les dieux, l'au-delà et la cosmologie du Nil. Ici la mythologie ; l'histoire des dynasties et des fouilles reste à part, dans la collection Égypte antique sous Histoire.",
      ar: "الآلهة والعالم الآخر وتصوّر الكون عند أهل النيل. هذا الموضوع أسطوري؛ أما تاريخ السلالات والحفائر فله موضعه المنفصل في مجموعة مصر القديمة تحت التاريخ.",
    },
    collections: [
      {
        slug: "egyptian-gods",
        names: {
          en: "Gods and goddesses",
          fr: "Dieux et déesses",
          ar: "الآلهة والربّات",
        },
      },
      {
        slug: "egyptian-creation-myths",
        names: {
          en: "Creation myths",
          fr: "Mythes de la création égyptiens",
          ar: "أساطير الخلق",
        },
        descriptions: {
          en: "Several beginnings, all official.",
          fr: "Plusieurs commencements, tous officiels.",
          ar: "بدايات عدة، كلها معتمدة.",
        },
      },
      {
        slug: "egyptian-afterlife",
        names: { en: "The afterlife", fr: "L'au-delà", ar: "العالم الآخر" },
      },
      {
        slug: "book-of-the-dead",
        names: {
          en: "The Book of the Dead",
          fr: "Le Livre des morts",
          ar: "كتاب الموتى",
        },
        descriptions: {
          en: "Spells packed for the journey.",
          fr: "Des formules emportées pour le voyage.",
          ar: "تعاويذ تُحمل للرحلة.",
        },
      },
      {
        slug: "egyptian-sacred-animals",
        names: { en: "Sacred animals", fr: "Animaux sacrés", ar: "الحيوانات المقدسة" },
      },
      {
        slug: "egyptian-temples",
        names: { en: "Temples", fr: "Temples", ar: "المعابد" },
      },
      {
        slug: "egyptian-symbols",
        names: {
          en: "Mythological symbols",
          fr: "Symboles mythologiques",
          ar: "الرموز الأسطورية",
        },
      },
      {
        slug: "osiris-and-isis",
        names: { en: "Osiris and Isis", fr: "Osiris et Isis", ar: "أوزيريس وإيزيس" },
      },
      {
        slug: "ra",
        names: { en: "Ra", fr: "Rê", ar: "رع" },
      },
      {
        slug: "anubis",
        names: { en: "Anubis", fr: "Anubis", ar: "أنوبيس" },
      },
      {
        slug: "horus",
        names: { en: "Horus", fr: "Horus", ar: "حورس" },
      },
      {
        slug: "maat",
        names: { en: "Ma'at", fr: "Maât", ar: "ماعت" },
        descriptions: {
          en: "Order, balance and the weighing of the heart.",
          fr: "L'ordre, l'équilibre et la pesée du cœur.",
          ar: "النظام والتوازن ووزن القلب.",
        },
      },
    ],
  },
];
