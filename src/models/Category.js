
const { DataTypes, sequelize } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: true,
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'display_order'
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
    }
  }, {
    tableName: 'categories',
    indexes: [
      { fields: ['slug'] },
      { fields: ['parent_id'] },
      { fields: ['is_active'] },
      { fields: ['display_order'] }
    ]
  });

  Category.associate = (models) => {
    // Self-referencing for parent-child
    Category.belongsTo(Category, {
      foreignKey: 'parentId',
      as: 'parent'
    });
    
    Category.hasMany(Category, {
      foreignKey: 'parentId',
      as: 'children'
    });

    Category.hasMany(models.Product, {
      foreignKey: 'categoryId',
      as: 'products'
    });
  };

  return Category;
};