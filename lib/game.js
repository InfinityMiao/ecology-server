var sql = require('./sql');
var Net = require('./net');
var fs = require('fs');

//初始化所有网络
var nets = {};
var gids = [];
var N = 0;
var T = 0;
var oid = 0;

var initGames = function(callback){
    nets = {};
    gids = [];
    N = 0;
    T = 0;
    let availableGamesParameters = [];


    //获取所有已经构建好的网络csv
    let files = fs.readdirSync('./nets');
    let randomNetId = [];
    for(let i=0;i<files.length;i++){
        randomNetId.push(parseInt(files[i].split(".")[0]));
    }
    sql.listAllGames(function (status,result) {
        let useAbleGid = require('../config.json').useAbleGid;
        if(!status) {
            console.log("初始化网络失败，请重启...");
            callback("初始化网络失败，请重启...");
        }
        else{
            result = result.content;
            for(let i = 0;i<result.length;i++){
                let parameters = result[i];
                if(useAbleGid.indexOf(parameters.id) < 0 || parameters.status == 0){
                    continue;
                }
                console.log("Initialize "+parameters.gameName);
                for(let p of Object.values(parameters)){
                    if(p == undefined)
                        console.log(parameters," initiate failed")
                }
                try{
                    nets[parameters.id] = new Net(parameters.N,parameters.T,parameters.K,parameters.x0,parameters.R0,parameters.ec,parameters.ed,parameters.o,parameters.t);
                }
                catch(e){
                    console.log(e)
                }
                if(randomNetId.indexOf(parameters.id) >= 0){
                    fs.readFile("./nets/"+parameters.id+".csv", "utf-8", function(error, data) {
                        if(nets[parameters.id].refactorNet(data))
                            console.log("Refactor "+parameters.gameName+" succeed");
                        else
                            console.log("Refactor "+parameters.gameName+" failed");
                    });
                }
                gids.push(parameters.id);

                if(gids.length === 1){
                    N = parameters.N;
                    T = parameters.T;
                }
                availableGamesParameters.push(parameters);
            }

            gids.sort(function (m, n) {
                if (m < n) return -1
                else if (m > n) return 1
                else return 0
            });
            console.log(gids)
            let tempGid = gids[0];
            sql.initiate(tempGid,gids,function (status) {
                if(status)
                    console.log("playAble初始化成功");
                else
                    console.log("playAble初始化失败");
                nets[tempGid].setPlayAble(true);
            });
            callback(availableGamesParameters);
            // console.log(nets)
        }
    });

    sql.getOid(function (status,oid_) {
        if(status)
            oid = parseInt(oid_)+1;
        else
            console.log("Get oid failed.");
    })
};
//在启动时初始化游戏
initGames(function (availableGamesParameters) {
    console.log("Initialize oid = "+oid);
});

//做选择，返回结果
var play = function (gid,uid,strategy,callback) {
    //进行选择操作
    var [nei_index,nei_strategy,nei_income] = nets[gid].get_random_neighbor(uid);
    var [status,income,R,X,last_strategy,last_income] = nets[gid].make_choice(uid, strategy);

    //判断是否需要切换playAble
    if(status === false){
        console.log(gid+" is over!!!!!\n");
        sql.setPlayAble(gid,0,function (statsus) {
            if(nets[gid].getPlayAble())
                nets[gid].setPlayAble(false);
        });

        let index = gids.indexOf(parseInt(gid));//现在正在游玩的gid的索引
        if(index === gids.length-1)
            callback(income);
        else{
            let tempGid = gids[index + 1];
            sql.setPlayAble(tempGid,1,function (statsus) {
                if(!nets[tempGid].getPlayAble()){
                    console.log("Switch to gameId = "+tempGid);
                    nets[tempGid].setPlayAble(true);
                }
            });
            callback(income);
        }
    }
    else
        callback(income);

    //记录选择操作
    var user_index = nets[gid].user_indexs[uid];
    var vector = nets[gid].getVector().join(";");
    let [R_,X_,user_index_,strategy_,income_,last_strategy_,last_income_,nei_index_,nei_strategy_,nei_income_,vector_] = nets[gid].autoPlay();
    for(let i=-1;i<R_.length;i++,oid++){
        if(i == -1){
            sql.record(gid,uid,R,strategy,last_strategy,last_income,income,nei_strategy,nei_income,X,user_index,vector,
                nei_index,function () {

            });
        }
        else{
            sql.record(gid,0,R_[i],strategy_[i],last_strategy_[i],last_income_[i],income_[i],nei_strategy_[i],nei_income_[i],
                X_[i],user_index_[i],vector_[i],nei_index_[i],function () {
                    //null
                });
        }

    }

};

