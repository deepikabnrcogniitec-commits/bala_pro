const Table = require('../models/Table');
const { successResponse, errorResponse } = require('../utils/response');

exports.createTable = async (req, res) => {
  try {
    const { restaurantId, branchId, name, capacity, type, floor, isActive } = req.body;
    const count = await Table.countDocuments({ restaurant: restaurantId });
    const table = await Table.create({
      restaurant: restaurantId,
      branch: branchId,
      name,
      number: count + 1,
      capacity: parseInt(capacity) || 2,
      type: type || 'indoor',
      floor: String(floor || 'Ground'),
      isActive: isActive !== false && isActive !== 'false',
    });
    successResponse(res, 201, 'Table created', { table });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getRestaurantTables = async (req, res) => {
  try {
    const { restaurantId, branchId, type } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurant = restaurantId;
    if (branchId) filter.branch = branchId;
    if (type) filter.type = type;
    const tables = await Table.find(filter).sort('floor name');
    successResponse(res, 200, 'Tables fetched', { tables });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { restaurantId, branchId, name, capacity, type, floor, isActive } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = parseInt(capacity);
    if (type !== undefined) updates.type = type;
    if (floor !== undefined) updates.floor = String(floor);
    if (isActive !== undefined) updates.isActive = isActive !== false && isActive !== 'false';

    const table = await Table.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!table) return errorResponse(res, 404, 'Table not found');
    successResponse(res, 200, 'Table updated', { table });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return errorResponse(res, 404, 'Table not found');
    successResponse(res, 200, 'Table deleted');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return errorResponse(res, 404, 'Table not found');
    table.isActive = !table.isActive;
    await table.save();
    successResponse(res, 200, 'Table availability toggled', { table });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};
