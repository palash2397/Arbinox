import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
const options = {
    collection: "discountAddresses",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        address: {
            type: String
        },
        status: {
            type: String,
            default: status.ACTIVE
        }
    },
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("discountAddresses", schemaDefination);