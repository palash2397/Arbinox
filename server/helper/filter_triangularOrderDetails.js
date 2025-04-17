// Binance module call
const Binance = require("binance-api-node").default;

const util = require('util');
const axios = require('axios');
const request = require('request');
const requestPromise = util.promisify(request);

module.exports = {
    filter_triangularOrderDetails: async (exchange, orderDetails) => {
        switch (exchange) {
            case 'Binance':
                if (orderDetails) {
                    console.log(orderDetails, 'filter triangular order details===> 31');
                    if (orderDetails.status == 'FILLED') {
                        orderDetails.orderStatus = 'closed';
                        orderDetails.orderAmount = orderDetails.origQty - (orderDetails.origQty * 0.1 / 100);
                        // orderDetails.orderAmount = orderDetails.origQty;
                        orderDetails.orderFilledTotal = orderDetails.cummulativeQuoteQty;
                    }
                    else {
                        if (orderDetails.status == 'NEW') {
                            orderDetails.orderStatus = 'open';
                        }
                        else if (orderDetails.status == 'CANCELED') {
                            orderDetails.orderStatus = 'cancelled';
                        }
                    }
                    return orderDetails;
                }
                break;
            case 'Coinbase':
                let statusArray = ['CANCELLED', 'FAILED', 'EXPIRED', 'UNKNOWN_ORDER_STATUS', 'CANCEL_QUEUED']
                let statusArray1 = ['PENDING', 'OPEN', 'QUEUED']
                try {
                    if (orderDetails.status == 'FILLED') {
                        orderDetails.orderStatus = 'closed';
                        // orderDetails.orderAmount = parseFloat(orderDetails.filled_size) - (parseFloat(orderDetails.filled_size) * 0.6 / 100);
                        orderDetails.orderAmount = parseFloat(orderDetails.filled_size) - (parseFloat(orderDetails.filled_size) * 0.6 / 100);
                        // orderDetails.orderFilledTotal = orderDetails.filled_value;
                        orderDetails.orderFilledTotal = orderDetails.total_value_after_fees
                    } else if (statusArray1.includes(orderDetails.status)) {
                        orderDetails.orderStatus = 'open';
                    }
                    else if (statusArray.includes(orderDetails.status)) {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    return orderDetails
                } catch (error) {
                    console.log('235 Coinbase ==>', error, new Date().toLocaleString());
                }
                break;

            case 'Huobi':
                try {

                    if (orderDetails.state == 'filled') {
                        orderDetails.orderStatus = 'closed';
                        orderDetails.orderAmount = parseFloat(orderDetails.amount - orderDetails['field-fees']);
                        // orderDetails.orderAmount = parseFloat(orderDetails.amount);
                        orderDetails.orderFilledTotal = orderDetails.orderAmount * orderDetails.price;
                    }
                    else if (orderDetails.state == 'canceled') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.state == 'submitted') {
                        orderDetails.orderStatus = 'open';
                    }
                    return orderDetails;
                }
                catch (error) {
                    console.log('144 ==>', error, new Date().toLocaleString());
                }
                break;
            case 'Kraken':
                try {
                    console.log("========================================>>>>", orderDetails)
                    if (orderDetails.status == 'closed') {
                        orderDetails.orderStatus = 'closed';
                        // orderDetails.orderAmount = parseFloat(orderDetails.vol - orderDetails['fee']);
                        // orderDetails.orderFilledTotal = orderDetails.orderAmount * orderDetails.price;
                        orderDetails.orderAmount = orderDetails.vol_exec;
                        orderDetails.orderFilledTotal = orderDetails.cost;
                    }
                    else if (orderDetails.status == 'canceled') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.status == 'open') {
                        orderDetails.orderStatus = 'open';
                    }
                    return orderDetails;
                }
                catch (error) {
                    console.log('144 ==>', error, new Date().toLocaleString());
                }
                break;
            case 'Mexc':
                try {
                    if (orderDetails.status == 'FILLED') {
                        orderDetails.orderStatus = 'closed';
                        // orderDetails.orderAmount = orderDetails.origQty - (orderDetails.origQty * 0.1 / 100);
                        orderDetails.orderAmount = orderDetails.executedQty;
                        orderDetails.orderFilledTotal = orderDetails.cummulativeQuoteQty;
                    }
                    else if (orderDetails.status == 'CANCELED') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.status == 'NEW') {
                        orderDetails.orderStatus = 'open';
                    }
                    return orderDetails
                } catch (error) {
                    console.log('235 mexc ==>', error, new Date().toLocaleString());
                }
                break;
            case 'Bitmart':
                try {
                    if (orderDetails.state == 'filled') {
                        orderDetails.orderStatus = 'closed';
                        orderDetails.orderAmount = orderDetails.filledSize;
                        orderDetails.orderFilledTotal = orderDetails.filledNotional;
                    }
                    else if (orderDetails.state == 'canceled' || orderDetails.state == 'failed') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.state == 'new' || orderDetails.state == 'partially_filled') {
                        orderDetails.orderStatus = 'open';
                    }
                    //  ====================WORKING OLD VERSION=================
                    // if (orderDetails.status == '6' && orderDetails.unfilled_volume == 0) {
                    //     orderDetails.orderStatus = 'closed';
                    //     orderDetails.orderAmount = orderDetails.filled_size;
                    //     orderDetails.orderFilledTotal = orderDetails.filled_notional;
                    // }
                    // else if (orderDetails.status == '8' && orderDetails.unfilled_volume > 0) {
                    //     orderDetails.orderStatus = 'cancelled';
                    // }
                    // else if (orderDetails.status == '4' || orderDetails.status == '5' && orderDetails.unfilled_volume > 0) {
                    //     orderDetails.orderStatus = 'open';
                    // }
                    return orderDetails
                } catch (error) {
                    console.log('235 Bitstamp ==>', error, new Date().toLocaleString());
                }
                break;
            case "Gateio":
                try {
                    if (orderDetails.status == 'closed') {
                        orderDetails.orderStatus = 'closed';
                        orderDetails.orderAmount = parseFloat(orderDetails.filled_amount) - parseFloat(orderDetails.fee);
                        orderDetails.orderFilledTotal = orderDetails.filled_total;
                    }
                    else if (orderDetails.status == 'cancelled') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.status == 'open') {
                        orderDetails.orderStatus = 'open';
                    }
                    return orderDetails
                } catch (error) {
                    console.log("144==>>>>>>>>>>>>", error)
                }
                break;
            case "HitBTC":
                try {
                    if (orderDetails.status == 'filled') {
                        orderDetails.orderStatus = 'closed';
                        orderDetails.orderAmount = parseFloat(orderDetails.quantity) - (parseFloat(orderDetails.quantity) * 0.27 / 100);
                        orderDetails.orderFilledTotal = orderDetails.quantity_cumulative;
                    }
                    else if (orderDetails.status == 'canceled') {
                        orderDetails.orderStatus = 'cancelled';
                    }
                    else if (orderDetails.status == 'new') {
                        orderDetails.orderStatus = 'open';
                    }
                    return orderDetails
                } catch (error) {
                    console.log("132==>>>>>>>>>>>>", error)
                }
                break;
        }

    },
}