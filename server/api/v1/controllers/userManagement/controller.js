import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import status from '../../../../enums/status';
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { walletServices } from '../../services/wallet';
const { findUser, updateUser, findUserCount, createUser } = userServices;
const { coinsData, exchangeList, exchangesList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate, deleteExchange, withdrawHistoryList, paginateSearchWithdrawHistory, paginateSearchDepositeHistory, findCount, connectedExchangeList, createWithdrawHistory, connectedExchangeCount } = walletServices;
import { orderServices } from '../../services/order'
const { paginateSearchTransactionHistory, orderCount, orderList } = orderServices
import { directServices } from '../../services/directarbitrage'
const { directHighestCount, directArbitrageList } = directServices
import { loopServices } from '../../services/looparbitrage'
const { loopHighestProfit, loopArbitrageList } = loopServices
import { triangularServices } from '../../services/triangular'
const { triangularHighestProfit, triangularAllList } = triangularServices
import arbitrageStatus from '../../../../enums/arbitrageStatus'

import { intraAbitrageSingleExchangeServices } from "../../services/intraArbitrageSingleExchange"
const { intraArbitrageSingleExchangeHighestCount, intraArbitrageSingleExchangeAllList } = intraAbitrageSingleExchangeServices

export class userManagementController {

    /**
     * @swagger
     * /userManagement/Dashboard:
     *   get:
     *     tags:
     *       - User Management
     *     description: Retrieve the dashboard for the given userId.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: true
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async Dashboard(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: req.query.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let orderCountQuery = { userId: userResult._id }
            let connectedExchangeCountQuery = { status: status.ACTIVE, userId: userResult._id }
            let highestcountQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let lossToaltQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $lte: 0 } }
            let dateQuery = {}
            const { fromDate, toDate } = req.query
            if (fromDate && !toDate) {
                dateQuery.createdAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.createdAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { createdAt: { $gte: fromDate } },
                    { createdAt: { $lte: toDate } },
                ]
            }
            orderCountQuery = { ...orderCountQuery, ...dateQuery };
            // connectedExchangeCountQuery = { ...connectedExchangeCountQuery, ...dateQuery };
            highestcountQuery = { ...highestcountQuery, ...dateQuery };
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            lossToaltQuery = { ...lossToaltQuery, ...dateQuery }
            const [
                totalArbitrage,
                totalConnectedExchange,
                directHightestProfit,
                loopHighestProfitRes,
                triangularHighestProfitRes,
                intraArbitrageSingleExchangeHighestProfitRes,
                totalDirectProfitRes,
                totalLoopProfitRes,
                totalTriangularProfitRes,
                totalIntraArbitrageSingleExchageProfitRes,
                totalDirectLossRes,
                totalLoopLossRes,
                totalTriangularLossRes,
                totalIntraArbitrageSingleExchangeLossRes] = await Promise.all([
                    orderCount(orderCountQuery),
                    connectedExchangeCount(connectedExchangeCountQuery),
                    directHighestCount(highestcountQuery),
                    loopHighestProfit(highestcountQuery),
                    triangularHighestProfit(highestcountQuery),
                    intraArbitrageSingleExchangeHighestCount(highestcountQuery),
                    directArbitrageList(profitTotalQuery),
                    loopArbitrageList(profitTotalQuery),
                    triangularAllList(profitTotalQuery),
                    intraArbitrageSingleExchangeAllList(profitTotalQuery),
                    directArbitrageList(lossToaltQuery),
                    loopArbitrageList(lossToaltQuery),
                    triangularAllList(lossToaltQuery),
                    intraArbitrageSingleExchangeAllList(lossToaltQuery),
                ])
            let directProfit = 0, loopProfit = 0, triangularProfit = 0, intraArbitrageSingleExchangeProfit = 0, totalDirectProfit = 0, totalLoopProfit = 0, totalTriangularProfit = 0, totalIntraArbitrageSingleExchangeProfit = 0, totalDirectLoss = 0, totalLoopLoss = 0, totalTriangularLoss = 0, totalIntraArbitrageSingleExchangeLoss = 0
            if (directHightestProfit.length != 0) {
                directProfit = directHightestProfit[0].profit
            }
            if (loopHighestProfitRes.length != 0) {
                loopProfit = loopHighestProfitRes[0].profit
            }
            if (triangularHighestProfitRes.length != 0) {
                triangularProfit = triangularHighestProfitRes[0].profit
            }

            if (intraArbitrageSingleExchangeHighestProfitRes.length != 0) {
                intraArbitrageSingleExchangeProfit = intraArbitrageSingleExchangeHighestProfitRes[0].profit
            }
            let arrayData = [directProfit, loopProfit, triangularProfit, intraArbitrageSingleExchangeProfit]
            var largest = 0;

            for (let i = 0; i < arrayData.length; i++) {
                if (arrayData[i] > largest) {
                    largest = arrayData[i];
                }
            }
            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalLoopProfitRes.length != 0) {
                totalLoopProfit = totalLoopProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (totalIntraArbitrageSingleExchageProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleExchageProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
            }

            if (totalDirectLossRes.length != 0) {
                totalDirectLoss = totalDirectLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalLoopLossRes.length != 0) {
                totalLoopLoss = totalLoopLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularLossRes.length != 0) {
                totalTriangularLoss = totalTriangularLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalIntraArbitrageSingleExchangeLossRes.length != 0) {
                totalIntraArbitrageSingleExchangeLoss = totalIntraArbitrageSingleExchangeLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }

            let dashboard = {
                totalArbitrage: totalArbitrage,
                totalConnectedExchange: totalConnectedExchange,
                highestProfit: largest,
                totalProfit: totalDirectProfit + totalLoopProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalLoss: totalTriangularLoss + totalLoopLoss + totalDirectLoss + totalIntraArbitrageSingleExchangeLoss
            }
            return res.json(new response(dashboard, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /userManagement/DashboardRecentData:
     *   get:
     *     tags:
     *       - User Management
     *     description: Retrieve the dashboard for the given userId.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: true
     *       - name: hour
     *         description: hour
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async DashboardRecentData(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: req.query.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let dateQuery = {}
            const fromDate = new Date(new Date().setHours(new Date().getHours() - Number(req.query.hour)))
            const toDate = new Date()
            if (fromDate && !toDate) {
                dateQuery.updatedAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.updatedAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { updatedAt: { $gte: fromDate } },
                    { updatedAt: { $lte: toDate } },
                ]
            }
            let profitPath30Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath60Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 60)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath90Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 90)) } }, { updatedAt: { $lte: toDate } }] }
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            const [totalDirectProfitRes, totalTriangularProfitRes, totalIntraArbitrageSingleProfitRes, totaldirect30dayprofit, totaltriangular30dayprofit, totalIntraArbitrageSingle30dayprofit, totaldirect60dayprofit, totaltriangular60dayprofit, totalIntraArbitrageSingle60dayprofit, totaldirect90dayprofit, totaltriangular90dayprofit, totalIntraArbitrageSingle90dayprofit] = await Promise.all([
                directArbitrageList(profitTotalQuery),
                triangularAllList(profitTotalQuery),
                intraArbitrageSingleExchangeAllList(profitTotalQuery),
                directArbitrageList(profitPath30Day),
                triangularAllList(profitPath30Day),
                intraArbitrageSingleExchangeAllList(profitPath30Day),
                directArbitrageList(profitPath60Day),
                triangularAllList(profitPath60Day),
                intraArbitrageSingleExchangeAllList(profitPath60Day),
                directArbitrageList(profitPath90Day),
                triangularAllList(profitPath90Day),
                intraArbitrageSingleExchangeAllList(profitPath90Day)
            ])
            let totalDirectProfit = 0, totalTriangularProfit = 0, totalDirectCapitalAmount = 0, totalTriangularCapitalAmount = 0, totalIntraArbitrageSingleExchangeProfit = 0, totalIntraArbitrageSingleExchangeCapitalAmount = 0
            let finalTotalDirect30DayProfit = 0, finalTotalDirect30DayCapital = 0, finalTotalTriangular30DayProfit = 0, finalTotalTriangular30DayCapital = 0, finalTotalIntraArbitrageSingleExchange30DayProfit = 0, finalTotalIntraArbitrageSingleExchange30DayCapital = 0
            let finalTotalDirect60DayProfit = 0, finalTotalDirect60DayCapital = 0, finalTotalTriangular60DayProfit = 0, finalTotalTriangular60DayCapital = 0, finalTotalIntraArbitrageSingleExchange60DayProfit = 0, finalTotalIntraArbitrageSingleExchange60DayCapital = 0
            let finalTotalDirect90DayProfit = 0, finalTotalDirect90DayCapital = 0, finalTotalTriangular90DayProfit = 0, finalTotalTriangular90DayCapital = 0, finalTotalIntraArbitrageSingleExchange90DayProfit = 0, finalTotalIntraArbitrageSingleExchange90DayCapital = 0

            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
                totalDirectCapitalAmount = totalDirectProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                totalTriangularCapitalAmount = totalTriangularProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingleProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                totalIntraArbitrageSingleExchangeCapitalAmount = totalIntraArbitrageSingleProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaldirect30dayprofit.length != 0) {
                finalTotalDirect30DayProfit = totaldirect30dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect30DayCapital = totaldirect30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular30dayprofit.length != 0) {
                finalTotalTriangular30DayProfit = totaltriangular30dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular30DayCapital = totaltriangular30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            if (totalIntraArbitrageSingle30dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange30DayProfit = totalIntraArbitrageSingle30dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange30DayCapital = totalIntraArbitrageSingle30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            if (totaldirect60dayprofit.length != 0) {
                finalTotalDirect60DayProfit = totaldirect60dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect60DayCapital = totaldirect60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular60dayprofit.length != 0) {
                finalTotalTriangular60DayProfit = totaltriangular60dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular60DayCapital = totaltriangular60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingle60dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange60DayProfit = totalIntraArbitrageSingle60dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange60DayCapital = totalIntraArbitrageSingle60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaldirect90dayprofit.length != 0) {
                finalTotalDirect90DayProfit = totaldirect90dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect90DayCapital = totaldirect90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular90dayprofit.length != 0) {
                finalTotalTriangular90DayProfit = totaltriangular90dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular90DayCapital = totaltriangular90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingle90dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange90DayProfit = totalIntraArbitrageSingle90dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange90DayCapital = totalIntraArbitrageSingle90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            let dashboard = {
                totalProfit: totalDirectProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalCapital: totalDirectCapitalAmount + totalTriangularCapitalAmount + totalIntraArbitrageSingleExchangeCapitalAmount,
                total30DayProfit: finalTotalDirect30DayProfit + finalTotalTriangular30DayProfit + finalTotalIntraArbitrageSingleExchange30DayProfit,
                total30dayCaptial: finalTotalDirect30DayCapital + finalTotalTriangular30DayCapital + finalTotalIntraArbitrageSingleExchange30DayCapital,
                total60DayProfit: finalTotalDirect60DayProfit + finalTotalTriangular60DayProfit + finalTotalIntraArbitrageSingleExchange60DayProfit,
                total60dayCaptial: finalTotalDirect60DayCapital + finalTotalTriangular60DayCapital + finalTotalIntraArbitrageSingleExchange60DayCapital,
                total90DayProfit: finalTotalDirect90DayProfit + finalTotalTriangular90DayProfit + finalTotalIntraArbitrageSingleExchange90DayProfit,
                total90dayCaptial: finalTotalDirect90DayCapital + finalTotalTriangular90DayCapital + finalTotalIntraArbitrageSingleExchange90DayCapital
            }
            return res.json(new response(dashboard, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /userManagement/cryptoAssetprofit:
     *   get:
     *     tags:
     *       - User Management
     *     description: Retrieve the dashboard for the given userId.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: true
     *       - name: hour
     *         description: hour
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async cryptoAssetprofit(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: req.query.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let dateQuery = {}
            const fromDate = new Date(new Date().setHours(new Date().getHours() - Number(req.query.hour)))
            const toDate = new Date()
            if (fromDate && !toDate) {
                dateQuery.updatedAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.updatedAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { updatedAt: { $gte: fromDate } },
                    { updatedAt: { $lte: toDate } },
                ]
            }
            let profitPath30Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath60Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 60)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath90Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 90)) } }, { updatedAt: { $lte: toDate } }] }
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            const [totalTriangularProfitRes, totaltriangular30dayprofit, totaltriangular60dayprofit, totaltriangular90dayprofit] = await Promise.all([
                triangularAllList(profitTotalQuery),
                triangularAllList(profitPath30Day),
                triangularAllList(profitPath60Day),
                triangularAllList(profitPath90Day),
            ])
            var btcProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'BTC' });
            var ethProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'ETH' });
            var usdtProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'USDT' });

            var btc30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'USDT' });

            var btc60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'USDT' });

            var btc90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'USDT' });

            let obj1 = { profit: 0, crypto: 'BTC' }
            let obj2 = { profit: 0, crypto: 'ETH' }
            let obj3 = { profit: 0, crypto: 'USDT' }
            if (btcProfitRes.length != 0) {
                obj1.profit = btcProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (ethProfitRes.length != 0) {
                obj2.profit = ethProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdtProfitRes.length != 0) {
                obj3.profit = usdtProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj31 = { profit: 0, crypto: 'BTC' }
            let obj32 = { profit: 0, crypto: 'ETH' }
            let obj33 = { profit: 0, crypto: 'USDT' }
            if (btc30ProfitRes.length != 0) {
                obj31.profit = btc30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth30ProfitRes.length != 0) {
                obj32.profit = eth30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt30ProfitRes.length != 0) {
                obj33.profit = usdt30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj61 = { profit: 0, crypto: 'BTC' }
            let obj62 = { profit: 0, crypto: 'ETH' }
            let obj63 = { profit: 0, crypto: 'USDT' }
            if (btc60ProfitRes.length != 0) {
                obj61.profit = btc60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth60ProfitRes.length != 0) {
                obj62.profit = eth60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt60ProfitRes.length != 0) {
                obj63.profit = usdt60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj91 = { profit: 0, crypto: 'BTC' }
            let obj92 = { profit: 0, crypto: 'ETH' }
            let obj93 = { profit: 0, crypto: 'USDT' }
            if (btc90ProfitRes.length != 0) {
                obj91.profit = btc90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth90ProfitRes.length != 0) {
                obj92.profit = eth90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt90ProfitRes.length != 0) {
                obj93.profit = usdt90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let arr1 = [obj1, obj2, obj3]
            let result = arr1.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
            let arr2 = [obj31, obj32, obj33]
            let result1 = arr2.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let arr3 = [obj61, obj62, obj63]
            let result2 = arr3.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let arr4 = [obj91, obj92, obj93]
            let result3 = arr4.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let obj = {
                topPerformingCrypto: result[0],
                topPerformingCrypto30: result1[0],
                topPerformingCrypto60: result2[0],
                topPerformingCrypto90: result3[0],
            }

            return res.json(new response(obj, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /userManagement/connectedExchangeList:
    *   get:
    *     tags:
    *       - User Management
    *     description: Retrieve the dashboard for the given userId.
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: userId
    *         description: userId
    *         in: query
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async connectedExchangeList(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.SUBADMIN, userType.ADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            else {
                let userResult = await findUser({ _id: req.query.userId, status: { $ne: status.DELETE } });
                if (!userResult) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                let connectedExchangeList = new Array;
                for (let i = 0; i < userResult.connectedExchange.length; i++) {
                    let connectedExchange = await connectedExchangeData({ _id: userResult.connectedExchange[i], userId: userResult._id, status: { $ne: status.DELETE } });
                    if (connectedExchange) {
                        let responseData;
                        let exchangeDetails = await exchangeData({ uid: connectedExchange.uid });
                        if (exchangeDetails) {
                            responseData = {
                                _id: connectedExchange._id,
                                exchangeName: exchangeDetails.exchangeName,
                                exchangeUID: connectedExchange.uid,
                                // apiKey: connectedExchange.apiKey
                            }
                            await connectedExchangeList.push(responseData);
                        }
                    }
                }
                if (connectedExchangeList.length != 0) {
                    return res.json(new response(connectedExchangeList, responseMessage.EXCHANGE_DETAILS));
                } else {
                    return res.json(new response([], responseMessage.NOT_CONNECTED));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /userManagement/connectedExchangePreviousList:
    *   get:
    *     tags:
    *       - User Management
    *     description: List of connected exchanges
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: userId
    *         description: userId
    *         in: query
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async connectedExchangePreviousList(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.SUBADMIN, userType.ADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: req.query.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let connectRes = await connectedExchangeList({ userId: userResult._id, status: status.DELETE })
            if (connectRes.length != 0) {
                let result = []
                for (let i = 0; i < connectRes.length; i++) {
                    let obj = {
                        _id: connectRes[i]._id,
                        exchangeUID: connectRes[i].uid,
                        apiKey: connectRes[i].apiKey
                    }
                    result.push(obj)
                }
                return res.json(new response(result, responseMessage.EXCHANGE_DETAILS));
            } else {
                throw apiError.notFound(responseMessage.NOT_CONNECTED);
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /userManagement/userDashboard:
     *   get:
     *     tags:
     *       - User Management
     *     description: Get user dashboard
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async userDashboard(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, profit: { $gte: 0 } }
            let [totalUser, activeUser, blockUser, totalSubAdmin, activeSubAdmin, blockSubAdmin, totalTransaction, totalDirectProfitRes, totalTriangularProfitRes, totalIntraArbitrageSingleExchageProfitRes, totalWithoutPlanUser, totalPlanUser] = await Promise.all([
                findUserCount({ status: { $ne: status.DELETE }, userType: userType.USER }),
                findUserCount({ status: status.ACTIVE, userType: userType.USER }),
                findUserCount({ status: status.BLOCK, userType: userType.USER }),
                findUserCount({ status: { $ne: status.DELETE }, userType: userType.SUBADMIN }),
                findUserCount({ status: status.ACTIVE, userType: userType.SUBADMIN }),
                findUserCount({ status: status.BLOCK, userType: userType.SUBADMIN }),
                orderCount({ status: { $ne: status.DELETE } }),
                directArbitrageList(profitTotalQuery),
                triangularAllList(profitTotalQuery),
                intraArbitrageSingleExchangeAllList(profitTotalQuery),
                findUserCount({ subscriptionPlaneStatus: false, status: { $ne: status.DELETE }, userType: userType.USER }),
                findUserCount({ subscriptionPlaneStatus: true, status: { $ne: status.DELETE }, userType: userType.USER }),
            ])
            let totalDirectProfit = 0, totalTriangularProfit = 0, totalIntraArbitrageSingleExchangeProfit = 0
            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (totalIntraArbitrageSingleExchageProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleExchageProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
            }
            let obj = {
                totalUser: totalUser,
                activeUser: activeUser,
                blockUser: blockUser,
                totalSubAdmin: totalSubAdmin,
                activeSubAdmin: activeSubAdmin,
                blockSubAdmin: blockSubAdmin,
                totalTransaction: totalTransaction,
                totalProfit: totalDirectProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalWithoutPlanUser: totalWithoutPlanUser,
                totalPlanUser: totalPlanUser
            }
            return res.json(new response(obj, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

}
export default new userManagementController()