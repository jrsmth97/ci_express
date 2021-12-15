const mysql = require('mysql')
const dbConfig = require('../../application/config/database')

class NI_Model {
    constructor(req, res) {
        this.req         = req
        this.res         = res

        this.dbPrefix    = null
        this.tablePrefix = null

        this.dbConnect = mysql.createConnection({
            host:     dbConfig.HOST,
            user:     dbConfig.USER,
            password: dbConfig.PASS,
            database: (this.dbPrefix ? this.dbPrefix + "_" : "") + dbConfig.NAME,
        })
        this.preparedQueries = {
            where:        null,
            from:         null,
            like:         null,
            field:        null,
            join:         null,
            having:       null,
            orderBy:      null,
            groupBy:      null,
            limit:        null,
            prepareQuery: null,
            setFields:      [],
            setValues:      [],
        }
    }

    /** 
     * GET QUERY CHAIN METHOD HANDLER
     * @params table | String
     * RETURN PACKAGE_ROWS | OBJ
     */
    get(table = null) { return this.db.get(table) }

    /** 
     * GENERATE SELECT QUERY CHAIN METHOD HANDLER
     * @params table | String
     * RETURN STRING QUERY
     */
    get_compiled_select(table) { return this.db.get_compiled_select(table) }
   
    /** 
     * GENERATE INSERT QUERY CHAIN METHOD HANDLER
     * @params table | String
     * RETURN STRING QUERY
     */
    get_compiled_insert(table) { return this.db.get_compiled_insert(table) }
    
    /** 
     * DB WHERE CHAIN METHOD 
     * @params field | String
     * @params value | String/INT
     * insert where statements sql query to prepared var
     */
    where(field, value) { return this.db.where(field, value) }

