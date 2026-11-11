const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const { successResponse, errorResponse } = require('../utils/response');
const { deleteImage } = require('../config/upload');

const verifyOwner = async (restaurantId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const r = await Restaurant.findOne({ _id: restaurantId, owner: userId });
  return !!r;
};

// ─── Get Menu ─────────────────────────────────────────────────────────────────
const getMenu = async (req, res, next) => {
  try {
    // restaurantId comes from params (menu routes) or params.id (restaurant routes)
    const restaurantId = req.params.restaurantId || req.params.id;
    const { branchId } = req.query;

    const query = { restaurant: restaurantId };
    if (branchId) query.branch = branchId;

    let menu = await Menu.findOne(query);
    if (!menu) menu = { categories: [] };
    return successResponse(res, 200, 'Menu fetched', { menu, categories: menu.categories || [] });
  } catch (error) {
    next(error);
  }
};

// ─── Create / Update Menu ─────────────────────────────────────────────────────
const createOrUpdateMenu = async (req, res, next) => {
  try {
    const restaurantId = req.params.restaurantId;
    const { branchId, name } = req.body;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    let menu = await Menu.findOne({ restaurant: restaurantId, ...(branchId && { branch: branchId }) });
    if (!menu) {
      menu = await Menu.create({ restaurant: restaurantId, branch: branchId, name: name || 'Main Menu' });
    } else {
      if (name) menu.name = name;
      await menu.save();
    }
    return successResponse(res, 200, 'Menu saved', { menu });
  } catch (error) {
    next(error);
  }
};

// ─── Category CRUD ────────────────────────────────────────────────────────────
const addCategory = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { branchId, name, description, sortOrder } = req.body;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    let menu = await Menu.findOne({ restaurant: restaurantId });
    if (!menu) menu = await Menu.create({ restaurant: restaurantId, branch: branchId });

    const imageData = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;
    menu.categories.push({ name, description, image: imageData, sortOrder: sortOrder ?? menu.categories.length });
    await menu.save();

    return successResponse(res, 201, 'Category added', { menu, categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { restaurantId, categoryId } = req.params;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    const menu = await Menu.findOne({ restaurant: restaurantId });
    if (!menu) return errorResponse(res, 404, 'Menu not found');

    const category = menu.categories.id(categoryId);
    if (!category) return errorResponse(res, 404, 'Category not found');

    const { name, description, isAvailable, sortOrder } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (isAvailable !== undefined) category.isAvailable = isAvailable;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (req.file) category.image = { url: req.file.path, publicId: req.file.filename };

    await menu.save();
    return successResponse(res, 200, 'Category updated', { menu, categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { restaurantId, categoryId } = req.params;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    const menu = await Menu.findOne({ restaurant: restaurantId });
    if (!menu) return errorResponse(res, 404, 'Menu not found');

    menu.categories = menu.categories.filter((c) => c._id.toString() !== categoryId);
    await menu.save();
    return successResponse(res, 200, 'Category deleted', { categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

// Multipart bodies send every field as a string — '' / 'undefined' / 'null'
// must become "no value", never NaN (which Mongoose rejects on Number paths).
const toNumber = (v) => {
  if (v === undefined || v === null || v === '' || v === 'undefined' || v === 'null') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// ─── Item CRUD ────────────────────────────────────────────────────────────────
const addMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, categoryId } = req.params;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    const menu = await Menu.findOne({ restaurant: restaurantId });
    if (!menu) return errorResponse(res, 404, 'Menu not found');

    const category = menu.categories.id(categoryId);
    if (!category) return errorResponse(res, 404, 'Category not found');

    const { name, description, price, isVeg, isVegan, calories, preparationTime, tags, allergens } = req.body;
    const imageData = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;

    category.items.push({
      name,
      description,
      price: toNumber(price),
      isVeg: isVeg === 'true' || isVeg === true,
      isVegan: isVegan === 'true' || isVegan === true,
      calories: toNumber(calories),
      preparationTime: toNumber(preparationTime) || 15,
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      allergens: allergens ? (Array.isArray(allergens) ? allergens : JSON.parse(allergens)) : [],
      image: imageData,
      sortOrder: category.items.length,
    });

    await menu.save();
    return successResponse(res, 201, 'Menu item added', { menu, categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

const updateMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, categoryId, itemId } = req.params;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    const menu = await Menu.findOne({ restaurant: restaurantId });
    const category = menu?.categories.id(categoryId);
    const item = category?.items.id(itemId);
    if (!item) return errorResponse(res, 404, 'Item not found');

    const { name, description, price, isVeg, isVegan, calories, preparationTime, isAvailable } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (toNumber(price) !== undefined) item.price = toNumber(price);
    if (isVeg !== undefined) item.isVeg = isVeg === 'true' || isVeg === true;
    if (isVegan !== undefined) item.isVegan = isVegan === 'true' || isVegan === true;
    if (calories !== undefined) item.calories = toNumber(calories);
    if (toNumber(preparationTime) !== undefined) item.preparationTime = toNumber(preparationTime);
    if (isAvailable !== undefined) item.isAvailable = isAvailable === 'true' || isAvailable === true;
    if (req.file) item.image = { url: req.file.path, publicId: req.file.filename };

    await menu.save();
    return successResponse(res, 200, 'Item updated', { menu, categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

const deleteMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, categoryId, itemId } = req.params;

    if (!(await verifyOwner(restaurantId, req.user._id, req.user.role)))
      return errorResponse(res, 403, 'Access denied');

    const menu = await Menu.findOne({ restaurant: restaurantId });
    const category = menu?.categories.id(categoryId);
    if (!category) return errorResponse(res, 404, 'Category not found');

    category.items = category.items.filter((i) => i._id.toString() !== itemId);
    await menu.save();
    return successResponse(res, 200, 'Item deleted', { categories: menu.categories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  createOrUpdateMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
