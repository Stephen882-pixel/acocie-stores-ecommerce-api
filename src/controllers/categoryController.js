const { Category } = require("../models");

const createCategory = async (req,res) => {
    try{
        const {
            name,
            description,
            parentId,
            imageUrl,
            isActive,
            displayOrder,
            metaTitle,
            metaDescription
        } = req.body;

        if(!name){
            return res.status(400).json({error:'Category name is requied'});
        }

        const slug = generateSlug(name);
        let finalSlug = slug;
        let counter = 1;

        while(await Category.findOne({where:{ slug:finalSlug }})){
            finalSlug =  `${slug}-${counter}`;
            counter++;
        }

        if(parentId){
            const parent = await Category.findByPk(parentId);
            if(!parent){
                return res.status(404).json({error:'Parent category not found'});
            }
        }

        const category = await Category.create({
            name,
            slug:finalSlug,
            description,
            parentId,
            imageUrl,
            isActive:isActive !== false,
            displayOrder: displayOrder || 0,
            metaTitle,
            metaDescription
        });
        res.status(201).json({
            message:'Category created successfully',
            category
        });
    } catch (error){
        console.error('Error in createCategory:',error);
        res.status(500).json({error:'Failed to create category'});
    }
};