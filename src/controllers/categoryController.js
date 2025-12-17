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

const updateCategory = async (req,res) => {
    try{
        const { id } = req.params;
        const updates = req.body;

        const category = await Category.findByPk(id);

        if(!category){
            return res.status(404).json({error:'Category not found'});
        }

        if(updates.name && updates.name !== category.name){
            updates.slug = generateSlug(updates.name);
        }

        if (updates.parentId) {
        if (updates.parentId === id) {
            return res.status(400).json({ error: 'Category cannot be its own parent' });
        }
        const parent = await Category.findByPk(updates.parentId);
        if (!parent) {
            return res.status(404).json({ error: 'Parent category not found' });
        }
        }

        await category.update(updates);
        res.json({
            message:'Category updated successfully',
            category
        });
    } catch (error){
        console.error('Error in update category:',error);
        res.status(500).json({error:'Failed to update category'});
    }
};

