const express = require('express');
const handlebars = require('express-handlebars');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static('assets'));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../../application/views'))

app.engine('hbs', handlebars.engine({
    layoutsDir: path.join(__dirname, '../../application/views'),
    partialsDir: path.join(__dirname, '../../application/views'),
    extname: 'hbs'
}));

module.exports = {
    express,
    app,
    render: (res, path, data) => {
        res.render(path, { layout: 'back/template/index', data: data })
    }
}