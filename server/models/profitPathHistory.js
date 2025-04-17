import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
const pathSchema = new Schema({

    arbitrageName: {
        type: String
    },
    exchange: {
        type: String
    },
    coins: {
        type: Array
    },
    capital: { type: Number },
    profit: { type: Number },
    profitPercent: { type: Number },
    profitCurrencyBase: { type: Number },
    start: { type: String },
    pair: { type: String },
    base: { type: String },
    buy: { type: String },
    exchange1_price: { type: Number },
    volume1: { type: String },
    withdrawFee1: { type: String },
    tradeFee1: { type: Number },
    sell: { type: String },
    exchange2_price: { type: Number },
    volume2: { type: String },
    withdrawFee2: { type: String },
    tradeFee2: { type: Number },
    profit: { type: String },
    PercentageProfit: { type: String },
    receiveExchange1: { type: Number },
    receiveExchange2: { type: Number },
    startCoin: { type: Array },
    baseCapital: { type: Number },
    profitInUsdt: { type: Number },
    livePrice: { type: String },
    status: {
        type: String,
        default: status.ACTIVE
    },
}, { timestamps: true });
pathSchema.plugin(mongoosePaginate);
pathSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("profitPathHistory", pathSchema);