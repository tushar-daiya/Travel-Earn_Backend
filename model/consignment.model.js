const mongoose = require('mongoose');
const userprofiles = require('./Profile');

const DriverSchema = new mongoose.Schema({
  phoneNumber:{type:String,ref:userprofiles},
  username:{type:String,ref:userprofiles},
  
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
  recievername:{type:String},
  recieverphone:{type:String},
  Description:{type:String},
  weight:{type:String},
  category:{type:String,enum:['document','nondocument']},
  subcategory:{type:String},
  dimensions: {
    length: { type: String },
    breadth: { type: String },
    height: { type: String },
    unit: { type: String, enum: ['cm', 'inch'] },
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
  images: [{
    type: String // Store image URLs or file paths as array
  }],
  consignmentId:{type:String},
  distance:{type:String},
  duration:{type:String},
  
  status: { 
    type: String, 
    enum: ["Pending", "Yet to Collect", "Collected", "In Transit", "Delivered", "Completed", "Rejected","Accepted"], 
    default: "Yet to Collect" 
  },
  sotp:{type:String},
  rotp:{type:String},
 

}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.models.consignment || mongoose.model('consignment', DriverSchema);

