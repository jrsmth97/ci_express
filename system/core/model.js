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
            prepareQuery: null,
            setFields: [],
            setValues: [],
        }
    }

    /** 
     * GET QUERY HANDLER
     * @params table | Strings
     * RETURN PACKAGE_ROWS | OBJ
     */
    get(table) { return this.db.get(table) }

    /** 
     * GET QUERY HANDLER
     * @params table | Strings
     * @params data  | Object
     * RETURN affectedRows | INT
     */
    insert(table, data) { return this.db.insert(table, data) }

    /** 
     * QUERY RESULT HANDLER
     * RETURN PACKAGE_ROWS | OBJ
     */
    async result() {
        return this.getQuery()
    }

    /** 
     * QUERY ARRAY RESULT HANDLER
     * RETURN DATA | ARRAY
     */
    async result_array() {
        return this.getQuery('array')
    }

    /** 
     * QUERY ROW RESULT HANDLER
     * RETURN SINGLE PACKAGE_ROW | OBJ
     */
    async row() {
        return this.getQuery('single')
    }

    /** 
     * QUERY ROW ARRAY RESULT HANDLER
     * RETURN SINGLE DATA | ARRAY
     */
    async row_array() {
        return this.getQuery('single_array')
    }

    /** 
     * RETURN NUMBER OF AFFECTED ROWS | INT
     */
    async affected_rows() {
        return this.getQuery('insert_rows')
    }
    
    /** 
     * RETURN Number of rows in the result set | INT
     */
    num_rows() {
        return this.getQuery('numrows')
    }
    
    
    /** 
     * QUERY CORE HANDLER
     * @params type | String
     * @default object|array|single|single_array|numrows|insert_rows
     * return any
     */
    getQuery(type = 'object') {
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

        /** 
         * DB QUERY CHAIN METHOD 
         * @params sql | QueryString
         * insert sql query to prepared var
         */
        query: (sqlQuery) => {
            this.prepareQuery = this.filterString(sqlQuery)
            return this
        },

        /** 
         * DB WHERE CHAIN METHOD 
         * @params field | String
         * @params value | String/INT
         * insert where statements sql query to prepared var
         */
        where: (field, value = "") => {
            if(field.indexOf('(') !== -1) {
                this.preparedQueries.where = `WHERE ${field.replace(/[()]/g, '')}`
                return this
            }
            const sql = "WHERE ?? = ?"
            const inserts = [row, value]
            this.preparedQueries.where = mysql.format(sql, inserts)
            return this
        },

        /** 
         * DB LIKE CHAIN METHOD 
         * @params field | String
         * @params value | String/INT
         * insert wherelike statements sql query to prepared var
         */
        like: (field, value) => {
            value = this.filterString(value, true)
            const sql = `WHERE ?? LIKE '%${value}%'`
            const inserts = [field]
            this.preparedQueries.like = mysql.format(sql, inserts)
            return this
        },

        /** 
         * DB SELECT CHAIN METHOD 
         * @params field | String
         * insert selected fields query to prepared var
         */
        select: (field) => {
            const sql = "??"
            const insert = [field]
            this.preparedQueries.field = mysql.format(sql, insert)
            return this
        },

        /** 
         * DB JOIN CHAIN METHOD 
         * @params joinTable | String
         * @params condition | String
         * @params type      | String @default INNER 
         * insert join statements sql query to prepared var
         */
        join: (joinTable, condition, type = 'INNER') => {
            this.preparedQueries.join = `${type} JOIN ${joinTable} ON ${condition}`
            return this
        },

        /** 
         * DB ORDERBY CHAIN METHOD 
         * @params field | String
         * @params type  | String @default ASC
         * insert orderby statements sql query to prepared var
         */
        order_by: (field, type = 'ASC') => {
            this.preparedQueries.orderBy = `ORDER BY ${field} ${type}`
            return this
        },

        /** 
         * DB GET CHAIN METHOD 
         * @params table | String
         * return value based prepared sql query inserted before
         */
        get: async (table) => {
            const where = this.preparedQueries.where || ""
            const like = this.preparedQueries.like || ""
            const field = this.preparedQueries.field || "*"
            const join = this.preparedQueries.join || ""
            const orderBy = this.preparedQueries.orderBy || ""

            const query = `SELECT ${field} FROM ${table} ${join} ${where}${like} ${orderBy}`
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

        /** 
         * DB INSERT CHAIN METHOD 
         * @params table | String
         * @params data  | OBJ
         * return number of affected row based prepared sql query inserted before
         */
        insert: async (table, data = {}) => {
            const sql = this.changeData('insert', table, data)
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

        /** 
         * DB SET CHAIN METHOD 
         * @params field | String
         * @params value | String/INT
         * set prepared sql query and inserted to prepared var
         */
        set: (field, value) => {
            this.preparedQueries.setFields.push(field)
            this.preparedQueries.setValues.push(value)
            return this
        },

        /** 
         * DB UPDATE CHAIN METHOD 
         * @params table | String
         * @params data  | OBJ
         * return number of affected row based prepared sql query updated before
         */
        update: async (table, data = {}) => {
            const sql = this.changeData('update', table, data)
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
        
        /** 
         * DB COUNT TABLE ROWS CHAIN METHOD 
         * @params table | String
         * return count row in selected table | INT
         */
        count_all: async (table) => {
            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result.length)
                }
                this.dbConnect.query(`SELECT SQL_CALC_FOUND_ROWS 1 FROM ${table}`, callback)
            }).catch(err => { throw err })
        },  
    }

    /** 
    * ESCAPE STRING FILTER FUNCTION
    * @params inputString | String
    * @params uri         | bool {true for urlencoded type filter}
    * return escaped string
    */
    filterString(inputString, uri = false) {
        if (String(inputString).indexOf('INSERT') !== -1) return inputString

        if (uri) {
            return encodeURIComponent(inputString).replace(/[!'()*]/g, function(c) {
                return '%' + c.charCodeAt(0).toString(16)
            })
        }

        return String(inputString).replace(/["']/g, "")
    }

    /** 
     * INSERT AND UPDATE SQLPRODUCES HANDLER
     * @params type  | String
     * @params table | String
     * @params data  | OBJ
     * @default type insert|update
     * return sql query string for insert or update
     */
    changeData(type = 'insert', table, data) {
        let sql
        if (this.preparedQueries.setFields.length > 0) {
            if (type == 'insert') {
                const values = this.preparedQueries.setValues.map(v => {
                    return [`'${this.filterString(v)}'`]
                })
                sql = `INSERT INTO ${table} (${this.preparedQueries.setFields.join(', ')}) VALUES (${values.join(', ')})`
            } else {
                const where = this.preparedQueries.where || ""
                let setFieldsQuery = ''
                for (let i = 1; i <= this.preparedQueries.setFields.length; i++) {
                    setFieldsQuery += `${this.preparedQueries.setFields[i-1]}='${this.preparedQueries.setValues[i-1]}'${i == this.preparedQueries.setFields.length ? '' : ','} `
                }
                sql = `UPDATE ${table} SET ${setFieldsQuery} ${where}`
            }
        } else {
            if(type == 'insert') {
                const field = Object.keys(data)
                const values = Object.values(data).map(d => {
                    return [`'${this.filterString(d)}'`]
                })
                sql = `INSERT INTO ${table} (${field.join(', ')}) VALUES (${values.join(', ')})`
            } else {
                const where = this.preparedQueries.where || ''
                const dataFields = Object.keys(data)
                let setFieldsQuery = ''

                dataFields.forEach((field, index) => {
                    setFieldsQuery += `${field}='${data[field]}'${(index+1) == dataFields.length ? '' : ', '}`
                })
                sql = `UPDATE ${table} SET ${setFieldsQuery} ${where}`
            }
        }
        return sql
    }
}

module.exports = NI_Model
