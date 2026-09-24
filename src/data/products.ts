// THE product data file. Everything the shop shows comes from here, so it can be swapped for a
// real backend (Salla, Shopify, a CMS) by replacing this module with a fetch that returns the same shape.
// All products are fictional. Prices are in SAR and include VAT.

export type L10n = { en: string; ar: string };
export type Family = 'floral' | 'woody' | 'amber' | 'musk';
export type Size = { id: string; label: L10n; price: number };
export type Product = {
  id: string;
  slug: string;
  num: number | null;
  name: L10n;
  character: L10n;
  families: Family[];
  sizes: Size[];
  color: { liquid: string; bg: string; deep: string; ink: string };
  notes: { top: L10n; heart: L10n; base: L10n };
  description: L10n;
  story: L10n;
  wear: L10n;
  images: { front: string; thumb: string; turn: string[] };
};

const ml = (n: number, price: number): Size => ({ id: String(n), label: { en: `${n} ml`, ar: `${n} مل` }, price });
const turn = (id: string, frames: number, from = 0) =>
  Array.from({ length: frames }, (_, i) => `/assets/bottle/${id}_turn/${String(i + from).padStart(4, '0')}.webp`);

export const PRODUCTS: Product[] = [
  {
    id: 'no1', slug: 'rose-oud', num: 1,
    name: { en: 'Rose & Oud', ar: 'ورد وعود' },
    character: { en: 'Timeless', ar: 'خالد' },
    families: ['floral', 'woody'],
    sizes: [ml(50, 690), ml(100, 980)],
    color: { liquid: '#c9744f', bg: '#efdcd2', deep: '#4a1419', ink: '#3a1a16' },
    notes: {
      top: { en: 'Bergamot, Pink Pepper, Saffron', ar: 'برغموت، فلفل وردي، زعفران' },
      heart: { en: 'Taif Rose, Jasmine', ar: 'ورد طائفي، ياسمين' },
      base: { en: 'Oud, Amber, White Musk', ar: 'عود، عنبر، مسك أبيض' },
    },
    description: {
      en: 'Taif rose picked at dawn, resting on a slow base of oud and amber. Bright at first, then deep for hours.',
      ar: 'ورد طائفي يُقطف عند الفجر، يستقر على قاعدة هادئة من العود والعنبر. مشرق في البداية، ثم عميق لساعات.',
    },
    story: {
      en: 'The first fragrance of the house, built around one idea: the moment a rose field wakes up, kept for as long as oud allows.',
      ar: 'أول عطر في الدار، بُني حول فكرة واحدة: لحظة استيقاظ حقل الورد، محفوظة بقدر ما يسمح العود.',
    },
    wear: {
      en: 'Two sprays on the pulse points, or one on the collar. It opens fast and settles close to the skin by evening.',
      ar: 'رشتان على نقاط النبض، أو رشة على الياقة. ينفتح سريعًا ويستقر قريبًا من البشرة مع المساء.',
    },
    images: { front: '/assets/bottle/no1_front.webp', thumb: '/assets/bottle/no1_thumb.webp', turn: turn('no1', 13, 6) },
  },
  {
    id: 'no2', slug: 'amber-night', num: 2,
    name: { en: 'Amber Night', ar: 'ليل العنبر' },
    character: { en: 'Warm', ar: 'دافئ' },
    families: ['amber'],
    sizes: [ml(50, 640), ml(100, 920)],
    color: { liquid: '#7a2e12', bg: '#ead6c2', deep: '#2e140b', ink: '#2e1a10' },
    notes: {
      top: { en: 'Mandarin, Cardamom', ar: 'يوسفي، هيل' },
      heart: { en: 'Labdanum, Tonka', ar: 'لادن، تونكا' },
      base: { en: 'Amber, Vanilla, Sandalwood', ar: 'عنبر، فانيلا، صندل' },
    },
    description: {
      en: 'Cardamom and mandarin warming into amber and vanilla. A fragrance for late evenings and slow conversations.',
      ar: 'هيل ويوسفي يدفآن نحو العنبر والفانيلا. عطر للأمسيات المتأخرة والأحاديث الهادئة.',
    },
    story: {
      en: 'Made for the hour after sunset, when the desert gives back the heat of the day.',
      ar: 'صُنع للساعة التي تلي الغروب، حين تعيد الصحراء حرارة النهار.',
    },
    wear: {
      en: 'One spray at the neck and one on the wrist. Richer on fabric than on skin.',
      ar: 'رشة على الرقبة وأخرى على المعصم. أغنى على القماش منه على البشرة.',
    },
    images: { front: '/assets/bottle/no2_front.webp', thumb: '/assets/bottle/no2_thumb.webp', turn: turn('no2', 9) },
  },
  {
    id: 'no3', slug: 'white-musk', num: 3,
    name: { en: 'White Musk', ar: 'المسك الأبيض' },
    character: { en: 'Pure', ar: 'نقي' },
    families: ['musk'],
    sizes: [ml(50, 560), ml(100, 820)],
    color: { liquid: '#e9e4da', bg: '#ecebe6', deep: '#3b3a37', ink: '#26251f' },
    notes: {
      top: { en: 'Pear, Aldehydes', ar: 'كمثرى، ألدهيدات' },
      heart: { en: 'Orris, Cotton Flower', ar: 'جذر السوسن، زهرة القطن' },
      base: { en: 'White Musk, Cashmeran', ar: 'مسك أبيض، كشميران' },
    },
    description: {
      en: 'Clean skin, soft cotton and a quiet musk that stays close. The lightest voice in the house.',
      ar: 'بشرة نظيفة وقطن ناعم ومسك هادئ يبقى قريبًا. أخف صوت في الدار.',
    },
    story: {
      en: 'Inspired by linen drying in the morning wind — nothing added that does not need to be there.',
      ar: 'مستوحى من الكتان وهو يجف في ريح الصباح — لا شيء مضاف إلا ما يلزم.',
    },
    wear: {
      en: 'Generously, anywhere. It layers well under No. 1 and No. 2.',
      ar: 'بسخاء وفي أي مكان. يتناغم جيدًا تحت رقم 1 ورقم 2.',
    },
    images: { front: '/assets/bottle/no3_front.webp', thumb: '/assets/bottle/no3_thumb.webp', turn: turn('no3', 9) },
  },
  {
    id: 'no4', slug: 'saffron-veil', num: 4,
    name: { en: 'Saffron Veil', ar: 'وشاح الزعفران' },
    character: { en: 'Bold', ar: 'جريء' },
    families: ['amber', 'woody'],
    sizes: [ml(50, 720), ml(100, 1040)],
    color: { liquid: '#d9822b', bg: '#f0dcc0', deep: '#3d1d08', ink: '#35200e' },
    notes: {
      top: { en: 'Saffron, Pink Pepper', ar: 'زعفران، فلفل وردي' },
      heart: { en: 'Rose, Leather', ar: 'ورد، جلد' },
      base: { en: 'Oud, Benzoin', ar: 'عود، جاوي' },
    },
    description: {
      en: 'Saffron threads and soft leather over a smoky base. Confident from the first spray.',
      ar: 'خيوط زعفران وجلد ناعم فوق قاعدة مدخّنة. واثق من أول رشة.',
    },
    story: {
      en: 'A gold thread through the collection: the spice that was once worth more than the cloth it was wrapped in.',
      ar: 'خيط ذهبي في المجموعة: التابل الذي كان يومًا أغلى من القماش الذي يُلف فيه.',
    },
    wear: {
      en: 'One spray is enough. Best in cool evenings.',
      ar: 'رشة واحدة تكفي. أجمل في الأمسيات الباردة.',
    },
    images: { front: '/assets/bottle/no4_front.webp', thumb: '/assets/bottle/no4_thumb.webp', turn: turn('no4', 9) },
  },
  {
    id: 'no5', slug: 'desert-iris', num: 5,
    name: { en: 'Desert Iris', ar: 'سوسن الصحراء' },
    character: { en: 'Quiet', ar: 'هادئ' },
    families: ['floral', 'musk'],
    sizes: [ml(50, 610), ml(100, 880)],
    color: { liquid: '#b7a9bf', bg: '#e6e0e6', deep: '#2f2836', ink: '#2a2430' },
    notes: {
      top: { en: 'Violet Leaf, Lemon', ar: 'ورق البنفسج، ليمون' },
      heart: { en: 'Iris, Heliotrope', ar: 'سوسن، هليوتروب' },
      base: { en: 'Musk, Cedar', ar: 'مسك، أرز' },
    },
    description: {
      en: 'Powdery iris, cool violet leaf and cedar. Soft, grey-lilac, and very still.',
      ar: 'سوسن بودري وورق بنفسج بارد وأرز. ناعم ورمادي بنفسجي وهادئ جدًا.',
    },
    story: {
      en: 'The flower that blooms after rare desert rain — here for a week, remembered for a year.',
      ar: 'الزهرة التي تتفتح بعد مطر الصحراء النادر — تبقى أسبوعًا، وتُذكر عامًا.',
    },
    wear: {
      en: 'On the wrists and the back of the neck, for close company.',
      ar: 'على المعصمين وخلف الرقبة، لمن هم قريبون منك.',
    },
    images: { front: '/assets/bottle/no5_front.webp', thumb: '/assets/bottle/no5_thumb.webp', turn: turn('no5', 9) },
  },
  {
    id: 'set', slug: 'discovery-set', num: null,
    name: { en: 'Discovery Set', ar: 'مجموعة الاكتشاف' },
    character: { en: 'All five', ar: 'الخمسة كلها' },
    families: [],
    sizes: [{ id: '5x10', label: { en: '5 × 10 ml', ar: '5 × 10 مل' }, price: 390 }],
    color: { liquid: '#c9744f', bg: '#ece4da', deep: '#2a1d17', ink: '#2a1d17' },
    notes: {
      top: { en: 'No. 1 Rose & Oud · No. 2 Amber Night', ar: 'رقم 1 ورد وعود · رقم 2 ليل العنبر' },
      heart: { en: 'No. 3 White Musk · No. 4 Saffron Veil', ar: 'رقم 3 المسك الأبيض · رقم 4 وشاح الزعفران' },
      base: { en: 'No. 5 Desert Iris', ar: 'رقم 5 سوسن الصحراء' },
    },
    description: {
      en: 'One 10 ml bottle of each fragrance, to wear for a few days before choosing yours.',
      ar: 'قارورة 10 مل من كل عطر، لتجربها أيامًا قبل أن تختار عطرك.',
    },
    story: {
      en: 'The whole house in one box, from the first light of No. 1 to the stillness of No. 5.',
      ar: 'الدار كلها في علبة واحدة، من ضوء رقم 1 الأول إلى سكون رقم 5.',
    },
    wear: {
      en: 'One fragrance a day, for five days. Keep the one you miss.',
      ar: 'عطر واحد كل يوم، لخمسة أيام. واحتفظ بالذي تفتقده.',
    },
    images: { front: '/assets/bottle/set_front.webp', thumb: '/assets/bottle/set_thumb.webp', turn: [] },
  },
];

export const FRAGRANCES = PRODUCTS.filter((p) => p.num !== null);
export const bySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug) || null;
export const byId = (id: string) => PRODUCTS.find((p) => p.id === id) || null;
export const fromPrice = (p: Product) => Math.min(...p.sizes.map((s) => s.price));

// delivery rules (fictional)
export const DELIVERY = {
  standard: 25,
  express: 45,
  freeStandardOver: 1000,
  expressCities: [0, 1, 4], // indexes into content.cities: Riyadh, Jeddah, Dammam
};
