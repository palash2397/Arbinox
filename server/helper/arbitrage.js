import binanceFunction from "./binanceFunction";
import { get_token } from './tokenpair';
import { walletServices } from '../api/v1/services/wallet';
import tokenCombinations from "./tokenCombinations";
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate } = walletServices;
const axios = require('axios');

module.exports = {
  //----------------------------------------Direct Arbitrage-------------------------------------------------------------//
  getCapitalDirect: async (orderdata, capital) => {
    let filteredPaths = [];
    let minPrecision;
    if (orderdata.length > 50) {
      orderdata = orderdata.slice(0, 50);
    }
    else {
      orderdata = orderdata;
    }
    for (let path of orderdata) {
      let exchangeTokenData1 = await exchangeData({ exchangeName: path.buy, status: "ACTIVE" });
      let exchangeTokenData2 = await exchangeData({ exchangeName: path.sell, status: "ACTIVE" });
      let newCapital = get_quantity(path.buy, exchangeTokenData1.tickers, path.base, path.pair, capital);
      let t1 = exchangeTokenData1.exchangeName;
      let t2 = exchangeTokenData2.exchangeName;
      var all_tickers = new Array();
      var token = {};
      token[t1] = exchangeTokenData1.tickers;
      token[t2] = exchangeTokenData2.tickers;
      all_tickers.push(token);
      let price1 = get_compare_price(path.buy, all_tickers[0], path.base, path.pair);
      let price2 = get_compare_price(path.sell, all_tickers[0], path.base, path.pair);
      price1 = price1.price;
      price2 = price2.price;
      var invested = (newCapital / price1);
      invested = (invested - (invested * path.tradeFee1 / 100))
      invested = invested - parseFloat(path.withdrawFee1);
      if (invested > 0) {
        // if (t2 == 'Binance') {
        //   minPrecision = exchangeTokenData2.tradeFee[path.base + path.pair].minPrecision
        //   invested = invested.toFixed(minPrecision)
        // }
        invested = invested * price2;
        invested = invested - (invested * path.tradeFee2 / 100)
        let profit = parseFloat(invested).toFixed(18) - parseFloat(newCapital).toFixed(18);
        if (path.pair != 'USDT') {
          profit = convert_profit(path.sell, all_tickers[0], path.pair, profit)
        }
        profit = Math.abs(Number(profit).toFixed(18));
        var percentageProfit = parseFloat(((profit / capital) / 100)).toFixed(18);
        if (invested > newCapital) {
          path.exchange1_price = Number(price1).toPrecision()
          path.exchange2_price = Number(price2).toPrecision()
          path.profit = profit;
          path.PercentageProfit = percentageProfit,
            path.capital = capital
          filteredPaths.push(path)
        }
      }
    }
    // console.log(filteredPaths);
    return filteredPaths;
  },
  getExchange: async (orderdata, exchange1, exchange2) => {
    let filteredPaths = [];
    var exchangeFrom = [];
    var exchangeTo = [];
    for (let exchange of exchange1) {
      let exchangeTokenData = await exchangeData({ uid: exchange, status: "ACTIVE" });
      exchangeFrom.push(exchangeTokenData.exchangeName)
    }
    for (let exchange of exchange2) {
      let exchangeTokenData = await exchangeData({ uid: exchange, status: "ACTIVE" });
      exchangeTo.push(exchangeTokenData.exchangeName)
    }
    // console.log("exchange from:", exchangeFrom, "exchange to:", exchangeTo, 813)
    for (let path of orderdata) {
      if (exchangeFrom.includes(path.buy) && exchangeTo.includes(path.sell)) {
        filteredPaths.push(path)
      }
    }
    return filteredPaths;
  },
  getStartToken: async (orderdata, startToken) => {
    let filteredPaths = [];
    filteredPaths.push(orderdata);
    let filterStartTokens = []
    for (let i = 0; i < filteredPaths[0].length; i++) {
      if ((startToken).includes(filteredPaths[0][i].base) || (startToken).includes(filteredPaths[0][i].pair)) {
        // console.log(filteredPaths[0][i]);
        filterStartTokens.push(filteredPaths[0][i])
      }
    }
    // console.log("after startToken filter: ", filteredPaths)
    return filteredPaths = filterStartTokens;
  },
  get_available_tokens_update: async (exchange, start_token, all_tickers) => {
    let data = {}
    let obj = {}
    let tokens = await tokenCombinations.direct(all_tickers[0][exchange])
    if (tokens) {
      for (let token of start_token) {
        if (tokens[token]) {
          obj[token] = tokens[token]
        }
      }
    }
    data[exchange] = obj
    // console.log(data,164)
    return data;
  },
  filter_tokens: async (data, start_tokens) => {
    let filtered = {}
    for (let coin of start_tokens) {
      let list = []
      for (let [exchange, values] of Object.entries(data)) {
        list = list + ',' + values[coin];
      }
      list = list.split(',')
      const mySet = new Set(list)
      const duplicates = list.filter(item => {
        if (mySet.has(item)) {
          mySet.delete(item)
        } else {
          return item
        }
      });
      filtered[coin] = duplicates
    }
    return filtered
  },
  after_filter: async (exchange, check, all_tickers) => {
    var ticker = {}
    ticker[exchange] = all_tickers;
    let cal_arbitrage = {}
    let list = {}
    for (let pair of Object.keys(check)) {
      for (let token of check[pair]) {
        if (ticker[exchange][token + pair])
          list[token + pair] = ticker[exchange][token + pair].price
      }
    }
    cal_arbitrage[exchange] = list
    // console.log("data------------------------------",cal_arbitrage);
    return cal_arbitrage;
  },
  cal_arbitrage_paths_direct: async (data, start_tokens, capital, all_withdrawfee, all_tickers, all_tradefee, convertValue) => {
    let exchanges = Object.keys(data);
    const exchange1 = exchanges[0];
    const exchange2 = exchanges[1];
    let token_list = data[exchange1];
    let paths = {};
    for (let [coin, price] of Object.entries(token_list)) {
      let compare_price = 0;
      let token = [all_tickers[0][exchanges[1]][coin].base, all_tickers[0][exchanges[1]][coin].quote]
      if (all_withdrawfee[0][exchange1][token[0]] && all_withdrawfee[0][exchange2][token[0]]) {
        var withdraw_fee1 = all_withdrawfee[0][exchange1][token[0]].withdrawFee;
        // console.log(16, exchange2, token[0])
        var withdraw_fee2 = all_withdrawfee[0][exchange2][token[0]].withdrawFee;
      }
      compare_price = data[exchange2][token[0] + token[1]]
      let symbol = coin
      // if (all_tickers[0][exchanges[0]][symbol] && all_tickers[0][exchanges[1]][symbol]) {
      var volume1 = all_tickers[0][exchanges[0]][symbol].volume;
      var volume2 = all_tickers[0][exchanges[1]][symbol].volume;
      // }
      if (compare_price > price) {
        let newCapital = get_quantity(exchange1, all_tickers[0][exchange1], token[0], token[1], capital)
        if (all_tradefee[0][exchange1][symbol] && all_tradefee[0][exchange2][symbol]) {
          var tradefee1 = parseFloat(all_tradefee[0][exchange1][symbol].tradefee);
          var tradefee2 = parseFloat(all_tradefee[0][exchange2][symbol].tradefee);
        }
        var invested = (newCapital / price);
        invested = invested - parseFloat(withdraw_fee1);
        let receiveAmount = invested - parseFloat(withdraw_fee1);
        if (invested > 0) {
          invested = invested * compare_price;
          invested = invested - (invested * tradefee2 / 100)
          invested = invested - (invested * tradefee1 / 100)
          let profit = invested - newCapital;
          let profitInUSDT = Number(profit)
          let livePrice = all_tickers[0][exchange2][symbol].price
          if (token[1] != 'USDT') {
            // profit = profit * all_tickers[0][exchange2][symbol].price // profit conversion if market is other than USDT
            if (exchange2 == 'Mexc') {
              if (token[1] == 'BTC') {
                let livePriceBTCUSDT = await convertProfitPriceForMexc("BTCUSDT")
                profitInUSDT = Number(profit) * Number(livePriceBTCUSDT)
                livePrice = livePriceBTCUSDT
              }
              if (token[1] == 'ETH') {
                let livePriceBTCUSDT = await convertProfitPriceForMexc("ETHUSDT")
                profitInUSDT = Number(profit) * Number(livePriceBTCUSDT)
                livePrice = livePriceBTCUSDT
              }
            } else {
              if (token[1] == 'BTC') {
                profitInUSDT = Number(profit * all_tickers[0][exchange2]["BTCUSDT"].price)
                livePrice = all_tickers[0][exchange2]["BTCUSDT"].price
              }
              if (token[1] == 'ETH') {
                profitInUSDT = Number(profit * all_tickers[0][exchange2]["ETHUSDT"].price)
                livePrice = all_tickers[0][exchange2]["ETHUSDT"].price
              }
            }

          }
          // profit = Math.abs(Number(profit).toFixed(18));
          profit = Number(profit).toFixed(18)
          var percentageProfit = parseFloat(((profitInUSDT / capital) * 100)).toFixed(18);
          let startToken = [token[1]]
          if (invested > newCapital && profit > 0) {
            paths[token[0]] = {
              'base': token[0],
              'pair': token[1],
              'buy': exchange1,
              'exchange1_price': Number(price),
              "volume1": volume1,
              'withdrawFee1': withdraw_fee1,
              'tradeFee1': tradefee1,
              'sell': exchange2,
              'exchange2_price': Number(compare_price),
              "volume2": volume2,
              'withdrawFee2': withdraw_fee2,
              'tradeFee2': tradefee2,
              'profit': profit,
              'PercentageProfit': percentageProfit,
              'capital': capital,
              'receiveExchange1': receiveAmount,
              'receiveExchange2': invested,
              'startCoin': start_tokens,
              'baseCapital': newCapital,
              'profitInUsdt': profitInUSDT,
              'livePrice': livePrice
            }
          }
        }
      }
    }
    const arr = Object.keys(paths).map(el => {
      return paths[el];
    });
    arr.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
    return arr;
  },
  //----------------------------------------loop Arbitrage filter ------------------------------------------------------------//
  getExchangeLoop: async (orderdata, exchange1, exchange2, exchange3) => {
    let filteredPaths = [];
    var exchangeFrom = [];
    var exchangeTo1 = [];
    var exchangeTo2 = [];
    for (let exchange of exchange1) {
      let exchangeTokenData = await exchangeData({ uid: exchange, status: "ACTIVE" });
      exchangeFrom.push(exchangeTokenData.exchangeName)
    }
    for (let exchange of exchange2) {
      let exchangeTokenData = await exchangeData({ uid: exchange, status: "ACTIVE" });
      exchangeTo1.push(exchangeTokenData.exchangeName)
    }
    for (let exchange of exchange3) {
      let exchangeTokenData = await exchangeData({ uid: exchange, status: "ACTIVE" });
      exchangeTo2.push(exchangeTokenData.exchangeName)
    }
    // console.log("exchange from:", exchangeFrom, "exchange to1:", exchangeTo1,"exchange to2:", exchangeTo2)
    for (let path of orderdata) {
      if (exchangeFrom.includes(path.order0.exchange) && exchangeTo1.includes(path.order1.exchange) && exchangeTo2.includes(path.order2.exchange)) {
        filteredPaths.push(path)
      }
    }
    return filteredPaths;
  },
  getStartTokenLoop: async (orderdata, startToken) => {
    let filteredPaths = [];
    let data;
    filteredPaths.push(orderdata);
    let filterStartTokens = []
    for (let i = 0; i < filteredPaths[0].length; i++) {
      if (filteredPaths[0][i].order0.exchange == 'Binance') {
        data = getBaseBinance(filteredPaths[0][i].order0.coin);
      }
      else if (filteredPaths[0][i].order0.exchange == 'Coinbase') {
        data = filteredPaths[0][i].order0.coin.split('-');
      }
      else if (filteredPaths[0][i].order0.exchange == 'Huobi') {
        data = getBaseHuobi(filteredPaths[0][i].order0.coin);
      } else if (filteredPaths[0][i].order0.exchange == 'Kraken') {
        data = getBaseKraken(filteredPaths[0][i].order0.coin);
      } else if (filteredPaths[0][i].order0.exchange == 'Gateio') {
        data = getBaseGateio(filteredPaths[0][i].order0.coin);
      }
      if ((startToken).includes(data[0]) || (startToken).includes(data[1])) {
        filterStartTokens.push(filteredPaths[0][i])
      }
    }
    return filterStartTokens;
  },
  getCapitalInterLoop: async (orderdata, capital) => {
    let filteredPaths = [];
    let base, minPrecision;
    // orderdata = orderdata.slice(1,2)
    // console.log(orderdata);
    let binanceTokenData1 = await exchangeData({ exchangeName: 'Binance', status: "ACTIVE" });
    for (let path of orderdata) {
      let exchangeTokenData1 = await exchangeData({ exchangeName: path.order0.exchange, status: "ACTIVE" });
      let exchangeTokenData2 = await exchangeData({ exchangeName: path.order1.exchange, status: "ACTIVE" });
      let exchangeTokenData3 = await exchangeData({ exchangeName: path.order2.exchange, status: "ACTIVE" });
      let t1 = exchangeTokenData1.exchangeName;
      let t2 = exchangeTokenData2.exchangeName;
      let t3 = exchangeTokenData3.exchangeName;
      var all_tickers = new Array();
      var token = {};
      token[t1] = exchangeTokenData1.tickers;
      token[t2] = exchangeTokenData2.tickers;
      token[t3] = exchangeTokenData3.tickers;
      all_tickers.push(token);
      let symbol = path.order0.coin;
      let startToken = getStartToken(symbol, path)
      let quantity = capital
      // console.log(quantity, startToken, capital)
      // console.log(all_tickers[0][path.order0.exchange][path.order0.coin]);
      path.order0.price = all_tickers[0][path.order0.exchange][path.order0.coin].price
      path.order1.price = all_tickers[0][path.order1.exchange][path.order1.coin].price
      path.order2.price = all_tickers[0][path.order2.exchange][path.order2.coin].price
      let profit;
      let amount = quantity;
      let obj = path;
      for (let [key, value] of Object.entries(obj)) {
        let execution = key.replace(/[0-9]/g, '');
        if (execution == 'order') {
          if (value.side == 'sell') {
            if (!key.endsWith('0') && value.exchange == 'Binance') {
              minPrecision = binanceTokenData1.tradeFee[value.coin].minPrecision
              profit = amount.toFixed(minPrecision) * value.price
              profit = (profit - (profit * parseFloat(value.tradeFee)) / 100)
              if (value.withdrawFee && !key.endsWith('2'))
                profit = profit - parseFloat(value.withdrawFee)
            } else {
              profit = amount * value.price
              profit = (profit - (profit * parseFloat(value.tradeFee)) / 100)
              if (value.withdrawFee && !key.endsWith('2'))
                profit = profit - parseFloat(value.withdrawFee)
            }
          } else if (value.side == 'buy') {
            if (!key.endsWith('0') && value.exchange == 'Binance') {
              minPrecision = binanceTokenData1.tradeFee[value.coin].minPrecision
              profit = amount.toFixed(minPrecision) / value.price
              profit = (profit - (profit * parseFloat(value.tradeFee)) / 100)
              if (value.withdrawFee && !key.endsWith('2'))
                profit = profit - parseFloat(value.withdrawFee)
            } else {
              profit = amount / value.price
              profit = (profit - (profit * parseFloat(value.tradeFee)) / 100)
              if (value.withdrawFee && !key.endsWith('2'))
                profit = profit - parseFloat(value.withdrawFee)
            }
          }
          amount = profit
          // console.log(593,key, value, profit)
        }
      }
      profit = profit - quantity
      // console.log(profit,quantity,595)
      if (profit > 0) {
        obj.order0.price = toFixed(path.order0.price)
        obj.order1.price = toFixed(path.order1.price)
        obj.order2.price = toFixed(path.order2.price)
        obj.profit = profit
        obj.capital = capital
        filteredPaths.push(obj)
      }
    }
    return filteredPaths;
  },
  get_prices_loop: async (exchanges, all_tickers) => {
    let data = {}
    for (let exchange of exchanges) {
      data[exchange] = await tokenCombinations.getPricesLoop(all_tickers[0][exchange])
    }
    // console.log(data,770)
    return data
  },
  get_paths_loop: async (exchanges, data, amount, starting_coins, all_withdrawfee, all_tickers, all_tradefee, convertvalue) => {
    let newCapital = await get_quantity_loop(exchanges, all_tickers[0], starting_coins, amount);
    var paths = [];
    let profit, minPrecision, firstAmount, secondAmount, thirdAmount;
    const start_exchange = Object.keys(data)[0]
    var exchanges = Object.keys(data)
    for (let token of starting_coins) {
      let b_token = token;
      if (data[exchanges[0]][b_token]) {
        for (let [coin, price] of Object.entries(data[exchanges[0]][b_token])) {
          if (data[exchanges[1]][coin]) {
            b_token = coin

            for (let [coin1, price1] of Object.entries(data[exchanges[1]][b_token])) {
              b_token = coin1
              if (data[exchanges[2]][b_token]) {
                for (let [coin2, price2] of Object.entries(data[exchanges[2]][b_token])) {

                  if (coin2 == token) {
                    if (all_withdrawfee[0][exchanges[0]][coin] && all_withdrawfee[0][exchanges[1]][coin1] && all_withdrawfee[0][exchanges[2]][coin1]) {
                      var withdraw_fee0 = all_withdrawfee[0][exchanges[0]][coin].withdrawFee;
                      var withdraw_fee1 = all_withdrawfee[0][exchanges[1]][coin1].withdrawFee;
                      var withdraw_fee2 = all_withdrawfee[0][exchanges[2]][coin1].withdrawFee;
                    }
                    var symbol1 = price[1];
                    var symbol2 = price1[1];
                    var symbol3 = price2[1];
                    if (all_tickers[0][exchanges[0]][symbol1] && all_tickers[0][exchanges[1]][symbol2] && all_tickers[0][exchanges[2]][symbol3]) {
                      var volume0 = all_tickers[0][exchanges[0]][symbol1].volume;
                      var volume1 = all_tickers[0][exchanges[1]][symbol2].volume;
                      var volume2 = all_tickers[0][exchanges[2]][symbol3].volume;
                    }
                    if (all_tradefee[0][exchanges[1]][symbol2] && all_tradefee[0][exchanges[2]][symbol3]) {
                      var trade0 = parseFloat(all_tradefee[0][exchanges[0]][symbol1].tradefee);
                      var trade1 = parseFloat(all_tradefee[0][exchanges[1]][symbol2].tradefee);
                      var trade2 = parseFloat(all_tradefee[0][exchanges[2]][symbol3].tradefee);
                    }
                    //level-1
                    if (exchanges[0] == 'Binance') {
                      if (price[0] != price[2]) {
                        // minPrecision = all_tradefee[0][exchanges[0]][symbol1].pricePrecision
                        minPrecision = 6
                      } else {
                        // minPrecision = all_tradefee[0][exchanges[0]][symbol1].minPrecision
                        minPrecision = 5
                      }
                      profit = ((newCapital[token]).toFixed(minPrecision) * price[0]);
                      profit = (profit - (profit * trade0) / 100);
                      profit = profit - parseFloat(withdraw_fee0);
                    } else {
                      profit = (newCapital[token] * price[0]);
                      profit = (profit - (profit * trade0) / 100);
                      profit = profit - parseFloat(withdraw_fee0);
                    }
                    firstAmount = profit
                    //  console.log(878,'level-1',price[1], price[2],profit,minPrecision)
                    //level-2
                    if (exchanges[1] == 'Binance') {
                      if (price1[0] != price1[2]) {
                        // minPrecision = all_tradefee[0][exchanges[1]][symbol2].pricePrecision
                        minPrecision = 5
                      } else {
                        // minPrecision = all_tradefee[0][exchanges[1]][symbol2].minPrecision
                        minPrecision = 5
                      }
                      profit = (profit.toFixed(minPrecision) * price1[0]);
                      profit = (profit - (profit * trade1) / 100);
                      profit = profit - parseFloat(withdraw_fee1);
                    } else {
                      profit = (profit * price1[0]);
                      profit = (profit - (profit * trade1) / 100);
                      profit = profit - parseFloat(withdraw_fee1);
                    }
                    secondAmount = profit
                    //  console.log(890,'level-2',price1[1], price1[2], profit, minPrecision)
                    //level-3
                    if (exchanges[2] == 'Binance') {
                      if (price2[0] != price2[2]) {
                        // minPrecision = all_tradefee[0][exchanges[2]][symbol3].pricePrecision
                        minPrecision = 5
                      } else {
                        // minPrecision = all_tradefee[0][exchanges[2]][symbol3].minPrecision
                        minPrecision = 5
                      }
                      profit = (profit.toFixed(minPrecision) * price2[0]);
                      profit = (profit - (profit * trade2) / 100);
                    } else {
                      profit = (profit * price2[0]);
                      profit = (profit - (profit * trade2) / 100);
                    }
                    thirdAmount = profit
                    //  console.log(724,'level-3',price1[1], price2[2],price2[1], profit,minPrecision)
                    profit = (profit - newCapital[token]);
                    if (parseFloat(profit) > 0) {
                      let obj = {
                        start_token: token,
                        coins: [price[1], price1[1], price2[1]],
                        tokens: [token, coin, token],
                        base: [coin, coin1, coin1],
                        quote: [coin1, coin1, coin],
                        profit: profit,
                        prices: [price[0], price1[0], price2[0]],
                        exchanges: [exchanges[0], exchanges[1], exchanges[2]],
                        withdrawfee: [withdraw_fee0, withdraw_fee1, withdraw_fee2],
                        tradeFee: [trade0, trade1, trade2],
                        volumes: [volume0, volume1, volume2],
                        amount: [firstAmount, secondAmount, thirdAmount]
                      }
                      paths.push(obj);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    paths.sort((a, b) => (a.profit < b.profit) ? 1 : ((b.profit < a.profit) ? -1 : 0));
    // console.log("------------------------------------", paths);
    return paths
  },
  execute_paths: async (paths, exchanges, capital, all_tickers) => {
    let data = [];
    let price, coin, profit;
    for (let path of paths) {
      let orders = {}
      var next = path.start_token;
      for (let i = 0; i <= path['coins'].length - 1; i++) {
        let withdraw = {}
        if (path.exchanges[i] == 'BitFinex' && next == 'USDT' && (i == 0 || i == 2)) {
          next = 'USD'
        } else if (path.exchanges[i - 1] == 'BitFinex' && next == 'USD') {
          next = "USDT"
        }
        if (path.coins[i].endsWith(next)) {
          price = await get_price(path.exchanges[i], path.coins[i], all_tickers[0]);
          if (i <= 1) {
            coin = path.coins[i].replace(/(_|-)/g, "");
            withdraw = { coin: coin.replace(next, ''), from: path.exchanges[i], to: path.exchanges[i + 1] }
          }
          next = path.coins[i].replace(next, '').replace(/(_|-)/g, "");
          var order = { side: 'buy', coin: path.coins[i], exchange: path.exchanges[i], price: price, withdrawFee: path.withdrawfee[i], volume: path.volumes[i], tradeFee: path.tradeFee[i], buyAmount: path.amount[i], buyCoin: path.base[i], receiveCoin: path.quote[i], start_coin: next };
          if (path.start_token != 'USDT') {
            profit = convert_profit(path.exchanges[i], all_tickers[0], path.start_token, path.profit);
          }
          else {
            profit = path.profit;
          }
        } else {
          price = await get_price(path.exchanges[i], path.coins[i], all_tickers[0]);
          if (i <= 1) {
            coin = path.coins[i].replace(/(_|-)/g, "")
            withdraw = { coin: coin.replace(next, ''), from: path.exchanges[i], to: path.exchanges[i + 1] }
          }
          next = path.coins[i].replace(next, '').replace(/(_|-)/g, "");
          var order = { side: 'sell', coin: path.coins[i], exchange: path.exchanges[i], price: price, withdrawFee: path.withdrawfee[i], volume: path.volumes[i], tradeFee: path.tradeFee[i], sellAmount: path.amount[i], sellCoin: path.base[i], receiveCoin: path.quote[i], start_coin: next }
          if (path.start_token != 'USDT') {
            profit = convert_profit(path.exchanges[i], all_tickers[0], path.start_token, path.profit);
          }
          else {
            profit = path.profit;
          }
        }
        orders['order' + i] = order
        if (i <= 1)
          orders['withdraw' + i] = withdraw
      }
      orders.profit = profit;
      orders.percentageProfit = parseFloat(((profit / capital) * 100)).toFixed(6);
      orders.capital = capital;
      data.push(orders)
    }
    return data;
  },
  //-----------------------------------------Intra Arbitrage----------------------------------------------------------------------//
  intraExchange: async (exchanges, startToken, capital, all_tickers, tradefee) => {
    let prices = await intra_prices(exchanges, all_tickers, startToken);
    // console.log("825",prices);
    var allpaths = await intra_available(prices, startToken, exchanges, capital, tradefee, all_tickers);
    if (allpaths) {
      return allpaths;
    }
  },
  getCapitalIntra: async (orderdata, capital) => {
    let filteredPaths = [];
    let diffProfit;
    let profit;
    let profit1;
    let minPrecision;
    for (let path of orderdata) {
      let exchangeTokenData1 = await exchangeData({ exchangeName: path.buy, status: "ACTIVE" });
      let exchangeTokenData2 = await exchangeData({ exchangeName: path.sell, status: "ACTIVE" });
      let t1 = exchangeTokenData1.exchangeName;
      let t2 = exchangeTokenData2.exchangeName;
      var all_tickers = new Array();
      var token = {};
      token[t1] = exchangeTokenData1.tickers;
      token[t2] = exchangeTokenData2.tickers;
      all_tickers.push(token);
      let price1 = get_compare_price(path.buy, all_tickers[0], path.base, path.pair)
      let price2 = get_compare_price(path.sell, all_tickers[0], path.base, path.pair)
      price1 = price1.price;
      price2 = price2.price;
      let quantity;
      if (price1 < price2) {
        quantity = getCapital(t1, token[t1], path.base, capital)
        // if(t1 == 'Binance'){
        //   // maxQty = all_tradefee[0][exchange1][symbol1].maxQty
        //   minPrecision = exchangeTokenData1.tradeFee[path.base + path.pair].minPrecision
        //   quantity = quantity.toFixed(minPrecision)
        // }
        profit = (quantity * parseFloat(price1));
        profit = (profit - (profit * path.tradefee1) / 100);
        if (t2 == 'Binance') {
          // console.log(path.base + path.pair, quantity, profit, t1)
          minPrecision = exchangeTokenData2.tradeFee[path.base + path.pair].minPrecision
          quantity = quantity.toFixed(minPrecision)
        }
        profit1 = (quantity * parseFloat(price2));
        profit1 = (profit1 - (profit1 * path.tradefee2) / 100);
        diffProfit = profit - profit1;
        if (path.pair != 'USDT') {
          diffProfit = convert_profit(t1, all_tickers[0], path.pair, diffProfit);
        }
        if (diffProfit > 0) {
          let obj = path
          obj.exchange1_price = price1
          obj.exchange2_price = price2
          obj.Profit = diffProfit
          obj.capital = quantity
          filteredPaths.push(obj);
        }
      } else if (price2 < price1) {
        quantity = getCapital(t2, token[t2], path.base, capital)
        profit = (quantity * parseFloat(price2));
        profit = (profit - (profit * path.tradefee1) / 100);
        if (t1 == 'Binance') {
          minPrecision = exchangeTokenData1.tradeFee[path.base + path.pair].minPrecision
          quantity = quantity.toFixed(minPrecision)
        }
        profit1 = (quantity * parseFloat(price1))
        profit1 = (profit1 - (profit1 * path.tradefee2) / 100);
        diffProfit = profit - profit1;
        if (path.pair != 'USDT') {
          diffProfit = convert_profit(t2, all_tickers[0], path.pair, diffProfit);
        }
        if (diffProfit > 0) {
          let obj = path
          obj.exchange1_price = price1
          obj.exchange2_price = price1
          obj.Profit = diffProfit
          obj.capital = quantity
          filteredPaths.push(obj)
        }
      }
    }
    return filteredPaths;
  },
  cal_arbitrage_paths_intra: async (data, start_tokens, capital, all_tickers, all_tradefee, convertValue) => {
    let exchanges = Object.keys(data);
    const exchange1 = exchanges[0];
    const exchange2 = exchanges[1];
    let token_list = data[exchange1];
    let paths = {};
    for (let [coin, price] of Object.entries(token_list)) {
      // let compare_price = 0;
      let token = [all_tickers[0][exchanges[1]][coin].base, all_tickers[0][exchanges[1]][coin].quote]
      let compare_price = data[exchange2][token[0] + token[1]]
      // let symbol = coin
      // if (all_tickers[0][exchanges[0]][symbol] && all_tickers[0][exchanges[1]][symbol]) {
      let volume1 = all_tickers[0][exchanges[0]][coin].volume;
      let volume2 = all_tickers[0][exchanges[1]][coin].volume;
      // }
      // if(price1 < price2){
      //   let totalFee = 0;
      //   let newCapital = get_quantity(exchange1, all_tickers[0][exchange1], token[0], token[1], capital)
      //   let tradefee1 = parseFloat(all_tradefee[0][exchange1][coin].tradefee);
      //   let tradefee2 = parseFloat(all_tradefee[0][exchange2][coin].tradefee);
      //   let profit = (newCapital * price1);
      //   totalFee = totalFee + (profit * tradefee1) / 100;
      //   profit = (profit + (profit * tradefee1) / 100);

      //   let profit1 = (newCapital * price2);
      //   totalFee = totalFee + (profit1 * tradefee2) / 100;
      //   profit1 = (profit1 + (profit1 * tradefee2) / 100);
      //   let diffProfit = profit1 - profit;
      //   if(diffProfit > totalFee){
      //     paths[token[0]] = {
      //       "base": token[0],
      //       "pair": token[1],
      //       "buy": exchange1,
      //       "exchange1_price": price1.toString(),
      //       "Volume1": volume1,
      //       "tradefee1": tradefee1.toString(),
      //       "sell": exchange2,
      //       "exchange2_price": price2.toString(),
      //       "Volume2": volume2,
      //       "tradefee2": tradefee2.toString(),
      //       "Profit": diffProfit - totalFee,
      //       "capital": newCapital,
      //       'USDT_equivalent': capital,
      //       "totalFee": totalFee
      //   }
      //   }
      // }
      if (compare_price > price) {
        let totalFee = 0, tradefee1, tradefee2;
        let newCapital = get_quantity(exchange1, all_tickers[0][exchange1], token[0], token[1], capital)
        if (all_tradefee[0][exchange1][coin] && all_tradefee[0][exchange2][coin]) {
          tradefee1 = parseFloat(all_tradefee[0][exchange1][coin].tradefee);
          tradefee2 = parseFloat(all_tradefee[0][exchange2][coin].tradefee);
        }
        let invested = (newCapital / price);
        totalFee = totalFee + (invested * tradefee1) / 100;
        invested = (invested - (invested * tradefee1) / 100)
        // invested = invested - parseFloat();
        if (invested > 0) {
          invested = invested * compare_price;
          totalFee = totalFee + (invested * tradefee2) / 100;
          invested = invested - (invested * tradefee2 / 100)
          let profit = newCapital - invested;
          if (token[1] != 'USD')
            profit = profit * all_tickers[0][exchange2][coin].price // profit conversion if market is other than USDT
          profit = Math.abs(Number(profit).toFixed(5));
          var percentageProfit = parseFloat(((profit / capital) * 100)).toFixed(4);
          if (profit > totalFee) {
            paths[token[0]] = {
              'base': token[0],
              'pair': token[1],
              'buy': exchange1,
              'exchange1_price': Number(price).toPrecision(),
              "volume1": volume1,
              'tradeFee1': tradefee1,
              'sell': exchange2,
              'exchange2_price': Number(compare_price).toPrecision(),
              "volume2": volume2,
              'tradeFee2': tradefee2,
              'profit': profit - totalFee,
              'PercentageProfit': percentageProfit,
              'capital': capital
            }
          }
        }
      }
    }
    const arr = Object.keys(paths).map(el => {
      return paths[el];
    });
    arr.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
    return arr;
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

function get_quantity(exchange, tickers, base, pair, quantity) {
  let qty;
  if (pair != 'USDT') {
    if (tickers[pair + 'USDT']) {
      qty = quantity / tickers[pair + 'USDT'].price
    }
  } else {
    qty = quantity;
  }
  return qty;
}
function get_price(exchange, token, tickers) {
  switch (exchange) {
    case 'Binance':
      for (let ticker of Object.keys(tickers.Binance)) {
        if (ticker == token)
          return tickers.Binance[ticker].price;
      }
      break;
    case 'Huobi':
      for (let ticker of Object.keys(tickers['Huobi'])) {
        if (ticker == token)
          return tickers['Huobi'][ticker].price;
      }
      break;
    case 'Coinbase':
      for (let ticker of Object.keys(tickers.Coinbase)) {
        if (ticker == token)
          return tickers.Coinbase[ticker].price
      }
      break;
    case 'Kraken':
      for (let ticker of Object.keys(tickers.Kraken)) {
        if (ticker == token)
          return tickers.Kraken[ticker].price
      }
      break;
    case 'Mexc':
      for (let ticker of Object.keys(tickers.Mexc)) {
        if (ticker == token)
          return tickers.Mexc[ticker].price
      }
      break;
    case 'Bitmart':
      for (let ticker of Object.keys(tickers.Bitmart)) {
        if (ticker == token)
          return tickers.Bitmart[ticker].price
      }
      break;
    case 'Kucoin':
      for (let ticker of Object.keys(tickers.Kucoin)) {
        if (ticker == token)
          return tickers.Kucoin[ticker].price
      }
      break;
    case 'Gemini':
      for (let ticker of Object.keys(tickers.Gemini)) {
        if (ticker == token) {
          return tickers.Gemini[ticker].price
        }
      }
      break;
    case 'Gateio':
      for (let ticker of Object.keys(tickers.Gateio)) {
        if (ticker == token) {
          return tickers.Gateio[ticker].price
        }
      }
      break;
    case 'HitBTC':
      for (let ticker of Object.keys(tickers.HitBTC)) {
        if (ticker == token)
          return tickers.HitBTC[ticker].price
      }
      break;

  }
}
function convert_profit(exchange, tickers, token, quantity) {
  switch (exchange) {
    case 'Binance':
      quantity = quantity * tickers.Binance[token + 'USDT'].price
      return quantity;
      break;
    case 'Coinbase':
      quantity = quantity * tickers.Coinbase[token + '-' + 'USDT'].price
      return quantity;
      break;
    case 'Huobi':
      quantity = quantity * tickers.Huobi[token + 'USDT'].price
      return quantity;
      break;
    case 'Kraken':
      quantity = quantity * tickers.Kraken[token + 'USDT'].price
      return quantity;
      break;
    case 'Mexc':
      quantity = quantity * tickers.Mexc[token + 'USDT'].price
      return quantity;
      break;
    case 'Bitmart':
      quantity = quantity * tickers.Bitmart[token + '_' + 'USDT'].price
      return quantity;
      break;
    case 'Kucoin':
      if (token == 'DAI' || token == 'TUSD' || token == 'PAX' || token == 'UST') {
        quantity = quantity * tickers.Kucoin['USDT' + '-' + token].price
      }
      else {
        quantity = quantity * tickers.Kucoin[token + '-' + 'USDT'].price
      }
      return quantity;
      break;
    case 'Gemini':
      if (token != 'USDT') {
        quantity = quantity * tickers.Gemini[token + 'USDT'].price;
      }
      return quantity;
      break;
    case 'Gateio':
      if (token != 'USDT') {
        quantity = quantity * tickers.Gateio[token + 'USDT'].price;
      }
      return quantity;
      break;
    case 'HitBTC':
      quantity = quantity * tickers.HitBTC[token + 'USDT'].price
      return quantity;
      break;
  }
}
function get_compare_price(exchange, data, base, token) {
  if (exchange == 'Binance') {
    return data[exchange][base + token]
  } else if (exchange == 'Huobi') {
    return data[exchange][base + token]
  } else if (exchange == 'Coinbase') {
    return data[exchange][base + token]
  } else if (exchange == 'Kraken') {
    return data[exchange][base + token]
  } else if (exchange == 'Mexc') {
    return data[exchange][base + token]
  } else if (exchange == 'Bitmart') {
    return data[exchange][base + token]
  } else if (exchange == 'Kucoin') {
    return data[exchange][base + '-' + token]
  } else if (exchange == 'Gemini') {
    return data[exchange][base + token]
  } else if (exchange == 'Gateio') {
    return data[exchange][base + token]
  } else if (exchange == 'HitBTC') {
    return data[exchange][base + token]
  }
}
async function tradeFee(t1, amount) {
  let fee;
  if (t1 == 'BitFinex') {
    if (amount >= '0.00' || amount < '10000000.00') {
      fee = 0.200;
    }
    else if (amount >= '10000000.00' || amount < '15000000.00') {
      fee = 0.180;
    }
    else if (amount >= '15000000.00' || amount < '20000000.00') {
      fee = 0.160;
    }
    else if (amount >= '20000000.00' || amount < '25000000.00') {
      fee = 0.150;
    }
    else if (amount >= '25000000.00' || amount < '30000000.00') {
      fee = 0.120;
    }
    else if (amount >= '30000000.00' || amount < '300000000.00') {
      fee = 0.100;
    }
    else if (amount >= '300000000.00' || amount < '1000000000.00') {
      fee = 0.090;
    }
    else if (amount >= '1000000000.00' || amount < '3000000000.00') {
      fee = 0.085;
    }
    else if (amount >= '3000000000.00' || amount < '10000000000.00') {
      fee = 0.075;
    }
    else if (amount >= '10000000000.00' || amount < '30000000000.00') {
      fee = 0.060;
    }
    else if (amount >= '30000000000.00' || amount <= '30000000000.00') {
      fee = 0.055;
    }
  }
  return fee;
}
///////////////////////////////intra function use /////////////////////////////////////////
async function intra_prices(exchanges, tickers, startToken) {
  var data = {};
  for (let exchange of exchanges) {
    switch (exchange) {
      case 'Kucoin':
        data.Kucoin = await kucoinFunction.intraPriceKucoin(tickers[0].Kucoin, startToken);
        break;
      case 'Binance':
        data.Binance = await binanceFunction.intraPriceBinance(tickers[0].Binance, startToken);
        break;
      case 'BitFinex':
        data.BitFinex = await bitFinexFunction.intraPriceBitFinex(tickers[0].BitFinex, startToken);
        break;
      case 'Huobi':
        data.Huobi = await huobiFunction.intraPriceHuobi(tickers[0].Huobi, startToken);
        break;
      case 'Okex':
        data.Okex = await okexFunction.intraPriceOkex(tickers[0].Okex, startToken);
        break;
    }
  }
  return data
}
function filter_tokens(data, start_tokens, exchanges) {
  var intersection;
  let filtered = {}
  for (let [key, value] of Object.entries(data)) {
    switch (key) {
      case "Coinbase": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Coinbase') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection;
          }
        }
        break
      }
      case "Binance": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Binance') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }

        }
        break
      }
      case "Huobi": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Huobi') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }
        }
        break
      }
      case "Kraken": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Kraken') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }
        }
        break
      }
      case "Mexc": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Mexc') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }
        }
        break
      }
      case "Bitmart": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Bitmart') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }
        }
        break
      }
      case "Kucoin": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Kucoin') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection;
          }
        }
        break
      }
      case "Gateio": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'Gateio') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection;
          }
        }
        break
      }
      case "HitBTC": {
        for (let [token, price] of Object.entries(value)) {
          var list = []
          if (exchanges[0] == 'HitBTC') {
            list.push(Object.keys(price))
            filtered[token] = list
          } else {
            let secondary = Object.keys(price)
            intersection = filtered[token][0].filter(element => secondary.includes(element));
            filtered[token] = intersection
          }
        }
        break
      }

    }
  }
  for (let [exchange, value] of Object.entries(data)) {
    switch (exchange) {
      case "Coinbase": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Binance": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Huobi": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Kraken": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Mexc": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Bitmart": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Kucoin": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "Gateio": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }
      case "HitBTC": {
        for (let [coin, price] of Object.entries(value)) {
          var token = filtered[coin]
          for (let [pair, list] of Object.entries(price)) {
            if (!token.includes(pair)) {
              delete price[pair]
            }
          }
        }
        break
      }

    }
  }
  for (let [i, j] of Object.entries(data))
    //console.log(i, j)
    return data
}
async function intra_available(prices, start_tokens, exchanges, capital, tradefee, volume) {
  let filtered = filter_tokens(prices, start_tokens, exchanges);
  var paths = [];
  var profit, profit1, diffProfit, minPrecision;
  for (let [coin, price] of Object.entries(filtered[exchanges[0]])) {
    for (let [quote, value] of Object.entries(price)) {
      var capital1;
      if (exchanges[0] == 'BitFinex' || exchanges[1] == 'BitFinex') {
        capital1 = await intra_quantity('BitFinex', volume[0], coin, quote, capital[coin])
      }
      var price1 = value[0];
      var price2 = filtered[exchanges[1]][coin][quote][0];
      if (exchanges[0] == 'BitFinex') {
        capital1 = await intra_quantity('BitFinex', volume[0], coin, quote, capital[coin])
        var symbol1 = await get_token(exchanges[0], coin, quote);
        var symbol2 = await get_token(exchanges[1], coin, quote);
        var volume1 = (volume[0][exchanges[0]][symbol1].volume).toString();
        var volume2 = volume[0][exchanges[1]][symbol2].volume;
        var tradefee1 = await tradeFee(exchanges[0], capital1);
        var tradefee2 = parseFloat(tradefee[0][exchanges[1]][symbol2].tradefee);
        if (price1 > price2) {
          profit = (capital[coin] * parseFloat(price1));
          profit = (profit - (profit * tradefee1) / 100);
          if (exchanges[1] == 'Binance') {
            minPrecision = tradefee[0][exchanges[1]][symbol2].minPrecision
            profit1 = (capital[coin]).toFixed(minPrecision) * parseFloat(price2);
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          } else {
            profit1 = (capital[coin] * parseFloat(price2));
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          }
          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[1],
              "exchange1_price": price2.toString(),
              "Volume1": volume2,
              "tradefee1": tradefee2.toString(),
              "sell": exchanges[0],
              "exchange2_price": price1.toString(),
              "Volume2": volume1,
              "tradefee2": tradefee1.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj);
          }
        } else {
          profit = (capital[coin] * parseFloat(price2));
          profit = (profit - (profit * tradefee2) / 100);
          if (exchanges[1] == 'Binance') {
            minPrecision = tradefee[0][exchanges[1]][symbol2].minPrecision
            profit1 = (capital[coin]).toFixed(minPrecision) * parseFloat(price2);
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          } else {
            profit1 = (capital[coin] * parseFloat(price2));
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          }
          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[0],
              "exchange1_price": price1.toString(),
              "Volume1": volume1,
              "tradefee1": tradefee1.toString(),
              "sell": exchanges[1],
              "exchange2_price": price2.toString(),
              "Volume2": volume2,
              "tradefee2": tradefee2.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj)
            //console.log(paths)
          }
        }
      }
      else if (exchanges[1] == 'BitFinex') {
        capital1 = await intra_quantity('BitFinex', volume[0], coin, quote, capital[coin])
        var symbol1 = await get_token(exchanges[0], coin, quote);
        var symbol2 = await get_token(exchanges[1], coin, quote);
        var volume1 = volume[0][exchanges[0]][symbol1].volume;
        var volume2 = volume[0][exchanges[1]][symbol2].volume;
        if (tradefee[0][exchanges[0]][symbol1]) {
          var tradefee1 = tradefee[0][exchanges[0]][symbol1].tradefee;
          var tradefee2 = await tradeFee(exchanges[1], capital1);
        }
        if (price1 > price2) {
          profit = (capital[coin] * parseFloat(price1));
          profit = (profit - (profit * tradefee1) / 100);

          profit1 = (capital[coin] * parseFloat(price2));
          profit1 = (profit1 - (profit1 * tradefee2) / 100);
          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[1],
              "exchange1_price": price2.toString(),
              "Volume1": volume2,
              "tradefee1": tradefee2.toString(),
              "sell": exchanges[0],
              "exchange2_price": price1.toString(),
              "Volume2": volume1,
              "tradefee2": tradefee1.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj);
          }
        } else {
          profit = (capital[coin] * parseFloat(price2));
          profit = (profit - (profit * tradefee2) / 100);

          profit1 = (capital[coin] * parseFloat(price1))
          profit1 = (profit1 - (profit1 * tradefee1) / 100);
          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[0],
              "exchange1_price": price1.toString(),
              "Volume1": volume1,
              "tradefee1": tradefee1.toString(),
              "sell": exchanges[1],
              "exchange2_price": price2.toString(),
              "Volume2": volume2,
              "tradefee2": tradefee2.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj)
            //console.log(paths)
          }
        }
      }
      else {
        var symbol1 = await get_token(exchanges[0], coin, quote);
        var symbol2 = await get_token(exchanges[1], coin, quote);
        if (tradefee[0][exchanges[0]][symbol1] && tradefee[0][exchanges[1]][symbol2]) {
          var tradefee1 = tradefee[0][exchanges[0]][symbol1].tradefee;
          var tradefee2 = tradefee[0][exchanges[1]][symbol2].tradefee;
        }
        var volume1 = volume[0][exchanges[0]][symbol1].volume;
        var volume2 = volume[0][exchanges[1]][symbol2].volume;
        if (price1 > price2) {
          profit = (capital[coin] * parseFloat(price1));
          profit = (profit - (profit * tradefee1) / 100);
          if (exchanges[1] == 'Binance') {
            minPrecision = tradefee[0][exchanges[1]][symbol2].minPrecision
            profit1 = (capital[coin]).toFixed(minPrecision) * parseFloat(price2);
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          } else {
            profit1 = (capital[coin] * parseFloat(price2));
            profit1 = (profit1 - (profit1 * tradefee2) / 100);
          }

          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[1],
              "exchange1_price": price2.toString(),
              "Volume1": volume2,
              "tradefee1": tradefee2.toString(),
              "sell": exchanges[0],
              "exchange2_price": price1.toString(),
              "Volume2": volume1,
              "tradefee2": tradefee1.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj);
          }
        } else {
          profit = (capital[coin] * parseFloat(price2));
          profit = (profit - (profit * tradefee2) / 100);
          if (exchanges[0] == 'Binance') {
            minPrecision = tradefee[0][exchanges[0]][symbol1].minPrecision
            profit1 = (capital[coin]).toFixed(minPrecision) * parseFloat(price1);
            profit1 = (profit1 - (profit1 * tradefee1) / 100);
          } else {
            profit1 = (capital[coin] * parseFloat(price1));
            profit1 = (profit1 - (profit1 * tradefee1) / 100);
          }
          profit1 = (capital[coin] * parseFloat(price1))
          profit1 = (profit1 - (profit1 * tradefee1) / 100);
          diffProfit = profit - profit1;
          if (quote != 'USDT') {
            diffProfit = convert_profit(exchanges[0], volume[0], quote, diffProfit);
          }
          if (diffProfit > 0) {
            let obj = {
              "base": coin,
              "pair": quote,
              "buy": exchanges[0],
              "exchange1_price": price1.toString(),
              "Volume1": volume1,
              "tradefee1": tradefee1.toString(),
              "sell": exchanges[1],
              "exchange2_price": price2.toString(),
              "Volume2": volume2,
              "tradefee2": tradefee2.toString(),
              "Profit": diffProfit,
              "capital": capital[coin],
            }
            paths.push(obj)
            //console.log(paths)
          }
        }
      }
    }
  }
  return paths;
}
function intra_quantity(exchanges, tickers, base, pair, quantity) {
  let qty;
  switch (exchanges) {
    case 'BitFinex':
      if (base != 'USD') {
        return qty = quantity * get_price(exchanges, base + 'USD', tickers);
      } else {
        return qty = quantity
      }
      break;
  }
}
/////////////////////////////////inter loop function//////////////////////////////////////////////////////////
function get_quantity_loop(exchange, tickers, start_tokens, quantity) {
  let list = {}
  switch (exchange[0]) {
    case 'Binance':
      for (let token of start_tokens) {
        if (token != 'USDT') {
          list[token] = quantity / tickers.Binance[token + 'USDT'].price;
        } else {
          list[token] = quantity
        }
      }
      return list;
      break;
    case 'Coinbase':
      for (let token of start_tokens) {
        if (token != 'USDT') {
          quantity = quantity / tickers.Coinbase[token + '-' + 'USDT'].price
          list[token] = quantity
        } else {
          list[token] = quantity
        }
      }
      return list;
      break;
    case 'Huobi':
      for (let token of start_tokens) {
        if (token != 'USDT') {
          quantity = quantity / tickers.Huobi[token + 'USDT'].price
          list[token] = quantity
        } else {
          list[token] = quantity
        }
      }
      return list;
      break;
    case 'Kraken':
      for (let token of start_tokens) {
        if (token != 'USDT') {
          quantity = quantity / tickers.Kraken[token + 'USDT'].price
          list[token] = quantity
        } else {
          list[token] = quantity
        }
      }
      return list;
      break;
    case 'Gateio':
      for (let token of start_tokens) {
        if (token != 'USDT') {
          quantity = quantity / tickers.Gateio[token + 'USDT'].price
          list[token] = quantity
        } else {
          list[token] = quantity
        }
      }
      return list;
      break;
  }

}
function getBaseBinance(symbol) {
  if (symbol.endsWith('USDT')) {
    return [symbol.replace("USDT", ""), "USDT"]
  } else if (symbol.endsWith('BTC')) {
    return [symbol.replace("BTC", ""), "BTC"]
  } else if (symbol.endsWith('ETH')) {
    return [symbol.replace("ETH", ""), "ETH"]
  } else {
    return 0
  }
}
function getBaseHuobi(symbol) {
  if (symbol.endsWith('USD')) {
    return [symbol.replace("USDT", ""), "USDT"]
  } else if (symbol.endsWith('BTC')) {
    return [symbol.replace("BTC", ""), "BTC"]
  } else if (symbol.endsWith('ETH')) {
    return [symbol.replace("ETH", ""), "ETH"]
  } else {
    return 0
  }
}
function getBaseKraken(symbol) {
  if (symbol.endsWith('USD')) {
    return [symbol.replace("USDT", ""), "USDT"]
  } else if (symbol.endsWith('BTC')) {
    return [symbol.replace("BTC", ""), "BTC"]
  } else if (symbol.endsWith('ETH')) {
    return [symbol.replace("ETH", ""), "ETH"]
  } else {
    return 0
  }
}
function getBaseGateio(symbol) {
  if (symbol.endsWith('USD')) {
    return [symbol.replace("USDT", ""), "USDT"]
  } else if (symbol.endsWith('BTC')) {
    return [symbol.replace("BTC", ""), "BTC"]
  } else if (symbol.endsWith('ETH')) {
    return [symbol.replace("ETH", ""), "ETH"]
  } else {
    return 0
  }
}
function getCapital(exchange, tickers, coin, amount) {
  let temp;
  switch (exchange) {
    case 'Binance':
      if (tickers[coin + 'USDT']) {
        return amount / tickers[coin + 'USDT'].price;
      } else if (tickers[coin + 'BTC']) {
        temp = amount / tickers['BTCUSDT'].price
        return tickers[coin + 'BTC'].price / temp;
      }
      break;
    case 'Kucoin':
      if (tickers[coin + '-USDT']) {
        return amount / tickers[coin + '-USDT'].price;
      } else if (tickers[coin + '-BTC']) {
        temp = amount / tickers['BTC-USDT'].price
        return tickers[coin + '-BTC'].price / temp;
      }
      break;
    case 'Okex':
      if (tickers[coin + '-USDT']) {
        return amount / tickers[coin + '-USDT'].price;
      } else if (tickers[coin + '-BTC']) {
        temp = amount / tickers['BTC-USDT'].price
        return tickers[coin + '-BTC'].price / temp;
      }
      break;
    case 'BitFinex':
      if (tickers[coin + 'USD']) {
        return amount / tickers[coin + 'USD'].price;
      } else if (tickers[coin + 'BTC']) {
        temp = amount / tickers['BTCUSD'].price
        return tickers[coin + 'BTC'].price / temp;
      }
      break;
    case 'Huobi':
      if (tickers[coin + 'USDT']) {
        return amount / tickers[coin + 'USDT'].price;
      } else if (tickers[coin + 'BTC']) {
        temp = amount / tickers['BTCUSDT'].price
        return tickers[coin + 'BTC'].price / temp;
      }
      break;
  }
}
function getStartToken(symbol, data) {
  switch (data.order0.exchange) {
    case "Binance": {
      return symbol.replace(data.withdraw0.coin, '')
      break;
    }
    case "Huobi": {
      return symbol.replace(data.withdraw0.coin, '')
      break;
    }
    case "Coinbase": {
      symbol = symbol.replace(data.withdraw0.coin, '')
      return symbol.replace('-', '')
      break;
    }
    case "Kraken": {
      return symbol.replace(data.withdraw0.coin, '')
      break;
    }
    case "Gateio": {
      return symbol.replace(data.withdraw0.coin, '')
      break;
    }
  }
}
async function convertProfitPriceForMexc(symbol) {
  var config = {
    method: 'get',
    url: `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`,
    headers: {}
  };
  let mexcTickers = await axios(config)
  if (mexcTickers.status == 200) {
    return mexcTickers.data.lastPrice
  }
}




