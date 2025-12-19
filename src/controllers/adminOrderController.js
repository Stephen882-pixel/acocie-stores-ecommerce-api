const {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderTracking,
  OrderCancellation,
  OrderNote,
  Address,
  Product,
  ProductVariant,
  Inventory,
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

const getAllOrders = async (req,res) => {
    try{
        const{
            page = 1,
            limit = 20,
            status,
            paymentStatus,
            userId:filterUserId,
            vendorId,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            search
        } = req.query

        const offset = (page -1) * limit;
        const where = {};

       
        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (filterUserId) where.userId = filterUserId;
        if (startDate || endDate) {
        where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }
        if (minAmount || maxAmount) {
        where.totalAmount = {};
            if (minAmount) where.totalAmount[Op.gte] = minAmount;
            if (maxAmount) where.totalAmount[Op.lte] = maxAmount;
        }
        if (search) {
        where[Op.or] = [
                { orderNumber: { [Op.iLike]: `%${search}%` } },
                { '$user.email$': { [Op.iLike]: `%${search}%` } },
                { '$user.firstName$': { [Op.iLike]: `%${search}%` } },
                { '$user.lastName$': { [Op.iLike]: `%${search}%` } }
            ];
        }

        const include = [
            {
                model:OrderItem,
                as:'items',
                ...(vendorId && { where: {vendorId} })
            },
            {
                model:User,
                as:'user',
                attributes:['id','firstName','lastName','email']
            }
        ];

        const { count,rows:orders } = await Order.findAndCountAll({
            where,
            include,
            limit:parseInt(limit),
            offset:parseInt(offset),
            order:[['created_at','DESC']],
            distinct:true
        });

        res.json({
            orders,
            pagination:{
                total:count,
                page:parseInt(page),
                limit:parseInt(limit),
                pages:Math.ceil(count/limit)
            }
        });
    }catch(error){
        console.error('Error in getAllOrders:',error);
        res.status(500).json({error:'Failed to fetch all orders'});
    }
};

const getOrderById = async (req,res) => {
    try{
        
    } catch(error){
        console.error('Error in getOrderById:',error);
        res.json({error:'Failed to fetch order'});
    }
};