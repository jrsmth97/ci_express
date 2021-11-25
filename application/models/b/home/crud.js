class Crud extends CE_Model {
    constructor(req, res) {
        super(req, res)   
    }

    async test(){
        const results = await this.db.query("SELECT * FROM mahasiswa")
        console.log(results)
    }
}

module.exports = Crud;