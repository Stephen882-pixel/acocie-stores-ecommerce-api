'use strict';

const { v4: uuidv4 } = require('uuid');

const USER = {
  admin:     'a0000000-0000-0000-0000-000000000002',
  vendor1:   'a0000000-0000-0000-0000-000000000003',
  vendor2:   'a0000000-0000-0000-0000-000000000004',
  customer1: 'a0000000-0000-0000-0000-000000000005',
  customer2: 'a0000000-0000-0000-0000-000000000006',
};
const ADDR = {
  customer1Home: 'c0000000-0000-0000-0000-000000000001',
  customer2Home: 'c0000000-0000-0000-0000-000000000003',
};
const PROD = {
  galaxyS24:  'd0000000-0000-0000-0000-000000000001',
  iphone15:   'd0000000-0000-0000-0000-000000000002',
  linenShirt: 'd0000000-0000-0000-0000-000000000004',
  floraDress: 'd0000000-0000-0000-0000-000000000006',
  kettleSet:  'd0000000-0000-0000-0000-000000000007',
};
const VAR = {
  galaxyS24_128: 'e0000000-0000-0000-0000-000000000001',
  iphone15_128:  'e0000000-0000-0000-0000-000000000003',
  linenShirt_M:  'e0000000-0000-0000-0000-000000000006',
  floraDress_S:  'e0000000-0000-0000-0000-000000000010',
};

// Order IDs — use fixed so you can test by ID
const ORDER = {
  o1: 'bb000000-0000-0000-0000-000000000001', // customer1 – delivered
  o2: 'bb000000-0000-0000-0000-000000000002', // customer1 – processing
  o3: 'bb000000-0000-0000-0000-000000000003', // customer2 – pending
  o4: 'bb000000-0000-0000-0000-000000000004', // customer2 – cancelled
};

