import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';

const sniperBotSchema = new Schema({
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
    capital: {
        type: Number
    },
    maxThreshold: {
        type: Number
    },
    minThreshold: {
        type: Number
    },
    numberOfTrade: {
        type: Number
    },
    isNumberOfTradeActive: {
        type: Boolean,
        default: false
    },
    fromCoin: {
        type: Array,
    },
    toCoin: {
        type: Array,
    },
    status: {
        type: String,
        default: status.ACTIVE
    }
}, { timestamps: true })

sniperBotSchema.plugin(mongoosePaginate);
sniperBotSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("sniperBot", sniperBotSchema);