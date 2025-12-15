
const authUtils = require('../utils/authUtils');
const { User } = require('../models');

const authenticate = async (req,res,next) => {
    try{
        const authHeader = req.headers?.authorization;

        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).json({
                error:'Authorization token missing or invalid token'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = authUtils.verifyAccessToken(token);
        if(!decoded){
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }
        const user = await User.findByPk(decoded.userId);

        if(!user){
            return res.status(401).json({
                error:'User not found'
            });
        }

        if(user.status !== 'active'){
            return res.status(403).json({
                error:'Account is suspended or banned'
            });
        }

        req.user = {
            userId:decoded.userId,
            email:decoded.email,
            role:decoded.role
        };
        next();
    } catch (error){
        console.error('Error in authenticate middleware:',error);
        res.status(500).json({
            error:'Authentication failed'
        });
    }
};

module.exports = authenticate;