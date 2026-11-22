export const MARKETING_LOCALE_COOKIE = 'storefy_marketing_locale';

export type MarketingLocale = 'bn' | 'en';

export const showcaseTabKeys = [
  'dashboard',
  'products',
  'orders',
  'analytics',
  'storefront',
] as const;

export type ShowcaseTab = (typeof showcaseTabKeys)[number];

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : T extends object
      ? { [Key in keyof T]: Widen<T[Key]> }
      : T;

const english = {
  accessibility: {
    logo: 'Storefy logo',
    chooseLanguage: 'Choose language',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close menu',
    mainNavigation: 'Main navigation',
    dashboardPreview:
      'Storefy dashboard with storefront, products, orders, customer activity, and sales analytics',
    facebook: 'Storefy on Facebook',
    instagram: 'Storefy on Instagram',
  },
  nav: {
    features: 'Features',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    faq: 'FAQ',
    signIn: 'Sign in',
    startFree: 'Start Free',
  },
  pricing: {
    eyebrow: 'Simple, transparent pricing',
    title: 'Plans that grow with your store',
    description:
      'Choose a plan that fits your business and get the tools you need to run your online store.',
    popular: 'Most popular',
    perMonth: '/month',
    getStarted: 'Get started',
    features: {
      limit: 'Up to {count} {item}',
      unlimited: 'Unlimited {item}',
      none: 'No {item}',
      activeProducts: 'active products',
      archivedProducts: 'archived products',
      orders: 'orders',
      storage: '{amount} GB storage',
      storageUnit: 'storage',
      teamMembers: 'team members',
      analytics: 'Analytics dashboard',
      customDomain: 'Custom domain',
    },
  },
  hero: {
    badge: 'Store, products, and orders—together.',
    titleLineOne: 'Build your online store',
    titleLineTwo: 'Keep your business organized',
    description:
      'Arrange your storefront, manage products, and handle orders—all from one simple dashboard.',
    getStarted: 'Get started now',
    demo: 'Watch demo',
    demoAria: 'Watch demo (coming soon)',
    dashboardLabel: 'Storefy Dashboard',
    workspace: 'Workspace',
    imageAlt:
      'Storefy dashboard with storefront, products, orders, customer activity, and sales analytics',
    features: ['Your own storefront', 'Product management', 'Order management'],
  },
  featureSection: {
    eyebrow: 'Features',
    title: `The Essential Tools to Run your Business
All in one Place`,
    description:
      'Organize your storefront, products, orders, and daily work in one workspace.',
    seeMore: 'See More Features',
    seeLess: 'See Less',
    items: [
      {
        id: 'storefront',
        title: 'Online Storefront',
        description:
          'Give your business a professional online store where customers can explore your products and place orders with ease.',
      },
      {
        id: 'dashboard',
        title: 'Business Dashboard',
        description:
          'Manage your everyday store activities, products, orders, and business information from one organized workspace.',
      },
      {
        id: 'products',
        title: 'Product Management',
        description:
          'Add products, update prices and details, manage availability, and keep your product collection organized.',
      },
      {
        id: 'orders',
        title: 'Order Management',
        description:
          'View incoming orders, review customer details, and manage every order from one convenient place.',
      },
      {
        id: 'analytics',
        title: 'Sales & Order Analytics',
        description:
          'Understand your store\u2019s performance with useful insights into sales and order activity.',
      },
      {
        id: 'reviews',
        title: 'Customer Reviews',
        description:
          'Review customer feedback, approve submissions, and manage the reviews displayed on your storefront.',
      },
      {
        id: 'payments',
        title: 'Online Payments',
        description:
          'Make payment management easier by keeping customer payment information connected to their orders.',
      },
      {
        id: 'team',
        title: 'Team Access',
        description:
          'Bring your team into your workspace and give members access according to their responsibilities.',
      },
      {
        id: 'customization',
        title: 'Store Customization',
        description:
          'Personalize your storefront with your brand identity and arrange its sections to match your business.',
      },
      {
        id: 'categories',
        title: 'Product Categories',
        description:
          'Organize products into categories so customers can find what they are looking for more easily.',
      },
      {
        id: 'product-images',
        title: 'Product Image Management',
        description:
          'Upload multiple product photos, arrange their order, and choose the main image customers see first.',
      },
      {
        id: 'order-status',
        title: 'Order Status Tracking',
        description:
          'Keep track of each order\u2019s progress, from processing to delivery or cancellation.',
      },
    ],
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'A simple path from business setup to growth.',
    steps: [
      {
        title: 'Create your store',
        description:
          'Set up your Storefy workspace and get your business organized.',
      },
      {
        title: 'Add your products',
        description:
          'Build your catalog and organize your products in one place.',
      },
      {
        title: 'Manage your business',
        description:
          'Keep your products and operations organized from a single dashboard.',
      },
      {
        title: 'Grow your brand',
        description:
          'Give customers a more professional online experience.',
      },
    ],
  },
  showcase: {
    eyebrow: 'EXPLORE STOREFY',
    title: 'See How Storefy Brings Your Store Together',
    description:
      'Your store, orders, and insights — all in one workspace.',
    tabs: {
      dashboard: 'Business Dashboard',
      products: 'Product Management',
      orders: 'Order Management',
      analytics: 'Sales & Order Insights',
      storefront: 'Online Storefront',
    },
    panels: {
      dashboard: {
        title: 'Business Dashboard',
        description:
          'Get a clear overview of your store and keep track of daily operations from one place.',
        body: [
          'See important store activity at a glance.',
          'Keep track of orders and business performance.',
          'Find the information you need without switching between pages.',
        ],
        image: '/marketing/business-dashboard.webp',
        imageAlt: 'Storefy business dashboard interface',
      },
      products: {
        title: 'Product Management',
        description:
          'Organize your products and keep your catalog up to date with less effort.',
        body: [
          'Add and update product information.',
          'Manage prices, availability, and product details.',
          'Keep your product catalog organized.',
        ],
        image: '/marketing/product-management.webp',
        imageAlt: 'Storefy product management interface',
      },
      orders: {
        title: 'Order Management',
        description:
          'Manage incoming orders and follow their progress from one organized workspace.',
        body: [
          'Review customer orders in one place.',
          'Update order statuses as work progresses.',
          'Find order details whenever you need them.',
        ],
        image: '/marketing/order-management.webp',
        imageAlt: 'Storefy order management interface',
      },
      analytics: {
        title: 'Sales & Order Insights',
        description:
          'Understand your store activity with useful sales and order information.',
        body: [
          'Review sales and order summaries.',
          'Understand changes in business activity.',
          'Make more informed day-to-day decisions.',
        ],
        image: '/marketing/sales-insights.webp',
        imageAlt: 'Storefy sales and order analytics interface',
      },
      storefront: {
        title: 'Online Storefront',
        description:
          'Give your customers a dedicated online place to explore your products and place orders.',
        body: [
          'Present your products in an organized storefront.',
          'Let customers browse product details.',
          'Give customers a convenient way to place orders.',
        ],
        image: '/marketing/online-storefront.webp',
        imageAlt: 'Storefy online storefront interface',
      },
    },
  },
  useCases: {
    eyebrow: 'Use cases',
    title: 'Built for Businesses Ready to Grow.',
    items: [
      {
        title: 'Home-Based Food Businesses',
        description:
          'Keep everyday production, pricing, and orders in one place without the chaos of scattered messages.',
      },
      {
        title: 'Facebook Sellers',
        description:
          'Turn social sales into a cleaner system that feels more professional and easier to manage.',
      },
      {
        title: 'Small Retailers',
        description:
          'Give your shop a more structured workflow for inventory, products, and customer orders.',
      },
      {
        title: 'Growing Online Brands',
        description:
          'Move from manual work to a more organized online storefront as demand grows.',
      },
    ],
  },
  value: {
    eyebrow: 'Value',
    title: 'A cleaner way to grow your business online.',
    description: 'Build a clearer store workflow with:',
    benefits: [
      'Simple setup',
      'Organized business management',
      'Professional storefront experience',
      'One dedicated workspace',
    ],
  },
  callToAction: {
    eyebrow: 'Ready to begin',
    title: 'Ready to Give Your Business a Better Home Online?',
    description:
      'Start building your Storefy workspace and bring your business into a more organized online experience.',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions, answered clearly.',
    items: [
      {
        question: 'What is Storefy?',
        answer:
          'Storefy is a multi-tenant SaaS platform that helps small businesses turn their Facebook-based business into a professional online store. You can manage your products, storefront, business settings, and day-to-day operations from one place.',
      },
      {
        question: 'Who is Storefy for?',
        answer:
          'Storefy is built for small businesses, home-based sellers, Facebook sellers, and growing brands that want a professional online storefront without the cost and complexity of building one from scratch.',
      },
      {
        question: 'Do I need coding knowledge?',
        answer:
          'No. Storefy is designed for business owners, not developers. You can set up your store, manage products, customize your storefront, and manage your business from the dashboard without writing code.',
      },
      {
        question: 'How does Storefy work?',
        answer:
          'Create your Storefy workspace, set up your store, add your products, customize your storefront, and start sharing it with your customers. Storefy provides the dashboard and storefront infrastructure so you can focus on running your business.',
      },
      {
        question: 'Can I manage my products from Storefy?',
        answer:
          'Yes. You can create, edit, organize, feature, archive, and manage your products from the Storefy dashboard. Your product information and images are connected to your storefront, so updates can be managed from one place.',
      },
      {
        question: 'Can I start for free?',
        answer:
          'Yes. You can start with Storefy without an upfront cost. Free and trial access comes with usage limits, while paid plans can provide higher limits and additional features as your business grows.',
      },
      {
        question: 'Can I manage my store from one dashboard?',
        answer:
          'Yes. Storefy brings your store management into one dashboard, giving you a central place to manage products, storefront settings, branding, and other business operations instead of handling everything separately.',
      },
    ],
  },
  footer: {
    description:
      'Storefy helps small businesses turn Facebook-based selling into a professional online store—with products, orders, and storefront management in one place.',
    quickLinks: 'Quick Links',
    contact: 'Get in Touch',
    contactViaApp: 'Contact via app',
    website: 'Storefy website',
    allRightsReserved: 'All rights reserved.',
  },
} as const;

