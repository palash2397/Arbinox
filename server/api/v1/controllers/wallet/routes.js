import Express from "express";
import controller from "./controller";
import auth from "../../../../helper/auth";
import upload from '../../../../helper/uploadHandler';


export default Express.Router()
    .get('/serverIPAddress', controller.serverIPAddress)
    .delete('/removeCollection', controller.removeCollection)
    .get('/coinImageData', controller.coinImageData)
    // .post('/graphData', controller.graphData)
    // .get('/transactionHistory',controller.transactionHistory)
    .get('/profitPathHistory',controller.profitPathHistory)

    .use(auth.verifyToken)
    .get('/listExchange', controller.listExchange)
    .get('/exchangeCoins', controller.exchangeCoins)
    .post('/connectExchange', controller.connectExchange)
    .get('/connectedExchangeList', controller.connectedExchangeList)
    .delete('/removeConnectedExchange', controller.removeConnectedExchange)
    .post('/exchangeBalance', controller.exchangeBalance)
    .post('/coinBuySell', controller.coinBuySell)
    .post('/orderDetails', controller.orderDetails)
    .post('/asks_bids_prices', controller.asks_bids_prices)
    .get('/mexcPairList', controller.mexcPairList)
    .post('/generateAddress', controller.generateAddress)
    .get('/getWithdrawAddress', controller.getWithdrawAddress)
    .post('/withdraw', controller.withdraw)
    .post('/withdrawDetails', controller.withdrawDetails)
    .get('/withdrawDepositeHistory', controller.withdrawDepositeHistory)
    .get('/transationHistory', controller.transationHistory)

    .post('/deposit', controller.deposit)
    .post('/withdrawDetails', controller.withdrawDetails)
    .get('/Dashboard', controller.Dashboard)
    .get('/statistic', controller.statistic)
    .get('/DashboardRecentData', controller.DashboardRecentData)
    .post('/exchangeBalanceParticularUser', controller.exchangeBalanceParticularUser)
    .get('/shortTimeProfit', controller.shortTimeProfit)
    .get('/cryptoAssetprofit', controller.cryptoAssetprofit)
    .get('/profitStats', controller.profitStats)
    .get('/pairList', controller.pairList)
    .get('/connectedExchangePreviousList', controller.connectedExchangePreviousList)


