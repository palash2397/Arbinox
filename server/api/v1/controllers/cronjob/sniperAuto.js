import userModel from '../../../../models/user';
import sniperBotModel from '../../../../models/sniperBot'
import connectedExchangeModel from '../../../../models/connectedExchange';
import profitPathModel from '../../../../models/getPathModel';
import exchangeModel from '../../../../models/exchange';
import arbitrage from "../../../../enums/arbitrage";
import triangularModel from '../../../../models/triangular';
import arbitragefunction from '../../../../helper/arbitrage';
import directModel from "../../../../models/directarbitrage";
import { is_key_buy, is_key_sell } from '../../../../helper/direct_arbitrage_key';
import { getAccount } from '../../../../helper/getAccount';
import { notificationServices } from '../../services/notification';
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
let CronJob = require('cron').CronJob;
import config from "config";
import arbitrageType from '../../../../enums/arbitrageType';
import { triangularProfitPaths } from '../../../../helper/triangularProfitPaths'
import intraSingleExchange from '../../../../models/intraArbitrageSingleExchange'
import { singleExchangeTwoPairProfitPath } from '../../../../helper/singleExchangeTwoPairprofitPath'
import userType from '../../../../enums/userType';
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory"
const { buySubsciptionPlanData } = buySubsciptionPlanHistoryServices
import commonFunction from '../../../../helper/util';
const currencyPairs = require('../../../../helper/currencyPairs');

let minutes = 30
let triangularTime = Date.now() + minutes * 60 * 1000
let triangularTime1 = Date.now() + minutes * 60 * 1000
let directTime = Date.now() + minutes * 60 * 1000
let intraTime = Date.now() + minutes * 60 * 1000
let intraTime1 = Date.now() + minutes * 60 * 1000

let tradeTriangularPath = new CronJob(config.get('cronTime.sniperBot'), async function () {
    try {
        tradeTriangularPath.stop();
        let sniperAuto = await triangularSniperFunction("USER0")
        triangularTime = Date.now() + minutes * 60 * 1000
        tradeTriangularPath.start();
    } catch (error) {
        tradeTriangularPath.start();
        console.log("tradeTriangularPath", error)
    }
});
let tradeTriangularPath1 = new CronJob(config.get('cronTime.sniperBot'), async function () {
    try {
        tradeTriangularPath1.stop();
        let sniperAuto = await triangularSniperFunction("USER1")
        triangularTime1 = Date.now() + minutes * 60 * 1000
        tradeTriangularPath1.start();
    } catch (error) {
        tradeTriangularPath1.start();
        console.log("tradeTriangularPath1", error)
    }
});

