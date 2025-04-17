import { CronJob } from 'cron';
import connectedExchangeModel from '../../../../models/connectedExchange';
import exchangeModel from '../../../../models/exchange';
import userModel from '../../../../models/user';
import { buy, sell, cancelOrder } from '../../../../helper/buySell';
import { triangularOrderDetails } from '../../../../helper/triangularOrderDetails';
import { filter_orderId } from '../../../../helper/filter_orderId';
import { filter_triangularOrderDetails } from '../../../../helper/filter_triangularOrderDetails';
import orderModel from '../../../../models/orderModel';
import intraArbitrageSingleExchangeModel from '../../../../models/intraArbitrageSingleExchange'
import config from "config";
// import logger from "../../../../helper/logger";
import status from "../../../../enums/status";
const { convert_profit } = require('../../../../helper/convert_profit');
import { intraAbitrageSingleExchangeServices } from "../../services/intraArbitrageSingleExchange"
const { intraArbitrageSingleExchangeCreate, intraArbitrageSingleExchangeData, intraArbitrageSingleExchangeAllList, intraArbitrageSingleExchangeUpdate } = intraAbitrageSingleExchangeServices
import { intraExchangeSingleRebalancing } from '../cronjob/rebalancingTrade'
import { rebalancingTradeServices } from '../../services/rebalancingTrade'
const { rebalancingTradeData } = rebalancingTradeServices
import arbitrageType from '../../../../enums/arbitrageType';
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory"
const { lastedBuyPlan } = buySubsciptionPlanHistoryServices
import arbitrage from "../../../../enums/arbitrage";
import commonFunction from '../../../../helper/util';
///////////////////////////////////////////////////////////////////////////////////////////////////
let minutes = 30
let intraManualTime = Date.now() + minutes * 60 * 1000
let intraAutoTime = Date.now() + minutes * 60 * 1000
let intraSniperTime = Date.now() + minutes * 60 * 1000
let intraAllTime = Date.now() + minutes * 60 * 1000


