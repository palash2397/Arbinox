const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import { type } from 'joi/lib/types/object';
import status from '../enums/status';
import subscriptionPlanType from '../enums/subscriptionPlanType';

const schema = mongoose.Schema;
const subscriptionPlanSchema = new schema({

    title: { type: String },
    description: { type: String },
    arbitrageName: { type: Array },
    coins: { type: Array },
    tenure: { type: Number, default: 90 },
    price: { type: Number },
    status: {
        type: String,
        enum: [status.ACTIVE, status.BLOCK, status.DELETE],
        default: status.ACTIVE
    },
    subscriptionType: {
        type: String,
        enum: [subscriptionPlanType.PAID, subscriptionPlanType.CUSTOM, subscriptionPlanType.FREE],
        default: subscriptionPlanType.PAID
    },
}, { timestamps: true });
subscriptionPlanSchema.plugin(mongoosePaginate);
subscriptionPlanSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("subsciptionPlan", subscriptionPlanSchema);
