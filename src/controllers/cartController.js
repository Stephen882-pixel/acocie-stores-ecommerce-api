
const {
    Cart,
    CartItem,
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    User
} = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');


const getOrCreateCart = async (userId,sessionId) => {
    let cart;

    if(userId){
        cart = await Cart.findOne({ where: { userId } });
        if(!cart){
            cart = await Cart.create({ userId });
        }
    } else if(sessionId){
        cart = await Cart.findOne({ where: { sessionId } });
        if(!cart){
            const expires_at = new Date(Date.now() + 7 * 24* 60 * 60 * 1000);
            cart = await Cart.create({ sessionId,expires_at });
        }
    }
};


const calculateCartTotals = (items) => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price || item.product.price;
    return sum + (parseFloat(price) * item.quantity);
  }, 0);

  return {
    subtotal: subtotal.toFixed(2),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

