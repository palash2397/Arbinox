// module.exports = {
//     get_price: (exchange, token, tickers) => {
//         // console.log('3 >>>> ',tickers)
//         switch (exchange) {
//             case 'Binance':
//                 // console.log('binance ==>',token,tickers[token])       
//                 return tickers[token]['price']
//                 break;
//             case 'Poloniex':
//                 return tickers[token]['price'];
//                 break;
//             case 'Kucoin':
//                 tickers = tickers;
//                 for (let ticker of tickers) {
//                     if (ticker.symbol == token) {
//                         // console.log('Matched -->',token,ticker.last)
//                         return ticker.last
//                     }
//                 }
//                 break;
//             case 'BitFinex':
//                 return tickers[token]['price'];
//                 break;
//             case 'Gateio':
//                 return tickers[token].price;
//                 break;
//         }
//     },
//     getPrice: (exchange, token, tickers) => {
//         // console.log('3 >>>> ',tickers)
//         switch (exchange) {
//             case 'Binance':
//                 // console.log('binance',token, tickers.binance[token])       
//                 return tickers[token]
//                 break;
//             case 'Poloniex':
//                 return tickers[token].last;
//                 break;
//             case 'Kucoin':
//                 tickers = tickers;
//                 for (let ticker of tickers) {
//                     if (ticker.symbol == token) {
//                         // console.log('Matched -->',token,ticker.last)
//                         return ticker.last
//                     }
//                 }
//                 break;
//             case 'BitFinex':
//                 for (let ticker of tickers) {
//                     if (ticker[0] == token) {
//                         return ticker[7];
//                     }
//                 }
//                 break;
//             case 'Gateio':
//                 console.log(token)
//                 let data = tickers[token];
//                 if (!data) {
//                     token = token+'_USDT';
//                     return tickers[token].price;
//                 }else{
//                     return data.price;                
//                 }
//                 break;
//         }
//     },
//     getVolume: (exchange, token, tickers) => {
//         // console.log('3 >>>> ',tickers)
//         switch (exchange) {
//             case 'Binance':
//                 // console.log('binance',token, tickers.binance[token])       
//                 return tickers[token]
//                 break;
//             case 'Poloniex':
//                 return tickers[token].last;
//                 break;
//             case 'Kucoin':
//                 tickers = tickers;
//                 for (let ticker of tickers) {
//                     if (ticker.symbol == token) {
//                         // console.log('Matched -->',token,ticker.last)
//                         return ticker.last
//                     }
//                 }
//                 break;
//             case 'BitFinex':
//                 for (let ticker of tickers) {
//                     if (ticker[0] == token) {
//                         return ticker[7];
//                     }
//                 }
//                 break;
//             case 'Gateio':
//                 token = token + '_USDT'
//                 for (let ticker of tickers) {
//                     if (ticker.currencyPair == token) {
//                         return ticker.quoteVolume;
//                     }
//                 }
//                 break;
//         }
//     },
// }