export type MarketingCopy = Widen<typeof english>;

const bengali: MarketingCopy = {
  accessibility: {
    logo: 'Storefy-এর লোগো',
    chooseLanguage: 'ভাষা নির্বাচন করুন',
    openNavigation: 'নেভিগেশন খুলুন',
    closeNavigation: 'মেনু বন্ধ করুন',
    mainNavigation: 'প্রধান নেভিগেশন',
    dashboardPreview:
      'Storefy ড্যাশবোর্ডে স্টোরফ্রন্ট, পণ্য, অর্ডার, গ্রাহক কার্যক্রম ও বিক্রয় বিশ্লেষণ',
    facebook: 'Facebook-এ Storefy',
    instagram: 'Instagram-এ Storefy',
  },
  nav: {
    features: 'ফিচার',
    howItWorks: 'যেভাবে কাজ করে',
    pricing: 'মূল্য',
    faq: 'সাধারণ প্রশ্ন',
    signIn: 'সাইন ইন',
    startFree: 'বিনামূল্যে শুরু করুন',
  },
  pricing: {
    eyebrow: 'সহজ ও স্বচ্ছ মূল্য',
    title: 'আপনার স্টোরের সঙ্গে এগিয়ে চলার পরিকল্পনা',
    description:
      'ব্যবসার উপযোগী পরিকল্পনা বেছে নিয়ে অনলাইন স্টোর পরিচালনার প্রয়োজনীয় টুলগুলো পান।',
    popular: 'জনপ্রিয়',
    perMonth: '/মাস',
    getStarted: 'শুরু করুন',
    features: {
      limit: '{count}টি পর্যন্ত {item}',
      unlimited: 'সীমাহীন {item}',
      none: '{item} নেই',
      activeProducts: 'সক্রিয় পণ্য',
      archivedProducts: 'আর্কাইভ করা পণ্য',
      orders: 'অর্ডার',
      storage: '{amount} GB স্টোরেজ',
      storageUnit: 'স্টোরেজ',
      teamMembers: 'টিম সদস্য',
      analytics: 'অ্যানালিটিক্স ড্যাশবোর্ড',
      customDomain: 'কাস্টম ডোমেইন',
    },
  },
  hero: {
    badge: 'স্টোর, পণ্য ও অর্ডার—এক জায়গায়',
    titleLineOne: 'আপনার অনলাইন স্টোর গড়ুন',
    titleLineTwo: 'ব্যবসা রাখুন গুছিয়ে',
    description:
      'স্টোরফ্রন্ট সাজান, পণ্য পরিচালনা করুন এবং অর্ডার সামলান—সবকিছু এক সহজ ড্যাশবোর্ড থেকে।',
    getStarted: 'এখনই শুরু করুন',
    demo: 'ডেমো দেখুন',
    demoAria: 'ডেমো দেখুন (শীঘ্রই আসছে)',
    dashboardLabel: 'Storefy ড্যাশবোর্ড',
    workspace: 'ওয়ার্কস্পেস',
    imageAlt:
      'Storefy ড্যাশবোর্ডে স্টোরফ্রন্ট, পণ্য, অর্ডার, গ্রাহক কার্যক্রম ও বিক্রয় বিশ্লেষণ',
    features: ['নিজস্ব স্টোরফ্রন্ট', 'পণ্য ব্যবস্থাপনা', 'অর্ডার পরিচালনা'],
  },
  featureSection: {
    eyebrow: 'ফিচার',
    title: 'ব্যবসা পরিচালনার প্রয়োজনীয় টুল, এক জায়গায়',
    description:
      'স্টোরফ্রন্ট, পণ্য, অর্ডার ও দৈনন্দিন কাজ গুছিয়ে পরিচালনা করুন একটি ওয়ার্কস্পেস থেকে।',
    seeMore: 'আরও ফিচার দেখুন',
    seeLess: 'কম ফিচার দেখুন',
    items: [
      {
        id: 'storefront',
        title: 'অনলাইন স্টোরফ্রন্ট',
        description:
          'আপনার ব্যবসার জন্য তৈরি করুন সুন্দর অনলাইন স্টোর, където ক্রেতারা সহজেই পণ্য দেখতে ও অর্ডার করতে পারবেন।',
      },
      {
        id: 'dashboard',
        title: 'ব্যবসার ড্যাশবোর্ড',
        description:
          'একটি গোছানো ড্যাশবোর্ড থেকেই পরিচালনা করুন আপনার পণ্য, অর্ডার এবং ব্যবসার প্রতিদিনের কাজ।',
      },
      {
        id: 'products',
        title: 'পণ্য ব্যবস্থাপনা',
        description:
          'সহজে পণ্য যোগ করুন, দাম ও বিবরণ পরিবর্তন করুন এবং পণ্যের প্রাপ্যতা পরিচালনা করুন।',
      },
      {
        id: 'orders',
        title: 'অর্ডার ব্যবস্থাপনা',
        description:
          'সব অর্ডার এক জায়গায় দেখুন, ক্রেতার তথ্য যাচাই করুন এবং সহজে অর্ডার পরিচালনা করুন।',
      },
      {
        id: 'analytics',
        title: 'বিক্রয় ও অর্ডার বিশ্লেষণ',
        description:
          'বিক্রি ও অর্ডারের গুরুত্বপূর্ণ তথ্য দেখে বুঝুন আপনার ব্যবসার কার্যক্রম কেমন চলছে।',
      },
      {
        id: 'reviews',
        title: 'গ্রাহক রিভিউ',
        description:
          'ক্রেতাদের মতামত পর্যালোচনা করুন এবং আপনার স্টোরে কোন রিভিউ দেখানো হবে তা নিয়ন্ত্রণ করুন।',
      },
      {
        id: 'payments',
        title: 'অনলাইন পেমেন্ট',
        description:
          'অর্ডারের সঙ্গে পেমেন্টের তথ্য গুছিয়ে রাখুন এবং ক্রেতাদের পেমেন্ট পরিচালনা সহজ করুন।',
      },
      {
        id: 'team',
        title: 'টিম অ্যাক্সেস',
        description:
          'টিমের সদস্যদের সঙ্গে কাজ করুন এবং তাদের দায়িত্ব অনুযায়ী প্রয়োজনীয় অ্যাক্সেস দিন।',
      },
      {
        id: 'customization',
        title: 'স্টোর কাস্টমাইজেশন',
        description:
          'নিজের ব্র্যান্ডের পরিচয়ে সাজিয়ে নিন স্টোর এবং পছন্দমতো এর বিভিন্ন অংশ পরিচালনা করুন।',
      },
      {
        id: 'categories',
        title: 'পণ্যের ক্যাটাগরি',
        description:
          'পণ্যগুলো আলাদা ক্যাটাগরিতে সাজান, যাতে ক্রেতারা সহজে পছন্দের পণ্য খুঁজে পান।',
      },
      {
        id: 'product-images',
        title: 'পণ্যের ছবি ব্যবস্থাপনা',
        description:
          'প্রতি পণ্যের একাধিক ছবি যোগ করুন, সাজিয়ে রাখুন এবং প্রধান ছবি নির্ধারণ করুন।',
      },
      {
        id: 'order-status',
        title: 'অর্ডারের স্ট্যাটাস ট্র্যাকিং',
        description:
          'প্রসেসিং থেকে ডেলিভারি বা বাতিল হওয়া পর্যন্ত প্রতিটি অর্ডারের বর্তমান অবস্থা দেখুন।',
      },
    ],
  },
  howItWorks: {
    eyebrow: 'যেভাবে কাজ করে',
    title: 'ব্যবসা গুছিয়ে শুরু করা থেকে এগিয়ে যাওয়া—সহজ কয়েকটি ধাপে।',
    steps: [
      {
        title: 'স্টোর তৈরি করুন',
        description:
          'Storefy ওয়ার্কস্পেস সেটআপ করে ব্যবসার কাজ গুছিয়ে নিন।',
      },
      {
        title: 'পণ্য যোগ করুন',
        description:
          'পণ্যের তালিকা তৈরি করুন এবং সব তথ্য এক জায়গায় সাজান।',
      },
      {
        title: 'ব্যবসা পরিচালনা করুন',
        description:
          'একটি ড্যাশবোর্ড থেকেই পণ্য ও দৈনন্দিন কার্যক্রমের খোঁজ রাখুন।',
      },
      {
        title: 'ব্র্যান্ড এগিয়ে নিন',
        description:
          'ক্রেতাদের দিন আরও পেশাদার অনলাইন অভিজ্ঞতা।',
      },
    ],
  },
  showcase: {
    eyebrow: 'STOREfy এক্সপ্লোর করুন',
    title: 'Storefy কিভাবে আপনার পুরো স্টোর একসাথে রাখে',
    description:
      'আপনার স্টোর, অর্ডার ও সমস্ত তথ্য — এক জায়গায়।',
    tabs: {
      dashboard: 'ব্যবসার ড্যাশবোর্ড',
      products: 'পণ্য ব্যবস্থাপনা',
      orders: 'অর্ডার ব্যবস্থাপনা',
      analytics: 'বিক্রয় ও অর্ডার ইনসাইট',
      storefront: 'অনলাইন স্টোরফ্রন্ট',
    },
    panels: {
      dashboard: {
        title: 'ব্যবসার ড্যাশবোর্ড',
        description: 'এক জায়গা থেকে স্টোরের সারাংশ এবং দৈনন্দিন কার্যক্রম দেখুন।',
        body: [
          'স্টোরের গুরুত্বপূর্ণ কার্যক্রম একনজরে দেখুন।',
          'অর্ডার ও ব্যবসায়িক কার্যকারিতা নজরে রাখুন।',
          'পৃষ্ঠা বদলানো ছাড়াই প্রয়োজনীয় তথ্য খুঁজে পান।',
        ],
        image: '/marketing/business-dashboard.webp',
        imageAlt: 'Storefy ব্যবসার ড্যাশবোর্ডের ইন্টারফেস',
      },
      products: {
        title: 'পণ্য ব্যবস্থাপনা',
        description: 'কম effort-এ পণ্য সাজান এবং catalog সময়মতো হালনাগাদ রাখুন।',
        body: [
          'পণ্যের তথ্য যোগ ও হালনাগাদ করুন।',
          'দাম, প্রাপ্যতা ও পণ্যের বিবরণ পরিচালনা করুন।',
          'পণ্যের catalog গোছালো রাখুন।',
        ],
        image: '/marketing/product-management.webp',
        imageAlt: 'Storefy পণ্য ব্যবস্থাপনার ইন্টারফেস',
      },
      orders: {
        title: 'অর্ডার ব্যবস্থাপনা',
        description: 'এক Workspace থেকে নতুন অর্ডার পরিচালনা করুন এবং অগ্রগতি দেখুন।',
        body: [
          'ক্রেতার অর্ডার এক জায়গায় পর্যালোচনা করুন।',
          'কাজ এগোলে অর্ডারের স্ট্যাটাস হালনাগাদ করুন।',
          'প্রয়োজন অনুযায়ী অর্ডারের বিস্তারিত খুঁজে পান।',
        ],
        image: '/marketing/order-management.webp',
        imageAlt: 'Storefy অর্ডার ব্যবস্থাপনার ইন্টারফেস',
      },
      analytics: {
        title: 'বিক্রয় ও অর্ডার ইনসাইট',
        description: 'বিক্রয় ও অর্ডারের তথ্য দিয়ে আপনার স্টোরের কার্যক্রম বুঝুন।',
        body: [
          'বিক্রয় ও অর্ডারের সারাংশ পর্যালোচনা করুন।',
          'ব্যবসায়িক কার্যক্রমের পরিবর্তন বুঝুন।',
          'দৈনন্দিন সিদ্ধান্ত আরও তথ্যভিত্তিক করুন।',
        ],
        image: '/marketing/sales-insights.webp',
        imageAlt: 'Storefy বিক্রয় ও অর্ডার বিশ্লেষণের ইন্টারফেস',
      },
      storefront: {
        title: 'অনলাইন স্টোরফ্রন্ট',
        description: 'ক্রেতাদের জন্য পণ্য দেখার এবং অর্ডার দেওয়ার একটি নিজস্ব অনলাইন জায়গা তৈরি করুন।',
        body: [
          'সাজানো storefront-এ পণ্য উপস্থাপন করুন।',
          'ক্রেতাদের পণ্যের বিস্তারিত দেখার সুযোগ দিন।',
          'ক্রেতাদের সহজভাবে অর্ডার দেওয়ার সুবিধা দিন।',
        ],
        image: '/marketing/online-storefront.webp',
        imageAlt: 'Storefy অনলাইন স্টোরফ্রন্টের ইন্টারফেস',
      },
    },
  },
  useCases: {
    eyebrow: 'কারা ব্যবহার করতে পারেন',
    title: 'এগিয়ে যেতে প্রস্তুত ব্যবসার জন্য তৈরি।',
    items: [
      {
        title: 'বাসায় তৈরি খাবারের ব্যবসা',
        description:
          'ছড়িয়ে থাকা মেসেজের ঝামেলা ছাড়াই দৈনন্দিন পণ্য, দাম ও অর্ডার রাখুন এক জায়গায়।',
      },
      {
        title: 'ফেসবুকভিত্তিক বিক্রেতা',
        description:
          'সামাজিক মাধ্যমে হওয়া বিক্রিকে দিন আরও পেশাদার ও সহজে পরিচালনাযোগ্য একটি কাঠামো।',
      },
      {
        title: 'ছোট খুচরা বিক্রেতা',
        description:
          'স্টক, পণ্য ও ক্রেতার অর্ডারের জন্য তৈরি করুন আরও গোছানো কার্যপ্রবাহ।',
      },
      {
        title: 'বর্ধনশীল অনলাইন ব্র্যান্ড',
        description:
          'চাহিদা বাড়ার সঙ্গে হাতে করা কাজ থেকে এগিয়ে যান আরও গোছানো অনলাইন স্টোরে।',
      },
    ],
  },
  value: {
    eyebrow: 'আপনার সুবিধা',
    title: 'অনলাইনে ব্যবসা এগিয়ে নেওয়ার আরও গোছানো উপায়।',
    description: 'স্টোর পরিচালনার কাজে পাবেন:',
    benefits: [
      'সহজ সেটআপ',
      'গোছানো ব্যবসা ব্যবস্থাপনা',
      'পেশাদার স্টোরফ্রন্ট',
      'একটি নির্দিষ্ট ওয়ার্কস্পেস',
    ],
  },
  callToAction: {
    eyebrow: 'শুরু করার সময়',
    title: 'আপনার ব্যবসার জন্য অনলাইনে আরও ভালো ঠিকানা তৈরি করুন।',
    description:
      'Storefy ওয়ার্কস্পেস তৈরি করে ব্যবসার কাজগুলোকে আরও গোছানো অনলাইন অভিজ্ঞতায় নিয়ে আসুন।',
  },
  faq: {
    eyebrow: 'সাধারণ প্রশ্ন',
    title: 'আপনার প্রশ্নের সহজ উত্তর।',
    items: [
      {
        question: 'Storefy কী?',
        answer:
          'Storefy একটি মাল্টি-টেন্যান্ট সফটওয়্যার প্ল্যাটফর্ম, যা ছোট ব্যবসাকে ফেসবুকভিত্তিক বিক্রি থেকে পেশাদার অনলাইন স্টোরে এগোতে সাহায্য করে। এক জায়গা থেকে পণ্য, স্টোরফ্রন্ট, ব্যবসার সেটিংস ও দৈনন্দিন কার্যক্রম পরিচালনা করা যায়।',
      },
      {
        question: 'Storefy কাদের জন্য?',
        answer:
          'ছোট ব্যবসা, বাসায় পণ্য তৈরি ও বিক্রি করেন এমন উদ্যোক্তা, ফেসবুকভিত্তিক বিক্রেতা এবং যেসব ব্র্যান্ড সহজে পেশাদার অনলাইন স্টোর চান—তাদের জন্য Storefy তৈরি।',
      },
      {
        question: 'কোডিং জানা কি জরুরি?',
        answer:
          'না। Storefy ডেভেলপারদের নয়, ব্যবসায়ীদের কথা মাথায় রেখে তৈরি। কোড না লিখেই স্টোর সেটআপ, পণ্য ব্যবস্থাপনা, স্টোরফ্রন্ট সাজানো এবং ড্যাশবোর্ড থেকে ব্যবসার কাজ পরিচালনা করতে পারবেন।',
      },
      {
        question: 'Storefy কীভাবে কাজ করে?',
        answer:
          'Storefy ওয়ার্কস্পেস তৈরি করুন, স্টোর সেটআপ করুন, পণ্য যোগ করুন, স্টোরফ্রন্ট সাজান এবং ক্রেতাদের সঙ্গে লিংকটি শেয়ার করুন। ব্যবসা পরিচালনায় মনোযোগ দিতে Storefy দেয় ড্যাশবোর্ড ও স্টোরফ্রন্টের প্রয়োজনীয় অবকাঠামো।',
      },
      {
        question: 'Storefy থেকে কি পণ্য পরিচালনা করা যায়?',
        answer:
          'হ্যাঁ। Storefy ড্যাশবোর্ড থেকে পণ্য তৈরি, সম্পাদনা, সাজানো, সামনে দেখানো, আর্কাইভ এবং পরিচালনা করা যায়। পণ্যের তথ্য ও ছবি স্টোরফ্রন্টের সঙ্গে যুক্ত থাকে, তাই হালনাগাদ এক জায়গা থেকেই করা যায়।',
      },
      {
        question: 'বিনামূল্যে শুরু করা যাবে?',
        answer:
          'হ্যাঁ। শুরুতেই কোনো খরচ ছাড়াই Storefy ব্যবহার শুরু করা যায়। বিনামূল্যের ও ট্রায়াল ব্যবহারে নির্দিষ্ট সীমা থাকে; ব্যবসা বাড়লে পেইড প্ল্যানে আরও বেশি সীমা ও অতিরিক্ত ফিচার পাওয়া যেতে পারে।',
      },
      {
        question: 'একটি ড্যাশবোর্ড থেকেই কি স্টোর পরিচালনা করা যায়?',
        answer:
          'হ্যাঁ। Storefy ড্যাশবোর্ডে পণ্য, স্টোরফ্রন্ট, ব্র্যান্ডিং ও ব্যবসার অন্যান্য কার্যক্রম পরিচালনার জন্য একটি কেন্দ্রীয় জায়গা দেয়—আলাদা আলাদা জায়গায় কাজ করার বদলে।',
      },
    ],
  },
  footer: {
    description:
      'Storefy ছোট ব্যবসাকে ফেসবুকভিত্তিক বিক্রি থেকে পেশাদার অনলাইন স্টোরে এগোতে সাহায্য করে—পণ্য, অর্ডার ও স্টোরফ্রন্ট পরিচালনা থাকে এক জায়গায়।',
    quickLinks: 'দ্রুত লিংক',
    contact: 'যোগাযোগ',
    contactViaApp: 'অ্যাপের মাধ্যমে যোগাযোগ',
    website: 'Storefy ওয়েবসাইট',
    allRightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
  },
};

export const marketingCopy: Record<MarketingLocale, MarketingCopy> = {
  en: english,
  bn: bengali,
};
