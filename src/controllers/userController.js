

const { user, Address, LoginHistory } = require('../models');
const { Op } = require('sequelize');

const getProfile = async (req,res) => {
    try{
        const userId = req.user.userId;

        const user = await user.findByPk(userId,{
            attributes: { exclude: ['passwordHash'] },
            include:[
                {
                    model:Address,
                    as:'addresses'
                }
            ]
        });

        if(!user){
            return res.status(404).json({error: 'User not found'});
        }

        res.json({ user })

    } catch (error){
        console.error('Error in getting profile:', error);
        res.status(500).json({error:'Failed to fetch profile'});
    }
};



const updateProfile = async (req,res) => {
    try{
        const userId = req.user.userId;
        const { firstName, lastName, phone } = req.body;

        const user = await user.findByPk(userId);

        if(!user){
            return res.status(404).json({error:'User not found'});
        }

        if(phone && phone !== user.phone){
            const existingPhone = await user.findOne({
                where: {
                    phone,
                    id:{[Op.ne]:userId}
                }
            });

            if(existingPhone){
                return res.status(409).json({
                   error: 'Phone already in use'
                });
            }
        }
         
        await user.update({
            message:'Profile updated successfully',
            user:{
                id:user.id,
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                phone:user.phone,
                role:user.role,
                isVerified:user.isVerified
            }
        });
    } catch (error){
        console.error('Error in update profile:',error);
        res.status(500).json({
            error:
            'Failed to update profile'
        });
    }
};

const getAddress = await (req,res) => {
    try{
        const userId = req.user.userId;

        const addresses = await Address.findAll({
            where: { userId },
            order: [['isDefault','DESC'], ['createdAt','DESC']]
        });

        res.json({addresses});
    } catch (error){
        console.error('Error in getAddresses:', error);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
};


