
const { Product, Category, ProductImage, ProductVariant, Inventory, User } = require('../models');
const { Op } = require('sequelize');

const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

