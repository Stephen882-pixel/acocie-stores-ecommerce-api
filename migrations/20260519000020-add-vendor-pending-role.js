'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'vendor_pending';
    `);
  },

  async down(queryInterface, Sequelize) {
    console.warn(
      'Rollback: vendor_pending ENUM value cannot be removed automatically. Remove manually if needed.'
    );
  }
};
