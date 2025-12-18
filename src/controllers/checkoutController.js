const { 
  Cart, 
  CartItem, 
  Order, 
  OrderItem, 
  Product, 
  ProductVariant, 
  Inventory,
  Address,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const calculateOrderTotals= (items,shippingCost = 0,taxRate = 0.16) => {
    const subtotal = items.reduce((sum,item) => {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
    },0);

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount + shippingCost;

    return {
        subtotal: subtotal.toFixed(2),
        taxAmount:taxAmount.toFixed(2),
        shippingCost:shippingCost.toFixed(2),
        totalAmount:totalAmount.toFixed(2)
    };
};

