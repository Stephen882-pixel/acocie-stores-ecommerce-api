'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      order_number: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        unique:    true
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      status: {
        type:         Sequelize.ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded'),
        allowNull:    false,
        defaultValue: 'pending'
      },
      payment_status: {
        type:         Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull:    false,
        defaultValue: 'pending'
      },
      shipping_address_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'addresses', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      billing_address_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'addresses', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      subtotal: {
        type:         Sequelize.DECIMAL(10, 2),
        allowNull:    false,
        defaultValue: 0
      },
      tax_amount: {
        type:         Sequelize.DECIMAL(10, 2),
        allowNull:    false,
        defaultValue: 0
      },
      shipping_cost: {
        type:         Sequelize.DECIMAL(10, 2),
        allowNull:    false,
        defaultValue: 0
      },
      discount_amount: {
        type:         Sequelize.DECIMAL(10, 2),
        allowNull:    false,
        defaultValue: 0
      },
      total_amount: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_method: {
        type:      Sequelize.STRING(50),
        allowNull: true
      },
      payment_reference: {
        type:      Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      confirmed_at: {
        type:      Sequelize.DATE,
        allowNull: true
      },
      shipped_at: {
        type:      Sequelize.DATE,
        allowNull: true
      },
      delivered_at: {
        type:      Sequelize.DATE,
        allowNull: true
      },
      cancelled_at: {
        type:      Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('orders', ['order_number'],   { name: 'orders_number_idx' });
    await queryInterface.addIndex('orders', ['user_id'],        { name: 'orders_user_idx' });
    await queryInterface.addIndex('orders', ['status'],         { name: 'orders_status_idx' });
    await queryInterface.addIndex('orders', ['payment_status'], { name: 'orders_payment_idx' });
    await queryInterface.addIndex('orders', ['created_at'],     { name: 'orders_created_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_status";');
  }
};
