
import exchangeModel from '../../../../models/exchange';
import triangularModel from '../../../../models/triangular';
import intraSingleExchange from '../../../../models/intraArbitrageSingleExchange'
import { notificationServices } from '../../services/notification';
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
let CronJob = require('cron').CronJob;
import config from "config";
import arbitrageType from '../../../../enums/arbitrageType';
import { triangularProfitPaths } from '../../../../helper/triangularProfitPaths'
import { singleExchangeTwoPairProfitPath } from '../../../../helper/singleExchangeTwoPairprofitPath'
import orderType from '../../../../enums/orderType';
import { rebalancingTradeServices } from '../../services/rebalancingTrade'
const { rebalancingTradeData } = rebalancingTradeServices
import { convert_profit } from '../../../../helper/convert_profit'

module.exports = {
    triangularRebalancing: async (arbitrageType) => {
        try {
            let query = { status: "ACTIVE", arbitrageStatus: "PENDING", orderType: orderType.LIMIT,arbitrageType:arbitrageType }
            let triangularArbitrageList = await triangularModel.find(query);
            let traingularObj
            for (let a = 0; a < triangularArbitrageList.length; a++) {
                traingularObj = triangularArbitrageList[a];
                let checkRebalancingTrade = await rebalancingTradeData({ arbitrageName: "TRIANGULAR", userId: traingularObj.userId, isRebalancingActive: true })
                //    console.log('=========================>>>>>',checkRebalancingTrade)
                if (checkRebalancingTrade) {
                    for (let i = 0; i < traingularObj.strategy.length; i++) {
                        // if (i != 0 && i != traingularObj.strategy.length - 1 && i < traingularObj.strategy.length) {
                        if (i != 0) {
                            let rebalancingNumber = traingularObj.strategy[i] && traingularObj.strategy[i].rebalancingNumber ? Number(traingularObj.strategy[i].rebalancingNumber) : 0
                            if (rebalancingNumber <= Number(checkRebalancingTrade.rebalancingNumber)) {
                                if (traingularObj.strategy[i].status == "open") {
                                    let tradeTime = Number(traingularObj.tradeExecutionTime) + (Number(checkRebalancingTrade.waitingTime) * 1000*60*60)
                                    console.log("======>>>184", new Date().getTime() > tradeTime)
                                    if (new Date().getTime() > tradeTime) {
                                        let index = 0
                                        for (var b = i; b >= 0; b--) {
                                            if (traingularObj.strategy[b].status == 'closed') {
                                                index = b + 1
                                                break;
                                            }
                                        }
                                        if (index == 1) {
                                            let baseCurrency = traingularObj.strategy[0].baseCurrency
                                            let quoteCurrency = traingularObj.strategy[0].quoteCurrency
                                            let allProfitPath = await triangularProfitPaths(traingularObj.exchangeName, '', '', '', '', '3', Number(traingularObj.capitalInUSDT))
                                            // console.log("==================================>>>>", allProfitPath)
                                            var filterObje = allProfitPath.filter(function (el) { return el.start == quoteCurrency && el.pair == baseCurrency });
                                            if (filterObje.length != 0) {
                                                for (let j = 0; j < filterObje.length; j++) {
                                                    console.log('=======================>>>', filterObje[j].coins)
                                                    console.log('index========>>67', index)
                                                    let filterSymbol = Object.keys(filterObje[j].coins[index])[0]
                                                    let filterAction = Object.values(filterObje[j].coins[index])[0]

                                                    let symbol = Object.keys(traingularObj.strategy[i])[0];
                                                    let action = Object.values(traingularObj.strategy[i])[0];

                                                    let actionType, matchSymbole, filterMatchSymbole
                                                    if (Object.values(filterObje[j].coins[index])[0] == 'sell') {
                                                        actionType = 'sellAmount'
                                                        matchSymbole = traingularObj.strategy[i].quoteCurrency
                                                        filterMatchSymbole = filterObje[j].coins[index].quoteCurrency
                                                    } else {
                                                        actionType = 'buyAmount'
                                                        matchSymbole = traingularObj.strategy[i].baseCurrency
                                                        filterMatchSymbole = filterObje[j].coins[index].baseCurrency
                                                    }
                                                    let newPathArray = []
                                                    let oldArray = []
                                                    if (matchSymbole == filterMatchSymbole && action == filterAction) {
                                                        let rebalancing
                                                        if (symbol == filterSymbol && action == filterAction) {
                                                            if (Object.values(filterObje[j].coins[index])[0] == 'sell') {
                                                                if (traingularObj.strategy[i].price < filterObje[j].coins[index].price) {
                                                                    rebalancing = true
                                                                } else {
                                                                    rebalancing = false
                                                                }
                                                            } else {
                                                                if (traingularObj.strategy[i].price > filterObje[j].coins[index].price) {
                                                                    rebalancing = true
                                                                } else {
                                                                    rebalancing = false
                                                                }
                                                            }
                                                        } else {
                                                            // rebalancing = true
                                                        }
                                                        console.log("============================>>>236", rebalancing)
                                                        if (rebalancing == true) {
                                                            for (let k = 0; k < traingularObj.strategy.length; k++) {
                                                                if (i <= k) {
                                                                    if (i == k) {
                                                                        traingularObj.strategy[k].status = 'rebalancing';
                                                                        oldArray = traingularObj.strategy.slice(0, i + 1)
                                                                    }
                                                                    let objkey = Object.keys(filterObje[j].coins[index])[0]
                                                                    let obj = {
                                                                        [objkey]: Object.values(filterObje[j].coins[index])[0],
                                                                        price: filterObje[j].coins[index].price,
                                                                        finalPrice: filterObje[j].coins[index].finalPrice,
                                                                        fees: filterObje[j].coins[index].fees,
                                                                        volume: filterObje[j].coins[index].volume,
                                                                        [actionType]: filterObje[j].coins[index].sellAmount,
                                                                        receiveAmount: filterObje[j].coins[index].receiveAmount,
                                                                        baseCurrency: filterObje[j].coins[index].baseCurrency,
                                                                        quoteCurrency: filterObje[j].coins[index].quoteCurrency,
                                                                        isActive: false,
                                                                        isTrade: false,
                                                                        orderId: '',
                                                                        status: '',
                                                                        coinName: Object.keys(filterObje[j].coins[index])[0],
                                                                        action: Object.values(filterObje[j].coins[index])[0],
                                                                    }
                                                                    newPathArray.push(obj)
                                                                    index++
                                                                }
                                                            }
                                                            let finalArray = oldArray.concat(newPathArray)
                                                            let timeNumber = 0
                                                            if (!traingularObj.rebalancingNumber) {
                                                                timeNumber += 1
                                                            } else {
                                                                timeNumber = Number(traingularObj.rebalancingNumber) + 1
                                                            }
                                                            let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: traingularObj._id }, { $set: { strategy: finalArray, rebalancingNumber: timeNumber, tradeExecutionTime: Date.now() } }, { new: true });
                                                            console.log("======================>>>45", updateStrategy)
                                                            break;
                                                        }
                                                        break;
                                                    }

                                                    break;
                                                }
                                            }
                                        } else if (index >= 2) {
                                            let baseCurrency = traingularObj.strategy[i].baseCurrency;
                                            let quoteCurrency = traingularObj.strategy[i].quoteCurrency;
                                            let start = traingularObj.start;
                                            let filterAction = Object.values(traingularObj.strategy[i])[0]
                                            let filterSymbol = Object.keys(traingularObj.strategy[i])[0]
                                            let allProfitPath = await triangularProfitPaths(traingularObj.exchangeName, '', '', '', '', '3', Number(traingularObj.filledTotal))
                                            var filterObjeWithStart = allProfitPath.filter(function (el) { return el.start == start });
                                            if (filterObjeWithStart.length > 0) {
                                                for (let p = 0; p < filterObjeWithStart.length; p++) {
                                                    var filterObje = filterObjeWithStart[p].coins.find(function (el) { return el.baseCurrency == baseCurrency && el.quoteCurrency == quoteCurrency && el[filterSymbol] == filterAction });
                                                    console.log("============================================<<<<<<<<<<<<<<<<<<<160", filterObje)
                                                    if (filterObje) {
                                                        if (Number(filterObje.receiveAmount) >= Number(traingularObj.capital)) {
                                                            traingularObj.strategy[i].status = 'rebalancing';
                                                            let actionType
                                                            if (filterAction == 'sell') {
                                                                actionType = 'sellAmount'
                                                            } else {
                                                                actionType = 'buyAmount'
                                                            }
                                                            let obj = {
                                                                [filterSymbol]: Object.values(traingularObj.strategy[i])[0],
                                                                price: filterObje.price,
                                                                finalPrice: filterObje.finalPrice,
                                                                fees: filterObje.fees,
                                                                volume: filterObje.volume,
                                                                [actionType]: filterObje.sellAmount,
                                                                receiveAmount: filterObje.receiveAmount,
                                                                baseCurrency: filterObje.baseCurrency,
                                                                quoteCurrency: filterObje.quoteCurrency,
                                                                isActive: false,
                                                                isTrade: false,
                                                                orderId: '',
                                                                status: '',
                                                                coinName: Object.keys(traingularObj.strategy[i])[0],
                                                                action: Object.values(traingularObj.strategy[i])[0],
                                                            }
                                                            traingularObj.strategy.push(obj)
                                                            console.log("============================>>>>", traingularObj.strategy)
                                                            let timeNumber = 0
                                                            if (!traingularObj.rebalancingNumber) {
                                                                timeNumber += 1
                                                            } else {
                                                                timeNumber = Number(traingularObj.rebalancingNumber) + 1
                                                            }
                                                            let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: traingularObj._id }, { $set: { strategy: traingularObj.strategy, rebalancingNumber: timeNumber, tradeExecutionTime: Date.now() } }, { new: true });
                                                            console.log("======================>>>196", updateStrategy)
                                                        }
                                                        break;
                                                    }
                                                }
                                            }

                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                if (a === triangularArbitrageList.length - 1) {
                }
            }
            return { status: true }
        } catch (error) {
            console.log("rebalancing error====>>>>", error)
        }
    },
    intraExchangeSingleRebalancing: async (arbitrageType) => {
        try {
            let query = { status: "ACTIVE", arbitrageStatus: "PENDING", orderType: orderType.LIMIT,arbitrageType:arbitrageType }
            let intraSingleExchangeArbitrageList = await intraSingleExchange.find(query);
            // console.log("=hfdsfhsdhfshfjsdhfjdshfjdshf",intraSingleExchangeArbitrageList)
            // return
            let intraSingleExchangeObj
            for (let a = 0; a < intraSingleExchangeArbitrageList.length; a++) {
                intraSingleExchangeObj = intraSingleExchangeArbitrageList[a];
                let checkRebalancingTrade = await rebalancingTradeData({ arbitrageName: "IntraSingleExchange", userId: intraSingleExchangeObj.userId, isRebalancingActive: true })
                //    console.log('=========================>>>>>',checkRebalancingTrade)
                if (checkRebalancingTrade) {
                    for (let i = 0; i < intraSingleExchangeObj.strategy.length; i++) {
                        if (i != 0) {
                            let rebalancingNumber = intraSingleExchangeObj.strategy[i] && intraSingleExchangeObj.strategy[i].rebalancingNumber ? Number(intraSingleExchangeObj.strategy[i].rebalancingNumber) : 0
                            if (rebalancingNumber <= Number(checkRebalancingTrade.rebalancingNumber)) {
                                if (intraSingleExchangeObj.strategy[i].status == "open") {
                                    let tradeTime = Number(intraSingleExchangeObj.tradeExecutionTime) + (Number(checkRebalancingTrade.waitingTime) * 1000*60*60)
                                    console.log("======>>>320", new Date().getTime() > tradeTime)
                                    if (new Date().getTime() > tradeTime) {
                                        let index = 0
                                        for (var b = i; b >= 0; b--) {
                                            if (intraSingleExchangeObj.strategy[b].status == 'closed') {
                                                index = b + 1
                                                break;
                                            }
                                        }
                                        if (index == 1) {
                                            let baseCurrency = intraSingleExchangeObj.strategy[i].baseCurrency;
                                            let quoteCurrency = intraSingleExchangeObj.strategy[i].quoteCurrency;
                                            let start = intraSingleExchangeObj.start;
                                            let filterAction = Object.values(intraSingleExchangeObj.strategy[i])[0]
                                            let filterSymbol = Object.keys(intraSingleExchangeObj.strategy[i])[0]
                                            let actionValue, quantity
                                            for (var b = i - 1; b >= 0; b--) {
                                                if (intraSingleExchangeObj.strategy[b].status == 'closed') {
                                                    actionValue = b
                                                    break;
                                                }
                                            }
                                            if (Object.values(intraSingleExchangeObj.strategy[actionValue])[0] == 'buy') {
                                                quantity = intraSingleExchangeObj.amount;
                                            }
                                            else if (Object.values(intraSingleExchangeObj.strategy[actionValue])[0] == 'sell') {
                                                quantity = intraSingleExchangeObj.filledTotal;
                                            }
                                            let tickers = (await exchangeModel.findOne({ exchangeName: intraSingleExchangeObj.exchangeName, status: "ACTIVE" }).select(['tickers'])).tickers;
                                            let capitalAmount = await convert_profit(intraSingleExchangeObj.exchangeName, tickers, [quoteCurrency], quantity)
                                            let allProfitPath = await singleExchangeTwoPairProfitPath(intraSingleExchangeObj.exchangeName, '', Number(capitalAmount))
                                            if (allProfitPath.length > 0) {
                                                for (let p = 0; p < allProfitPath.length; p++) {
                                                    var filterObje = allProfitPath[p].coins.find(function (el) { return el.baseCurrency == baseCurrency && el.quoteCurrency == quoteCurrency && el[filterSymbol] == filterAction });
                                                    console.log('==========>>>>>>>>>>>>>>>>>>269', filterObje)
                                                    if (filterObje) {
                                                        if (Number(filterObje.receiveAmount) >= Number(intraSingleExchangeObj.capitalInUSDT)) {
                                                            intraSingleExchangeObj.strategy[i].status = 'rebalancing';
                                                            let actionType
                                                            if (filterAction == 'sell') {
                                                                actionType = 'sellAmount'
                                                            } else {
                                                                actionType = 'buyAmount'
                                                            }
                                                            let obj = {
                                                                [filterSymbol]: Object.values(intraSingleExchangeObj.strategy[i])[0],
                                                                price: filterObje.price,
                                                                finalPrice: filterObje.finalPrice,
                                                                fees: filterObje.fees,
                                                                volume: filterObje.volume,
                                                                [actionType]: filterObje.sellAmount,
                                                                receiveAmount: filterObje.receiveAmount,
                                                                baseCurrency: filterObje.baseCurrency,
                                                                quoteCurrency: filterObje.quoteCurrency,
                                                                isActive: false,
                                                                isTrade: false,
                                                                orderId: '',
                                                                status: '',
                                                                coinName: Object.keys(intraSingleExchangeObj.strategy[i])[0],
                                                                action: Object.values(intraSingleExchangeObj.strategy[i])[0],
                                                            }
                                                            intraSingleExchangeObj.strategy.push(obj)
                                                            console.log("============================>>>>", intraSingleExchangeObj.strategy)
                                                            let timeNumber = 0
                                                            if (!intraSingleExchangeObj.rebalancingNumber) {
                                                                timeNumber += 1
                                                            } else {
                                                                timeNumber = Number(intraSingleExchangeObj.rebalancingNumber) + 1
                                                            }
                                                            let updateStrategy = await intraSingleExchange.findByIdAndUpdate({ _id: intraSingleExchangeObj._id }, { $set: { strategy: intraSingleExchangeObj.strategy, rebalancingNumber: timeNumber, tradeExecutionTime: Date.now() } }, { new: true });
                                                            console.log("======================>>>304", updateStrategy)
                                                        }
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                if (a === intraSingleExchangeArbitrageList.length - 1) {
                    // rebalancingCron.start();
                }
            }
            return { status: true }
        } catch (error) {
            // rebalancingCron.start()
            console.log("rebalancing error====>>>>", error)
        }
    }
}