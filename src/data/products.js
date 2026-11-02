// Product catalogue data structure.
//
// EVERY entry below is a clearly-labelled PLACEHOLDER (`placeholder: true`): the catalogue is not final, and
// nothing here describes real stock, real prices or real specifications. Replace entries with the real
// catalogue, or load them from a CMS / API: ProductCard and ProductDialog only depend on this shape.
//
// {
//   id:          unique slug, also the image file prefix in /public/images/products/
//   category:    one of CATEGORIES
//   placeholder: true while the entry is not a real, orderable product
//   name, variant, description:  { en, ar }
//   specs:       [{ label: {en, ar}, value: {en, ar} }]
//   price:       { amount: number | null, currency: 'USD' }   (null => "price to be confirmed")
//   image:       { alt: {en, ar} }  — files are /images/products/<id>-640.webp and <id>-1000.webp
// }

export const CATEGORIES = ['seating', 'tables', 'lighting', 'storage'];

const TBC = { en: 'To be confirmed', ar: 'يُحدَّد لاحقًا' };

export const PRODUCTS = [
  {
    id: 'armchair-sage',
    category: 'seating',
    placeholder: true,
    name: { en: 'Lounge armchair', ar: 'كرسي استرخاء' },
    variant: { en: 'Sage', ar: 'أخضر مريمي' },
    description: {
      en: 'A deep, low seat with a continuous curved back, upholstered in a textured weave and framed by walnut side panels.',
      ar: 'مقعدٌ عميق ومنخفض بظهرٍ منحنٍ متّصل، منجّد بنسيجٍ محبوك الملمس، تؤطّره جوانب من خشب الجوز.',
    },
    specs: [
      { label: { en: 'Upholstery', ar: 'التنجيد' }, value: { en: 'Textured weave', ar: 'نسيج محبوك الملمس' } },
      { label: { en: 'Side panels', ar: 'الجوانب' }, value: { en: 'Walnut', ar: 'خشب الجوز' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'A sage upholstered lounge armchair with walnut side panels against a warm wall.',
        ar: 'كرسي استرخاء منجّد بلون أخضر مريمي مع جوانب من خشب الجوز أمام جدار دافئ.',
      },
    },
  },
  {
    id: 'side-table',
    category: 'tables',
    placeholder: true,
    name: { en: 'Pedestal side table', ar: 'طاولة جانبية بقاعدة' },
    variant: { en: 'Stone', ar: 'حجري' },
    description: {
      en: 'A compact pedestal with a stone-toned top, sized to sit beside a lounge chair or at the end of a sofa.',
      ar: 'قاعدة مدمجة بسطحٍ بدرجة الحجر، بحجمٍ يناسب الوقوف بجانب كرسي استرخاء أو في طرف الأريكة.',
    },
    specs: [
      { label: { en: 'Top', ar: 'السطح' }, value: { en: 'Stone-toned finish', ar: 'تشطيب بدرجة الحجر' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'A pedestal side table with a stone-toned top, holding a small bowl and a book.',
        ar: 'طاولة جانبية بقاعدة وسطحٍ بدرجة الحجر، عليها وعاء صغير وكتاب.',
      },
    },
  },
  {
    id: 'armchair-sand',
    category: 'seating',
    placeholder: true,
    name: { en: 'Lounge armchair', ar: 'كرسي استرخاء' },
    variant: { en: 'Greige', ar: 'رمادي دافئ' },
    description: {
      en: 'The same deep, rounded form in a lighter, warm grey for brighter rooms.',
      ar: 'الشكل العميق المستدير نفسه، بدرجة رمادية دافئة أفتح تناسب الغرف الأكثر إضاءة.',
    },
    specs: [
      { label: { en: 'Upholstery', ar: 'التنجيد' }, value: { en: 'Textured weave', ar: 'نسيج محبوك الملمس' } },
      { label: { en: 'Side panels', ar: 'الجوانب' }, value: { en: 'Walnut', ar: 'خشب الجوز' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'The lounge armchair in a warm grey upholstery.',
        ar: 'كرسي الاسترخاء بتنجيدٍ رمادي دافئ.',
      },
    },
  },
  {
    id: 'floor-lamp',
    category: 'lighting',
    placeholder: true,
    name: { en: 'Globe floor lamp', ar: 'مصباح أرضي كروي' },
    variant: { en: 'Opal globe', ar: 'كرة معتمة ناعمة' },
    description: {
      en: 'A soft, diffused globe on a slim stem. Light that fills a corner without announcing itself.',
      ar: 'كرةٌ ناعمة تنشر الضوء على ساقٍ نحيلة. ضوءٌ يملأ الزاوية دون أن يُعلن عن نفسه.',
    },
    specs: [
      { label: { en: 'Shade', ar: 'الغطاء' }, value: { en: 'Diffusing globe', ar: 'كرة ناشرة للضوء' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'A globe floor lamp on a slim stem, glowing softly against a warm wall.',
        ar: 'مصباح أرضي بكرة ناعمة على ساقٍ نحيلة، يتوهّج بهدوء أمام جدار دافئ.',
      },
    },
  },
  {
    id: 'sideboard',
    category: 'storage',
    placeholder: true,
    name: { en: 'Fluted sideboard', ar: 'خزانة جانبية مخدّدة' },
    variant: { en: 'Walnut', ar: 'خشب الجوز' },
    description: {
      en: 'Low storage with vertically fluted doors, wide enough to hold a lamp, a vase and a few books.',
      ar: 'تخزينٌ منخفض بأبوابٍ مخدّدة عموديًا، عريض بما يكفي لمصباح ومزهرية وبضعة كتب.',
    },
    specs: [
      { label: { en: 'Doors', ar: 'الأبواب' }, value: { en: 'Fluted walnut', ar: 'جوز مخدّد' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'A low fluted walnut sideboard with a vase and a lamp base on top.',
        ar: 'خزانة جانبية منخفضة من خشب الجوز المخدّد، يعلوها مزهرية وقاعدة مصباح.',
      },
    },
  },
  {
    id: 'armchair-clay',
    category: 'seating',
    placeholder: true,
    name: { en: 'Lounge armchair', ar: 'كرسي استرخاء' },
    variant: { en: 'Clay', ar: 'طيني' },
    description: {
      en: 'A warmer, earthier colourway of the lounge armchair, for rooms that lean towards terracotta and timber.',
      ar: 'لونٌ أدفأ وأكثر ترابية لكرسي الاسترخاء، لغرفٍ تميل إلى الطين والخشب.',
    },
    specs: [
      { label: { en: 'Upholstery', ar: 'التنجيد' }, value: { en: 'Textured weave', ar: 'نسيج محبوك الملمس' } },
      { label: { en: 'Side panels', ar: 'الجوانب' }, value: { en: 'Walnut', ar: 'خشب الجوز' } },
      { label: { en: 'Dimensions', ar: 'الأبعاد' }, value: TBC },
    ],
    price: { amount: null, currency: 'USD' },
    image: {
      alt: {
        en: 'The lounge armchair in a clay-coloured upholstery.',
        ar: 'كرسي الاسترخاء بتنجيدٍ بلون الطين.',
      },
    },
  },
];

/** Pick the right language from a { en, ar } object. */
export const loc = (obj, lang) => (obj ? obj[lang] ?? obj.en : '');

/** Image URLs for a product: [640w, 1000w]. */
export const productImage = (p) => ({
  src: `/images/products/${p.id}-1000.webp`,
  srcSet: `/images/products/${p.id}-640.webp 640w, /images/products/${p.id}-1000.webp 1000w`,
  width: 1000,
  height: 1250,
});
