const mongoose = require("mongoose");
const user = require("./Profile");
const travel = require("./traveldetails");
const cons = require("./consignment.model");

const travelhistorySchema = new mongoose.Schema(
    {
        phoneNumber: { type: String, ref: user },
        pickup: { type: String, ref: travel },
        drop: { type: String, ref: travel },
        travelId: { type: String, ref: travel },
        travelMode: { type: String, ref: travel },
        travelmode_number:{type:String, ref:travel},
        status: {
            type: String,
            enum: ["UPCOMING",  "CANCELLED", "ENDED","STARTED"],
        },
        consignments: { type: Number, default: 0 },
        traveldate: { type: String },
        expectedStartTime: { type: String, ref: travel },
        expectedendtime:{ type: String, ref: travel },

        consignmentDetails: [
            {
                consignmentId: { type: String },
                status: { type: String, enum: ["UPCOMING", "ONGOING", "DELIVERED", "CANCELLED", "EXPIRED"] },
                weight: { type: String, ref: cons },
                dimensions: { type: String, ref: cons },
                pickup: { type: String, },
                drop: { type: String },
                timestamp:{ type: Date, default: Date.now },
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.models.travelhistory || mongoose.model("travelhistory", travelhistorySchema);
