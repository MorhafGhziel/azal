// Adds AZAL's theme settings and its five home components to twilight.json (Salla's theme manifest).
// Safe to run again: it replaces its own entries and leaves Raed's untouched.
// Run: node scripts/azal-manifest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'twilight.json');
const t = JSON.parse(readFileSync(file, 'utf8'));

t.name = { ar: 'أزل', en: 'AZAL' };
t.description = {
  ar: 'ثيم لدور العطور: فيلم يتحرك مع التمرير من السماء إلى القارورة، ثم الأصل والنوتات والمجموعة.',
  en: 'A perfume-house theme: a scroll film from the sky down to the bottle, then origins, notes and the collection.',
};
t.repository = 'https://github.com/MorhafGhziel/azal';
t.support_url = 'https://www.simastudio.it.com';

const L = (ar, en) => ({ ar, en });
const text = (id, label, value, format = 'text', extra = {}) => ({ type: 'string', icon: format === 'textarea' ? 'sicon-typography' : 'sicon-format-text-alt', id, label, format, multilanguage: true, required: false, value, ...extra });
const image = (id, label, description) => ({ type: 'string', icon: 'sicon-image', id, label, format: 'image', required: false, value: null, description });
// colours are hex text fields (for example #f4efe7): the one input every Salla editor version accepts
const color = (id, label, value) => ({ type: 'string', icon: 'sicon-format-fill', id, label, format: 'text', required: false, value, placeholder: value, description: 'Hex, e.g. ' + value, multilanguage: false });
const product = (id, label, multi = false, max = 1) => ({ type: 'items', icon: 'sicon-packed-box', id, label, format: 'dropdown-list', source: 'products', searchable: true, multichoice: multi, required: false, maxLength: max, selected: [], options: [], value: [] });
const toggle = (id, label, value = true, description = null) => ({ type: 'boolean', icon: 'sicon-toggle-off', id, label, description, format: 'switch', required: false, value, selected: value });
const note = (id, html) => ({ type: 'static', format: 'description', id, value: html });

// ---------- theme settings ----------
const AZAL_SETTINGS = [
  { type: 'static', format: 'title', id: 'azal-title', variant: 'h6', value: "<div style='background:#2b0a0e;color:#fbf3e6;padding:15px;border-radius:8px;text-align:center'><h6 style='font-size:15px;font-weight:bold'>أزل · AZAL</h6></div>" },
  toggle('azal_use_store_logo', 'استخدام شعار المتجر بدل رمز أزل في أعلى الصفحة', false),
  color('azal_ivory', 'لون الخلفية (عاجي)', '#f4efe7'),
  color('azal_ink', 'لون النص (حبر)', '#1a1614'),
  color('azal_cream', 'لون النص على الخلفيات الداكنة', '#fbf3e6'),
  color('azal_wine', 'لون النبيذ', '#4a1419'),
  color('azal_wine_deep', 'لون النبيذ الداكن', '#2b0a0e'),
  color('azal_blush', 'لون الورد', '#e9c6b8'),
  color('azal_card_bg', 'خلفية صور المنتجات', '#ece4da'),
  toggle('azal_loader', 'شاشة الافتتاح في الصفحة الرئيسية'),
  toggle('azal_smooth', 'تمرير ناعم'),
  toggle('azal_veil', 'انتقال ناعم بين الصفحات'),
  toggle('azal_cursor', 'مؤشر مخصص'),
  toggle('azal_petals', 'بتلات متطايرة'),
  toggle('azal_grain', 'حبيبات الفيلم'),
  toggle('azal_footer_light', 'شارات الثقة بالنسخة الفاتحة', false),
];
t.settings = [...AZAL_SETTINGS, ...t.settings.filter((s) => !String(s.id).startsWith('azal'))];