//获取轮次信息
var playGame = function (gid,uid,callback) {
    sql.userinfo(uid,function (status,result) {
        if(status){
            var info = nets[gid].playGame(uid);
            callback(true,{
                'Resource':info[0],
                'lastChoose':info[1],
                'lastBenefit':info[2],
                'neiborChoose': info[3],
                'neiborBenefit':info[4],
                'income':result.income,
                'ratio':info[5]
            })
        }
        else{
            callback(false)
        }

    })
};

var update = function(body){//更新内存中现有网络的固定参数，但是不更改X，R
    nets[body.id].K = body.K;
    nets[body.id].N = body.N;
    nets[body.id].T = body.T;
    nets[body.id].c = body.ec;
    nets[body.id].d = body.ed;
    nets[body.id].o = body.o;
    return;
};

var reset = function(gid,callback){//根据gid在内存中重置网络
    sql.getGame(gid,function (status,result) {
        if(status){
            nets[gid] = new Net(result[0].N,result[0].T,result[0].K,result[0].X0,result[0].R0,result[0].c,result[0].d,result[0].o);
            if(String(result[0].playAble) == "1")
                nets[gid].alterPlayAble();
            callback(true);
        }
        else
            callback(false);
    })
};

var add = function(body){//内存中增加网络
    nets[body.id] = new Net(body.N,body.T,body.K,body.x0,body.R0,body.ec,body.ed,body.o);
};

var add_user = function(gid,uid){
    return (nets[gid].add_user(uid));
};

var playAble = function (gid) {
    return nets[gid].getPlayAble();
};

var save = function(callback){
    for(var gid of Object.keys(nets)){
        (function (gid){
            fs.writeFile('./nets/'+gid+".json",JSON.stringify(nets[gid]),function (err) {
                if(err)
                    callback(false);
                else if(Object.keys(nets).indexOf(gid) === Object.keys(nets).length-1){
                    callback(true);
                }

            })
        })(gid)
    }
};

var getParameters = function(gid){
    var parameters = ["gid"+gid,"N"+nets[gid].N,"T"+nets[gid].T,"K"+nets[gid].K,"t"+nets[gid].t,"R"+nets[gid].R0,"X"+nets[gid].X0,"c"+nets[gid].c,"d"+nets[gid].d,"o"+nets[gid].o];
    return parameters.join("_");
};

var getJoining = function(gid,uid){
    return nets[gid].getJoining(uid);
};

var getNeighborStrategyRating = function(gid,uid){
    return nets[gid].getNeighborStrategyRating(uid);//cunm,dnum
};

var getResource = function(gid,uid){
    return nets[gid].getResource()
};

var foramtShowNum = function(num) {
    var result = parseFloat(num);
    if (isNaN(result)) {
        return false;
    }
    result = Math.round(num * 100) / 100;
    var s_x = result.toString();
    var pos_decimal = s_x.indexOf('.');
    if (pos_decimal < 0) {
        pos_decimal = s_x.length;
        s_x += '.';
    }
    while (s_x.length <= pos_decimal + 3) {
        s_x += '0';
    }
    return s_x;
};

var fix = function(num,digit){
    if(num >= 0.001)
        return parseFloat(num).toFixed(digit);
    else{
        let p = Math.floor(Math.log(num) / Math.LN10)
        let n = num * Math.pow(10, -p);
        n = n.toString().substring(0, 6);
        return n + '*10^' + p
    }
};

var amplify = function(origin,gid){
    if(typeof origin == "number"){
        return fix(100 * origin * N / T,3);
    }
    else{
        for(var i=0;i<origin.length;i++){
            origin[i] = fix(100 * origin * N / T,3);
        }
        return origin;
    }
};
module.exports = {play,update,reset,add,playGame,add_user,save,getParameters,getJoining,getNeighborStrategyRating,getResource,playAble,amplify,initGames};
