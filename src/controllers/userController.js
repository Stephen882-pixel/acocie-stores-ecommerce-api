

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


