const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
let mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
import status from '../enums/status';

const schema = mongoose.Schema;
const exchangeSchema = new schema({
    exchangeName: {
        type: String,
    },
    coins: {
        type: Array
    },
    assets: { type: Object },
    tickers: { type: Object },
    tradeFee:
    {
        type: Object
    },
    // makerTakerFee:{
    //     type: Object
    // },
    withdrawFee:
    {
        type: Object
    },
    uid: {
        type: String
    },
    status: {
        type: String,
        default: status.ACTIVE
    }
}, { timestamps: true });
exchangeSchema.plugin(mongoosePaginate);
exchangeSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model("exchange", exchangeSchema);
mongoose.model("exchange", exchangeSchema).find({ status: { $ne: "DELETE" } }, (exchangeErr, exchangeResult) => {
    if (exchangeErr) {
        console.log("Default exchangeName error:", exchangeErr);
    }
    else if (exchangeResult.length != 0) {
        console.log("Default exchangeName already exists.");
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
        var object8 = {
            exchangeName: 'Gateio',
            uid:'gateio'
        }
        // var object9 = {
        //     exchangeName: 'HitBTC',
        //     uid:'hitbtc'
        // }
        mongoose.model("exchange", exchangeSchema).create(object1, object3, object4, object5,object6,object7,object8, (exchangeErr1, exchangeResult1) => {
            if (exchangeErr1) {
                console.log("Default exchangeName creation error:", exchangeErr1);
            }
            else {
                console.log("Default exchangeName successfully created:", exchangeResult1);
            }
        })
    }
})
