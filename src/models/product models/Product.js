
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'vendor_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User with vendor or admin role'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'short_description'
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Stock Keeping Unit'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    comparePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'compare_price',
      comment: 'Original price for discount display'
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_price',
      comment: 'Cost to vendor'
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'inactive', 'out_of_stock'),
      defaultValue: 'draft',
      allowNull: false
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured'
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'stock_quantity',
      validate: {
        min: 0
      }
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'low_stock_threshold'
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Weight in kg'
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON: {length, width, height} in cm'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Array of tags for search'
    },
    metaTitle: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'meta_title'
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_description'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count'
    },
    soldCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sold_count'
    }
  }, {
    tableName: 'products',
    indexes: [
      { fields: ['vendor_id'] },
      { fields: ['category_id'] },
      { fields: ['slug'] },
      { fields: ['sku'] },
      { fields: ['status'] },
      { fields: ['is_featured'] },
      { fields: ['price'] },
      { fields: ['created_at'] }
    ]
  });

  Product.associate = (models) => {
    Product.belongsTo(models.User, {
      foreignKey: 'vendorId',
      as: 'vendor'
    });

    Product.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    Product.hasMany(models.ProductImage, {
      foreignKey: 'productId',
      as: 'images',
      onDelete: 'CASCADE'
    });

    Product.hasMany(models.ProductVariant, {
      foreignKey: 'productId',
      as: 'variants',
      onDelete: 'CASCADE'
    });

    Product.hasOne(models.Inventory, {
      foreignKey: 'productId',
      as: 'inventory',
      onDelete: 'CASCADE'
    });
  };

  return Product;
};