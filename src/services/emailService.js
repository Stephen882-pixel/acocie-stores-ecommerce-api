
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
  }
});

const sendSignUpOTP = async (email, firstName, otpCode) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject:'Verify Your Email - Acocie Stores',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Acocie Stores</h1>
        </div>
        <h2 style="color: #333;">Welcome, ${firstName}!</h2>
        <p style="color: #666; font-size: 16px;">Thank you for signing up with Acocie Stores. Please verify your email address using the OTP code below:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">
            ${otpCode}
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account with Acocie Stores, please ignore this email.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Acocie Stores - Your Trusted E-commerce Platform<br>
          © ${new Date().getFullYear()} Acocie Stores. All rights reserved.
        </p>
      </div>
    `
    };

    try{
        await transporter.sendMail(mailOptions);
        console.log(`SignUp OTP sent to ${email}`);
        return true;
    } catch (error){
        console.error('✗ Error sending signup OTP:', error.message);
        throw new Error('Failed to send verification email');
    }
};

const sendPasswordResetOTP = async (email, firstName, otpCode) => {
    const mailOptions = {
        rom: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - Acocie Stores',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Acocie Stores</h1>
        </div>
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
        <p style="color: #666; font-size: 16px;">We received a request to reset your password. Use the OTP code below to proceed:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">
            ${otpCode}
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #ef4444; font-size: 14px; font-weight: bold;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Acocie Stores - Your Trusted E-commerce Platform<br>
          © ${new Date().getFullYear()} Acocie Stores. All rights reserved.
        </p>
      </div>
    `
    };

    try{
        await transporter.sendMail(mailOptions);
        console.log(`✓ Password reset OTP sent to ${email}`);
        return true;
    } catch (error){
        console.error('✗ Error sending password reset OTP:', error.message);
        throw new Error('Failed to send password reset email');
    }
};

const sendWelcomeEmail = async(email,firstName) => {
    const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Acocie Stores!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Acocie Stores</h1>
        </div>
        <h2 style="color: #333;">Welcome to Acocie Stores, ${firstName}! 🎉</h2>
        <p style="color: #666; font-size: 16px;">Your account has been successfully verified. You can now enjoy shopping with us!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">What's Next?</h3>
          <ul style="color: #666;">
            <li>Browse our extensive product catalog</li>
            <li>Add items to your wishlist</li>
            <li>Enjoy secure checkout</li>
            <li>Track your orders in real-time</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Shopping</a>
        </div>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Acocie Stores - Your Trusted E-commerce Platform<br>
          © ${new Date().getFullYear()} Acocie Stores. All rights reserved.
        </p>
      </div>
    `
  };

  try{
    await transporter.sendMail(mailOptions);
    console.log(`✓ Welcome email sent to ${email}`);
    return true;
  } catch (error){
    console.error('✗ Error sending welcome email:', error.message);
    return false;
  }
};

module.exports = {
  sendSignUpOTP,
  sendPasswordResetOTP,
  sendWelcomeEmail
};


