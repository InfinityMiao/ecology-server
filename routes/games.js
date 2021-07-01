var express = require('express');
var router = express.Router();
var sql = require("../lib/sql");
var game = require("../lib/game");
var auth = require("../lib/authVerify");
var fs = require("fs");
var process = require('process');
var useAbleGid = require('../config.json').useAbleGid;

let choiceRecord = {};
//获取游戏列表及其参数
router.get('/list',function (req,res) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){//如果用户登陆了
                var currentPage = req.query.currentPage;
                var pageSize = req.query.pageSize;
                if(currentPage == undefined)
                    currentPage = 0;
                if(pageSize == undefined)
                    pageSize = 20;
                sql.listGames(currentPage,pageSize,function (status,result) {
                    if(!status)
                        res.json({
                            code: 0,
                            message: 'getGamelistFail',
                            allGameIsOver:0,
                            data: {}
                        });
                    else if(result.length == 0){
                        res.json({
                            code: 0,
                            allGameIsOver:1,
                            message: 'allGameIsOver',
                            data: {}
                        });
                    }
                    else{
                        let finalData = {
                            'totalElements':0,
                            'content':[]
                        };
                        for(let i=0;i<result.totalElements;i++){
                            if(useAbleGid.indexOf(result.content[i].id) >= 0){
                                finalData.content.push(result.content[i]);
                                finalData.totalElements++;
                            }
                        }
                        res.json({
                            code: 20000,
                            allGameIsOver:0,
                            message: 'getGamelistSuccess',
                            data: finalData
                        });
                    }

                })
            }
        })
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