let executeIntraSingleExchangeArbitrageForLimit = new CronJob(config.get('cronTime.intraSingleExchangeArbitrage'), async () => {
    try {
        executeIntraSingleExchangeArbitrageForLimit.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.MANUAL, isFirstStrategy: true }
        let intraSingleExhangeArbitrageList = await intraArbitrageSingleExchangeAllList(query);
        let count = 0;
        let obj
        console.log("Total intraSingleExhangeArbitrageList ==>manual", intraSingleExhangeArbitrageList.length)
        // intraSingleExhangeArbitrageList.map(async (obj) => {
        // if (intraSingleExhangeArbitrageList.length == 0) {
        //     executeIntraSingleExchangeArbitrageForLimit.start()
        // } else {
        //     executeIntraSingleExchangeArbitrageForLimit.stop();
        // }
        for (let a = 0; a < intraSingleExhangeArbitrageList.length; a++) {
            obj = intraSingleExhangeArbitrageList[a];
            // let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE });
            let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId });
            let exchange = obj.exchangeName;
            let tickers = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tickers'];
            let tradeFee = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tradeFee'];
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status CANCELLED ==>>61 ', arbitrageStatusUpdate, updateUser);
                        }
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capitalInUSDT)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED, isConvertUSDT: true }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status Completed ==>>69 ', arbitrageStatusUpdate, updateUser);
                            await commonFunction.sendEmailCloseTrade(updateUser.email,"User", "Intra Arbitrage", symbol, obj.capital, profit)
                        }
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>72")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>78", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('83 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('92 ==============================>>> If ', i, token[0] != 'USDT');

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('104 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    console.log('112 =========================>>>>>>>107', actionValue)
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                // console.log('Buy orderPlaced 128 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('144 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }

                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT

                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    console.log('160 =========================>>>>>>>155', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                // console.log('167 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>173", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('180==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                                                for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                                    if (k == i) {
                                                        intraSingleExchangeData.strategy[k].isActive = true;
                                                        intraSingleExchangeData.strategy[k].orderId = orderPlaced.orderId;
                                                    }
                                                    newPathArray.push(intraSingleExchangeData.strategy[k])
                                                }
                                                let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('204 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    console.log('Arbitrage blocked ==>211', arbitrageStatusUpdate)
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`218 Intra ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('219 Intra Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if(tickers[symbol]){
                                symbol=tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>222', filteredOrderData)
                            let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                        if (k == i) {
                                            intraSingleExchangeData.strategy[k].isActive = false;
                                            intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                            intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(intraSingleExchangeData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                            if (k == i) {
                                                intraSingleExchangeData.strategy[k].isActive = true;
                                                intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                                intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(intraSingleExchangeData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('253 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
                                        // console.log('265 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('273 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (intraSingleExhangeArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === intraSingleExhangeArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([intraArbitrageSingleExchangeAllList(query), rebalancingTradeData({ arbitrageName: "IntraSingleExchange" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeIntraSingleExchangeArbitrageForLimit.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            //   let ids = checkRebalancingTrade.map((item) => item.userId);
                            await intraExchangeSingleRebalancing(arbitrageType.MANUAL)
                        }
                    }

                }
                // executeIntraSingleExchangeArbitrageForLimit.start();
            }
        }
        executeIntraSingleExchangeArbitrageForLimit.start();
        intraManualTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeIntraSingleExchangeArbitrageForLimit.start();
        // logger.error(error)
        console.log('IntraArbitrageSingleExchange catch ===>>305', error.message)
    }
});

let executeAutoIntraSingleExchangeArbitrageForLimit = new CronJob(config.get('cronTime.intraSingleExchangeArbitrage'), async () => {
    try {
        executeAutoIntraSingleExchangeArbitrageForLimit.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.AUTO, isFirstStrategy: true }
        let intraSingleExhangeArbitrageList = await intraArbitrageSingleExchangeAllList(query);
        let count = 0;
        let obj
        console.log("Total intraSingleExhangeArbitrageList ==>auto", intraSingleExhangeArbitrageList.length)
        // intraSingleExhangeArbitrageList.map(async (obj) => {
        // if (intraSingleExhangeArbitrageList.length == 0) {
        //     executeAutoIntraSingleExchangeArbitrageForLimit.start()
        // } else {
        //     executeAutoIntraSingleExchangeArbitrageForLimit.stop();
        // }
        for (let a = 0; a < intraSingleExhangeArbitrageList.length; a++) {
            obj = intraSingleExhangeArbitrageList[a];
            // let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE });
            let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId });
            let exchange = obj.exchangeName;
            let tickers = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tickers'];
            let tradeFee = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tradeFee'];
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status CANCELLED ==>>348 ', arbitrageStatusUpdate, updateUser);
                        }
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capitalInUSDT)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED, isConvertUSDT: true }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status Completed ==>>356 ', arbitrageStatusUpdate, updateUser);
                            await commonFunction.sendEmailCloseTrade(updateUser.email,"User", "Intra Arbitrage", symbol, obj.capital, profit)
                        }
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>359")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>365", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('370 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('379 ==============================>>> If ', i, token[0] != 'USDT');

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('391 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    console.log('399=========================>>>>>>>107', actionValue)
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                // console.log('415 Buy orderPlaced 86 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('431 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }

                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT

                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    console.log('447 =========================>>>>>>>155', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                // console.log('454 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>460", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('467==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                                                for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                                    if (k == i) {
                                                        intraSingleExchangeData.strategy[k].isActive = true;
                                                        intraSingleExchangeData.strategy[k].orderId = orderPlaced.orderId;
                                                    }
                                                    newPathArray.push(intraSingleExchangeData.strategy[k])
                                                }
                                                let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('491 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>498', arbitrageStatusUpdate)
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`505 Intra ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('506 Intra Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if(tickers[symbol]){
                                symbol=tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>509', filteredOrderData)
                            let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                        if (k == i) {
                                            intraSingleExchangeData.strategy[k].isActive = false;
                                            intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                            intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(intraSingleExchangeData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                            if (k == i) {
                                                intraSingleExchangeData.strategy[k].isActive = true;
                                                intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                                intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(intraSingleExchangeData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('540 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
                                        // console.log('552 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('560 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (intraSingleExhangeArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === intraSingleExhangeArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([intraArbitrageSingleExchangeAllList(query), rebalancingTradeData({ arbitrageName: "IntraSingleExchange" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeAutoIntraSingleExchangeArbitrageForLimit.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            //   let ids = checkRebalancingTrade.map((item) => item.userId);
                            await intraExchangeSingleRebalancing(arbitrageType.AUTO)
                        }
                    }

                }
                // executeAutoIntraSingleExchangeArbitrageForLimit.start();
            }
        }
        executeAutoIntraSingleExchangeArbitrageForLimit.start();
        intraAutoTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeAutoIntraSingleExchangeArbitrageForLimit.start();
        // logger.error(error)
        console.log('IntraArbitrageSingleExchange catch ===>>592', error.message)
    }
});

