
const {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderTracking,
  OrderNote,
  Product,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const recordStatusChange = async (orderId, oldStatus, newStatus, userId, reason = null) => {
  await OrderStatusHistory.create({
    orderId,
    oldStatus,
    newStatus,
    changedByUserId: userId,
    changeReason: reason
  });
};