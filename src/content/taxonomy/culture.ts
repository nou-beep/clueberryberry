import type { SubjectDef } from "./types";

/**
 * The "Culture" shelf: what people make and consume.
 *
 * Books and Literature are two subjects on purpose — one is what readers talk
 * about, the other is what syllabuses cover, and the overlap is small enough to
 * be worth the duplication.
 *
 * `games` keeps its original slug, and so do the `retro-games` and
 * `gaming-vocabulary` collections: hand-authored puzzles point at them.
 */
export const CULTURE: SubjectDef[] = [
  {
    slug: "music",
    section: "culture",
    theme: "music",
    names: { en: "Music", fr: "Musique", ar: "الموسيقى" },
    descriptions: {
      en: "Records, genres and the people who made them.",
      fr: "Disques, genres et ceux qui les ont faits.",
      ar: "الأسطوانات والأنواع ومن صنعها.",
    },
    collections: [
      {
        slug: "music-history",
        names: { en: "Music history", fr: "Histoire de la musique", ar: "تاريخ الموسيقى" },
      },
      {
        slug: "musical-instruments",
        names: { en: "Instruments", fr: "Instruments", ar: "الآلات الموسيقية" },
        descriptions: {
          en: "Strings, skins, reeds and keys.",
          fr: "Cordes, peaux, anches et claviers.",
          ar: "أوتار وجلود وقصبات ومفاتيح.",
        },
      },
      {
        slug: "music-terminology",
        names: {
          en: "Musical terminology",
          fr: "Vocabulaire musical",
          ar: "المصطلحات الموسيقية",
        },
        descriptions: {
          en: "The Italian words on the page.",
          fr: "Les mots italiens sur la partition.",
          ar: "الكلمات الإيطالية على النوتة.",
        },
      },
      {
        slug: "famous-albums",
        names: { en: "Famous albums", fr: "Albums célèbres", ar: "ألبومات شهيرة" },
      },
      {
        slug: "music-song-titles",
        names: { en: "Song titles", fr: "Titres de chansons", ar: "عناوين الأغاني" },
      },
      {
        slug: "pop-music",
        names: { en: "Pop music", fr: "Pop", ar: "موسيقى البوب" },
      },
      {
        slug: "rock-music",
        names: { en: "Rock", fr: "Rock", ar: "الروك" },
      },
      {
        slug: "classical-music",
        names: { en: "Classical music", fr: "Musique classique", ar: "الموسيقى الكلاسيكية" },
        descriptions: {
          en: "Composers, forms and catalogue numbers.",
          fr: "Compositeurs, formes et numéros de catalogue.",
          ar: "مؤلفون وقوالب وأرقام فهرسة.",
        },
      },
      {
        slug: "rnb",
        names: { en: "R&B", fr: "R&B", ar: "الآر أند بي" },
      },
      {
        slug: "hip-hop",
        names: { en: "Hip-hop", fr: "Hip-hop", ar: "الهيب هوب" },
      },
      {
        slug: "eurovision",
        names: { en: "Eurovision", fr: "L'Eurovision", ar: "يوروفيزيون" },
        descriptions: {
          en: "Entries, winners and points.",
          fr: "Candidats, vainqueurs et points.",
          ar: "المشاركات والفائزون والنقاط.",
        },
      },
      {
        slug: "music-of-the-2000s",
        names: {
          en: "Music of the 2000s",
          fr: "La musique des années 2000",
          ar: "موسيقى الألفية الأولى",
        },
      },
      {
        slug: "famous-bands",
        names: { en: "Famous bands", fr: "Groupes célèbres", ar: "فرق شهيرة" },
      },
      {
        slug: "women-in-music",
        names: { en: "Women in music", fr: "Les femmes en musique", ar: "النساء في الموسيقى" },
      },
    ],
  },

  {
    slug: "books",
    section: "culture",
    theme: "books",
    names: { en: "Books", fr: "Livres", ar: "الكتب" },
    descriptions: {
      en: "What people actually read, and talk about after.",
      fr: "Ce qu'on lit vraiment, et dont on parle ensuite.",
      ar: "ما يُقرأ فعلًا، وما يُتحدَّث عنه بعده.",
    },
    collections: [
      {
        slug: "famous-novels",
        names: { en: "Famous novels", fr: "Romans célèbres", ar: "روايات شهيرة" },
      },
      {
        slug: "book-titles",
        names: { en: "Book titles", fr: "Titres de livres", ar: "عناوين الكتب" },
      },
      {
        slug: "fictional-characters",
        names: {
          en: "Fictional characters",
          fr: "Personnages de fiction",
          ar: "شخصيات روائية",
        },
      },
      {
        slug: "thrillers",
        names: { en: "Thrillers", fr: "Thrillers", ar: "روايات الإثارة" },
      },
      {
        slug: "romance-novels",
        names: { en: "Romance", fr: "Romance", ar: "الروايات الرومانسية" },
      },
      {
        slug: "fantasy-books",
        names: { en: "Fantasy", fr: "Fantasy", ar: "الفانتازيا" },
      },
      {
        slug: "horror-books",
        names: { en: "Horror", fr: "Horreur", ar: "روايات الرعب" },
      },
      {
        slug: "childrens-books",
        names: {
          en: "Children's books",
          fr: "Livres pour enfants",
          ar: "كتب الأطفال",
        },
      },
      {
        slug: "contemporary-fiction",
        names: {
          en: "Contemporary fiction",
          fr: "Fiction contemporaine",
          ar: "الأدب الروائي المعاصر",
        },
      },
      {
        slug: "booktok",
        names: { en: "BookTok", fr: "BookTok", ar: "بوك توك" },
        descriptions: {
          en: "The titles the feed decided on.",
          fr: "Les titres choisis par le fil d'actualité.",
          ar: "العناوين التي اختارها التطبيق.",
        },
      },
      {
        slug: "famous-opening-lines",
        names: {
          en: "Famous opening lines",
          fr: "Premières phrases célèbres",
          ar: "مطالع شهيرة",
        },
        descriptions: {
          en: "First sentences that outlived their books.",
          fr: "Des premières phrases qui ont survécu à leur livre.",
          ar: "جمل أولى بقيت أطول من كتبها.",
        },
      },
      {
        slug: "literary-settings",
        names: {
          en: "Literary settings",
          fr: "Lieux littéraires",
          ar: "أمكنة الأدب",
        },
        descriptions: {
          en: "Towns, houses and islands that only exist on the page.",
          fr: "Villes, maisons et îles qui n'existent que sur le papier.",
          ar: "مدن وبيوت وجزر لا توجد إلا على الورق.",
        },
      },
    ],
  },

  {
    slug: "literature",
    section: "culture",
    theme: "literature",
    names: { en: "Literature", fr: "Littérature", ar: "الأدب" },
    descriptions: {
      en: "The canon, its movements and its machinery — separate from Books on purpose.",
      fr: "Le canon, ses mouvements et sa mécanique — distinct de Livres à dessein.",
      ar: "المتون الأدبية ومدارسها وأدواتها — منفصلة عن الكتب بقصد.",
    },
    collections: [
      {
        slug: "literary-movements",
        names: {
          en: "Literary movements",
          fr: "Mouvements littéraires",
          ar: "المدارس الأدبية",
        },
        descriptions: {
          en: "Manifestos, groups and their dates.",
          fr: "Manifestes, groupes et dates.",
          ar: "البيانات والجماعات وتواريخها.",
        },
      },
      {
        slug: "classic-literature",
        names: {
          en: "Classic literature",
          fr: "Littérature classique",
          ar: "الأدب الكلاسيكي",
        },
      },
      {
        slug: "shakespeare",
        names: { en: "Shakespeare", fr: "Shakespeare", ar: "شكسبير" },
        descriptions: {
          en: "Plays, sonnets and the reliably fatal endings.",
          fr: "Pièces, sonnets et dénouements fatals.",
          ar: "المسرحيات والسوناتات والنهايات القاتلة.",
        },
      },
      {
        slug: "poetry",
        names: { en: "Poetry", fr: "Poésie", ar: "الشعر" },
      },
      {
        slug: "gothic-literature",
        names: {
          en: "Gothic literature",
          fr: "Littérature gothique",
          ar: "الأدب القوطي",
        },
      },
      {
        slug: "french-literature",
        names: {
          en: "French literature",
          fr: "Littérature française",
          ar: "الأدب الفرنسي",
        },
      },
      {
        slug: "arabic-literature",
        names: { en: "Arabic literature", fr: "Littérature arabe", ar: "الأدب العربي" },
        descriptions: {
          en: "From the pre-Islamic odes onward.",
          fr: "Des odes préislamiques à aujourd'hui.",
          ar: "من المعلقات إلى ما بعدها.",
        },
      },
      {
        slug: "african-literature",
        names: {
          en: "African literature",
          fr: "Littératures africaines",
          ar: "الأدب الأفريقي",
        },
      },
      {
        slug: "american-literature",
        names: {
          en: "American literature",
          fr: "Littérature américaine",
          ar: "الأدب الأمريكي",
        },
      },
      {
        slug: "british-literature",
        names: {
          en: "British literature",
          fr: "Littérature britannique",
          ar: "الأدب البريطاني",
        },
      },
      {
        slug: "famous-authors",
        names: { en: "Famous authors", fr: "Auteurs célèbres", ar: "أدباء مشهورون" },
      },
      {
        slug: "literary-devices",
        names: {
          en: "Literary devices",
          fr: "Figures de style",
          ar: "الأساليب البلاغية",
        },
        descriptions: {
          en: "Metaphor, metonymy and the rest of the toolkit.",
          fr: "Métaphore, métonymie et le reste de l'outillage.",
          ar: "الاستعارة والكناية وبقية الأدوات.",
        },
      },
      {
        slug: "myth-in-literature",
        names: {
          en: "Mythological references in literature",
          fr: "Références mythologiques en littérature",
          ar: "الإحالات الأسطورية في الأدب",
        },
        descriptions: {
          en: "Old gods borrowed by later writers.",
          fr: "Des dieux anciens empruntés par les modernes.",
          ar: "آلهة قديمة استعارها كتّاب متأخرون.",
        },
      },
    ],
  },

  {
    slug: "games",
    section: "culture",
    theme: "games",
    names: { en: "Games", fr: "Jeux vidéo", ar: "الألعاب" },
    descriptions: {
      en: "Consoles, catalogues and the vocabulary that came with them.",
      fr: "Consoles, catalogues et le vocabulaire qui va avec.",
      ar: "أجهزة وقوائم ألعاب والمفردات التي جاءت معها.",
    },
    collections: [
      {
        slug: "retro-games",
        names: { en: "Retro games", fr: "Jeux d'antan", ar: "ألعاب قديمة" },
        descriptions: {
          en: "Cartridges, sprites and three lives.",
          fr: "Cartouches, sprites et trois vies.",
          ar: "خراطيش وصور نقطية وثلاث محاولات.",
        },
      },
      {
        slug: "video-game-history",
        names: {
          en: "Video-game history",
          fr: "Histoire du jeu vidéo",
          ar: "تاريخ ألعاب الفيديو",
        },
      },
      {
        slug: "consoles",
        names: { en: "Consoles", fr: "Consoles", ar: "أجهزة الألعاب" },
      },
      {
        slug: "nintendo",
        names: { en: "Nintendo", fr: "Nintendo", ar: "نينتندو" },
      },
      {
        slug: "playstation",
        names: { en: "PlayStation", fr: "PlayStation", ar: "بلايستيشن" },
      },
      {
        slug: "xbox",
        names: { en: "Xbox", fr: "Xbox", ar: "إكس بوكس" },
      },
      {
        slug: "pc-gaming",
        names: { en: "PC gaming", fr: "Jeu sur PC", ar: "اللعب على الحاسوب" },
      },
      {
        slug: "cozy-games",
        names: { en: "Cozy games", fr: "Jeux cosy", ar: "ألعاب هادئة" },
        descriptions: {
          en: "Low stakes, soft light, no timer.",
          fr: "Peu d'enjeux, lumière douce, pas de chrono.",
          ar: "بلا مخاطر ولا مؤقّت، وبضوء لطيف.",
        },
      },
      {
        slug: "horror-games",
        names: { en: "Horror games", fr: "Jeux d'horreur", ar: "ألعاب الرعب" },
      },
      {
        slug: "indie-games",
        names: { en: "Indie games", fr: "Jeux indépendants", ar: "الألعاب المستقلة" },
      },
      {
        slug: "famous-game-characters",
        names: {
          en: "Famous characters",
          fr: "Personnages célèbres",
          ar: "شخصيات مشهورة في الألعاب",
        },
      },
      {
        slug: "gaming-vocabulary",
        names: {
          en: "Gaming terminology",
          fr: "Vocabulaire du jeu",
          ar: "مفردات اللعب",
        },
        descriptions: {
          en: "The words every player picks up in the first hour.",
          fr: "Les mots appris dans la première heure de jeu.",
          ar: "الكلمات التي يتعلمها كل لاعب في الساعة الأولى.",
        },
      },
      {
        slug: "games-of-the-2000s",
        names: {
          en: "Games of the 2000s",
          fr: "Les jeux des années 2000",
          ar: "ألعاب الألفية الأولى",
        },
      },
    ],
  },
];
