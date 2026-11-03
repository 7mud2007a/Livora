// LIVORA product catalogue. Prices are indicative USD estimates.
export const CATEGORIES = ['seating', 'tables', 'lighting', 'storage'];

const spec = (en, ar, valueEn, valueAr) => ({
  label: { en, ar },
  value: { en: valueEn, ar: valueAr },
});

export const PRODUCTS = [
  {
    id: 'sideboard',
    category: 'storage',
    placeholder: false,
    name: { en: 'Fluted Smoked Oak Sideboard', ar: 'خزانة جانبية من البلوط المدخّن' },
    variant: { en: 'Smoked Oak', ar: 'بلوط مدخّن' },
    description: {
      en: 'A long, low architectural sideboard with four handleless fluted doors in matte medium-dark smoked oak. Its recessed plinth and precise vertical rhythm bring quiet structure to the room.',
      ar: 'خزانة جانبية طويلة ومنخفضة بتصميم معماري، تضم أربعة أبواب مخدّدة بلا مقابض من خشب البلوط المدخّن متوسط إلى داكن الدرجة. تمنحها القاعدة الغائرة والتفاصيل العمودية إيقاعًا هادئًا وأنيقًا.',
    },
    specs: [
      spec('Material', 'الخامة', 'Natural smoked oak', 'خشب بلوط مدخّن طبيعي'),
      spec('Doors', 'الأبواب', 'Four fluted push-to-open doors', 'أربعة أبواب مخدّدة بفتح ضغطي'),
      spec('Finish', 'التشطيب', 'Matte', 'مطفي'),
    ],
    price: { amount: 2400, currency: 'USD' },
    image: {
      file: '242195609_1793664003575442.jpg',
      alt: {
        en: 'A long fluted smoked oak sideboard against a warm ivory wall.',
        ar: 'خزانة جانبية طويلة بأبواب مخدّدة من البلوط المدخّن أمام جدار عاجي دافئ.',
      },
    },
  },
  {
    id: 'side-table',
    category: 'tables',
    placeholder: false,
    name: { en: 'Travertine Dining Set', ar: 'طقم طاولة طعام من الترافرتين' },
    variant: { en: 'Round Table · Four Chairs', ar: 'طاولة دائرية · أربعة كراسٍ' },
    description: {
      en: 'A complete dining arrangement with a round natural travertine top, a sculptural fluted smoked-oak pedestal and four upholstered chairs with curved backs.',
      ar: 'طقم طعام متكامل يضم طاولة دائرية بسطح من الترافرتين الطبيعي وقاعدة منحوتة مخدّدة من خشب البلوط المدخّن، مع أربعة كراسٍ منجّدة بظهور منحنية.',
    },
    specs: [
      spec('Tabletop', 'سطح الطاولة', 'Natural ivory travertine', 'ترافرتين طبيعي بلون عاجي'),
      spec('Base', 'القاعدة', 'Fluted smoked oak', 'بلوط مدخّن مخدّد'),
      spec('Chairs', 'الكراسي', 'Four upholstered chairs', 'أربعة كراسٍ منجّدة'),
    ],
    price: { amount: 3200, currency: 'USD' },
    image: {
      file: '273740_1793658179136292.jpg',
      alt: {
        en: 'A round travertine dining table with four taupe upholstered smoked-oak chairs.',
        ar: 'طاولة طعام دائرية من الترافرتين مع أربعة كراسٍ بلون تاوب وأرجل من البلوط المدخّن.',
      },
    },
  },
  {
    id: 'armchair-sage',
    category: 'tables',
    placeholder: false,
    name: { en: 'Sculptural Travertine Console', ar: 'كونسول منحوت من الترافرتين' },
    variant: { en: 'Console · Organic Mirror', ar: 'طاولة كونسول · مرآة عضوية' },
    description: {
      en: 'A refined console with a softly curved ivory travertine top, two rounded walnut supports and a matching organically shaped mirror in a fine warm-bronze frame.',
      ar: 'طاولة كونسول أنيقة بسطح عاجي من الترافرتين ذي انحناءات ناعمة، ترتكز على دعامتين مستديرتين من خشب الجوز، وتعلوها مرآة عضوية بإطار برونزي دافئ ورفيع.',
    },
    specs: [
      spec('Top', 'السطح', 'Warm ivory travertine', 'ترافرتين عاجي دافئ'),
      spec('Supports', 'الدعامات', 'Rounded natural walnut', 'خشب جوز طبيعي مستدير'),
      spec('Mirror', 'المرآة', 'Organic shape, bronze frame', 'شكل عضوي بإطار برونزي'),
    ],
    price: { amount: 1450, currency: 'USD' },
    image: {
      file: '351836598_1793665316117690.jpg',
      alt: {
        en: 'A softly curved travertine console with walnut supports and an organic bronze-framed mirror.',
        ar: 'كونسول من الترافرتين بانحناءات ناعمة ودعامات من الجوز مع مرآة عضوية بإطار برونزي.',
      },
    },
  },
  {
    id: 'floor-lamp',
    category: 'lighting',
    placeholder: false,
    name: { en: 'Arc Floor Lamp', ar: 'مصباح أرضي بقوس' },
    variant: { en: 'Antique Bronze · Travertine', ar: 'برونز معتّق · ترافرتين' },
    description: {
      en: 'A graceful architectural arc in matte brushed antique bronze, anchored by a substantial travertine base and finished with a softly glowing downward-hanging opal globe.',
      ar: 'مصباح بقوس معماري انسيابي من البرونز المعتّق المصقول بلمسة مطفية، ترتكز قائمته على قاعدة متينة من الترافرتين وتنتهي بكرة أوبال مضيئة معلّقة للأسفل.',
    },
    specs: [
      spec('Frame', 'الهيكل', 'Brushed antique bronze', 'برونز معتّق مصقول'),
      spec('Base', 'القاعدة', 'Natural travertine', 'ترافرتين طبيعي'),
      spec('Shade', 'الغطاء', 'Opal glass globe', 'كرة زجاج أوبال'),
    ],
    price: { amount: 850, currency: 'USD' },
    image: {
      file: '791418656_1793663929329415.jpg',
      alt: {
        en: 'A brushed bronze arc floor lamp with a travertine base and hanging opal globe.',
        ar: 'مصباح أرضي بقوس من البرونز المصقول وقاعدة ترافرتين وكرة أوبال معلّقة.',
      },
    },
  },
  {
    id: 'armchair-sand',
    category: 'seating',
    placeholder: false,
    name: { en: 'Greige Walnut Lounge Chair', ar: 'كرسي استرخاء رمادي بيج مع خشب الجوز' },
    variant: { en: 'Warm Greige', ar: 'رمادي بيج دافئ' },
    description: {
      en: 'A deep, low lounge chair with a continuous softly curved back, tactile warm-greige woven upholstery and sculptural natural-walnut side panels.',
      ar: 'كرسي استرخاء عميق ومنخفض بظهر متصل ومنحني بنعومة، وتنجيد من نسيج ملمسه غني بلون رمادي بيج دافئ، مع جوانب منحوتة من خشب الجوز الطبيعي.',
    },
    specs: [
      spec('Upholstery', 'التنجيد', 'Warm-greige textured weave', 'نسيج محبّب بلون رمادي بيج دافئ'),
      spec('Side panels', 'الجوانب', 'Natural walnut', 'خشب جوز طبيعي'),
      spec('Seat', 'المقعد', 'Deep, low-profile', 'عميق ومنخفض'),
    ],
    price: { amount: 1250, currency: 'USD' },
    image: {
      file: 'IMG_20261103_032216.jpg',
      alt: {
        en: 'A sculptural lounge chair upholstered in warm greige fabric with walnut side panels.',
        ar: 'كرسي استرخاء منحوت بتنجيد رمادي بيج دافئ وجوانب من خشب الجوز.',
      },
    },
  },
  {
    id: 'armchair-clay',
    category: 'seating',
    placeholder: false,
    name: { en: 'Curved Bouclé Sofa & Stone Coffee Table', ar: 'كنبة بوكلية منحنية وطاولة قهوة حجرية' },
    variant: { en: 'Ivory Bouclé · Natural Stone', ar: 'بوكلية عاجي · حجر طبيعي' },
    description: {
      en: 'A generously curved low sofa upholstered in textured ivory bouclé, paired with a round sculptural natural-stone coffee table. Styled with a clear vase of white tulips.',
      ar: 'كنبة منخفضة بانحناءات واسعة وتنجيد بوكلية عاجي غني بالملمس، تترافق مع طاولة قهوة دائرية منحوتة من الحجر الطبيعي، وتكتمل بمزهرية شفافة من زهور التوليب البيضاء.',
    },
    specs: [
      spec('Sofa', 'الكنبة', 'Curved ivory bouclé upholstery', 'تنجيد بوكلية عاجي بتصميم منحني'),
      spec('Coffee table', 'طاولة القهوة', 'Round natural stone', 'حجر طبيعي دائري'),
      spec('Set', 'الطقم', 'Sofa and coffee table', 'كنبة وطاولة قهوة'),
    ],
    price: { amount: 3800, currency: 'USD' },
    image: {
      file: 'IMG_20261103_032254.png',
      alt: {
        en: 'A curved ivory bouclé sofa with a round stone coffee table and white tulips.',
        ar: 'كنبة بوكلية عاجية منحنية مع طاولة قهوة حجرية دائرية وزهور توليب بيضاء.',
      },
    },
  },
];

/** Pick the right language from a { en, ar } object. */
export const loc = (obj, lang) => (obj ? obj[lang] ?? obj.en : '');

/** Use the exact uploaded product image; keep legacy fallback for older entries. */
export const productImage = (p) => {
  const src = p.image.file
    ? `/images/products/${p.image.file}`
    : `/images/products/${p.id}-1000.webp`;
  return {
    src,
    srcSet: src,
    width: 1000,
    height: 1250,
  };
};