router.get('/listAll',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){//如果用户是管理员
                sql.listAllGames(function (status,result) {
                    if(!status)
                        res.json({
                            code: 0,
                            message: 'getGamelistFail',
                            data: {}
                        });
                    else
                        res.json({
                            code: 20000,
                            message: 'getGamelistSuccess',
                            data: result
                        });
                })
            }
        })
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//添加游戏
router.post('/add',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){//如果用户具有管理员权限
                sql.addGame(req.body,function (status, gid) {
                    if (status) {
                        req.body["id"] = gid;
                        game.add(req.body);
                        res.json({
                            code: 20000,
                            message: 'addSuccess'
                        })
                    }
                    else
                        res.json({
                            code: 0,
                            message: 'addFail'
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

//更新游戏参数
router.post('/update',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){//如果用户具有管理员权限
                sql.updateGame(req.body,function (status, data) {
                    if (status) {
                        res.json({
                            code: 20000,
                            message: 'updateGameSuccess'
                        })
                    }
                    else
                        res.json({
                            code: 0,
                            message: 'updateGameFail'
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

//重置游戏
router.get('/reset',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){
                sql.resetGame(req.query.id,function (status, data) {//重置数据库中的游戏网络资源量
                    if(status){
                        res.json({
                            code: 20000,
                            message: 'resetGameSuccess'
                        })
                    }
                    else{
                        res.json({
                            code: 0,
                            message: 'resetGameFail'
                        })
                    }
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

//变更游戏状态，类似于删除一个游戏
router.get('/changeStatus',function (req,res) {
    try{
        auth.adminVerify(req,res,function (status) {
            if(status){
                sql.changeStatus(req.query.id,function (status, data) {//在数据库的层面上使某游戏不为用户可见
                    if (status) {
                        res.json({
                            code: 20000,
                            message: 'changeGameStatusSuccess'
                        })
                    }
                    else
                        res.json({
                            code: 0,
                            message: 'changeGameStatusFail'
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

//获取轮次信息
router.all('/playGame',function (req,res) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){
                if(req.session.passed == 0){
                    res.json({
                        code: 30001,
                        message: 'unAnswered',
                    })
                }
                else{
                    try{
                        var gid = req.query.gameId;
                        var uid = req.session.uid;
                        if(game.add_user(gid,uid) === false){
                            res.json({
                                code: 0,
                                gameIsOver:0,
                                message: 'numberIsFull',
                                data:{}
                            })
                        }
                        else if(game.playAble(gid) == false){
                            res.json({
                                code: 0,
                                gameIsOver:1,
                                message: 'gameIsOver',
                                data:{}
                            })
                        }
                        else{
                            game.playGame(gid,uid,function (status,result) {
                                if(status){
                                    result.income = game.amplify(result.income, gid);
                                    result.lastBenefit = game.amplify(result.lastBenefit, gid);
                                    result.neiborBenefit = game.amplify(result.neiborBenefit, gid);
                                    result.ratio = (result.ratio*100).toFixed(1)+"%";
                                    res.json({
                                        code: 20000,
                                        gameIsOver:0,
                                        message: 'getGameInfoSuccess',
                                        data:result
                                    });
                                }
                                else
                                    res.json({
                                        code: 0,
                                        gameIsOver:0,
                                        message: 'getGameInfoFail',
                                        data:{}
                                    });
                            });
                        }
                    }
                    catch (e) {
                        console.log(e)
                        res.json({
                            code: 0,
                            gameIsOver:0,
                            message: 'getGameInfoFail',
                            data:{}
                        })
                    }
                }
            }
            else{
                res.json({
                    code: 0,
                    gameIsOver:0,
                    message: 'getGameInfoFail',
                    data:{}
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

//进行选择
router.get('/playChoice',function (req,res) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){
                try{
                    var gid = req.query.gameId;
                    var uid = req.session.uid;
                    var strategy = req.query.choice;
                    var lastChoice = choiceRecord[uid];
                    game.add_user(gid,uid);
                    if(game.playAble(gid) == false){//如果游戏已结束
                        res.json({
                            code: 0,
                            gameIsOver:1,
                            message: 'gameIsOver',
                            data:{}
                        });
                    }
                    else if(game.getJoining(gid,uid) === false){//如果还没有加入游戏
                        res.json({
                            code: 0,
                            gameIsOver:0,
                            message: 'numberIsFull',
                            data:{}
                        });
                    }
                    else if((lastChoice !== undefined) && ((new Date() - lastChoice) < 1000)){
                        res.json({
                            code: 0,
                            gameIsOver:0,
                            message: 'chooseStrategyFail',
                            data:{}
                        });
                    }
                    else{
                        game.play(gid,uid,strategy,function (benefit) {
                            benefit = game.amplify(benefit, gid);
                            choiceRecord[uid] = new Date();
                            res.json({
                                code: 20000,
                                gameIsOver:0,
                                message: 'chooseStrategySuccess',
                                data:{
                                    benefit:benefit
                                }
                            })
                        });
                    }
                }
                catch (e) {
                    console.log(e);
                    res.json({
                        code: 0,
                        gameIsOver:0,
                        message: 'chooseStrategyFail',
                        data:{}
                    })
                }
            }
        });
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

//导出csv
router.post('/csv',function (req,res) {
    try{
        sql.getParameters(req.query.id,function (status,content) {
            var parameters = content;
            sql.getOperations(req.query.id,function (status,content) {
                if(status) {
                    var result = "index,last_strategy,last_income,neighbor_index,neighbor_strategy,neighbor_income,R,strategy,X,vector,time\n";
                    for (var line of content)
                        result += Object.values(line).join(",")+"\n";
                    fs.writeFile("./csv/"+parameters+".csv",result,function (err) {
                        if(err){
                            throw err;
                        }
                        else{
                            res.download("./csv/"+parameters+".csv");
                        }
                    })
                }
            });
        })
    }
    catch (e) {
        console.log(e)
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

router.get('/income',function (req,res) {
    try{
        sql.getIncome(function (status,content) {
            if(status) {
                var result = "email,income,times\n";
                for (var line of content)
                    result += Object.values(line).join(",")+"\n";
                fs.writeFile("./csv/user_income.csv",result,function (err) {
                    if(err){
                        throw err;
                    }
                    else{
                        res.download("./csv/user_income.csv");
                    }
                })
            }
        });
    }
    catch (e) {
        console.log(e)
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

router.get('/result',function (req,res) {
    for(let id=11;id<=100;id++) {
        sql.getParameters(id, function (status, parameters) {
            sql.getOperations(id, function (status, content) {
                if (status) {
                    var result = "index,last_strategy,last_income,neighbor_index,neighbor_strategy,neighbor_income,R,strategy,X,vector,time\n";
                    for (var line of content)
                        result += Object.values(line).join(",") + "\n";
                    fs.writeFile("./result/" + parameters + ".csv", result, function (err) {
                        // console.log(err)
                    })
                }
            });
        });
    }
    sql.getIncomeByGid(function (status,content) {
        if(status){
            let result = "gid,email,income,times\n";
            for (let i=0;i<content.length;i++)
                result += content[i]+"\n";
            fs.writeFile("./result/user-income.csv",result,function (err) {
                res.json({
                    code:20000,
                    message:"保存成功"
                });
            })
        }
    })
});
router.get('/abort',function (req,res) {
    try{
        auth.adminVerify(req,res,function(status) {
            if(status){
                game.save(function (status) {
                    if(status)
                        res.json({
                            code:20000,
                            message:"保存网络成功"
                        });
                    else
                        res.json({
                            code:0,
                            message:"保存网络失败"
                        });
                    process.abort();
                })
            }
        })
    }
    catch (e) {
        console.log(e)
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

router.all("/history",function (req,res) {
    try{
        auth.loginVerify(req,res,function (status) {
            if(status){
                if(req.session.passed == 0){
                    res.json({
                        code: 30001,
                        message: 'unAnswered',
                    })
                }
                else{
                    try{
                        var gid = req.query.gameId;
                        var uid = req.session.uid;
                        var gameType = req.query.gameType;
                        if(game.add_user(gid,uid) === false){
                            res.json({
                                code: 0,
                                message: 'numberIsFull',
                                data:{}
                            })
                        }
                        else if(game.getJoining(gid,uid) === false){//判断玩家是否能够玩这个游戏
                            res.json({
                                code: 0,
                                message: '!!!!!',
                                data:{}
                            });
                        }
                        else{
                            var result = {};
                            var send = function () {
                                res.json({
                                    code: 20000,
                                    message: 'getGameInfoSuccess',
                                    data:result
                                });
                            };
                            if(gameType == "1"){
                                sql.getStrategyIncomeHistory(gid,uid,function (status,data) {
                                    if(status) {
                                        data.income = game.amplify(data.income,gid);
                                        result.history = data;
                                        send();
                                    }
                                })
                            }
                            else if(gameType == "2"){
                                sql.getStrategyIncomeHistory(gid,uid,function (status,data) {
                                    if(status){
                                        data.income = game.amplify(data.income,gid);
                                        result.history = data;
                                        var [CNum,DNum] = game.getNeighborStrategyRating(gid,uid);
                                        result.neighbor = {
                                            "CNum":CNum,
                                            "DNum":DNum
                                        };
                                        send()
                                    }
                                });
                            }
                            else if(gameType == "3"){
                                sql.getStrategyIncomeHistory(gid,uid,function (status,data) {
                                    if(status){
                                        data.income = game.amplify(data.income,gid);
                                        result.history = data;
                                        var [CNum,DNum] = game.getNeighborStrategyRating(gid,uid);
                                        result.neighbor = {
                                            "CNum":CNum,
                                            "DNum":DNum
                                        };
                                        result.resource = game.getResource(gid,uid);
                                        send()
                                    }
                                });
                            }
                            else if(gameType == "4"){
                                sql.getStrategyIncomeResourceHistory(uid,gid,function (status,data) {
                                    if(status){
                                        data.income = game.amplify(data.income,gid);
                                        result.history = data;
                                        var [CNum,DNum] = game.getNeighborStrategyRating(gid,uid);
                                        result.neighbor = {
                                            "CNum":CNum,
                                            "DNum":DNum
                                        };
                                        send()
                                    }
                                });
                            }
                            // else if(){
                            //     var [CNum,DNum] = game.getNeighborStrategyRating(gid,uid);
                            //     result.neighbor = {
                            //         "CNum":CNum,
                            //         "DNum":DNum
                            //     };
                            //     send()
                            // }
                            else if(gameType == "5" ||gameType == "6" ||gameType == "7"||gameType == "8") {
                                send();
                            }
                            else
                                throw "gameType error";
                        }
                    }
                    catch (e) {
                        res.json({
                            code: 0,
                            message: 'getGameInfoFail',
                            data:{}
                        })
                    }
                }
            }
        });
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});

router.all("/restart",function (req,res) {
    try{
        if(req.query.secret = "superSecret"){
            game.initGames(function (result) {
                res.send(result);
            })
        }
    }
    catch (e) {
        console.log(e);
        if(e.code == "PROTOCOL_CONNECTION_LOST")
            throw e;
    }
});
module.exports = router;
