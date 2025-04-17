module.exports = {
    direct: async function direct(all_tickers) {
        var BTC_list = []
        var USDT_list = []
        var token_list = {}
        let list = all_tickers;
        if (list) {
            for (let [sym] of Object.entries(list)) {
               
               if (sym.endsWith('BTC')) {
                    let token = sym.replace('BTC', "")
                    BTC_list.push(token)
                } else if (sym.endsWith('USD')) {
                    let token = sym.replace('USD', "")
                    USDT_list.push(token)
                } 
            }
            token_list.BTC = BTC_list;
            token_list.USD = USDT_list;
            return token_list
        }
    },
    intraPriceBinance: async function intraPriceBinance(data, primary) {
        var prepared = {}
        for (let ticker of Object.keys(data)) {  //BTCUSDT
            let pair = ticker //BTCUSDT
            let ask = parseFloat(data[ticker].price) //ask
            for (let token in primary) {
                if (pair.startsWith(primary[token])) { //BTCUSDT ends with USDT/BTC/BNB       
                    let secondary = pair.replace(primary[token], '')
                    if (ask > 0) {
                        if (!prepared[primary[token]])
                            prepared[primary[token]] = {} //USDT:{}
                        prepared[primary[token]][secondary] = [ask, pair] //{USDT:{BTC:1/ask}}
                    }
                }
            }
        }
        return prepared
    },
    getPriceBinance_update: async function getPriceBinance_update(all_tickers) {
        let primary = ['USDT', 'BTC', 'BUSD', 'ETH']
        let data = await all_tickers;
        var coinremove = ['BNB', 'XRP', 'LUNA', 'TFUEL', 'XLM', 'IOST', 'KAVA', 'XEM', 'HBAR', 'MDX','KSM','FIL'];
        if (data) {
            var prepared = {}
            for (let ticker of Object.keys(data)) {  //BTCUSDT
                let pair = ticker;
                var lastPrice = data[ticker].price;
                for (let token in primary) {
                    let base = pair.replace(primary[token],'');
                    if (pair.endsWith(primary[token]) && !coinremove.includes(base)) { //BTCUSDT ends with USDT/BTC/BNB      
                        let secondary = pair.replace(primary[token], '')
                                if (lastPrice > 0) {
                                    if (!prepared[primary[token]])
                                        prepared[primary[token]] = {} //USDT:{}
                                    if (!prepared[secondary])
                                        prepared[secondary] = {} //BTC:{}
                                    prepared[primary[token]][secondary] = [1 / lastPrice, pair,lastPrice] //{USDT:{BTC:1/ask}}
                                    prepared[secondary][primary[token]] = [lastPrice, pair,lastPrice] //{BTC:{USDT:bid}}
                                }
                        }
                    }
                }
            return prepared
        }
    },
}
