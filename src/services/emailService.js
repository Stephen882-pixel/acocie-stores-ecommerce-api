
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


