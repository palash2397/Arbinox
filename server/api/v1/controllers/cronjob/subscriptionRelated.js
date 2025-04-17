const CronJob = require('cron').CronJob;
import axios from 'axios';
import { buySubsciptionPlanHistoryServices } from '../../services/buySubscriptionPlanHistory'
const { buySubscriptionhPlanList, buySubsciptionPlanUpdate, lastedBuyPlan, buySubsciptionPlanData, buySubsciptionPlanCreate, buySubsciptionPlanCount } = buySubsciptionPlanHistoryServices
import config from "config";
import status from '../../../../enums/status';
import { subscriptionPlanServices } from '../../services/subscriptionPlan'
const { subscriptionPlanList, updateSubscriptionPlan, findSubscriptionPlan } = subscriptionPlanServices
import { userServices } from '../../services/user'
const { updateUserById, findUser, updateUser, findAllUser } = userServices
import commonFunction from '../../../../helper/util';
import paymentType from '../../../../enums/paymentType';
import userType from '../../../../enums/userType';


var inActivePlanStatus = new CronJob('*/1 * * * * *', async function () {
    try {
        inActivePlanStatus.stop();
        let inactivePlan = await buySubscriptionhPlanList({ endTime: { $lte: new Date() }, planStatus: 'ACTIVE', status: status.ACTIVE })
        if (inactivePlan.length == 0) {
            inActivePlanStatus.start();
        } else {
            inActivePlanStatus.stop();
        }
        for (let i = 0; i < inactivePlan.length; i++) {
            let resul = await buySubsciptionPlanUpdate({ _id: inactivePlan[i]._id }, { planStatus: 'INACTIVE' })
            await updateUserById({ _id: inactivePlan[i].userId._id }, { subscriptionPlaneStatus: false, planCapitalAmount: 0, planProfit: 0, currentPlanStatus: "INACTIVE" })
            if (i === inactivePlan.length - 1) {
                inActivePlanStatus.start();
            }
            console.log("inActivePlanStatus", resul)
        }
        inActivePlanStatus.start();
    } catch (error) {
        inActivePlanStatus.start();
        console.log('inActivePlanStatus error', error)
    }
})

var inActiveSubscriptionPlanStatus = new CronJob('*/1 * * * * *', async function () {
    try {
        let inactivePlan = await subscriptionPlanList({ endTime: { $lte: new Date() }, planStatus: 'ACTIVE', status: status.ACTIVE })
        if (inactivePlan.length == 0) {
            inActiveSubscriptionPlanStatus.start();
        } else {
            inActiveSubscriptionPlanStatus.stop();
        }
        for (let i = 0; i < inactivePlan.length; i++) {
            let result = await updateSubscriptionPlan({ _id: inactivePlan[i]._id }, { planStatus: 'INACTIVE' })
            if (i === inactivePlan.length - 1) {
                inActiveSubscriptionPlanStatus.start();
            }
        }
        inActiveSubscriptionPlanStatus.start();
    } catch (error) {
        inActiveSubscriptionPlanStatus.start();
        console.log('inActiveSubscriptionPlanStatus error', error)
    }
})

var cashSubscriptionMail = new CronJob('*/10 * * * * *', async function () {
    try {
        cashSubscriptionMail.stop();
        var endTime = new Date();
        var toDate = new Date();
        toDate.setTime(toDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        let inActivePlan = await buySubscriptionhPlanList({ $and: [{ endTime: { $gte: endTime } }, { endTime: { $lte: toDate } }], planStatus: 'ACTIVE', status: status.ACTIVE, paymentType: { $in: [paymentType.CASH, paymentType.FREE] } })
        for (let i = 0; i < inActivePlan.length; i++) {
            let user = await findUser({ _id: inActivePlan[i].userId, status: status.ACTIVE })
            if (user) {
                await commonFunction.mailForExpCashPayment(user.email)
                console.log("send Mail........................")
            }
        }
        cashSubscriptionMail.start();
    } catch (error) {
        cashSubscriptionMail.start();
        console.log('cashSubscriptionMail error', error)
    }
})


inActivePlanStatus.start()
// inActivePlanStatus.stop()


// cashSubscriptionMail.start()



//////////////////////////////////////////////not use//////////////////////////////////
// inActiveSubscriptionPlanStatus.start()
// inActiveSubscriptionPlanStatus.stop()