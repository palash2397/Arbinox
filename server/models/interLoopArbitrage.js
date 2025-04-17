import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
import arbitrageStatus from '../enums/arbitrageStatus';

const interLoopArbitrageSchema = new Schema({
    userId: {
        type:Schema.Types.ObjectId,
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
    connectedExchangeId3:{
        type: Schema.Types.ObjectId,
        ref: 'connectedExchange', 
    },
    strategy: {
        type: Array
    },
    capital:{
        type:Number
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
interLoopArbitrageSchema.plugin(mongoosePaginate);
interLoopArbitrageSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("interLoopAribitrage", interLoopArbitrageSchema);