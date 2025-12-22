
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

const sendOrderConfirmation = async (email, firstName, orderNumber, totalAmount) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Order Confirmation - ${orderNumber} - Acocie Stores`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Acocie Stores</h1>
        </div>
        
        <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0;">Order Confirmed! 🎉</h2>
        </div>

        <h2 style="color: #333;">Hi ${firstName},</h2>
        <p style="color: #666; font-size: 16px;">Thank you for your order! We've received your order and will process it shortly.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">Order Details</h3>
          <table style="width: 100%; color: #333;">
            <tr>
              <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-size: 20px; color: #2563eb;"><strong>KES ${totalAmount}</strong></td>
            </tr>
          </table>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">What's Next?</h3>
          <ul style="color: #666;">
            <li>We'll process your order within 24 hours</li>
            <li>You'll receive a shipping confirmation email once your order is dispatched</li>
            <li>Track your order anytime in your account dashboard</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Track Your Order
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">If you have any questions, feel free to contact our support team.</p>

        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Acocie Stores - Your Trusted E-commerce Platform<br>
          © ${new Date().getFullYear()} Acocie Stores. All rights reserved.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Order confirmation sent to ${email} for order ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending order confirmation:', error.message);
    return false;
  }
};
const sendOrderConfirmedNotification = async (email, firstName, orderNumber) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Order Confirmed - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Order Confirmed!</h2>
        <p>Hi ${firstName},</p>
        <p>Your payment has been verified and your order <strong>${orderNumber}</strong> is confirmed!</p>
        <p>We'll notify you once your items are being prepared for shipment.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Order confirmed email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending order confirmed email:', error.message);
    return false;
  }
};
const sendOrderProcessingNotification = async (email, firstName, orderNumber) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Order Processing - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Order is Being Prepared</h2>
        <p>Hi ${firstName},</p>
        <p>Great news! Your order <strong>${orderNumber}</strong> is now being prepared for shipment.</p>
        <p>You'll receive another email with tracking information once your order ships.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Order processing email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending order processing email:', error.message);
    return false;
  }
};

const sendOrderShippedNotification = async (email, firstName, orderNumber, trackingNumber, carrier) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Order Shipped - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Your Order Has Shipped! 📦</h2>
        <p>Hi ${firstName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been shipped!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Carrier:</strong> ${carrier}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        </div>
        <p>Track your order in your account dashboard.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Order shipped email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending order shipped email:', error.message);
    return false;
  }
};

const sendOrderDeliveredNotification = async (email, firstName, orderNumber) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Order Delivered - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Order Delivered! 🎉</h2>
        <p>Hi ${firstName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been delivered!</p>
        <p>We hope you love your purchase. If you have any questions, feel free to contact us.</p>
        <p>Thank you for shopping with Acocie Stores!</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Order delivered email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending order delivered email:', error.message);
    return false;
  }
};

const sendCancellationApprovedNotification = async (email, firstName, orderNumber) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Cancellation Approved - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Cancellation Approved</h2>
        <p>Hi ${firstName},</p>
        <p>Your cancellation request for order <strong>${orderNumber}</strong> has been approved.</p>
        <p>Your refund will be processed within 5-7 business days.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Cancellation approved email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending cancellation approved email:', error.message);
    return false;
  }
};

const sendRefundProcessedNotification = async (email, firstName, orderNumber, amount) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Refund Processed - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Acocie Stores</h1>
        <h2>Refund Processed</h2>
        <p>Hi ${firstName},</p>
        <p>Your refund for order <strong>${orderNumber}</strong> has been processed.</p>
        <p><strong>Refund Amount:</strong> KES ${amount}</p>
        <p>The refund will appear in your original payment method within 5-7 business days.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Refund processed email sent for ${orderNumber}`);
    return true;
  } catch (error) {
    console.error('✗ Error sending refund processed email:', error.message);
    return false;
  }
};


module.exports = {
  sendSignUpOTP,
  sendPasswordResetOTP,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderConfirmedNotification,
  sendOrderProcessingNotification,
  sendOrderShippedNotification,
  sendOrderDeliveredNotification,
  sendCancellationApprovedNotification
};


