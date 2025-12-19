
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
const { Op, or } = require('sequelize');
const emailService = require('../services/emailService');
const models = require('../models');

const getOrderHistory = async(req,res) => {
    try{
        const userId = req.user.userId;
        const {
            page =1,
            limit = 20,
            status,
            startDate,
            endDate
        } = req.query;

        const offset = (page - 1) * limit;
        const where = { userId };

        if(status){
            where.status = status;
        }

        if(startDate || endDate){
            where.created_at = {};
            if(startDate) where.created_at[Op.gte] = new Date(startDate);
            if(endDate) where.created_at[Op.lte] = new Date(endDate);
        }

        const { count, rows: orders } = await Orde.findAndCountAll({
            where,
            include :[
                {
                    model:OrderItem,
                    as:'items',
                    include:[
                        {
                            model:Product,
                            as:'product',
                            attributes:['id','name','slug']
                        }
                    ]
                }
            ],
            limit:parseInt(limit),
            offset:parseInt(offset),
            order:[['created_at','DESC']]
        });

        res.json({
            orders,
            pagination:{
                total: count,
                page:parseInt(page),
                limit:parseInt(limit),
                pages:Math.ceil(count/limit)
            }
        });
    } catch (error){
        console.error('Error in getOrderHistory:',error);
        res.status(500).json({error:'Failef to fetch order history'});
    }
};


const getOrderById = async (req,res) => {
    try{
        const { id } = req.params;
        const userId = req.user.userId;

        const order = await Order.findOne({
            where:{ id,userId },
            include:[
                {
                    model:OrderItem,
                    as:'items',
                    include:[
                        {
                            model:Product,
                            as:'product',
                            attributes:['id','name','slug','status']
                        },
                        {
                            model:User,
                            as:'vendor',
                            attributes:['id','firstName','lastName','email']
                        }
                    ]
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
                    where:{
                        [Op.or]:[
                            { isVisibleToCustomer:true },
                            { userId }
                        ]
                    },
                    required:false,
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
        res.json({ order })
    }catch(error){
        console.error('Error in getOrderById:',error);
        res.status(500).json({
            error:'Failed to fetch order'
        });
    }
};

const getOrderByNumber = async (req,res) => {
    try{
        const { orderNumber } = req.params;
        const userId = req.user.userId;

        const order = await Order.findOne({
            where:{ orderNumber,userId },
            include:[
                {
                    model:OrderItem,
                    as:'items',
                    include:[{ model:Product,as:'product' }]
                },
                { model:Address,as:'shippingAddress' },
                { model:OrderTracking,as:'tracking',required:false }
            ]
        });
        if(!order){
            return res.status(404).json({error:'Order not found'});
        }

        res.json({ order });
    } catch(error){
        console.error('Error in getOrderByNumber:',error);
        res.status(500).json({error:'Failed to fetch order'});
    }
};

const getOrderTracking = async (req,res) => {
    try{
        const { id } = req.params;
        const userId = req.user.userId;

        const order = await Order.findOne({ where:{ id,userId } });

        if(!order){
            return res.status(404).json({error:'Order not found'});
        }

        const tracking = await OrderTracking.findOne({
            where: { orderId:id }
        });
        
        if(!tracking){
            return res.status(404).json({error:'Tracking information not available yet'});
        }

        res.json({ tracking });
    } catch(error){
        console.error('Error in getOrderTracking:',error);
        res.status(500).json({error:'Failed to fetch tracking informations'});
    }
};