let executeSniperIntraSingleExchangeArbitrageForLimit = new CronJob(config.get('cronTime.intraSingleExchangeArbitrage'), async () => {
    try {
        executeSniperIntraSingleExchangeArbitrageForLimit.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", arbitrageType: arbitrageType.SNIPER, isFirstStrategy: true }
        let intraSingleExhangeArbitrageList = await intraArbitrageSingleExchangeAllList(query);
        let count = 0;
        let obj
        console.log("Total intraSingleExhangeArbitrageList ==>sniper", intraSingleExhangeArbitrageList.length)
        // intraSingleExhangeArbitrageList.map(async (obj) => {
        // if (intraSingleExhangeArbitrageList.length == 0) {
        //     executeSniperIntraSingleExchangeArbitrageForLimit.start()
        // } else {
        //     executeSniperIntraSingleExchangeArbitrageForLimit.stop();
        // }
        for (let a = 0; a < intraSingleExhangeArbitrageList.length; a++) {
            obj = intraSingleExhangeArbitrageList[a];
            // let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE });
            let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId });
            let exchange = obj.exchangeName;
            let tickers = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tickers'];
            let tradeFee = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tradeFee'];
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status CANCELLED ==>>635 ', arbitrageStatusUpdate, updateUser);
                        }
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capitalInUSDT)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED, isConvertUSDT: true }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status Completed ==>>643 ', arbitrageStatusUpdate, updateUser);
                            await commonFunction.sendEmailCloseTrade(updateUser.email,"User", "Intra Arbitrage", symbol, obj.capital, profit)
                        }
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>646")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>652", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('657 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('666 ==============================>>> If ', i, token[0] != 'USDT');

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('678 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    console.log('686 =========================>>>>>>>107', actionValue)
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                // console.log('Buy orderPlaced 702 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('718 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }

                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT

                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    console.log('734 =========================>>>>>>>155', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                // console.log('741 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>747", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('754 ==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                                                for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                                    if (k == i) {
                                                        intraSingleExchangeData.strategy[k].isActive = true;
                                                        intraSingleExchangeData.strategy[k].orderId = orderPlaced.orderId;
                                                    }
                                                    newPathArray.push(intraSingleExchangeData.strategy[k])
                                                }
                                                let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('778 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>785 ', arbitrageStatusUpdate)
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`792 Intra ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('793 Intra Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if(tickers[symbol]){
                                symbol=tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>796 ', filteredOrderData)
                            let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                        if (k == i) {
                                            intraSingleExchangeData.strategy[k].isActive = false;
                                            intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                            intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(intraSingleExchangeData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                            if (k == i) {
                                                intraSingleExchangeData.strategy[k].isActive = true;
                                                intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                                intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(intraSingleExchangeData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('827 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
                                        // console.log('839 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('847 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (intraSingleExhangeArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === intraSingleExhangeArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([intraArbitrageSingleExchangeAllList(query), rebalancingTradeData({ arbitrageName: "IntraSingleExchange" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeSniperIntraSingleExchangeArbitrageForLimit.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            //   let ids = checkRebalancingTrade.map((item) => item.userId);
                            await intraExchangeSingleRebalancing(arbitrageType.SNIPER)
                        }
                    }

                }
                // executeSniperIntraSingleExchangeArbitrageForLimit.start();
            }
        }
        executeSniperIntraSingleExchangeArbitrageForLimit.start();
        intraSniperTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeSniperIntraSingleExchangeArbitrageForLimit.start();
        // logger.error(error)
        console.log('IntraArbitrageSingleExchange catch ===>>879', error.message)
    }
});

let executeAllIntraSingleExchangeArbitrageForLimit = new CronJob(config.get('cronTime.intraSingleExchangeArbitrage'), async () => {
    try {
        executeAllIntraSingleExchangeArbitrageForLimit.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: false }
        let intraSingleExhangeArbitrageList = await intraArbitrageSingleExchangeAllList(query);
        let count = 0;
        let obj
        console.log("Total intraSingleExhangeArbitrageList ==>All", intraSingleExhangeArbitrageList.length)
        // intraSingleExhangeArbitrageList.map(async (obj) => {
        // if (intraSingleExhangeArbitrageList.length == 0) {
        //     executeAllIntraSingleExchangeArbitrageForLimit.start()
        // } else {
        //     executeAllIntraSingleExchangeArbitrageForLimit.stop();
        // }
        for (let a = 0; a < intraSingleExhangeArbitrageList.length; a++) {
            obj = intraSingleExhangeArbitrageList[a];
            // let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE });
            let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId });
            let exchange = obj.exchangeName;
            let tickers = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tickers'];
            let tradeFee = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tradeFee'];
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status CANCELLED ==>>922 ', arbitrageStatusUpdate, updateUser);
                        }
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capitalInUSDT)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED, isConvertUSDT: true }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Intra Arbitrage Single Exchange Status Completed ==>>930 ', arbitrageStatusUpdate, updateUser);
                            await commonFunction.sendEmailCloseTrade(updateUser.email,"User", "Intra Arbitrage", symbol, obj.capital, profit)
                        }
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>933")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>939", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('944 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('953 ==============================>>> If ', i, token[0] != 'USDT');

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('965 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    console.log('973 =========================>>>>>>>107', actionValue)
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }

                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                // console.log('Buy orderPlaced 989 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('1005 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            actionValue = b
                                            break;
                                        }
                                    }

                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT

                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        finalPrice = 1 / price;
                                    }
                                    console.log('1021=========================>>>>>>>155', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                }
                                // console.log('1028 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>1034", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('1041==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                                                for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                                    if (k == i) {
                                                        intraSingleExchangeData.strategy[k].isActive = true;
                                                        intraSingleExchangeData.strategy[k].orderId = orderPlaced.orderId;
                                                    }
                                                    newPathArray.push(intraSingleExchangeData.strategy[k])
                                                }
                                                let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now(), isFirstStrategy: true } }, { new: true });
                                                // console.log('1065 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>1072', arbitrageStatusUpdate)
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`1079 Intra ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('1080 Intra Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if(tickers[symbol]){
                                symbol=tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>1083 ', filteredOrderData)
                            let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                        if (k == i) {
                                            intraSingleExchangeData.strategy[k].isActive = false;
                                            intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                            intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(intraSingleExchangeData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
                                            if (k == i) {
                                                intraSingleExchangeData.strategy[k].isActive = true;
                                                intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
                                                intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(intraSingleExchangeData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('1114 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
                                        // console.log('1126 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('1134 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (intraSingleExhangeArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === intraSingleExhangeArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([intraArbitrageSingleExchangeAllList(query), rebalancingTradeData({ arbitrageName: "IntraSingleExchange" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeAllIntraSingleExchangeArbitrageForLimit.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            //   let ids = checkRebalancingTrade.map((item) => item.userId);
                            // await intraExchangeSingleRebalancing()
                        }
                    }

                }
                // executeAllIntraSingleExchangeArbitrageForLimit.start();
            }
        }
        executeAllIntraSingleExchangeArbitrageForLimit.start();
        intraAllTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeAllIntraSingleExchangeArbitrageForLimit.start();
        // logger.error(error)
        console.log('IntraArbitrageSingleExchange catch ===>>1166', error.message)
    }
});
///////////////////////////
//start-stop cron-job

