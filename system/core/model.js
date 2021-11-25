require('dotenv').config()
const mysql = require('mysql')

class CE_Model {
    constructor(req, res) {
        this.req = req
        this.res = res
        this.dbConnect = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        })
    }

    db = {
        query: async (sqlQuery) => {
            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result)
                }
                this.dbConnect.query(sqlQuery, callback)
            }).catch(err => { throw err })
        },
        get: async (table, whereRow, whereValue) {
            const row = mysql.escape(whereRow)
            const value = mysql.escape(whereValue)

            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result)
                }
                this.dbConnect.query(table, callback)
            }).catch(err => { throw err })
        }
    }
}

module.exports = CE_Model
