'use strict';

const bcrypt = require('bcrypt');

// Fixed IDs — referenced by all subsequent seeders
const IDS = {
  superAdmin: 'a0000000-0000-0000-0000-000000000001',
  admin:      'a0000000-0000-0000-0000-000000000002',
  vendor1:    'a0000000-0000-0000-0000-000000000003',
  vendor2:    'a0000000-0000-0000-0000-000000000004',
  customer1:  'a0000000-0000-0000-0000-000000000005',
  customer2:  'a0000000-0000-0000-0000-000000000006',
  customer3:  'a0000000-0000-0000-0000-000000000007',
};

module.exports = {
  async up(queryInterface) {
    const hash = (pw) => bcrypt.hash(pw, 10);

    const [superHash, adminHash, vendorHash, custHash] = await Promise.all([
      hash('SuperAdmin123!'),
      hash('Admin123!'),
      hash('Vendor123!'),
      hash('Customer123!'),
    ]);

    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id:                IDS.superAdmin,
        first_name:        'Super',
        last_name:         'Admin',
        email:             'superadmin@acocie.com',
        phone:             '+254700000001',
        password_hash:     superHash,
        role:              'super_admin',
        status:            'active',
        is_verified:       true,
        profile_completed: true,
        last_login_at:     now,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.admin,
        first_name:        'Jane',
        last_name:         'Admin',
        email:             'admin@acocie.com',
        phone:             '+254700000002',
        password_hash:     adminHash,
        role:              'admin',
        status:            'active',
        is_verified:       true,
        profile_completed: true,
        last_login_at:     now,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.vendor1,
        first_name:        'Brian',
        last_name:         'Kamau',
        email:             'vendor1@acocie.com',
        phone:             '+254700000003',
        password_hash:     vendorHash,
        role:              'vendor',
        status:            'active',
        is_verified:       true,
        profile_completed: true,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.vendor2,
        first_name:        'Grace',
        last_name:         'Wanjiru',
        email:             'vendor2@acocie.com',
        phone:             '+254700000004',
        password_hash:     vendorHash,
        role:              'vendor',
        status:            'active',
        is_verified:       true,
        profile_completed: true,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.customer1,
        first_name:        'Alex',
        last_name:         'Odhiambo',
        email:             'customer1@acocie.com',
        phone:             '+254700000005',
        password_hash:     custHash,
        role:              'customer',
        status:            'active',
        is_verified:       true,
        profile_completed: true,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.customer2,
        first_name:        'Mercy',
        last_name:         'Achieng',
        email:             'customer2@acocie.com',
        phone:             '+254700000006',
        password_hash:     custHash,
        role:              'customer',
        status:            'active',
        is_verified:       true,
        profile_completed: false,
        created_at:        now,
        updated_at:        now,
      },
      {
        id:                IDS.customer3,
        first_name:        'Kevin',
        last_name:         'Mwangi',
        email:             'customer3@acocie.com',
        phone:             '+254700000007',
        password_hash:     custHash,
        role:              'customer',
        status:            'suspended',
        is_verified:       false,
        profile_completed: false,
        created_at:        now,
        updated_at:        now,
      },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: [
        'superadmin@acocie.com',
        'admin@acocie.com',
        'vendor1@acocie.com',
        'vendor2@acocie.com',
        'customer1@acocie.com',
        'customer2@acocie.com',
        'customer3@acocie.com',
      ]
    }, {});
  }
};
