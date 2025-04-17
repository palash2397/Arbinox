import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
const options = {
    collection: "pairs",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        pairs: [],
        status: { type: String, default: status.ACTIVE, enum: [status.ACTIVE, status.DELETE, status.BLOCK] }
    },
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("pairs", schemaDefination);
Mongoose.model("pairs", schemaDefination).find({ status: { $ne: "DELETE" } }, (pairsErr, pairsResult) => {
    if (pairsErr) {
        console.log("Default pairs find error:", pairsErr);
    }
    else if (pairsResult.length != 0) {
        console.log("Default pairs already exists.");
    }
    else {
        var object1 = {
            pairs: [],
        }
        Mongoose.model("pairs", schemaDefination).create(object1, (pairsErr1, pairsResult1) => {
            if (pairsErr1) {
                console.log("Default  pairs creation error:", pairsErr1);
            }
            else {
                console.log("Default pairs successfully created:", pairsResult1);
            }
        })
    }
})