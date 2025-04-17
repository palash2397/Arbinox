const c = require('config');

function convertProfit(exchange, tickers, start_tokens, quantity) {
    for (let token of start_tokens) {
        switch (token) {
            case 'USD':
                return quantity;
                break;
            case 'USDT':
                return quantity;
                break;
            default:
                if (tickers[token + 'USDT']) {
                    return quantity * tickers[token + 'USDT']['price'];
                } else {
                    return quantity * tickers[token + 'USD']['price'];
                }
                break;
        }
    }
}
module.exports = {
    find_paths: async (prices, strating_coin, amount, exchange, fee) => {
        let minPrecision, profit3;
        let paths = new Array();
        let count = 0, count1 = 0, count2 = 0;
        let profit = 0.001;
        let coin, coin1, coin2, coin3, coin4;
        let price, price1, price2, price3, price4;
        for (let token of strating_coin) { //USDT
            if (prices[token]) {
                for ([coin, price] of Object.entries(prices[token])) { //BTC-USDT buy    NEO_USDT Buy
                    for ([coin1, price1] of Object.entries(prices[coin])) {//ETH-BTC buy    NEO_BTC sell
                        if (coin1 == "USDT") {
                            // for ([coin2, price2] of Object.entries(prices[coin1])) { //ETH-USDT sell    BTC-USDT sell
                            //     if (coin2 == token) {
                            let profit2 = calculateProfitTwoPair(amount[token], price[0], price[2], price1[0], price1[2], exchange)
                            if (parseFloat(profit2) > profit) {
                                if (parseFloat(fee[price[1]].minNotional) < (parseFloat(amount[token]) / parseFloat(price[4])) && parseFloat(fee[price1[1]].minNotional) < (parseFloat(profit2[1]) * parseFloat(price1[4]))) {
                                    count += 1;
                                    let obj = {
                                        coins: [token, price[1], price1[1], token],
                                        profit: profit2[0],
                                        prices: [price[4], price1[4]],
                                        finalPrices: [price[0], price1[0],],
                                        fees: [price[2], price1[2]],
                                        volume: [price[3], price1[3]],
                                        amount: [amount[token], profit2[1], profit2[2]]
                                    }
                                    paths.push(obj);
                                    profit2 = 0
                                }
                                // }
                                // }
                            }
                        }
                    }
                }
            }

        }
        paths.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
        return paths;
    },
    execute_paths: async (paths, exchange, tickers, capital, quantity) => {
        var response = [];
        for (let [id, data] of Object.entries(paths)) {
            let start = data.coins[0];
            let splitedPair = [tickers[data.coins[1]].base, tickers[data.coins[1]].quote]
            let stop = start
            let pairName
            let p;
            let orders = {}
            let test = []
            let split_pair;
            let finalReceiveAmount = 0;
            for (let i = 0; i <= data.coins[0].length + 2; i++) {
                let test1 = {}
                if (i > 0) {
                    if (data.coins[i] == stop) {
                        break
                    } else if (tickers[data.coins[i]].quote == start) {
                        split_pair = [tickers[data.coins[i]].base, tickers[data.coins[i]].quote]
                        test1[data.coins[i]] = 'buy';
                        p = tickers[data.coins[i]]['price'];
                        // test1['price'] = toFixed(p);
                        test1['price'] = toFixed(parseFloat(data.prices[i - 1]));
                        test1['finalPrice'] = toFixed(parseFloat(data.finalPrices[i - 1]));
                        test1['fees'] = parseFloat(data.fees[i - 1]);
                        test1['volume'] = parseFloat(data.volume[i - 1]);
                        test1['buyAmount'] = parseFloat(data.amount[i - 1]);
                        test1['receiveAmount'] = parseFloat(data.amount[i]);
                        test1['baseCurrency'] = split_pair[0];
                        test1['quoteCurrency'] = split_pair[1];
                        test1['quoteCurrencyUSDTPrice'] = tickers[split_pair[1] + 'USDT'].price;
                        test.push(test1);
                        start = split_pair[0];
                        finalReceiveAmount = data.amount[i];
                        pairName = split_pair[0]
                    } else {
                        split_pair = [tickers[data.coins[i]].base, tickers[data.coins[i]].quote]
                        test1[data.coins[i]] = 'sell'
                        p = tickers[data.coins[i]]['price'];
                        // test1['price'] = toFixed(p);
                        test1['price'] = toFixed(parseFloat(data.prices[i - 1]));
                        test1['finalPrice'] = toFixed(parseFloat(data.finalPrices[i - 1]));
                        test1['fees'] = parseFloat(data.fees[i - 1]);
                        test1['volume'] = parseFloat(data.volume[i - 1]);
                        test1['sellAmount'] = parseFloat(data.amount[i - 1]);
                        test1['receiveAmount'] = parseFloat(data.amount[i]);
                        test1['baseCurrency'] = split_pair[1];
                        test1['quoteCurrency'] = split_pair[0];
                        test1['quoteCurrencyUSDTPrice'] = tickers[split_pair[0] + 'USDT'].price;
                        test.push(test1);
                        start = split_pair[1];
                        finalReceiveAmount = data.amount[i];
                        pairName = split_pair[0]
                    }
                }
            }
            orders.coins = test;
            orders.capital = quantity[data.coins[0]];
            orders.capitalInUSDT = capital;
            orders.start = data.coins[0];
            orders.pairName = pairName;
            // if (splitedPair[0] == start) {
            //     orders.pair = splitedPair[1];
            // }
            // else if (splitedPair[1] == start) {
            //     orders.pair = splitedPair[0];
            // }
            // let token = [data.coins[0]];
            let token = [start];
            orders.profit = parseFloat(convertProfit(exchange, tickers, token, data.profit).toFixed(6)) - parseFloat(capital);
            // orders.profitPercent = parseFloat(orders.profit) / 100;
            orders.profitPercent = parseFloat(parseFloat(finalReceiveAmount) - parseFloat(quantity[token])) / parseFloat(quantity[token]) * 100
            orders.profitCurrencyBase = parseFloat(finalReceiveAmount)
            if (parseFloat(convertProfit(exchange, tickers, token, data.profit).toFixed(6)) - parseFloat(capital) > 0) {
                response.push(orders);
            }
        }
        // console.log('315 ==>',response[0])
        return response;
    },
}
function toFixed(x) {
    if (Math.abs(x) < 1.0) {
        var e = parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
        }
    } else {
        var e = parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            x += (new Array(e + 1)).join('0');
        }
    }
    return x;
}

let calculateProfitTwoPair = (amount, price0, price0TradeFee, price1, price1TradeFee, exchange) => {
    let tradeFee = price0TradeFee
    if (exchange == "Binance") {
        tradeFee = 0.25
    }
    else if (exchange == "Kraken") {
        tradeFee = 0.4
    }else if(exchange == "Bitmart"){
        tradeFee = 0.15
    }
    let totalAmount = parseFloat(amount) * parseFloat(price0) - ((parseFloat(amount) * parseFloat(price0)) * parseFloat(tradeFee) / 100)
    let totalAmount1 = parseFloat(totalAmount) * parseFloat(price1) - ((parseFloat(totalAmount) * parseFloat(price1)) * parseFloat(tradeFee) / 100)
    return [totalAmount1 - amount, totalAmount, totalAmount1]
}