module.exports = {
  async up(queryInterface) {
    const now         = new Date();
    const twoDaysAgo  = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneHourAgo  = new Date(Date.now() - 60 * 60 * 1000);

    // ── ORDERS ────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('orders', [
      {
        id:                 ORDER.o1,
        order_number:       'ORD-202405-00001',
        user_id:            USER.customer1,
        status:             'delivered',
        payment_status:     'paid',
        shipping_address_id: ADDR.customer1Home,
        billing_address_id:  ADDR.customer1Home,
        subtotal:            131998.00,  // 129999 + 2×2499 - 1×999 discount
        tax_amount:          0.00,
        shipping_cost:       299.00,
        discount_amount:     999.00,
        total_amount:        131298.00,
        payment_method:      'mpesa',
        payment_reference:   'MPX240430001',
        notes:               'Please leave at the gate if I am not home.',
        confirmed_at:        sevenDaysAgo,
        shipped_at:          new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000),
        delivered_at:        twoDaysAgo,
        cancelled_at:        null,
        created_at:          sevenDaysAgo,
        updated_at:          twoDaysAgo,
      },
      {
        id:                 ORDER.o2,
        order_number:       'ORD-202405-00002',
        user_id:            USER.customer1,
        status:             'processing',
        payment_status:     'paid',
        shipping_address_id: ADDR.customer1Home,
        billing_address_id:  null,
        subtotal:            89999.00,
        tax_amount:          0.00,
        shipping_cost:       299.00,
        discount_amount:     0.00,
        total_amount:        90298.00,
        payment_method:      'card',
        payment_reference:   'CARD2405060001',
        notes:               null,
        confirmed_at:        twoDaysAgo,
        shipped_at:          null,
        delivered_at:        null,
        cancelled_at:        null,
        created_at:          twoDaysAgo,
        updated_at:          now,
      },
      {
        id:                 ORDER.o3,
        order_number:       'ORD-202405-00003',
        user_id:            USER.customer2,
        status:             'pending',
        payment_status:     'pending',
        shipping_address_id: ADDR.customer2Home,
        billing_address_id:  null,
        subtotal:            8598.00,   // 3999 + 4599
        tax_amount:          0.00,
        shipping_cost:       399.00,
        discount_amount:     0.00,
        total_amount:        8997.00,
        payment_method:      'cash_on_delivery',
        payment_reference:   null,
        notes:               'Call before delivery.',
        confirmed_at:        null,
        shipped_at:          null,
        delivered_at:        null,
        cancelled_at:        null,
        created_at:          oneHourAgo,
        updated_at:          oneHourAgo,
      },
      {
        id:                 ORDER.o4,
        order_number:       'ORD-202405-00004',
        user_id:            USER.customer2,
        status:             'cancelled',
        payment_status:     'refunded',
        shipping_address_id: ADDR.customer2Home,
        billing_address_id:  null,
        subtotal:            3999.00,
        tax_amount:          0.00,
        shipping_cost:       299.00,
        discount_amount:     0.00,
        total_amount:        4298.00,
        payment_method:      'mpesa',
        payment_reference:   'MPX240501002',
        notes:               null,
        confirmed_at:        sevenDaysAgo,
        shipped_at:          null,
        delivered_at:        null,
        cancelled_at:        twoDaysAgo,
        created_at:          sevenDaysAgo,
        updated_at:          twoDaysAgo,
      },
    ], {});

    // ── ORDER ITEMS ───────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('order_items', [
      // Order 1 — iPhone 15 (128GB) x1
      {
        id:           uuidv4(),
        order_id:     ORDER.o1,
        product_id:   PROD.iphone15,
        variant_id:   VAR.iphone15_128,
        vendor_id:    USER.vendor1,
        product_name: 'Apple iPhone 15',
        variant_name: 'iPhone 15 – 128GB Blue',
        sku:          'IPH15-BLU-128',
        quantity:     1,
        unit_price:   129999.00,
        subtotal:     129999.00,
        created_at:   sevenDaysAgo,
        updated_at:   sevenDaysAgo,
      },
      // Order 1 — Linen Shirt M x2
      {
        id:           uuidv4(),
        order_id:     ORDER.o1,
        product_id:   PROD.linenShirt,
        variant_id:   VAR.linenShirt_M,
        vendor_id:    USER.vendor2,
        product_name: 'Classic Linen Shirt',
        variant_name: 'Linen Shirt – M / Navy Blue',
        sku:          'SHIRT-LIN-BLU-M',
        quantity:     2,
        unit_price:   2499.00,
        subtotal:     4998.00,
        created_at:   sevenDaysAgo,
        updated_at:   sevenDaysAgo,
      },
      // Order 2 — Galaxy S24 128GB x1
      {
        id:           uuidv4(),
        order_id:     ORDER.o2,
        product_id:   PROD.galaxyS24,
        variant_id:   VAR.galaxyS24_128,
        vendor_id:    USER.vendor1,
        product_name: 'Samsung Galaxy S24',
        variant_name: 'Galaxy S24 – 128GB Phantom Black',
        sku:          'SGS24-BLK-128',
        quantity:     1,
        unit_price:   89999.00,
        subtotal:     89999.00,
        created_at:   twoDaysAgo,
        updated_at:   twoDaysAgo,
      },
      // Order 3 — Floral Dress S x1
      {
        id:           uuidv4(),
        order_id:     ORDER.o3,
        product_id:   PROD.floraDress,
        variant_id:   VAR.floraDress_S,
        vendor_id:    USER.vendor2,
        product_name: 'Floral Wrap Dress',
        variant_name: 'Floral Dress – S / Red',
        sku:          'DRESS-FLORA-RED-S',
        quantity:     1,
        unit_price:   3999.00,
        subtotal:     3999.00,
        created_at:   oneHourAgo,
        updated_at:   oneHourAgo,
      },
      // Order 3 — Kettle Set x1 (no variant)
      {
        id:           uuidv4(),
        order_id:     ORDER.o3,
        product_id:   PROD.kettleSet,
        variant_id:   null,
        vendor_id:    USER.vendor2,
        product_name: 'Stainless Steel Kettle & Mug Set',
        variant_name: null,
        sku:          'KTCHN-KETTLE-SS',
        quantity:     1,
        unit_price:   4599.00,
        subtotal:     4599.00,
        created_at:   oneHourAgo,
        updated_at:   oneHourAgo,
      },
      // Order 4 (cancelled) — Floral Dress M x1
      {
        id:           uuidv4(),
        order_id:     ORDER.o4,
        product_id:   PROD.floraDress,
        variant_id:   VAR.floraDress_S,
        vendor_id:    USER.vendor2,
        product_name: 'Floral Wrap Dress',
        variant_name: 'Floral Dress – S / Red',
        sku:          'DRESS-FLORA-RED-S',
        quantity:     1,
        unit_price:   3999.00,
        subtotal:     3999.00,
        created_at:   sevenDaysAgo,
        updated_at:   sevenDaysAgo,
      },
    ], {});

    // ── ORDER STATUS HISTORY ──────────────────────────────────────────────────
    await queryInterface.bulkInsert('order_status_history', [
      // Order 1 lifecycle
      { id: uuidv4(), order_id: ORDER.o1, old_status: null,          new_status: 'pending',    changed_by_user_id: null,         change_reason: 'Order created',      created_at: sevenDaysAgo },
      { id: uuidv4(), order_id: ORDER.o1, old_status: 'pending',     new_status: 'confirmed',  changed_by_user_id: USER.admin,   change_reason: 'Payment confirmed',  created_at: sevenDaysAgo },
      { id: uuidv4(), order_id: ORDER.o1, old_status: 'confirmed',   new_status: 'processing', changed_by_user_id: USER.vendor1, change_reason: 'Packing started',    created_at: sevenDaysAgo },
      { id: uuidv4(), order_id: ORDER.o1, old_status: 'processing',  new_status: 'shipped',    changed_by_user_id: USER.vendor1, change_reason: 'Dispatched via DHL', created_at: new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000) },
      { id: uuidv4(), order_id: ORDER.o1, old_status: 'shipped',     new_status: 'delivered',  changed_by_user_id: null,         change_reason: 'Delivered to customer', created_at: twoDaysAgo },
      // Order 2 lifecycle
      { id: uuidv4(), order_id: ORDER.o2, old_status: null,          new_status: 'pending',    changed_by_user_id: null,         change_reason: 'Order created',      created_at: twoDaysAgo },
      { id: uuidv4(), order_id: ORDER.o2, old_status: 'pending',     new_status: 'confirmed',  changed_by_user_id: USER.admin,   change_reason: 'Payment confirmed',  created_at: twoDaysAgo },
      { id: uuidv4(), order_id: ORDER.o2, old_status: 'confirmed',   new_status: 'processing', changed_by_user_id: USER.vendor1, change_reason: 'Preparing shipment', created_at: now },
      // Order 3
      { id: uuidv4(), order_id: ORDER.o3, old_status: null,          new_status: 'pending',    changed_by_user_id: null,         change_reason: 'Order created',      created_at: oneHourAgo },
      // Order 4 cancelled
      { id: uuidv4(), order_id: ORDER.o4, old_status: null,          new_status: 'pending',    changed_by_user_id: null,         change_reason: 'Order created',      created_at: sevenDaysAgo },
      { id: uuidv4(), order_id: ORDER.o4, old_status: 'pending',     new_status: 'confirmed',  changed_by_user_id: USER.admin,   change_reason: 'Payment confirmed',  created_at: sevenDaysAgo },
      { id: uuidv4(), order_id: ORDER.o4, old_status: 'confirmed',   new_status: 'cancelled',  changed_by_user_id: USER.customer2, change_reason: 'Customer requested cancellation', created_at: twoDaysAgo },
    ], {});

    // ── ORDER TRACKING (for shipped/delivered orders) ─────────────────────────
    await queryInterface.bulkInsert('order_tracking', [
      {
        id:                uuidv4(),
        order_id:          ORDER.o1,
        carrier:           'DHL Express',
        tracking_number:   'DHL724050001KE',
        tracking_url:      'https://www.dhl.com/ke/en/home/tracking.html?tracking-id=DHL724050001KE',
        estimated_delivery: twoDaysAgo,
        current_location:  'Delivered',
        tracking_status:   'delivered',
        last_updated:      twoDaysAgo,
        created_at:        new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000),
        updated_at:        twoDaysAgo,
      },
    ], {});

    // ── ORDER NOTES ───────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('order_notes', [
      {
        id:                     uuidv4(),
        order_id:               ORDER.o1,
        user_id:                USER.customer1,
        note_type:              'customer_note',
        content:                'Please leave at the gate if I am not home.',
        is_visible_to_customer: true,
        created_at:             sevenDaysAgo,
        updated_at:             sevenDaysAgo,
      },
      {
        id:                     uuidv4(),
        order_id:               ORDER.o1,
        user_id:                USER.admin,
        note_type:              'admin_note',
        content:                'Customer is a repeat buyer — priority handling.',
        is_visible_to_customer: false,
        created_at:             sevenDaysAgo,
        updated_at:             sevenDaysAgo,
      },
      {
        id:                     uuidv4(),
        order_id:               ORDER.o2,
        user_id:                USER.vendor1,
        note_type:              'vendor_note',
        content:                'Galaxy S24 128GB — stock confirmed and packed.',
        is_visible_to_customer: false,
        created_at:             now,
        updated_at:             now,
      },
      {
        id:                     uuidv4(),
        order_id:               ORDER.o3,
        user_id:                USER.customer2,
        note_type:              'customer_note',
        content:                'Call before delivery.',
        is_visible_to_customer: true,
        created_at:             oneHourAgo,
        updated_at:             oneHourAgo,
      },
    ], {});

    // ── ORDER CANCELLATIONS ───────────────────────────────────────────────────
    await queryInterface.bulkInsert('order_cancellations', [
      {
        id:                   uuidv4(),
        order_id:             ORDER.o4,
        type:                 'cancellation',
        status:               'completed',
        reason:               'Changed my mind — found a better price elsewhere.',
        requested_by_user_id: USER.customer2,
        processed_by_user_id: USER.admin,
        refund_amount:        4298.00,
        refund_method:        'original_payment',
        admin_notes:          'Refund processed via M-Pesa reversal.',
        requested_at:         twoDaysAgo,
        processed_at:         new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000),
        created_at:           twoDaysAgo,
        updated_at:           new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('order_cancellations', { order_id: Object.values(ORDER) }, {});
    await queryInterface.bulkDelete('order_notes',         { order_id: Object.values(ORDER) }, {});
    await queryInterface.bulkDelete('order_tracking',      { order_id: Object.values(ORDER) }, {});
    await queryInterface.bulkDelete('order_status_history',{ order_id: Object.values(ORDER) }, {});
    await queryInterface.bulkDelete('order_items',         { order_id: Object.values(ORDER) }, {});
    await queryInterface.bulkDelete('orders',              { id: Object.values(ORDER) }, {});
  }
};
