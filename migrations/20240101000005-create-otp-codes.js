'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_codes', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      user_id: {
        type:      Sequelize.UUID,
        allowNull: true
      },
      email: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      otp_code: {
        type:      Sequelize.STRING(6),
        allowNull: false
      },
      purpose: {
        type:      Sequelize.ENUM('signup', 'password_reset', 'email_verification'),
        allowNull: false
      },
      is_used: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otp_codes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_otp_codes_purpose";');
  }
};
