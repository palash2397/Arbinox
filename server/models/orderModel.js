const mongoose = require('mongoose');
const schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import status from '../enums/status';
// const OrderSchema = new schema({
//     anyobject: schema.Types.Mixed,
// }, { strict: false, timestamps: true });
const OrderSchema = new schema({
    userId: {
        type: schema.Types.ObjectId,
        ref: 'user',
    },
    symbol: {
        type: String
    },
    exchangeName: {
        type: String
    },
    price: {
        type: String
    },
    quantity: {
        type: String
    },
    side: {
        type: String
    },
    orderId: { type: String },
    type: {
        type: String
    },
    orderStatus: { type: String },
    executedQty: { type: String },
    cummulativeQuoteQty: { type: String },
    status: {
        type: String,
        default: status.ACTIVE
    },
}, { timestamps: true })
OrderSchema.plugin(mongoosePaginate);
OrderSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("Order", OrderSchema);