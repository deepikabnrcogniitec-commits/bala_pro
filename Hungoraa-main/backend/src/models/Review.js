const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    subRatings: {
      food: { type: Number, min: 1, max: 5 },
      service: { type: Number, min: 1, max: 5 },
      ambiance: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
    },
    title: { type: String, maxlength: 100 },
    comment: { type: String, required: true, maxlength: 1000 },
    images: [{ url: String, publicId: String }],
    tags: [String], // ['great-food', 'friendly-staff', 'nice-ambiance']
    isVerified: { type: Boolean, default: false }, // verified booking
    isPublished: { type: Boolean, default: true },
    ownerReply: {
      text: String,
      repliedAt: Date,
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    helpfulVotes: { type: Number, default: 0 },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isReported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ restaurant: 1, isPublished: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ booking: 1 }, { unique: true, sparse: true });

// Update restaurant average rating after save
reviewSchema.post('save', async function () {
  const Restaurant = mongoose.model('Restaurant');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { restaurant: this.restaurant, isPublished: true } },
    { $group: { _id: '$restaurant', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Restaurant.findByIdAndUpdate(this.restaurant, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].count,
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
