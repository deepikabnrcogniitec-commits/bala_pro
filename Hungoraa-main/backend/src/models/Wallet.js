const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  description: String,
  referenceId: String,
  referenceType: { type: String, enum: ['booking', 'refund', 'topup', 'cashback'] },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    transactions: [transactionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

walletSchema.methods.credit = async function (amount, description, referenceId, referenceType) {
  this.balance += amount;
  this.transactions.push({ type: 'credit', amount, description, referenceId, referenceType });
  return this.save();
};

walletSchema.methods.debit = async function (amount, description, referenceId, referenceType) {
  if (this.balance < amount) throw new Error('Insufficient wallet balance');
  this.balance -= amount;
  this.transactions.push({ type: 'debit', amount, description, referenceId, referenceType });
  return this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
