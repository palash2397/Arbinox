const CronJob = require('cron').CronJob;
const IntraModel = require('../../../../models/intraarbitrage');
const connectedExchangeModel = require('../../../../models/connectedExchange');
const exchangeTokenModel = require('../../../../models/exchange');
const { buy, sell, address, withdraw, transfer, get_tx_id, check_deposit } = require('../../../../helper/buySell');
const { get_token } = require('../../../../helper/tokenpair');
const { filter_orderId } = require('../../../../helper/filter_orderId');
const { order_details } = require('../../../../helper/direct_orderDetails');
const { convert_profit } = require('../../../../helper/convert_profit');
const userModel = require('../../../../models/user');
import config from "config";


var intraArbitrage = new CronJob(config.get('cronTime.intraArbitrage'), async function () {
    try {
        let query = { $and: [{ arbitrageStatus: "PENDING" }, { status: "ACTIVE" }] }
        let IntraarbitrageList = await IntraModel.find(query);
        let count = 0;
        IntraarbitrageList.map(async (obj) => {
            let exchange;
            let apiKey;
            let secretKey;
            let passPhrase;
            let CustomerId;
            let quantity;
            let price;
            let symbol;
            let placeddirecteId = obj._id;
            let userId = obj.userId
            let amount;
            let add;
            let withdo;
            var connected1 = obj.connectedExchangeId1.toString();
            var connected2 = obj.connectedExchangeId2.toString();
            for (let i = 0; i < obj.strategy.length; i++) {
                if (obj.strategy[i].action == 'buy') {
                    let tickers = (await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange }))['_doc']['tickers'];
                    let connectedData = await connectedExchangeModel.findOne({ _id: connected1 })
                    let newPathArray = new Array();
                    exchange = obj.strategy[i].exchange;
                    apiKey = connectedData.apiKey;
                    secretKey = connectedData.secretKey;
                    passPhrase = connectedData.passphrase;
                    CustomerId = connectedData.customerId;
                    quantity = obj.capital;
                    price = obj.strategy[i].price;
                    symbol = await get_token(exchange, obj.base, obj.pair);
                    let placeddirecteId = obj._id;
                    var intraData = await IntraModel.findOne({ _id: placeddirecteId });
                    if (obj.strategy[i].isTrade == false) {
                        if (obj.strategy[i].isTradeActive == true) {
                            console.log('Check buy Action', new Date().toLocaleTimeString(), i)
                            var orderDetail = await order_details(exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol);
                            console.log("order_details=====>",orderDetail);
                            if (orderDetail.status == true) {
                                for (let k = 0; k < intraData.strategy.length; k++) {
                                    if (k == i) {
                                        intraData.strategy[k].isTradeActive = false;
                                        intraData.strategy[k].isTrade = true;
                                        intraData.strategy[k].buyStatus = 'closed';
                                        intraData.strategy[k].capitalBuy = orderDetail.totalAmount;
                                    }
                                    newPathArray.push(intraData.strategy[k]);
                                }
                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                            else if (orderDetail.status == false) {
                                for (let k = 0; k < intraData.strategy.length; k++) {
                                    if (k == i) {
                                        intraData.strategy[k].isTradeActive = false;
                                        intraData.strategy[k].isTrade = false;
                                        intraData.strategy[k].buyStatus = 'cancelled';
                                    }
                                    newPathArray.push(intraData.strategy[k]);
                                }
                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'CANCELLED' } }, { new: true });
                                if (updateStrategy) {
                                    var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.intra': 0 } });
                                }
                            }
                        } else {
                            console.log('Do buy Action', new Date().toLocaleTimeString(), i)
                            var orderPlace = await buy(exchange, symbol, price, quantity, apiKey, secretKey, passPhrase, CustomerId);
                            if (orderPlace && orderPlace.isTradable == true) {
                                var filterOrder = await filter_orderId(exchange, orderPlace);
                                if (filterOrder) {
                                    for (let k = 0; k < intraData.strategy.length; k++) {
                                        if (k == i) {
                                            intraData.strategy[k].isTradeActive = true;
                                            intraData.strategy[k].orderId = filterOrder;
                                            intraData.strategy[k].buyStatus = 'open';
                                        }
                                        newPathArray.push(intraData.strategy[k]);
                                    }
                                    let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                }
                            }
                            else if (orderPlace.isTradable == false) {
                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK" } }, { new: true });
                            }
                        }
                    }
                } else if (obj.strategy[i].action == 'sell') {
                    let tickers = (await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange }))['_doc']['tickers'];
                    let connectedData = await connectedExchangeModel.findOne({ _id: connected2 })
                    exchange = obj.strategy[i].exchange;
                    let newPathArray = new Array();
                    apiKey = connectedData.apiKey;
                    secretKey = connectedData.secretKey;
                    CustomerId = connectedData.customerId;
                    passPhrase = connectedData.passphrase;
                    quantity = obj.capital;
                    price = obj.strategy[i].price;
                    symbol = await get_token(exchange, obj.base, obj.pair);
                    let placeddirecteId = obj._id;
                    var intraData = await IntraModel.findOne({ _id: placeddirecteId });
                    if (obj.strategy[i].isTrade == false) {
                        if (obj.strategy[i].isTradeActive == true) {
                            console.log('Check Sell Action', new Date().toLocaleTimeString(), i);
                            var orderDetail = await order_details(exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol);
                            if (orderDetail.status == true) {
                                for (let k = 0; k < intraData.strategy.length; k++) {
                                    if (k == i) {
                                        intraData.strategy[k].isTradeActive = false;
                                        intraData.strategy[k].isTrade = true;
                                        intraData.strategy[k].sellStatus = 'closed';
                                        intraData.strategy[k].capitalSell = orderDetail.totalAmount;
                                    }
                                    newPathArray.push(intraData.strategy[k]);
                                }

                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                            else if (orderDetail.status == false) {
                                for (let k = 0; k < intraData.strategy.length; k++) {
                                    if (k == i) {
                                        intraData.strategy[k].isTradeActive = false;
                                        intraData.strategy[k].isTrade = false;
                                        intraData.strategy[k].sellStatus = 'cancelled';
                                    }
                                    newPathArray.push(intraData.strategy[k]);
                                }
                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'CANCELLED' } }, { new: true });
                                if (updateStrategy) {
                                    var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.intra': 0 } });
                                }
                            }
                        } else {
                            console.log("Do sell Action", new Date().toLocaleTimeString(), i);
                            var orderPlace = await sell(exchange, symbol, price, quantity, apiKey, secretKey, passPhrase, CustomerId);
                            if (orderPlace && orderPlace.isTradable != false) {
                                var filterOrder = await filter_orderId(exchange, orderPlace);
                                console.log("filter_orderId=====>153",filterOrder);
                                if (filterOrder) {
                                    for (let k = 0; k < intraData.strategy.length; k++) {
                                        if (k == i) {
                                            intraData.strategy[k].isTradeActive = true;
                                            intraData.strategy[k].orderId = filterOrder;
                                            intraData.strategy[k].sellStatus = 'open';
                                        }
                                        newPathArray.push(intraData.strategy[k]);
                                    }
                                    let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                }
                            }
                            else if (orderPlace.isTradable == false) {
                                let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK" } }, { new: true });
                            }
                        }
                    }
                    else if (obj.strategy[0].buyStatus == 'closed' && obj.strategy[1].sellStatus == 'closed') {
                        var profit = parseFloat(obj.strategy[1].capitalSell - obj.strategy[0].capitalBuy);
                        if (intraData.pair != 'USDT') {
                            var convertProfit = await convert_profit(exchange, tickers, [intraData.pair], profit);
                            profit = convertProfit;
                        }
                        let updateStrategy = await IntraModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { arbitrageStatus: 'COMPLETED', profit: profit } }, { new: true });
                        if (updateStrategy) {
                            var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.intra': 0 } });
                        }
                    }
                }
            }
            console.log('---------------------------------------------------', new Date().toLocaleTimeString())
        });
    } catch (error) {
        console.log('190 Some went wrong >>', error.message);
    }
});
// start-stop cron-job

intraArbitrage.start();
// intraArbitrage.stop();