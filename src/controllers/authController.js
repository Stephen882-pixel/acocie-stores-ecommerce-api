

const { user, OTPCode, RefreshToken, LoginHistory } = require('../models');
const authUtils = require('../utils/authUtils');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

const signup = async (req,res) => {
    try{
        const { firstName, lastName, email, password, phone, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!authUtils.isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!authUtils.isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    const existingUser = await User.findOne({
        where:{email}
    });
    if(existingUser){
        return res.status(409).json({error: 'Email already registered'});
    }
    const passwordHash = await authUtils.hashPassword(password);
    const userRole = role === 'vendor' ? 'vendor': 'customer';

    const user = await user.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role: userRole
    })

    const otpCode = authUtils.generateOTP();
    await OTPCode.create({
      userId: user.id,
      email,
      otpCode,
      purpose: 'signup',
      expiresAt: authUtils.getOTPExpiry()
    });

    await emailService.sendSignUpOTP(email,firstName,otpCode);

    res.status(201).json({
        message:'Signup successful! Please check your email for OTP verification.',
        email,
        userId:user.id
    });
    } catch (error){
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
};