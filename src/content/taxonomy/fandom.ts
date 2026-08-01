import type { SubjectDef } from "./types";

/**
 * The "Fandom" shelf: single-artist subjects, deep rather than broad.
 *
 * Both subjects have albums, tours and song titles, and so does Music, so every
 * collection here is prefixed — `ts-` for Taylor Swift, `od-` for One Direction.
 */
export const FANDOM: SubjectDef[] = [
  {
    slug: "taylor-swift",
    section: "fandom",
    theme: "taylor",
    names: { en: "Taylor Swift", fr: "Taylor Swift", ar: "تايلور سويفت" },
    descriptions: {
      en: "One discography, examined closely.",
      fr: "Une discographie, examinée de près.",
      ar: "أعمال فنية واحدة، بقراءة قريبة.",
    },
    collections: [
      {
        slug: "ts-albums",
        names: { en: "Albums", fr: "Albums", ar: "الألبومات" },
      },
      {
        slug: "ts-eras",
        names: { en: "Eras", fr: "Les eras", ar: "الحقبات" },
        descriptions: {
          en: "The chapters, as the fandom counts them.",
          fr: "Les chapitres, tels que les compte le fandom.",
          ar: "الفصول كما يعدّها الجمهور.",
        },
      },
      {
        slug: "ts-song-titles",
        names: { en: "Song titles", fr: "Titres de chansons", ar: "عناوين الأغاني" },
      },
      {
        slug: "ts-music-videos",
        names: { en: "Music videos", fr: "Clips", ar: "الفيديوهات الموسيقية" },
      },
      {
        slug: "ts-collaborations",
        names: { en: "Collaborations", fr: "Collaborations", ar: "التعاونات" },
      },
      {
        slug: "ts-tours",
        names: { en: "Tours", fr: "Tournées", ar: "الجولات الغنائية" },
      },
      {
        slug: "ts-awards",
        names: { en: "Awards", fr: "Récompenses", ar: "الجوائز" },
      },
      {
        slug: "ts-symbols",
        names: {
          en: "Famous symbols and references",
          fr: "Symboles et références",
          ar: "الرموز والإحالات الشهيرة",
        },
        descriptions: {
          en: "Numbers, colours and recurring motifs.",
          fr: "Chiffres, couleurs et motifs récurrents.",
          ar: "أرقام وألوان وعناصر متكررة.",
        },
      },
      {
        slug: "ts-timeline",
        names: {
          en: "Career timeline",
          fr: "Chronologie de carrière",
          ar: "الخط الزمني للمسيرة",
        },
      },
      {
        slug: "ts-album-aesthetics",
        names: {
          en: "Album aesthetics",
          fr: "Esthétiques d'albums",
          ar: "جماليات الألبومات",
        },
        descriptions: {
          en: "Covers, palettes and typefaces.",
          fr: "Pochettes, palettes et typographies.",
          ar: "الأغلفة والألوان والخطوط.",
        },
      },
      {
        slug: "ts-deep-cuts",
        names: {
          en: "Deep cuts",
          fr: "Titres méconnus",
          ar: "أغانٍ غير شائعة",
        },
        descriptions: {
          en: "Track eleven, and further in.",
          fr: "La onzième piste, et au-delà.",
          ar: "الأغنية الحادية عشرة وما بعدها.",
        },
      },
    ],
  },

  {
    slug: "one-direction",
    section: "fandom",
    theme: "onedirection",
    names: { en: "One Direction", fr: "One Direction", ar: "ون دايركشن" },
    descriptions: {
      en: "Five members, five albums and the decade that followed.",
      fr: "Cinq membres, cinq albums et la décennie qui a suivi.",
      ar: "خمسة أعضاء وخمسة ألبومات والعقد الذي تلاها.",
    },
    collections: [
      {
        slug: "od-members",
        names: { en: "Band members", fr: "Les membres du groupe", ar: "أعضاء الفريق" },
      },
      {
        slug: "od-albums",
        names: { en: "Albums", fr: "Albums", ar: "الألبومات" },
      },
      {
        slug: "od-song-titles",
        names: { en: "Song titles", fr: "Titres de chansons", ar: "عناوين الأغاني" },
      },
      {
        slug: "od-music-videos",
        names: { en: "Music videos", fr: "Clips", ar: "الفيديوهات الموسيقية" },
      },
      {
        slug: "od-tours",
        names: { en: "Tours", fr: "Tournées", ar: "الجولات الغنائية" },
      },
      {
        slug: "od-x-factor",
        names: {
          en: "The X Factor era",
          fr: "L'époque X Factor",
          ar: "مرحلة إكس فاكتور",
        },
        descriptions: {
          en: "Where the group was assembled.",
          fr: "Là où le groupe a été formé.",
          ar: "حيث تشكّل الفريق.",
        },
      },
      {
        slug: "od-performances",
        names: {
          en: "Famous performances",
          fr: "Performances marquantes",
          ar: "عروض شهيرة",
        },
      },
      {
        slug: "od-collaborations",
        names: { en: "Collaborations", fr: "Collaborations", ar: "التعاونات" },
      },
      {
        slug: "od-band-history",
        names: { en: "Band history", fr: "Histoire du groupe", ar: "تاريخ الفريق" },
      },
      {
        slug: "od-solo-careers",
        names: { en: "Solo careers", fr: "Carrières solo", ar: "المسيرات الفردية" },
        descriptions: {
          en: "What each of them did next.",
          fr: "Ce que chacun a fait ensuite.",
          ar: "ما فعله كل واحد بعد ذلك.",
        },
      },
      {
        slug: "od-fandom-vocabulary",
        names: {
          en: "Fandom terminology",
          fr: "Vocabulaire du fandom",
          ar: "مفردات الجمهور",
        },
        descriptions: {
          en: "Words that need no gloss inside the fandom.",
          fr: "Des mots qui n'ont pas besoin d'explication entre initiés.",
          ar: "كلمات لا تحتاج شرحًا بين المتابعين.",
        },
      },
      {
        slug: "od-music-of-the-2010s",
        names: {
          en: "Music of the 2010s",
          fr: "La musique des années 2010",
          ar: "موسيقى عشرية ٢٠١٠",
        },
      },
    ],
  },
];