executeIntraSingleExchangeArbitrageForLimit.start()
// executeIntraSingleExchangeArbitrageForLimit.stop()

executeAutoIntraSingleExchangeArbitrageForLimit.start()
// executeAutoIntraSingleExchangeArbitrageForLimit.stop()

executeSniperIntraSingleExchangeArbitrageForLimit.start()
// executeSniperIntraSingleExchangeArbitrageForLimit.stop()

executeAllIntraSingleExchangeArbitrageForLimit.start()
// executeAllIntraSingleExchangeArbitrageForLimit.stop()

let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (intraManualTime < Date.now()) {
        executeIntraSingleExchangeArbitrageForLimit.start()
    }
    if (intraAutoTime < Date.now()) {
        executeAutoIntraSingleExchangeArbitrageForLimit.start()
    }
    if (intraSniperTime < Date.now()) {
        executeSniperIntraSingleExchangeArbitrageForLimit.start()
    }
    if (intraAllTime < Date.now()) {
        executeAllIntraSingleExchangeArbitrageForLimit.start()
    }
})
allCronRestart.start()


// let executeAllIntraSingleExchangeArbitrageForLimit = new CronJob(config.get('cronTime.intraSingleExchangeArbitrage'), async () => {
//     try {
//         executeAllIntraSingleExchangeArbitrageForLimit.stop();
//         let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: false }
//         let intraSingleExhangeArbitrageList = await intraArbitrageSingleExchangeAllList(query);
//         let count = 0;
//         let obj
//         console.log("Total intraSingleExhangeArbitrageList ==>All", intraSingleExhangeArbitrageList.length)
//         // intraSingleExhangeArbitrageList.map(async (obj) => {
//         // if (intraSingleExhangeArbitrageList.length == 0) {
//         //     executeAllIntraSingleExchangeArbitrageForLimit.start()
//         // } else {
//         //     executeAllIntraSingleExchangeArbitrageForLimit.stop();
//         // }
//         for (let a = 0; a < intraSingleExhangeArbitrageList.length; a++) {
//             obj = intraSingleExhangeArbitrageList[a];
//             let connectedExchangeData = await connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE });
//             let exchange = obj.exchangeName;
//             let tickers = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tickers'];
//             let tradeFee = (await exchangeModel.findOne({ exchangeName: exchange }))['_doc']['tradeFee'];
//             let quantity = obj.capital;
//             if (connectedExchangeData) {
//                 let apiKey = connectedExchangeData.apiKey;
//                 let secretKey = connectedExchangeData.secretKey;
//                 let passphrase = connectedExchangeData.passphrase;
//                 let customerId = connectedExchangeData.customerId;
//                 let api_memo = connectedExchangeData.apiMemo;
//                 let placedArbitrageId = obj._id;
//                 let finalPrice
//                 for (let i = 0; i < obj.strategy.length; i++) {
//                     let symbol = Object.keys(obj.strategy[i])[0];
//                     let action = Object.values(obj.strategy[i])[0];
//                     let price = obj.strategy[i].price;
//                     let newPathArray = new Array();
//                     if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
//                         let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
//                         if (arbitrageStatusUpdate) {
//                             let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
//                             console.log('Intra Arbitrage Single Exchange Status CANCELLED ==>> ', arbitrageStatusUpdate, updateUser);
//                         }
//                     } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
//                         let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capitalInUSDT)
//                         // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
//                         let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED, isConvertUSDT: true }, { new: true })
//                         if (arbitrageStatusUpdate) {
//                             let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.intraSingleExchange': 0 } }, { new: true });
//                             console.log('Intra Arbitrage Single Exchange Status Completed ==>> ', arbitrageStatusUpdate, updateUser);
//                         }
//                     } else {
//                         if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
//                             console.log('Do respected act and update isActive status', i, new Date().toLocaleTimeString());
//                             let orderPlaced;
//                             let token;
//                             let current_token;
//                             let amount = obj.amount;
//                             let filledTotal = obj.filledTotal;
//                             token = [tickers[symbol]['base'], tickers[symbol]['quote']];
//                             if (action == 'buy') {
//                                 if (i == 0) {//HAI_ETH
//                                     console.log('==============================>>> If ', i, token[0] != 'USDT');

