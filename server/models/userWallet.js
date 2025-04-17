import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';

const options = {
    collection: "userWallet",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        walletFieroAddress: {
            type: String
        },
        walletUsdAddress:{
            type: String
        },
        userId: { type: Schema.Types.ObjectId, ref: 'user' },
        status: {
            type: String, default: status.ACTIVE,
            enum: [status.ACTIVE, status.BLOCK, status.DELETE],
        }
    },
    options
);

module.exports = Mongoose.model("userWallet", schemaDefination);
