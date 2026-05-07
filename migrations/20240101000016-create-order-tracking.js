'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_tracking', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      order_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        unique:     true,
        references: { model: 'orders', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      carrier: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      tracking_number: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true
      },
      tracking_url: {
        type:      Sequelize.STRING(500),
        allowNull: true
      },
      estimated_delivery: {
        type:      Sequelize.DATE,
        allowNull: true
      },
      current_location: {
        type:      Sequelize.STRING(255),
        allowNull: true
      },
      tracking_status: {
        type:      Sequelize.ENUM('in_transit','out_for_delivery','delivered','failed_attempt','returned'),
        allowNull: true
      },
      last_updated: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });

    await queryInterface.addIndex('order_tracking', ['order_id'],        { name: 'tracking_order_idx' });
    await queryInterface.addIndex('order_tracking', ['tracking_number'], { name: 'tracking_number_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_tracking');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_tracking_tracking_status";');
  }
};
