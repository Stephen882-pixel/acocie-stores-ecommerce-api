'use strict';

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_status_history', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      order_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'orders', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      old_status: {
        type:      Sequelize.ENUM(...ORDER_STATUSES),
        allowNull: true
      },
      new_status: {
        type:      Sequelize.ENUM(...ORDER_STATUSES),
        allowNull: false
      },
      changed_by_user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      change_reason: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });

    await queryInterface.addIndex('order_status_history', ['order_id'],   { name: 'order_hist_order_idx' });
    await queryInterface.addIndex('order_status_history', ['created_at'], { name: 'order_hist_created_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_status_history');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_status_history_old_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_status_history_new_status";');
  }
};
