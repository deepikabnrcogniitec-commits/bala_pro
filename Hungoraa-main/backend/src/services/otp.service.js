const twilio = require('twilio');
const logger = require('../utils/logger');

let client;
const getClient = () => {
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
};

const sendOTP = async (phone, otp) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    return { success: true, sid: 'dev-mode' };
  }

  try {
    const message = await getClient().messages.create({
      body: `Your DineSmart verification code is: ${otp}. Valid for 10 minutes. Do not share this OTP.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`OTP sent to ${phone}, SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    logger.error(`OTP send failed for ${phone}: ${error.message}`);
    throw new Error('Failed to send OTP. Please try again.');
  }
};

module.exports = { sendOTP };
