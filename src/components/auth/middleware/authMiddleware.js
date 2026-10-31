
const authUtils = require('../utils/authUtils');
const { User } = require('../../../models');
const { sendError } = require('../../../helpers/response.helper');

const authenticate = async (req,res,next) => {
    try{
        const authHeader = req.headers?.authorization;

        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return sendError(res, 401, 'Authorization token missing or invalid token');
        }

        const token = authHeader.split(' ')[1];

        const decoded = authUtils.verifyAccessToken(token);
        if(!decoded){
            return sendError(res, 401, 'Invalid or expired token');
        }
        const user = await User.findByPk(decoded.userId);

        if(!user){
            return sendError(res, 401, 'User not found');
        }

        if(user.status !== 'active'){
            return sendError(res, 403, 'Account is suspended or banned');
        }

        req.user = {
            userId:decoded.userId,
            email:decoded.email,
            role:user.role
        };
        next();
    } catch (error){
        console.error('Error in authenticate middleware:',error);
        return sendError(res, 500, 'Authentication failed');
    }
};

module.exports = authenticate;