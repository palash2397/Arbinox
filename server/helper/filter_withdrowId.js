module.exports = {
    filter_withdrowId: (exchange, data) => {
        let withdrowId;
        switch (exchange) {
            case 'Binance':
                withdrowId = data.id;
                break;
            case 'Coinbase':
                withdrowId = data.id;
                break;
            case 'Huobi':
                withdrowId = data.withdrawId;
                break;
            case 'Kraken':
                withdrowId = data.refid;
                break;
            case 'Mexc':
                withdrowId = data.id;
                break;
            case 'Bitmart':
                withdrowId = data.withdraw_id;
                break;
            case 'Gateio':
                withdrowId = data.txid;
                break;
            case 'HitBTC':
                withdrowId = data.id;
                break;
        }
        return withdrowId;
    },
}