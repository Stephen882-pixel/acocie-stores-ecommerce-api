
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


const markAsDelivered = async (req, res) => {
  try {
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

    if (order.status !== 'shipped') {
      return res.status(400).json({
        error: 'Order must be in shipped status',
        currentStatus: order.status
      });
    }

    const oldStatus = order.status;
    await order.update({
      status: 'delivered',
      deliveredAt: new Date()
    });

    await recordStatusChange(id, oldStatus, 'delivered', vendorId, 'Vendor confirmed delivery');

    await OrderTracking.update(
      { trackingStatus: 'delivered' },
      { where: { orderId: id } }
    );

    emailService.sendOrderDeliveredNotification(
      order.user.email,
      order.user.firstName,
      order.orderNumber
    ).catch(err => console.error('Email send failed:', err));

    res.json({
      message: 'Order marked as delivered',
      order
    });
  } catch (error) {
    console.error('Error in markAsDelivered:', error);
    res.status(500).json({ error: 'Failed to mark order as delivered' });
  }
};

const updateTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentLocation, trackingStatus, estimatedDelivery } = req.body;
    const vendorId = req.user.userId;
    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { vendorId },
          required: true
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const tracking = await OrderTracking.findOne({ where: { orderId: id } });

    if (!tracking) {
      return res.status(404).json({ error: 'Tracking information not found' });
    }


    await tracking.update({
      currentLocation: currentLocation || tracking.currentLocation,
      trackingStatus: trackingStatus || tracking.trackingStatus,
      estimatedDelivery: estimatedDelivery || tracking.estimatedDelivery,
      lastUpdated: new Date()
    });

    res.json({
      message: 'Tracking information updated',
      tracking
    });
  } catch (error) {
    console.error('Error in updateTracking:', error);
    res.status(500).json({ error: 'Failed to update tracking' });
  }
};

const addVendorNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isVisibleToCustomer = true } = req.body;
    const vendorId = req.user.userId;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { vendorId },
          required: true
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const note = await OrderNote.create({
      orderId: id,
      userId: vendorId,
      noteType: 'vendor_note',
      content,
      isVisibleToCustomer
    });

    res.status(201).json({
      message: 'Note added successfully',
      note
    });
  } catch (error) {
    console.error('Error in addVendorNote:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
};

const getVendorDashboardStats = async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const totalOrders = await OrderItem.count({
      where: { vendorId },
      distinct: true,
      col: 'orderId'
    });


    const revenueData = await OrderItem.findAll({
      where: { vendorId },
      include: [
        {
          model: Order,
          as: 'order',
          where: { status: 'delivered' },
          attributes: []
        }
      ],
      attributes: [
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalRevenue']
      ],
      raw: true
    });

    const totalRevenue = parseFloat(revenueData[0]?.totalRevenue || 0);

    const pendingData = await OrderItem.findAll({
      where: { vendorId },
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            status: {
              [Op.in]: ['pending', 'confirmed', 'processing', 'shipped']
            }
          },
          attributes: []
        }
      ],
      attributes: [
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'pendingRevenue']
      ],
      raw: true
    });

    const pendingRevenue = parseFloat(pendingData[0]?.pendingRevenue || 0);

    const ordersByStatus = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { vendorId },
          attributes: [],
          required: true
        }
      ],
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Order.id'))), 'count']
      ],
      group: ['status'],
      raw: true
    });


    const recentOrders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { vendorId },
          required: true
        }
      ],
      limit: 5,
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.json({
      totalOrders,
      totalRevenue,
      pendingRevenue,
      ordersByStatus: ordersByStatus.map(o => ({
        status: o.status,
        count: parseInt(o.count)
      })),
      recentOrders
    });
  } catch (error) {
    console.error('Error in getVendorDashboardStats:', error);
    res.status(500).json({ error: 'Failed to fetch vendor statistics' });
  }
};

module.exports = {
  getVendorOrders,
  getVendorOrderById,
  acceptOrder,
  shipOrder,
  markAsDelivered,
  updateTracking,
  addVendorNote,
  getVendorDashboardStats
};