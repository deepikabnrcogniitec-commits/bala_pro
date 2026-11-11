const Wallet = require('../models/Wallet');

// Cashback rate for a completed bill payment, credited straight into the
// customer's Hungora Wallet as spendable coins — redeemable next time by
// picking "Pay with Hungora Wallet" (already wired in bill payment).
// Tune the rate here; nothing else needs to change.
const CASHBACK_RATE = 0.05; // 5% of what was actually paid
const MIN_PAYABLE_FOR_CASHBACK = 1;

/**
 * Credits cashback coins into the customer's wallet after a bill payment
 * completes. Get-or-creates the wallet defensively (every user gets one at
 * signup, but this must never be the reason a payment fails), and never
 * throws — a cashback hiccup should not block/undo a completed payment.
 *
 * @returns {Promise<{ coins: number, walletBalance: number } | null>}
 */
async function awardBillPaymentCashback({ userId, amount, restaurantName, billPaymentId }) {
  if (!userId || !amount || amount < MIN_PAYABLE_FOR_CASHBACK) return null;

  const coins = Math.floor(amount * CASHBACK_RATE);
  if (coins <= 0) return null;

  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await wallet.credit(
      coins,
      `${coins} coins earned on your ₹${amount} bill${restaurantName ? ` at ${restaurantName}` : ''}`,
      billPaymentId ? String(billPaymentId) : undefined,
      'cashback',
    );

    return { coins, walletBalance: wallet.balance };
  } catch (err) {
    return null;
  }
}

module.exports = { awardBillPaymentCashback, CASHBACK_RATE };
