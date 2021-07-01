var connection = require('./lib/connection').connection;
require("./lib/format");
var fs = require("fs");
var getParameters = function(gid,callback){
    connection.query("SELECT gid,N,T,K,t_,R0,X0,c,d,o from games where gid='{0}'".format(gid),function (err,result) {
        if(err)
            callback(false);
        else{
            var parameters = ["gid"+result[0].gid,"N"+result[0].N,"T"+result[0].T,"K"+result[0].K,"t"+result[0].t_,"R"+result[0].R0,"X"+result[0].X0,"c"+result[0].c,"d"+result[0].d,"o"+result[0].o];
            callback(true,parameters.join("_")) ;
        }
    })

};

var getOperations = function(gid,callback){
    //index,strategy,last_strategy,last_income,neighbor_strategy,neighbor_income,R,strategy,X,time
    connection.query("select `index`, `last_strategy`,`last_income`, `nei_index`,`nei_strategy`, `nei_income`," +
        " `R`,`strategy`,`X`,`vector`,date_format(time,'%Y-%c-%d %H:%i:%s') as time from operations where gid = {0} order by time".format(gid),function (err,result) {
        if(err)
            callback(false);
        else
            callback(true,result);
    })
};

for(let id=7;id<=7;id++){
    getParameters(id,function (status,parameters) {
        getOperations(id,function (status,content) {
            if(status) {
                var result = "index,last_strategy,last_income,neighbor_index,neighbor_strategy,neighbor_income,R,strategy,X,vector,time\n";
                for (var line of content)
                    result += Object.values(line).join(",")+"\n";
                fs.writeFile("./result/"+parameters+".csv",result,function (err) {

                })
            }
        });
    })
}
