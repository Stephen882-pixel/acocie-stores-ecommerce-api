'use strict';

const { v4: uuidv4 } = require('uuid');

// ── referenced by later seeders ──────────────────────────────────────────────
const VENDOR = {
  vendor1: 'a0000000-0000-0000-0000-000000000003',
  vendor2: 'a0000000-0000-0000-0000-000000000004',
};
const CAT = {
  phones:  'b0000000-0000-0000-0000-000000000002',
  laptops: 'b0000000-0000-0000-0000-000000000003',
  mens:    'b0000000-0000-0000-0000-000000000005',
  womens:  'b0000000-0000-0000-0000-000000000006',
  kitchen: 'b0000000-0000-0000-0000-000000000008',
};

// Product IDs — also imported by the orders seeder
const PROD = {
  galaxyS24:     'd0000000-0000-0000-0000-000000000001',
  iphone15:      'd0000000-0000-0000-0000-000000000002',
  dellXPS:       'd0000000-0000-0000-0000-000000000003',
  linenShirt:    'd0000000-0000-0000-0000-000000000004',
  slimJeans:     'd0000000-0000-0000-0000-000000000005',
  floraDress:    'd0000000-0000-0000-0000-000000000006',
  kettleSet:     'd0000000-0000-0000-0000-000000000007',
};

