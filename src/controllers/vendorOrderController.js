
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

const getVendorOrders = async (req,res) => {
    try{
        const vendorId = req.user.userId;
        const{
            page = 1,
            limit = 20,
            status,
            startDate,
            endDate
        } = req.query;

        const offset = (page - 1) * limit;
        const where = {};

        if(status) where.status = status;
        if(startDate || endDate){
            where.created_at = {};
            if(startDate) where.created_at[Op.gte] = new Date(startDate);
            if(endDate) where.created_at[Op.gte] =  new Date(endDate);
        }

        const { count, rows: orders } = await Order.findAndCountAll({
        where,
        include: [
            {
            model: OrderItem,
            as: 'items',
            where: { vendorId },
            required: true,
            include: [
                {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug']
                }
            ]
            },
            {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
        });

    } catch(error){
        console.error('Error in getVendorOrders:',error);
        res.status(500).json({error:'Failed to fetch vendor orders'});
    }
};