const CronJob = require('cron').CronJob;
import { get_tradeFee } from '../../../../helper/get_tickers';
import exchangeModel from '../../../../models/exchange';
import config from "config";

//latest

///////////////   Binance tradefee   ///////////////
let binanceCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Binance').then(async (exInfo) => {
            if (exInfo) {
                let binanceExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Binance', uid: 'binance', status: 'ACTIVE' });
                if (binanceExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: binanceExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Binance tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Binance', uid: 'binance', tradeFee: exInfo }).save();
                    if (createTicker) {
                        console.log('Binance tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('52 ==>', error)
    }
});


let HuobiCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Huobi').then(async (fee) => {
            if (fee) {
                let huobiFeeData = await exchangeModel.findOne({ exchangeName: 'Huobi', uid: 'huobi', status: 'ACTIVE' });
                if (huobiFeeData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: huobiFeeData._id }, { $set: { tradeFee: fee } }, { new: true });
                    if (updateTicker) {
                        console.log('Huobi tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Huobi', uid: 'huobi', tradeFee: fee }).save();
                    if (createTicker) {
                        console.log('Huobi tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('74 ==>', error)
    }
});

/////////////   coinbase  tradefee ///////////////
let coinbaseCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Coinbase').then(async (fee) => {
            if (fee) {
                let coinbaseFeeData = await exchangeModel.findOne({ exchangeName: 'Coinbase', uid: 'coinbase', status: 'ACTIVE' });
                if (coinbaseFeeData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: coinbaseFeeData._id }, { $set: { tradeFee: fee } }, { new: true });
                    if (updateTicker) {
                        console.log('coinbase tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Coinbase', uid: 'coinbase', tradeFee: fee }).save();
                    if (createTicker) {
                        console.log('coinbase tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('266 ==>', error)
    }
});

///////////////   Kraken tradefee   ///////////////
let krakenCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Kraken').then(async (fee) => {
            if (fee) {
                let krakenFeeData = await exchangeModel.findOne({ exchangeName: 'Kraken', uid: 'kraken', status: 'ACTIVE' });
                if (krakenFeeData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: krakenFeeData._id }, { $set: { tradeFee: fee } }, { new: true });
                    if (updateTicker) {
                        console.log('Kraken tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Kraken', uid: 'kraken', tradeFee: fee }).save();
                    if (createTicker) {
                        console.log('Kraken tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('120 ==>', error)
    }
});

///////////////   mexc tradefee   ///////////////
let mexcCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Mexc').then(async (exInfo) => {
            if (exInfo) {
                let mexcExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Mexc', uid: 'mexc', status: 'ACTIVE' });
                if (mexcExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: mexcExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Mexc tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTradefee = await exchangeModel({ exchangeName: 'Mexc', uid: 'mexc', tradeFee: exInfo }).save();
                    if (createTradefee) {
                        console.log('Mexc tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('290 ==>', error)
    }
});

///////////////   bitmart tradefee   ///////////////
let bitmartCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Bitmart').then(async (exInfo) => {
            if (exInfo) {
                let bitmartExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Bitmart', uid: 'bitmart', status: 'ACTIVE' });
                if (bitmartExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: bitmartExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Bitmart tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTradefee = await exchangeModel({ exchangeName: 'Bitmart', uid: 'bitmart', tradeFee: exInfo }).save();
                    if (createTradefee) {
                        console.log('Bitmart tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('290 ==>', error)
    }
});

///////////////   gemini tradefee   ///////////////
let geminiCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Gemini').then(async (exInfo) => {
            if (exInfo) {
                let geminiExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Gemini', uid: 'gemini', status: 'ACTIVE' });
                if (geminiExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: geminiExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Gemini tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTradefee = await exchangeModel({ exchangeName: 'Gemini', uid: 'gemini', tradeFee: exInfo }).save();
                    if (createTradefee) {
                        console.log('Gemini tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('290 ==>', error)
    }
});

///////////////   Gateio tradefee   ///////////////
let gateioCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('Gateio').then(async (exInfo) => {
            if (exInfo) {
                let gateioExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Gateio', uid: 'gateio', status: 'ACTIVE' });
                if (gateioExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: gateioExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Gateio tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTradefee = await exchangeModel({ exchangeName: 'Gateio', uid: 'gateio', tradeFee: exInfo }).save();
                    if (createTradefee) {
                        console.log('Gateio tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('290 ==>', error)
    }
});

///////////////   hitbtc tradefee   ///////////////
let hitBTCCron = new CronJob(config.get('cronTime.tradeFees'), async function () {
    try {
        await get_tradeFee('HitBTC').then(async (exInfo) => {
            if (exInfo) {
                let hitbtcExchangeInfo = await exchangeModel.findOne({ exchangeName: 'HitBTC', uid: 'hitbtc', status: 'ACTIVE' });
                if (hitbtcExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: hitbtcExchangeInfo._id }, { $set: { tradeFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('HitBTC tradefee updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTradefee = await exchangeModel({ exchangeName: 'HitBTC', uid: 'hitbtc', tradeFee: exInfo }).save();
                    if (createTradefee) {
                        console.log('HitBTC tradefee created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('173 ==>', error)
    }
});

///////////////////////////
//start-stop cron-job for tradefee

binanceCron.start();
// binanceCron.stop();

// HuobiCron.start();
// HuobiCron.stop();

coinbaseCron.start();
// coinbaseCron.stop();

krakenCron.start();
// krakenCron.stop(); 

mexcCron.start();
// mexcCron.stop();

bitmartCron.start();
// bitmartCron.stop();

// geminiCron.start();
// geminiCron.stop();

gateioCron.start();
// gateioCron.stop();

// hitBTCCron.start();
// hitBTCCron.stop();