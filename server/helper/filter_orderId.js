module.exports = {
    filter_orderId: (exchange, data) => {
        let orderId;
        switch (exchange) {
            case 'Binance':
                return data.orderId;
            case 'Coinbase':
                return data.order_id
            case 'Huobi':
                return data.orderid;
            case 'Kraken':
                return data.txid[0];
            case 'Mexc':
                return data.orderId
            case 'Bitmart':
                return data.order_id
            case 'Gateio':
                return data.id
            case 'HitBTC':
                return data.client_order_id
        }
        return orderId;
    },
}