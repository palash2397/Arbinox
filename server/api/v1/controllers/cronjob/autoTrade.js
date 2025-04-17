import userModel from '../../../../models/user';
import autoTradeModel from '../../../../models/autoTrade';
import connectedExchangeModel from '../../../../models/connectedExchange';
import profitPathModel from '../../../../models/getPathModel';
import exchangeModel from '../../../../models/exchange';
import arbitrage from "../../../../enums/arbitrage";
import triangularModel from '../../../../models/triangular';
import arbitragefunction from '../../../../helper/arbitrage';
import directModel from "../../../../models/directarbitrage";
import intraModel from '../../../../models/intraarbitrage';
import loopModel from '../../../../models/interLoopArbitrage';
import intraSingleExchange from '../../../../models/intraArbitrageSingleExchange'
import { is_key_buy, is_key_sell } from '../../../../helper/direct_arbitrage_key';
import { getAccount } from '../../../../helper/getAccount';
import { orderkeyA, orderkeyB, orderkeyC } from '../../../../helper/interloop_arbitrage_key';
import { notificationServices } from '../../services/notification';
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
let CronJob = require('cron').CronJob;
import config from "config";
import arbitrageType from '../../../../enums/arbitrageType';
import { triangularProfitPaths } from '../../../../helper/triangularProfitPaths'
import { singleExchangeTwoPairProfitPath } from '../../../../helper/singleExchangeTwoPairprofitPath'
import userType from '../../../../enums/userType';
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory"
const { buySubsciptionPlanData } = buySubsciptionPlanHistoryServices
import commonFunction from '../../../../helper/util';

let minutes = 30
let triangularTime = Date.now() + minutes * 60 * 1000
let directTime = Date.now() + minutes * 60 * 1000
let intraTime = Date.now() + minutes * 60 * 1000

