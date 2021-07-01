var createError = require('http-errors');
var express = require('express');
var convertToken = require("./lib/token");
var path = require('path');
//var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var timeout = require('connect-timeout');

var userRouter = require('./routes/user');
var usersRouter = require('./routes/users');
var gamesRouter = require('./routes/games');

var app = express();
var whiteList = ["http://139.217.224.180:9528"];
app.use(
    cors({credentials: true,
        origin: function (origin, callback) {
            if (whiteList.indexOf(origin) !== -1 || !origin)
                callback(null, true);
            else
                callback(null, true)
        }
    })
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(timeout('5s'))
app.use(logger('dev'));
app.use(express.json({"limit" :1048576}));
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/',convertToken);
app.use('/api/user', userRouter);
app.use('/api/users', usersRouter);
app.use('/api/games', gamesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
