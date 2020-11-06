const express = require('express');
const handlebars = require('express-handlebars');
const fs = require('fs');

const app = express();

app.use(express.static('assets'));

app.set('view engine', 'hbs');
app.set('views', './application/views')

app.engine('hbs', handlebars({
    layoutsDir: './application/views',
    partialsDir: './application/views',
    extname: 'hbs'
}));

module.exports = {
    express,
    app,
    render: (res, path, data) => {
        res.render(path, { layout: 'back/template/index', data: data })
    }
}