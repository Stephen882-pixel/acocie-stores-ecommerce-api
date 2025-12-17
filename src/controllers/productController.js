
const models = require('../models');
const { Product, Category, ProductImage, ProductVariant, Inventory, User } = require('../models');
const { Op, or } = require('sequelize');

const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const getAllProducts = async (req,res) => {
    try{
        const {
            page = 1,
            limit = 20,
            category,
            minPrice,
            maxPrice,
            status='active',
            featured,
            vendor,
            sortBy = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const where = {};

        if(req.user?.role === 'admin' || req.user?.role === 'super_admin'){
            if(status) where.status = status;
        } else {
            where.status = 'active';
        }

        if(category) where.categoryId = category;

        if(minPrice || maxPrice){
            where.price = {};
            if(minPrice) where.price[Op.gte] = minPrice;
            if(maxPrice) where.price[Op.lte] = maxPrice;
        }

        if(featured === 'true') where.isFeatured = true;

        if(vendor) where.vendorId = vendor;

        const { count,rows: products } = await Product.findAndCountAll({
            where,
            include:[
                {
                    model:Category,
                    as:'category',
                    attributes:['id','name','slug']
                },
                {
                    model:ProductImage,
                    as:'images',
                    where:{isPrimary: true},
                    required:false,
                    limit:1
                },
                {
                    model:User,
                    as:'vendor',
                    attributes:['id','firstName','lastName','email']
                }
            ],
            limit:parseInt(limit),
            offset:parseInt(offset),
            order:[[sortBy,order]],
            distinct:true
        });

        res.json({
            products,
            pagination:{
                total:count,
                page:parseInt(page),
                limit:parseInt(limit),
                pages:Math.ceil(count/limit)
            }
        });
    } catch (error){
        console.error('Error in getAllProducts:', error);
        res.status(500).json({error:'Failed to fetch products'});
    }
};

const getProductById = async (req,res) => {
    try{
        const { id } = req.params;

        const product = await Product.findOne({
        where: { 
            id,
            ...(req.user?.role === 'admin' || req.user?.role === 'super_admin' 
            ? {} 
            : { status: 'active' })
        },
            include: [
                {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
                },
                {
                model: ProductImage,
                as: 'images',
                order: [['displayOrder', 'ASC']]
                },
                {
                model: ProductVariant,
                as: 'variants',
                where: { isActive: true },
                required: false
                },
                {
                model: Inventory,
                as: 'inventory'
                },
                {
                model: User,
                as: 'vendor',
                attributes: ['id', 'firstName', 'lastName', 'email', 'role']
                }
            ]
        });

        if(!product){
            return res.status(404).json({
                error:'Product not found'
            });
        }

        await product.increment('viewCount');

        res.json({ product });
    }catch(error){
        console.error('Error in getProductById:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};


const createProduct = async (req,res) => {
    try{
        const {
        categoryId,
        name,
        description,
        shortDescription,
        sku,
        price,
        comparePrice,
        costPrice,
        stockQuantity,
        lowStockThreshold,
        weight,
        dimensions,
        tags,
        metaTitle,
        metaDescription,
        status,
        isFeatured,
        images,
        variants
        } = req.body;
    if(!categoryId || !name || !sku || !price){
        return res.status(400).json({
            error:'Missing required fields: categoryId,name,sku,price'
        });
    }

    const category = await Category.findByPk(categoryId);
    if(!category){
        return res.status(404).json({
            error:'category not found'
        });
    }

    const existingsku = await Product.findOne({
        where: { sku }
    });
    if(existingsku){
        return res.status(409).json({
            error:'SKU already exists'
        });
    }

    const slug = generateSlug(name);
    let finalSlug = slug;
    let counter = 1;

    while(await Product.findOne({ where: {slug: finalSlug} })){
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    const vendorId = req.user.role === 'vendor'
        ? req.user.userId
        :req.body.vendorId || req.user.userId;

    const product = await Product.create({
      vendorId,
      categoryId,
      name,
      slug: finalSlug,
      description,
      shortDescription,
      sku,
      price,
      comparePrice,
      costPrice,
      stockQuantity: stockQuantity || 0,
      lowStockThreshold: lowStockThreshold || 5,
      weight,
      dimensions,
      tags: tags || [],
      metaTitle,
      metaDescription,
      status: status || 'draft',
      isFeatured: isFeatured || false
    });

    await Inventory.create({
      productId: product.id,
      totalStock: stockQuantity || 0,
      availableStock: stockQuantity || 0,
      reservedStock: 0,
      lowStockAlert: (stockQuantity || 0) <= (lowStockThreshold || 5)
    });

    if(images && Array.isArray(images)){
        for(let i = 0;i < images.length;i++){
            await ProductImage.create({
                productId:product.id,
                imageUrl:images[i].url,
                altText:images[i].altText || name,
                isPrimary:i === 0,
                displayOrder:i
            });
        }
    }

    

    } catch(error){
        console.error('Error in createProduct:',error);
        res.status(500).json({error:'Failed to create product'});
    }
};