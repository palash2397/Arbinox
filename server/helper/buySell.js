// Binance module call
import { walletServices } from '../api/v1/services/wallet';
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate } = walletServices;
const Binance = require('node-binance-us-api');
const Huobi = require('../helper/huobiGlobalAPI');
const { order_details } = require('../helper/direct_orderDetails');
const Coinbase = require("../helper/coinbase-pro/index");
import { Kraken } from "node-kraken-api";
// import logger from "../helper/logger";
const axios = require('axios');
const Mexc = require('node-mexc-api').default;
import crypto from 'crypto';
import { triangularOrderDetails } from "../helper/triangularOrderDetails"
import coinbaseSignature from "./coinbaseSignature";
import gateioSignature from "./gateioSignature";
import commonFunction from "../helper/util"

///////////////////////////////////////////////////////
module.exports = {
  buy: async (exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId, api_memo) => {
    try {
      let result;
      switch (exchange) {
        case 'Binance':
          try {
            price = Number(price).toFixed(8).replace(/\.?0+$/, "");
            let exchangeDetails = await exchangeData({ exchangeName: 'Binance' });
            let basePrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let stepSize = exchangeDetails.tradeFee[symbol].stepSize;
            console.log('basePre ==>', basePrecision, quantity)
            Number.prototype.toFixedNoRounding = function (n) {
              const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
              const a = this.toString().match(reg)[0];
              // console.log(a, a.indexOf("."),296)
              const dot = a.indexOf(".");
              if (dot === -1) { // integer, insert decimal dot and pad up zeros
                return a + "." + "0".repeat(n)
                  ;
              }
              const b = n - (a.length - dot) + 1;
              return b > 0 ? (a + "0".repeat(b)) : a;
            }


            quantity = (quantity).toFixedNoRounding(basePrecision);
            if (basePrecision == 0)
              quantity = quantity.replace(".", "")

            let stepSizeAmount = quantity % stepSize
            if (stepSizeAmount != 0) {
              let amountRes = parseFloat(quantity) - parseFloat(stepSizeAmount).toFixed(basePrecision)
              quantity = amountRes
            } else {
              quantity = parseFloat(quantity)
            }
            quantity = quantity.toFixed(basePrecision)
            let time = await axios({
              method: 'get',
              url: 'https://api4.binance.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            function generate_signature(serverTime) {
              const message = `symbol=${symbol}&side=BUY&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=` + serverTime
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            let sec = generate_signature(serverTime)
            let string = `symbol=${symbol}&side=BUY&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=` + serverTime
            var config = {
              method: 'post',
              url: "https://api4.binance.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': apiKey,
              }
            };
            let result = await axios(config)

            if (result.status == 200) {
              result = result.data
              result['isTradable'] = true;
              return result;
            }
          }
          catch (error) {
            console.log('61 ==>', error.body, new Date().toLocaleString());
            console.log("error======>84", error)
            // logger.error({ exchange: exchange, activity: 'BUY', error: error })
            // if (error.code != 'EAI_AGAIN' || error.response.data.code != -1021 || error.response.data.code != -1007 || error.response.data.code != -1016) {
            //   return { isTradable: false };
            // }
            const nonTradableCodes = ['EAI_AGAIN', -1000, -1001, -1003, -1004, -1006, -1007, -1008, -1015, -1016, -1021, -1020, -2013, -2016, -2026, -3004, -3044, -3045];
            if (error.code && !nonTradableCodes.includes(error.code) || error.response && error.response.data.code && !nonTradableCodes.includes(error.response.data.code)) {
              return { isTradable: false };
            }
          }
          break;
        case 'Coinbase':
          try {
            let exchangeDetails = (await exchangeData({ exchangeName: 'Coinbase' }))['_doc']['tradeFee'];
            let basePrecision = exchangeDetails[symbol].basePrecision;
            let pricePrecision = exchangeDetails[symbol].quotePrecision;
            const decimalPart = basePrecision.toString().split('.')[1];
            basePrecision = decimalPart ? decimalPart.length : 0;
            const decimalPart1 = pricePrecision.toString().split('.')[1];
            pricePrecision = decimalPart1 ? decimalPart1.length : 0;
            quantity = toFixedNoRounding(basePrecision, quantity)
            price = toFixedNoRounding(pricePrecision, price)
            const timestamp = Math.floor(Date.now() / 1000);
            const orderBody = {
              product_id: tradingPair,
              side: "BUY",
              order_configuration: {
                limit_limit_gtc: {
                  base_size: quantity,
                  limit_price: price
                }
              },
              client_order_id: "order_id" + timestamp,
            };
            let data = JSON.stringify(orderBody)
            let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/api/v3/brokerage/orders`)
            var config = {
              method: 'post',
              url: `https://api.coinbase.com/api/v3/brokerage/orders`,
              headers: {
                'Authorization': `Bearer ${token}`,
                'CB-VERSION': '2024-07-06'
              },
              data: data
            };
            let orderDetails = await axios(config)
            if (orderDetails.status == 200) {
              console.log("coinbase buy 126 ==>", orderDetails)
              if (orderDetails.data.success == true) {
                orderDetails = orderDetails.data.success_response
                orderDetails['isTradable'] = true;
                return orderDetails;
              } else if (orderDetails.data.success == false) {
                return { isTradable: false };
              }
            }
          }
          catch (error) {
            console.log('202 ==>', error, new Date().toLocaleString())
            if (error.connect == true) {
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Huobi':
          {
            try {
              let exchangeDetails = (await exchangeData({ exchangeName: 'Huobi' }))['_doc']['tradeFee'];
              let basePrecision = exchangeDetails[symbol].minPrecision;
              quantity = parseFloat(quantity);
              Number.prototype.toFixedNoRounding = function (n) {
                const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
                const a = this.toString().match(reg)[0];
                const dot = a.indexOf(".");
                if (dot === -1) { // integer, insert decimal dot and pad up zeros
                  return a + "." + "0".repeat(n);
                }
                const b = n - (a.length - dot) + 1;
                return b > 0 ? (a + "0".repeat(b)) : a;
              }
              quantity = quantity.toFixedNoRounding(basePrecision);
              let params = {
                "account-id": customerId,
                "amount": quantity,
                "price": price,
                "source": "spot-api",
                "symbol": symbol.toLowerCase(),
                "type": "buy-limit"
              }
              console.log("params=====>>>149", params);
              var resultdata = await Huobi.createOrder(params, apiKey, secretKey);
              console.log("183-->", resultdata);
              var data = {
                orderid: resultdata,
                isTradable: true
              }
              return data;
            }
            catch (error) {
              console.log(error);
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Kraken':
          {
            try {
              let options = {
                key: apiKey,
                secret: secretKey,
                gennonce: () => new Date().getTime() * 1000,
                timeoutMs: 1000
              }
              const krakenClient = new Kraken(options);
              let exchangeDetails = (await exchangeData({ exchangeName: 'Kraken' }))['_doc']['tradeFee'];
              let basePrecision = exchangeDetails[symbol].basePrecision;//
              let pricePrecision = exchangeDetails[symbol].pricePrecision;//
              quantity = toFixedNoRounding(basePrecision, quantity);
              const params = {
                pair: tradingPair,
                type: "buy",
                ordertype: 'limit',
                price: toFixedNoRounding(pricePrecision, price),
                volume: quantity
              }
              console.log("kraken params", params)
              return await krakenClient.addOrder(params).then((response) => {
                console.log("kraken buy  -==>", response, 210)
                response['isTradable'] = true;
                return response;
              });
            }
            catch (error) {
              console.log('231 ==>', `${error}`, new Date().toLocaleString());
              if (error.code != "EAI_AGAIN") {
                return { isTradable: false, error: error.msg };
              }
            }
          }
          break;
        case 'Mexc':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Mexc' });
            let basePrecision = exchangeDetails.tradeFee[symbol].minPrecision;
            // quantity = Number(quantity).toFixed(Number(basePrecision))
            let time = await axios({
              method: 'get',
              url: 'https://api.mexc.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            let string = `symbol=${symbol}&side=BUY&type=LIMIT&quantity=${quantity}&price=${price}&timestamp=` + serverTime;
            function generate_signature(string) {
              return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
            }
            let sec = generate_signature(string)
            var config = {
              method: 'post',
              url: "https://api.mexc.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'X-MEXC-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              console.log("=========================>170", result.data)
              result.data['isTradable'] = true;
              return result.data
            }
          } catch (error) {
            console.log('Mexc buy error ==>', error);
            return { isTradable: false };
          }
          break;
        case 'Bitmart':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Bitmart' });
            let newPair = tradingPair.split("_")
            let basePrecision = exchangeDetails.tradeFee[symbol].maxPrecision;
            if (basePrecision > 0) {
              quantity = toFixedNoRounding(basePrecision, quantity)
              // quantity = Number(quantity).toFixed(Number(basePrecision))
            }
            function get_timestamp() {
              return new Date().getTime().toString();
            }
            function generate_signature(timestamp, body) {
              const message = `${timestamp}#${api_memo}#${body}`;
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            async function place_order() {
              const path = 'https://api-cloud.bitmart.com/spot/v2/submit_order';
              const timestamp = get_timestamp();
              const body = {
                size: quantity,
                price: price,
                side: 'buy',
                symbol: tradingPair,
                type: 'limit',
              };
              const headers = {
                'Content-Type': 'application/json',
                'X-BM-KEY': apiKey,
                'X-BM-TIMESTAMP': timestamp,
                'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
              };
              try {
                const response = await axios.post(path, body, { headers });
                return response
              } catch (error) {
                console.error(`Error: buy`, error);
              }
            }

            let result = await place_order();
            if (result.status == 200) {
              result.data.data['isTradable'] = true;
              return result.data.data
            }
          } catch (error) {
            console.log("Bitmart buy error ==>", error)
            // logger.error({ exchange: exchange, activity: 'BUY', error: error })
            return { isTradable: false };
          }
          break;
        case 'Gateio':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Gateio' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let orderId = await commonFunction.generateOrder()
            const host = "https://api.gateio.ws";
            const prefix = "/api/v4";
            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
            const url = '/spot/orders';
            const body = {
              text: 't-' + orderId,
              currency_pair: tradingPair,
              type: "limit",
              account: "spot",
              side: "buy",
              amount: quantity,
              price: price,
              time_in_force: "gtc",
              iceberg: "0"
            };
            const requestContent = JSON.stringify(body);
            const signature = await gateioSignature.signatureGenerate("POST", prefix + url, '', requestContent, apiKey, secretKey)
            const headers = { ...commonHeaders, ...signature };
            const responce = await axios.post(host + prefix + url, requestContent, { headers });
            if (responce.status == 201) {
              let data = responce.data
              data['isTradable'] = true;
              return data
            }

          } catch (error) {
            console.log("gateio buy error====> ", error)
            return { isTradable: false };
          }
          break;
        case 'HitBTC':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'HitBTC' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
            var data = qs.stringify({
              symbol: symbol,
              side: 'buy',
              quantity: quantity,
              price: price,
              time_in_force: "GTC",
              type: "limit"
            });
            var config = {
              method: 'post',
              url: 'https://api.hitbtc.com/api/3/spot/order',
              headers: {
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              data: data
            };
            let responce = await axios(config)
            if (responce.status == 200) {
              let result = responce.data
              console.log("=sfhsdfshjffsh456578686365437653465346537563565657678565346535", result)
              result['isTradable'] = true;
              return result
            }
          } catch (error) {
            console.log("Hitbtc buy error====> ", error.response.data)
            return { isTradable: false };
          }
          break;
      }
    } catch (error) {
      console.log('268==>', error, new Date().toLocaleString())
      return { isTradable: false };
    }
  },
  buy_for_market: async (exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId, api_memo, exchangeDetails, serverTimes) => {
    try {
      switch (exchange) {
        case 'Binance':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Binance' });
            price = Number(price).toFixed(8).replace(/\.?0+$/, "");
            let basePrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            Number.prototype.toFixedNoRounding = function (n) {
              const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
              const a = this.toString().match(reg)[0];
              const dot = a.indexOf(".");
              if (dot === -1) { // integer, insert decimal dot and pad up zeros
                return a + "." + "0".repeat(n)
                  ;
              }
              const b = n - (a.length - dot) + 1;
              return b > 0 ? (a + "0".repeat(b)) : a;
            }
            quantity = (quantity).toFixedNoRounding(basePrecision);
            const serverTime = new Date().getTime()
            function generate_signature(serverTime) {
              const message = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${quantity}&timestamp=` + serverTime
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            let sec = generate_signature(serverTime)
            const string = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${quantity}&timestamp=` + serverTime
            var config = {
              method: 'post',
              url: "https://api4.binance.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': apiKey,
              }
            };
            let result = await axios(config)

            if (result.status == 200) {
              result = result.data
              result['isTradable'] = true;
              return result;
            }
          }
          catch (error) {
            console.log('61 ==>', error.body, new Date().toLocaleString());
            console.log("error======>84", error)
            // logger.error({ exchange: exchange, activity: 'BUY', error: error })
            const nonTradableCodes = ['EAI_AGAIN', -1000, -1001, -1003, -1004, -1006, -1007, -1008, -1015, -1016, -1021, -1020, -2013, -2016, -2026, -3004, -3044, -3045];
            if (error.code && !nonTradableCodes.includes(error.code) || error.response && error.response.data.code && !nonTradableCodes.includes(error.response.data.code)) {
              return { isTradable: false };
            }
          }
          break;
        case 'Mexc':
          try {
            // let exchangeDetails = await exchangeData({ exchangeName: 'Mexc' });
            // let basePrecision = exchangeDetails.tradeFee[symbol].minPrecision;
            let time = await axios({
              method: 'get',
              url: 'https://api.mexc.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            let string = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${quantity}&timestamp=` + serverTime;
            function generate_signature(string) {
              return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
            }
            let sec = generate_signature(string)
            var config = {
              method: 'post',
              url: "https://api.mexc.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'X-MEXC-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              console.log("=========================>170", result.data)
              result.data['isTradable'] = true;
              return result.data
            }
          } catch (error) {
            console.log('Mexc buy error ==>', error);
            return { isTradable: false };
          }
          break;
        case 'Kraken':
          {
            try {
              let options = {
                key: apiKey,
                secret: secretKey,
                gennonce: () => new Date().getTime() * 1000,
                timeoutMs: 1000
              }
              const krakenClient = new Kraken(options);
              let exchangeDetails = (await exchangeData({ exchangeName: 'Kraken' }))['_doc']['tradeFee'];
              let quotePrecision = exchangeDetails[symbol].quotePrecision;//
              quantity = toFixedNoRounding(quotePrecision, quantity);
              const params = {
                pair: tradingPair,
                type: "buy",
                ordertype: 'market',
                // price: toFixedNoRounding(quotePrecision, price),
                volume: quantity
              }
              console.log("kraken params", params)
              return await krakenClient.addOrder(params).then((response) => {
                console.log("kraken buy  -==>", response, 210)
                response['isTradable'] = true;
                return response;
              });
            }
            catch (error) {
              console.log('231 ==>', `${error}`, new Date().toLocaleString());
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Coinbase':
          try {
            let exchangeDetails = (await exchangeData({ exchangeName: 'Coinbase' }))['_doc']['tradeFee'];
            let basePrecision = exchangeDetails[symbol].basePrecision;
            let pricePrecision = exchangeDetails[symbol].quotePrecision;
            const decimalPart = basePrecision.toString().split('.')[1];
            basePrecision = decimalPart ? decimalPart.length : 0;
            const decimalPart1 = pricePrecision.toString().split('.')[1];
            pricePrecision = decimalPart1 ? decimalPart1.length : 0;
            quantity = toFixedNoRounding(basePrecision, quantity)
            price = toFixedNoRounding(pricePrecision, price)
            const timestamp = Math.floor(Date.now() / 1000);
            const orderBody = {
              product_id: tradingPair,
              side: "BUY",
              order_configuration: {
                market_market_ioc: {
                  quote_size: quantity,
                }
              },
              client_order_id: "order_id" + timestamp,
            };
            let data = JSON.stringify(orderBody)
            let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/api/v3/brokerage/orders`)
            var config = {
              method: 'post',
              url: `https://api.coinbase.com/api/v3/brokerage/orders`,
              headers: {
                'Authorization': `Bearer ${token}`,
                'CB-VERSION': '2024-07-06'
              },
              data: data
            };
            let orderDetails = await axios(config)
            if (orderDetails.status == 200) {
              console.log("coinbase buy 126 ==>", orderDetails)
              if (orderDetails.data.success == true) {
                orderDetails = orderDetails.data.success_response
                orderDetails['isTradable'] = true;
                return orderDetails;
              } else if (orderDetails.data.success == false) {
                return { isTradable: false };
              }
            }
          }
          catch (error) {
            console.log('451 ==>', error, new Date().toLocaleString())
            if (error.connect == true) {
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Gateio':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Gateio' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let orderId = await commonFunction.generateOrder()
            const host = "https://api.gateio.ws";
            const prefix = "/api/v4";
            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
            const url = '/spot/orders';
            const body = {
              text: 't-' + orderId,
              currency_pair: tradingPair,
              type: "market",
              account: "spot",
              side: "buy",
              amount: quantity,
              time_in_force: "fok",
              iceberg: "0"
            };
            const requestContent = JSON.stringify(body);
            const signature = await gateioSignature.signatureGenerate("POST", prefix + url, '', requestContent, apiKey, secretKey)
            const headers = { ...commonHeaders, ...signature };
            const responce = await axios.post(host + prefix + url, requestContent, { headers });
            if (responce.status == 201) {
              let data = responce.data
              data['isTradable'] = true;
              return data
            }

          } catch (error) {
            console.log("gateio buy error527====> ", error)
            return { isTradable: false };
          }
          break;
        case 'Bitmart':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Bitmart' });
            let newPair = tradingPair.split("_")
            let basePrecision = exchangeDetails.tradeFee[symbol].maxPrecision;
            if (basePrecision > 0) {
              quantity = toFixedNoRounding(basePrecision, quantity)
              // quantity = Number(quantity).toFixed(Number(basePrecision))
            }
            function get_timestamp() {
              return new Date().getTime().toString();
            }
            function generate_signature(timestamp, body) {
              const message = `${timestamp}#${api_memo}#${body}`;
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            async function place_order() {
              const path = 'https://api-cloud.bitmart.com/spot/v2/submit_order';
              const timestamp = get_timestamp();
              const body = {
                notional: quantity,
                side: 'buy',
                symbol: tradingPair,
                type: 'market',
              };
              const headers = {
                'Content-Type': 'application/json',
                'X-BM-KEY': apiKey,
                'X-BM-TIMESTAMP': timestamp,
                'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
              };
              try {
                const response = await axios.post(path, body, { headers });
                return response
              } catch (error) {
                console.error(`Error: buy`, error);
              }
            }

            let result = await place_order();
            if (result.status == 200) {
              result.data.data['isTradable'] = true;
              return result.data.data
            }
          } catch (error) {
            console.log("Bitmart market buy error ==>", error)
            // logger.error({ exchange: exchange, activity: 'BUY', error: error })
            return { isTradable: false };
          }
          break;
        case 'HitBTC':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'HitBTC' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
            var data = qs.stringify({
              symbol: symbol,
              side: 'buy',
              quantity: quantity,
              // price: price,
              // time_in_force: "GTC",
              type: "market"
            });
            var config = {
              method: 'post',
              url: 'https://api.hitbtc.com/api/3/spot/order',
              headers: {
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              data: data
            };
            let responce = await axios(config)
            console.log("=market hitbtc", responce)
            if (responce.status == 200) {
              let result = responce.data
              console.log("=s5hdfhgjfhjg hitbtc market", result)
              result['isTradable'] = true;
              return result
            }
          } catch (error) {
            console.log("Hitbtc buy error 562====> ", error.response.data)
            return { isTradable: false };
          }
          break;
      }
    } catch (error) {
      console.log('459==>', error, new Date().toLocaleString())
      if (error.code != 'EAI_AGAIN') {
        return { isTradable: false };
      }
    }
  },
  sell: async (exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId, api_memo) => {
    try {
      // console.log("Sell ==>", exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId)
      switch (exchange) {
        case 'Binance':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Binance' });
            let basePrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let pricePrecision = exchangeDetails.tradeFee[symbol].pricePrecision;
            if (pricePrecision == 0) {
              pricePrecision = 8
            }
            price = Number(price).toFixed(pricePrecision).replace(/\.?0+$/, "");
            let stepSize = exchangeDetails.tradeFee[symbol].stepSize;
            // quantity = parseFloat(quantity).toFixed(basePrecision).toString();
            Number.prototype.toFixedNoRounding = function (n) {
              const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
              const a = this.toString().match(reg)[0];
              // console.log(a, a.indexOf("."),296)
              const dot = a.indexOf(".");
              if (dot === -1) { // integer, insert decimal dot and pad up zeros
                return a + "." + "0".repeat(n)
                  ;
              }
              const b = n - (a.length - dot) + 1;
              return b > 0 ? (a + "0".repeat(b)) : a;
            }


            // quantity = (quantity).toFixedNoRounding(basePrecision);
            if (basePrecision == 0)
              quantity = quantity.replace(".", "")

            let stepSizeAmount = quantity % stepSize
            if (stepSizeAmount != 0) {
              let amountRes = parseFloat(quantity) - parseFloat(stepSizeAmount).toFixed(basePrecision)
              quantity = amountRes
            }
            quantity = quantity.toFixed(basePrecision)
            let time = await axios({
              method: 'get',
              url: 'https://api4.binance.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            function generate_signature(serverTime) {
              const message = `symbol=${symbol}&side=SELL&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=` + serverTime
              // const message = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=` + serverTime
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            let sec = generate_signature(serverTime)
            // const string = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=` + serverTime
            let string = `symbol=${symbol}&side=SELL&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=` + serverTime
            var config = {
              method: 'post',
              url: "https://api4.binance.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              result = result.data
              result['isTradable'] = true;
              return result;
            }
          }
          catch (error) {
            console.log('325 ==>', error, new Date().toLocaleString());
            // logger.error({ exchange: exchange, activity: 'SELL', error: error })
            if (error.code != 'EAI_AGAIN' || error.response.data.code != -1021 || error.response.data.code != -1007 || error.response.data.code != -1016) {
              return { isTradable: false };
            }
          }
          break;
        case 'Coinbase':
          try {
            let exchangeDetails = (await exchangeData({ exchangeName: 'Coinbase' }))['_doc']['tradeFee'];
            let basePrecision = exchangeDetails[symbol].basePrecision;
            let pricePrecision = exchangeDetails[symbol].quotePrecision;
            const decimalPart = basePrecision.toString().split('.')[1];
            basePrecision = decimalPart ? decimalPart.length : 0;
            const decimalPart1 = pricePrecision.toString().split('.')[1];
            pricePrecision = decimalPart1 ? decimalPart1.length : 0;
            quantity = toFixedNoRounding(basePrecision, quantity)
            price = toFixedNoRounding(pricePrecision, price)
            const timestamp = Math.floor(Date.now() / 1000);
            const orderBody = {
              product_id: tradingPair,
              side: "SELL",
              order_configuration: {
                limit_limit_gtc: {
                  base_size: quantity,
                  limit_price: price
                }
              },
              client_order_id: "order_id" + timestamp,
            };
            let data = JSON.stringify(orderBody)
            let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/api/v3/brokerage/orders`)
            var config = {
              method: 'post',
              url: `https://api.coinbase.com/api/v3/brokerage/orders`,
              headers: {
                'Authorization': `Bearer ${token}`,
                'CB-VERSION': '2024-07-06'
              },
              data: data
            };
            let orderDetails = await axios(config)
            if (orderDetails.status == 200) {
              console.log("coinbase sell 437 ==>", orderDetails)
              if (orderDetails.data.success == true) {
                orderDetails = orderDetails.data.success_response
                orderDetails['isTradable'] = true;
                return orderDetails;
              } else if (orderDetails.data.success == false) {
                return { isTradable: false };
              }
            }
          }
          catch (error) {
            console.log('202 ==>sell error ', error, new Date().toLocaleString())
            if (error.connect == true) {
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Huobi':
          {
            try {
              let exchangeDetails = (await exchangeData({ exchangeName: 'Huobi' }))['_doc']['tradeFee'];
              let basePrecision = exchangeDetails[symbol].minPrecision;
              quantity = parseFloat(quantity);
              // console.log(quantity,553)
              Number.prototype.toFixedNoRounding = function (n) {
                const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
                const a = this.toString().match(reg)[0];
                const dot = a.indexOf(".");
                if (dot === -1) { // integer, insert decimal dot and pad up zeros
                  return a + "." + "0".repeat(n);
                }
                const b = n - (a.length - dot) + 1;
                return b > 0 ? (a + "0".repeat(b)) : a;
              }
              quantity = quantity.toFixedNoRounding(basePrecision)
              // console.log(quantity,556)

              let params = {
                "account-id": customerId,
                "amount": quantity,
                "price": price.toString(),
                "source": "spot-api",
                "symbol": symbol.toLowerCase(),
                "type": "sell-limit"
              }
              // console.log(params)
              var resultdata = await Huobi.createOrder(params, apiKey, secretKey);
              var data = {
                orderid: resultdata,
                isTradable: true
              }
              return data;
            }
            catch (error) {
              console.log("579==>", error);
              return { isTradable: false };
            }
          }
          break;
        case 'Kraken':
          {
            try {
              let options = {
                key: apiKey,
                secret: secretKey,
                gennonce: () => new Date().getTime() * 1000,
                timeoutMs: 1000
              }
              const krakenClient = new Kraken(options);
              let exchangeDetails = (await exchangeData({ exchangeName: 'Kraken' }))['_doc']['tradeFee'];
              // console.log(exchangeDetails);
              let quotePrecision = exchangeDetails[symbol].quotePrecision;
              let pricePrecision = exchangeDetails[symbol].pricePrecision;
              quantity = toFixedNoRounding(quotePrecision, quantity);
              price = toFixedNoRounding(pricePrecision, price)
              const params = { pair: tradingPair, type: "sell", ordertype: 'limit', price: price, volume: quantity }
              console.log("kraken params-->", params)
              return await krakenClient.addOrder(params).then((response) => {
                console.log("kraken sell  -==>", response, 210)
                response['isTradable'] = true;
                return response;
              });
            }
            catch (error) {
              console.log('391 ==>', `${error}`, new Date().toLocaleString());
              console.log("=hdsjfhsdjhfjsdhfjshdjfsdjfsdfsjfhjsdfjsdhfjsd", error.code, error.body.error[0] != "EGeneral:Invalid arguments:volume")
              if (error.code != "EAI_AGAIN" || error.body.error[0] != "EGeneral:Invalid arguments:volume") {
                return { isTradable: false, error: error.msg };
              }
            }
          }
          break;
        case 'Mexc':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Mexc' });
            let basePrecision = exchangeDetails.tradeFee[symbol].minPrecision;
            // quantity = Number(quantity).toFixed(Number(basePrecision))
            let time = await axios({
              method: 'get',
              url: 'https://api.mexc.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            let string = `symbol=${symbol}&side=SELL&type=LIMIT&quantity=${quantity}&price=${price}&timestamp=` + serverTime;
            function generate_signature(string) {
              return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
            }
            let sec = generate_signature(string)
            var config = {
              method: 'post',
              url: "https://api.mexc.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'X-MEXC-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              console.log("=========================>316", result.data)
              result.data['isTradable'] = true;
              return result.data
            }
          } catch (error) {
            console.log('Mexc sell error ==>', error);
            return { isTradable: false };
          }
          break;
        case 'Bitmart':
          try {
            // let exchangeDetails = await exchangeData({ exchangeName: 'Bitmart' });
            // let newPair = tradingPair.split("_")
            // let basePrecision = exchangeDetails.tradeFee[symbol].maxPrecision;
            // if (basePrecision > 0) {
            // quantity = toFixedNoRounding(basePrecision, quantity)
            // quantity = Number(quantity).toFixed(Number(basePrecision))
            // }
            function get_timestamp() {
              return new Date().getTime().toString();
            }
            function generate_signature(timestamp, body) {
              const message = `${timestamp}#${api_memo}#${body}`;
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            async function place_order() {
              const path = 'https://api-cloud.bitmart.com/spot/v2/submit_order';
              const timestamp = get_timestamp();
              const body = {
                size: quantity,
                price: price,
                side: 'sell',
                symbol: tradingPair,
                type: 'limit',
              };
              const headers = {
                'Content-Type': 'application/json',
                'X-BM-KEY': apiKey,
                'X-BM-TIMESTAMP': timestamp,
                'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
              };
              try {
                const response = await axios.post(path, body, { headers });
                return response
              } catch (error) {
                console.error(`Error: sell`, error);
              }
            }

            let result = await place_order();
            if (result.status == 200) {
              result.data.data['isTradable'] = true;
              return result.data.data
            }

          } catch (error) {
            console.log("Bitmart sell error ==>", error)
            // logger.error({ exchange: exchange, activity: 'SELL', error: error })
            // return { isTradable: false };
          }
          break;
        case 'Gateio':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Gateio' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let orderId = await commonFunction.generateOrder()
            const host = "https://api.gateio.ws";
            const prefix = "/api/v4";
            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
            const url = '/spot/orders';
            const body = {
              text: 't-' + orderId,
              currency_pair: tradingPair,
              type: "limit",
              account: "spot",
              side: "sell",
              amount: quantity,
              price: price,
              time_in_force: "gtc",
              iceberg: "0"
            };
            const requestContent = JSON.stringify(body);
            const signature = await gateioSignature.signatureGenerate("POST", prefix + url, '', requestContent, apiKey, secretKey)
            const headers = { ...commonHeaders, ...signature };
            const responce = await axios.post(host + prefix + url, requestContent, { headers });
            if (responce.status == 201) {
              let data = responce.data
              data['isTradable'] = true;
              return data
            }
          } catch (error) {
            console.log("gateio sell error====> ", error)
            return { isTradable: false };
          }
          break;
        case 'HitBTC':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'HitBTC' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
            var data = qs.stringify({
              symbol: symbol,
              side: 'sell',
              quantity: quantity,
              price: price,
              time_in_force: "GTC",
              type: "limit"
            });
            var config = {
              method: 'post',
              url: 'https://api.hitbtc.com/api/3/spot/order',
              headers: {
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              data: data
            };
            let responce = await axios(config)
            if (responce.status == 200) {
              let result = responce.data
              console.log("=5464787845454454545454545454545dfgdgdgdfgdf4gdf5g", result)
              result['isTradable'] = true;
              return result
            }
          } catch (error) {
            console.log("Hitbtc sell error====> ", error.response.data)
            return { isTradable: false };
          }
          break;
      }
    } catch (error) {
      console.log('556==>', error, new Date().toLocaleString());
      // return { isTradable: false }
    }
  },
  sell_for_market: async (exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId, api_memo, exchangeDetails, serverTimes) => {
    try {
      console.log("Sell ==>", exchange, symbol, tradingPair, price, quantity, apiKey, secretKey, passPhrase, customerId)
      switch (exchange) {
        case 'Binance':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Binance' });
            let basePrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let stepSize = exchangeDetails.tradeFee[symbol].stepSize;
            Number.prototype.toFixedNoRounding = function (n) {
              const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
              const a = this.toString().match(reg)[0];
              const dot = a.indexOf(".");
              if (dot === -1) { // integer, insert decimal dot and pad up zeros
                return a + "." + "0".repeat(n)
                  ;
              }
              const b = n - (a.length - dot) + 1;
              return b > 0 ? (a + "0".repeat(b)) : a;
            }
            quantity = (quantity).toFixedNoRounding(basePrecision);
            if (basePrecision == 0)
              quantity = quantity.replace(".", "")

            let stepSizeAmount = quantity % stepSize
            if (stepSizeAmount != 0) {
              let amountRes = parseFloat(quantity) - parseFloat(stepSizeAmount).toFixed(basePrecision)
              quantity = amountRes
            }
            quantity = quantity.toFixed(basePrecision)
            const serverTime = new Date().getTime()
            function generate_signature(serverTime) {
              const message = `symbol=${symbol}&side=SELL&type=MARKET&quantity=${quantity}&timestamp=` + serverTime
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            let sec = generate_signature(serverTime)
            const string = `symbol=${symbol}&side=SELL&type=MARKET&quantity=${quantity}&timestamp=` + serverTime
            var config = {
              method: 'post',
              url: "https://api4.binance.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              result = result.data
              result['isTradable'] = true;
              return result;
            }
          }
          catch (error) {
            console.log('325 ==>', error, new Date().toLocaleString());
            // logger.error({ exchange: exchange, activity: 'SELL', error: error })
            const nonTradableCodes = ['EAI_AGAIN', -1000, -1001, -1003, -1004, -1006, -1007, -1008, -1015, -1016, -1021, -1020, -2013, -2016, -2026, -3004, -3044, -3045];
            if (error.code && !nonTradableCodes.includes(error.code) || error.response && error.response.data.code && !nonTradableCodes.includes(error.response.data.code)) {
              return { isTradable: false };
            }
          }
          break;
        case 'Mexc':
          try {
            // let exchangeDetails = await exchangeData({ exchangeName: 'Mexc' });
            // let basePrecision = exchangeDetails.tradeFee[symbol].minPrecision;
            // quantity = Number(quantity).toFixed(Number(basePrecision))
            let time = await axios({
              method: 'get',
              url: 'https://api.mexc.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            let string = `symbol=${symbol}&side=SELL&type=MARKET&quantity=${quantity}&timestamp=` + serverTime;
            function generate_signature(string) {
              return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
            }
            let sec = generate_signature(string)
            var config = {
              method: 'post',
              url: "https://api.mexc.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'X-MEXC-APIKEY': apiKey,
              }
            };
            let result = await axios(config)
            if (result.status == 200) {
              console.log("=========================>316", result.data)
              result.data['isTradable'] = true;
              return result.data
            }
          } catch (error) {
            console.log('Mexc sell error ==>', error);
            return { isTradable: false };
          }
          break;
        case 'Kraken':
          {
            try {
              let options = {
                key: apiKey,
                secret: secretKey,
                gennonce: () => new Date().getTime() * 1000,
                timeoutMs: 1000
              }
              const krakenClient = new Kraken(options);
              let exchangeDetails = (await exchangeData({ exchangeName: 'Kraken' }))['_doc']['tradeFee'];
              // console.log(exchangeDetails);
              let quotePrecision = exchangeDetails[symbol].quotePrecision;
              quantity = toFixedNoRounding(quotePrecision, quantity);
              price = toFixedNoRounding(quotePrecision, price)
              const params = { pair: tradingPair, type: "sell", ordertype: 'market', volume: quantity }
              console.log("kraken params-->", params)
              return await krakenClient.addOrder(params).then((response) => {
                console.log("kraken sell  -==>", response, 210)
                response['isTradable'] = true;
                return response;
              });
            }
            catch (error) {
              console.log('391 ==>', `${error}`, new Date().toLocaleString());
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Coinbase':
          try {
            let exchangeDetails = (await exchangeData({ exchangeName: 'Coinbase' }))['_doc']['tradeFee'];
            let basePrecision = exchangeDetails[symbol].basePrecision;
            let pricePrecision = exchangeDetails[symbol].quotePrecision;
            const decimalPart = basePrecision.toString().split('.')[1];
            basePrecision = decimalPart ? decimalPart.length : 0;
            const decimalPart1 = pricePrecision.toString().split('.')[1];
            pricePrecision = decimalPart1 ? decimalPart1.length : 0;
            quantity = toFixedNoRounding(basePrecision, quantity)
            price = toFixedNoRounding(pricePrecision, price)
            const timestamp = Math.floor(Date.now() / 1000);
            const orderBody = {
              product_id: tradingPair,
              side: "SELL",
              order_configuration: {
                market_market_ioc: {
                  base_size: quantity,
                }
              },
              client_order_id: "order_id" + timestamp,
            };
            let data = JSON.stringify(orderBody)
            let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/api/v3/brokerage/orders`)
            var config = {
              method: 'post',
              url: `https://api.coinbase.com/api/v3/brokerage/orders`,
              headers: {
                'Authorization': `Bearer ${token}`,
                'CB-VERSION': '2024-07-06'
              },
              data: data
            };
            let orderDetails = await axios(config)
            if (orderDetails.status == 200) {
              console.log("coinbase sell 437 ==>", orderDetails)
              if (orderDetails.data.success == true) {
                orderDetails = orderDetails.data.success_response
                orderDetails['isTradable'] = true;
                return orderDetails;
              } else if (orderDetails.data.success == false) {
                return { isTradable: false };
              }
            }
          } catch (error) {
            console.log('202 ==>sell error ', error, new Date().toLocaleString())
            if (error.connect == true) {
              return { isTradable: false, error: error.msg };
            }
          }
          break;
        case 'Gateio':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'Gateio' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            let orderId = await commonFunction.generateOrder()
            const host = "https://api.gateio.ws";
            const prefix = "/api/v4";
            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
            const url = '/spot/orders';
            const body = {
              text: 't-' + orderId,
              currency_pair: tradingPair,
              type: "market",
              account: "spot",
              side: "sell",
              amount: quantity,
              time_in_force: "fok",
              iceberg: "0"
            };
            const requestContent = JSON.stringify(body);
            const signature = await gateioSignature.signatureGenerate("POST", prefix + url, '', requestContent, apiKey, secretKey)
            const headers = { ...commonHeaders, ...signature };
            const responce = await axios.post(host + prefix + url, requestContent, { headers });
            if (responce.status == 201) {
              let data = responce.data
              data['isTradable'] = true;
              return data
            }
          } catch (error) {
            console.log("gateio sell error1046====> ", error)
            return { isTradable: false };
          }
          break;
        case 'Bitmart':
          try {
            // let exchangeDetails = await exchangeData({ exchangeName: 'Bitmart' });
            // let newPair = tradingPair.split("_")
            // let basePrecision = exchangeDetails.tradeFee[symbol].maxPrecision;
            // if (basePrecision > 0) {
            // quantity = toFixedNoRounding(basePrecision, quantity)
            // quantity = Number(quantity).toFixed(Number(basePrecision))
            // }
            function get_timestamp() {
              return new Date().getTime().toString();
            }
            function generate_signature(timestamp, body) {
              const message = `${timestamp}#${api_memo}#${body}`;
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            async function place_order() {
              const path = 'https://api-cloud.bitmart.com/spot/v2/submit_order';
              const timestamp = get_timestamp();
              const body = {
                size: quantity,
                side: 'sell',
                symbol: tradingPair,
                type: 'market',
              };
              const headers = {
                'Content-Type': 'application/json',
                'X-BM-KEY': apiKey,
                'X-BM-TIMESTAMP': timestamp,
                'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
              };
              try {
                const response = await axios.post(path, body, { headers });
                return response
              } catch (error) {
                console.error(`Error: sell`, error);
              }
            }

            let result = await place_order();
            if (result.status == 200) {
              result.data.data['isTradable'] = true;
              return result.data.data
            }

          } catch (error) {
            console.log("Bitmart market sell error ==>", error)
            // logger.error({ exchange: exchange, activity: 'SELL', error: error })
            // return { isTradable: false };
          }
          break;
        case 'HitBTC':
          try {
            let exchangeDetails = await exchangeData({ exchangeName: 'HitBTC' });
            let pricePrecision = exchangeDetails.tradeFee[symbol].quotePrecision;
            let quantityPrecision = exchangeDetails.tradeFee[symbol].basePrecision;
            const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
            var data = qs.stringify({
              symbol: symbol,
              side: 'sell',
              quantity: quantity,
              // price: price,
              // time_in_force: "GTC",
              type: "market"
            });
            var config = {
              method: 'post',
              url: 'https://api.hitbtc.com/api/3/spot/order',
              headers: {
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              data: data
            };
            let responce = await axios(config)
            if (responce.status == 200) {
              let result = responce.data
              console.log("=sell market order 64657637", result)
              result['isTradable'] = true;
              return result
            }
          } catch (error) {
            console.log("Hitbtc sell error 4545898====> ", error.response.data)
            return { isTradable: false };
          }
          break;
      }
    } catch (error) {
      console.log('556==>', error, new Date().toLocaleString());
      if (error.code != 'EAI_AGAIN') {
        return { isTradable: false };
      }
    }
  },
  cancelOrder: async (exchange, symbol, orderId, apiKey, secretKey, passPhrase, customerId, api_memo, base, quote) => {
    // console.log('cancelOrder request ==>', exchange, symbol, orderId, apiKey, secretKey, passPhrase, customerId, api_memo, base, quote);
    try {
      switch (exchange) {
        case 'Binance':
          try {
            let isCancelled = false
            let cancelRestrictions
            let orderDetailsRes = await triangularOrderDetails(exchange, apiKey, secretKey, orderId, symbol, customerId, api_memo, passPhrase)
            // console.log("hsdfjkhsdjkfhdshfjsdhfjshdfhsdfjhsdfhk")
            if (orderDetailsRes) {
              if (orderDetailsRes.status == "NEW" || orderDetailsRes.status == "PARTIALLY_FILLED") {
                isCancelled = true
                cancelRestrictions = "ONLY_" + orderDetailsRes.status
              }
            }
            if (!isCancelled || !cancelRestrictions) {
              return { status: false };
            }
            let time = await axios({
              method: 'get',
              url: 'https://api4.binance.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            function generate_signature(serverTime) {
              const message = `symbol=${symbol}&orderId=${orderId}&timestamp=` + serverTime
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            let sec = generate_signature(serverTime)
            // cancelRestrictions=${cancelRestrictions}&
            let string = `symbol=${symbol}&orderId=${orderId}&timestamp=` + serverTime
            var config = {
              method: 'delete',
              url: "https://api4.binance.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': apiKey,
              }
            };
            let binancedata = await axios(config)
            if (binancedata.status == 200) {
              if (binancedata.data.status == 'CANCELED') {
                return { status: true };
              }
            }
          }
          catch (error) {
            console.log('CancelOrder::Binance Error ==>', error);
            return { status: false, error: error.message };
          }
          break;
        case 'Coinbase':
          try {
            let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/api/v3/brokerage/orders/batch_cancel`)
            const orderBody = {
              order_ids: [orderId]
            };
            let data = JSON.stringify(orderBody)
            var config = {
              method: 'post',
              url: `https://api.coinbase.com/api/v3/brokerage/orders/batch_cancel`,
              headers: {
                'Authorization': `Bearer ${token}`,
                'CB-VERSION': '2024-07-06'
              },
              data: data
            };
            let cancelDetails = await axios(config)
            if (cancelDetails.status == 200) {
              console.log("coinbase cancel ==>", cancelDetails)
              if (cancelDetails.data.results[0].success == true) {
                return { status: true };
              } else if (cancelDetails.data.results[0].success == false) {
                return { isTradable: false };
              }
            }
          } catch (error) {
            return { status: false }
          }
          break;
        case 'Huobi':
          {
            try {
              var huobidata = await Huobi.cancelOrder(orderId, apiKey, secretKey);
              if (huobidata.status == 'ok') {
                if (huobidata.data == orderId) {
                  return { status: true };
                }
              }
              else if (huobidata.status == 'error') {
                return { status: false, error: huobidata["err-msg"] };
              }
            }
            catch (error) {
              console.log("838==>>", error);
              return { status: false };
            }
          }
          break;
        case 'Kraken':
          {
            try {
              let options = {
                key: apiKey,
                secret: secretKey,
                gennonce: () => new Date().getTime() * 1000,
                timeoutMs: 1000
              }
              const krakenClient = new Kraken(options);
              const params = { txid: orderId }
              return await krakenClient.cancelOrder(params).then((response) => {
                console.log("kraken cancel  -==>", response, 488)
                if (response.count == 1) {
                  return { status: true };
                }
              });
            }
            catch (error) {
              console.log("838==>>", error);
              return { isCancelled: false };
            }
          }
          break;
        case 'Mexc':
          try {
            let time = await axios({
              method: 'get',
              url: 'https://api.mexc.com/api/v3/time'
            })
            const serverTime = time.data.serverTime;
            let string = `symbol=${symbol}&orderId=${orderId}&timestamp=` + serverTime;
            function generate_signature(string) {
              return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
            }
            let sec = generate_signature(string)
            var config = {
              method: 'DELETE',
              url: "https://api.mexc.com/api/v3/order?" + string + "&signature=" + sec,
              headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'X-MEXC-APIKEY': apiKey,
              }
            };
            let data = await axios(config)
            if (data.status == 200) {
              console.log("=========================>412", data.data)
              if (data.data.status = 'CANCELED') {
                return { status: true };
              }
            }
          }
          catch (error) {
            console.log('CancelOrder::Mexc Error ==>', error);
            return { status: false, error: error.message };
          }
          break;
        case 'Bitmart':
          try {
            function get_timestamp() {
              return new Date().getTime().toString();
            }
            function generate_signature(timestamp, body) {
              const message = `${timestamp}#${api_memo}#${body}`;
              return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
            }
            symbol = base + '_' + quote
            async function cancle_order() {
              const path = 'https://api-cloud.bitmart.com/spot/v3/cancel_order';
              const timestamp = get_timestamp();
              const body = {
                symbol: symbol,
                order_id: orderId,
              };
              const headers = {
                'Content-Type': 'application/json',
                'X-BM-KEY': apiKey,
                'X-BM-TIMESTAMP': timestamp,
                'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
              };
              try {
                const response = await axios.post(path, body, { headers });
                return response
              } catch (error) {
                console.error(`Error: sell`, error);
              }
            }

            let result = await cancle_order();
            if (result.status == 200) {
              if (result.data.data.result == true) {
                return { status: true };
              }
            }
          } catch (error) {
            console.log('CancelOrder::Bitmart Error ==>', error);
            return { status: false, error: error.message };
          }
          break;
        case 'Gateio':
          try {
            const host = "https://api.gateio.ws";
            const prefix = "/api/v4";
            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
            const url = `/spot/orders/${orderId}`;
            const query_param = `currency_pair=${base + '_' + quote}`
            const body = {};
            const requestContent = JSON.stringify(body);
            const signature = await gateioSignature.signatureGenerate("DELETE", prefix + url, query_param, '', apiKey, secretKey)
            const headers = { ...commonHeaders, ...signature };
            const responce = await axios.delete(host + prefix + url + "?" + query_param, { headers });
            if (responce.status == 200) {
              let data = responce.data
              if (data) {
                return { status: true };
              }
            }
          } catch (error) {
            console.log("gateio cancel order", error)
            return { status: false, error: error };
          }
          break
        case 'HitBTC':
          try {
            const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
            var config = {
              method: 'DELETE',
              url: `https://api.hitbtc.com/api/3/spot/order/${orderId}`,
              headers: {
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            };
            let responce = await axios(config)
            console.log("=fddshfhsdhfshfjsdhfjdshjfhsdjfhsdjfhsdjfhsd", responce)
            if (responce.status == 200) {
              let data = responce.data
              console.log("=sfhsdfhsdjfhsdjfhsdjfhsdjfh4786738657346543657834657", data)
              if (data.status == "canceled") {
                return { status: true };
              }
            }
          } catch (error) {
            console.log("cancel order hitbtc error==>", error)
            return { status: false, error: error };
          }
          break;
      }
    } catch (error) {
      console.log('CancelOrder Error ==>', error);
    }
  },
  address: async (exchange, base, apiKey, secretKey, passPhrase, customerId, api_memo) => {
    // console.log("deposit address ===> 1278", exchange, base, apiKey, secretKey, passPhrase, customerId, api_memo)
    switch (exchange) {
      case 'Binance':
        try {
          let network
          let time1 = await axios({
            method: 'get',
            url: 'https://api4.binance.com/api/v3/time'
          })
          const serverTime1 = time1.data.serverTime;
          function generate_signature1(serverTime1) {
            const message = `coin=${base}&timestamp=` + serverTime1
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec1 = generate_signature1(serverTime1)
          let string1 = `coin=${base}&timestamp=` + serverTime1;
          var config1 = {
            method: 'get',
            url: "https://api4.binance.com/sapi/v1/capital/config/getall?" + string1 + "&signature=" + sec1,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-MBX-APIKEY': apiKey,
            }
          };
          let result1 = await axios(config1)
          if (result1.status == 200) {
            let filter = result1.data.filter(d =>
              d.coin == base
            )
            let filterNework = filter[0].networkList.filter(d =>
              d.depositEnable == true && d.withdrawEnable == true && d.isDefault == true
            )
            console.log("========================>>>>>", filter[0].networkList)
            network = filterNework[0].network
          }
          let time = await axios({
            method: 'get',
            url: 'https://api4.binance.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&timestamp=` + serverTime
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&timestamp=` + serverTime;
          var config = {
            method: 'get',
            url: "https://api4.binance.com/sapi/v1/capital/deposit/address?" + string + "&signature=" + sec,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-MBX-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            console.log("=--------------<", result.data)
            return { status: true, address: result.data.address, network: network };
          }
        }
        catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Binance server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Binance deposit address error:", errorMessage, new Date().toLocaleString())
          return { status: false }
        }
        break;
      case 'Coinbase':
        try {
          let token = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "GET", "/api/v3/brokerage/accounts")
          var config = {
            method: 'get',
            url: 'https://api.coinbase.com/api/v3/brokerage/accounts?limit=250',
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
          let result = await axios(config)
          if (result.status == 200) {
            let accounts = result.data.accounts
            if (result.data.has_next == true) {
              for (let i = 0; i < 1000; i++) {
                let result1 = await axios(config)
                if (result1.status == 200) {
                  if (result.data.has_next == true) {
                    for (const obj of result.data.accounts) {
                      accounts.push(obj)
                    }
                  } else {
                    break
                  }
                }
              }
            }
            let asset = accounts.find(function (entry) { return (entry.currency === base); });
            if (asset) {
              let token1 = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "GET", `/v2/accounts/${asset.uuid}/addresses`)
              var config = {
                method: 'get',
                url: `https://api.coinbase.com/v2/accounts/${asset.uuid}/addresses`,
                headers: {
                  'Authorization': `Bearer ${token1}`,
                  'CB-VERSION': '2024-07-06'
                }
              };
              let addressResult = await axios(config)
              if (addressResult.status == 200) {
                if (addressResult.data.data != 0) {
                  return { status: true, address: addressResult.data.data[0].address, network: addressResult.data.data[0].network };
                } else {
                  let token2 = await coinbaseSignature.signatureGenerate(apiKey, secretKey, "POST", `/v2/accounts/${asset.uuid}/addresses`)
                  var config = {
                    method: 'post',
                    url: `https://api.coinbase.com/v2/accounts/${asset.uuid}/addresses`,
                    headers: {
                      'Authorization': `Bearer ${token2}`,
                      'CB-VERSION': '2024-07-06'
                    }
                  };
                  let addressGenerate = await axios(config)
                  if (addressGenerate.status == 201) {
                    return { status: true, address: addressGenerate.data.data.address, network: addressGenerate.data.data.network };
                  }
                }
              }
            }
          }

        }
        catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Coinbase server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Coinbase deposit address error:", errorMessage, new Date().toLocaleString())
          return { status: false, error: error.msg };
        }
        break;
      case 'Huobi':
        try {
          let exchange = (await exchangeData({ exchangeName: 'Huobi' }))['_doc']['withdrawFee'];
          let address = await Huobi.depositAddress(base, apiKey, secretKey)
          for (let element of address) {
            if (element.chain.toUpperCase() == exchange[base.toUpperCase()].chain) {
              // return true
              return { status: true, address: element.address, network: exchange[base.toUpperCase()].chain };
            }
          }
        }
        catch (error) {
          console.log('569 ==>', error, new Date().toLocaleString());
          return { status: false }
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          const method = await krakenDepositMethod(base)
          async function krakenDepositMethod(asset) {
            try {
              return await krakenClient.depositMethods({ asset: asset }).then((response) => {
                console.log("kraken krakenDepositMethod test -==>", response, response[0].method, 462)
                return response[0].method;
              });
            } catch (err) {
              console.log("kraken krakenDepositMethod error  -==>", err, 466)
            }
          }
          return await krakenClient.depositAddresses({ asset: base, "method": method }).then(async (response) => {
            if (response.length == 0) {
              return await krakenClient.depositAddresses({ asset: base, "method": method, new: true }).then((newAddress) => {
                console.log("kraken new depositAddresses  -==>", newAddress, 1112)
                return { status: true, address: newAddress[0].address, network: method }
              });
            }
            console.log("kraken old depositAddresses  -==>", response, 1116)
            return { status: true, address: response[0].address, network: method }
          });

        } catch (error) {
          console.log('1113 ==>', error, new Date().toLocaleString());
          return { status: false }
        }
        break;
      case 'Mexc':
        try {
          let network
          let time1 = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime1 = time1.data.serverTime;
          function generate_signature1(serverTime1) {
            const message = `timestamp=` + serverTime1;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec1 = generate_signature1(serverTime1)
          let string1 = `timestamp=` + serverTime1;
          var config1 = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/config/getall?" + string1 + "&signature=" + sec1,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result1 = await axios(config1)
          if (result1.status == 200) {
            let filter = result1.data.filter(d =>
              d.coin == base
            )
            console.log("=====================================", filter[0].networkList)
            if (base == 'USDT') {
              network = 'ERC20'
            } else {
              network = filter[0].networkList[0].network
            }
          }
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            let message = `coin=${base}&network=${network}&timestamp=` + serverTime;
            message = message.replace(/\(/g, '%28').replace(/\)/g, '%29');
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&network=${network}&timestamp=` + serverTime;
          string = string.replace(/\(/g, '%28').replace(/\)/g, '%29')
          var config = {
            method: 'post',
            url: "https://api.mexc.com/api/v3/capital/deposit/address?" + string + "&signature=" + sec,
            headers: {
              'Content-Type': 'application/json',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            return { status: true, address: result.data.address, network: network };
          }
        }
        catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Mexc server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Mexc deposit address error:", errorMessage, new Date().toLocaleString())
          return { status: false }
        }
        // try {
        //   let network
        //   let time1 = await axios({
        //     method: 'get',
        //     url: 'https://api.mexc.com/api/v3/time'
        //   })
        //   const serverTime1 = time1.data.serverTime;
        //   function generate_signature1(serverTime1) {
        //     const message = `timestamp=` + serverTime1;
        //     return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        //   }
        //   let sec1 = generate_signature1(serverTime1)
        //   let string1 = `timestamp=` + serverTime1;
        //   var config1 = {
        //     method: 'get',
        //     url: "https://api.mexc.com/api/v3/capital/config/getall?" + string1 + "&signature=" + sec1,
        //     headers: {
        //       'Content-Type': 'application/x-www-form-urlencoded',
        //       'X-MEXC-APIKEY': apiKey,
        //     }
        //   };
        //   let result1 = await axios(config1)
        //   if (result1.status == 200) {
        //     let filter = result1.data.filter(d =>
        //       d.coin == base
        //     )
        //     if (base == 'USDT') {
        //       network = 'ERC20'
        //     } else {
        //       network = filter[0].networkList[0].network
        //     }
        //   }
        //   let time = await axios({
        //     method: 'get',
        //     url: 'https://api.mexc.com/api/v3/time'
        //   })
        //   const serverTime = time.data.serverTime;
        //   function generate_signature(serverTime) {
        //     const message = `coin=${base}&timestamp=` + serverTime;
        //     return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        //   }
        //   let sec = generate_signature(serverTime)
        //   let string = `coin=${base}&timestamp=` + serverTime;
        //   var config = {
        //     method: 'get',
        //     url: "https://api.mexc.com/api/v3/capital/deposit/address?" + string + "&signature=" + sec,
        //     headers: {
        //       'Content-Type': 'application/x-www-form-urlencoded',
        //       'X-MEXC-APIKEY': apiKey,
        //     }
        //   };
        //   let result = await axios(config)
        //   if (result.status == 200) {
        //     return { status: true, address: result.data[0].address, network: result.data[0].network };
        //   }
        // } catch (error) {
        //   console.log('569 ==>', error, new Date().toLocaleString());
        //   return { status: false }
        // }
        break;
      case 'Bitmart':
        try {
          let network
          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp) {
            const message = `${timestamp}#${api_memo}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          async function deposit_address() {
            const path = `https://api-cloud.bitmart.com/account/v1/deposit/address?currency=${base}`;
            const timestamp = get_timestamp();
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }
          async function deposit_address_network() {
            const path = `https://api-cloud.bitmart.com/account/v1/currencies`;
            const timestamp = get_timestamp();
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }
          let result1 = await deposit_address_network()
          if (result1.status == 200) {
            let filter = result1.data.data.currencies.filter(d =>
              d.currency == base
            )
            network = filter[0].network
          }
          let result = await deposit_address();
          if (result.status == 200) {
            return { status: true, address: result.data.data.address, network: network };
          }
        }
        catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Bitmart server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Bitmart deposit address error:", errorMessage, new Date().toLocaleString())
          return { status: false }
        }
        break;
      case 'Gateio':
        try {
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url = `/wallet/deposit_address`;
          const query_param = `currency=${base}`
          const body = {};
          const requestContent = JSON.stringify(body);
          const signature = await gateioSignature.signatureGenerate("GET", prefix + url, query_param, '', apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.get(host + prefix + url + "?" + query_param, { headers });
          if (responce.status == 200) {
            let data = responce.data
            let obj = {
              status: true, address: data.address, network: data.multichain_addresses[0].chain
            }
            let filter = data.multichain_addresses.find(d =>
              d.chain == "ETH"
            )
            if (filter) {
              obj.address = filter.address
              obj.network = filter.chain
            }
            return obj
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Gateio server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Gateio deposit address error:", errorMessage, new Date().toLocaleString())
        }
        break
      case 'HitBTC':
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/public/currency`,
            headers: {},
          };
          let getNetworkCode = await axios(config)
          let networkFunction
          if (getNetworkCode.status == 200) {
            networkFunction = () => {
              let result = {}; // Create an empty object to hold the result
              Object.keys(getNetworkCode.data).forEach((key) => {
                if (getNetworkCode.data[key].delisted === false) {
                  let validNetworks = getNetworkCode.data[key].networks.filter(network => network.payin_enabled === true && network.payout_enabled === true && network.default === true);
                  if (validNetworks.length > 0) {
                    validNetworks.forEach(network => {
                      result[key] = { network: network.network };
                    });
                  }
                }
              });
              return result
            }
          }
          let allNetwork = networkFunction()
          let network = "ETH"
          let url = `https://api.hitbtc.com/api/3/wallet/crypto/address?currency=${base}`
          if (allNetwork[base]) {
            network = allNetwork[base].network
            url = `https://api.hitbtc.com/api/3/wallet/crypto/address?currency=${base}&network_code=${network}`
          }
          var config = {
            method: 'get',
            url: url,
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            console.log("=sfhdsjfhsdjfhsdjfhjsdhjsdhfjsdhfd", responce.data[0])
            return { status: true, address: responce.data[0].address, network: responce.data[0].network_code || network };
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from HitBTC server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch HitBTC deposit address error:", errorMessage, new Date().toLocaleString())
        }
        break;
    }
  },
  withdraw: async (exchange, base, capital, address, apiKey, secretKey, passPhrase, customerId, api_memo, addressNetwork, coinKey) => {
    let withdraw;
    // console.log("withdraw===> 1247", exchange, base, capital, address, apiKey, secretKey, passPhrase, customerId, addressNetwork, coinKey)
    switch (exchange) {
      case 'Binance':
        try {
          let time = await axios({
            method: 'get',
            url: 'https://api4.binance.com/api/v3/time'
          })
          let coinNetwork = await networkFilter(exchange, base)
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&address=${address}&network=${coinNetwork}&amount=${capital}&timestamp=` + serverTime;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&address=${address}&network=${coinNetwork}&amount=${capital}&timestamp=` + serverTime;
          var config = {
            method: 'post',
            url: "https://api4.binance.com/sapi/v1/capital/withdraw/apply?" + string + "&signature=" + sec,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-MBX-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            console.log(result.data, 1235)
            withdraw = result.data
            withdraw['iswithdrawable'] = true;
            console.log("===========629")
            return withdraw;
          }
        }
        catch (error) {
          console.log('860 ==>', error, new Date().toLocaleString());
          return { iswithdrawable: false };
        }
        break;
      case 'Coinbase':
        try {
          if (base == "ADA") {
            capital = capital.toFixed(1)
          }
          const payload = {
            amount: capital,
            currency: base, // Replace with the desired currency
            crypto_address: address,
          };
          const base_url = 'https://api.pro.coinbase.com';
          const withdrawalEndpoint = '/withdrawals/crypto';
          const timestamp = Math.floor(Date.now() / 1000);
          function withdrawToExchange(secretKey) {

            const message = timestamp + 'POST' + withdrawalEndpoint + JSON.stringify(payload);
            const signature = crypto
              .createHmac('sha256', Buffer.from(secretKey, 'base64'))
              .update(message)
              .digest('base64');

            return signature
          }
          let signature = withdrawToExchange(secretKey);
          const headers = {
            'CB-ACCESS-KEY': apiKey,
            'CB-ACCESS-SIGN': signature,
            'CB-ACCESS-TIMESTAMP': timestamp,
            'CB-ACCESS-PASSPHRASE': passPhrase,
            'Content-Type': 'application/json',
          };
          let reponse = await axios.post(base_url + withdrawalEndpoint, payload, { headers })
          if (reponse.status == 200) {
            console.log("Coinbase======>>727", reponse.data)
            reponse = reponse.data
            reponse['iswithdrawable'] = true;
            return reponse
          }

        } catch (error) {
          console.log('573 ==>', error, new Date().toLocaleString());
          if (error.connect == true) {
            return { iswithdrawable: false };
          }
        }
        break;
      case 'Huobi':
        try {
          let exchangeDetails = (await exchangeData({ exchangeName: 'Huobi' }))['_doc']['withdrawFee'];
          let fee = exchangeDetails[base].withdrawFee;
          let params = {
            "address": address,
            "currency": base.toLowerCase(),
            "amount": parseFloat(capital - fee),//docst
            "fee": fee
          }
          var withdrawdata = await Huobi.withdraw_request(params, apiKey, secretKey);
          console.log('549 withdraw--->>', withdrawdata);
          // withdrawdata = '90621269';
          if (withdrawdata.status != 'error') {
            withdraw = {
              withdrawId: withdrawdata,
              iswithdrawable: true
            }
            return withdraw;
          }
        }
        catch (error) {
          console.log('660 ==>', error, new Date().toLocaleString());
          return { iswithdrawable: false };
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          // let response = { refid: 'AMBABTK-KST25W-2XONLC' }
          // response['iswithdrawable'] = true
          return await krakenClient.withdraw({ asset: base, key: coinKey, amount: capital }).then(async (response) => {
            console.log("kraken withdraw -==>", response, 1403)
            response['iswithdrawable'] = true
            return response
          });
        } catch (error) {
          console.log('kraken withdraw error==> 1394', error)
        }
        break;
      case 'Mexc':
        try {
          let coinNetwork = await networkFilter(exchange, base)
          let time1 = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime1 = time1.data.serverTime;
          function generate_signature1(serverTime1) {
            const message = `timestamp=` + serverTime1;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec1 = generate_signature1(serverTime1)
          let string1 = `timestamp=` + serverTime1;
          var config1 = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/config/getall?" + string1 + "&signature=" + sec1,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result1 = await axios(config1)
          if (result1.status == 200) {
            let filter = result1.data.filter(d =>
              d.coin == base
            )
            console.log("=====================================", filter[0].networkList)
            if (base == 'USDT') {
              coinNetwork = 'ERC20'
            } else {
              coinNetwork = filter[0].networkList[0].network
            }
          }
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          let string = `coin=${base}&address=${address}&amount=${capital}&network=${coinNetwork}&timestamp=` + serverTime;
          string = string.replace(/\(/g, '%28').replace(/\)/g, '%29');
          function generate_signature() {
            return crypto.createHmac('sha256', secretKey).update(string).digest('hex');
          }
          let sec = generate_signature()
          var config = {
            method: 'post',
            // url: "https://api.mexc.com/api/v3/capital/withdraw/apply?" + string + "&signature=" + sec,
            url: "https://api.mexc.com/api/v3/capital/withdraw?" + string + "&signature=" + sec,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            console.log("=========================>600", result.data)
            withdraw = result.data
            withdraw['iswithdrawable'] = true;
            return withdraw;
          }
        }
        catch (error) {
          console.log('660 ==>', error, new Date().toLocaleString());
          return { iswithdrawable: false };
        }
        break;
      case 'Bitmart':
        try {
          // let exchangeDetails = await exchangeData({ exchangeName: 'Bitmart' });
          // let basePrecision = exchangeDetails.tradeFee[base + 'USDT'].basePrecision;
          // capital = parseFloat(capital).toFixed(basePrecision).toString();
          if (addressNetwork == 'ETH') {
            addressNetwork = 'ERC20'
          } else if (addressNetwork == 'BSC' || addressNetwork == 'BEP20(BSC)') {
            addressNetwork = 'BEP20'
          } else if (addressNetwork == 'TRX') {
            addressNetwork = 'TRC20'
          }

          if (base == 'USDT') {
            base = base + '-' + addressNetwork;
          }

          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp, body) {
            const message = `${timestamp}#${api_memo}#${body}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          async function withdraw_apply() {
            const path = 'https://api-cloud.bitmart.com/account/v1/withdraw/apply';
            const timestamp = get_timestamp();
            const body = {
              currency: base,
              amount: capital,
              destination: 'To Digital Address',
              address: address
            };
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp, JSON.stringify(body)),
            };
            try {
              const response = await axios.post(path, body, { headers });
              return response
            } catch (error) {
              console.error(`Error: sell`, error);
            }
          }

          let result = await withdraw_apply();
          if (result.status == 200) {
            withdraw = result.data.data
            withdraw['iswithdrawable'] = true;
            return withdraw;
          }
        } catch (error) {
          console.log('1251 ==>', error, new Date().toLocaleString());
          return { iswithdrawable: false };
        }
        break;
      case 'Gateio':
        try {
          network = "ETH"
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url1 = '/wallet/withdraw_status';
          // const body = {};
          // const requestContent = JSON.stringify(body);
          const signature1 = await gateioSignature.signatureGenerate("GET", prefix + url1, '', '', apiData.apiKey, apiData.secretKey)
          const headers1 = { ...commonHeaders, ...signature1 };
          const responceNetwork = await axios.get(host + prefix + url1, { headers1 });
          if (responceNetwork.status == 200) {
            let data = responceNetwork.data
            let info = data.find(d =>
              d.currency == base
            )
            if (info["withdraw_fix_on_chains"]) {
              network = Object.keys(info["withdraw_fix_on_chains"])[0]
              if (info["withdraw_fix_on_chains"]["ETH"]) {
                network = "ETH"
              }
            }
          }
          const url = '/withdrawals';
          let orderId = await commonFunction.generateOrder()
          const body = {
            withdraw_order_id: orderId,
            currency: base,
            address: address,
            amount: capital,
            chain: network
          };
          const requestContent = JSON.stringify(body);
          const signature = await gateioSignature.signatureGenerate("POST", prefix + url, '', requestContent, apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.post(host + prefix + url, requestContent, { headers });
          if (responce.status == 202) {
            let withdraw = responce.data
            withdraw['iswithdrawable'] = true;
            return withdraw;
          }
        }
        catch (error) {
          console.log('1233 ==>', error, new Date().toLocaleString());
          return { iswithdrawable: false };
        }
        break;
      case 'HitBTC':
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/public/currency`,
            headers: {},
          };
          let getNetworkCode = await axios(config)
          let networkFunction
          if (getNetworkCode.status == 200) {
            networkFunction = () => {
              let result = {}; // Create an empty object to hold the result
              Object.keys(getNetworkCode.data).forEach((key) => {
                if (getNetworkCode.data[key].delisted === false) {
                  let validNetworks = getNetworkCode.data[key].networks.filter(network => network.payin_enabled === true && network.payout_enabled === true && network.default === true);
                  if (validNetworks.length > 0) {
                    validNetworks.forEach(network => {
                      result[key] = { network: network.network };
                    });
                  }
                }
              });
              return result
            }
          }
          let allNetwork = networkFunction()
          let obj = {
            currency: base,
            amount: capital,
            address: address,
            auto_commit: 'false',
          }
          if (allNetwork) {
            obj = {
              currency: base,
              amount: capital,
              address: address,
              auto_commit: 'false',
              network_code: allNetwork[base].network
            }
          }
          var data = qs.stringify();
          var config = {
            method: 'post',
            url: 'https://api.hitbtc.com/api/3/wallet/crypto/withdraw',
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            let withdraw = responce.data
            withdraw['iswithdrawable'] = true;
            return withdraw;
          }
        } catch (error) {
          console.log("hitbtc withdraw error", error)
          return { iswithdrawable: false };
        }
        break;

    }
  },
  transfer: async (exchange, base, amount, from, to, apiKey, secretKey, passPhrase) => {
    var transfer;
    let precision;
    switch (exchange) {
      case 'Kucoin':
        try {
          var exchangeDatas = await exchangeData({ exchangeName: 'Kucoin' });
          const config = {
            apiKey: apiKey,
            secretKey: secretKey,
            passphrase: passPhrase,
            environment: 'live'
          }
          await Kucoin.init(config);
          console.log("transfer=========>", base);
          precision = exchangeDatas.withdrawFee[base].precision
          amount = parseFloat(amount).toFixed(precision);
          const params = {
            clientOid: customerId,
            currency: base,
            from: from,
            to: to,
            amount: amount,
          }
          transfer = await Kucoin.innerTransfer(params);
          if (transfer.code == '200000') {
            return { status: true, data: transfer };
          }
          else {
            return { status: false, data: transfer }
          }
        }
        catch (error) {
          console.log("1048 ==>", error, new Date().toLocaleString());
        }
        break;
      case 'Okex':
        {
          try {
            var okexdata = await Okex.getTrasfer(apiKey, secretKey, passPhrase, amount, base, from, to);
            console.log(868, okexdata);
            if (okexdata.code == '0') {
              return { status: true, data: okexdata.data[0].transId }
            }
            else {
              return { status: false }
            }
          }
          catch (error) {
            console.log("1065 ==>", error.message, new Date().toLocaleString());
          }
        }
    }
    return transfer;
  },
  get_tx_id: async (exchange, apiKey, secretKey, passPhrase, start, base, customerId, api_memo) => {
    let end;
    switch (exchange) {
      case 'Binance':
        let time = await axios({
          method: 'get',
          url: 'https://api4.binance.com/api/v3/time'
        })
        const serverTime = time.data.serverTime;
        // let current = Number(serverTime) - 300000
        function generate_signature(serverTime) {
          // const message = `coin=${base}&startTime=${current}&timestamp=` + serverTime
          const message = `coin=${base}&timestamp=` + serverTime
          return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        }
        let sec = generate_signature(serverTime)
        // let string = `coin=${base}&startTime=${current}&timestamp=` + serverTime;
        let string = `coin=${base}&timestamp=` + serverTime;
        var config = {
          method: 'get',
          url: "https://api4.binance.com/sapi/v1/capital/withdraw/history?" + string + "&signature=" + sec,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MBX-APIKEY': apiKey,
          }
        };
        let result = await axios(config)
        if (result.status == 200) {
          console.log("get_tx_id  ===>>878", result.data)
          return result.data;
        }
        break;
      case 'Huobi':
        try {
          var history = await Huobi.withdraw_history('withdraw', apiKey, secretKey)//deposit/withdraw
          if (history) {
            return history;
          }
        }
        catch (error) {
          console.log("1163==>>", error);
        }
        break;
      case 'Coinbase':
        try {
          const apiURI = 'https://api.pro.coinbase.com';
          const authedClient = new Coinbase.AuthenticatedClient(
            apiKey,
            secretKey,
            passPhrase,
            apiURI,
          );
          return await authedClient.getAccounts().then(async (res) => {
            console.log("=========>>903", (res).find(o => o.currency == base))
            let accountId = (res).find(o => o.currency == base)
            return await authedClient.getAccountTransfers(accountId.id).then((response) => {
              console.log("account history ==> 712", response)
              return response
            })
          })
        }
        catch (error) {
          console.log('1637 ==>withdrawCrypto  history', error, new Date().toLocaleString())
          return { isTradable: false, error: error.msg };
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          return await krakenClient.withdrawStatus({ asset: base }).then(async (response) => {
            console.log("kraken withdrawStatus -==>", base, response, 1527)
            return response;
          });
        } catch (error) {
          console.log('kraken withdrawStatus error==> 1533', error)
        }
        break;
      case 'Mexc':
        try {
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&timestamp=` + serverTime
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&timestamp=` + serverTime;
          var config = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/withdraw/history?" + string + "&signature=" + sec,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            console.log("mexc withdraw responce================>", result.data)
            return result.data;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Mexc server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Mexc withdraw 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case 'Bitmart':
        try {
          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp) {
            const message = `${timestamp}#${api_memo}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          const timestamp = get_timestamp();
          async function deposit_withdraw_history() {
            const path = `https://api-cloud.bitmart.com/account/v2/deposit-withdraw/history?N=1&operation_type=withdraw&currency=${base}`;
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }

          let result = await deposit_withdraw_history();
          if (result.status == 200) {
            console.log("bitmart withddraw history===========================>", result.data.data.records)
            return result.data.data.records;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Bitmart server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Bitmart withdraw 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "Gateio":
        try {
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url = '/wallet/withdrawals';
          const query_param = `currency=${base}`
          const signature = await gateioSignature.signatureGenerate("GET", prefix + url, query_param, '', apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.get(host + prefix + url + "?" + query_param, { headers });
          console.log("=sdfsdfjsdkfjdskfjskdfjsdkfjksdf", responce)
          if (responce.status == 200) {
            console.log("gateio withdraw responce================>", responce.data)
            return responce.data;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Gateio server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Gateio withdraw 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "HitBTC":
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/wallet/transactions?currencies=${base}&sort=DESC`,
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            let data = responce.data.filter(d =>
              d.type == "WITHDRAW"
            )
            return data
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from HitBTC server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch HitBTC withdraw 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
    }
  },
  check_deposit: async (exchange, TransactionId, apiKey, secretKey, passPhrase, customerId, base, api_memo) => {
    // console.log("check deposit function ===> 1584", exchange, TransactionId, apiKey, secretKey, passPhrase, customerId, base, api_memo)
    switch (exchange) {
      case 'Binance':
        let time = await axios({
          method: 'get',
          url: 'https://api4.binance.com/api/v3/time'
        })
        const serverTime = time.data.serverTime;
        function generate_signature(serverTime) {
          const message = `coin=${base}&timestamp=` + serverTime
          return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        }
        let sec = generate_signature(serverTime)
        let string = `coin=${base}&timestamp=` + serverTime;
        var config = {
          method: 'get',
          url: "https://api4.binance.com/sapi/v1/capital/deposit/hisrec?" + string + "&signature=" + sec,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MBX-APIKEY': apiKey,
          }
        };
        let result = await axios(config)
        if (result.status == 200) {
          console.log("binance check deposit===>1697", result.data)
          for (let deposit of result.data) {
            if (deposit.status == 1 && deposit.txId == TransactionId) {
              var amount = deposit.amount;
              return { status: true, amount: amount }
            }
            else if (deposit.status == 0 && deposit.txId == TransactionId) {
              return { status: 'PENDING' }
            }
          }
        }
        break;
      case 'Huobi':
        try {
          var history = await Huobi.withdraw_history('deposit', apiKey, secretKey)//deposit/withdraw
          console.log("history======>>983", history);
          if (history) {
            for (let data of history) {
              if (data.state == 'confirmed' || data.state == 'safe' && data['tx-hash'] == TransactionId) {
                return { status: true, amount: data.amount }
              }
              else if (data.state == 'confirming' && data['tx-hash'] == TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        }
        catch (error) {
          console.log("1274==>", error);
        }
        break;
      case 'Coinbase':
        try {
          const apiURI = 'https://api.pro.coinbase.com';
          const authedClient = new Coinbase.AuthenticatedClient(
            apiKey,
            secretKey,
            passPhrase,
            apiURI,
          );
          return await authedClient.getAccounts().then(async (res) => {
            console.log((res).find(o => o.currency == base))
            let accountId = (res).find(o => o.currency == base)
            return await authedClient.getAccountTransfers(accountId.id).then((response) => {
              console.log("deposit response===========================>", response)
              for (let tx of response) {
                if ('0x' + tx.details.crypto_transaction_hash == TransactionId || tx.details.crypto_transaction_hash == TransactionId && tx.completed_at != null) {
                  console.log("txid==>41", tx.details.crypto_transaction_hash);
                  return { status: true, amount: tx.amount }
                }
              }
              return { status: 'PENDING' }
            })
          })
        }
        catch (error) {
          console.log('1763 ==>withdraw Crypto  history', error, new Date().toLocaleString())
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          return await krakenClient.depositStatus({ asset: base }).then(async (response) => {
            console.log("kraken depositStatus -==>", response, 1117)
            for (let deposit of response) {
              if (deposit.status == "Success" && deposit.asset == base) {
                // deposit.status == "Success" && deposit.asset == base && deposit.txid == TransactionId
                if (deposit.originators) {
                  if ((deposit.originators).includes(TransactionId)) {
                    return { status: true, amount: deposit.amount }
                  }
                } else if (deposit.txid == TransactionId) {
                  return { status: true, amount: deposit.amount }
                }
              } else if (deposit.status == "FAILURE" && deposit.asset == base) {
                if (deposit.originators) {
                  if ((deposit.originators).includes(TransactionId)) {
                    return { status: false }
                  }
                } else if (deposit.txid == TransactionId) {
                  return { status: false }
                }
              } else if (deposit.status == "Settled" && deposit.asset == base) {
                if (deposit.originators) {
                  if ((deposit.originators).includes(TransactionId)) {
                    return { status: 'PENDING' }
                  }
                } else if (deposit.txid == TransactionId) {
                  return { status: 'PENDING' }
                }
              }
            }

          });
        } catch (error) {
          console.log('kraken withdrawStatus error==> 1533', error)
        }
        break;
      case 'Mexc':
        try {
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&timestamp=` + serverTime;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&timestamp=` + serverTime;
          var config = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/deposit/hisrec?" + string + "&signature=" + sec,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            for (let deposit of result.data) {
              let str;
              if (deposit.txId.includes(':')) {
                str = deposit.txId.split(":")[0]
              }
              else {
                str = deposit.txId
              }
              if (deposit.status == 5 && str == TransactionId) {
                var amount = deposit.amount;
                return { status: true, amount: amount }
              }
              else if (deposit.status == 1 || deposit.status == 2 || deposit.status == 3 || deposit.status == 4 && deposit.txId == TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Mexc server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Mexc deposit 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case 'Bitmart':
        try {
          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp) {
            const message = `${timestamp}#${api_memo}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          const timestamp = get_timestamp();
          async function deposit_withdraw_history() {
            const path = `https://api-cloud.bitmart.com/account/v2/deposit-withdraw/history?N=10&operation_type=deposit&currency=${base}`;
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }

          let result = await deposit_withdraw_history();
          if (result.status == 200) {
            for (let deposit of result.data.data.records) {
              console.log("bitmart deposit responce==================>>", deposit)
              if (deposit.status == 3 && deposit.tx_id == TransactionId || deposit.tx_id == '0x' + TransactionId) {
                var amount = deposit.arrival_amount;
                return { status: true, amount: amount }
              }
              else if (deposit.status == 2 || deposit.status == 1 || deposit.status == 0 && deposit.tx_id == TransactionId || deposit.tx_id == '0x' + TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Bitmart server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Bitmart deposit 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "Gateio":
        try {
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url = '/wallet/deposits';
          const query_param = `currency=${base}`
          const signature = await gateioSignature.signatureGenerate("GET", prefix + url, query_param, '', apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.get(host + prefix + url + "?" + query_param, { headers });
          console.log("=456664666465252435248520544444444444444444444444444444456464", responce)
          if (responce.status == 200) {
            console.log("gateio check deposit===>fsdfsdfsdhfjsdhfjk", responce.data)
            for (let deposit of responce.data) {
              if (deposit.status == "DONE" && deposit.txid == TransactionId) {
                var amount = deposit.amount;
                return { status: true, amount: amount }
              }
              else if ((deposit.status == "SPLITPEND" || deposit.status == "DMOVE" || deposit.status == "PEND" || deposit.status == "PROCES" || deposit.status == "VERIFY" || deposit.status == "REQUEST" || deposit.status == "MANUAL" || deposit.status == "BCODE" || deposit.status == "EXTPEND") && deposit.txid == TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Gateio server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Gateio deposit 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "HitBTC":
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/wallet/transactions?currencies=${base}&sort=DESC`,
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            let data = responce.data.filter(d =>
              d.type == "DEPOSIT"
            )
            for (let deposit of data) {
              if (deposit.status == "SUCCESS" && deposit.native.tx_id == TransactionId) {
                var amount = deposit.native.amount;
                return { status: true, amount: amount }
              }
              else if ((deposit.status == "CREATED" || deposit.status == "PENDING") && deposit.native.tx_id == TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from HitBTC server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch HitBTC deposit 1 history error:", errorMessage, new Date().toLocaleString())
        }
        break;
    }
  },

  withdrawHistory: async (exchange, apiKey, secretKey, base, api_memo, passPhrase) => {
    switch (exchange) {
      case 'Binance':
        let time = await axios({
          method: 'get',
          url: 'https://api4.binance.com/api/v3/time'
        })
        const serverTime = time.data.serverTime;
        function generate_signature(serverTime) {
          const message = `coin=${base}&timestamp=` + serverTime
          return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        }
        let sec = generate_signature(serverTime)
        let string = `coin=${base}&timestamp=` + serverTime;
        var config = {
          method: 'get',
          url: "https://api4.binance.com/sapi/v1/capital/withdraw/history?" + string + "&signature=" + sec,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MBX-APIKEY': apiKey,
          }
        };
        let result = await axios(config)
        if (result.status == 200) {
          console.log("================================================================>>>>>>>", result.data)
          return result.data;
        }
        break;
      case 'Coinbase':
        try {
          const apiURI = 'https://api.pro.coinbase.com';
          const authedClient = new Coinbase.AuthenticatedClient(
            apiKey,
            secretKey,
            passPhrase,
            apiURI,
          );
          return await authedClient.getAccounts().then(async (res) => {
            console.log((res).find(o => o.currency == base))
            let accountId = (res).find(o => o.currency == base)
            return await authedClient.getAccountTransfers(accountId.id).then((response) => {
              console.log("account history ==>1199", response)
              return response
            })
          })
        }
        catch (error) {
          console.log('1637 ==>withdrawCrypto  history', error, new Date().toLocaleString())
          return { isTradable: false, error: error.msg };
        }
        break;
      case 'Huobi':
        try {
          var history = await Huobi.withdraw_history('withdraw', apiKey, secretKey)//deposit/withdraw
          if (history) {
            return history;
          }
        }
        catch (error) {
          console.log("1163==>>", error);
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          return await krakenClient.withdrawStatus({ asset: base }).then(async (response) => {
            console.log(1412, "kraken withdrawStatus -==>", response)
            return response;
          });
        } catch (error) {
          console.log('kraken withdrawStatus error==> 1533', error)
        }
        break;
      case 'Mexc':
        try {
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&timestamp=` + serverTime
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&timestamp=` + serverTime;
          var config = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/withdraw/history?" + string + "&signature=" + sec,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            console.log("mexc withdraw history response ================>", result.data)
            return result.data;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Mexc server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Mexc withdraw history error:", errorMessage, new Date().toLocaleString())
          return { iswithdrawable: false };
        }
        break;
      case 'Bitmart':
        try {
          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp) {
            const message = `${timestamp}#${api_memo}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          const timestamp = get_timestamp();
          async function deposit_withdraw_history() {
            const path = `https://api-cloud.bitmart.com/account/v2/deposit-withdraw/history?operation_type=withdraw&currency=${base}`;
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }

          let result = await deposit_withdraw_history();
          if (result.status == 200) {
            console.log("bitmart withdraw history response===========================>", result.data.data.records)
            return result.data.data.records;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Bitmart server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Bitmart withdraw history error:", errorMessage, new Date().toLocaleString())
          return { iswithdrawable: false };
        }
        break;
      case "Gateio":
        try {
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url = '/wallet/withdrawals';
          const query_param = `currency=${base}`
          const signature = await gateioSignature.signatureGenerate("GET", prefix + url, query_param, '', apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.get(host + prefix + url + "?" + query_param, { headers });
          console.log("=fdsfhsdjfhdsjfhjsdfjsdfjsdfhj485435834905", responce)
          if (responce.status == 200) {
            console.log("gateio deposit responce================>", responce.data)
            return responce.data;
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Gateio server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Gateio withdraw history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "HitBTC":
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/wallet/transactions?currencies=${base}&sort=DESC`,
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            let data = responce.data.filter(d =>
              d.type == "WITHDRAW"
            )
            return data
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from HitBTC server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch HitBTC withdraw history error:", errorMessage, new Date().toLocaleString())
        }
        break;
    }
  },
  check_depositHistory: async (exchange, TransactionId, apiKey, secretKey, passPhrase, customerId, base, api_memo) => {
    switch (exchange) {
      case 'Binance':
        let time = await axios({
          method: 'get',
          url: 'https://api4.binance.com/api/v3/time'
        })
        const serverTime = time.data.serverTime;
        function generate_signature(serverTime) {
          const message = `coin=${base}&timestamp=` + serverTime
          return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        }
        let sec = generate_signature(serverTime)
        let string = `coin=${base}&timestamp=` + serverTime;
        var config = {
          method: 'get',
          url: "https://api4.binance.com/sapi/v1/capital/deposit/hisrec?" + string + "&signature=" + sec,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MBX-APIKEY': apiKey,
          }
        };
        let result = await axios(config)
        if (result.status == 200) {
          console.log("binance check deposit===>1271", result.data)
          for (let deposit of result.data) {
            if (deposit.status == 1 && deposit.txId == TransactionId) {
              var amount = deposit.amount;
              return { status: 'SUCCESS', amount: amount, address: deposit.address, coin: deposit.coin }
            }
            else if (deposit.status == 0 && deposit.txId == TransactionId) {
              return { status: 'PROCESSING', amount: amount, address: deposit.address, coin: deposit.coin }
            } else {
              return { status: 'REJECTED', amount: amount, address: deposit.address, coin: deposit.coin }
            }
          }
        }
        break;
      case 'Huobi':
        try {
          var history = await Huobi.withdraw_history('deposit', apiKey, secretKey)//deposit/withdraw
          console.log("1188", history);
          if (history) {
            for (let data of history) {
              if (data.state == 'confirmed' || data.state == 'safe' && data['tx-hash'] == TransactionId) {
                return { status: true, amount: data.amount }
              }
              else if (data.state == 'confirming' && data['tx-hash'] == TransactionId) {
                return { status: 'PENDING' }
              }
            }
          }
        }
        catch (error) {
          console.log("1274==>", error);
        }
        break;
      case 'Coinbase':
        try {
          const apiURI = 'https://api.pro.coinbase.com';
          const authedClient = new Coinbase.AuthenticatedClient(
            apiKey,
            secretKey,
            passPhrase,
            apiURI,
          );
          return await authedClient.getAccounts().then(async (res) => {
            console.log((res).find(o => o.currency == base))
            let accountId = (res).find(o => o.currency == base)
            return await authedClient.getAccountTransfers(accountId.id).then((response) => {
              console.log("account history ==> 1757", response)
              for (let tx of response) {
                if ('0x' + tx.details.crypto_transaction_hash == TransactionId || tx.details.crypto_transaction_hash == TransactionId && tx.completed_at != null) {
                  console.log("txid==>1254", tx.details.crypto_transaction_hash);
                  return { status: true, amount: tx.amount, address: tx.details.crypto_transaction_hash.crypto_address, coin: tx.currency }
                }
              }
              return { status: false }
            })
          })
        }
        catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Coinbase server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Coinbase deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case 'Kraken':
        try {
          let options = {
            key: apiKey,
            secret: secretKey,
            gennonce: () => new Date().getTime() * 1000,
            timeoutMs: 5000
          }
          const krakenClient = new Kraken(options);
          return await krakenClient.depositStatus({ asset: base }).then(async (response) => {
            for (let deposit of response) {
              // deposit.status == "Success" && deposit.asset == base && (deposit.originators).includes(TransactionId)
              if (deposit.status == "Success" && deposit.asset == base) {
                if (deposit.originators) {
                  if ((deposit.originators).includes(TransactionId)) {
                    return { status: "SUCCESS", amount: deposit.amount, address: deposit.info, coin: deposit.asset }
                  }
                } else if (deposit.txid == TransactionId) {
                  return { status: "SUCCESS", amount: deposit.amount, address: deposit.info, coin: deposit.asset }
                }
              } else if (deposit.status == "FAILURE" && deposit.asset == base) {
                if (deposit.originators) {
                  if ((deposit.originators).includes(TransactionId)) {
                    return { status: "REJECTED" }
                  }
                } else if (deposit.txid == TransactionId) {
                  return { status: "REJECTED" }
                }
              }
            }

          });
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Kraken server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Kraken deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case 'Mexc':
        try {
          let time = await axios({
            method: 'get',
            url: 'https://api.mexc.com/api/v3/time'
          })
          const serverTime = time.data.serverTime;
          function generate_signature(serverTime) {
            const message = `coin=${base}&timestamp=` + serverTime;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          let sec = generate_signature(serverTime)
          let string = `coin=${base}&timestamp=` + serverTime;
          var config = {
            method: 'get',
            url: "https://api.mexc.com/api/v3/capital/deposit/hisrec?" + string + "&signature=" + sec,
            headers: {
              // 'Content-Type': 'application/x-www-form-urlencoded',
              'X-MEXC-APIKEY': apiKey,
            }
          };
          let result = await axios(config)
          if (result.status == 200) {
            for (let deposit of result.data) {
              var amount = deposit.amount;
              let str;
              if (deposit.txId.includes(':')) {
                str = deposit.txId.split(":")[0]
              }
              else {
                str = deposit.txId
              }
              if (deposit.status == 5 && str == TransactionId) {
                return { status: 'SUCCESS', amount: amount, address: deposit.address, coin: deposit.coin }
              }
              else if (deposit.status == 1 || deposit.status == 2 || deposit.status == 3 || deposit.status == 4 && str == TransactionId) {
                return { status: 'PROCESSING', amount: amount, address: deposit.address, coin: deposit.coin }
              } else {
                return { status: 'REJECTED', amount: amount, address: deposit.address, coin: deposit.coin }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Mexc server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Mexc deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case 'Bitmart':
        try {
          function get_timestamp() {
            return new Date().getTime().toString();
          }
          function generate_signature(timestamp) {
            const message = `${timestamp}#${api_memo}`;
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
          }
          const timestamp = get_timestamp();
          async function deposit_withdraw_history() {
            const path = `https://api-cloud.bitmart.com/account/v2/deposit-withdraw/history?N=1&operation_type=deposit&currency=${base}`;
            const headers = {
              'Content-Type': 'application/json',
              'X-BM-KEY': apiKey,
              'X-BM-TIMESTAMP': timestamp,
              'X-BM-SIGN': generate_signature(timestamp),
            };
            try {
              const response = await axios.get(path, { headers });
              return response
            } catch (error) {
              console.error(`Error: buy`, error);
            }
          }

          let result = await deposit_withdraw_history();
          if (result.status == 200) {
            for (let deposit of result.data.data.records) {
              if (deposit.status == 3 && deposit.tx_id == TransactionId || deposit.tx_id == '0x' + TransactionId) {
                var amount = deposit.arrival_amount;
                return { status: 'SUCCESS', amount: amount, address: deposit.address, coin: deposit.currency }
              }
              else if (deposit.status == 3 || deposit.status == 2 || deposit.status == 0 && deposit.tx_id == TransactionId || deposit.tx_id == '0x' + TransactionId) {
                return { status: 'PROCESSING', amount: amount, address: deposit.address, coin: deposit.currency }
              } else {
                return { status: 'REJECTED', amount: amount, address: deposit.address, coin: deposit.currency }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from Bitmart server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch Bitmart deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "Gateio":
        try {
          const host = "https://api.gateio.ws";
          const prefix = "/api/v4";
          const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
          const url = '/wallet/deposits';
          const query_param = `currency=${base}`
          const signature = await gateioSignature.signatureGenerate("GET", prefix + url, query_param, '', apiKey, secretKey)
          const headers = { ...commonHeaders, ...signature };
          const responce = await axios.get(host + prefix + url + "?" + query_param, { headers });
          console.log("=456664666466467777777777777777777777777777774", responce)
          if (responce.status == 200) {
            console.log("gateio check deposit===>1271", responce.data)
            for (let deposit of responce.data) {
              if (deposit.status == "DONE" && deposit.txid == TransactionId) {
                var amount = deposit.amount;
                return { status: 'SUCCESS', amount: amount, address: deposit.address, coin: deposit.currency }
              }
              else if (deposit.status == "PROCES" && deposit.txid == TransactionId) {
                return { status: 'PROCESSING', amount: deposit.amount, address: deposit.address, coin: deposit.currency }
              } else if ((deposit.status == "CANCEL" || deposit.status == "FAIL" || deposit.status == "INVALID") && deposit.txid == TransactionId) {
                return { status: 'REJECTED', amount: deposit.amount, address: deposit.address, coin: deposit.currency }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from gateio server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch gateio deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
      case "HitBTC":
        try {
          const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');
          var config = {
            method: 'get',
            url: `https://api.hitbtc.com/api/3/wallet/transactions?currencies=${base}&sort=DESC`,
            headers: {
              'Authorization': 'Basic ' + credentials,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
          };
          let responce = await axios(config)
          if (responce.status == 200) {
            let data = responce.data.filter(d =>
              d.type == "DEPOSIT"
            )
            for (let deposit of data) {
              if (deposit.status == "SUCCESS" && deposit.native.tx_id == TransactionId) {
                var amount = deposit.native.amount;
                return { status: 'SUCCESS', amount: amount, address: deposit.native.address, coin: deposit.native.currency }
              }
              else if ((deposit.status == "CREATED" || deposit.status == "PENDING") && deposit.native.tx_id == TransactionId) {
                return { status: 'PENDING', amount: deposit.native.amount, address: deposit.native.address, coin: deposit.native.currency }
              } else if (deposit.status == "FAILED" && deposit.native.tx_id == TransactionId) {
                return { status: 'REJECTED', amount: deposit.native.amount, address: deposit.native.address, coin: deposit.native.currency }
              }
            }
          }
        } catch (error) {
          let errorMessage = error;
          if (error.response) {
            errorMessage = { type: 'Response Error', status: error.response.status, data: error.response.data, message: `Error occurred with status code ${error.response.status}. ${error.response.data.message}` };
          } else if (error.request) {
            errorMessage = { type: 'Request Error', message: 'No response received from HitBTC server. Please check your network connection.', request: error.request };
          } else {
            errorMessage = { type: 'Configuration/Error Message', message: error.message };
          }
          console.log("Fetch HitBTC deposit history error:", errorMessage, new Date().toLocaleString())
        }
        break;
    }
  },
}


function toFixedNoRounding(n, quantity) {
  const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
  const a = quantity.toString().match(reg)[0];
  // console.log(a, a.indexOf("."),296)
  const dot = a.indexOf(".");
  if (dot === -1) { // integer, insert decimal dot and pad up zeros
    return a + "." + "0".repeat(n)
      ;
  }
  const b = n - (a.length - dot) + 1;
  return b > 0 ? (a + "0".repeat(b)) : a;
}


// function testing() {
//   try {
//     async function getAccountAddresses(accountId) {
//       const timestamp = Math.floor(Date.now() / 1000);
//       const method = 'GET';
//       const body=''
//       const requestPath = '/coinbase-accounts/f9dbd6e9-4efb-482b-af70-0175147d0d72/addresses';

//       const signature = generateSignature(timestamp, method, requestPath,body);

//       const headers = {
//         'CB-ACCESS-KEY': 'feabb938d8a5402278dab0b7e1d1892d',
//         'CB-ACCESS-SIGN': signature,
//         'CB-ACCESS-TIMESTAMP': timestamp,
//         'CB-ACCESS-PASSPHRASE': 'xt2n7k610iq',
//         'Content-Type': 'application/json',
//       };

//       try {
//         const response = await axios.get(`https://api.pro.coinbase.com${requestPath}`,{ headers });
//         const addresses = response.data;
//         console.log('Addresses:', addresses);
//       } catch (error) {
//         console.error('Error fetching addresses:', error.response.data);
//       }
//     }

//     function generateSignature(timestamp, method, requestPath,body) {
//       const message = timestamp + method + requestPath+body;
//       const signature = crypto.createHmac('sha256', Buffer.from('qwgULrHQQWjH82fVPl7aIIrmu6FZ9YqNlF3qUG+h2XK1Vm95j9LDePI5tfzNkd7PRLHCWI1rw7y7i+HS+AB4wQ==', 'base64')).update(message).digest('base64');

//       return signature;
//     }

//     getAccountAddresses('f9dbd6e9-4efb-482b-af70-0175147d0d72');
//   } catch (error) {
//     console.log("sjfsdkjfksdjfksdjfksdjfksdjkfjsdkfjsdkfjsdkfsdkfsdkfj", error)
//   }
// }
// testing()


// async function testing() {
//   const apiEndpoint = `https://api.exchange.coinbase.com`;
//   const requestPath = '/withdrawals/fee-estimate?crypto_address=3G5D4YwVCWS6VRk24bnZjiFpmhebKGb2ni&currency=BTC&Network=Bitcoin'
//   const timestamp = Math.floor(Date.now() / 1000);
//   const prehashString = timestamp + 'GET' + requestPath;
//   const signature = crypto.createHmac('sha256', Buffer.from('qwgULrHQQWjH82fVPl7aIIrmu6FZ9YqNlF3qUG+h2XK1Vm95j9LDePI5tfzNkd7PRLHCWI1rw7y7i+HS+AB4wQ==', 'base64')).update(prehashString).digest('base64');
//   const headers = {
//     'CB-ACCESS-KEY': 'feabb938d8a5402278dab0b7e1d1892d',
//     'CB-ACCESS-SIGN': signature,
//     'CB-ACCESS-TIMESTAMP': timestamp,
//     'CB-ACCESS-PASSPHRASE': 'xt2n7k610iq',
//     'Content-Type': 'application/json',
//   };
//   const response = await axios.get(apiEndpoint+requestPath, { headers });
//   if (response.status == 200) {
//    console.log("sfjsdkfjksdfjksdfksdjfksjfkjsfkjsdfksdfksjffskjsdkfsdkfjksd",response.data)
//   }
// }
// testing()

// async function testingKrakenWithdrawFee() {
//   const getMessageSignature = (path, request, secret, nonce) => {
//     const message = JSON.stringify(request);
//     const secret_buffer = Buffer.from(secret, 'base64');
//     const hash = new crypto.createHash('sha256');
//     const hmac = new crypto.createHmac('sha512', secret_buffer);
//     const hash_digest = hash.update(nonce + message).digest('binary');
//     const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');

//     return hmac_digest;
//   };
//   let path = 'https://api.kraken.com'
//   let endpoint = '/0/private/WithdrawInfo'
//   let time = new Date().getTime() * 1000
//   let request = {
//     nonce: time,
//     asset: "ADA",
//     key: "ADA_Coinbase",
//     amount: 1
//   }
//   let signature = getMessageSignature(endpoint, request, 'CAXjyr74lmhaPw5FoZQNYqgh2IPA6uuIlufJdVZ3/svko00U2hEeNKEnxKzHxigqpIZJSwPeDkDcOpOMBtfZlQ==', time)
//   let headers = {
//     'API-Key': 'pwqC0s41rkPnDQAJZn00rDcLBHBG0fKUxmKs5PN4Lydhy1gkbotkI9wi',
//     'API-Sign': signature
//   }
//   console.log("signature===========>", signature)
//   // let response=await axios.post((path + endpoint), headers=headers, data=request)
//   var config = {
//     method: 'post',
//     url: (path + endpoint),
//     headers: {
//       'API-Key': 'pwqC0s41rkPnDQAJZn00rDcLBHBG0fKUxmKs5PN4Lydhy1gkbotkI9wi',
//       'API-Sign': signature
//     },
//     data: request
//   };
//   let response = await axios(config)
//   console.log("response ===================>", response.data)
// }
// testingKrakenWithdrawFee()

async function networkFilter(exchange, base) {
  let coinNetwork
  if (exchange == 'Binance') {
    if (base == "AVAX") {
      coinNetwork = 'AVAXC'
    } else if (base == 'USD' || base == 'ETH' || base == 'USDT' || base == 'USDC' || base == 'DAI' || base == 'SHIB' || base == 'UNI' || base == 'WBTC' || base == 'RNDR' || base == "COMP" || base == "MASK" || base == "1INCH" || base == "OCEAN" || base == "BAL" || base == "LDO" || base == "CRV" || base == "APE" || base == "BUSD" || base == "PEPE") {
      coinNetwork = 'ETH'
    } else if (base == "WOO") {
      coinNetwork = "BSC"
    } else {
      coinNetwork = base
    }
    return coinNetwork
  } else if (exchange == 'Mexc') {
    if (base == "BUSD" || base == "DAI" || base == "ETH" || base == "UNI" || base == "USDC" || base == "WBTC" || base == "WOO" || base == "RNDR" || base == "COMP" || base == "CRV" || base == "1INCH" || base == "OCEAN" || base == "PEPE" || base == "MASK" || base == "APE" || base == "BAL" || base == "LDO") {
      coinNetwork = 'ERC20'
    } else if (base == "TRX") {
      coinNetwork = 'TRC20'
    } else if (base == "USDT") {
      coinNetwork = "OMNI"
    } else if (base == "LUNA") {
      coinNetwork = "LUNA2"
    } else {
      coinNetwork = base
    }
    return coinNetwork
  }
}


// async function testingKrakenBaalan() {
//   const getMessageSignature = (path, request, secret, nonce) => {
//     const message = JSON.stringify(request);
//     const secret_buffer = Buffer.from(secret, 'base64');
//     const hash = new crypto.createHash('sha256');
//     const hmac = new crypto.createHmac('sha512', secret_buffer);
//     const hash_digest = hash.update(nonce + message).digest('binary');
//     const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');

//     return hmac_digest;
//   };
//   let path = 'https://api.kraken.com'
//   let endpoint = '/0/private/Balance'
//   // let time = new Date().getTime() * 1000
//   // let time = Date.now().toString()
//   let serverTime = await axios({
//     method: 'get',
//     url: 'https://api.kraken.com/0/public/Time'
//   })
//   // const serverTime = time.data.serverTime;
//   console.log("====================================>>>", serverTime.data.result.unixtime)
//   let time = serverTime.data.result.unixtime
//   let request = {
//     nonce: time
//   }
//   let signature = getMessageSignature(endpoint, request, 'BNCKBLmZMH3emaFv2v2WtLVOrwuAJFAw+RQwYWjcB8yS625JFt6nQHFsZ+bYqPiKreFP6G1d0dEqlGzPncsfxQ==', time)
//   console.log("signature===========>", signature)
//   var config = {
//     method: 'post',
//     url: (path + endpoint),
//     headers: {
//       'API-Key': 'Agf2aIHjfLP7RAGnyAPsIfOtXfOLBTDw2hVIVPokxJa8LHTUAu1BOs5G',
//       'API-Sign': signature
//     },
//     data: request
//   };
//   let response = await axios(config)
//   console.log("response ===================>", response.data)
// }
// testingKrakenBaalan()