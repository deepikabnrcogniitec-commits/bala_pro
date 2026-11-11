const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] Email to: ${to} | Subject: ${subject}`);
    return { success: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    throw new Error('Failed to send email. Please try again.');
  }
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to DineSmart! 🍽️',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#e63946,#c1121f);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:28px">🍽️ DineSmart</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Your Table, Your Way</p>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <h2 style="color:#333;margin-top:0">Welcome, ${user.name}! 👋</h2>
          <p style="color:#666;line-height:1.6">
            Thank you for joining DineSmart! You're all set to discover amazing restaurants,
            make hassle-free reservations, and enjoy exclusive dining offers.
          </p>
          <div style="text-align:center;margin:30px 0">
            <a href="${process.env.CLIENT_URL}/explore"
               style="background:#e63946;color:white;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
              Explore Restaurants
            </a>
          </div>
          <p style="color:#999;font-size:12px;text-align:center;margin-top:20px">
            © 2024 DineSmart. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });

const sendPasswordResetEmail = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: 'DineSmart - Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#e63946,#c1121f);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0">🔐 Password Reset</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <p style="color:#666">Hi ${user.name},</p>
          <p style="color:#666;line-height:1.6">
            You requested to reset your DineSmart password. Click the button below to set a new password.
            This link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:30px 0">
            <a href="${resetUrl}"
               style="background:#e63946;color:white;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:bold">
              Reset Password
            </a>
          </div>
          <p style="color:#999;font-size:13px">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      </div>
    `,
  });

const sendEmailVerification = (user, verifyUrl) =>
  sendEmail({
    to: user.email,
    subject: 'DineSmart - Verify Your Email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#e63946,#c1121f);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0">✉️ Verify Your Email</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <p style="color:#666">Hi ${user.name},</p>
          <p style="color:#666;line-height:1.6">Please verify your email address to complete your DineSmart registration.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${verifyUrl}"
               style="background:#e63946;color:white;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:bold">
              Verify Email
            </a>
          </div>
          <p style="color:#999;font-size:13px">This link expires in 24 hours.</p>
        </div>
      </div>
    `,
  });

const sendBookingConfirmationEmail = (user, booking) =>
  sendEmail({
    to: user.email,
    subject: `DineSmart - Booking Confirmed! #${booking.bookingId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#2d6a4f,#40916c);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0">✅ Booking Confirmed!</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <p style="color:#666">Hi ${user.name}, your table is reserved!</p>
          <div style="background:white;border-radius:8px;padding:20px;border-left:4px solid #2d6a4f">
            <p><strong>Booking ID:</strong> #${booking.bookingId}</p>
            <p><strong>Restaurant:</strong> ${booking.restaurantName}</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${booking.time}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
          </div>
        </div>
      </div>
    `,
  });

// ─── Pay Bill: receipt to customer + notification to restaurant owner ────────
const sendBillPaymentCustomerReceipt = (customer, billPayment, restaurant) =>
  sendEmail({
    to: customer.email,
    subject: `DineSmart - Payment Receipt #${billPayment.billPaymentId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#2d6a4f,#40916c);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0">✅ Payment Successful</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <p style="color:#666">Hi ${customer.name}, your bill has been paid.</p>
          <div style="background:white;border-radius:8px;padding:20px;border-left:4px solid #2d6a4f">
            <p><strong>Receipt #:</strong> ${billPayment.billPaymentId}</p>
            <p><strong>Restaurant:</strong> ${restaurant.name}</p>
            <p><strong>Bill Amount:</strong> ₹${billPayment.billAmount}</p>
            ${billPayment.discountBreakup?.total ? `<p><strong>Discount:</strong> -₹${billPayment.discountBreakup.total}</p>` : ''}
            <p><strong>Amount Paid:</strong> ₹${billPayment.finalAmount}</p>
            <p><strong>Payment Method:</strong> ${billPayment.paymentMethod.toUpperCase()}</p>
            <p><strong>Reference:</strong> ${billPayment.paymentReference || billPayment.razorpayPaymentId || '-'}</p>
            <p><strong>Paid At:</strong> ${new Date(billPayment.paidAt).toLocaleString('en-IN')}</p>
          </div>
          <p style="color:#999;font-size:12px;text-align:center;margin-top:20px">
            © 2024 DineSmart. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });

const sendBillPaymentOwnerNotification = (owner, billPayment, restaurant, customer) =>
  sendEmail({
    to: owner.email,
    subject: `DineSmart - New Bill Payment Received #${billPayment.billPaymentId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#e63946,#c1121f);padding:30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:white;margin:0">💰 Payment Received</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px">
          <p style="color:#666">Hi ${owner.name}, a customer just paid their bill at <strong>${restaurant.name}</strong>.</p>
          <div style="background:white;border-radius:8px;padding:20px;border-left:4px solid #e63946">
            <p><strong>Receipt #:</strong> ${billPayment.billPaymentId}</p>
            <p><strong>Customer:</strong> ${customer.name} (${customer.phone || customer.email})</p>
            <p><strong>Bill Amount:</strong> ₹${billPayment.billAmount}</p>
            <p><strong>Amount Paid:</strong> ₹${billPayment.finalAmount}</p>
            <p><strong>Commission (${billPayment.commissionPercentage}%):</strong> -₹${billPayment.commissionAmount}</p>
            <p><strong>You Receive:</strong> ₹${billPayment.restaurantReceivable}</p>
            <p><strong>Payment Method:</strong> ${billPayment.paymentMethod.toUpperCase()}</p>
            <p><strong>Paid At:</strong> ${new Date(billPayment.paidAt).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    `,
  });

// Fire-and-forget: emails both parties, never throws (caller doesn't await failures)
const sendBillPaymentEmails = async ({ billPayment, restaurant, customer, owner }) => {
  const jobs = [];
  if (customer?.email) jobs.push(sendBillPaymentCustomerReceipt(customer, billPayment, restaurant));
  if (owner?.email)    jobs.push(sendBillPaymentOwnerNotification(owner, billPayment, restaurant, customer));

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === 'rejected') logger.error(`Bill payment email failed: ${r.reason?.message}`);
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendBookingConfirmationEmail,
  sendBillPaymentEmails,
};