let tradeTriangularPath = new CronJob(config.get('cronTime.autoTrades'), async function () {
    try {
        let data;
        let exchangeWithlowBalance = [];
        let exchangeWithSetBalance = [];
        let balance = [];
        let users = await userModel.find({ 'autoTrade.triangular': true, 'autoTradePlaceCount.triangular': 0, status: "ACTIVE" });
        if (users.length != 0) {
            tradeTriangularPath.stop();
            for (let user of users) {
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    let isTrue = false
                    if (!checkSubscriptionPlan) {
                        isTrue = true
                    }
                    if (checkSubscriptionPlan) {
                        if (!(checkSubscriptionPlan.arbitrageName).includes(arbitrage.TriangularArbitrage)) {
                            isTrue = true
                        }
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.triangular': false, 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                        tradeTriangularPath.start()
                        break;
                    }
                }
                let [autoTradeDetails, connectedExchangeDetails] = await Promise.all([autoTradeModel.findOne({ userId: user._id, arbitrageName: 'TRIANGULAR' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                if (user.connectedExchange.length != 0) {
                    for (let connectedData of connectedExchangeDetails) {
                        if (autoTradeDetails['exchangeUID'].includes(connectedData['uid'])) {
                            let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                            let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                            let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
                            if (usdtBalance.length != 0) {
                                if (usdtBalance[0]['total'] >= autoTradeDetails.capital) {
                                    exchangeWithSetBalance.push(connectedData['uid']);
                                }
                                else {
                                    balance.push('$' + usdtBalance[0]['total']);
                                    exchangeWithlowBalance.push(connectedData['uid']);
                                }
                            } else {
                                exchangeWithlowBalance.push(connectedData['uid']);
                            }
                            if (exchangeWithlowBalance.length == autoTradeDetails['exchangeUID'].length) {
                                // console.log('Low Balance ==>', usdtBalance[0]['total'], 'Capital ==>', autoTradeDetails.capital)
                                let lowBalanceObj = {
                                    userId: user._id,
                                    title: `Low Balance Alert on ${exchangeName} for Triangular`,
                                    body: `Action Required: Triangular Arbitrage Disabled Due to Insufficient Capital ($${autoTradeDetails.capital}) on ${exchangeName}`
                                }
                                let notificationDetails = await notificationData(lowBalanceObj);
                                let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.triangular': false, 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                                await commonFunction.sendEmailInsufficientBalance(user)
                                if (notificationDetails) {
                                    lowBalanceObj['isRead'] = false;
                                    let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                                }
                                else {
                                    let notification = await notificationCreate(lowBalanceObj);
                                }
                            } else {
                                if (usdtBalance.length != 0 && exchangeWithSetBalance.length != 0) {
                                    console.log('Sufficient Balance ==>', usdtBalance[0]['total'], 'Capital ==>', autoTradeDetails.capital, "exchangeName", exchangeName)
                                    let query = {
                                        arbitrageName: arbitrage.TriangularArbitrage,
                                        exchange: exchangeName,
                                        start: 'USDT'
                                    }
                                    let profitPatheDetails = await profitPathModel.find(query);
                                    let totalProfitPaths = [];
                                    for (let exchangePaths of profitPatheDetails) {
                                        if (exchangePaths.path.length != 0) {
                                            let allProfitPath = await triangularProfitPaths(exchangePaths.exchange, '', '', '', '', '3', Number(autoTradeDetails.capital))
                                            for (let pathObj of allProfitPath) {
                                                pathObj['exchangeName'] = exchangePaths.exchange;
                                                pathObj.capital = autoTradeDetails.capital;
                                                pathObj.userId = user._id;
                                                pathObj.arbitrageType = arbitrageType.AUTO;
                                                pathObj.connectedExchangeId = connectedData._id
                                                delete Object.assign(pathObj, { ['strategy']: pathObj['coins'] })['coins'];
                                                delete Object.assign(pathObj, { ['expectedProfit']: pathObj['profit'] })['profit'];
                                                if (pathObj.start == 'USDT' || pathObj.start == 'USD') {
                                                    totalProfitPaths.push(pathObj);
                                                }
                                            }
                                        }
                                    }
                                    if (!totalProfitPaths || totalProfitPaths.length == 0) {
                                        console.log('Profit paths not found.')
                                    } else {
                                        totalProfitPaths = totalProfitPaths.filter(o => o.expectedProfit > autoTradeDetails.minThreshold)
                                        if (totalProfitPaths.length != 0) {
                                            totalProfitPaths.sort((a, b) => (a.expectedProfit > b.expectedProfit) ? -1 : ((b.expectedProfit > a.expectedProfit) ? 1 : 0));
                                            // let finalTotalProfit = []
                                            // for (let a = 0; a < totalProfitPaths.length; a++) {
                                            //     if ((autoTradeDetails.fromCoin).includes(totalProfitPaths[a].pair)) {
                                            //         finalTotalProfit.push(totalProfitPaths[a])
                                            //     }
                                            // }
                                            if (totalProfitPaths != 0) {
                                                let highestProfitPath = totalProfitPaths[0];
                                                highestProfitPath.strategy = highestProfitPath['strategy'].map(function (el) {
                                                    var o = Object.assign({}, el);
                                                    o.isActive = false;
                                                    o.isTrade = false;
                                                    o.orderId = '';
                                                    o.status = '';
                                                    o.coinName = Object.keys(el)[0];
                                                    o.action = Object.values(el)[0];
                                                    return o;
                                                });
                                                console.log('65 ===>', highestProfitPath);
                                                let placeAutoTrade = await triangularModel(highestProfitPath).save();
                                                if (placeAutoTrade) {
                                                    let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTradePlaceCount.triangular': 1 } }, { new: true });
                                                    console.log('55 ==>', placeAutoTrade, updateUser);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    console.log("You have not connected any exchange.");
                }
            }
        }
        tradeTriangularPath.start();
        triangularTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        tradeTriangularPath.start();
        console.log('67 ==>', error)
    }
});

let tradeDirectPath = new CronJob(config.get('cronTime.autoTrades'), async function () {
    try {
        let data;
        let exchangeWithlowBalance = [];
        let exchangeWithSetBalance = [];
        let balance = [];
        let users = await userModel.find({ 'autoTrade.direct': true, 'autoTradePlaceCount.direct': 0, status: "ACTIVE" });
        if (users.length != 0) {
            tradeDirectPath.stop()
            for (let user of users) {
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    let isTrue = false
                    if (!checkSubscriptionPlan) {
                        isTrue = true
                    }
                    if (checkSubscriptionPlan) {
                        if (!(checkSubscriptionPlan.arbitrageName).includes(arbitrage.DirectArbitrage)) {
                            isTrue = true
                        }
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.direct': false, 'autoTradePlaceCount.direct': 0 } }, { new: true });
                        tradeDirectPath.start()
                        break;
                    }
                }
                let [autoTradeDetails, connectedExchangeDetails] = await Promise.all([autoTradeModel.findOne({ userId: user._id, arbitrageName: 'DIRECT' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                if (user.connectedExchange.length != 0) {
                    for (let connectedData of connectedExchangeDetails) {
                        if (autoTradeDetails['exchange1'].includes(connectedData['uid'])) {
                            let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                            let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                            let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
                            if (usdtBalance.length != 0) {
                                if (usdtBalance[0]['total'] >= autoTradeDetails.capital) {
                                    exchangeWithSetBalance.push(connectedData['uid']);
                                }
                                else {
                                    balance.push('$' + usdtBalance[0]['total']);
                                    exchangeWithlowBalance.push(connectedData['uid']);
                                }
                            } else {
                                exchangeWithlowBalance.push(connectedData['uid']);
                            }
                        }
                    }
                    if (exchangeWithlowBalance.length == autoTradeDetails['exchange1'].length) {
                        console.log('level-1');
                        let lowBalanceObj = {
                            userId: user._id,
                            // title: `Low Balance Alert on ${exchangeWithlowBalance[0]} for Direct Arbitrage`,
                            title: `Low Balance Alert for Direct Arbitrage`,
                            // body: `Action Required: Direct Arbitrage Disabled Due to Insufficient Capital ($${autoTradeDetails.capital}) on ${exchangeWithlowBalance[0]}`
                            body: `Action Required: Direct Arbitrage Disabled Due to Insufficient Capital ($${autoTradeDetails.capital})`
                        }
                        let notificationDetails = await notificationData(lowBalanceObj);
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.direct': false, 'autoTradePlaceCount.direct': 0 } }, { new: true });
                        await commonFunction.sendEmailInsufficientBalance(user)
                        if (notificationDetails) {
                            lowBalanceObj['isRead'] = false;
                            let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                        }
                        else {
                            let notification = await notificationCreate(lowBalanceObj);
                        }
                    }
                    else if (exchangeWithSetBalance != 0 || exchangeWithlowBalance != 0) {
                        if (exchangeWithSetBalance != 0 && autoTradeDetails.exchange2 != 0 && autoTradeDetails.capital) {
                            var pathdata = await profitPathModel.findOne({ arbitrageName: arbitrage.DirectArbitrage })
                            if (pathdata) {
                                let filterProfitData = pathdata.path.filter(p => p.pair == "USDT")
                                data = await arbitragefunction.getExchange(filterProfitData, exchangeWithSetBalance, autoTradeDetails.exchange2);
                                data = await arbitragefunction.getCapitalDirect(data, autoTradeDetails.capital);
                                data.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
                                if (data.length != 0) {
                                    console.log("auto trade =======>>184", data)
                                    // let finalTotalProfit = []
                                    // for (let a = 0; a < data.length; a++) {
                                    //     if ((autoTradeDetails.fromCoin).includes(data[a].base)) {
                                    //         finalTotalProfit.push(data[a])
                                    //     }
                                    // }
                                    // data = []
                                    // data = finalTotalProfit
                                    if (data.length != 0) {
                                        data = data.filter(o => o.profit > autoTradeDetails.minThreshold)
                                        if (data.length != 0) {
                                            var buy_obj = {
                                                exchange: data[0].buy,
                                                action: Object.keys(data[0])[2],
                                                price: data[0].exchange1_price,
                                            }
                                            var sell_obj = {
                                                exchange: data[0].sell,
                                                action: Object.keys(data[0])[7],
                                                price: data[0].exchange2_price,
                                            }
                                            let buykey = await is_key_buy(data[0].buy);
                                            let sellkey = await is_key_sell(data[0].sell);
                                            buy_obj = Object.assign(buy_obj, buykey);
                                            sell_obj = Object.assign(sell_obj, sellkey);
                                            let exchanges1 = (await exchangeModel.findOne({ exchangeName: data[0].buy }))['uid'];
                                            let exchanges2 = (await exchangeModel.findOne({ exchangeName: data[0].sell }))['uid'];
                                            let connected1 = await connectedExchangeModel.findOne({ uid: exchanges1, userId: user._id, status: "ACTIVE" });
                                            let connected2 = await connectedExchangeModel.findOne({ uid: exchanges2, userId: user._id, status: "ACTIVE" });
                                            let strategy = [buy_obj, sell_obj];
                                            if (connected1 && connected2) {
                                                var obj = {
                                                    userId: user._id,
                                                    connectedExchangeId1: connected1._id,
                                                    connectedExchangeId2: connected2._id,
                                                    base: data[0].base,
                                                    pair: data[0].pair,
                                                    strategy: strategy,
                                                    capital: autoTradeDetails.capital,
                                                    arbitrageType: arbitrageType.AUTO
                                                }
                                                var directdata = await directModel(obj).save();
                                                if (directdata) {
                                                    var updatedata = await userModel.findByIdAndUpdate({ _id: user._id }, { 'autoTradePlaceCount.direct': 1 });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // let lowBalanceObj = {
                        //     userId: user._id,
                        //     title: `Low Balance Alert on ${exchangeName} for Direct Arbitrage`,
                        //     body: `Action Required: Direct Arbitrage Disabled Due to Insufficient Capital ($${autoTradeDetails.capital}) on ${exchangeName}`
                        // }
                        // let notificationDetails = await notificationData(lowBalanceObj);
                        // // await commonFunction.sendEmailInsufficientBalance(user)
                        // if (notificationDetails) {
                        //     lowBalanceObj['isRead'] = false;
                        //     let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                        // }
                        // else {
                        //     let notification = await notificationCreate(lowBalanceObj);
                        // }
                    }
                }
                else {
                    console.log("You have not connected any exchange.");
                }
            }
        }
        tradeDirectPath.start()
        directTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        tradeDirectPath.start()
        console.log('225 ==>', error)
    }
});

let tradeIntraSingleExchangePath = new CronJob(config.get('cronTime.autoTrades'), async function () {
    try {
        let users = await userModel.find({ 'autoTrade.intraSingleExchange': true, 'autoTradePlaceCount.intraSingleExchange': 0, status: "ACTIVE" });
        if (users.length != 0) {
            tradeIntraSingleExchangePath.stop();
            for (let user of users) {
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    let isTrue = false
                    if (!checkSubscriptionPlan ) {
                        isTrue = true
                    }
                    if (checkSubscriptionPlan) {
                        if (!(checkSubscriptionPlan.arbitrageName).includes(arbitrage.IntraArbitrageSingleExchange)) {
                            isTrue = true
                        }
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.intraSingleExchange': false, 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                        tradeIntraSingleExchangePath.start()
                        break;
                    }
                }
                let [autoTradeDetails, connectedExchangeDetails] = await Promise.all([autoTradeModel.findOne({ userId: user._id, arbitrageName: 'IntraSingleExchange' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                if (user.connectedExchange.length != 0) {
                    let lowBalancearray = []
                    for (let connectedData of connectedExchangeDetails) {
                        if (autoTradeDetails['exchangeUID'].includes(connectedData['uid'])) {
                            let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                            let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                            let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "BTC" || entry.asset === "ETH"); });
                            if (usdtBalance.length != 0) {
                                let startCurrency = usdtBalance.reduce((acc, item) => {
                                    if (Number(item.total) > Number(autoTradeDetails.capital)) {
                                        acc.push(item.asset);
                                    }
                                    return acc;
                                }, []);
                                if (startCurrency.length != 0) {
                                    let totalProfitPaths = [];
                                    let allProfitPath = await singleExchangeTwoPairProfitPath(exchangeName, '', Number(autoTradeDetails.capital))
                                    for (let pathObj of allProfitPath) {
                                        pathObj['exchangeName'] = exchangeName;
                                        pathObj.capital = pathObj.capital;
                                        pathObj.userId = user._id;
                                        pathObj.arbitrageType = arbitrageType.AUTO;
                                        pathObj.connectedExchangeId = connectedData._id
                                        delete Object.assign(pathObj, { ['strategy']: pathObj['coins'] })['coins'];
                                        delete Object.assign(pathObj, { ['expectedProfit']: pathObj['profit'] })['profit'];
                                        if (startCurrency.includes(pathObj.start)) {
                                            totalProfitPaths.push(pathObj);
                                        }
                                    }
                                    if (!totalProfitPaths || totalProfitPaths.length == 0) {
                                        console.log('Profit paths not found.')
                                    } else {
                                        totalProfitPaths = totalProfitPaths.filter(o => Number(o.expectedProfit) > Number(autoTradeDetails.minThreshold))
                                        if (totalProfitPaths.length != 0) {
                                            totalProfitPaths.sort((a, b) => (a.expectedProfit > b.expectedProfit) ? -1 : ((b.expectedProfit > a.expectedProfit) ? 1 : 0));
                                            // let finalTotalProfit = []
                                            // for (let a = 0; a < totalProfitPaths.length; a++) {
                                            //     if ((autoTradeDetails.fromCoin).includes(totalProfitPaths[a].pair)) {
                                            //         finalTotalProfit.push(totalProfitPaths[a])
                                            //     }
                                            // }
                                            if (totalProfitPaths != 0) {
                                                let highestProfitPath = totalProfitPaths[0];
                                                highestProfitPath.strategy = highestProfitPath['strategy'].map(function (el) {
                                                    var o = Object.assign({}, el);
                                                    o.isActive = false;
                                                    o.isTrade = false;
                                                    o.orderId = '';
                                                    o.status = '';
                                                    o.coinName = Object.keys(el)[0];
                                                    o.action = Object.values(el)[0];
                                                    return o;
                                                });
                                                console.log('65 ===>', highestProfitPath);
                                                let placeAutoTrade = await intraSingleExchange(highestProfitPath).save();
                                                if (placeAutoTrade) {
                                                    let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 1 } }, { new: true });
                                                    console.log('55 ==>', placeAutoTrade, updateUser);
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    lowBalancearray.push(exchangeName)
                                    let totalSum = usdtBalance.reduce((acc, item) => {
                                        return acc + Number(item.total);
                                    }, 0)
                                    let lowBalanceObj = {
                                        userId: user._id,
                                        title: `Low Balance Alert on ${exchangeName} for Intra Arbitrage`,
                                        body: `Action Required: Intra Arbitrage Disabled Due to Insufficient Capital ($${autoTradeDetails.capital}) on ${exchangeName}`
                                    }
                                    let notificationDetails = await notificationData(lowBalanceObj);
                                    if (notificationDetails) {
                                        lowBalanceObj['isRead'] = false;
                                        let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                                    } else {
                                        let notification = await notificationCreate(lowBalanceObj);
                                    }
                                    if (lowBalancearray.length == autoTradeDetails['exchangeUID'].length) {
                                        await commonFunction.sendEmailInsufficientBalance(user)
                                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.intraSingleExchange': false, 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    console.log("You have not connected any exchange.");
                }
            }
        }
        tradeIntraSingleExchangePath.start();
        intraTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        tradeIntraSingleExchangePath.start();
        console.log('67 ==>', error)
    }
});

//////////////////////////////////////
tradeTriangularPath.start();
// tradeTriangularPath.stop();

tradeDirectPath.start();
// tradeDirectPath.stop();

tradeIntraSingleExchangePath.start();
// tradeIntraSingleExchangePath.stop();


let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (triangularTime < Date.now()) {
        tradeTriangularPath.start()
    }
    if (directTime < Date.now()) {
        tradeDirectPath.start()
    }
    if (intraTime < Date.now()) {
        tradeIntraSingleExchangePath.start()
    }

})
allCronRestart.start()

// =====================================use less code =========================================
// let tradeIntraPath = new CronJob(config.get('cronTime.autoTrades'), async function () {
//     try {
//         let data;
//         let exchangeWithlowBalance = [];
//         let exchangeWithSetBalance = [];
//         let balance = [];
//         let users = await userModel.find({ 'autoTrade.intra': true, 'autoTradePlaceCount.intra': 0, userType: "USER", status: "ACTIVE" });
//         if (users.length != 0) {
//             for (let user of users) {
//                 let autoTradeDetails = await autoTradeModel.findOne({ userId: user._id, arbitrageName: 'INTRA' });
//                 var pathdata = await profitPathModel.findOne({ arbitrageName: arbitrage.IntraArbitrage });
//                 let connectedExchangeDetails = await connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" });
//                 if (user.connectedExchange.length != 0) {
//                     for (let connectedData of connectedExchangeDetails) {
//                         if (autoTradeDetails['exchange1'].includes(connectedData['uid'])) {
//                             let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
//                             let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id);
//                             let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
//                             if (usdtBalance[0]['total'] >= autoTradeDetails.capital) {
//                                 exchangeWithSetBalance.push(connectedData['uid']);
//                             }
//                             else {
//                                 balance.push('$' + usdtBalance[0]['total']);
//                                 exchangeWithlowBalance.push(connectedData['uid']);
//                             }
//                         }
//                         console.log("exchangeWithSetBalance=====>255", exchangeWithSetBalance != 0 && exchangeWithlowBalance != 0);
//                         console.log("exchangeWithSetBalance====>256", exchangeWithSetBalance != 0);
//                     }
//                     if (exchangeWithlowBalance.length == autoTradeDetails['exchange1'].length) {
//                         console.log('level-1');
//                         let lowBalanceObj = {
//                             userId: user._id,
//                             title: `Low Balance in ${exchangeWithlowBalance} for Intra arbitrage bot`,
//                             body: `Intra arbitrage bot required capital is $${autoTradeDetails.capital} USDT for trade in ${exchangeWithlowBalance} account but your account have ${balance} USDT only. According to this issue we are going to close intra arbitrage bot so please resolve the issue and reopen the intra arbitrage bot.`
//                         }
//                         let notificationDetails = await notificationData(lowBalanceObj);
//                         let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.Intra': false } }, { new: true });
//                         if (notificationDetails) {
//                             lowBalanceObj['isRead'] = false;
//                             let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
//                         }
//                         else {
//                             let notification = await notificationCreate(lowBalanceObj);
//                         }
//                     }
//                     else if (exchangeWithSetBalance != 0 && exchangeWithlowBalance != 0) {
//                         if (exchangeWithSetBalance != 0 && autoTradeDetails.exchange2 != 0 && autoTradeDetails.capital) {
//                             var pathdata = await profitPathModel.findOne({ arbitrageName: arbitrage.IntraArbitrage })
//                             data = await arbitragefunction.getExchange(pathdata.path, exchangeWithSetBalance, autoTradeDetails.exchange2);
//                             data = await arbitragefunction.getCapitalIntra(data, autoTradeDetails.capital);
//                             data.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
//                             if (data.length != 0) {
//                                 var buy_obj = {
//                                     exchange: data[0].buy,
//                                     action: Object.keys(data[0])[2],
//                                     price: data[0].exchange1_price,
//                                 }
//                                 var sell_obj = {
//                                     exchange: data[0].sell,
//                                     action: Object.keys(data[0])[7],
//                                     price: data[0].exchange2_price,
//                                 }
//                                 let buykey = await is_key_buy(data[0].buy);
//                                 let sellkey = await is_key_sell(data[0].sell);
//                                 buy_obj = Object.assign(buy_obj, buykey);
//                                 sell_obj = Object.assign(sell_obj, sellkey);
//                                 let exchanges1 = (await exchangeModel.findOne({ exchangeName: data[0].buy }))['uid'];
//                                 let exchanges2 = (await exchangeModel.findOne({ exchangeName: data[0].sell }))['uid'];
//                                 let connected1 = await connectedExchangeModel.findOne({ uid: exchanges1, userId: user._id });
//                                 let connected2 = await connectedExchangeModel.findOne({ uid: exchanges2, userId: user._id });
//                                 let strategy = [buy_obj, sell_obj];
//                                 var obj = {
//                                     userId: user._id,
//                                     connectedExchangeId1: connected1._id,
//                                     connectedExchangeId2: connected2._id,
//                                     base: data[0].base,
//                                     pair: data[0].pair,
//                                     strategy: strategy,
//                                     capital: autoTradeDetails.capital
//                                 }
//                                 var intradata = await intraModel(obj).save();
//                                 if (intradata) {
//                                     var updatedata = await userModel.findByIdAndUpdate({ _id: user._id }, { 'autoTradePlaceCount.intra': 1 });
//                                 }
//                             }
//                         }
//                         let lowBalanceObj = {
//                             userId: user._id,
//                             title: `Low Balance in ${exchangeWithlowBalance} for Intra arbitrage bot`,
//                             body: `Intra arbitrage bot required capital is $${autoTradeDetails.capital} USDT for trade in ${exchangeWithlowBalance} account but your account have ${balance} USDT only. `
//                         }
//                         let notificationDetails = await notificationData(lowBalanceObj);
//                         if (notificationDetails) {
//                             lowBalanceObj['isRead'] = false;
//                             let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
//                         }
//                         else {
//                             let notification = await notificationCreate(lowBalanceObj);
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.log('334 ==>', error)
//     }
// });

// let tradeLoopPath = new CronJob(config.get('cronTime.autoTrades'), async function () {
//     try {
//         let data;
//         let exchangeWithlowBalance = [];
//         let exchangeWithSetBalance = [];
//         let balance = [];
//         let users = await userModel.find({ 'autoTrade.loop': true, 'autoTradePlaceCount.loop': 0, userType: "USER", status: "ACTIVE" });
//         if (users.length != 0) {
//             for (let user of users) {
//                 console.count(user)
//                 let autoTradeDetails = await autoTradeModel.findOne({ userId: user._id, arbitrageName: 'LOOP' });
//                 let connectedExchangeDetails = await connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" });
//                 if (user.connectedExchange.length != 0) {
//                     for (let connectedData of connectedExchangeDetails) {
//                         if (autoTradeDetails['exchange1'].includes(connectedData['uid'])) {
//                             let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
//                             let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
//                             let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
//                             if (usdtBalance[0]['free'] >= autoTradeDetails.capital) {
//                                 exchangeWithSetBalance.push(connectedData['uid']);
//                             }
//                             else {
//                                 balance.push('$' + usdtBalance[0]['free']);
//                                 exchangeWithlowBalance.push(connectedData['uid']);
//                             }
//                         }
//                     }
//                     if (exchangeWithlowBalance.length == autoTradeDetails['exchange1'].length) {
//                         let lowBalanceObj = {
//                             userId: user._id,
//                             title: `Low Balance in ${exchangeWithlowBalance} for loop arbitrage bot`,
//                             body: `Loop arbitrage bot required capital is $${autoTradeDetails.capital} USDT for trade in ${exchangeWithlowBalance} account but your account have ${balance} USDT only. According to this issue we are going to close Loop arbitrage bot so please resolve the issue and reopen the loop arbitrage bot.`
//                         }
//                         let notificationDetails = await notificationData(lowBalanceObj);
//                         let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'autoTrade.loop': false } }, { new: true });
//                         if (notificationDetails) {
//                             lowBalanceObj['isRead'] = false;
//                             let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
//                         }
//                         else {
//                             let notification = await notificationCreate(lowBalanceObj);
//                         }
//                     }
//                     else if (exchangeWithSetBalance != 0 && exchangeWithlowBalance != 0) {
//                         if (exchangeWithSetBalance != 0 && autoTradeDetails.exchange2 != 0 && autoTradeDetails.exchange2 != 0 && autoTradeDetails.capital) {
//                             var pathdata = await profitPathModel.findOne({ arbitrageName: arbitrage.LoopArbitrage });
//                             data = await arbitragefunction.getExchangeLoop(pathdata.path, exchangeWithSetBalance, autoTradeDetails.exchange2, autoTradeDetails.exchange3);
//                             data = await arbitragefunction.getCapitalInterLoop(data, autoTradeDetails.capital)
//                             data.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
//                             if (data.length != 0) {
//                                 var check0, check1, check2;
//                                 check0 = await orderkeyA(data[0].order0.exchange);
//                                 check1 = await orderkeyB(data[0].order1.exchange);
//                                 check2 = await orderkeyC(data[0].order2.exchange);
//                                 var order0 = {
//                                     action: data[0].order0.side,
//                                     symbol: data[0].order0.coin,
//                                     exchange: data[0].order0.exchange,
//                                     price: data[0].order0.price,
//                                     withdrawCoin: data[0].withdraw0.coin,
//                                     withrawFrom: data[0].withdraw0.from,
//                                     withrawTo: data[0].withdraw0.to,
//                                 }
//                                 var order1 = {
//                                     action: data[0].order1.side,
//                                     symbol: data[0].order1.coin,
//                                     exchange: data[0].order1.exchange,
//                                     price: data[0].order1.price,
//                                     withdrawCoin: data[0].withdraw1.coin,
//                                     withrawFrom: data[0].withdraw1.from,
//                                     withrawTo: data[0].withdraw1.to,
//                                 }
//                                 var order2 = {
//                                     action: data[0].order2.side,
//                                     symbol: data[0].order2.coin,
//                                     exchange: data[0].order2.exchange,
//                                     price: data[0].order2.price,
//                                 }
//                                 order0 = Object.assign(order0, check0);
//                                 order1 = Object.assign(order1, check1);
//                                 order2 = Object.assign(order2, check2);
//                                 var strategy = [order0, order1, order2];
//                                 let exchanges1 = (await exchangeModel.findOne({ exchangeName: data[0].order0.exchange }))['uid'];
//                                 let exchanges2 = (await exchangeModel.findOne({ exchangeName: data[0].order1.exchange }))['uid'];
//                                 let exchanges3 = (await exchangeModel.findOne({ exchangeName: data[0].order2.exchange }))['uid'];
//                                 let connected1 = await connectedExchangeModel.findOne({ uid: exchanges1, userId: user._id });
//                                 let connected2 = await connectedExchangeModel.findOne({ uid: exchanges2, userId: user._id });
//                                 let connected3 = await connectedExchangeModel.findOne({ uid: exchanges3, userId: user._id });
//                                 var obj = {
//                                     userId: user._id,
//                                     connectedExchangeId1: connected1._id,
//                                     connectedExchangeId2: connected2._id,
//                                     connectedExchangeId3: connected3._id,
//                                     strategy: strategy,
//                                     capital: autoTradeDetails.capital
//                                 }
//                                 var updatedata = await userModel.findByIdAndUpdate({ _id: user._id }, { 'autoTradePlaceCount.loop': 1 }, { new: true });
//                                 if (updatedata) {
//                                     var loopdata = await loopModel(obj).save();
//                                 }
//                             }
//                             let lowBalanceObj = {
//                                 userId: user._id,
//                                 title: `Low Balance in ${exchangeWithlowBalance} for Loop arbitrage bot`,
//                                 body: `Loop arbitrage bot required capital is $${autoTradeDetails.capital} USDT for trade in ${exchangeWithlowBalance} account but your account have ${balance} USDT only. `
//                             }
//                             let notificationDetails = await notificationData(lowBalanceObj);
//                             if (notificationDetails) {
//                                 lowBalanceObj['isRead'] = false;
//                                 let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
//                             }
//                             else {
//                                 let notification = await notificationCreate(lowBalanceObj);
//                             }
//                         }
//                     }
//                 }
//                 else {
//                     console.log("You have not connected any exchange.");
//                 }
//             }
//         }
//     } catch (error) {
//         console.log('17 ==>', error)
//     }
// });


// tradeIntraPath.start();
// tradeIntraPath.stop();

// tradeLoopPath.start();
// tradeLoopPath.stop();