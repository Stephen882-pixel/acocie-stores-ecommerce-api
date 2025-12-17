const { Category, Product } = require('../models');
const { Op } = require('sequelize');

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};


const getAllCategories = async (req, res) => {
  try {
    const { includeInactive, nested } = req.query;

    const where = {};
    
    if (!includeInactive || (req.user?.role !== 'admin' && req.user?.role !== 'super_admin')) {
      where.isActive = true;
    }

    if (nested === 'true') {
      const categories = await Category.findAll({
        where: { ...where, parentId: null },
        include: [
          {
            model: Category,
            as: 'children',
            where: { isActive: true },
            required: false
          }
        ],
        order: [['displayOrder', 'ASC'], ['name', 'ASC']]
      });

      return res.json({ categories });
    }

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({ categories });
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeProducts } = req.query;

    const include = [
      {
        model: Category,
        as: 'parent',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: Category,
        as: 'children',
        where: { isActive: true },
        required: false
      }
    ];

    if (includeProducts === 'true') {
      include.push({
        model: Product,
        as: 'products',
        where: { status: 'active' },
        required: false,
        limit: 20
      });
    }

    const category = await Category.findByPk(id, { include });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category });
  } catch (error) {
    console.error('Error in getCategoryById:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};



const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      parentId,
      imageUrl,
      isActive,
      displayOrder,
      metaTitle,
      metaDescription
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = generateSlug(name);
    let finalSlug = slug;
    let counter = 1;
    
    while (await Category.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    if (parentId) {
      const parent = await Category.findByPk(parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent category not found' });
      }
    }

    const category = await Category.create({
      name,
      slug: finalSlug,
      description,
      parentId,
      imageUrl,
      isActive: isActive !== false,
      displayOrder: displayOrder || 0,
      metaTitle,
      metaDescription
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Error in createCategory:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};


const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }


    if (updates.name && updates.name !== category.name) {
      updates.slug = generateSlug(updates.name);
    }


    if (updates.parentId) {
      if (updates.parentId === id) {
        return res.status(400).json({ error: 'Category cannot be its own parent' });
      }
      const parent = await Category.findByPk(updates.parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent category not found' });
      }
    }

    await category.update(updates);

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }


    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing products' 
      });
    }


    const childrenCount = await Category.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with subcategories' 
      });
    }

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};