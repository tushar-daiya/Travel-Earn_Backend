const mongoose = require('mongoose');
const travel=require('./traveldetails')

const EarningsSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  travelId: {
    type: String,
    default: "N/A",
    ref:travel
  },
  transactions: [
    {
      title: { type: String, required: true },
      travelId: { type: String, default: "N/A",ref:travel },
      totalFare:{type: Number},
      senderTotalPay: {type: Number},
      amount: { type: Number, required: true },
      paymentMethod: { type: String, enum: ["Cash", "Online"], required: true },
      paymentId: { type: String, default: "Cash Payment" },
      status: { type: String, enum: ["In Progress", "Completed", "Failed"], default: "In Progress" },
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });
module.exports = mongoose.models.Earnings || mongoose.model('Earnings', EarningsSchema);
