const mysql = require('mysql')
const { async } = require('q')
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
            prepareQuery: null,
            setFields: [],
            setValues: [],
        }
    }

    get(table) { return this.db.get(table) }

    insert(table, data) { return this.db.insert(table, data) }

    async result() {
        return this.getQuery()
    }

    async result_array() {
        return this.getQuery('array')
    }

    async row() {
        return this.getQuery('single')
    }

    async row_array() {
        return this.getQuery('single_array')
    }

    async affected_rows() {
        return this.getQuery('insert_rows')
    }

    num_rows() {
        return this.getQuery('numrows')
    }

    getQuery(type = 'object') {
        console.log(this.prepareQuery)
        return new Promise((resolve, reject) => {
            this.dbConnect.query(this.prepareQuery, function(error, result){
                if (error) {
                    reject(error)
                    return
                }
                
                switch(type) {
                    case 'object':
                        resolve(result)
                    break
                    case 'array':
                        resolve(JSON.parse(JSON.stringify(result)))
                    break
                    case 'single':
                        resolve(result[0])
                    break
                    case 'single_array':
                        resolve(JSON.parse(JSON.stringify(result[0])))
                    break
                    case 'numrows':
                        resolve(result.length)
                    break
                    case 'insert_rows':
                        resolve(result.affectedRows)
                    break
                }
            })
        })
    }

    db = {
        query: (sqlQuery) => {
            this.prepareQuery = this.filterString(sqlQuery)
            return this
        },
        where: (row, value = "") => {
            if(row.indexOf('(') !== -1) {
                this.preparedQueries.where = `WHERE ${row.replace(/[()]/g, '')}`
                return this
            }
            const sql = "WHERE ?? = ?"
            const inserts = [row, value]
            this.preparedQueries.where = mysql.format(sql, inserts)
            return this
        },
        like: (row, value) => {
            value = this.filterString(value, true)
            const sql = `WHERE ?? LIKE '%${value}%'`
            const inserts = [row]
            this.preparedQueries.like = mysql.format(sql, inserts)
            return this
        },
        select: (field) => {
            const sql = "??"
            const insert = [field]
            this.preparedQueries.field = mysql.format(sql, insert)
            return this
        },
        join: (joinTable, condition, type = 'INNER') => {
            this.preparedQueries.join = `${type} JOIN ${joinTable} ON ${condition}`
            return this
        },
        order_by: (field, type = 'ASC') => {
            this.preparedQueries.orderBy = `ORDER BY ${field} ${type}`
            return this
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
        },
        insert: async (table, data) => {
            if (this.setFields.length > 0) {
                const values = this.setValues.map(v => {
                    return ["'" + this.filterString(v, true) + "'"]
                })
                const sql = `INSERT INTO ${table} (${this.setFields.join(', ')}) VALUES (${values.join(', ')})`
            } else {
                const field = Object.keys(data)
                const values = Object.values(data).map(d => {
                    return ["'" + this.filterString(d, true) + "'"]
                })
                const sql = `INSERT INTO ${table} (${field.join(', ')}) VALUES (${values.join(', ')})`
            }
            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result.affectedRows)
                }
                this.dbConnect.query(sql, callback)
            }).catch(err => { throw err })
        },
        set: (field, value) => {
            this.setFields.push(field)
            this.setValues.push(value)
            return this
        }
    }

    filterString(string, uri = false) {
        if (String(string).indexOf('INSERT') !== -1) return string

        if (uri) {
            return encodeURIComponent(string).replace(/[!'()*]/g, function(c) {
                return '%' + c.charCodeAt(0).toString(16)
            })
        }

        return string.replace(/'/g, "")
    }
}

module.exports = NI_Model
