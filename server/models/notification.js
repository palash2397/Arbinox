import Mongoose, { Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
import status from '../enums/status';
import notificationType from "../enums/notificationType";


const notificationSchema = new Schema({
    userId: {
        type: Mongoose.Schema.ObjectId,
        ref: "user"
    },
    arbitrageId:
    {
        type: String
    },
    title: {
        type: String
    },
    body: {
        type: String
    },
    orderId: {
        type: String
    },
    symbol: {
        type: String
    },
    notificationType: {
        type: String,
        enum: [notificationType.OTHER, notificationType.TRADE_CANCEL, notificationType.TRADE_ERROR, notificationType.TRADE_SUCCESS],
        default:notificationType.OTHER
    },
    isRead: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: status.ACTIVE
    }
}, {
    timestamps: true
})
notificationSchema.plugin(mongoosePaginate);
module.exports = Mongoose.model("notification", notificationSchema);
