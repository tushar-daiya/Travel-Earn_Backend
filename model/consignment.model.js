const mongoose = require('mongoose');
const userprofiles = require('./Profile');

const DriverSchema = new mongoose.Schema({
  phoneNumber: { type: String, ref: userprofiles },
  username: { type: String, ref: userprofiles },

  startinglocation: { type: String, required: true },
  goinglocation: { type: String, required: true },
  fullstartinglocation: { type: String },
  fullgoinglocation: { type: String },
  LeavingCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  GoingCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  recievername: { type: String },
  recieverphone: { type: String },
  Description: { type: String },
  weight: { type: String },
  dimensionalweight: { type: String },
  category: { type: String, enum: ['document', 'nondocument'] },
  subcategory: { type: String },
  dimensions: {
    length: { type: String, required: true },
    breadth: { type: String, required: true },
    height: { type: String, required: true },
    unit: { type: String, enum: ['cm', 'inch'], required: true },
  },
  handleWithCare: {
    type: Boolean,
    default: false,
  },
  specialRequest: {
    type: String,
  },
  dateOfSending: {
    type: Date,
    required: true,
  },
  durationAtEndPoint: {
    type: String,
    // required: true,
  },
  images: [{
    type: String,
    default: [] // Store array of image URLs
  }],
  consignmentId: { type: String },
  earning: { type: String },
  distance: { type: String },
  duration: { type: String },
  trainfare: { type: String },
  aeroplanefare: { type: String },

  status: {
    type: String,
    enum: ["Pending", "Not Started", "In Progress", "Completed", "Rejected", "Accepted", "Expired"],
    default: "Pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "successful", "declined"],
    default: "pending"
  },
  sotp: { type: String },
  rotp: { type: String },


}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.models.consignment || mongoose.model('consignment', DriverSchema);

