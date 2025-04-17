const CronJob = require('cron').CronJob;
const interLoopModel = require('../../../../models/interLoopArbitrage');
const connectedExchangeModel = require('../../../../models/connectedExchange');
const exchangeTokenModel = require('../../../../models/exchange');
const { buy, sell, address, withdraw, transfer, get_tx_id, check_deposit, check_depositHistory } = require('../../../../helper/buySell');
const { get_token, split_token } = require('../../../../helper/tokenpair');
const { filter_orderId } = require('../../../../helper/filter_orderId');
const { order_details } = require('../../../../helper/direct_orderDetails');
const { convert_profit } = require('../../../../helper/convert_profit');
const { filter_withdrowId } = require('../../../..//helper/filter_withdrowId');
const { filter_txId } = require('../../../../helper/filter_trasactionId');
const { filter_txIdForWithdraw } = require('../../../../helper/withdrawHistoryStatusFilter')
import config from "config";
import { walletServices } from '../../services/wallet'
const { createWithdrawHistory, withdrawHistoryFindOneAndUpdate } = walletServices
import transactionType from '../../../../enums/trasection'
import { orderServices } from '../../services/order'
const { updateOrder, createOrder, findOrder } = orderServices
import { withdrawAddressServices } from '../../services/withdrawAddress'
const { findWithdrawAddress } = withdrawAddressServices
import status from "../../../../enums/status";
///////////////////////////////////////////////////////////////////////////////////////////////////
var interLooptarbitrage = new CronJob(config.get('cronTime.loopArbitrage'), async function () {
    try {
        let query = { $and: [{ arbitrageStatus: "PENDING" }, { status: "ACTIVE" }] };
        let loopArbitrageList = await interLoopModel.find(query);
        let count = 0;
        loopArbitrageList.map(async (obj) => {
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
            let api_memo;
            let newPathArray = new Array();
            for (let i = 0; i < obj.strategy.length; i++) {
                let exchangeData = await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange })
                let connectedData = await connectedExchangeModel.findOne({ uid: exchangeData.uid })
                exchange = obj.strategy[i].exchange;
                apiKey = connectedData.apiKey;
                secretKey = connectedData.secretKey;
                api_memo = connectedData.apiMemo;
                passPhrase = connectedData.passphrase;
                CustomerId = connectedData.customerId;
                quantity = obj.capital / obj.strategy[i].price;
                symbol = obj.strategy[i].symbol;
                price = obj.strategy[i].price;
                let placeddirecteId = obj._id;
                let tradingPair = exchangeData.tickers[symbol].symbol
                var interloopData = await interLoopModel.findOne({ _id: placeddirecteId });
                if (obj.strategy[i].isTrade == false && obj.strategy[i].isTradeActive == false && obj.strategy[i].isStatus == true) {
                    console.log('*************************************', i, new Date().toLocaleTimeString());
                    if (obj.strategy[i].action == 'buy') {
                        console.log("do buy action");
                        var orderPlace = await buy(exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, CustomerId, api_memo);
                        console.log("check", orderPlace);
                        if (orderPlace.isTradable == true) {
                            var filterOrder = await filter_orderId(exchange, orderPlace);
                            if (filterOrder) {
                                await updateOrder({ orderId: filterOrder }, { userId: userId, symbol: symbol, price: price, quantity: quantity, side: 'buy', type: 'limit', orderStatus: 'open', exchangeName: exchange })
                                for (let k = 0; k < interloopData.strategy.length; k++) {
                                    if (k == i) {
                                        interloopData.strategy[k].isTradeActive = true;
                                        interloopData.strategy[k].orderId = filterOrder;
                                        interloopData.strategy[k].Status = 'open';
                                    }
                                    newPathArray.push(interloopData.strategy[k]);
                                }
                                let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                        else if (orderPlace.isTradable == false) {
                            let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK" } }, { new: true });
                        }
                    }
                    else if (obj.strategy[i].action == 'sell') {
                        console.log("do sell action");
                        var orderPlace = await sell(exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, CustomerId, api_memo);
                        if (orderPlace.isTradable == true) {
                            var filterOrder = await filter_orderId(exchange, orderPlace);
                            if (filterOrder) {
                                await updateOrder({ orderId: filterOrder }, { userId: userId, symbol: symbol, price: price, quantity: quantity, side: 'sell', type: 'limit', orderStatus: 'open', exchangeName: exchange })
                                for (let k = 0; k < interloopData.strategy.length; k++) {
                                    if (k == i) {
                                        interloopData.strategy[k].isTradeActive = true;
                                        interloopData.strategy[k].orderId = filterOrder;
                                        interloopData.strategy[k].Status = 'open';
                                    }
                                    newPathArray.push(interloopData.strategy[k]);
                                }
                                let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                        else if (orderPlace.isTradable == false) {
                            let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK" } }, { new: true });
                        }
                    }
                    break;
                }
                else if (obj.strategy[i].isTrade == false && obj.strategy[i].isTradeActive == true) {
                    console.log("check order detail");
                    console.log('*************************************', i, new Date().toLocaleTimeString());
                    var orderDetail = await order_details(exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol, api_memo);
                    if (orderDetail.status == true) {
                        await updateOrder({ orderId: obj.strategy[i].orderId }, { executedQty: orderDetail.amount, cummulativeQuoteQty: orderDetail.totalAmount, orderStatus: 'closed' })
                        for (let k = 0; k < interloopData.strategy.length; k++) {
                            if (k == i) {
                                interloopData.strategy[k].isTradeActive = false;
                                interloopData.strategy[k].isTrade = true;
                                interloopData.strategy[k].amount = orderDetail.amount;
                                interloopData.strategy[k].Status = 'closed';
                            }
                            newPathArray.push(interloopData.strategy[k]);
                        }
                        let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                    }
                    else if (orderDetail.status == false) {
                        await updateOrder({ orderId: obj.strategy[i].orderId }, { orderStatus: 'cancelled' })
                        for (let k = 0; k < interloopData.strategy.length; k++) {
                            if (k == i) {
                                interloopData.strategy[k].Status = 'cancel';
                            }
                            newPathArray.push(interloopData.strategy[k]);
                        }
                        let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'CANCELLED',status:status.CANCELLED } }, { new: true });
                        if (updateStrategy) {
                            var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.loop': 0 } });
                        }
                    }
                    break;
                }
                else if (obj.strategy[i].isTrade == false && obj.strategy[i].isAddress == false) {
                    console.log('Do address generate');
                    console.log('*************************************', i, new Date().toLocaleTimeString());
                    console.log(exchange, obj.strategy[i - 1]);
                    var addressNumber
                    // var addressNumber = await address(exchange, obj.strategy[i - 1].withdrawCoin, apiKey, secretKey, passPhrase, api_memo);
                    if (exchange == 'Coinbase') {
                        let withdressAddressFind = await findWithdrawAddress({ exchangeName: exchange, userId: userId })
                        for (let i = 0; i < withdressAddressFind.address.length; i++) {
                            if (withdressAddressFind.address[i].coinName == obj.strategy[i - 1].withdrawCoin) {
                                addressNumber = {
                                    status: true,
                                    address: withdressAddressFind.address[i].address,
                                    network: withdressAddressFind.address[i].network
                                }
                            }
                        }
                    } else {
                        addressNumber = await address(exchange, obj.strategy[i - 1].withdrawCoin, apiKey, secretKey, passPhrase, api_memo);
                    }
                    if (addressNumber.status == true) {
                        for (let k = 0; k < interloopData.strategy.length; k++) {
                            if (k == i) {
                                interloopData.strategy[k].isAddress = true;
                                interloopData.strategy[k].address = addressNumber.address;
                                interloopData.strategy[k].network = addressNumber.network;
                            }
                            newPathArray.push(interloopData.strategy[k]);
                        }
                        let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                    }
                    else if (addressNumber.status == false) {
                        let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK" } }, { new: true });
                    }
                    break;
                }
                else if (obj.strategy[i].isTrade == true && obj.strategy[i].isWithdraw == false && obj.strategy[i + 1].isAddress == true) {
                    if (obj.strategy[i].isWithdrawActive == true) {
                        console.log('Check Withdraw');
                        console.log('*************************************', i, new Date().toLocaleTimeString());
                        let start = Math.floor(Date.now() / 1000)
                        var trasaction = await get_tx_id(obj.strategy[i].exchange, apiKey, secretKey, passPhrase, start, obj.strategy[i].withdrawCoin, CustomerId, api_memo);
                        if (trasaction) {
                            var txId = await filter_txId(exchange, trasaction, obj.strategy[i].withdrawId)
                            if (txId) {
                                var withdrawHistoryRes = filter_txIdForWithdraw(exchange, trasaction, obj.strategy[i].withdrawId)
                                if (withdrawHistoryRes) {
                                    let objsave = {
                                        exchangeName: exchange,
                                        userId: userId,
                                        type: transactionType.WITHDRAW,
                                        address: withdrawHistoryRes.address,
                                        amount: withdrawHistoryRes.amount,
                                        coin: obj.strategy[i].withdrawCoin,
                                        withdrawId: obj.strategy[i].withdrawId,
                                        withdrawStatus: withdrawHistoryRes.withdrawStatus,
                                        transactionFee: withdrawHistoryRes.transactionFee
                                    }
                                    await withdrawHistoryFindOneAndUpdate({ withdrawId: obj.strategy[i].withdrawId }, objsave)
                                }
                                for (let k = 0; k < interloopData.strategy.length; k++) {
                                    if (k == i) {
                                        interloopData.strategy[k].isWithdrawActive = false;
                                        interloopData.strategy[k].isWithdraw = true;
                                        interloopData.strategy[k].TransactionId = txId;
                                        interloopData.strategy[k].withdrawStatus = 'closed';
                                    }
                                    newPathArray.push(interloopData.strategy[k]);
                                }
                                let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                        break;
                    } else {
                        console.log('Do Withdraw');
                        console.log('*************************************', i, new Date().toLocaleTimeString());
                        console.log("Withdraw coin ======>", obj.strategy[i].exchange, obj.strategy[i].withdrawCoin);
                        let coinKey
                        if (obj.strategy[i].exchange == 'Kraken') {
                            if (obj.strategy[i + 1].exchange == 'Binance') {
                                coinKey = obj.strategy[i].withdrawCoin + '_Binance'
                            } else if (obj.strategy[i + 1].exchange == 'Coinbase') {
                                coinKey = obj.strategy[i].withdrawCoin + '_Coinbase'
                            }else if(obj.strategy[i + 1].exchange == 'Mexc'){
                                coinKey = obj.strategy[i].withdrawCoin + '_Mexc'
                            }
                        }
                        var withdrow = await withdraw(obj.strategy[i].exchange, obj.strategy[i].withdrawCoin, obj.strategy[i].amount, obj.strategy[i + 1].address, apiKey, secretKey, passPhrase, CustomerId, api_memo, obj.strategy[i + 1].network, coinKey);
                        console.log("withdrow-->>>", withdrow);
                        if (withdrow && withdrow.iswithdrawable == true) {
                            var withdrowNumber = await filter_withdrowId(exchange, withdrow);
                            if (withdrowNumber) {
                                var interloopData = await interLoopModel.findOne({ _id: placeddirecteId });
                                for (let k = 0; k < interloopData.strategy.length; k++) {
                                    if (k == i) {
                                        interloopData.strategy[k].isWithdrawActive = true;
                                        interloopData.strategy[k].withdrawId = withdrowNumber;
                                        interloopData.strategy[k].withdrawStatus = 'open';
                                    }
                                    newPathArray.push(interloopData.strategy[k]);
                                }
                                let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                        else if (withdrow.iswithdrawable == false) {
                            let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: 'BLOCK' } }, { new: true });
                        }
                        break;
                    }
                }
                else if (obj.strategy[i].isTrade == false && obj.strategy[i].isDeposit == false) {
                    console.log('Do deposit');
                    console.log('*************************************', i, obj.strategy[i - 1], new Date().toLocaleTimeString());
                    var deposits = await check_deposit(exchange, obj.strategy[i - 1].TransactionId, apiKey, secretKey, passPhrase, CustomerId, obj.strategy[i - 1].withdrawCoin, api_memo);
                    if (deposits.status == true) {
                        let depositHistory = await check_depositHistory(exchange, obj.strategy[i - 1].TransactionId, apiKey, secretKey, passPhrase, CustomerId, obj.strategy[i - 1].withdrawCoin, api_memo)
                        if (depositHistory) {
                            let objsave = {
                                exchangeName: exchange,
                                userId: userId,
                                type: transactionType.DEPOSITE,
                                address: depositHistory.address,
                                amount: depositHistory.amount,
                                coin: obj.strategy[i - 1].withdrawCoin,
                                withdrawStatus: depositHistory.withdrawStatus,
                            }
                            await withdrawHistoryFindOneAndUpdate({ userId: userId, exchangeName: exchange, type: transactionType.DEPOSITE, address: depositHistory.address, amount: depositHistory.amount }, objsave)
                        }
                        for (let k = 0; k < interloopData.strategy.length; k++) {
                            if (k == i) {
                                interloopData.strategy[k].isDeposit = true;
                                interloopData.strategy[k].isStatus = true;
                                interloopData.strategy[k].amount = deposits.amount;
                                interloopData.strategy[k].depositStatus = 'closed'
                                interloopData.strategy[k + 1].status == true;
                            }
                            newPathArray.push(interloopData.strategy[k]);
                        }
                        let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                    }
                    break;
                }
                else if (obj.strategy[i].isTrade == true && i == 2) {
                    let tickers = (await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange }))['_doc']['tickers'];
                    var splittoken = await split_token(obj.strategy[i].exchange, obj.strategy[i].symbol);
                    var total = parseFloat(obj.strategy[i].amount * obj.strategy[i].price)
                    var profit = total - obj.capital;
                    if (splittoken[1] != 'USDT') {
                        var convertProfit = await convert_profit(obj.strategy[i].exchange, tickers, [splittoken[1]], profit);
                        profit = convertProfit;
                    }
                    let updateStrategy = await interLoopModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED } }, { new: true });
                    if (updateStrategy) {
                        var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.loop': 0 } });
                    }
                }
            }
        });
    } catch (error) {
        console.log('19i Some went wrong >>', error.message)
    }
});
///////////////////////////////////////
// start-stop cron-job

interLooptarbitrage.start();
