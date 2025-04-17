//v7 imports
import user from "./api/v1/controllers/user/routes";
import staticContent from "./api/v1/controllers/static/routes";
import wallet from "./api/v1/controllers/wallet/routes";
import triangularArbitrage from "./api/v1/controllers/triangularArbitrage/routes";
import directArbitrage from "./api/v1/controllers/directArbitrage/routes";
import IntraArbitrage from "./api/v1/controllers/intraArbitrage/routes";
import LoopArbitrage from "./api/v1/controllers/loopArbitrage/routes";
import notification from "./api/v1/controllers/notification/routes";
import analytics from "./api/v1/controllers/analytics/routes";
import admin from "./api/v1/controllers/admin/routes"
import intraArbitrageSingleExchange from "./api/v1/controllers/intraArbitrageSingleExchange/routes"
import userManagement from "./api/v1/controllers/userManagement/routes"
import subAdmin from "./api/v1/controllers/subAdmin/routes"

/**
 *
 *
 * @export
 * @param {any} app
 */

export default function routes(app) {

  app.use('/api/v1/user', user);
  app.use('/api/v1/static', staticContent);
  app.use('/api/v1/wallet', wallet);
  app.use('/api/v1/triangularArbitrage', triangularArbitrage);
  app.use('/api/v1/directArbitrage', directArbitrage);
  app.use('/api/v1/IntraArbitrage', IntraArbitrage);
  app.use('/api/v1/LoopArbitrage', LoopArbitrage);
  app.use('/api/v1/notification', notification);
  app.use('/api/v1/analytics', analytics);
  app.use('/api/v1/admin', admin);
  app.use('/api/v1/intraArbitrageSingleExchange', intraArbitrageSingleExchange);
  app.use('/api/v1/userManagement', userManagement);
  app.use('/api/v1/subAdmin', subAdmin);

  return app;
}
