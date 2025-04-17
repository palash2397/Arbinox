import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
import arbitrageStatus from '../enums/arbitrageStatus';
import arbitrageType from "../enums/arbitrageType";

const directArbitrageSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    connectedExchangeId1: {
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange',
    },
    connectedExchangeId2: {
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange',
    },
    base: {
        type: String
    },
    pair:
    {
        type: String
    },
    strategy: {
        type: Array
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
    profit:
    {
        type: Number
    },
    filledTotal: {
        type: Number
    },
    arbitrageStatus: {
        type: String,
        default: arbitrageStatus.PENDING
    },
    arbitrageType: {
        type: String,
        enum: [arbitrageType.MANUAL, arbitrageType.AUTO,arbitrageType.SNIPER],
        default: arbitrageType.MANUAL
    },
    status: {
        type: String,
        default: status.ACTIVE
    },
}, { timestamps: true });

directArbitrageSchema.plugin(mongoosePaginate);
directArbitrageSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("directArbitrage", directArbitrageSchema);