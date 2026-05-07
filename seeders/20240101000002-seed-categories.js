'use strict';

const IDS = {
  electronics: 'b0000000-0000-0000-0000-000000000001',
  phones:      'b0000000-0000-0000-0000-000000000002',
  laptops:     'b0000000-0000-0000-0000-000000000003',
  fashion:     'b0000000-0000-0000-0000-000000000004',
  mens:        'b0000000-0000-0000-0000-000000000005',
  womens:      'b0000000-0000-0000-0000-000000000006',
  home:        'b0000000-0000-0000-0000-000000000007',
  kitchen:     'b0000000-0000-0000-0000-000000000008',
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Insert parents first, then children
    await queryInterface.bulkInsert('categories', [
      // Top-level
      {
        id:            IDS.electronics,
        name:          'Electronics',
        slug:          'electronics',
        description:   'Gadgets, devices and all things electronic',
        parent_id:     null,
        is_active:     true,
        display_order: 1,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.fashion,
        name:          'Fashion',
        slug:          'fashion',
        description:   'Clothing, footwear and accessories',
        parent_id:     null,
        is_active:     true,
        display_order: 2,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.home,
        name:          'Home & Living',
        slug:          'home-living',
        description:   'Furniture, decor and household items',
        parent_id:     null,
        is_active:     true,
        display_order: 3,
        created_at:    now,
        updated_at:    now,
      },
      // Electronics children
      {
        id:            IDS.phones,
        name:          'Phones & Tablets',
        slug:          'phones-tablets',
        description:   'Smartphones, feature phones and tablets',
        parent_id:     IDS.electronics,
        is_active:     true,
        display_order: 1,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.laptops,
        name:          'Laptops & Computers',
        slug:          'laptops-computers',
        description:   'Laptops, desktops and accessories',
        parent_id:     IDS.electronics,
        is_active:     true,
        display_order: 2,
        created_at:    now,
        updated_at:    now,
      },
      // Fashion children
      {
        id:            IDS.mens,
        name:          "Men's Fashion",
        slug:          'mens-fashion',
        description:   'Shirts, trousers, shoes and more for men',
        parent_id:     IDS.fashion,
        is_active:     true,
        display_order: 1,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.womens,
        name:          "Women's Fashion",
        slug:          'womens-fashion',
        description:   'Dresses, tops, shoes and more for women',
        parent_id:     IDS.fashion,
        is_active:     true,
        display_order: 2,
        created_at:    now,
        updated_at:    now,
      },
      // Home children
      {
        id:            IDS.kitchen,
        name:          'Kitchen & Dining',
        slug:          'kitchen-dining',
        description:   'Cookware, utensils and dining sets',
        parent_id:     IDS.home,
        is_active:     true,
        display_order: 1,
        created_at:    now,
        updated_at:    now,
      },
    ], {});
  },

  async down(queryInterface) {
    // Delete children before parents to avoid FK violation
    await queryInterface.bulkDelete('categories', {
      slug: [
        'phones-tablets','laptops-computers',
        'mens-fashion','womens-fashion',
        'kitchen-dining',
        'electronics','fashion','home-living',
      ]
    }, {});
  }
};
