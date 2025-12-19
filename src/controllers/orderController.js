
const {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderTracking,
  OrderCancellation,
  OrderNote,
  Address,
  Product,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const getOrderHistory = async(req,res) => {
    try{
        
    } catch (error){
        console.error('Error in getOrderHistory:',error);
        res.status(500).json({error:'Failef to fetch order history'});
    }
};