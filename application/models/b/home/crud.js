class Crud extends NI_Model {
    constructor(req, res) {
        super(req, res)   
    }

    async test(){
        // this.db.where('nama', 'marx')
        // const results = await this.db.where('nama', 'marx').get('mahasiswa')
        // const results = await this.db.query("INSERT INTO mahasiswa (nama, nim, email, no_hp) VALUES ('smith', 699, 'smith@mail.com', '889787')").affected_rows()

        const data = {
            nama: 'anu',
            nim: 69,
            email: 'anu@mail.com',
            no_hp: '082636772',
        }
        const results = await this.db.insert('mahasiswa', data)
        console.log(results)
    }
}

module.exports = Crud;