const mysql = require('mysql')
const dbConfig = require('../../application/config/database')

class NI_Model {
    constructor(req, res) {
        this.req = req
        this.res = res
        this.dbConnect = mysql.createConnection({
            host: dbConfig.HOST,
            user: dbConfig.USER,
            password: dbConfig.PASS,
            database: dbConfig.NAME,
        })
        this.preparedQueries = {
            where: null,
            like: null,
            field: null,
            join: null,
            orderBy: null,
            limit: null,
            set: [],
        }
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
        where: (row, value = "") => {
            if(row.indexOf('(') !== -1) {
                this.preparedQueries.where = `WHERE ${row.replace(/[()]/g, '')}`
                return
            }

            const sql = "WHERE ?? = ?"
            const inserts = [row, value]
            this.preparedQueries.where = mysql.format(sql, inserts)
        },
        like: (row, value) => {
            value = this.filterString(value)
            const sql = `WHERE ?? LIKE '%${value}%'`
            const inserts = [row]
            this.preparedQueries.like = mysql.format(sql, inserts)
        },
        select: (field) => {
            const sql = "??"
            const insert = [field]
            this.preparedQueries.field = mysql.format(sql, insert)
        },
        join: (joinTable, condition, type = 'INNER') => {
            this.preparedQueries.join = `${type} JOIN ${joinTable} ON ${condition}`
        },
        order_by: (field, type = 'ASC') => {
            this.preparedQueries.orderBy = `ORDER BY ${field} ${type}`
        },
        get: async (table) => {
            const where = this.preparedQueries.where || ""
            const like = this.preparedQueries.like || ""
            const field = this.preparedQueries.field || "*"
            const join = this.preparedQueries.join || ""
            const orderBy = this.preparedQueries.orderBy || ""

            const query = `SELECT ${field} FROM ${table} ${join} ${where}${like} ${orderBy}`
            console.log(query)
            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result)
                }
                this.dbConnect.query(query, callback)
            }).catch(err => { throw err })
        }
    }

    filterString(string) {
        return encodeURIComponent(string).replace(/[!'()*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16)
        })
    }
}

module.exports = NI_Model
