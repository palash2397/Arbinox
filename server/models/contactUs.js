import mongoose from 'mongoose';
const schema = mongoose.Schema;
import mongoosePaginate from 'mongoose-paginate';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate';
import status from '../enums/status'
const contactus = new schema({

    name: {
        type: String
    },
    email: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    message: {
        type: String
    },
    status: {
        type: String,
        enum: [status.ACTIVE, status.BLOCK, status.DELETE ,status.RESOLVED , status.PENDING],
        default: status.ACTIVE
    },
    reply:{
        type: Boolean,
        default: false
    },
    replyMsg: {
        type: String,
        default: ''
    }
    
}, { timestamps: true })

contactus.plugin(mongoosePaginate);
contactus.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("contactus", contactus);