var express = require('express');
var router = express.Router();
var sql = require("../lib/sql");
var auth = require("../lib/authVerify");

//列出用户列表
router.get('/list', function(req, res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){
                if(req.query.username === undefined)
                    req.query.username = "";
                if(req.query.currentPage === undefined)
                    req.query.currentPage = 0;
                if(req.query.currentPage > 0)
                    req.query.currentPage -= 1;
                if(req.query.pageSize === undefined)
                    req.query.pageSize = 20;
                sql.userlist(req.query.currentPage * req.query.pageSize,parseInt(req.query.pageSize),req.query.username,function (status, data) {
                    if (status) {
                        res.json({
                            "code": 20000,
                            "message": 'getUserListSuccess',
                            "data": data
                        })
                    }
                    else
                        res.json({
                            "code": 0,
                            "message": 'getUserListFail',
                            "data": {}
                        })
                })
            }
        });
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//列出某用户的最近五次操作
router.get('/operate',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){
                var uid = req.query.id;
                sql.operate(uid,function (status,result) {
                    if(!status)
                        res.json({
                            code: 0,
                            message: 'queryFail',
                            data:{}
                        });
                    else
                        res.json({
                            code: 20000,
                            message: 'querySuccess',
                            data:result
                        })

                })
            }
        });
    }
    catch (e) {
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

module.exports = router;
