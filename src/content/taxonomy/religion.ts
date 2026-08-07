import type { SubjectDef } from "./types";

/**
 * World religions, treated as a field of study rather than a set of claims.
 *
 * The tone is `archival` on purpose: no stickers, no tape, no charms. The same
 * restraint the world wars get, for the same reason — decoration would be
 * disrespectful on subjects people hold sacred.
 *
 * The editorial rules for this subject, enforced in docs/authoring-guide.md:
 *
 *   - Describe practice, text, architecture, history and vocabulary. Never
 *     adjudicate whether a belief is true.
 *   - No tradition is presented as default, normal, or a deviation from one.
 *     Clues do not rank, compare favourably, or caricature.
 *   - Living traditions are written in the present tense and from the inside
 *     out: the words practitioners use for themselves, spelled as they spell
 *     them.
 *   - Contested history is dated and attributed, never asserted.
 *   - No puzzle answer is a divine name where a tradition treats writing or
 *     guessing it as irreverent.
 *
 * Coverage is deliberately spread across traditions rather than centred on any
 * one, and collections are organised by *aspect* — texts, buildings, festivals
 * — so no single faith owns a shelf.
 */
export const RELIGION: SubjectDef[] = [
  {
    slug: "world-religions",
    section: "learn",
    theme: "religion",
    tone: "archival",
    names: {
      en: "World Religions",
      fr: "Religions du monde",
      ar: "أديان العالم",
    },
    descriptions: {
      en: "Texts, buildings, calendars and customs, described as they are practised. This subject studies religions; it does not argue for or against any of them.",
      fr: "Textes, édifices, calendriers et coutumes, décrits tels qu'ils sont pratiqués. Cette matière étudie les religions ; elle n'en défend ni n'en conteste aucune.",
      ar: "نصوص ومبانٍ وتقاويم وعادات، موصوفة كما تُمارَس. هذه المادة تدرس الأديان ولا تُحاجّ لأيٍّ منها أو ضدّه.",
    },
    collections: [
      {
        slug: "rel-sacred-texts",
        names: {
          en: "Sacred texts",
          fr: "Textes sacrés",
          ar: "النصوص المقدسة",
        },
        descriptions: {
          en: "Scriptures and their transmission: how they were compiled, copied and read.",
          fr: "Les écritures et leur transmission : compilation, copie et lecture.",
          ar: "الكتب وطرق انتقالها: كيف جُمعت ونُسخت وقُرئت.",
        },
      },
      {
        slug: "rel-places-of-worship",
        names: {
          en: "Places of worship",
          fr: "Lieux de culte",
          ar: "دور العبادة",
        },
        descriptions: {
          en: "Mosques, churches, synagogues, temples and gurdwaras, and the words for their parts.",
          fr: "Mosquées, églises, synagogues, temples et gurdwaras, et le nom de leurs parties.",
          ar: "المساجد والكنائس والمعابد اليهودية والهندوسية والغوردوارات، وأسماء أجزائها.",
        },
      },
      {
        slug: "rel-festivals",
        names: {
          en: "Festivals and observances",
          fr: "Fêtes et observances",
          ar: "الأعياد والمناسبات",
        },
        descriptions: {
          en: "Days that are kept, and what is done on them.",
          fr: "Les jours que l'on observe, et ce que l'on y fait.",
          ar: "الأيام التي تُحيا، وما يُفعل فيها.",
        },
      },
      {
        slug: "rel-pilgrimage",
        names: {
          en: "Pilgrimage",
          fr: "Pèlerinage",
          ar: "الحج والزيارة",
        },
        descriptions: {
          en: "Journeys undertaken as devotion, and the routes and cities they made.",
          fr: "Les voyages entrepris par dévotion, et les routes et villes qu'ils ont façonnées.",
          ar: "رحلات تُقطع تعبدًا، والطرق والمدن التي صنعتها.",
        },
      },
      {
        slug: "rel-architecture",
        names: {
          en: "Religious architecture",
          fr: "Architecture religieuse",
          ar: "العمارة الدينية",
        },
        descriptions: {
          en: "Domes, minarets, spires and cloisters — the vocabulary of sacred building.",
          fr: "Coupoles, minarets, flèches et cloîtres — le vocabulaire du bâti sacré.",
          ar: "القباب والمآذن والأبراج والأروقة — مفردات البناء المقدس.",
        },
      },
      {
        slug: "rel-art-and-calligraphy",
        names: {
          en: "Religious art and calligraphy",
          fr: "Art et calligraphie religieux",
          ar: "الفن والخط الديني",
        },
        descriptions: {
          en: "Illumination, mosaic, icon and script, and the traditions that shaped each.",
          fr: "Enluminure, mosaïque, icône et écriture, et les traditions qui les ont formées.",
          ar: "التذهيب والفسيفساء والأيقونة والخط، والتقاليد التي شكّلت كلًّا منها.",
        },
      },
      {
        slug: "rel-calendars",
        names: {
          en: "Religious calendars",
          fr: "Calendriers religieux",
          ar: "التقاويم الدينية",
        },
        descriptions: {
          en: "Lunar, solar and lunisolar reckoning, and how each sets its year.",
          fr: "Comput lunaire, solaire et luni-solaire, et la manière dont chacun fixe son année.",
          ar: "الحساب القمري والشمسي والقمري الشمسي، وكيف يضبط كلٌّ منها سنته.",
        },
      },
      {
        slug: "rel-monastic-life",
        names: {
          en: "Monastic and devotional life",
          fr: "Vie monastique et dévotionnelle",
          ar: "الحياة الرهبانية والتعبدية",
        },
        descriptions: {
          en: "Orders, retreats and daily rules, from Benedictines to Buddhist sangha.",
          fr: "Ordres, retraites et règles quotidiennes, des bénédictins au sangha bouddhiste.",
          ar: "الرهبانيات والخلوات والقواعد اليومية، من البندكتيين إلى السانغا البوذية.",
        },
      },
      {
        slug: "rel-vocabulary",
        names: {
          en: "Words of faith",
          fr: "Mots de la foi",
          ar: "مفردات التديّن",
        },
        descriptions: {
          en: "Terms that recur across traditions, and the ones specific to each.",
          fr: "Les termes qui reviennent d'une tradition à l'autre, et ceux propres à chacune.",
          ar: "مصطلحات تتكرر بين التقاليد، وأخرى تخصّ كلًّا منها.",
        },
      },
      {
        slug: "rel-traditions",
        names: {
          en: "Traditions of the world",
          fr: "Traditions du monde",
          ar: "تقاليد العالم",
        },
        descriptions: {
          en: "An overview of major living traditions and the regions where they took shape.",
          fr: "Panorama des grandes traditions vivantes et des régions où elles se sont formées.",
          ar: "نظرة عامة على التقاليد الحية الكبرى والمناطق التي تشكّلت فيها.",
        },
      },
    ],
  },
];
