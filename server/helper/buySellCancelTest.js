import config from "config";
// Binance module call
// import Binance from 'binance-api-node';
// const Binance = require('node-binance-us-api');
// const B_client = new Binance({ APIKEY: config.get('BINANCE.API_KEY'), APISECRET: config.get('BINANCE.SECRET_KEY')});

//Cex module call
import Cexio from 'cexio-api-node';
const cexPvt = new Cexio("up152376208", "hdgO9kB0rBuKoMVlhwx3dgyo6g", "vvCeVfsCJoSEnRWiNN0jnXD996A").promiseRest;


// Kucoin module call
const Kucoin = require('kucoin-node-api');
const configKucoin = {
    apiKey: "62f2cd637e76690001ad319c",
    secretKey: "f085803d-3ad7-4fb2-906d-d5429a271837",
    passphrase: "warriorpartnersmakrasduenhuber",
    environment: 'live'
  }
  Kucoin.init(configKucoin);
////////////////////////////////////////////////////////////////////

import { Kraken } from "node-kraken-api";
let options = {
    key: 'Vtvs+HbYP0yCKW0IiuHI/H18FDE2yHpxdvEvEZzyOQ/ivenU06Mi/ogA',
    secret: 'FiWIIBj9pVrl3wdxYwBh/cDGc70s4oEScLR3LKxBR3beKEoCjuSTPTE5sY1owg70awsvIcFkNkdKWVYl574wTw==/ai0D+O9mrIuGPoJyfXD70JMrd6aIueJrpRs9qIy9ciQGEf4Xr8Q==',
    //     key: 'hi09YO7+0QpHL+Nlum8qWWiDWXGkhFUPEmHGYCTLgPsHPuQ0PCUXr879',
    //     secret: 'H5RyJ6kqvyp0i6FQVeLJbFEm43/FaH15oNhrwZzwh620gV5sA838vvlddqz0CCMUVjHF1Da/gJXcpinG1AQqtg==',
    // gennonce: () => new Date().getTime() * 1000,
    timeoutMs: 5000
}
const krakenClient = new Kraken(options);

//Gemini module call
import GeminiAPI from "../../../../helper/geminiHelper/index"
const GeminiClient = new GeminiAPI({ key: "master-GHjXWUYggt88cZmA4QSb", secret: "Pa9UL4xiz9suGzjHxDBrimafy4g", sandbox: false });

// crypto.com module call
import { CryptoApi, Currency } from "node-crypto-com";
const api = new CryptoApi("apiKey", "apiSecret");

// Bitstamp module call
const { Bitstamp, CURRENCY } = require("../../../../helper/bitstampHelper/index");
const key = "UhWkyodecwaMjd8SpfSwngPWV5G9Dfnk";
const secret = "z9DcQAaRBnsUwOCfgw0iP8TkjEEYbrKo";
const clientId = "ftwo7953";

const bitstamp = new Bitstamp({
    key,
    secret,
    clientId,
    timeout: 5000,
    rateLimit: true //turned on by default
});

//FTX 

import { RestClient } from "ftx-api";
const restClientOptions = {
    // override the max size of the request window (in ms)
    recv_window: new Date().getTime(),
    domain: "ftxus",
};
const API_KEY = "2Yug1K1jxbYTNVss9-r9ZNmj5SIWFLcndnZx6lm7";
const PRIVATE_KEY = "UApttzXBoiScKcrxALJtxAfwTQewTbFU6_xpy-vu";
const ftxClient = new RestClient(
    API_KEY,
    PRIVATE_KEY,
    restClientOptions
    // requestLibraryOptions
);

async function buy(){
    let symbol = 'btcusd'
    let price = 20000;
    let quantity = 0.00149253;

    //Kucoin
    // const params = {
    //     clientOid: "31549899",
    //     side: 'BUY',
    //     symbol: symbol,
    //     price: price,
    //     size: quantity,
    //   }
    //   let data = await Kucoin.placeOrder(params);
    //   console.log("Kucoin buy test ==> 87", data)

    //Binance
    // let result = await B_client.order({ symbol: symbol, side: 'BUY', quantity: quantity, price: price });
    // console.log("Binance buy test ==> 90", data);

    //CEXio
    // let cexioOrder = await cexPvt.place_order(symbol, 'buy', quantity, price, null)
    // console.log("Cexio buy test ==> 94", cexioOrder)
    
    //Bitstamp 
    try{
        await bitstamp.buyLimitOrder(quantity, price, symbol = symbol).then((response) =>{
            console.log("Bitstamp buy test ==> 99",response)
        })
    }catch(err){
        console.log("Bitstamp error 104", err)
    }
    
}

async function sell(){
    let symbol = 'USDTUSD'
    let price = 0.9999;
    let quantity = 25;

    //Kucoin
    const params = {
        clientOid: "31549899",
        side: 'SELL',
        symbol: symbol,
        price: price,
        size: quantity,
      }
    //   let data = await Kucoin.placeOrder(params);
    //   console.log("Kucoin sell test ==> 106", data);

    //Binance
    try{//side, symbol, quantity, price
        await B_client.order( "SELL", symbol, quantity, price ).then((order)=>{
            console.log("Binance sell test ==> 109", order);
    
        });  
    }catch(err){
        console.log("Binance sell error:", err.message)
    }
    

    //CEXio
    // let cexioOrder = await cexPvt.place_order(symbol, 'sell', quantity, price, null)
    // console.log("Cexio sell test ==> 117", cexioOrder)
}

async function cancel(){
    let orderID = '42413116'
    let symbol = 'USDTUSD';

    //Kucoin
    Kucoin.init(config);
    const params = {
      id: orderID,
    }
    // let kucoindata = await Kucoin.cancelOrder(params);
    // console.log("Kucoin cancel test ==> 121", kucoindata);

    //Binance  
    await B_client.cancel( symbol, orderID).then((response)=>{
        console.log("Binance cancel test ==> 125", response);
    });

    //CEXio
    // let cexioOrder = await cexPvt.cancel_order(orderID)
    // console.log("Cexio cancel test ==> 94", cexioOrder)

}

async function OrderStatus(){
    let orderID = '42413100'
    let symbol = 'USDTUSD';
    //Binance  
    await B_client.orderStatus( symbol, orderID).then((response)=>{
        console.log("Binance OrderStatus test ==> 125", response);
    });
}

async function OpenOrders(){

}


buy();
// sell();
// cancel();
// OrderStatus();