let tradeDirectPath = new CronJob(config.get('cronTime.sniperBot'), async function () {
    try {
        let data;
        let users = await userModel.find({ 'sniperBot.direct': true, status: "ACTIVE" });
        if (users.length != 0) {
            tradeDirectPath.stop()
            for (let user of users) {
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    let isTrue = false
                    let planExchange = []
                    let coins = []
                    if (!checkSubscriptionPlan) {
                        isTrue = true
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.direct': false } }, { new: true });
                        tradeDirectPath.start()
                        break;
                    }
                    planExchange = checkSubscriptionPlan.exchanges
                    coins = checkSubscriptionPlan.pairs
                } else {
                    planExchange = ['Binance', 'Kraken', 'Mexc', 'Bitmart', 'Coinbase', 'Gateio']
                    coins = currencyPairs.currencyPairs
                }
                let [sniperBotDetails, connectedExchangeDetails] = await Promise.all([sniperBotModel.findOne({ userId: user._id, arbitrageName: 'DIRECT' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                if (user.connectedExchange.length != 0) {
                    let lowBalancearray = []
                    for (let connectedData of connectedExchangeDetails) {
                        if (sniperBotDetails['exchange1'].includes(connectedData['uid'])) {
                            let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                            if ((planExchange).includes(exchangeName)) {
                                let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                                let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "BTC" || entry.asset === "ETH" || entry.asset === "USDC"); });
                                if (usdtBalance.length != 0) {
                                    let startCurrency = usdtBalance.reduce((acc, item) => {
                                        if (item.total > Number(sniperBotDetails.capital)) {
                                            acc.push(item.asset);
                                        }
                                        return acc;
                                    }, []);
                                    if (startCurrency.length != 0) {

                                        var pathdata = await profitPathModel.findOne({ arbitrageName: arbitrage.DirectArbitrage })
                                        if (pathdata) {
                                            let filterProfitData = []
                                            // let filterProfitData = pathdata.path.filter(p => p.pair == "USDT")
                                            for (let pathObj of pathdata.path) {
                                                if (startCurrency.includes(pathObj.pair)) {
                                                    filterProfitData.push(pathObj);
                                                }
                                            }

                                            if (filterProfitData.length != 0) {
                                                let exchangeArray = [connectedData['uid']]
                                                data = await arbitragefunction.getExchange(filterProfitData, exchangeArray, sniperBotDetails.exchange2);
                                                data = await arbitragefunction.getCapitalDirect(data, sniperBotDetails.capital);
                                                data.sort((a, b) => (Number(a.profit) > Number(b.profit)) ? -1 : ((Number(b.profit) > Number(a.profit)) ? 1 : 0));
                                                // data = data.filter((item) => sniperBotDetails.fromCoin.includes(item.base) && sniperBotDetails.toCoin.includes(item.pair))
                                                data = data.filter((item) => coins.includes(item.base) || coins.includes((item.base).toLowerCase()))
                                                if (data.length != 0) {
                                                    console.log("sniper trade =======>>184", data)
                                                    if (data.length != 0) {
                                                        data = data.filter(o => o.profit > sniperBotDetails.minThreshold)
                                                        if (data.length != 0) {

                                                            for (let b = 0; b < startCurrency.length; b++) {
                                                                var allBalance = usdtBalance.filter(function (el) {
                                                                    return el.asset == startCurrency[b]
                                                                });
                                                                var filterProfitPath = data.filter(function (el) {
                                                                    return el.pair == allBalance[0]['asset']
                                                                });
                                                                if (filterProfitPath.length != 0) {
                                                                    let finalLoopNumber = 0
                                                                    let totalIteration = await sniperBotModel.findOne({ _id: sniperBotDetails._id })
                                                                    let balanceLength = Number(allBalance[0]['total']) / Number(sniperBotDetails.capital)
                                                                    let profitLength = filterProfitPath.length
                                                                    if (parseInt(balanceLength) < parseInt(profitLength)) {
                                                                        finalLoopNumber = parseInt(balanceLength)
                                                                    } else {
                                                                        finalLoopNumber = parseInt(profitLength)
                                                                    }
                                                                    if (totalIteration.isNumberOfTradeActive == true) {
                                                                        if (Number(finalLoopNumber) <= Number(totalIteration.numberOfTrade)) {
                                                                            finalLoopNumber = finalLoopNumber
                                                                        } else {
                                                                            finalLoopNumber = totalIteration.numberOfTrade
                                                                        }
                                                                    }
                                                                    for (let z = 0; z < finalLoopNumber; z++) {
                                                                        var buy_obj = {
                                                                            exchange: filterProfitPath[z].buy,
                                                                            action: Object.keys(filterProfitPath[z])[2],
                                                                            price: filterProfitPath[z].exchange1_price,
                                                                        }
                                                                        var sell_obj = {
                                                                            exchange: filterProfitPath[z].sell,
                                                                            action: Object.keys(filterProfitPath[z])[7],
                                                                            price: filterProfitPath[z].exchange2_price,
                                                                        }
                                                                        let buykey = await is_key_buy(filterProfitPath[z].buy);
                                                                        let sellkey = await is_key_sell(filterProfitPath[z].sell);
                                                                        buy_obj = Object.assign(buy_obj, buykey);
                                                                        sell_obj = Object.assign(sell_obj, sellkey);
                                                                        let exchanges1 = (await exchangeModel.findOne({ exchangeName: filterProfitPath[z].buy }))['uid'];
                                                                        let exchanges2 = (await exchangeModel.findOne({ exchangeName: filterProfitPath[z].sell }))['uid'];
                                                                        let connected1 = await connectedExchangeModel.findOne({ uid: exchanges1, userId: user._id, status: "ACTIVE" });
                                                                        let connected2 = await connectedExchangeModel.findOne({ uid: exchanges2, userId: user._id, status: "ACTIVE" });
                                                                        let strategy = [buy_obj, sell_obj];
                                                                        if (connected1 && connected2) {
                                                                            var obj = {
                                                                                userId: user._id,
                                                                                connectedExchangeId1: connected1._id,
                                                                                connectedExchangeId2: connected2._id,
                                                                                base: filterProfitPath[z].base,
                                                                                pair: filterProfitPath[z].pair,
                                                                                strategy: strategy,
                                                                                capital: sniperBotDetails.capital,
                                                                                arbitrageType: arbitrageType.SNIPER
                                                                            }
                                                                            let query = { userId: user._id, base: filterProfitPath[z].base, pair: filterProfitPath[z].pair, status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.SNIPER }
                                                                            let checkPendingRes = await directModel.findOne(query)
                                                                            if (!checkPendingRes) {
                                                                                var directdata = await directModel(obj).save();
                                                                                console.log("========================>>>>>", directdata)
                                                                                if (directdata) {
                                                                                    let updateRes = await sniperBotModel.findByIdAndUpdate({ _id: sniperBotDetails._id }, { $inc: { numberOfTrade: -1 } }, { new: true })
                                                                                    if (updateRes) {
                                                                                        if (totalIteration.isNumberOfTradeActive == true) {
                                                                                            if (0 >= Number(updateRes.numberOfTrade)) {
                                                                                                let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.direct': false } }, { new: true });
                                                                                                break;
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }

                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        lowBalancearray.push(exchangeName)
                                        let totalSum = usdtBalance.reduce((acc, item) => {
                                            return acc + Number(item.total);
                                        }, 0)
                                        console.log('level-1');
                                        let lowBalanceObj = {
                                            userId: user._id,
                                            title: `Low Balance Alert on ${exchangeName} for Direct Arbitrage`,
                                            body: `Action Required: Direct Arbitrage Disabled Due to Insufficient Capital ($${sniperBotDetails.capital}) on ${exchangeName}`
                                        }
                                        let notificationDetails = await notificationData(lowBalanceObj);
                                        if (notificationDetails) {
                                            lowBalanceObj['isRead'] = false;
                                            let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                                        }
                                        else {
                                            let notification = await notificationCreate(lowBalanceObj);
                                        }
                                        if (lowBalancearray.length == sniperBotDetails['exchange1'].length) {
                                            await commonFunction.sendEmailInsufficientBalance(user)
                                            let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.direct': false } }, { new: true })
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
        tradeDirectPath.start()
        directTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        tradeDirectPath.start()
        console.log('225 ==>', error)
    }
});

let tradeIntraSingleExchangePath = new CronJob(config.get('cronTime.sniperBot'), async function () {
    try {
        tradeIntraSingleExchangePath.stop()
        let sniperIntra = await intraSingleExachangeSniperFunction("USER0")
        intraTime = Date.now() + minutes * 60 * 1000
        tradeIntraSingleExchangePath.start()
    } catch (error) {
        tradeIntraSingleExchangePath.start()
        console.log("tradeIntraSingleExchangePath", error)
    }
});

let tradeIntraSingleExchangePath1 = new CronJob(config.get('cronTime.sniperBot'), async function () {
    try {
        tradeIntraSingleExchangePath1.stop()
        let sniperIntra = await intraSingleExachangeSniperFunction("USER1")
        intraTime1 = Date.now() + minutes * 60 * 1000
        tradeIntraSingleExchangePath1.start()
    } catch (error) {
        tradeIntraSingleExchangePath1.start()
        console.log("tradeIntraSingleExchangePath1", error)
    }
});


tradeTriangularPath.start();
// tradeTriangularPath.stop();

tradeTriangularPath1.start();
// tradeTriangularPath1.stop();

// tradeDirectPath.start();
// tradeDirectPath.stop();

tradeIntraSingleExchangePath.start();
// tradeIntraSingleExchangePath.stop();

tradeIntraSingleExchangePath1.start();
// tradeIntraSingleExchangePath1.stop();

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
    if (triangularTime1 < Date.now()) {
        tradeTriangularPath1.start()
    }
    if (intraTime1 < Date.now()) {
        tradeIntraSingleExchangePath1.start()
    }

})
allCronRestart.start()


async function triangularSniperFunction(userGroup) {
    try {
        let users = await userModel.find({ userGroup: userGroup, 'sniperBot.triangular': true, status: "ACTIVE" }).sort({ 'sniperBotPlaceTime.triangular': 1 });
        console.log("================>>>>>>>>>>>>>>>>>", users.length, userGroup)
        if (users.length != 0) {
            for (let user of users) {
                let planExchange = []
                let coins = []
                let isTrue = false
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    if (!checkSubscriptionPlan) {
                        isTrue = true
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.triangular': false } }, { new: true });
                        break;
                    }
                    planExchange = checkSubscriptionPlan.exchanges
                    coins = checkSubscriptionPlan.pairs
                } else {
                    planExchange = ['Binance', 'Kraken', 'Mexc', 'Bitmart', 'Coinbase', 'Gateio']
                    coins = currencyPairs.currencyPairs
                }
                if (isTrue == false) {
                    let [sniperBotDetails, connectedExchangeDetails] = await Promise.all([sniperBotModel.findOne({ userId: user._id, arbitrageName: 'TRIANGULAR' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                    if (user.connectedExchange.length != 0) {
                        let lowBalancearray = []
                        for (let connectedData of connectedExchangeDetails) {
                            if (sniperBotDetails['exchangeUID'].includes(connectedData['uid'])) {
                                let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                                if ((planExchange).includes(exchangeName)) {
                                    let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                                    // let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "BTC" || entry.asset === "ETH"); });
                                    let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT"); });
                                    if (usdtBalance.length != 0) {
                                        let startCurrency = usdtBalance.reduce((acc, item) => {
                                            if (item.total > Number(sniperBotDetails.capital)) {
                                                acc.push(item.asset);
                                            }
                                            return acc;
                                        }, []);
                                        if (startCurrency.length != 0) {
                                            // let query = {
                                            //     arbitrageName: arbitrage.TriangularArbitrage,
                                            //     exchange: exchangeName,
                                            //     start: 'USDT'
                                            // }
                                            // let profitPatheDetails = await profitPathModel.find(query);
                                            let totalProfitPaths = [];
                                            // for (let exchangePaths of profitPatheDetails) {
                                            // if (exchangePaths.path.length != 0) {
                                            let allProfitPath = await triangularProfitPaths(exchangeName, '', '', '', '', '3', Number(sniperBotDetails.capital))
                                            for (let pathObj of allProfitPath) {
                                                pathObj['exchangeName'] = exchangeName;
                                                pathObj.capital = pathObj.capital;
                                                pathObj.userId = user._id;
                                                pathObj.arbitrageType = arbitrageType.SNIPER;
                                                pathObj.connectedExchangeId = connectedData._id
                                                delete Object.assign(pathObj, { ['strategy']: pathObj['coins'] })['coins'];
                                                delete Object.assign(pathObj, { ['expectedProfit']: pathObj['profit'] })['profit'];
                                                if (startCurrency.includes(pathObj.start)) {
                                                    totalProfitPaths.push(pathObj);
                                                }
                                            }
                                            // }
                                            // }
                                            if (!totalProfitPaths || totalProfitPaths.length == 0) {
                                                console.log('Profit paths not found.')
                                            } else {
                                                totalProfitPaths = totalProfitPaths.filter(o => o.expectedProfit > sniperBotDetails.minThreshold)
                                                if (totalProfitPaths.length != 0) {
                                                    totalProfitPaths.sort((a, b) => (a.expectedProfit > b.expectedProfit) ? -1 : ((b.expectedProfit > a.expectedProfit) ? 1 : 0));
                                                    // totalProfitPaths = totalProfitPaths.filter(o => o.pair != 'VET')
                                                    // totalProfitPaths = totalProfitPaths.filter((item) => sniperBotDetails.fromCoin.includes(item.pair) && sniperBotDetails.toCoin.includes(item.start))
                                                    totalProfitPaths = totalProfitPaths.filter((item) => coins.includes(item.pair) || coins.includes((item.pair).toLowerCase()))
                                                    if (totalProfitPaths != 0) {
                                                        let finalLoopNumber = 0
                                                        for (let b = 0; b < usdtBalance.length; b++) {
                                                            let totalObj = []
                                                            let balanceLength = Number(usdtBalance[b]['total']) / Number(sniperBotDetails.capital)
                                                            var filterProfitPath = totalProfitPaths.filter(function (el) {
                                                                return el.start == usdtBalance[b]['asset']
                                                            });
                                                            if (filterProfitPath.length != 0) {
                                                                let currentDay = new Date()
                                                                var toDate = new Date(new Date().getTime() - (72 * 60 * 60 * 1000));
                                                                let query = { $and: [{ createdAt: { $gte: new Date(toDate) } }, { createdAt: { $lte: new Date(currentDay) } }], userId: user._id, status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.SNIPER }
                                                                // let triangularPendingTrade = await triangularModel.find(query)
                                                                // let totalIteration = await sniperBotModel.find({ _id: sniperBotDetails._id })
                                                                let [triangularPendingTrade, totalIteration] = await Promise.all([
                                                                    triangularModel.find(query),
                                                                    sniperBotModel.findOne({ _id: sniperBotDetails._id })
                                                                ])
                                                                let finalTrade = []
                                                                for (let c = 0; c < filterProfitPath.length; c++) {
                                                                    let pairs = filterProfitPath[c].pair
                                                                    let startingPair = filterProfitPath[c].start
                                                                    var notExist = triangularPendingTrade.filter(function (el) {
                                                                        return el.strategy.some(function (item) {
                                                                            return item.baseCurrency === pairs && item.quoteCurrency === startingPair;
                                                                        });
                                                                    });
                                                                    if (notExist.length == 0) {
                                                                        finalTrade.push(filterProfitPath[c])
                                                                    }
                                                                }
                                                                if (finalTrade.length != 0) {
                                                                    let profitLength = finalTrade.length
                                                                    if (parseInt(balanceLength) < parseInt(profitLength)) {
                                                                        finalLoopNumber = parseInt(balanceLength)
                                                                    } else {
                                                                        finalLoopNumber = parseInt(profitLength)
                                                                    }
                                                                    if (totalIteration.isNumberOfTradeActive == true) {
                                                                        if (Number(finalLoopNumber) <= Number(totalIteration.numberOfTrade)) {
                                                                            finalLoopNumber = finalLoopNumber
                                                                        } else {
                                                                            finalLoopNumber = totalIteration.numberOfTrade
                                                                        }
                                                                    }
                                                                    for (let z = 0; z < finalLoopNumber; z++) {
                                                                        let highestProfitPath = finalTrade[z];
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
                                                                        totalObj.push(highestProfitPath)
                                                                    }
                                                                    if (totalObj.length != 0) {
                                                                        let placeSniperBotTrade = await triangularModel.insertMany(totalObj)
                                                                        console.log('65 ===>', placeSniperBotTrade);
                                                                        if (placeSniperBotTrade) {
                                                                            // let updateRes = await sniperBotModel.findByIdAndUpdate({ _id: sniperBotDetails._id }, { $inc: { numberOfTrade: -Number(totalObj.length) } }, { new: true })
                                                                            let [updateRes, updateSniperPlaceTime] = await Promise.all([
                                                                                sniperBotModel.findByIdAndUpdate({ _id: sniperBotDetails._id }, { $inc: { numberOfTrade: -Number(totalObj.length) } }, { new: true }),
                                                                                userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBotPlaceTime.triangular': Date.now() } }, { new: true })
                                                                            ])
                                                                            if (updateRes) {
                                                                                if (totalIteration.isNumberOfTradeActive == true) {
                                                                                    if (0 >= Number(updateRes.numberOfTrade)) {
                                                                                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.triangular': false } }, { new: true });
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
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
                                                title: `Low Balance Alert on ${exchangeName} for Triangular Arbitrage`,
                                                body: `Action Required: Triangular Arbitrage Disabled Due to Insufficient Capital ($${sniperBotDetails.capital}) on ${exchangeName}`
                                            }
                                            let notificationDetails = await notificationData(lowBalanceObj);
                                            if (notificationDetails) {
                                                lowBalanceObj['isRead'] = false;
                                                let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                                            } else {
                                                let notification = await notificationCreate(lowBalanceObj);
                                            }
                                            if (lowBalancearray.length == sniperBotDetails['exchangeUID'].length) {
                                                await commonFunction.sendEmailInsufficientBalance(user)
                                                let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.triangular': false } }, { new: true });
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
        }
    } catch (error) {
        console.log('67 ==>', error)
    }
}

async function intraSingleExachangeSniperFunction(userGroup) {
    try {
        let users = await userModel.find({ userGroup: userGroup, 'sniperBot.intraSingleExchange': true, status: "ACTIVE" }).sort({ 'sniperBotPlaceTime.intraSingleExchange': 1 });
        console.log("=intraSingleExachangeSniperFunction", users.length, userGroup)
        if (users.length != 0) {
            for (let user of users) {
                let planExchange = []
                let coins = []
                let isTrue = false
                if (user.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: user._id, planStatus: "ACTIVE" })
                    if (!checkSubscriptionPlan) {
                        isTrue = true
                    }
                    if (isTrue == true) {
                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.intraSingleExchange': false } }, { new: true });
                        break;
                    }
                    planExchange = checkSubscriptionPlan.exchanges
                    coins = checkSubscriptionPlan.pairs
                } else {
                    planExchange = ['Binance', 'Kraken', 'Mexc', 'Bitmart', 'Coinbase', 'Gateio']
                    coins = currencyPairs.currencyPairs
                }
                if (isTrue == false) {
                    let [sniperBotDetails, connectedExchangeDetails] = await Promise.all([sniperBotModel.findOne({ userId: user._id, arbitrageName: 'IntraSingleExchange' }), connectedExchangeModel.find({ userId: user._id, status: "ACTIVE" })])
                    if (user.connectedExchange.length != 0) {
                        let lowBalancearray = []
                        for (let connectedData of connectedExchangeDetails) {
                            if (sniperBotDetails['exchangeUID'].includes(connectedData['uid'])) {
                                let exchangeName = (await exchangeModel.findOne({ uid: connectedData['uid'] }))['exchangeName'];
                                if ((planExchange).includes(exchangeName)) {
                                    let accountBalances = await getAccount(exchangeName, connectedData.apiKey, connectedData.secretKey, connectedData.passphrase, connectedData.customerId, user._id, connectedData.apiMemo);
                                    let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "BTC" || entry.asset === "ETH"); });
                                    if (usdtBalance.length != 0) {
                                        let startCurrency = usdtBalance.reduce((acc, item) => {
                                            if (item.total > Number(sniperBotDetails.capital)) {
                                                acc.push(item.asset);
                                            }
                                            return acc;
                                        }, []);
                                        if (startCurrency.length != 0) {
                                            let totalProfitPaths = [];
                                            let allProfitPath = await singleExchangeTwoPairProfitPath(exchangeName, '', Number(sniperBotDetails.capital))
                                            for (let pathObj of allProfitPath) {
                                                pathObj['exchangeName'] = exchangeName;
                                                pathObj.capital = pathObj.capital;
                                                pathObj.userId = user._id;
                                                pathObj.arbitrageType = arbitrageType.SNIPER;
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
                                                totalProfitPaths = totalProfitPaths.filter(o => Number(o.expectedProfit) > Number(sniperBotDetails.minThreshold))
                                                // totalProfitPaths = totalProfitPaths.filter((item) => sniperBotDetails.fromCoin.includes(item.pairName) && sniperBotDetails.toCoin.includes(item.start))
                                                totalProfitPaths = totalProfitPaths.filter((item) => coins.includes(item.pairName) || coins.includes((item.pairName).toLowerCase()))
                                                if (totalProfitPaths.length != 0) {
                                                    totalProfitPaths.sort((a, b) => (a.expectedProfit > b.expectedProfit) ? -1 : ((b.expectedProfit > a.expectedProfit) ? 1 : 0));
                                                    if (totalProfitPaths != 0) {
                                                        let finalLoopNumber = 0
                                                        for (let b = 0; b < usdtBalance.length; b++) {
                                                            let totalObj = []
                                                            let balanceLength = Number(usdtBalance[b]['total']) / Number(sniperBotDetails.capital)
                                                            var filterProfitPath = totalProfitPaths.filter(function (el) {
                                                                return el.start == usdtBalance[b]['asset']
                                                            });
                                                            if (filterProfitPath.length != 0) {
                                                                let currentDay = new Date()
                                                                var toDate = new Date(new Date().getTime() - (72 * 60 * 60 * 1000));
                                                                let query = { $and: [{ createdAt: { $gte: new Date(toDate) } }, { createdAt: { $lte: new Date(currentDay) } }], userId: user._id, status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.SNIPER }
                                                                // let triangularPendingTrade = await intraSingleExchange.find(query)
                                                                let [triangularPendingTrade, totalIteration] = await Promise.all([
                                                                    intraSingleExchange.find(query),
                                                                    sniperBotModel.findOne({ _id: sniperBotDetails._id })
                                                                ])
                                                                let finalTrade = []
                                                                for (let c = 0; c < filterProfitPath.length; c++) {
                                                                    let pairs = filterProfitPath[c].pairName
                                                                    let startingPair = filterProfitPath[c].start
                                                                    var notExist = triangularPendingTrade.filter(function (el) {
                                                                        return el.strategy.some(function (item) {
                                                                            return item.baseCurrency === pairs && item.quoteCurrency === startingPair;
                                                                        });
                                                                    });
                                                                    if (notExist.length == 0) {
                                                                        finalTrade.push(filterProfitPath[c])
                                                                    }
                                                                }
                                                                if (finalTrade.length != 0) {
                                                                    let profitLength = finalTrade.length
                                                                    if (parseInt(balanceLength) < parseInt(profitLength)) {
                                                                        finalLoopNumber = parseInt(balanceLength)
                                                                    } else {
                                                                        finalLoopNumber = parseInt(profitLength)
                                                                    }
                                                                    if (totalIteration.isNumberOfTradeActive == true) {
                                                                        if (Number(finalLoopNumber) <= Number(totalIteration.numberOfTrade)) {
                                                                            finalLoopNumber = finalLoopNumber
                                                                        } else {
                                                                            finalLoopNumber = totalIteration.numberOfTrade
                                                                        }
                                                                    }
                                                                    for (let z = 0; z < finalLoopNumber; z++) {
                                                                        let highestProfitPath = finalTrade[z];
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
                                                                        totalObj.push(highestProfitPath)
                                                                    }
                                                                    if (totalObj.length != 0) {
                                                                        let placeSniperBotTrade = await intraSingleExchange.insertMany(totalObj)
                                                                        console.log('304 ===>', placeSniperBotTrade);
                                                                        if (placeSniperBotTrade) {
                                                                            // let updateRes = await sniperBotModel.findByIdAndUpdate({ _id: sniperBotDetails._id }, { $inc: { numberOfTrade: -Number(totalObj.length) } }, { new: true })
                                                                            let [updateRes, updateSniperPlaceTime] = await Promise.all([
                                                                                sniperBotModel.findByIdAndUpdate({ _id: sniperBotDetails._id }, { $inc: { numberOfTrade: -Number(totalObj.length) } }, { new: true }),
                                                                                userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBotPlaceTime.intraSingleExchange': Date.now() } }, { new: true })
                                                                            ])
                                                                            if (updateRes) {
                                                                                if (totalIteration.isNumberOfTradeActive == true) {
                                                                                    if (0 >= Number(updateRes.numberOfTrade)) {
                                                                                        let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.intraSingleExchange': false } }, { new: true });
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
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
                                                body: `Action Required: Intra Arbitrage Disabled Due to Insufficient Capital ($${sniperBotDetails.capital}) on ${exchangeName}`
                                            }
                                            let notificationDetails = await notificationData(lowBalanceObj);
                                            if (notificationDetails) {
                                                lowBalanceObj['isRead'] = false;
                                                let notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: lowBalanceObj });
                                            } else {
                                                let notification = await notificationCreate(lowBalanceObj);
                                            }
                                            if (lowBalancearray.length == sniperBotDetails['exchangeUID'].length) {
                                                await commonFunction.sendEmailInsufficientBalance(user)
                                                let updateUser = await userModel.findByIdAndUpdate({ _id: user._id }, { $set: { 'sniperBot.intraSingleExchange': false } }, { new: true });
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
        }
    } catch (error) {
        console.log('67 ==>', error)
    }
}
