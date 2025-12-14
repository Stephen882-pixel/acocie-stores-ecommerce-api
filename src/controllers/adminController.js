

const { user,LoginHistory } = require('../models');
const { Op } = require('sequelize');


const getAllUsers = async (req,res) => {
    try{
        const {
            page=1,
            limit=20,
            role,
            status,
            search
        } = req.query;

        const offset = ( page - 1 ) * limit;
        const where = {};

        if(role){
            where.role = role;
        }

        if(status){
            where.status = status;
        }

        if (search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }
    } catch (error){
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getUserById = async (req,res) => {
    try{
        const { id } = req.params;

        const user = await user.findByPk(id,{
            attributes: { exclude: ['passwordHash'] },
            include: [
                {
                    model: LoginHistory,
                    as:'loginHistory',
                    limit:10,
                    order:[['loginAt','DESC']]
                }
            ]
        });

        if(!user){
            return res.status(404).json({
                error:'User not found'
            });
        }

        res.json({ user });
    } catch(error){
        console.error('Error in getUserById:',error);
        res.status(500).json({
            error:'Failed to fetch user'
        });
    }
};

