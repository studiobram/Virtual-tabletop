// Load config
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const es6Renderer = require('express-es6-template-engine');

const session = require('express-session')
const MemoryStore = require('memorystore')(session)

const http = require('http');
const app = express();

app.set('trust proxy', 1)
app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 86400000
    },
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
}))

// Create the ravendb indexes
const indexes = require('./indexes/index');
indexes.CreateIndexes();

// Routes
const indexRouter = require('./routes/route');

app.engine('html', es6Renderer);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

const httpServere = http.createServer(app).listen(process.env.HTTP_PORT);
console.log("Start http server on http://" + process.env.URL + ":" + process.env.HTTP_PORT);

// Load sockets
const sockets = require('./sockets')(httpServere);
sockets.load();

// Routes
app.use('/', indexRouter);

// catch 404
app.use(function (req, res, next) {
    res.render('404');
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    console.log(err);
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;