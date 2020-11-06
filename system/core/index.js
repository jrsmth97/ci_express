require('dotenv').config();
const router = require('./router');
const view = require('./view');
const CE_Controller = require('./controller');

global.CE_Controller = CE_Controller;

const app = view.app;

app.use(view.express.static('assets'));

app.listen(process.env.APP_PORT, (a)=>{
    // console.log('Running on port '+ process.env.APP_PORT);
})
app.get('*', router);
module.exports = {}
