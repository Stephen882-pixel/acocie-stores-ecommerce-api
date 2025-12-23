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
} = require('../../models');
const { Op } = require('sequelize');
const emailService = require('../../services/emailService');
const models = require('../../models');


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
        const { id } = req.params;

        const order = await Order.findByPk(id,{
            include:[
                {
                    model:OrderItem,
                    as:'items',
                    include:[
                        {
                            model:Product,
                            as:'product'
                        },
                        {
                            model:User,
                            as:'vendor',
                            attributes:['id','firstName','lastName','email']
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
                    model:Address,
                    as:'billingAddress'
                },
                {
                    model:OrderTracking,
                    as:'tracking',
                    required:false
                },
                {
                    model:OrderNote,
                    as:'notes',
                    include:[
                        {
                            model:User,
                            as:'user',
                            attributes:['id','firstName','lastName','role']
                        }
                    ],
                    order:[['created_at','DESC']]
                }
            ]
        });

        if(!order){
            return res.status(404).json({error:'Order not found'});
        }

        res.json({ order });
    } catch(error){
        console.error('Error in getOrderById:',error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};

const updateOrderStatus = async (req,res) => {
    const transaction = await sequelize.transaction();
    try{
        const { id } = req.params;
        const { status,reason } = req.body;
        const adminId = req.User.userId;

        if(!status){
            return res.status(400).json({error:'Status is required'});
        }


        const validStatuses = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
        if(!validStatuses){
            return res.status(400).json({error:'Invalid status'});
        }

        const order = await Order.findByPk({
            include:[
                {
                    model:User,
                    as:'user'
                },
                {
                    model:OrderItem,
                    as:'items',
                    include:[{ model:Product,as:'product' }]
                }
            ],
            transaction
        });

        if(!order){
            await transaction.rollback();
            return res.status(404).json({error:'Order not found'});
        }

        const oldStatus = order.status;

        if(status === 'cancelled' && oldStatus === 'cancelled'){
            for(const item of order.items){
                const inventory = await Inventory.findOne({
                    where: { productId:item.productId },
                    transaction
                });

                if(inventory){
                    await inventory.update({
                        reservedStock:inventory.reservedStock - item.quantity,
                        availableStock: inventory.availableStock + item.quantity
                    },{transaction});
                }
            }
            order.cancelled_at = new Date();
        }

        if(status === 'confirmed' && oldStatus === 'pending'){
            order.confirmed_at = new Date();
        }

        if(status === 'shipped' && oldStatus !== 'shipped'){
            order.shipped_at = new Date();
        }

        if(status === 'delivered' && oldStatus !== 'delivered'){
            order.delivered_at = new Date();
        }

        await order.update({ status }, { transaction });
        await recordStatusChange(id,oldStatus,status,adminId,reason || 'Admin update');

        await transaction.commit();

        emailService.sendOrderStatusUpdateNotification(
            order.user.email,
            order.user.firstName,
            status
        ).catch(err => console.error('Email send failed:',err));

        res.json({
            message:'Order status updated successfully',
            order
        });
    } catch(error){
        console.error('Error in updateOrderStatus:',error);
        res.status(500).json({error:'Failed to update order status'});
    }
};

const confirmOrder = async (req,res) => {
    try{
        const { id } = req.params;
        const { paymentReference } = req.body;
        const adminId = req.user.userId;

        const order = await Order.findByPk(id,{
            include:[{ model:User,as:'user' }]
        });

        if(!order){
            return res.status(404).json({error:'Order not found'});
        }

        if(order.status !== 'pending'){
            return res.status(400).json({
                error:'only pending orders can be confirmed',
                currentStatus:order.status
            });
        }

        const oldStatus = order.status;
        await Order.update({
            status:'confirmed',
            paymentStatus:'paid',
            paymentReference,
            confirmed_at:new Date()
        });

        await recordStatusChange(id, oldStatus, 'confirmed', adminId, 'Payment verified by admin');

        emailService.sendOrderConfirmedNotification(
            order.use.email,
            order.user.firstName,
            order.orderNumber
        ).catch(err => console.error('Email send failed:',err));

        res.json({
            message:'Order confirmed successfully',
            order
        });
    }catch(error){
        console.error('Error in confirmOrder:',error);
        res.status(500).json({error:'Failed to confirm order'});
    }
};

const getOrderHistory = async (req,res) => {
    try{
        const { id } = req.params;

        const history = await OrderStatusHistory.findAll({
            where:{ orderId:id },
            include:[
                {
                    model:User,
                    as:'changedBy',
                    attributes:['id','firstName','lastName','role']
                }
            ],
            order:[['created_at','ASC']]
        });

        res.json({ history });
    }catch(error){
        console.error('Error in getOrderHistory:',error);
        res.status(500).json({error:'Failed to fetch order history'});
    }
};


const getCancellationRequests = async (req,res) => {
    try{
        const { status = 'pending' } = req.query;

        const requests = await OrderCancellation.findAll({
            where:{
                type:'cancellation',
                status
            },
            include:[
                {
                    model:Order,
                    as:'order',
                    include:[
                        {
                            model:User,
                            as:'user',
                            attributes:['id','firstName','lastName','email']
                        }
                    ]
                },
                {
                    model:User,
                    as:'requestedBy',
                    attributes:['id','firstName','lastName']
                }
            ],
            order:[['requested_at','DESC']]
        });
        res.json({ requests })
    }catch(error){
        console.error('Error in getCancellationRequests:',error);
        res.status(500).json({error:'failed to fetch cancellation requests'});
    }
};

const processCancellation = async (req,res) => {
    try{
        const { id } = req.params;
        const { action, adminNotes } = req.body; // action: 'approve' or 'reject'
        const adminId = req.user.userId;

        if(!['approve','reject'].includes(action)){
            return res.status(400).json({error:'Action must be approve or reject'});
        }

        const cancellation = await OrderCancellation.findByPk(id,{
            include:[
                {
                    model:Order,
                    as:'order',
                    include:[
                        {
                            model:OrderItem,
                            as:'items',
                            include:[{model:Product,as:'product'}]
                        }
                    ]
                }
            ],
            transaction
        });
        if(!cancellation){
            await transaction.rollback();
            return res.status(404).json({error:'cancellation request not found'});
        }

        if(cancellation.status === 'pending'){
            await transaction.rollback();
            return res.status(400).json({error:'Request already processed.'});
        }

        if(action === 'approve'){
            const order = cancellation.order;

            for(const item of order.items){
                const inventory = await Inventory.findOne({
                    where: { productId:item.productId },
                    transaction
                });

                if(inventory){
                    await inventory.update({
                        reservedStock:inventory.reservedStock - item.quantity,
                        availableStock:inventory.availableStock + item.quantity
                    },{transaction});
                }
            }

            const oldStatus = order.status;
            await order.update({
                status:'cancelled',
                cancelled_at:new Date()
            },{transaction});

            await recordStatusChange(
                order.id,
                oldStatus,
                'cancelled',
                adminId,
                `Cancellation approved: ${cancellation.reason}`
            );

            await cancellation.update({
                status:'approved',
                processedByUserId:adminId,
                adminNotes,
                processed_at:new Date(),
                refundAmount:order.paymentStatus === 'paid' ? order.totalAmount: 0,
                refundMethod:'original_payment'
            },{transaction});

            await transaction.commit();

            emailService.sendCancellationApprovedNotification(
                order.user.email,
                order.user.firstName,
                order.orderNumber
            ).catch(err => console.error('Email send failed:', err));

            res.json({
                message:'Cancellation approved, order cancelled and inventory restored',
                cancellation
            });
        } else {
            await cancellation.update({
                status:'rejected',
                processedByUserId:adminId,
                adminNotes,
                processed_at: new Date()
            },{ transaction });

            await transaction.commit();

            res.json({
                message:'Cancellation request rejected',
                cancellation
            });
        }

    } catch (error){
        console.error('Error in proccessCancellation:',error);
        res.status(500).json({error:'Failed to procces cancellation'})
    }
};

const getReturnRequests = async (req,res) => {
    try{
        const { status = 'pending' } = req.query;
        const requests = await OrderCancellation.findAll({
            where:{
                type:'return',
                status
            },
            include:[
                {
                    model:Order,
                    as:'order',
                    include:[
                        {
                            model:User,
                            as:'user',
                            attributes:['id','firstName','lastName','email']
                        }
                    ]
                },
                {
                    model:User,
                    as:'requestedBy',
                    attributes:['id','firstName','lastName']
                }
            ],
            order:[['requested_at','DESC']]
        });

        res.json({ requests });
    }catch(error){
        console.error('Error in getReturnRequest:',error);
        res.status(500).json({error:'failed to fetch return requests'});
    }
};

const processReturn = async (req,res) => {
    try{
        const { id } = req.query;
        const { action, adminNotes, refundAmount } = req.body;
        const adminId = req.user.userId;

        if(!['approve','reject'].includes(action)){
            return res.status(400).json({error:'Action must be approve or reject'});
        }

        const returnRequest = await OrderCancellation.findByPk(id,{
            include:[
                {
                    model:Order,
                    as:'order',
                    include:[{model:User,as:'user'}]
                }
            ]
        });

        if(!returnRequest){
            return res.status(404).json({error:'Return request not found'});
        }

        if(returnRequest.status === 'pending'){
            return res.status(400).json({error:'Request already processed'});
        }

        if(action === 'approved'){
            await returnRequest.update({
                status:'approved',
                processedByUserId:adminId,
                adminNotes,
                refundAmount: refundAmount || returnRequest.order.totalAmount,
                refundMethod:'original_payment',
                processed_at:new Date()
            });

            res.json({
                message:'Return request approved. Awaiting customer to ship back items.',
                returnRequest
            });
        } else {
            await returnRequest.update({
                status:'rejected',
                processedByUserId:adminId,
                adminNotes,
                processed_at:new Date()
            });

            res.json({
                message:'Return requested rejected',
                returnRequest
            });
        }
    }catch(error){
        console.error('Error in processReturn:',error);
        res.status(500).json({error:'Failed to process return'});
    }
};


const processRefund = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { refundAmount, refundMethod = 'original_payment', notes } = req.body;
    const adminId = req.user.userId;

    const order = await Order.findByPk(id, {
      include: [{ model: User, as: 'user' }],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus !== 'paid') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order has not been paid' });
    }

    const amount = refundAmount || order.totalAmount;


    const oldStatus = order.status;
    await order.update({
      status: 'refunded',
      paymentStatus: 'refunded'
    }, { transaction });

    await OrderCancellation.create({
      orderId: id,
      type: 'refund',
      status: 'completed',
      reason: notes || 'Refund processed by admin',
      requestedByUserId: adminId,
      processedByUserId: adminId,
      refundAmount: amount,
      refundMethod,
      adminNotes: notes,
      requestedAt: new Date(),
      processedAt: new Date()
    }, { transaction });

    await recordStatusChange(id, oldStatus, 'refunded', adminId, `Refund processed: ${amount}`);

    await transaction.commit();


    emailService.sendRefundProcessedNotification(
      order.user.email,
      order.user.firstName,
      order.orderNumber,
      amount
    ).catch(err => console.error('Email send failed:', err));

    res.json({
      message: 'Refund processed successfully',
      order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in processRefund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

const addAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isVisibleToCustomer = false } = req.body;
    const adminId = req.user.userId;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await OrderNote.create({
      orderId: id,
      userId: adminId,
      noteType: 'admin_note',
      content,
      isVisibleToCustomer
    });

    res.status(201).json({
      message: 'Admin note added successfully',
      note
    });
  } catch (error) {
    console.error('Error in addAdminNote:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
};


const getAdminDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.count();

    const totalRevenue = await Order.sum('totalAmount', {
      where: { paymentStatus: 'paid' }
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const ordersToday = await Order.count({
      where: {
        createdAt: { [Op.gte]: startOfDay }
      }
    });

    const revenueToday = await Order.sum('totalAmount', {
      where: {
        paymentStatus: 'paid',
        createdAt: { [Op.gte]: startOfDay }
      }
    });


    const ordersByStatus = await Order.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const ordersByPaymentStatus = await Order.findAll({
      attributes: [
        'paymentStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['paymentStatus'],
      raw: true
    });

    const pendingCancellations = await OrderCancellation.count({
      where: { type: 'cancellation', status: 'pending' }
    });

    const pendingReturns = await OrderCancellation.count({
      where: { type: 'return', status: 'pending' }
    });

    res.json({
      totalOrders,
      totalRevenue: totalRevenue || 0,
      ordersToday,
      revenueToday: revenueToday || 0,
      ordersByStatus: ordersByStatus.map(o => ({
        status: o.status,
        count: parseInt(o.count)
      })),
      ordersByPaymentStatus: ordersByPaymentStatus.map(o => ({
        paymentStatus: o.paymentStatus,
        count: parseInt(o.count)
      })),
      pendingActions: {
        cancellations: pendingCancellations,
        returns: pendingReturns
      }
    });
  } catch (error) {
    console.error('Error in getAdminDashboardStats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmOrder,
  getOrderHistory,
  getCancellationRequests,
  processCancellation,
  getReturnRequests,
  processReturn,
  processRefund,
  addAdminNote,
  getAdminDashboardStats
};