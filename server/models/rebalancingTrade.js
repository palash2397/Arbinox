import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
import orderType from "../enums/orderType";

const rebalancingTradeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    arbitrageName: {
        type: String
    },
    exchange1: {
        type: Array,
    },
    exchange2: {
        type: Array,
    },
    exchange3: {
        type: Array,
    },
    exchangeUID: {
        type: Array,
    },
    fromCoin: {
        type: Array,
    },
    toCoin: {
        type: Array,
    },
    waitingTime: {
        type: String
    },
    rebalancingNumber: {
        type: String
    },
    isRebalancingActive: {
        type: Boolean,
        default: false
    },
    orderType: {
        type: String,
        enum: [orderType.LIMIT, orderType.MARKET],
        default: orderType.LIMIT
    },
    status: {
        type: String,
        default: status.ACTIVE
    }
}, { timestamps: true })

rebalancingTradeSchema.plugin(mongoosePaginate);
rebalancingTradeSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("rebalancingTrade", rebalancingTradeSchema);