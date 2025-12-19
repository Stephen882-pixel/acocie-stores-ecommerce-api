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

