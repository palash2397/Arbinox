var CronJob = require('cron').CronJob;
const { withdraw_delisted } = require('../../../../helper/get_tickers');
const exchangeModel = require('../../../../models/exchange');
import config from "config";

var withdawfee = new CronJob(config.get('cronTime.withdrawFees'), async function () {
    try {
        var exchangeList = await exchangeModel.find({ status: "ACTIVE", exchangeName: { $ne: "Coinbase" } })
        if (exchangeList.length > 0) {
            // withdawfee.stop();
            exchangeList.map(async (exchangeObj) => {
                let exchange = exchangeObj.exchangeName;
                let withdrawData = await withdraw_delisted(exchange);
                if (withdrawData) {
                    let exchangeTokenData = await exchangeModel.findOne({ exchangeName: exchange, status: 'ACTIVE' })
                    if (exchangeTokenData) {
                        let updateExchangeToken = await exchangeModel.findByIdAndUpdate({ _id: exchangeTokenData._id }, { $set: { withdrawFee: withdrawData } }, { new: true });
                        if (updateExchangeToken) {
                            console.log(`${exchange} with withdrawfee updated successfully.`)
                        }
                    }
                }
            })
            console.log('withdraw 24')
            // withdawfee.start();
        }
    } catch (error) {
        withdawfee.start();
        console.log("Error in withdawfee cron job catch ==>", error);
    }
})


///////////////////////////
//start-stop cron-job

withdawfee.start();
// withdawfee.stop();