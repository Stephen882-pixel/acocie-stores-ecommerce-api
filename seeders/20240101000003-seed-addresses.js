'use strict';

const USER_IDS = {
  vendor1:   'a0000000-0000-0000-0000-000000000003',
  customer1: 'a0000000-0000-0000-0000-000000000005',
  customer2: 'a0000000-0000-0000-0000-000000000006',
};

const IDS = {
  customer1Home:   'c0000000-0000-0000-0000-000000000001',
  customer1Office: 'c0000000-0000-0000-0000-000000000002',
  customer2Home:   'c0000000-0000-0000-0000-000000000003',
  vendor1Home:     'c0000000-0000-0000-0000-000000000004',
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('addresses', [
      {
        id:            IDS.customer1Home,
        user_id:       USER_IDS.customer1,
        label:         'Home',
        full_name:     'Alex Odhiambo',
        phone:         '+254700000005',
        address_line1: '45 Ngong Road',
        address_line2: 'Apt 3B',
        city:          'Nairobi',
        state:         'Nairobi County',
        postal_code:   '00100',
        country:       'Kenya',
        is_default:    true,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.customer1Office,
        user_id:       USER_IDS.customer1,
        label:         'Office',
        full_name:     'Alex Odhiambo',
        phone:         '+254700000005',
        address_line1: 'Westlands Business Park, Block C',
        address_line2: null,
        city:          'Nairobi',
        state:         'Nairobi County',
        postal_code:   '00800',
        country:       'Kenya',
        is_default:    false,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.customer2Home,
        user_id:       USER_IDS.customer2,
        label:         'Home',
        full_name:     'Mercy Achieng',
        phone:         '+254700000006',
        address_line1: '12 Tom Mboya Street',
        address_line2: null,
        city:          'Kisumu',
        state:         'Kisumu County',
        postal_code:   '40100',
        country:       'Kenya',
        is_default:    true,
        created_at:    now,
        updated_at:    now,
      },
      {
        id:            IDS.vendor1Home,
        user_id:       USER_IDS.vendor1,
        label:         'Warehouse',
        full_name:     'Brian Kamau',
        phone:         '+254700000003',
        address_line1: 'Industrial Area, Mombasa Road',
        address_line2: 'Godown 7',
        city:          'Nairobi',
        state:         'Nairobi County',
        postal_code:   '00200',
        country:       'Kenya',
        is_default:    true,
        created_at:    now,
        updated_at:    now,
      },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('addresses', {
      id: Object.values(IDS)
    }, {});
  }
};
