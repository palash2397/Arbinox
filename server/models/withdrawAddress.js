import string from "joi/lib/types/string";
import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
const options = {
    collection: "withdrawAddress",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        exchangeName: { type: String },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        address: {
            type: Array
        },
        status: { type: String, default: status.ACTIVE }
    },
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("withdrawAddress", schemaDefination);