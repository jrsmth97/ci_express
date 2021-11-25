const view = require('./view');
const globals = require('./global');
const express = require('express');
const router = express.Router();
const glob = require('glob');
// const q = require('q')

const app = view.app;
app.use(globals());

require(`${APPPATH}config/routes`);

const getController = (req, res) => {
    let link = req.baseUrl;
    if(link == '/' || link == '') {
        link = `/${ROUTE.defaultController}`;
    }

    let query = req.query;
    let linkSplit = link.split('/');
    let linkPath = ''
    for (let i = 0; i < linkSplit.length; i++) {
        if (linkSplit[i] == '') {
            continue;
        }
        linkPath += '/' + linkSplit[i]
        let pathName = (linkPath + '.js').substring(1);

        glob(
            pathName,
            { cwd: 'application/controllers' },
            (err, arr) => {
                if (arr.length > 0) {
                    const controllerClass = require('../../application/controllers/' + pathName);
                    const controllerSlice = linkSplit.slice(i + 1);
                    const controllerMethod = controllerSlice[0] == '' || controllerSlice[0] === undefined ? 'index' : controllerSlice[0];
                    const controllerParams = controllerSlice.slice(1);
                    const controller = new controllerClass(req, res);

                    controllerParams.push({
                        baseUrl: link,
                        query: query
                    })
                    console.log('method', controllerMethod)
                    controller[controllerMethod](...controllerParams);
                }
            }
        )
    }
}

router.use('*', function (req, res) {
    getController(req, res)
})


module.exports = router