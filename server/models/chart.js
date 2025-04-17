const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import status from '../enums/status';

const schema = mongoose.Schema;
const chartSchema = new schema({
    exchangeName: {
        type: String,
    },
    askBid: { type: Object },
    ohlc:{ type: Object},
    uid: {
        type: String
    },
    status: {
        type: String,
        default: status.ACTIVE
    }
}, { timestamps: true });
chartSchema.plugin(mongoosePaginate);
chartSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("chart", chartSchema);
mongoose.model("chart", chartSchema).find({ status: { $ne: "DELETE" } }, (chartError, chartResult) => {
    if (chartError) {
        console.log("Default chart error:", chartError);
    }
    else if (chartResult.length != 0) {
        console.log("Default chart already exists.");
    }
    else {
        var object1 = {
            exchangeName: 'Binance',
            uid: 'binance'
        }
        var object2 = {
            exchangeName: 'Huobi',
            uid: 'huobi'
        }
        var object3 = {
            exchangeName: 'Coinbase',
            uid: 'coinbase'
        }
        var object4 = {
            exchangeName: 'Kraken',
            uid: 'kraken'
        }
        var object5 = {
            exchangeName: 'Mexc',
            uid: 'mexc'
        }
        var object6 = {
            exchangeName: 'Bitmart',
            uid:'bitmart'
        }
        var object7 = {
            exchangeName: 'Gemini',
            uid:'gemini'
        }
        mongoose.model("chart", chartSchema).create(object1, object3, object4, object5,object6,object7, (chartErr, chartResult) => {
            if (chartErr) {
                console.log("Default chart creation error:", chartErr);
            }
            else {
                console.log("Default chart successfully created:", chartResult);
            }
        })
    }
})
