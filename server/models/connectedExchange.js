import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
const connectedExchangeSchema = new Schema({
    userId: {
        type: String,
    },
    uid: {
        type: String
    },
    apiKey: {
        type: String
    },
    secretKey: {
        type: String
    },
    passphrase: {
        type: String
    },
    customerId:{
        type:String
    },
    tradePassword:{
        type:String
    },
    apiMemo:{
        type:String
    },
    status:{
      type:String,
      default:status.ACTIVE
    },
}, { timestamps: true });

connectedExchangeSchema.plugin(mongoosePaginate);
connectedExchangeSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("connectedExchange", connectedExchangeSchema);