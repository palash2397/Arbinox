var CronJob = require('cron').CronJob;
const { withdrawHistory } = require('../../../../helper/buySell');
import { walletServices } from '../../services/wallet'
const { withdrawHistoryList, withdrawHistoryUpdate, connectedExchangeData } = walletServices
import config from "config";
import transactionType from '../../../../enums/trasection'
import { filter_txIdForWithdraw } from '../../../../helper/withdrawHistoryStatusFilter'


var withdawHitstoryCron = new CronJob(config.get('cronTime.withdrawHistory'), async function () {
    try {
        var withdrawList = await withdrawHistoryList({ status: "ACTIVE", type: transactionType.WITHDRAW, withdrawStatus: 'APPLY' })
        if (withdrawList.length > 0) {
            withdawHitstoryCron.stop();
            withdrawList.map(async (withdrawHistoryObj) => {
                let exchange = (withdrawHistoryObj.exchangeName).toLowerCase();
                let connectedExchangeDataRes = await connectedExchangeData({ userId: withdrawHistoryObj.userId, uid: exchange })
                let getDetails = await withdrawHistory(withdrawHistoryObj.exchangeName, connectedExchangeDataRes.apiKey, connectedExchangeDataRes.secretKey, withdrawHistoryObj.coin, connectedExchangeDataRes.apiMemo,connectedExchangeDataRes.passphrase)
                if (getDetails.length!=0) {
                    var txId =  filter_txIdForWithdraw(withdrawHistoryObj.exchangeName, getDetails, withdrawHistoryObj.withdrawId)
                    if (txId) {
                        await withdrawHistoryUpdate({ _id: withdrawHistoryObj._id }, { amount: txId.amount, transactionFee: txId.transactionFee,withdrawStatus: txId.withdrawStatus})
                    }
                }
            })
            withdawHitstoryCron.start();
        }
    } catch (error) {
        withdawHitstoryCron.start();
        console.log("Error in withdawHitstory cron job catch ==>", error);
    }
})


///////////////////////////
//start-stop cron-job

withdawHitstoryCron.start();
// withdawfee.stop();