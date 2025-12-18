
const {
    Cart,
    CartItem,
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    User
} = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const models = require('../models');


const getOrCreateCart = async (userId,sessionId) => {
    let cart;

    if(userId){
        cart = await Cart.findOne({ where: { userId } });
        if(!cart){
            cart = await Cart.create({ userId });
        }
    } else if(sessionId){
        cart = await Cart.findOne({ where: { sessionId } });
        if(!cart){
            const expires_at = new Date(Date.now() + 7 * 24* 60 * 60 * 1000);
            cart = await Cart.create({ sessionId,expires_at });
        }
    }
};


const calculateCartTotals = (items) => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price || item.product.price;
    return sum + (parseFloat(price) * item.quantity);
  }, 0);

  return {
    subtotal: subtotal.toFixed(2),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

const getCart = async (req,res) => {
    try{
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];

        if(!userId  && !sessionId){
            return res.status(400).json({
                error:'User authentication or session ID required'
            });
        }

        const cart = await getOrCreateCart(userId,sessionId);

        const items = await CartItem.findAll({
            where: { cartId: cart.id },
            include:[
                {
                    model:Product,
                    as:'product',
                    include:[
                        {
                            model:ProductImage,
                            as:'images',
                            where:{ isPrimary:true },
                            required:false,
                            limit:1
                        },
                        {
                            model:Inventory,
                            as:'inventory'
                        },
                        {
                            model:User,
                            as:'vendor',
                            attributes:['id','firstName','lastName']
                        }
                    ]
                },
                {
                    model:ProductVariant,
                    as:'variant',
                    required:false
                }
            ],
            order:[['created_at','ASC']]
        });

        const itemsWithIssues = items.map(item => {
            const product = item.product;
            const variant = item.variant;
            const currentPrice = variant?.price || product.price;
            const priceChanged = parseFloat(currentPrice) !== parseFloat(item.priceAtAddition);

            let availableStock;
            if(variant){
                availableStock = variant.stockQuantity;
            } else {
                availableStock = product.Inventory?.availableStock || 0;
            }

            const issues = [];
            if(product.status !== 'active') issues.push('product no longer available');
            if(availableStock < item.quantity) issues.push('Insufficient stock');
            if(priceChanged) issues.push(`Price changed from ${item.priceAtAddition} to ${currentPrice}`);

            return {
                ...item.toJSON(),
                currentPrice,
                availableStock,
                priceChanged,
                issues
            };
        });

        const totals = calculateCartTotals(items);

        res.json({
            cart:{
                id:cart.id,
                items:itemsWithIssues,
                ...totals
            }
        });
    } catch (error){
        console.error('Error in getCart:',error);
        res.status(500).json({error:'Failed to fetch cart'})
    }
};

const addToCarrt = async (req,res) => {
    try{

    } catch (error){
        console.error('Error in addToCart:',error);
        res.status(500).json({error:'Failed  to add item to cart'});
    }
};

