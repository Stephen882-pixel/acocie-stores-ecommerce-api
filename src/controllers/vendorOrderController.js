
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
const models = require('../models');

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

        res.json({
            orders,
            pagination:{
                total:count,
                page:parseInt(page),
                limit:parseInt(limit),
                pages:Math.ceil(count/limit)
            }
        });

    } catch(error){
        console.error('Error in getVendorOrders:',error);
        res.status(500).json({error:'Failed to fetch vendor orders'});
    }
};


const getVendorOrderById = async (req,res) => {
    try{
        const { id } = req.params;
        const vendorId = req.user.userId;

        const order = await Order.findOne({
            where: { id },
            include:[
                {
                    model:OrderItem,
                    as:'items',
                    where: { vendorId },
                    required:true,
                    include:[
                        {
                            model:Product,
                            as:'product'
                        }
                    ]
                },
                {
                    model:User,
                    as:'user',
                    attributes:['id','firstName','lastName','email','phone']
                },
                {
                    model:Address,
                    as:'shippingAddress'
                },
                {
                    model:OrderTracking,
                    as:'tracking',
                    required:false
                }
            ]
        });

        if(!order){
            return res.status(404).json({error:'Order not found or no items from your store'});
        }

        res.json({ order });
    }catch(error){
        console.error('Error in getVendorOrderById:',error);
        res.status(500).json({error:'Failed to fetch the order'});
    }
};


const acceptOrder = async (req,res) => {
    try{
        const { id } = req.params;

        const vendorId = req.user.userId;

        const order = await Order.findOne({
        where: { id },
        include: [
            {
            model: OrderItem,
            as: 'items',
            where: { vendorId },
            required: true
            },
            {
            model: User,
            as: 'user'
            }
        ]
        });

        if (!order) {
        return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'confirmed') {
        return res.status(400).json({
            error: 'Order must be in confirmed status to accept',
            currentStatus: order.status
        });
        }
        

        const oldStatus = order.status;
        await order.update({ status: 'processing' });

        await recordStatusChange(id, oldStatus, 'processing', vendorId, 'Vendor accepted order');


        emailService.sendOrderProcessingNotification(
        order.user.email,
        order.user.firstName,
        order.orderNumber
        ).catch(err => console.error('Email send failed:', err));

        res.json({
        message: 'Order accepted and moved to processing',
        order
        });

    }catch(error){
        console.error('Error from acceptOrder:',error);
        res.status(500).json({error:'Failed to accept the order'});
    }
};

const shipOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      carrier,
      trackingNumber,
      trackingUrl,
      estimatedDelivery
    } = req.body;
    const vendorId = req.user.userId;

    if (!carrier || !trackingNumber) {
      return res.status(400).json({
        error: 'Carrier and tracking number are required'
      });
    }

    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { vendorId },
          required: true
        },
        {
          model: User,
          as: 'user'
        }
      ],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'processing') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Order must be in processing status to ship',
        currentStatus: order.status
      });
    }

    // Update order status
    const oldStatus = order.status;
    await order.update({
      status: 'shipped',
      shippedAt: new Date()
    }, { transaction });


    await OrderTracking.create({
      orderId: id,
      carrier,
      trackingNumber,
      trackingUrl,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      trackingStatus: 'in_transit'
    }, { transaction });


    await recordStatusChange(
      id,
      oldStatus,
      'shipped',
      vendorId,
      `Shipped via ${carrier}, tracking: ${trackingNumber}`,
      transaction
    );

    await transaction.commit();

    emailService.sendOrderShippedNotification(
      order.user.email,
      order.user.firstName,
      order.orderNumber,
      trackingNumber,
      carrier
    ).catch(err => console.error('Email send failed:', err));

    res.json({
      message: 'Order marked as shipped',
      order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in shipOrder:', error);
    res.status(500).json({ error: 'Failed to ship order' });
  }
};
