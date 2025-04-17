import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
const pathSchema = new Schema({
    
    arbitrageName:{
        type:String
    },
    exchange:{
        type:String
    },
    depthOfArbitrage:{
        type:Number,
        enum:[3,4,5]
    },
    path:{
       type:Object
    },
    status:{
        type:String,
        default:status.ACTIVE
    },
}, { timestamps:true});
pathSchema.plugin(mongoosePaginate);
pathSchema.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("profitPath", pathSchema);