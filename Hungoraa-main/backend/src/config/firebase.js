const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp;

const initFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      return firebaseApp;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    logger.error(`Firebase initialization failed: ${error.message}`);
  }
};

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!firebaseApp) initFirebase();

  const message = {
    notification: { title, body },
    data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    token,
  };

  return admin.messaging().send(message);
};

const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  if (!firebaseApp) initFirebase();
  if (!tokens?.length) return null;

  const message = {
    notification: { title, body },
    data,
    tokens,
  };

  return admin.messaging().sendEachForMulticast(message);
};

module.exports = { initFirebase, sendPushNotification, sendMulticastNotification };
