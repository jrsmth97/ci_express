class Crud extends NI_Model {
    constructor(req, res) {
        super(req, res)   
    }

    async test(){
        this.db.where('nama', 'marx')
        const results = await this.db.get('mahasiswa')
        console.log(results)
    }
}

module.exports = Crud;