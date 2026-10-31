'use strict';

/**
 * Changes users.role from an ENUM to VARCHAR with a foreign key to roles.name,
 * so custom roles are possible later. Needs the roles table and its rows.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
        ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer';
        DROP TYPE IF EXISTS "enum_users_role";
        ALTER TABLE users ADD CONSTRAINT users_role_fkey
          FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE ON DELETE RESTRICT;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_fkey;
        ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
        CREATE TYPE "enum_users_role" AS ENUM ('customer', 'vendor_pending', 'vendor', 'admin', 'super_admin');
        ALTER TABLE users ALTER COLUMN role TYPE "enum_users_role" USING role::"enum_users_role";
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer';
      `, { transaction });
    });
  }
};