//                                     if (token[1] == obj.start) { //if not endswith USDT
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         finalPrice = 1 / price;
//                                     }

//                                     quantity = quantity / finalPrice;
//                                     current_token = token[0]
//                                 } else {
//                                     console.log('==============================>>> else ', i);
//                                     if (token[1] == Object.values(obj.strategy[i - 1])[7]) { //if not endswith USDT
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         finalPrice = 1 / price;
//                                     }

//                                     if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                         quantity = amount;
//                                     }
//                                     else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                         quantity = filledTotal;
//                                     }
//                                 }
//                                 orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
//                                 console.log('Buy orderPlaced 86 ==>', orderPlaced)
//                                 if (orderPlaced) {
//                                     orderPlaced.side = 'buy'
//                                 }
//                             }
//                             else if (action == 'sell') {
//                                 if (i == 0) {//HAI_ETH
//                                     if (token[0] == obj.start) { //if not endswith USDT
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         finalPrice = 1 / price;
//                                     }
//                                     quantity = quantity;
//                                     current_token = token[0]
//                                 } else {
//                                     console.log('==============================>>> else ', i);
//                                     if (token[0] == Object.values(obj.strategy[i - 1])[7]) { //if not endswith USDT
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         finalPrice = 1 / price;
//                                     }
//                                     if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                         quantity = amount;
//                                     } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                         quantity = filledTotal;
//                                     }
//                                 }
//                                 console.log('98 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
//                                 orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
//                                 if (orderPlaced) {
//                                     orderPlaced.side = 'sell'
//                                 }
//                             }
//                             console.log("order data =====>>>170", orderPlaced)
//                             if (orderPlaced) {
//                                 if (orderPlaced && orderPlaced.isTradable == true) {
//                                     orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
//                                     if (orderPlaced.orderId) {
//                                         let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
//                                         if (order) {
//                                             console.log('152==> Order already placed >>', order)
//                                         } else {
//                                             let objsave = {
//                                                 userId: obj.userId,
//                                                 symbol: symbol,
//                                                 price: price,
//                                                 quantity: quantity,
//                                                 side: orderPlaced.side,
//                                                 type: 'limit',
//                                                 orderStatus: 'open',
//                                                 orderId: orderPlaced.orderId,
//                                                 exchangeName: exchange
//                                             }
//                                             let saveOrderResult = await orderModel(objsave).save();
//                                             if (saveOrderResult) {
//                                                 let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
//                                                 for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
//                                                     if (k == i) {
//                                                         intraSingleExchangeData.strategy[k].isActive = true;
//                                                         intraSingleExchangeData.strategy[k].orderId = orderPlaced.orderId;
//                                                     }
//                                                     newPathArray.push(intraSingleExchangeData.strategy[k])
//                                                 }
//                                                 let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now(), isFirstStrategy: true } }, { new: true });
//                                                 console.log('118 updateStrategy>>>', updateStrategy.exchangeName);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 else if (orderPlaced.isTradable == false) {
//                                     let arbitrageStatusUpdate = await intraArbitrageSingleExchangeUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
//                                     console.log('Arbitrage blocked ==>', arbitrageStatusUpdate)
//                                 }
//                             }