    /** 
     * FROM QUERY HANDLER
     * @params table | String
     * GENERATE FROM TABLE QUERY 
     */
    from(table) { return this.db.from(table) }

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
     * QUERY GROUPING CHAIN METHOD HANDLER
     */
    group_start() {
        return this.groupQuery()
    }
    or_group_start() {
        return this.groupQuery('or')
    }
    not_group_start() {
        return this.groupQuery('not')
    }
    or_not_group_start() {
        return this.groupQuery('or not')
    }
    group_end() {
        return this.groupQuery('end')
    }
    
    
    /** 
     * QUERY CORE GROUPING HANDLER
     */
    groupQuery(type = 'where') {
        if (this.preparedQueries.where == null) {
            this.preparedQueries.where = type == 'end' ? ' )' : ` ${type.toUpperCase()} (`
        } else this.preparedQueries.where += type == 'end' ? ' )' : ` ${type.toUpperCase()} (`
        return this
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

        // set_dbprefix: (prefix = null) => {
        //     this.dbPrefix = prefix
        // },
    
        // dbprefix: (table = null) => {
        //     this.tablePrefix = table
        // },
    
        /** 
         * DB QUERY QUERY HANDLER
         * @params sql | QueryString
         * insert sql query to prepared var
         */
        query: (sqlQuery) => {
            this.prepareQuery = this.filterString(sqlQuery)
            return this
        },

        /** 
         * DB WHERE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert where statements sql query to prepared var
         */
        where: (field, value = "") => {
            let sql

            // Handle Multiple Where Clause in Object Format
            if(field instanceof Object) {
                let bulkWhere = ''
                const keys = Object.keys(field)
                const values = Object.values(field)
                for(let i = 0; i < keys.length; i++) {
                    if(this.isCustomOperator(keys[i]) && this.isValidSqlOperator(keys[i].split(' ')[1])) {
                        bulkWhere += `${keys[i]} '${this.filterString(values[i])}'${this.setDelimiter(i, keys, ' AND')}`
                    } else {
                        bulkWhere += `${keys[i].split(' ')[0]} = '${this.filterString(values[i])}'${this.setDelimiter(i, keys, ' AND')}`
                    }
                }
                
                this.preparedQueries.where = bulkWhere
                return this
            } else {
                
                // Custom sql handler
                if (value == "" && field.split(' ').length >= 2) {
                    this.preparedQueries.where = field
                    return this
                }

                const customOperator = field.split(' ')[1]
                if (customOperator !== undefined && this.isValidSqlOperator(customOperator)) {
                    // Handle key value with custom operator
                    sql = `?? ${customOperator} ?`
                } else {
                    // Handle simple key value  
                    sql = "?? = ?"
                }

                const inserts              = [field.split(' ')[0], value]

                if (this.preparedQueries.where == null) {
                    this.preparedQueries.where = `WHERE ${mysql.format(sql, inserts)}`
                } else {
                    if (this.preparedQueries.where.endsWith('(')) {
                        this.preparedQueries.where += ` ${mysql.format(sql, inserts)}`
                    } else this.preparedQueries.where += ` AND ${mysql.format(sql, inserts)}`
                }

                return this
            }
        },

        /** 
         * DB OR WHERE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert additional OR where statements sql query to prepared var
         */
        or_where: (field, value = "") => {
            if(this.preparedQueries.where == null) return

            let sql
            const customOperator = field.split(' ')[1]
            if (customOperator !== undefined && this.isValidSqlOperator(customOperator)) {
                // Handle key value with custom operator
                sql = ` OR ?? ${customOperator} ?`
            } else {
                // Handle simple key value  
                sql = " OR ?? = ?"
            }
            const inserts = [field.split(' ')[0], value]
            this.preparedQueries.where += mysql.format(sql, inserts)
            return this
        },
        
        /** 
         * DB WHERE IN QUERY HANDLER
         * @params field  | String
         * @params values | Array
         * insert where in statements sql query to prepared var
         */
        where_in: (field, values = []) => {
            if(values.length <= 0) return   
            const sql = ` WHERE ${field} IN ('${values.join("', '")}')`
            this.preparedQueries.where = sql
            return this
        },

        /** 
         * DB OR IN WHERE QUERY HANDLER
         * @params field  | String
         * @params values | Array
         * insert additional OR IN where statements sql query to prepared var
         */
        or_where_in: (field, values = []) => {
            if(this.preparedQueries.where == null || values.length <= 0) return
            
            const orSql = ` OR ${field} IN ('${values.join("', '")}')`
            this.preparedQueries.where += orSql
            return this
        },

        /** 
         * DB WHERE NOT IN QUERY HANDLER
         * @params field  | String
         * @params values | Array
         * insert where not in statements sql query to prepared var
         */
        where_not_in: (field, values = []) => {
            if(values.length <= 0) return   
            const sql = ` WHERE ${field} NOT IN ('${values.join("', '")}')`
            this.preparedQueries.where = sql
            return this
        },

        /** 
         * DB OR IN WHERE QUERY HANDLER
         * @params field  | String
         * @params values | Array
         * insert additional OR IN where statements sql query to prepared var
         */
        or_where_not_in: (field, values = []) => {
            if(this.preparedQueries.where == null || values.length <= 0) return
            
            const orSql = ` OR ${field} NOT IN ('${values.join("', '")}')`
            this.preparedQueries.where += orSql
            return this
        },

        /** 
         * DB LIKE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert wherelike statements sql query to prepared var
         */
        like: (field, value = "", wildcard = 'both') => {
            let sql
            value     = this.filterString(value, true)

            if(field instanceof Object) {
                let bulkLike = " WHERE "
                const keys = Object.keys(field)
                const values = Object.values(field)
                for(let i = 0; i < keys.length; i++) {
                    let preSql = `?? LIKE '%${values[i]}%' ESCAPE '!'`
                    bulkLike += `${mysql.format(preSql, keys[i])}${this.setDelimiter(i, keys, ' AND')}`
                }
                
                this.preparedQueries.like = bulkLike
                return this
            }

            switch (wildcard) {
                case 'before':
                    sql = `?? LIKE '%${value}' ESCAPE '!'`
                break
                case 'after':
                    sql = `?? LIKE '${value}%' ESCAPE '!'`
                break
                case 'none':
                    sql = `?? LIKE '${value}' ESCAPE '!'`
                break
                case 'both':
                    sql = `?? LIKE '%${value}%' ESCAPE '!'`
                break
                default:
                    throw new Error('Illegal wildcard type')
                }
                
                const inserts = [field]
            if (this.preparedQueries.like == null) {
                this.preparedQueries.like = ` WHERE ${mysql.format(sql, inserts)}`
            } else {
                this.preparedQueries.like += ` AND ${mysql.format(sql, inserts)}`
            }
            
            return this
        },

        /** 
         * DB OR LIKE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert additional OR like statements sql query to prepared var
         */
        or_like: (field, value = "") => {
            if(this.preparedQueries.like == null) return

            const sql = " OR ?? LIKE ? ESCAPE '!'"
            const inserts = [field, value]
            this.preparedQueries.like += mysql.format(sql, inserts)

            console.log(this.preparedQueries.like)
            return this
        },

        
        /** 
         * DB NOT LIKE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert wherelike statements sql query to prepared var
         */
        not_like: (field, value = "") => {
            value     = this.filterString(value, true)

            if(field instanceof Object) {
                let bulkLike = " WHERE "
                const keys = Object.keys(field)
                const values = Object.values(field)
                for(let i = 0; i < keys.length; i++) {
                    let preSql = `?? NOT LIKE '%${values[i]}%' ESCAPE '!'`
                    bulkLike += `${mysql.format(preSql, keys[i])}${this.setDelimiter(i, keys, ' AND')}`
                }
                
                this.preparedQueries.like = bulkLike
                return this
            }
                
            const sql     = `?? NOT LIKE '%${value}%' ESCAPE '!'`
            const inserts = [field]
            if (this.preparedQueries.like == null) {
                this.preparedQueries.like = ` WHERE ${mysql.format(sql, inserts)}`
            } else {
                this.preparedQueries.like += ` AND ${mysql.format(sql, inserts)}`
            }
            
            return this
        },

        /** 
         * DB OR NOT LIKE QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * insert additional OR like statements sql query to prepared var
         */
        or_not_like: (field, value = "") => {
            if(this.preparedQueries.like == null) return

            const sql = " OR ?? NOT LIKE ? ESCAPE '!'"
            const inserts = [field, value]
            this.preparedQueries.like += mysql.format(sql, inserts)
            return this
        },

        /** 
         * DB SELECT QUERY HANDLER
         * @params field | String
         * insert selected fields query to prepared var
         */
        select: (field) => {  
            let selectQuery = "" 

            // Handle custom select sql in bracket
            if (field.indexOf('(') !== -1 || field.indexOf('as') !== -1 || field.indexOf('AS') !== -1) {
                this.preparedQueries.field = field
                return this
            }

            const fieldArray  = field.split(', ')   
            fieldArray.forEach((f, i) => {
                const sql = "??"
                const insert = [f]
                selectQuery += `${mysql.format(sql, insert)}${this.setDelimiter(i, fieldArray, ',')}`
            })

            if (this.preparedQueries.field == null) {
                this.preparedQueries.field = selectQuery
            } else {
                this.preparedQueries.field += `, ${selectQuery}`
            }

            return this
        },

        /** 
         * DB SELECT MAX QUERY HANDLER
         * @params field   | String
         * @params asField | String
         * insert max selected fields query to prepared var
         */
        select_max: (field, asField = null) => {
            this.generateSelect('max', field, asField)
            return this
        },

        /** 
         * DB SELECT MIN QUERY HANDLER
         * @params field   | String
         * @params asField | String
         * insert min selected fields query to prepared var
         */
        select_min: (field, asField = null) => {
            this.generateSelect('min', field, asField)
            return this
        },

        /** 
         * DB SELECT AVG QUERY HANDLER
         * @params field   | String
         * @params asField | String
         * insert AVG selected fields query to prepared var
         */
        select_avg: (field, asField = null) => {
            this.generateSelect('avg', field, asField)
            return this
        },

        /** 
         * DB SELECT SUM QUERY HANDLER
         * @params field   | String
         * @params asField | String
         * insert SUM selected fields query to prepared var
         */
        select_sum: (field, asField = null) => {
            this.generateSelect('sum', field, asField)
            return this
        },

        /** 
         * DB SELECT DISTINCT QUERY HANDLER
         * @params field | String
         * insert selected fields query to prepared var
         */
        distinct: (field) => {
            const sql = "??"
            const insert = [field]

            if (this.preparedQueries.field == null) {
                this.preparedQueries.field = `DISTINCT ${mysql.format(sql, insert)}`
            } else {
                this.preparedQueries.field += `, ${mysql.format(sql, insert)}`
            }
            return this
        },

        /** 
         * DB JOIN QUERY HANDLER
         * @params joinTable | String
         * @params condition | String
         * @params type      | String @default INNER 
         * insert join statements sql query to prepared var
         */
        join: (joinTable, condition, type = 'INNER') => {
            if (this.preparedQueries.join == null) {
                this.preparedQueries.join = ` ${type} JOIN ${joinTable} ON ${condition}`
            } else {
                this.preparedQueries.join += ` ${type} JOIN ${joinTable} ON ${condition}`
            }

            return this
        },

        /** 
         * DB LIMIT QUERY HANDLER
         * @params limit  | INT
         * @params offset | INT
         * insert orderby statements sql query to prepared var
         */
        limit: (limit, offset) => {
            this.preparedQueries.limit = ` LIMIT ${limit}${offset ? ', '+offset : ''}`
            return this
        },

        /** 
         * DB ORDERBY QUERY HANDLER
         * @params field | String
         * @params type  | String @default ASC
         * insert orderby statements sql query to prepared var
         */
        order_by: (field, type = 'ASC') => {
            let fieldQuery = type == 'RANDOM' ? "" : field
            let randomValue = ''
            if (Number.isInteger(field)) {
                randomValue = field
                fieldQuery  = ""
            }
            this.preparedQueries.orderBy = ` ORDER BY ${fieldQuery}${type == 'RANDOM' ? 'RAND('+randomValue+')' : ' '+type}`
            return this
        },

        /** 
         * DB GROUPBY QUERY HANDLER
         * @params field | String/Array
         * insert orderby statements sql query to prepared var
         */
        group_by: (field) => {
            if(field instanceof Array) {
                this.preparedQueries.groupBy = ` GROUP BY ${field.join(', ')}`
            } else {
                this.preparedQueries.groupBy = ` GROUP BY ${field}`
            }

            return this
        },

        /** 
         * DB SELECT FROM QUERY HANDLER
         * @params table | String
         * insert from table statements sql query to prepared var
         */
        from: (table) => {
            if (this.preparedQueries.from == null) {
                this.preparedQueries.from = this.filterString(table)
            } else {
                this.preparedQueries.from += `, ${this.filterString(table)}`
            }

            return this
        },

        /** 
         * DB HAVING QUERY HANDLER
         * @params statement | String
         * insert having aggregate statements sql query to prepared var
         */
        having: (statement) => {
            if (this.preparedQueries.having == null) {
                this.preparedQueries.having = ` HAVING ${this.filterString(statement)}`
            } else {
                this.preparedQueries.having += ` AND ${this.filterString(statement)}`
            }

            return this
        },

        /** 
         * DB OR HAVING QUERY HANDLER
         * @params statement | String
         * insert additional OR having aggregate statements sql query to prepared var
         */
        or_having: (statement) => {
            if(this.preparedQueries.having == null) return
            this.preparedQueries.having += ` OR ${statement}`
            return this
        },

        /** 
         * DB GET QUERY HANDLER
         * @params table | String
         * return value based prepared sql query inserted before
         */
        get: async (table = null) => {
            const where     = this.preparedQueries.where    || ""
            const from      = this.preparedQueries.from     || ""
            const like      = this.preparedQueries.like     || ""
            const field     = this.preparedQueries.field    || "*"
            const join      = this.preparedQueries.join     || ""
            const having    = this.preparedQueries.having   || ""
            const orderBy   = this.preparedQueries.orderBy  || ""
            const groupBy   = this.preparedQueries.groupBy  || ""
            const limit     = this.preparedQueries.limit    || ""

            const insertSql = `SELECT ${field} FROM ${table ? table : from}${join}${where}${like}${having}${orderBy}${groupBy}${limit}`

            console.log(insertSql)
            return await this.promiseQuery(insertSql, 'data')
        },

        /** 
         * DB COMPILE GET QUERY QUERY HANDLER
         * @params table | String
         * return string query without run it
         */
        get_compiled_select: (table = null) => {
            const where     = this.preparedQueries.where    || ""
            const from      = this.preparedQueries.form     || ""
            const like      = this.preparedQueries.like     || ""
            const field     = this.preparedQueries.field    || "*"
            const join      = this.preparedQueries.join     || ""
            const having    = this.preparedQueries.having   || ""
            const orderBy   = this.preparedQueries.orderBy  || ""
            const groupBy   = this.preparedQueries.groupBy  || ""
            const limit     = this.preparedQueries.limit    || ""

            const query = `SELECT ${field} FROM ${table ? table : from}${join}${where}${like}${having}${orderBy}${groupBy}${limit}`

            return String(query)
        },

        /** 
         * DB GET WHERE QUERY HANDLER
         * @params table  | String
         * @params where  | OBJ
         * @params limit  | INT
         * @params offset | INT 
         * return value get where with options limit and offset
         */
        get_where: async (table, where = {}, limit = "", offset = "") => {
            const field       = this.preparedQueries.field || "*"
            const limitQuery  = limit == "" ? "" : ` LIMIT ${limit}`
            const offsetQuery = offset == "" ? "" : ` OFFSET ${offset}`

            let whereQuery = ""
            const rows   = Object.keys(where)
            const values = Object.values(where)
            rows.forEach((r, index)=> {
                whereQuery += `${r} = '${values[index]}'${(index+1) == rows.length ? '' : ', '}`
            })

            const insertSql = `SELECT ${field} FROM ${table} WHERE ${whereQuery}${limitQuery}${offsetQuery}`

            console.log(insertSql)
            return await this.promiseQuery(insertSql, 'data')
        },

        /** 
         * DB INSERT QUERY HANDLER
         * @params table | String
         * @params data  | OBJ
         * return number of affected row based prepared sql query inserted before
         */
        insert: async (table, data = Object) => {
            const insertSql = this.changeData('insert', table, data)
            return await this.promiseQuery(insertSql)
        },

        /** 
         * DB INSERT BATCH QUERY HANDLER
         * @params table | String
         * @params data  | Array
         * return number of affected row based prepared sql query batch inserted before
         */
        insert_batch: async (table, data = Array) => {
            return this.db.insert(table, data)
        },

        /** 
         * DB COMPILE INSERT QUERY HANDLER
         * @params table | String
         * return insert string query without run it
         */
        get_compiled_insert: (table = null, data = null) => {
            return String(this.changeData('insert', table, data))
        },

        /** 
         * DB REPLACE QUERY HANDLER
         * @params table | String
         * @params data  | OBJ
         * return number of affected row based prepared sql query inserted before
         */
        replace: async (table, data = {}) => {
            const replaceSql = this.changeData('replace', table, data)
            return await this.promiseQuery(replaceSql)
        },

        /** 
         * DB SET QUERY HANDLER
         * @params field | String
         * @params value | String/INT
         * set prepared sql query and inserted to prepared var
         */
        set: (field, value = null) => {
            if (field instanceof Object && !value) {
                const fieldQuery = Object.keys(field)
                const valueQuery = Object.values(field)
        
                fieldQuery.forEach((f, i) => {
                    this.preparedQueries.setFields.push(f)
                    this.preparedQueries.setValues.push(valueQuery[i])
                })

                return this
            }

            this.preparedQueries.setFields.push(field)
            this.preparedQueries.setValues.push(value)
            return this
        },

        /** 
         * DB UPDATE QUERY HANDLER
         * @params table | String
         * @params data  | OBJ
         * return number of affected row based prepared sql query updated before
         */
        update: async (table, data = Object) => {
            const updateSql = this.changeData('update', table, data)
            return await this.promiseQuery(updateSql)
        },

        /** 
         * DB DELETE QUERY HANDLER
         * @params table | String
         * @params where | OBJ
         * return number of affected row based prepared sql query updated before
         */
        delete: async (table, where = []) => {
            let preparedWhere = ""
            if (where instanceof Array) preparedWhere = this.preparedQueries.where || ""
            else {
                const fields = Object.keys(where)
                const values = Object.values(where)
                for (let i = 0; i < fields.length; i++) {
                    preparedWhere += `WHERE ${fields[i]} = '${values[i]}'${this.setDelimiter(i, fields, ',')}`
                }
            } 

            return new Promise((resolve, reject) => {
                const callback = (error, result) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve(result.affectedRows)
                }
                if(table instanceof Array) {
                    table.forEach(tab => {
                        this.dbConnect.query(`DELETE FROM ${tab} ${preparedWhere}`, callback)
                    })
                } else this.dbConnect.query(`DELETE FROM ${table} ${preparedWhere}`, callback)
            }).catch(err => { throw new Error(err) })
        },
        
