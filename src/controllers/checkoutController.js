const { 
  Cart, 
  CartItem, 
  Order, 
  OrderItem, 
  Product, 
  ProductVariant, 
  Inventory,
  Address,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const calculateOrderTotals= (items,shippingCost = 0,taxRate = 0.16) => {
    const subtotal = items.reduce((sum,item) => {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
    },0);

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount + shippingCost;

    return {
        subtotal: subtotal.toFixed(2),
        taxAmount:taxAmount.toFixed(2),
        shippingCost:shippingCost.toFixed(2),
        totalAmount:totalAmount.toFixed(2)
    };
};

const initiateCheckout = async (req,res) => {
    try{
        const userId = req.user.userId;

        const cart = await Cart.findOne({
            where: { userId },
            include:[
                {
                    model:CartItem,
                    as:'items',
                    include:[
                        {
                            model:Product,
                            as:'product',
                                include:[{ model:Inventory,as:'inventory' },{ model:User,as:'vendor' }]
                        },
                        {
                            model:ProductVariant,
                            as:'variant'
                        }
                    ]
                }
            ]
        });

        if(!cart || cart.items.length === 0){
            return res.status(400).json({error:'Cart is empty'});
        }

        const validationErrors = [];
        for(const item of cart.items){
            const product = item.product;
            const variant = item.variant;

            if(product.status !== 'active'){
                validationErrors.push(`${product.name} is no longer available`);
                continue;
            }

            const availableStock = variant
                ? variant.stockQuantity
                : product.inventory?.availableStock || 0;

            if(availableStock < item.quantity){
                validationErrors.push(`${product.name}: Only ${availableStock} in stock`);
            }
        }

        if(validationErrors.length > 0){
            return res.status(400).json({
                error:'Cart validation failed',
                details:validationErrors
            });
        }

        for (const item of cart.items) {
        const inventory = item.product.inventory;
        if (inventory) {
            await inventory.update({
            availableStock: inventory.availableStock - item.quantity,
            reservedStock: inventory.reservedStock + item.quantity
            });
        }
        }

        res.json({
            message:'Checkout Initiated,inventory reserved',
            cartId:cart.id,
            itemCount:cart.items.length
        });
    } catch(error){
        console.error('Error in initiateCheckout:',error);
        res.status(500).json({error:'Failed to initiate checkout'});
    }
};


const getCheckoutSummary = async (req,res) => {
    try{

    } catch (error){
        console.error('Error in getCheckoutSummary:',error);
        res.status(500).json({error:'Failed to fetch checkout summary'});
    }
};