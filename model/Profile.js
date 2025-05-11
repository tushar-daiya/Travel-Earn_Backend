const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  phoneNumber: { type: String, unique: true },
  profilePicture: { type: String },
  password: { type: String, required: true },
  tokens: [{ token: { type: String } }],
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'traveler'], default: 'user' },
  userId: { type: String },
  createdAt: { type: Date, default: Date.now },
  socketId: { type: String },
  userrating: { type: String },
  totalrating: { type: String },
  feedback: { type: String },
  otpTimestamp: { type: Number, default: 0 },
  expiresAt: { type: Number },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  lastUpdated: { type: Date, default: Date.now }
});

userSchema.index({ currentLocation: '2dsphere' });

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.userprofiles || mongoose.model('userprofiles', userSchema);
