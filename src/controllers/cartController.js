
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

