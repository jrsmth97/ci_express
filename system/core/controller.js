
class NI_Controller {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.view = require('./view');
        this.model;
        this.app = this.view.app;
    }

    load = {
        view: (path, data) => {
            this.view.render(this.res, path, data)
        },
        model: (path, alias) => {
            let Model = require(APPPATH +'models/'+ path);
            this[alias] = new Model();
        }
    }

}
module.exports = NI_Controller;