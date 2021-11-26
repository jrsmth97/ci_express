
class Berita extends NI_Controller {

    constructor(req, res) {
        super(req, res);
        this.load.model('b/home/crud', 'crud');
    }

    index(param1 = '', param2 = '', param3 = '', params = {}) {
        console.log('Berita Index has loaded. |', param1, '|', param2, '|', param3);
        console.log('ini queryString ctrl', params.query);

        this.crud.test();
        this.load.view('back/home/index', { judul: 'judul test' });
    }
}

module.exports = Berita;