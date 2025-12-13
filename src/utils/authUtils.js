

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

