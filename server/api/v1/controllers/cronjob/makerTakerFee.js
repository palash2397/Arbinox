const CronJob = require('cron').CronJob;
import { makerTicker_fee } from '../../../../helper/get_tickers';
import exchangeModel from '../../../../models/exchange';
import config from "config";

//latest

///////////////   Binance Maker Taker   ///////////////
let binanceCron = new CronJob(config.get('cronTime.makerTaker'), async function () {
    try {
        await makerTicker_fee('Binance').then(async (exInfo) => {
            if (exInfo) {
                let binanceExchangeInfo = await exchangeModel.findOne({ exchangeName: 'Binance', uid: 'binance', status: 'ACTIVE' });
                if (binanceExchangeInfo) {
                    let updateExInfo = await exchangeModel.updateOne({ _id: binanceExchangeInfo._id }, { $set: { makerTakerFee: exInfo } }, { new: true });
                    if (updateExInfo) {
                        console.log('Binance makerTaker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Binance', uid: 'binance', makerTakerFee: exInfo }).save();
                    if (createTicker) {
                        console.log('Binance makerTaker created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('28 maker taker ==>', error)
    }
});

// binanceCron.start();
// binanceCron.stop();