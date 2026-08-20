export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  inStock: boolean;
  rating: number;
};

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description: string;
};

export type StoreInfo = {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  phoneFormatted: string;
  hours: string[];
  delivery: {
    freeShippingThreshold: number;
    deliveryTime: string;
    locations: string;
  };
  returns: string;
  faq: { q: string; a: string }[];
};

export const products: Product[] = [
  {
    id: "serum-hydra",
    name: "HydraGlow Hydrating Serum",
    price: 1499,
    category: "Skincare",
    description:
      "Lightweight hyaluronic acid serum that deeply hydrates and plumps the skin. Fragrance-free and suitable for all skin types.",
    inStock: true,
    rating: 4.8,
  },
  {
    id: "cream-vitc",
    name: "Radiance Vitamin C Cream",
    price: 1999,
    category: "Skincare",
    description:
      "Brightening day cream infused with 10% Vitamin C and SPF 30. Fades dark spots and evens skin tone.",
    inStock: true,
    rating: 4.7,
  },
  {
    id: "foundation-silk",
    name: "Silk Matte Foundation",
    price: 1799,
    category: "Makeup",
    description:
      "Long-wearing matte foundation with buildable coverage. Available in 24 shades.",
    inStock: true,
    rating: 4.5,
  },
  {
    id: "lip-velvet",
    name: "Velvet Matte Lipstick",
    price: 899,
    category: "Makeup",
    description:
      "Creamy matte lipstick that stays for 8 hours. Rich pigment, 12 shades available.",
    inStock: false,
    rating: 4.6,
  },
  {
    id: "sunscreen-gel",
    name: "Invisible Sunscreen Gel SPF 50",
    price: 1249,
    category: "Skincare",
    description:
      "Feather-light gel sunscreen with no white cast. Non-comedogenic, water resistant.",
    inStock: true,
    rating: 4.9,
  },
  {
    id: "set-glow",
    name: "Glow Starter Kit",
    price: 3499,
    category: "Bundles",
    description:
      "Curated skincare kit with the hydrating serum, Vitamin C cream and a cleansing balm at a special price.",
    inStock: true,
    rating: 4.8,
  },
];

export const services: Service[] = [
  {
    id: "consult-skin",
    name: "Skin Analysis Consultation",
    durationMin: 30,
    price: 499,
    description:
      "One-on-one session with a certified dermatologist-stylist to build your personalised skincare routine.",
  },
  {
    id: "makeup-appt",
    name: "Makeup Appointment",
    durationMin: 60,
    price: 1999,
    description:
      "Full-glam makeup application for events, done in-store by our makeup artists.",
  },
  {
    id: "lash-brows",
    name: "Lash & Brow Studio",
    durationMin: 45,
    price: 1499,
    description:
      "Lash lift, brow shaping and tinting for a polished, natural look.",
  },
];

export const storeInfo: StoreInfo = {
  name: "Ay Cosmetics",
  tagline: "Beauty that cares for you",
  email: "support@aycosmetics.com",
  phone: "+92 300 1112233",
  phoneFormatted: "+92-300-1112233",
  hours: [
    "Monday – Friday: 10:00 AM – 9:00 PM",
    "Saturday: 11:00 AM – 8:00 PM",
    "Sunday: Closed (online orders still processed)",
  ],
  delivery: {
    freeShippingThreshold: 2500,
    deliveryTime: "2–4 business days within Pakistan, 5–7 days internationally.",
    locations: "We ship across all of Pakistan — Islamabad, Lahore, Karachi and all major cities.",
  },
  returns:
    "You have 7 days from delivery to initiate a return. Products must be unused and in original packaging. Refunds are processed within 5-7 business days after quality check.",
  faq: [
    {
      q: "What payment methods do you accept?",
      a: "We accept Cash on Delivery (COD), all major debit/credit cards, and bank transfer (JazzCash, Easypaisa, and Mobile banking).",
    },
    {
      q: "How do I track my order?",
      a: "After dispatch you receive a tracking link via SMS and email. You can also share your order ID here and I'll check the status for you.",
    },
    {
      q: "Can I cancel or change my order?",
      a: "Orders can be cancelled within 2 hours of placement if they haven't been packed. Contact us with your order ID.",
    },
    {
      q: "Do your products suit sensitive skin?",
      a: "All Ay Cosmetics products are dermatologist tested and free from parabens and sulfates. If you have known allergies, we recommend the patch test — our support team can also advise.",
    },
    {
      q: "How do I book a consultation or appointment?",
      a: "Just tell me which service you'd like (Skin Analysis, Makeup Appointment, or Lash & Brow) and a preferred date and time. Appointments are available during store hours.",
    },
  ],
};

export function buildKnowledgeContext(): string {
  const serviceLines = services
    .map(
      (s) =>
        `- ${s.name} (${s.id}): ${s.durationMin} minutes, Rs. ${s.price}, ${s.description}`
    )
    .join("\n");

  const productLines = products
    .map(
      (p) =>
        `- ${p.name} (${p.id}): Rs. ${p.price} — ${p.description} Category: ${p.category}. ${p.inStock ? "In stock." : "Currently out of stock."} Rating: ${p.rating}/5`
    )
    .join("\n");

  const faqLines = storeInfo.faq
    .map((f) => `Q: ${f.q}\nA: ${f.a}`)
    .join("\n\n");

  return `
STORE: ${storeInfo.name} — "${storeInfo.tagline}"
CONTACT: email ${storeInfo.email} | phone ${storeInfo.phoneFormatted}
HOURS: ${storeInfo.hours.join(" | ")}

DELIVERY
- Free shipping on orders above Rs. ${storeInfo.delivery.freeShippingThreshold}.
- ${storeInfo.delivery.deliveryTime}
- ${storeInfo.delivery.locations}

RETURNS: ${storeInfo.returns}

PRODUCTS:
${productLines}

SERVICES & BOOKING:
${serviceLines}

FAQ:
${faqLines}
`.trim();
}