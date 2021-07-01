var express = require('express');
let jwt = require('jsonwebtoken');
var router = express.Router();
var sql = require("../lib/sql");
var auth = require("../lib/authVerify");
var antiSql = require("../lib/antiSqlValid");
var game = require("../lib/game");
//登录
router.post('/login', function(req, res) {
    try{
        var body = req.body;
        console.log(body);
        if(antiSql.sqlValid(body.username) || antiSql.sqlValid(body.password)){//判断用户名和密码是否有sql注入
            res.json({
                "code": 0,
                "message": 'specialCharacters',
                "data": {}
            });
        }
        else{
            sql.login(body.username,body.password,function (status,uid,data) {
                if(status === true){
                    var token = jwt.sign({
                        success:true,
                        uid:uid,
                        roles:data.roles,
                        passed:1
                    },require("../config").superSecret, {expiresIn: "30d"});
                    data.passed = 0;
                    res.json({
                        "code": 20000,
                        "message": 'loginSuccess',
                        "data": data,
                        "token":token
                    });
                }
                else if(status == -1)
                    res.json({
                        "code": 0,
                        "message": 'usernamePwdError',
                        "data": {}
                    });
                else
                    res.json({
                        "code": 0,
                        "message": 'unknownError',
                        "data": {}
                    });
            });
        }
    }
    catch(e){
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//获取当前用户信息
router.get('/info', function(req, res) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){
                sql.userinfo(req.session.uid, function (status, data) {
                    if (status) {
                        data.income = game.amplify(data.income,1);
                        data.passed = 0;
                        res.json({
                            "code": 20000,
                            "message": 'getInfoSuccess',
                            "data": data
                        });
                    }
                    else
                        res.json({
                            "code": 0,
                            "message": 'getInfoFail',
                            "data": {}
                        });
                });
            }
        });
    }
    catch(e){
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//登出
router.all('/logout', function(req, res) {
    try{
        res.json({
            "code": 20000,
            "message": 'logoutSuccess'
        });
    }
    catch(e){
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//注册
router.post('/register', function(req, res,next) {
    try{
        var re = /[_a-zA-Z\d\-\.]+@[_a-zA-Z\d\-]+(\.[_a-zA-Z\d\-]+)+$/;//邮箱验证表达式
        var body = req.body;
        if(!re.test(body.email) || antiSql.sqlValid(body.password)){
            res.json({
                "code": 0,
                "message": 'specialCharacters',
                "data": {}
            });
        }
        sql.register(body,function (status) {
            if(status == true)
                res.json({
                    "code": 20000,
                    "message": 'registerSuccess'
                });
            else if(status == -1)
                res.json({
                    "code": 0,
                    "message": 'emailOccupy'
                });
            else
                res.json({
                    "code": 0,
                    "message": 'registerFail'
                })
        })
    }
    catch(e){
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//通过答题
router.post('/pass', function(req, res,next) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){
                if(req.body.answer === "BCB"){
                    sql.pass(req.session.uid, function (status, data) {
                        if (status) {
                            var token = jwt.sign({
                                success:true,
                                uid:req.session.uid,
                                roles:req.session.roles,
                                passed:1
                            },require("../config").superSecret, {expiresIn: 40 * 60});
                            res.json({
                                "code": 20000,
                                "message": 'answerSuccess',
                                "token":token
                            });
                        }
                        else
                            res.json({
                                "code": 0,
                                "message": 'answerFail'
                            });
                    });
                }
                else
                    res.json({
                        "code": 0,
                        "message": 'answerError'
                    });
            }
        });
    }
    catch(e){
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

module.exports = router;
