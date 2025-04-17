import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';

const options = {
    collection: "static-content",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        type: {
            type: String
        },
        title: {
            type: String
        },
        description: {
            type: String
        },
        status: {
            type: String, default: status.ACTIVE
        }
    },
    options
);

module.exports = Mongoose.model("static-content", schemaDefination);
