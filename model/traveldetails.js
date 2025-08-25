const mongoose = require('mongoose');
const user=require('./Profile')

const TraveldetailsSchema = new mongoose.Schema({
  userId: { type: String, ref: 'user', required: true },
  phoneNumber:{type:String,ref:user},
  username:{type:String},
  // travellername:{type:String,ref:user},
  Leavinglocation: { type: String, required: true },
  Goinglocation: { type: String, required: true },
  LeavingCoordinates: {
    ltd: { type: Number },
    lng: { type: Number }
  },
  GoingCoordinates: {
    ltd: { type: Number },
    lng: { type: Number }
  },
  distance: { type: String },
  vehicleType: {type: String},
  duration:{type:String},
  travelMode: { type: String},
  travelmode_number:{type:String},
  travelDate: { type: Date, required: true },
  expectedStartTime: { type: String },
  expectedEndTime: { type: String },
  rideId:{type:String},
  expectedearning:{type:String, required: true },
  userrating:{type:String,ref:user},
  totalrating:{type:String,ref:user},
  weight:{type:String}, 
  TE:{type:String},
  discount:{type:String},
  payableAmount:{type:String},
  travelId:{type:String},
  status: { 
    type: String, 
    enum: ["Pending","Accepted", "Not Started","started", "In Progress", "Completed", "Cancelled"], 
    default: "Pending" 
  },
  startedat:{type:Object,default:null},
  endedat:{type:Object,default:null},
  
 
}, { timestamps: true });

module.exports = mongoose.models.Traveldetails || mongoose.model('Traveldetails', TraveldetailsSchema);

