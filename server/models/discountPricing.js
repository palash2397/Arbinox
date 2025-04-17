import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
const options = {
    collection: "discountPricing",
    timestamps: true
};

const schemaDefination = new Schema(
    {
        amount: {
            type: Number
        },

    },
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("discountPricing", schemaDefination);
Mongoose.model("discountPricing", schemaDefination).findOne({}, (err, result) => {
    if (err) {
        console.log("DEFAULT DISCOUNT ERROR", err);
    }
    else if (result) {
        console.log("Default DISCOUNT already exist.");
    }
    else {
        let obj = {
            amount: 90
        };
        Mongoose.model("discountPricing", schemaDefination)(obj).save((err1, result1) => {
            if (err1) {
                console.log("DEFAULT DISCOUNT  creation ERROR", err1);
            } else {
                console.log("DEFAULT DISCOUNT Created", result1);
            }
        });
    }
});
