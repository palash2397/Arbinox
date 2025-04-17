import Mongoose, { Schema } from "mongoose";
import trancation from '../enums/trasection';
import status from "../enums/status";
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
const options = {
  collection: "withdrawHistory",
  timestamps: true
};

const withdrawHistory = new Schema(
  {
    exchangeName: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    type: {
      type: String,
      default: trancation.WITHDRAW
    },
    address: { type: String },
    amount: { type: Number },
    coin: { type: String },
    withdrawId: { type: String },
    withdrawStatus: { type: String },
    transactionFee: { type: Number },
    status: { type: String, default: status.ACTIVE }
  },
  options
);
withdrawHistory.plugin(mongoosePaginate);
withdrawHistory.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("withdrawHistory", withdrawHistory);
