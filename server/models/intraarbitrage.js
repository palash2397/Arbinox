import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
import arbitrageStatus from '../enums/arbitrageStatus';

const intraArbitrageSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    connectedExchangeId1: {
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange',
    },
    connectedExchangeId2:{
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange', 
    },
    base:{
        type:String
    },
    pair:
    {
        type:String
    },
    strategy: {
        type: Array
    },
    capital:{
        type:Number
    },
    profitLossAmount:
    {
        type:String,
    },
    arbitrageStatus:{
        type:String,
        default: arbitrageStatus.PENDING
    },
    profit:
    {
      type:Number
    },
    status:{
        type:String,
        default:status.ACTIVE
      },
}, { timestamps: true })
intraArbitrageSchema.plugin(mongoosePaginate);
intraArbitrageSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("intraArbitrage", intraArbitrageSchema);