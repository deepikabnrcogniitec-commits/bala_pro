const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');
const { successResponse, errorResponse } = require('../utils/response');

// Verify caller owns the restaurant
const assertOwnership = async (restaurantId, userId, userRole) => {
  if (userRole === 'admin') return null;
  const restaurant = await Restaurant.findById(restaurantId).select('owner');
  if (!restaurant) return 'Restaurant not found';
  if (restaurant.owner.toString() !== userId.toString()) return 'Not authorized';
  return null;
};

exports.getBranches = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const branches = await Branch.find({ restaurant: restaurantId, isActive: true })
      .populate('manager', 'name email phone')
      .lean();
    successResponse(res, 200, 'Branches fetched', { branches });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('manager', 'name email phone')
      .populate('restaurant', 'name slug');
    if (!branch) return errorResponse(res, 404, 'Branch not found');
    successResponse(res, 200, 'Branch fetched', { branch });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const err = await assertOwnership(restaurantId, req.user._id, req.user.role);
    if (err) return errorResponse(res, err === 'Restaurant not found' ? 404 : 403, err);

    const { name, address, location, contact, manager, operatingHours, isMainBranch } = req.body;

    if (isMainBranch) {
      await Branch.updateMany({ restaurant: restaurantId }, { isMainBranch: false });
    }

    const branch = await Branch.create({
      restaurant: restaurantId,
      name,
      address,
      location,
      contact,
      manager,
      operatingHours,
      isMainBranch: !!isMainBranch,
    });

    successResponse(res, 201, 'Branch created', { branch });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('restaurant', 'owner');
    if (!branch) return errorResponse(res, 404, 'Branch not found');

    const err = await assertOwnership(branch.restaurant._id, req.user._id, req.user.role);
    if (err) return errorResponse(res, 403, err);

    if (req.body.isMainBranch) {
      await Branch.updateMany({ restaurant: branch.restaurant._id }, { isMainBranch: false });
    }

    const allowed = ['name', 'address', 'location', 'contact', 'manager', 'operatingHours', 'isMainBranch', 'isActive'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) branch[k] = req.body[k]; });
    await branch.save();

    successResponse(res, 200, 'Branch updated', { branch });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('restaurant', 'owner');
    if (!branch) return errorResponse(res, 404, 'Branch not found');

    const err = await assertOwnership(branch.restaurant._id, req.user._id, req.user.role);
    if (err) return errorResponse(res, 403, err);

    await branch.deleteOne();
    successResponse(res, 200, 'Branch deleted');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.toggleBranchStatus = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('restaurant', 'owner');
    if (!branch) return errorResponse(res, 404, 'Branch not found');

    const err = await assertOwnership(branch.restaurant._id, req.user._id, req.user.role);
    if (err) return errorResponse(res, 403, err);

    branch.isActive = !branch.isActive;
    await branch.save();
    successResponse(res, 200, `Branch ${branch.isActive ? 'activated' : 'deactivated'}`, { branch });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};
