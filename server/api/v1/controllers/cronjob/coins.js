var CronJob = require('cron').CronJob;
const { get_coins } = require('../../../../helper/get_tickers');
const exchangeModel = require('../../../../models/exchange');
let cexioExchange, okexExchange, binanceExchange, kucoinExchange, huobiExchange;
import config from "config";


///////////////   Binance   ///////////////
let binanceCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        await get_coins('Binance').then(async (coins) => {
            if (coins.length != 0) {
                let binanceCoinsData = await exchangeModel.findOne({ exchangeName: 'Binance', uid: 'binance', status: 'ACTIVE' });
                if (binanceCoinsData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: binanceCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateTicker) {
                        console.log('Binance coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Binance', uid: 'binance', coins: coins }).save();
                    if (createTicker) {
                        console.log('Binance coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('28 ==>', error)
    }
});

///////////////   Huobi   ///////////////
let huobiCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        await get_coins('Huobi').then(async (coins) => {
            if (coins.length != 0) {
                let huobiCoinsData = await exchangeModel.findOne({ exchangeName: 'Huobi', uid: 'huobi', status: 'ACTIVE' });
                if (huobiCoinsData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: huobiCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateTicker) {
                        // console.log('huobi coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Huobi', uid: 'huobi', coins: coins }).save();
                    if (createTicker) {
                        console.log('Huobi coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('52 ==>', error)
    }
});

let coinbaseCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let coinbaseExchange = await get_coins('Coinbase').then(async (coins) => {
            if (coins.length != 0) {
                let bitstampCoinsData = await exchangeModel.findOne({ exchangeName: 'Coinbase', uid: 'coinbase', status: 'ACTIVE' });
                if (bitstampCoinsData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: bitstampCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateTicker) {
                        console.log('Coinbase coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Coinbase', uid: 'coinbase', coins: coins }).save();
                    if (createTicker) {
                        console.log('Coinbase coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('118 ==>', error)
    }
});

let krakenCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let krakenCronExchange = await get_coins('Kraken').then(async (coins) => {
            if (coins.length != 0) {
                let bitstampCoinsData = await exchangeModel.findOne({ exchangeName: 'Kraken', uid: 'kraken', status: 'ACTIVE' });
                if (bitstampCoinsData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: bitstampCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateTicker) {
                        console.log('Kraken coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Kraken', uid: 'kraken', coins: coins }).save();
                    if (createTicker) {
                        console.log('Kraken coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('118 ==>', error)
    }
});

let mexc = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let mexcmartExchange = await get_coins('Mexc').then(async (coins) => {
            if (coins.length != 0) {
                let mexcmartCoinsData = await exchangeModel.findOne({ exchangeName: 'Mexc', uid: 'mexc', status: 'ACTIVE' });
                if (mexcmartCoinsData) {
                    let updateCoin = await exchangeModel.updateOne({ _id: mexcmartCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateCoin) {
                        console.log('mexc coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createCoin = await exchangeModel({ exchangeName: 'Mexc', uid: 'mexc', coins: coins }).save();
                    if (createCoin) {
                        console.log('mexc coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('264 ==>', error)
    }
});

let bitmart = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let bitmartExchange = await get_coins('Bitmart').then(async (coins) => {
            if (coins.length != 0) {
                let bitmartCoinsData = await exchangeModel.findOne({ exchangeName: 'Bitmart', uid: 'bitmart', status: 'ACTIVE' });
                if (bitmartCoinsData) {
                    let updateCoin = await exchangeModel.updateOne({ _id: bitmartCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateCoin) {
                        console.log('Bitmart coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createCoin = await exchangeModel({ exchangeName: 'Bitmart', uid: 'bitmart', coins: coins }).save();
                    if (createCoin) {
                        console.log('Bitmart coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('264 ==>', error)
    }
});


let geminiCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let geminiExchange = await get_coins('Gemini').then(async (coins) => {
            if (coins.length != 0) {
                let geminiCoinsData = await exchangeModel.findOne({ exchangeName: 'Gemini', uid: 'gemini', status: 'ACTIVE' });
                if (geminiCoinsData) {
                    let updateCoin = await exchangeModel.updateOne({ _id: geminiCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateCoin) {
                        console.log('Gemini coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createCoin = await exchangeModel({ exchangeName: 'Gemini', uid: 'gemini', coins: coins }).save();
                    if (createCoin) {
                        console.log('Gemini coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('168 ==>', error)
    }
});

let gateioCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let gateioExchange = await get_coins('Gateio').then(async (coins) => {
            if (coins.length != 0) {
                let gateioCoinsData = await exchangeModel.findOne({ exchangeName: 'Gateio', uid: 'gateio', status: 'ACTIVE' });
                if (gateioCoinsData) {
                    let updateCoin = await exchangeModel.updateOne({ _id: gateioCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateCoin) {
                        console.log('Gateio coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createCoin = await exchangeModel({ exchangeName: 'Gateio', uid: 'gateio', coins: coins }).save();
                    if (createCoin) {
                        console.log('Gateio coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('146 ==>', error)
    }
});

let hitbtcCron = new CronJob(config.get("cronTime.coins"), async function () {
    try {
        let hitbtcExchange = await get_coins('HitBTC').then(async (coins) => {
            if (coins.length != 0) {
                let hitbtcCoinsData = await exchangeModel.findOne({ exchangeName: 'HitBTC', uid: 'hitbtc', status: 'ACTIVE' });
                if (hitbtcCoinsData) {
                    let updateCoin = await exchangeModel.updateOne({ _id: hitbtcCoinsData._id }, { $set: { coins: coins } }, { new: true });
                    if (updateCoin) {
                        console.log('Hitbtc coins updated.', new Date().toLocaleString())
                    }
                } else {
                    let createCoin = await exchangeModel({ exchangeName: 'HitBTC', uid: 'hitbtc', coins: coins }).save();
                    if (createCoin) {
                        console.log('Hitbtc coins created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('169 ==>', error)
    }
});

/////////////////////////// 
//start-stop cron-job for coins

binanceCron.start();
// binanceCron.stop();

// huobiCron.start();
// huobiCron.stop();

coinbaseCron.start();
// coinbaseCron.stop();

krakenCron.start();
// krakenCron.stop();

mexc.start();
// mexc.stop();

bitmart.start();
// bitmart.stop();

// geminiCron.start();
// geminiCron.stop();

gateioCron.start();
// gateioCron.stop();

// hitbtcCron.start();
// hitbtcCron.stop();