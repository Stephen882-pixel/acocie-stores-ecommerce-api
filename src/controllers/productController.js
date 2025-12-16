
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
}