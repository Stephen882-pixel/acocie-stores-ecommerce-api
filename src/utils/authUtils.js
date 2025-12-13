

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password,saltRounds);
};

