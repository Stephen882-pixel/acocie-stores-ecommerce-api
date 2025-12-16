

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductVariant = sequelize.define('ProductVariant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id'
      }
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'E.g., "Large - Red", "XL - Blue"'
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'JSON: {size: "L", color: "Red"}'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Override product price if set'
    },
    comparePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'compare_price'
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'stock_quantity',
      validate: {
        min: 0
      }
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url',
      comment: 'Variant-specific image'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'product_variants',
    indexes: [
      { fields: ['product_id'] },
      { fields: ['sku'] },
      { fields: ['is_active'] }
    ]
  });

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return ProductVariant;
};