// ---------- home components ----------
const C = (key, path, title, icon, fields) => ({ key, title, icon, path, image: null, fields });
const AZAL_COMPONENTS = [
  C('a2a1f0c1-0001-4a7a-9a01-000000000001', 'home.azal-sky', L('أزل — السماء والقارورة', 'AZAL — Sky & bottle'), 'sicon-image', [
    note('azal-sky-desc', '<p>الفيلم الافتتاحي: يهبط الزائر بالتمرير عبر السحب حتى القارورة. اترك الصور فارغة لاستخدام رسومات الثيم.</p>'),
    text('eyebrow', 'عنوان صغير', 'دار عطور'),
    text('heading', 'اسم العلامة (اتركه فارغًا لاسم المتجر)', null),
    text('tagline', 'الشعار', 'عطرٌ لا يُنسى'),
    text('cta', 'نص الزر', 'ابدأ الرحلة'),
    text('scroll_label', 'تلميح التمرير', 'مرّر'),
    text('manifesto_label', 'عنوان البيان', 'البيان'),
    text('manifesto', 'نص البيان (سطر لكل جملة)', 'كل عطر يبدأ بعيدًا عن القارورة…\nفي حقلٍ عند الفجر، في يدٍ تقطفه،\nوفي صبر من يصنعه.', 'textarea'),
    product('product', 'القارورة ترتبط بمنتج'),
    image('bottle_image', 'صورة قارورة مخصصة (PNG شفافة)', 'اتركها فارغة لاستخدام القارورة الدوّارة. المقاس 1000×1286'),
    image('sky_image', 'صورة سماء مخصصة', 'المقاس 2560×1440 أو أكبر'),
  ]),
  C('a2a1f0c1-0002-4a7a-9a01-000000000002', 'home.azal-origins', L('أزل — الأصل', 'AZAL — Origins'), 'sicon-layers', [
    note('azal-origins-desc', '<p>مشهد ثابت يتبدّل فصلًا بعد فصل مع التمرير. اترك الصور فارغة لاستخدام صور الثيم.</p>'),
    text('label', 'عنوان صغير', '03 — الأصل'),
    {
      id: 'chapters', type: 'collection', format: 'collection', required: true, minLength: 1, maxLength: 6, label: 'الفصول', item_label: 'فصل',
      value: [
        { 'chapters.name': 'الأرض', 'chapters.title': 'حيث تستيقظ الوردة', 'chapters.text': 'حقول في المرتفعات، والضباب ما زال في الأودية، وأول ضوء على البتلات.' },
        { 'chapters.name': 'اليد', 'chapters.title': 'تُقطف قبل الشمس', 'chapters.text': 'باليد، عند الفجر، والعطر ما زال محفوظًا داخل البتلة.' },
        { 'chapters.name': 'الصنعة', 'chapters.title': 'قطرةً قطرة', 'chapters.text': 'نحاس وبخار ووقت — حتى تبقى قطرة زيت واحدة.' },
        { 'chapters.name': 'الزمن', 'chapters.title': 'العود لا يستعجل', 'chapters.text': 'راتنج يحتاج سنوات ليتكوّن، ودخان يأخذ وقته ليصعد.' },
      ],
      // images live outside the list: Salla treats an image inside a repeating list as required
      fields: [
        text('chapters.name', 'اسم الفصل', null),
        text('chapters.title', 'العنوان', null),
        text('chapters.text', 'النص', null, 'textarea'),
      ],
    },
    ...[1, 2, 3, 4, 5, 6].map((n) => image(`image_${n}`, `صورة الفصل ${n} (اختياري)`, 'المقاس 2560×1440 — اتركها فارغة لاستخدام صور الثيم')),
  ]),
  C('a2a1f0c1-0003-4a7a-9a01-000000000003', 'home.azal-notes', L('أزل — نوتات العطر', 'AZAL — Fragrance notes'), 'sicon-drop', [
    note('azal-notes-desc', '<p>تمتلئ القارورة طبقة بعد طبقة (القمة، القلب، القاعدة) وتصعد المكونات خلفها.</p>'),
    product('product', 'العطر'),
    text('label', 'عنوان صغير', '04 — داخل العطر'),
    text('title', 'العنوان (اتركه فارغًا لاسم المنتج)', null),
    text('name_top', 'اسم الطبقة الأولى', 'القمة'),
    text('notes_top', 'نوتات القمة', 'برغموت، فلفل وردي، زعفران'),
    text('name_heart', 'اسم الطبقة الثانية', 'القلب'),
    text('notes_heart', 'نوتات القلب', 'ورد طائفي، ياسمين'),
    text('name_base', 'اسم الطبقة الثالثة', 'القاعدة'),
    text('notes_base', 'نوتات القاعدة', 'عود، عنبر، مسك أبيض'),
    image('bottle_top', 'القارورة ممتلئة حتى القمة (PNG شفافة)', 'اترك الصور الثلاث فارغة لاستخدام قارورة الثيم'),
    image('bottle_heart', 'القارورة ممتلئة حتى القلب', null),
    image('bottle_full', 'القارورة ممتلئة', null),
    color('tint_top', 'لون الخلفية — القمة', '#e9cfc3'),
    color('tint_heart', 'لون الخلفية — القلب', '#b9636a'),
    color('tint_base', 'لون الخلفية — القاعدة', '#3a1418'),
  ]),
  C('a2a1f0c1-0004-4a7a-9a01-000000000004', 'home.azal-collection', L('أزل — المجموعة', 'AZAL — Collection slider'), 'sicon-list-play', [
    note('azal-collection-desc', '<p>القارورة النشطة كبيرة في المنتصف والبقية صغيرة على الجانبين. اسحب أو استخدم الأسهم.</p>'),
    text('label', 'عنوان صغير', '05 — المجموعة'),
    text('title', 'العنوان', 'دار واحدة، وخمس شخصيات.'),
    product('products', 'المنتجات', true, 12),
    text('colors', 'ألوان الخلفية (لون لكل منتج، سطر لكل لون)', '#efdcd2\n#ead6c2\n#ecebe6\n#f0dcc0\n#e6e0e6\n#ece4da', 'textarea', { multilanguage: false }),
    text('view_all_url', 'رابط "كل العطور"', null, 'text', { multilanguage: false }),
  ]),
  C('a2a1f0c1-0005-4a7a-9a01-000000000005', 'home.azal-finale', L('أزل — الخاتمة', 'AZAL — Finale'), 'sicon-moon', [
    text('top', 'السطر الأول', 'ما يبقى…'),
    text('bottom', 'السطر الثاني', 'هو ما ترتديه'),
    text('cta', 'نص الزر', 'العودة إلى السماء'),
    text('link', 'رابط الزر (فارغ = العودة للأعلى)', null, 'text', { multilanguage: false }),
    image('image', 'صورة مخصصة بدل الغروب', null),
  ]),
];
t.components = [...AZAL_COMPONENTS, ...t.components.filter((c) => !String(c.path).startsWith('home.azal-'))];

writeFileSync(file, JSON.stringify(t, null, 4) + '\n');
console.log(`twilight.json: ${AZAL_SETTINGS.length} AZAL settings, ${AZAL_COMPONENTS.length} AZAL components`);