//                             break;
//                         }
//                         else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
//                             console.log(`Intra ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
//                             console.log('Intra Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
//                             let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
//                             let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
//                             console.log('OrderStatus ==>190', filteredOrderData)
//                             let intraSingleExchangeData = await intraArbitrageSingleExchangeData({ _id: placedArbitrageId });
//                             if (filteredOrderData && filteredOrderData.orderStatus) {
//                                 if (filteredOrderData.orderStatus == 'cancelled') {
//                                     for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
//                                         if (k == i) {
//                                             intraSingleExchangeData.strategy[k].isActive = false;
//                                             intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
//                                             intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
//                                         }
//                                         newPathArray.push(intraSingleExchangeData.strategy[k])
//                                     }
//                                 }
//                                 else {
//                                     try {
//                                         for (let k = 0; k < intraSingleExchangeData.strategy.length; k++) {
//                                             if (k == i) {
//                                                 intraSingleExchangeData.strategy[k].isActive = true;
//                                                 intraSingleExchangeData.strategy[k].orderId = obj.strategy[i].orderId;
//                                                 intraSingleExchangeData.strategy[k].status = filteredOrderData.orderStatus;
//                                             }
//                                             newPathArray.push(intraSingleExchangeData.strategy[k])
//                                         }
//                                         if (Array.isArray(orderData) == true) {
//                                             orderData = Object.assign({}, orderData);
//                                         }
//                                         let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
//                                         if (updateOrder) {
//                                             // console.log('167 >>> updateOrder')
//                                         }
//                                     } catch (error) {
//                                         console.log('176 Error: =>', error)
//                                     }
//                                 }
//                             }
//                             if (newPathArray.length != 0) {
//                                 try {
//                                     if (newPathArray[i].status == 'closed') {
//                                         newPathArray[i].isActive = false;
//                                         newPathArray[i].isTrade = true;
//                                         let amount = filteredOrderData.orderAmount;
//                                         let filledTotal = filteredOrderData.orderFilledTotal;
//                                         let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
//                                         console.log('167 >>>', updateStrategy);
//                                     } else {
//                                         let amount = filteredOrderData.orderAmount;
//                                         let filledTotal = filteredOrderData.orderFilledTotal;
//                                         await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
//                                         let updateStrategy = await intraArbitrageSingleExchangeUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
//                                     }
//                                 } catch (error) {
//                                     console.log('188 Error: =>', error)
//                                 }
//                             }
//                             break;
//                         }
//                     }
//                 }
//                 count = count + 1;
//                 if (intraSingleExhangeArbitrageList.length == count) {
//                     // console.log('===================================================')
//                 }
//             }
//             if (a === intraSingleExhangeArbitrageList.length - 1) {
//                 let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([intraArbitrageSingleExchangeAllList(query), rebalancingTradeData({ arbitrageName: "IntraSingleExchange" })])
//                 if (checkRebalancingTrade.length != 0) {
//                     // executeAllIntraSingleExchangeArbitrageForLimit.stop();
//                     if (rebalancingACtiveCheck) {
//                         if (rebalancingACtiveCheck.isRebalancingActive == true) {
//                             //   let ids = checkRebalancingTrade.map((item) => item.userId);
//                             await intraExchangeSingleRebalancing()
//                         }
//                     }

//                 }
//                 // executeAllIntraSingleExchangeArbitrageForLimit.start();
//             }
//         }
//         executeAllIntraSingleExchangeArbitrageForLimit.start();
//         // });
//     } catch (error) {
//         executeAllIntraSingleExchangeArbitrageForLimit.start();
//         logger.error(error)
//         console.log('IntraArbitrageSingleExchange catch ===>>', error.message)
//     }
// });