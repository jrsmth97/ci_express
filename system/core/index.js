require('dotenv').config();
const router = require('./router');
const view = require('./view');
const NI_Controller = require('./controller');
const NI_Model = require('./model');

global.NI_Controller = NI_Controller;
global.NI_Model = NI_Model;

const app = view.app;

app.use(view.express.static('assets'));

app.listen(process.env.APP_PORT, (a)=>{
    // console.log('Running on port '+ process.env.APP_PORT);
})
app.get('*', router);
module.exports = {}
