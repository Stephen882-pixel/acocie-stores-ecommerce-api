'use strict';

const { v4: uuidv4 } = require('uuid');

const USER_IDS = {
  customer1: 'a0000000-0000-0000-0000-000000000005',
  customer2: 'a0000000-0000-0000-0000-000000000006',
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
  iphone15_256:  'e0000000-0000-0000-0000-000000000004',
  linenShirt_M:  'e0000000-0000-0000-0000-000000000006',
  floraDress_S:  'e0000000-0000-0000-0000-000000000010',
};

const CART = {
  customer1: 'ca000000-0000-0000-0000-000000000001',
  customer2: 'ca000000-0000-0000-0000-000000000002',
  guest:     'ca000000-0000-0000-0000-000000000003',
};

module.exports = {
  async up(queryInterface) {
    const now     = new Date();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Skip entirely if seed data already present
    const [existing] = await queryInterface.sequelize.query(
      `SELECT 1 FROM carts WHERE id = '${CART.customer1}' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existing) return;

    await queryInterface.bulkInsert('carts', [
      {
        id:         CART.customer1,
        user_id:    USER_IDS.customer1,
        session_id: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id:         CART.customer2,
        user_id:    USER_IDS.customer2,
        session_id: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id:         CART.guest,
        user_id:    null,
        session_id: 'guest-session-abc123xyz',
        expires_at: expires,
        created_at: now,
        updated_at: now,
      },
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('cart_items', [
      // customer1 cart — Galaxy S24 (128GB) x1
      {
        id:                uuidv4(),
        cart_id:           CART.customer1,
        product_id:        PROD.galaxyS24,
        variant_id:        VAR.galaxyS24_128,
        quantity:          1,
        price_at_addition: 89999.00,
        created_at:        now,
        updated_at:        now,
      },
      // customer1 cart — Linen Shirt M x2
      {
        id:                uuidv4(),
        cart_id:           CART.customer1,
        product_id:        PROD.linenShirt,
        variant_id:        VAR.linenShirt_M,
        quantity:          2,
        price_at_addition: 2499.00,
        created_at:        now,
        updated_at:        now,
      },
      // customer2 cart — iPhone 15 256GB x1
      {
        id:                uuidv4(),
        cart_id:           CART.customer2,
        product_id:        PROD.iphone15,
        variant_id:        VAR.iphone15_256,
        quantity:          1,
        price_at_addition: 149999.00,
        created_at:        now,
        updated_at:        now,
      },
      // customer2 cart — Floral Dress S x1
      {
        id:                uuidv4(),
        cart_id:           CART.customer2,
        product_id:        PROD.floraDress,
        variant_id:        VAR.floraDress_S,
        quantity:          1,
        price_at_addition: 3999.00,
        created_at:        now,
        updated_at:        now,
      },
      // guest cart — Kettle Set (no variant) x1
      {
        id:                uuidv4(),
        cart_id:           CART.guest,
        product_id:        PROD.kettleSet,
        variant_id:        null,
        quantity:          1,
        price_at_addition: 4599.00,
        created_at:        now,
        updated_at:        now,
      },
    ], {}); // uuidv4 IDs — guarded by the existence check above
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cart_items', { cart_id: Object.values(CART) }, {});
    await queryInterface.bulkDelete('carts',      { id: Object.values(CART) }, {});
  }
};
