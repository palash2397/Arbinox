import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import arbitrageStatus from '../enums/arbitrageStatus';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
import arbitrageType from "../enums/arbitrageType";
import orderType from "../enums/orderType";

const triangularArbitrageSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    connectedExchangeId: {
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange',
    },
    exchangeName: {
        type: String
    },
    capital: {
        type: Number
    },
    capitalInUSDT: {
        type: Number
    },
    amount: {
        type: Number
    },
    filledTotal: {
        type: Number
    },
    expectedProfit: {
        type: Number
    },
    strategy: {
        type: Array
    },
    arbitrageStatus: {
        type: String,
        default: arbitrageStatus.PENDING
    },
    arbitrageType: {
        type: String,
        enum: [arbitrageType.MANUAL, arbitrageType.AUTO, arbitrageType.SNIPER],
        default: arbitrageType.MANUAL
    },
    profit:
    {
        type: Number
    },
    start: {
        type: String
    },
    status: {
        type: String,
        default: status.ACTIVE
    },
    tradeExecutionTime: {
        type: Number
    },
    rebalancingNumber: {
        type: Number,
        default: 0
    },
    isFirstStrategy: {
        type: Boolean,
        default: false
    },
    orderType: {
        type: String,
        enum: [orderType.LIMIT, orderType.MARKET],
        default: orderType.LIMIT
    },
}, { timestamps: true })

triangularArbitrageSchema.plugin(mongoosePaginate);
triangularArbitrageSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("triangularArbitrage", triangularArbitrageSchema);