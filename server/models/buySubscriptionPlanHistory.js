const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import status from '../enums/status';
import paymentType from '../enums/paymentType';

const schema = mongoose.Schema;
const buySubscriptionPlanHistorySchema = new schema({
    userId: {
        type: schema.Types.ObjectId,
        ref: 'user',
    },
    subscriptionPlaneId: {
        type: schema.Types.ObjectId,
        ref: 'subsciptionPlan',
    },
    transactionHash: { type: String },
    isValid: { type: Boolean },
    pairs: { type: Array },
    exchanges: { type: Array },
    planAmount: { type: Number },
    planName: { type: String },
    amount: { type: Number },
    tradeFee: { type: String },
    planStatus: { type: String, default: "ACTIVE" },
    planDuration: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
    price_amount: { type: String },
    payment_id: { type: String },
    pay_address: { type: String },
    payment_status: { type: String },
    pay_currency: { type: String },
    pay_amount: { type: String },
    price_currency: { type: String },
    order_id: { type: String },
    transactionId: { type: String },
    exchangeUID: { type: Array },
    arbitrageName: { type: Array },
    capital: { type: Number },
    profits: { type: Number },
    coinType: { type: String, enum: ["USD", "FIERO", "NOT"], default: "NOT" },
    isFuelDeduction: { type: Boolean, default: false },
    status: {
        type: String,
        enum: [status.ACTIVE, status.BLOCK, status.DELETE],
        default: status.ACTIVE
    },
    isMailed: {
        type: Boolean,
        default: false
    },
    paymentType: {
        type: String,
        enum: [paymentType.CARD, paymentType.CASH, paymentType.CRYPTO, paymentType.FREE]
    },
    transactionReference: {
        type: String,
    },
    settlestatus: {
        type: String,
    },
}, { timestamps: true });
buySubscriptionPlanHistorySchema.plugin(mongoosePaginate);
buySubscriptionPlanHistorySchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("buySubsciptionPlanHistory", buySubscriptionPlanHistorySchema);