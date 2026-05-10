'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('product_images', 's3_key', {
      type:      Sequelize.STRING(700),
      allowNull: true,
      comment:   'S3 object key used to delete the file when the image record is removed'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('product_images', 's3_key');
  }
};
