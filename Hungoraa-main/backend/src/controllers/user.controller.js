const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { successResponse, errorResponse } = require('../utils/response');
const { uploadSingle } = require('../config/upload');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -otp -refreshTokens -passwordResetToken -emailVerificationToken')
      .populate('wallet', 'balance');
    successResponse(res, 200, 'Profile fetched', { user });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'dateOfBirth', 'gender', 'notificationPrefs'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.file) {
      updates['avatar.url'] = req.file.path;
      updates['avatar.publicId'] = req.file.filename;
    }

    if (updates.email && updates.email !== req.user.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (exists) return errorResponse(res, 400, 'Email already in use');
      updates.isEmailVerified = false;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
      .select('-password -otp -refreshTokens -passwordResetToken -emailVerificationToken');

    successResponse(res, 200, 'Profile updated', { user });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Current password and new password are required');
    }
    if (newPassword.length < 8) {
      return errorResponse(res, 400, 'New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) return errorResponse(res, 400, 'No password set. Use forgot password.');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return errorResponse(res, 401, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();

    successResponse(res, 200, 'Password changed successfully');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return errorResponse(res, 400, 'FCM token is required');

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { fcmTokens: fcmToken },
    });

    successResponse(res, 200, 'FCM token updated');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.removeFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: fcmToken },
    });
    successResponse(res, 200, 'FCM token removed');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getSavedRestaurants = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('savedRestaurants')
      .populate({
        path: 'savedRestaurants',
        select: 'name slug cuisines priceRange averageRating totalReviews logo coverImage address isActive',
      });

    successResponse(res, 200, 'Saved restaurants', { restaurants: user.savedRestaurants });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { label, street, city, state, pincode, coordinates, isDefault } = req.body;

    if (isDefault) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { 'addresses.$[].isDefault': false },
      });
    }

    const address = { label, street, city, state, pincode, isDefault: !!isDefault };
    if (coordinates) {
      address.location = { type: 'Point', coordinates };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { addresses: address } },
      { new: true }
    ).select('addresses');

    successResponse(res, 201, 'Address added', { addresses: user.addresses });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, street, city, state, pincode, coordinates, isDefault } = req.body;

    if (isDefault) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { 'addresses.$[].isDefault': false },
      });
    }

    const updateFields = {};
    if (label !== undefined) updateFields['addresses.$.label'] = label;
    if (street !== undefined) updateFields['addresses.$.street'] = street;
    if (city !== undefined) updateFields['addresses.$.city'] = city;
    if (state !== undefined) updateFields['addresses.$.state'] = state;
    if (pincode !== undefined) updateFields['addresses.$.pincode'] = pincode;
    if (isDefault !== undefined) updateFields['addresses.$.isDefault'] = isDefault;
    if (coordinates) updateFields['addresses.$.location'] = { type: 'Point', coordinates };

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, 'addresses._id': addressId },
      { $set: updateFields },
      { new: true }
    ).select('addresses');

    successResponse(res, 200, 'Address updated', { addresses: user.addresses });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    ).select('addresses');
    successResponse(res, 200, 'Address removed', { addresses: user.addresses });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.password) {
      if (!password) return errorResponse(res, 400, 'Password required to delete account');
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return errorResponse(res, 401, 'Incorrect password');
    }

    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      isBlocked: true,
      name: 'Deleted User',
      email: null,
      phone: null,
      googleId: null,
      fcmTokens: [],
      refreshTokens: [],
    });

    successResponse(res, 200, 'Account deleted successfully');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};
