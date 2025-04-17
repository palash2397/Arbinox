import mongoose from 'mongoose';
const schema = mongoose.Schema;
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
import status from '../enums/status'

const capitalAmountSchema = new schema({

    triangular: {
        type: Number,
        default: 1000
    },
    loop: {
        type: Number,
        default: 1000
    },
    intra: {
        type: Number,
        default: 1000
    },
    direct: {
        type: Number,
        default: 1000
    },
    intraSingleExchange:{
        type: Number,
        default: 1000
    },
    status: {
        type: String,
        enum: [status.ACTIVE, status.BLOCK, status.DELETE],
        default: status.ACTIVE
    }
}, { timestamps: true })

capitalAmountSchema.plugin(mongoosePaginate);
capitalAmountSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("capitalAmount", capitalAmountSchema);
mongoose.model("capitalAmount", capitalAmountSchema).find({ status: { $ne: "DELETE" } }, (capitalAmountErr, capitalAmountResult) => {
    if (capitalAmountErr) {
        console.log("Default capital amount find error:", capitalAmountErr);
    }
    else if (capitalAmountResult.length != 0) {
        console.log("Default capital amount already exists.");
    }
    else {
        var object1 = {
            triangular: 1000,
            loop: 1000,
            intra: 1000,
            direct: 1000,
        }
        mongoose.model("capitalAmount", capitalAmountSchema).create(object1, (capitalAmountErr1, capitalAmountResult1) => {
            if (capitalAmountErr1) {
                console.log("Default  capital amount creation error:", capitalAmountErr1);
            }
            else {
                console.log("Default capital amount successfully created:", capitalAmountResult1);
            }
        })
    }
})