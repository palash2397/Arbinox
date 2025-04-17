const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import status from '../enums/status';

const schema = mongoose.Schema;
const ipAddressCheckSchema = new schema({
    isTrue: { type: Boolean, default: false },
    status: {
        type: String,
        default: status.ACTIVE,
        enum:[status.ACTIVE,status.BLOCK,status.DELETE]
    }
}, { timestamps: true });
ipAddressCheckSchema.plugin(mongoosePaginate);
ipAddressCheckSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("ipAddressCheck", ipAddressCheckSchema);
mongoose.model("ipAddressCheck", ipAddressCheckSchema).find({ status: { $ne: "DELETE" } }, (findErr, findResult) => {
    if (findErr) {
        console.log("Default ip address check find error:", findErr);
    }
    else if (findResult.length != 0) {
        console.log("Default ip address check already exists.");
    }
    else {
        var object = {
            isTrue: false,
            status:status.ACTIVE
        }
        mongoose.model("ipAddressCheck", ipAddressCheckSchema).create(object, (createErr1, createResult1) => {
            if (createErr1) {
                console.log("Default ip address check creation error:", createErr1);
            }
            else {
                console.log("Default ip address check successfully created:", createResult1);
            }
        })
    }
})