// Variant IDs — also imported by the orders + cart seeders
const VAR = {
  galaxyS24_128:  'e0000000-0000-0000-0000-000000000001',
  galaxyS24_256:  'e0000000-0000-0000-0000-000000000002',
  iphone15_128:   'e0000000-0000-0000-0000-000000000003',
  iphone15_256:   'e0000000-0000-0000-0000-000000000004',
  linenShirt_S:   'e0000000-0000-0000-0000-000000000005',
  linenShirt_M:   'e0000000-0000-0000-0000-000000000006',
  linenShirt_L:   'e0000000-0000-0000-0000-000000000007',
  slimJeans_30:   'e0000000-0000-0000-0000-000000000008',
  slimJeans_32:   'e0000000-0000-0000-0000-000000000009',
  floraDress_S:   'e0000000-0000-0000-0000-000000000010',
  floraDress_M:   'e0000000-0000-0000-0000-000000000011',
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── PRODUCTS ─────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('products', [
      {
        id:                PROD.galaxyS24,
        vendor_id:         VENDOR.vendor1,
        category_id:       CAT.phones,
        name:              'Samsung Galaxy S24',
        slug:              'samsung-galaxy-s24',
        description:       'The Samsung Galaxy S24 features a 6.2" Dynamic AMOLED display, Snapdragon 8 Gen 3, and a 50MP main camera system.',
        short_description: 'Flagship Android smartphone with AI features',
        sku:               'SGS24-BLK',
        price:             89999.00,
        compare_price:     99999.00,
        cost_price:        75000.00,
        status:            'active',
        is_featured:       true,
        stock_quantity:    50,
        low_stock_threshold: 5,
        weight:            0.17,
        dimensions:        JSON.stringify({ length: 14.7, width: 7.06, height: 0.76 }),
        tags:              '{samsung,smartphone,android,5g}',
        meta_title:        'Samsung Galaxy S24 | Best Price in Kenya',
        view_count:        342,
        sold_count:        18,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.iphone15,
        vendor_id:         VENDOR.vendor1,
        category_id:       CAT.phones,
        name:              'Apple iPhone 15',
        slug:              'apple-iphone-15',
        description:       'iPhone 15 with the Dynamic Island, 48MP main camera, USB-C and A16 Bionic chip.',
        short_description: 'Apple flagship with USB-C and 48MP camera',
        sku:               'APL-IP15-BLU',
        price:             129999.00,
        compare_price:     139999.00,
        cost_price:        110000.00,
        status:            'active',
        is_featured:       true,
        stock_quantity:    30,
        low_stock_threshold: 5,
        weight:            0.17,
        tags:              '{apple,iphone,ios,5g}',
        meta_title:        'Apple iPhone 15 | Buy Online Kenya',
        view_count:        520,
        sold_count:        25,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.dellXPS,
        vendor_id:         VENDOR.vendor1,
        category_id:       CAT.laptops,
        name:              'Dell XPS 15 (2024)',
        slug:              'dell-xps-15-2024',
        description:       'Dell XPS 15 with Intel Core Ultra 7, 32GB RAM, 1TB SSD, OLED display.',
        short_description: 'Premium ultrabook for professionals',
        sku:               'DELL-XPS15-2024',
        price:             249999.00,
        compare_price:     269999.00,
        cost_price:        210000.00,
        status:            'active',
        is_featured:       true,
        stock_quantity:    15,
        low_stock_threshold: 3,
        weight:            1.86,
        dimensions:        JSON.stringify({ length: 34.4, width: 23.0, height: 1.8 }),
        tags:              '{dell,laptop,ultrabook,windows}',
        view_count:        210,
        sold_count:        7,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.linenShirt,
        vendor_id:         VENDOR.vendor2,
        category_id:       CAT.mens,
        name:              'Classic Linen Shirt',
        slug:              'classic-linen-shirt',
        description:       'Breathable 100% linen shirt — perfect for the Kenyan climate. Slim fit, multiple colours.',
        short_description: '100% linen — cool, light & stylish',
        sku:               'SHIRT-LIN-BLU',
        price:             2499.00,
        compare_price:     3200.00,
        cost_price:        1200.00,
        status:            'active',
        is_featured:       false,
        stock_quantity:    120,
        low_stock_threshold: 10,
        weight:            0.20,
        tags:              '{shirt,linen,menswear,casual}',
        view_count:        89,
        sold_count:        34,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.slimJeans,
        vendor_id:         VENDOR.vendor2,
        category_id:       CAT.mens,
        name:              'Slim Fit Denim Jeans',
        slug:              'slim-fit-denim-jeans',
        description:       'Classic slim-fit jeans in premium stretch denim. Available in black and indigo.',
        short_description: 'Premium stretch denim, slim fit',
        sku:               'JEANS-SLIM-BLK',
        price:             3299.00,
        compare_price:     4000.00,
        cost_price:        1800.00,
        status:            'active',
        is_featured:       false,
        stock_quantity:    80,
        low_stock_threshold: 10,
        weight:            0.60,
        tags:              '{jeans,denim,menswear}',
        view_count:        67,
        sold_count:        21,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.floraDress,
        vendor_id:         VENDOR.vendor2,
        category_id:       CAT.womens,
        name:              'Floral Wrap Dress',
        slug:              'floral-wrap-dress',
        description:       'Elegant floral wrap dress in lightweight chiffon. Adjustable waist tie, knee-length.',
        short_description: 'Elegant chiffon wrap dress with floral print',
        sku:               'DRESS-FLORA-RED',
        price:             3999.00,
        compare_price:     5000.00,
        cost_price:        2000.00,
        status:            'active',
        is_featured:       true,
        stock_quantity:    60,
        low_stock_threshold: 8,
        weight:            0.30,
        tags:              '{dress,womenswear,floral,chiffon}',
        view_count:        145,
        sold_count:        28,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                PROD.kettleSet,
        vendor_id:         VENDOR.vendor2,
        category_id:       CAT.kitchen,
        name:              'Stainless Steel Kettle & Mug Set',
        slug:              'stainless-steel-kettle-mug-set',
        description:       'Double-wall insulated 1.5L kettle with 4 matching mugs. Keeps drinks hot for 6 hours.',
        short_description: 'Insulated kettle + 4 mugs set',
        sku:               'KTCHN-KETTLE-SS',
        price:             4599.00,
        compare_price:     5500.00,
        cost_price:        2500.00,
        status:            'active',
        is_featured:       false,
        stock_quantity:    40,
        low_stock_threshold: 5,
        weight:            1.20,
        tags:              '{kitchen,kettle,mugset,stainless}',
        view_count:        55,
        sold_count:        12,
        created_at:        now,
        updated_at:        now,
      },
    ], {});

    // ── PRODUCT IMAGES ────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('product_images', [
      { id: uuidv4(), product_id: PROD.galaxyS24,  image_url: 'https://placehold.co/800x800?text=Galaxy+S24',   alt_text: 'Samsung Galaxy S24 Front', is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.galaxyS24,  image_url: 'https://placehold.co/800x800?text=Galaxy+S24+Back', alt_text: 'Samsung Galaxy S24 Back', is_primary: false, display_order: 2, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.iphone15,   image_url: 'https://placehold.co/800x800?text=iPhone+15',    alt_text: 'Apple iPhone 15',          is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.iphone15,   image_url: 'https://placehold.co/800x800?text=iPhone+15+Side', alt_text: 'iPhone 15 side view',    is_primary: false, display_order: 2, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.dellXPS,    image_url: 'https://placehold.co/800x800?text=Dell+XPS+15',  alt_text: 'Dell XPS 15 open',         is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.linenShirt, image_url: 'https://placehold.co/800x800?text=Linen+Shirt',  alt_text: 'Classic Linen Shirt front', is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.slimJeans,  image_url: 'https://placehold.co/800x800?text=Slim+Jeans',   alt_text: 'Slim Fit Jeans front',     is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.floraDress, image_url: 'https://placehold.co/800x800?text=Floral+Dress', alt_text: 'Floral Wrap Dress front',   is_primary: true,  display_order: 1, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.kettleSet,  image_url: 'https://placehold.co/800x800?text=Kettle+Set',   alt_text: 'Kettle and mug set',       is_primary: true,  display_order: 1, created_at: now, updated_at: now },
    ], {});

    // ── PRODUCT VARIANTS ──────────────────────────────────────────────────────
    await queryInterface.bulkInsert('product_variants', [
      // Galaxy S24
      { id: VAR.galaxyS24_128, product_id: PROD.galaxyS24, sku: 'SGS24-BLK-128', name: 'Galaxy S24 – 128GB Phantom Black', options: JSON.stringify({ storage: '128GB', color: 'Phantom Black' }), price: 89999.00, stock_quantity: 30, is_active: true, created_at: now, updated_at: now },
      { id: VAR.galaxyS24_256, product_id: PROD.galaxyS24, sku: 'SGS24-BLK-256', name: 'Galaxy S24 – 256GB Phantom Black', options: JSON.stringify({ storage: '256GB', color: 'Phantom Black' }), price: 99999.00, stock_quantity: 20, is_active: true, created_at: now, updated_at: now },
      // iPhone 15
      { id: VAR.iphone15_128, product_id: PROD.iphone15, sku: 'IPH15-BLU-128', name: 'iPhone 15 – 128GB Blue',  options: JSON.stringify({ storage: '128GB', color: 'Blue' }),  price: 129999.00, stock_quantity: 15, is_active: true, created_at: now, updated_at: now },
      { id: VAR.iphone15_256, product_id: PROD.iphone15, sku: 'IPH15-BLU-256', name: 'iPhone 15 – 256GB Blue',  options: JSON.stringify({ storage: '256GB', color: 'Blue' }),  price: 149999.00, stock_quantity: 15, is_active: true, created_at: now, updated_at: now },
      // Linen Shirt
      { id: VAR.linenShirt_S, product_id: PROD.linenShirt, sku: 'SHIRT-LIN-BLU-S', name: 'Linen Shirt – S / Navy Blue', options: JSON.stringify({ size: 'S', color: 'Navy Blue' }), price: null, stock_quantity: 40, is_active: true, created_at: now, updated_at: now },
      { id: VAR.linenShirt_M, product_id: PROD.linenShirt, sku: 'SHIRT-LIN-BLU-M', name: 'Linen Shirt – M / Navy Blue', options: JSON.stringify({ size: 'M', color: 'Navy Blue' }), price: null, stock_quantity: 50, is_active: true, created_at: now, updated_at: now },
      { id: VAR.linenShirt_L, product_id: PROD.linenShirt, sku: 'SHIRT-LIN-BLU-L', name: 'Linen Shirt – L / Navy Blue', options: JSON.stringify({ size: 'L', color: 'Navy Blue' }), price: null, stock_quantity: 30, is_active: true, created_at: now, updated_at: now },
      // Slim Jeans
      { id: VAR.slimJeans_30, product_id: PROD.slimJeans, sku: 'JEANS-SLIM-BLK-30', name: 'Slim Jeans – W30 Black', options: JSON.stringify({ waist: '30', color: 'Black' }), price: null, stock_quantity: 40, is_active: true, created_at: now, updated_at: now },
      { id: VAR.slimJeans_32, product_id: PROD.slimJeans, sku: 'JEANS-SLIM-BLK-32', name: 'Slim Jeans – W32 Black', options: JSON.stringify({ waist: '32', color: 'Black' }), price: null, stock_quantity: 40, is_active: true, created_at: now, updated_at: now },
      // Floral Dress
      { id: VAR.floraDress_S, product_id: PROD.floraDress, sku: 'DRESS-FLORA-RED-S', name: 'Floral Dress – S / Red', options: JSON.stringify({ size: 'S', color: 'Red' }), price: null, stock_quantity: 25, is_active: true, created_at: now, updated_at: now },
      { id: VAR.floraDress_M, product_id: PROD.floraDress, sku: 'DRESS-FLORA-RED-M', name: 'Floral Dress – M / Red', options: JSON.stringify({ size: 'M', color: 'Red' }), price: null, stock_quantity: 35, is_active: true, created_at: now, updated_at: now },
    ], {});

    // ── INVENTORY ─────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('inventory', [
      { id: uuidv4(), product_id: PROD.galaxyS24,  total_stock: 50,  available_stock: 47, reserved_stock: 3,  low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.iphone15,   total_stock: 30,  available_stock: 28, reserved_stock: 2,  low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.dellXPS,    total_stock: 15,  available_stock: 14, reserved_stock: 1,  low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.linenShirt,  total_stock: 120, available_stock: 116, reserved_stock: 4, low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.slimJeans,   total_stock: 80,  available_stock: 77, reserved_stock: 3,  low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.floraDress,  total_stock: 60,  available_stock: 58, reserved_stock: 2,  low_stock_alert: false, created_at: now, updated_at: now },
      { id: uuidv4(), product_id: PROD.kettleSet,   total_stock: 40,  available_stock: 39, reserved_stock: 1,  low_stock_alert: false, created_at: now, updated_at: now },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('inventory',        { product_id: Object.values(PROD) }, {});
    await queryInterface.bulkDelete('product_variants', { product_id: Object.values(PROD) }, {});
    await queryInterface.bulkDelete('product_images',   { product_id: Object.values(PROD) }, {});
    await queryInterface.bulkDelete('products',         { id: Object.values(PROD) }, {});
  }
};
