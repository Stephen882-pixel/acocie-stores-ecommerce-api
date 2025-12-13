

const { user, OTPCode, RefreshToken, LoginHistory } = require('../models');
const authUtils = require('../utils/authUtils');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');
const e = require('express');

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

const verifyOTP = async (req,res) => {
    try{
        const { email,otpCode } = req.body;

        if(!email || !otpCode){
            return res.status(400).json({error: 'Email and OTP Code are required'});
        }

        const otp = await OTPCode.findOne({
            where: {
                email,
                otpCode,
                purpose:'signup',
                isUsed:false,
                expiresAt:{ [Op.gt]: new Date() }
            },
            order: [['createdAt','DESC']]
        });

        if(!otp){
            return res.status(400).json({error: 'Invalid or expired OTP code'});
        }

        await otp.update({ isUsed:true });
        await user.update({ isVerified:true },{ where: { email } });

        const user = await user.findOne({ where: {email} });
        await emailService.sendWelcomeEmail(email,user.firstName);

        res.json({
            message: 'Email verified successfully! You can now log in.'
        });
    } catch (error){
        console.error('Error in verifyOTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

