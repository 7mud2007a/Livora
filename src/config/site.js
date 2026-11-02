// Editable site configuration.
// Everything marked "placeholder" is deliberately not real: replace it before launch.

export const SITE = {
  name: 'LIVORA',

  // Canonical URL, used for the Open Graph image. Set PUBLIC_SITE_URL in .env (see .env.example).
  url: import.meta.env.PUBLIC_SITE_URL || '',

  contact: {
    // PLACEHOLDERS — not real contact details.
    email: 'studio@livora.example',
    phone: '+000 000 000 0000',
    address: {
      en: ['Studio address line', 'City, Country'],
      ar: ['عنوان الاستوديو', 'المدينة، الدولة'],
    },
    // The contact form posts JSON here (any Formspree-style / serverless endpoint).
    // Leave empty and the form validates, then tells the visitor honestly that nothing was sent.
    endpoint: import.meta.env.PUBLIC_CONTACT_ENDPOINT || '',
  },

  // PLACEHOLDERS — point these at the real profiles.
  social: [
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
    { id: 'pinterest', label: 'Pinterest', href: 'https://www.pinterest.com/' },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  ],

  // Required credit line. Do not change the URL.
  credit: { text: '7mud', href: 'https://sevenmud-web-y0dt.onrender.com' },
};

// Asset locations (everything in /public is served from the site root).
export const ASSETS = {
  model: '/models/chair_fast.glb',
  draco: '/draco/',
};