        /** 
         * DB COUNT TABLE ROWS QUERY HANDLER
         * @params table | String
         * return count row in selected table | INT
         */
        count_all: async (table) => {
           return await this.promiseQuery(`SELECT SQL_CALC_FOUND_ROWS 1 FROM ${table}`, 'length')
        },  

        /** 
         * DB EMPTY TABLE QUERY HANDLER
         * @params table | String
         * return affected rows | INT
         */    
        empty_table: async (table) => {
            return await this.promiseQuery(`DELETE FROM ${table}`)
        },

        /** 
         * DB TRUNCATE TABLE QUERY HANDLER
         * @params table | String
         * return affected rows | INT
         */    
        truncate: async (table) => {
            return await this.promiseQuery(`TRUNCATE ${table}`)
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

    isCustomOperator(inputString) {
        return inputString.split(' ').length == 2 ? true : false
    }

    isValidSqlOperator(inputString) {
        const validOperators = ['=', '>', '<', '>=', '<=', '<>', '!=']
        return validOperators.includes(inputString)
    }

    setDelimiter(index, array, delimiter) {
        return (index + 1) == array.length ? '' : `${delimiter} `
    }

    async promiseQuery(query, expectedReturn = 'afrows') {
        return new Promise((resolve, reject) => {
            const callback = (error, result) => {
                if (error) {
                    reject(error)
                    return
                }

                switch (expectedReturn) {
                    case 'afrows':
                        resolve(result.affectedRows)
                    break
                    case 'length':
                        resolve(result.length)
                    break
                    case 'data':
                        resolve(result)
                    break
                }
            }

            this.dbConnect.query(query, callback)
        }).catch(err => { throw new Error(err) })
    }

    generateSelect(type, field, asField) {
        let selectType
        switch(type) {
            case 'max':
                selectType = 'MAX'
            break
            case 'min':
                selectType = 'MIN'
            break
            case 'avg':
                selectType = 'AVG'
            break
            case 'sum':
                selectType = 'SUM'
            break
            default:
                throw new Error('Illegal select type') 
        }

        const sql = `${selectType}(${field}) as ${asField ? asField : field}`

        if (this.preparedQueries.field == null) {
            this.preparedQueries.field = sql
        } else {
            this.preparedQueries.field += `, ${sql}`
        }
    }

    /** 
     * INSERT AND UPDATE SQLPRODUCES HANDLER
     * @params type  | String
     * @params table | String
     * @params data  | OBJ
     * @default type insert|update|replace
     * return sql query string for insert or update
     */
    changeData(type = 'insert', table, data) {
        let sql
        if (this.preparedQueries.setFields.length > 0) {
            let values
            switch (type) {
                case 'insert':
                    values = this.preparedQueries.setValues.map(v => {
                        return [`'${this.filterString(v)}'`]
                    })
                    sql = `INSERT INTO ${table} (${this.preparedQueries.setFields.join(', ')}) VALUES (${values.join(', ')})`
                break
                case 'update':
                    const where = this.preparedQueries.where || ""
                    let setFieldsQuery = ''
                    for (let i = 1; i <= this.preparedQueries.setFields.length; i++) {
                        setFieldsQuery += `${this.preparedQueries.setFields[i-1]}='${this.preparedQueries.setValues[i-1]}'${i == this.preparedQueries.setFields.length ? '' : ','} `
                    }
                    sql = `UPDATE ${table} SET ${setFieldsQuery} ${where}`
                break
                case 'replace':
                    values = this.preparedQueries.setValues.map(v => {
                        return [`'${this.filterString(v)}'`]
                    })
                    sql = `REPLACE INTO ${table} (${this.preparedQueries.setFields.join(', ')}) VALUES (${values.join(', ')})`
                break
            }
        } else {
            let field, values
            switch (type) {
                case 'insert':
                    if (data instanceof Array) {
                        data.forEach(dt => {
                            field = Object.keys(dt)
                            values = Object.values(dt).map(d => {
                                return [`'${this.filterString(d)}'`]
                            })
                            
                            if (sql) {
                                sql += `, (${values.join(', ')})`
                            } else sql = `INSERT INTO ${table} (${field.join(', ')}) VALUES (${values.join(', ')})`
                        })
                    } else {
                        field = Object.keys(data)
                        values = Object.values(data).map(d => {
                            return [`'${this.filterString(d)}'`]
                        })
                        sql = `INSERT INTO ${table} (${field.join(', ')}) VALUES (${values.join(', ')})`
                    }
                break
                case 'update':
                    const where = this.preparedQueries.where || ''
                    const dataFields = Object.keys(data)
                    let setFieldsQuery = ''
        
                    dataFields.forEach((field, index) => {
                        setFieldsQuery += `${field}='${data[field]}'${(index+1) == dataFields.length ? '' : ', '}`
                    })
                    sql = `UPDATE ${table} SET ${setFieldsQuery} ${where}`
                break
                case 'replace':
                    field = Object.keys(data)
                    values = Object.values(data).map(d => {
                        return [`'${this.filterString(d)}'`]
                    })
                    sql = `REPLACE INTO ${table} (${field.join(', ')}) VALUES (${values.join(', ')})`
                break
            }
        }

        console.log(sql)
        return sql
    }
}

module.exports = NI_Model
