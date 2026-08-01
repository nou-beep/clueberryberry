import type { SubjectDef } from "./types";

/**
 * The "Learn" shelf: subjects with a syllabus behind them.
 *
 * Slugs for biology, psychology, chemistry, history and their original
 * collections are preserved from the first library so the hand-authored
 * puzzles keep resolving.
 */
export const LEARN: SubjectDef[] = [
  {
    slug: "biology",
    section: "learn",
    theme: "biology",
    names: { en: "Biology", fr: "Biologie", ar: "علم الأحياء" },
    descriptions: {
      en: "Life, from organelles to ecosystems.",
      fr: "La vie, de l'organite à l'écosystème.",
      ar: "الحياة، من العضيّات إلى الأنظمة البيئية.",
    },
    collections: [
      {
        slug: "human-anatomy",
        names: { en: "Human anatomy", fr: "Anatomie humaine", ar: "تشريح الإنسان" },
        descriptions: {
          en: "The body, part by part.",
          fr: "Le corps, pièce par pièce.",
          ar: "الجسم، عضوًا عضوًا.",
        },
      },
      {
        slug: "the-cell",
        names: { en: "The human cell", fr: "La cellule", ar: "الخلية" },
        descriptions: {
          en: "Machinery of the smallest unit of life.",
          fr: "La mécanique de la plus petite unité du vivant.",
          ar: "آلية أصغر وحدة في الحياة.",
        },
      },
      {
        slug: "genetics",
        names: { en: "Genetics", fr: "Génétique", ar: "الوراثة" },
        descriptions: {
          en: "Inheritance, code and copies.",
          fr: "Hérédité, code et copies.",
          ar: "التوريث والشيفرة والنسخ.",
        },
      },
      {
        slug: "neuroscience",
        names: { en: "Neuroscience", fr: "Neurosciences", ar: "علم الأعصاب" },
        descriptions: {
          en: "Wiring, signals and gray matter.",
          fr: "Câblage, signaux et matière grise.",
          ar: "توصيلات وإشارات ومادة رمادية.",
        },
      },
      {
        slug: "ecology",
        names: { en: "Ecology", fr: "Écologie", ar: "علم البيئة" },
        descriptions: {
          en: "Who eats whom, and where.",
          fr: "Qui mange qui, et où.",
          ar: "من يأكل من، وأين.",
        },
      },
      {
        slug: "marine-biology",
        names: { en: "Marine biology", fr: "Biologie marine", ar: "الأحياء البحرية" },
        descriptions: {
          en: "Life below the surface.",
          fr: "La vie sous la surface.",
          ar: "الحياة تحت السطح.",
        },
      },
      {
        slug: "microbiology",
        names: { en: "Microbiology", fr: "Microbiologie", ar: "علم الأحياء الدقيقة" },
        descriptions: {
          en: "The very small and very numerous.",
          fr: "Le très petit et très nombreux.",
          ar: "الصغير جدًا والكثير جدًا.",
        },
      },
      {
        slug: "plants",
        names: { en: "Plants", fr: "Plantes", ar: "النباتات" },
        descriptions: {
          en: "Roots, leaves and quiet chemistry.",
          fr: "Racines, feuilles et chimie discrète.",
          ar: "جذور وأوراق وكيمياء هادئة.",
        },
      },
      {
        slug: "evolution",
        names: { en: "Evolution", fr: "Évolution", ar: "التطوّر" },
        descriptions: {
          en: "Descent, drift and selection.",
          fr: "Descendance, dérive et sélection.",
          ar: "النسل والانتقاء والانحراف.",
        },
      },
      {
        slug: "strange-animals",
        names: { en: "Strange animals", fr: "Animaux étranges", ar: "حيوانات غريبة" },
        descriptions: {
          en: "The improbable end of the family tree.",
          fr: "La branche la plus improbable de l'arbre.",
          ar: "الطرف الأكثر غرابة في شجرة الحياة.",
        },
      },
      {
        slug: "diseases-and-immunity",
        names: {
          en: "Diseases and immunity",
          fr: "Maladies et immunité",
          ar: "الأمراض والمناعة",
        },
        descriptions: {
          en: "Pathogens, defences and vaccines.",
          fr: "Agents pathogènes, défenses et vaccins.",
          ar: "مسبّبات المرض والدفاعات واللقاحات.",
        },
      },
    ],
  },

  {
    slug: "psychology",
    section: "learn",
    theme: "psychology",
    names: { en: "Psychology", fr: "Psychologie", ar: "علم النفس" },
    descriptions: {
      en: "Mind, memory and the tricks they play.",
      fr: "L'esprit, la mémoire et leurs tours.",
      ar: "العقل والذاكرة وحيلهما.",
    },
    collections: [
      {
        slug: "memory",
        names: { en: "Memory", fr: "Mémoire", ar: "الذاكرة" },
        descriptions: {
          en: "What sticks, what slips, and why.",
          fr: "Ce qui reste, ce qui file, et pourquoi.",
          ar: "ما يبقى وما يفلت، ولماذا.",
        },
      },
      {
        slug: "personality",
        names: { en: "Personality", fr: "Personnalité", ar: "الشخصية" },
        descriptions: {
          en: "Traits, types and the tests behind them.",
          fr: "Traits, types et tests qui les mesurent.",
          ar: "السمات والأنماط والاختبارات وراءها.",
        },
      },
      {
        slug: "cognitive-biases",
        names: { en: "Cognitive biases", fr: "Biais cognitifs", ar: "التحيّزات المعرفية" },
        descriptions: {
          en: "Where thinking cuts corners.",
          fr: "Là où la pensée coupe les virages.",
          ar: "حيث يختصر التفكير الطريق.",
        },
      },
      {
        slug: "social-psychology",
        names: { en: "Social psychology", fr: "Psychologie sociale", ar: "علم النفس الاجتماعي" },
        descriptions: {
          en: "How other people change us.",
          fr: "Comment les autres nous changent.",
          ar: "كيف يغيّرنا الآخرون.",
        },
      },
      {
        slug: "psychopathology",
        names: { en: "Psychopathology", fr: "Psychopathologie", ar: "علم النفس المرضي" },
        descriptions: {
          en: "Diagnosis, symptoms and history.",
          fr: "Diagnostic, symptômes et histoire.",
          ar: "التشخيص والأعراض والتاريخ.",
        },
      },
      {
        slug: "therapy",
        names: { en: "Therapy", fr: "Thérapies", ar: "العلاج النفسي" },
        descriptions: {
          en: "Schools, methods and their founders.",
          fr: "Écoles, méthodes et fondateurs.",
          ar: "المدارس والأساليب ومؤسسوها.",
        },
      },
      {
        slug: "famous-experiments",
        names: { en: "Famous experiments", fr: "Expériences célèbres", ar: "تجارب شهيرة" },
        descriptions: {
          en: "The studies everyone cites.",
          fr: "Les études que tout le monde cite.",
          ar: "الدراسات التي يستشهد بها الجميع.",
        },
      },
      {
        slug: "criminal-psychology",
        names: {
          en: "Criminal psychology",
          fr: "Psychologie criminelle",
          ar: "علم النفس الجنائي",
        },
        descriptions: {
          en: "Motive, profiling and evidence.",
          fr: "Mobile, profilage et preuves.",
          ar: "الدافع والتوصيف والأدلة.",
        },
      },
      {
        slug: "emotions",
        names: { en: "Emotions", fr: "Émotions", ar: "الانفعالات" },
        descriptions: {
          en: "Feelings, and the theories about them.",
          fr: "Les affects et les théories qui les expliquent.",
          ar: "المشاعر والنظريات التي تفسّرها.",
        },
      },
      {
        slug: "developmental-psychology",
        names: {
          en: "Developmental psychology",
          fr: "Psychologie du développement",
          ar: "علم نفس النمو",
        },
        descriptions: {
          en: "Growing up, stage by stage.",
          fr: "Grandir, étape par étape.",
          ar: "النمو، مرحلةً مرحلة.",
        },
      },
    ],
  },

  {
    slug: "chemistry",
    section: "learn",
    theme: "chemistry",
    names: { en: "Chemistry", fr: "Chimie", ar: "الكيمياء" },
    descriptions: {
      en: "Elements, reactions and everyday alchemy.",
      fr: "Éléments, réactions et alchimie du quotidien.",
      ar: "العناصر والتفاعلات وكيمياء الحياة اليومية.",
    },
    collections: [
      {
        slug: "periodic-table",
        names: { en: "Periodic table", fr: "Tableau périodique", ar: "الجدول الدوري" },
        descriptions: {
          en: "The elements, in rows and columns.",
          fr: "Les éléments, en lignes et en colonnes.",
          ar: "العناصر في صفوف وأعمدة.",
        },
      },
      {
        slug: "chemical-elements",
        names: { en: "Chemical elements", fr: "Éléments chimiques", ar: "العناصر الكيميائية" },
        descriptions: {
          en: "Symbols, names and where they turn up.",
          fr: "Symboles, noms et usages.",
          ar: "الرموز والأسماء وأين تظهر.",
        },
      },
      {
        slug: "laboratory-equipment",
        names: { en: "Laboratory equipment", fr: "Matériel de laboratoire", ar: "أدوات المختبر" },
        descriptions: {
          en: "Glassware and the rest of the bench.",
          fr: "Verrerie et reste de la paillasse.",
          ar: "الزجاجيات وبقية الطاولة.",
        },
      },
      {
        slug: "organic-chemistry",
        names: { en: "Organic chemistry", fr: "Chimie organique", ar: "الكيمياء العضوية" },
        descriptions: {
          en: "Carbon and its many arrangements.",
          fr: "Le carbone et ses arrangements.",
          ar: "الكربون وترتيباته الكثيرة.",
        },
      },
      {
        slug: "acids-and-bases",
        names: { en: "Acids and bases", fr: "Acides et bases", ar: "الحموض والقواعد" },
        descriptions: {
          en: "pH, salts and neutralisation.",
          fr: "pH, sels et neutralisation.",
          ar: "الأس الهيدروجيني والأملاح والتعادل.",
        },
      },
      {
        slug: "chemical-reactions",
        names: { en: "Chemical reactions", fr: "Réactions chimiques", ar: "التفاعلات الكيميائية" },
        descriptions: {
          en: "What happens when things combine.",
          fr: "Ce qui arrive quand les choses se combinent.",
          ar: "ما يحدث عند اتحاد المواد.",
        },
      },
      {
        slug: "famous-chemists",
        names: { en: "Famous chemists", fr: "Chimistes célèbres", ar: "كيميائيون مشهورون" },
        descriptions: {
          en: "The names on the laws.",
          fr: "Les noms derrière les lois.",
          ar: "الأسماء وراء القوانين.",
        },
      },
      {
        slug: "everyday-chemistry",
        names: {
          en: "Everyday chemistry",
          fr: "Chimie du quotidien",
          ar: "كيمياء الحياة اليومية",
        },
        descriptions: {
          en: "Reactions in kitchens and cupboards.",
          fr: "Réactions de cuisine et de placard.",
          ar: "تفاعلات المطبخ والخزانة.",
        },
      },
    ],
  },

  {
    slug: "geology",
    section: "learn",
    theme: "geology",
    names: { en: "Geology", fr: "Géologie", ar: "علم الأرض" },
    descriptions: {
      en: "Rock, pressure and very long time.",
      fr: "Roche, pression et temps très long.",
      ar: "الصخر والضغط والزمن الطويل جدًا.",
    },
    collections: [
      {
        slug: "rocks-and-minerals",
        names: { en: "Rocks and minerals", fr: "Roches et minéraux", ar: "الصخور والمعادن" },
        descriptions: {
          en: "Igneous, sedimentary, metamorphic.",
          fr: "Magmatiques, sédimentaires, métamorphiques.",
          ar: "ناريّة ورسوبيّة ومتحوّلة.",
        },
      },
      {
        slug: "volcanoes",
        names: { en: "Volcanoes", fr: "Volcans", ar: "البراكين" },
        descriptions: {
          en: "Vents, lava and famous eruptions.",
          fr: "Cheminées, lave et éruptions célèbres.",
          ar: "الفتحات والحمم والانفجارات الشهيرة.",
        },
      },
      {
        slug: "earthquakes",
        names: { en: "Earthquakes", fr: "Séismes", ar: "الزلازل" },
        descriptions: {
          en: "Faults, waves and magnitude.",
          fr: "Failles, ondes et magnitude.",
          ar: "الصدوع والأمواج والمقدار.",
        },
      },
      {
        slug: "fossils",
        names: { en: "Fossils", fr: "Fossiles", ar: "الأحافير" },
        descriptions: {
          en: "How the past gets preserved.",
          fr: "Comment le passé se conserve.",
          ar: "كيف يُحفظ الماضي.",
        },
      },
      {
        slug: "dinosaurs-and-prehistoric-life",
        names: {
          en: "Dinosaurs and prehistoric life",
          fr: "Dinosaures et vie préhistorique",
          ar: "الديناصورات والحياة ما قبل التاريخ",
        },
        descriptions: {
          en: "The long age before us.",
          fr: "Le long âge avant nous.",
          ar: "العصر الطويل الذي سبقنا.",
        },
      },
      {
        slug: "plate-tectonics",
        names: { en: "Plate tectonics", fr: "Tectonique des plaques", ar: "تكتونية الصفائح" },
        descriptions: {
          en: "Continents on the move.",
          fr: "Des continents en mouvement.",
          ar: "قارات تتحرك.",
        },
      },
      {
        slug: "earths-layers",
        names: { en: "Earth's layers", fr: "Couches de la Terre", ar: "طبقات الأرض" },
        descriptions: {
          en: "Crust to core.",
          fr: "De la croûte au noyau.",
          ar: "من القشرة إلى النواة.",
        },
      },
      {
        slug: "caves",
        names: { en: "Caves", fr: "Grottes", ar: "الكهوف" },
        descriptions: {
          en: "Karst, stalactites and the dark.",
          fr: "Karst, stalactites et obscurité.",
          ar: "الكارست والهوابط والعتمة.",
        },
      },
      {
        slug: "gemstones",
        names: { en: "Gemstones", fr: "Pierres précieuses", ar: "الأحجار الكريمة" },
        descriptions: {
          en: "Cut, carat and colour.",
          fr: "Taille, carat et couleur.",
          ar: "القطع والقيراط واللون.",
        },
      },
      {
        slug: "geological-eras",
        names: { en: "Geological eras", fr: "Ères géologiques", ar: "العصور الجيولوجية" },
        descriptions: {
          en: "The calendar of deep time.",
          fr: "Le calendrier des temps profonds.",
          ar: "تقويم الزمن السحيق.",
        },
      },
    ],
  },

  {
    slug: "geography",
    section: "learn",
    theme: "geography",
    names: { en: "Geography", fr: "Géographie", ar: "الجغرافيا" },
    descriptions: {
      en: "Places, and how they fit together.",
      fr: "Les lieux, et comment ils s'assemblent.",
      ar: "الأماكن، وكيف تتجاور.",
    },
    collections: [
      {
        slug: "countries",
        names: { en: "Countries", fr: "Pays", ar: "الدول" },
      },
      {
        slug: "capital-cities",
        names: { en: "Capital cities", fr: "Capitales", ar: "العواصم" },
      },
      {
        slug: "flags",
        names: { en: "Flags", fr: "Drapeaux", ar: "الأعلام" },
      },
      {
        slug: "rivers",
        names: { en: "Rivers", fr: "Fleuves et rivières", ar: "الأنهار" },
      },
      {
        slug: "mountains",
        names: { en: "Mountains", fr: "Montagnes", ar: "الجبال" },
      },
      {
        slug: "islands",
        names: { en: "Islands", fr: "Îles", ar: "الجزر" },
      },
      {
        slug: "world-landmarks",
        names: { en: "World landmarks", fr: "Monuments du monde", ar: "معالم العالم" },
      },
      {
        slug: "african-geography",
        names: { en: "African geography", fr: "Géographie de l'Afrique", ar: "جغرافيا أفريقيا" },
      },
      {
        slug: "european-geography",
        names: { en: "European geography", fr: "Géographie de l'Europe", ar: "جغرافيا أوروبا" },
      },
      {
        slug: "arab-world-geography",
        names: {
          en: "Arab world geography",
          fr: "Géographie du monde arabe",
          ar: "جغرافيا العالم العربي",
        },
      },
      {
        slug: "maps-and-borders",
        names: { en: "Maps and borders", fr: "Cartes et frontières", ar: "الخرائط والحدود" },
      },
    ],
  },

  {
    slug: "finance-facts",
    section: "learn",
    theme: "finance",
    names: { en: "Finance Facts", fr: "Finance en bref", ar: "طرائف المال" },
    descriptions: {
      en: "Money, markets and the stories behind them. Facts, never advice.",
      fr: "L'argent, les marchés et leurs histoires. Des faits, jamais des conseils.",
      ar: "المال والأسواق وحكاياتها. معلومات لا نصائح.",
    },
    collections: [
      {
        slug: "money-vocabulary",
        names: { en: "Money vocabulary", fr: "Vocabulaire de l'argent", ar: "مفردات المال" },
      },
      {
        slug: "banking",
        names: { en: "Banking", fr: "Banque", ar: "المصارف" },
      },
      {
        slug: "investing-basics",
        names: {
          en: "Investing basics",
          fr: "Bases de l'investissement",
          ar: "أساسيات الاستثمار",
        },
      },
      {
        slug: "stock-market-history",
        names: {
          en: "Stock market history",
          fr: "Histoire des bourses",
          ar: "تاريخ أسواق الأسهم",
        },
      },
      {
        slug: "famous-companies",
        names: { en: "Famous companies", fr: "Entreprises célèbres", ar: "شركات شهيرة" },
      },
      {
        slug: "currencies",
        names: { en: "Currencies", fr: "Monnaies", ar: "العملات" },
      },
      {
        slug: "financial-scandals",
        names: { en: "Financial scandals", fr: "Scandales financiers", ar: "فضائح مالية" },
      },
      {
        slug: "economic-crises",
        names: { en: "Economic crises", fr: "Crises économiques", ar: "الأزمات الاقتصادية" },
      },
      {
        slug: "business-terminology",
        names: {
          en: "Business terminology",
          fr: "Vocabulaire des affaires",
          ar: "مصطلحات الأعمال",
        },
      },
      {
        slug: "personal-finance",
        names: { en: "Personal finance", fr: "Finances personnelles", ar: "المال الشخصي" },
      },
      {
        slug: "strange-money-facts",
        names: {
          en: "Strange money facts",
          fr: "Faits monétaires insolites",
          ar: "طرائف نقدية",
        },
      },
      {
        slug: "entrepreneurs",
        names: {
          en: "Billionaires and entrepreneurs",
          fr: "Milliardaires et entrepreneurs",
          ar: "أثرياء ورياديّون",
        },
      },
    ],
  },

  {
    slug: "geopolitics",
    section: "learn",
    theme: "geopolitics",
    names: { en: "Geopolitics", fr: "Géopolitique", ar: "الجغرافيا السياسية" },
    descriptions: {
      en: "Institutions, treaties and borders — sourced and dated, never taking sides.",
      fr: "Institutions, traités et frontières — sourcés et datés, sans prendre parti.",
      ar: "مؤسسات ومعاهدات وحدود — بمصادر وتواريخ، دون انحياز.",
    },
    collections: [
      {
        slug: "international-organizations",
        names: {
          en: "International organizations",
          fr: "Organisations internationales",
          ar: "المنظمات الدولية",
        },
      },
      {
        slug: "borders-and-disputed-territories",
        names: {
          en: "Borders and disputed territories",
          fr: "Frontières et territoires disputés",
          ar: "الحدود والأقاليم المتنازع عليها",
        },
        descriptions: {
          en: "Written neutrally: clues describe positions, they do not settle them.",
          fr: "Rédigé de façon neutre : les définitions décrivent des positions, elles ne les tranchent pas.",
          ar: "مكتوبة بحياد: التعريفات تصف المواقف ولا تحكم بينها.",
        },
      },
      {
        slug: "diplomacy",
        names: { en: "Diplomacy", fr: "Diplomatie", ar: "الدبلوماسية" },
      },
      {
        slug: "political-geography",
        names: {
          en: "Political geography",
          fr: "Géographie politique",
          ar: "الجغرافيا السياسية",
        },
      },
      {
        slug: "treaties",
        names: { en: "Treaties", fr: "Traités", ar: "المعاهدات" },
      },
      {
        slug: "global-alliances",
        names: { en: "Global alliances", fr: "Alliances mondiales", ar: "التحالفات العالمية" },
      },
      {
        slug: "historic-political-conflicts",
        names: {
          en: "Historic political conflicts",
          fr: "Conflits politiques historiques",
          ar: "صراعات سياسية تاريخية",
        },
      },
      {
        slug: "united-nations",
        names: { en: "The United Nations", fr: "Les Nations unies", ar: "الأمم المتحدة" },
      },
      {
        slug: "nato",
        names: { en: "NATO", fr: "L'OTAN", ar: "حلف الناتو" },
      },
      {
        slug: "european-union",
        names: { en: "The European Union", fr: "L'Union européenne", ar: "الاتحاد الأوروبي" },
      },
      {
        slug: "african-union",
        names: { en: "The African Union", fr: "L'Union africaine", ar: "الاتحاد الأفريقي" },
      },
      {
        slug: "major-world-powers",
        names: {
          en: "Major world powers",
          fr: "Grandes puissances",
          ar: "القوى العالمية الكبرى",
        },
      },
    ],
  },

  {
    slug: "history",
    section: "learn",
    theme: "history",
    names: { en: "History", fr: "Histoire", ar: "التاريخ" },
    descriptions: {
      en: "Dates, dynasties and documents.",
      fr: "Dates, dynasties et documents.",
      ar: "تواريخ وسلالات ووثائق.",
    },
    collections: [
      {
        slug: "ancient-egypt",
        names: { en: "Ancient Egypt", fr: "Égypte antique", ar: "مصر القديمة" },
        descriptions: {
          en: "Pharaohs, papyri and pyramids — the history, not the myths.",
          fr: "Pharaons, papyrus et pyramides — l'histoire, pas les mythes.",
          ar: "فراعنة وبرديات وأهرام — التاريخ لا الأساطير.",
        },
      },
      {
        slug: "ancient-rome",
        names: { en: "Ancient Rome", fr: "Rome antique", ar: "روما القديمة" },
      },
      {
        slug: "medieval-history",
        names: { en: "Medieval history", fr: "Moyen Âge", ar: "العصور الوسطى" },
      },
      {
        slug: "moroccan-history",
        names: { en: "Moroccan history", fr: "Histoire du Maroc", ar: "تاريخ المغرب" },
        descriptions: {
          en: "Dynasties and cities of the far west.",
          fr: "Dynasties et cités de l'extrême occident.",
          ar: "سلالات ومدن المغرب الأقصى.",
        },
      },
      {
        slug: "historical-figures",
        names: { en: "Historical figures", fr: "Personnages historiques", ar: "شخصيات تاريخية" },
      },
      {
        slug: "revolutions",
        names: { en: "Revolutions", fr: "Révolutions", ar: "الثورات" },
      },
      {
        slug: "archaeology",
        names: { en: "Archaeology", fr: "Archéologie", ar: "علم الآثار" },
      },
      {
        slug: "islamic-golden-age",
        names: {
          en: "The Islamic Golden Age",
          fr: "L'âge d'or islamique",
          ar: "العصر الذهبي الإسلامي",
        },
      },
    ],
  },

  {
    slug: "world-war-i",
    section: "learn",
    theme: "ww1",
    tone: "archival",
    names: { en: "World War I", fr: "Première Guerre mondiale", ar: "الحرب العالمية الأولى" },
    descriptions: {
      en: "1914–1918. Presented plainly, without decoration.",
      fr: "1914-1918. Présentée sobrement, sans ornement.",
      ar: "١٩١٤–١٩١٨. تُعرض بسطر واضح دون تزيين.",
    },
    collections: [
      {
        slug: "ww1-causes",
        names: { en: "Causes of the war", fr: "Origines de la guerre", ar: "أسباب الحرب" },
      },
      {
        slug: "ww1-major-battles",
        names: { en: "Major battles", fr: "Grandes batailles", ar: "المعارك الكبرى" },
      },
      {
        slug: "ww1-leaders",
        names: { en: "Political leaders", fr: "Dirigeants politiques", ar: "القادة السياسيون" },
      },
      {
        slug: "ww1-alliances",
        names: { en: "Alliances", fr: "Alliances", ar: "التحالفات" },
      },
      {
        slug: "ww1-weapons-and-technology",
        names: {
          en: "Weapons and technology",
          fr: "Armes et technologies",
          ar: "الأسلحة والتقنيات",
        },
      },
      {
        slug: "ww1-trenches",
        names: {
          en: "Life in the trenches",
          fr: "La vie dans les tranchées",
          ar: "الحياة في الخنادق",
        },
      },
      {
        slug: "ww1-women",
        names: {
          en: "Women during the war",
          fr: "Les femmes pendant la guerre",
          ar: "النساء في زمن الحرب",
        },
      },
      {
        slug: "ww1-propaganda",
        names: { en: "Propaganda", fr: "Propagande", ar: "الدعاية" },
      },
      {
        slug: "ww1-home-front",
        names: { en: "The home front", fr: "L'arrière", ar: "الجبهة الداخلية" },
      },
      {
        slug: "ww1-versailles",
        names: {
          en: "The Treaty of Versailles",
          fr: "Le traité de Versailles",
          ar: "معاهدة فرساي",
        },
      },
      {
        slug: "ww1-aftermath",
        names: { en: "The aftermath", fr: "L'après-guerre", ar: "ما بعد الحرب" },
      },
    ],
  },

  {
    slug: "world-war-ii",
    section: "learn",
    theme: "ww2",
    tone: "archival",
    names: { en: "World War II", fr: "Seconde Guerre mondiale", ar: "الحرب العالمية الثانية" },
    descriptions: {
      en: "1939–1945. Presented plainly, without decoration.",
      fr: "1939-1945. Présentée sobrement, sans ornement.",
      ar: "١٩٣٩–١٩٤٥. تُعرض بسطر واضح دون تزيين.",
    },
    collections: [
      {
        slug: "ww2-causes",
        names: { en: "Causes of the war", fr: "Origines de la guerre", ar: "أسباب الحرب" },
      },
      {
        slug: "ww2-major-battles",
        names: { en: "Major battles", fr: "Grandes batailles", ar: "المعارك الكبرى" },
      },
      {
        slug: "ww2-leaders",
        names: {
          en: "Political and military leaders",
          fr: "Dirigeants politiques et militaires",
          ar: "القادة السياسيون والعسكريون",
        },
      },
      {
        slug: "ww2-resistance",
        names: {
          en: "Resistance movements",
          fr: "Mouvements de résistance",
          ar: "حركات المقاومة",
        },
      },
      {
        slug: "ww2-holocaust",
        names: { en: "The Holocaust", fr: "La Shoah", ar: "الهولوكوست" },
        descriptions: {
          en: "Handled with care: verified facts, named sources, no decoration.",
          fr: "Traitée avec soin : faits vérifiés, sources nommées, aucun ornement.",
          ar: "تُعالج بعناية: وقائع مدقّقة ومصادر مسمّاة، دون أي تزيين.",
        },
      },
      {
        slug: "ww2-north-africa",
        names: {
          en: "The North African campaign",
          fr: "La campagne d'Afrique du Nord",
          ar: "حملة شمال أفريقيا",
        },
      },
      {
        slug: "ww2-pacific",
        names: { en: "The Pacific theatre", fr: "Le théâtre du Pacifique", ar: "مسرح المحيط الهادئ" },
      },
      {
        slug: "ww2-espionage",
        names: { en: "Espionage", fr: "Espionnage", ar: "الجاسوسية" },
      },
      {
        slug: "ww2-women",
        names: {
          en: "Women during the war",
          fr: "Les femmes pendant la guerre",
          ar: "النساء في زمن الحرب",
        },
      },
      {
        slug: "ww2-inventions",
        names: { en: "Wartime inventions", fr: "Inventions de guerre", ar: "اختراعات الحرب" },
      },
      {
        slug: "ww2-propaganda",
        names: { en: "Propaganda", fr: "Propagande", ar: "الدعاية" },
      },
      {
        slug: "ww2-aftermath",
        names: { en: "The aftermath", fr: "L'après-guerre", ar: "ما بعد الحرب" },
      },
    ],
  },
];
