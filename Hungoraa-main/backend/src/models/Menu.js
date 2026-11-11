const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  discountPrice: Number,
  image: { url: String, publicId: String },
  isVeg: { type: Boolean, default: true },
  isVegan: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  calories: Number,
  tags: [String],
  allergens: [String],
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  preparationTime: { type: Number, default: 15 }, // minutes
});

const menuCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  image: { url: String, publicId: String },
  isAvailable: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  availableFrom: String, // '11:00'
  availableTo: String, // '23:00'
  items: [menuItemSchema],
});

const menuSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    name: { type: String, default: 'Main Menu' },
    isActive: { type: Boolean, default: true },
    categories: [menuCategorySchema],
  },
  { timestamps: true }
);

menuSchema.index({ restaurant: 1, branch: 1 });

const Menu = mongoose.model('Menu', menuSchema);
module.exports = Menu;
