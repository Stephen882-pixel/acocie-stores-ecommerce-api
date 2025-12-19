
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