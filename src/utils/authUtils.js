

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password,saltRounds);
};

const comparePassword = async (password,hash) => {
    return await bcrypt.compare(password,hash);
};

const generateAccessToken = (userId, email,role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'}
    );
};

const generateRefreshToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
};

const verifyAccessToken = (token) => {
    try{
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error){
        return null;
    }
};

