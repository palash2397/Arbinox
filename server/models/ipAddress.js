import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
const options = {
    collection: "ipAddress",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        ip: { type: String },
        title: { type: String },
        status: { type: String, default: status.ACTIVE, enum: [status.ACTIVE, status.BLOCK, status.DELETE] }
    },
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("ipAddress", schemaDefination);