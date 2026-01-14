
const {
    Cart,
    CartItem,
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    User
} = require('../../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const models = require('../../models');


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
            const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            cart = await Cart.create({ sessionId, expires_at });
        }
    }

    return cart; 
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

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] || uuidv4();

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    const product = await Product.findOne({
      where: { id: productId, status: 'active' },
      include: [{ model: Inventory, as: 'inventory' }]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    let variant = null;
    if (variantId) {
      variant = await ProductVariant.findOne({
        where: { id: variantId, productId, isActive: true }
      });

      if (!variant) {
        return res.status(404).json({ error: 'Product variant not found' });
      }
    }

    const availableStock = variant 
      ? variant.stockQuantity 
      : product.inventory?.availableStock || 0;

    if (availableStock < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        availableStock 
      });
    }

    const currentPrice = variant?.price || product.price;

    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null
      }
    });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (availableStock < newQuantity) {
        return res.status(400).json({ 
          error: 'Insufficient stock for requested quantity',
          availableStock 
        });
      }

      await existingItem.update({ 
        quantity: newQuantity,
        priceAtAddition: currentPrice 
      });
      cartItem = existingItem;
    } else {
      // Add new item
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        priceAtAddition: currentPrice
      });
    }

    const completeItem = await CartItem.findByPk(cartItem.id, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: ProductImage,
              as: 'images',
              where: { isPrimary: true },
              required: false,
              limit: 1
            }
          ]
        },
        {
          model: ProductVariant,
          as: 'variant'
        }
      ]
    });

    res.status(201).json({
      message: 'Item added to cart',
      cartItem: completeItem,
      sessionId: !userId ? sessionId : undefined
    });
  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

const updateCartItem = async (req,res) => {
    try{
        const { id } = req.params;
        const { quantity } = req.body;
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];

        if(!quantity || quantity < 1){
            return res.status(400).json({error:'Valid quantity required'});
        }

        const cart = await getOrCreateCart(userId,sessionId);

        const cartItem = await CartItem.findOne({
            where: { id,cartId:cart.id },
            include:[
                { model:Product,as:'product',include:[{ model: Inventory,as:'inventory' }] },
                { model:ProductVariant,as:'variant' }
            ]
        });

        if(!cartItem){
            return res.status(404).json({error:'Cart item not found'});
        }

        const availableStock = cartItem.variant
            ? cartItem.variant.stockQuantity
            : cartItem.product.inventory?.availableStock || 0;

        if(availableStock < quantity){
            return res.status(400).json({
                error:'Insufficient stock',
                availableStock
            });
        }

        await cartItem.update({quantity});
        res.json({
            message:'Cart item updated',
            cartItem
        })
    }catch(error){
        console.error('Error in updateCartItem:',error);
        res.status(500).json({error:'Failed to update cart item'});
    }
};

const removeCartItem = async (req,res) => {
    try{
        const { id } = req.params;
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];

        const cart = await getOrCreateCart(userId,sessionId);

        const cartItem = await CartItem.findOne({
            where: { id,cartId:cart.id }
        });

        if(!cartItem){
            return res.status(404).json({error:'Cart item not found'});
        }

        await cartItem.destroy();
        res.json({message:'Item removed from cart'});
    } catch (error){
        console.error('Error in removeCartItem:',error);
        res.status(500).json({error:'Failed to remove item from the cart'});
    }
};


const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'];

    const cart = await getOrCreateCart(userId, sessionId);

    await CartItem.destroy({ where: { cartId: cart.id } });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error in clearCart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

const validateCart = async (req,res) => {
    try{
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];

        const cart = await getOrCreateCart(userId,sessionId);

        const items = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [
                {
                    model:Product,
                    as:'product',
                    include:[{ model:Inventory,as:'inventory' }]
                },
                {
                    model:ProductVariant,
                    as:'variant'
                }
            ]
        });

        const validation = {
            isValid: true,
            issues: [],
            invalidItems:[]
        };

        for(const item of items){
            const product = item.product;
            const variant = item.variant;
            const itemIssues = [];

            if(product.status !== 'active'){
                itemIssues.push('Product no longer available');
                validation.isValid =  false;
            }

            const currentPrice = variant?.price || product.price;
            if(parseFloat(currentPrice) !== parseFloat(item.priceAtAddition)){
                itemIssues.push(`Price changed from ${item.priceAtAddition} to ${currentPrice}`);
            }

            if(itemIssues.length > 0){
                validation.invalidItems.push({
                    itemId:item.id,
                    productName:product.name,
                    issues:itemIssues
                });
                validation.issues.push(...itemIssues);
            }
        }
        res.json(validation);
    } catch (error){
        console.error('Error in validateCart:',error);
        res.status(500).json({error:'Failed to validate validate cart'});
    }
};


const mergeCarts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { guestSessionId } = req.body;

    if (!guestSessionId) {
      return res.status(400).json({ error: 'Guest session ID required' });
    }


    const guestCart = await Cart.findOne({ 
      where: { sessionId: guestSessionId },
      include: [{ model: CartItem, as: 'items' }]
    });

    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ message: 'No guest cart to merge' });
    }

    // Get or create user cart
    let userCart = await Cart.findOne({ where: { userId } });
    if (!userCart) {
      userCart = await Cart.create({ userId });
    }

    for (const guestItem of guestCart.items) {
      const existingItem = await CartItem.findOne({
        where: {
          cartId: userCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId || null
        }
      });

      if (existingItem) {
        await existingItem.update({ 
          quantity: existingItem.quantity + guestItem.quantity 
        });
      } else {
        await guestItem.update({ cartId: userCart.id });
      }
    }

    await guestCart.destroy();

    res.json({ message: 'Carts merged successfully' });
  } catch (error) {
    console.error('Error in mergeCarts:', error);
    res.status(500).json({ error: 'Failed to merge carts' });
  }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    validateCart,
    mergeCarts
};

