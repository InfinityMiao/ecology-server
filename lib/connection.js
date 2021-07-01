var mysql = require('mysql');
let configObj = require("../config.json");//读取配置文件



class Connection{
    constructor(){
        this.connect();
        console.log("Database connected");
    }
    connect(){
        let pool = mysql.createPool({
            connectionLimit: configObj.mySQLConnectionLimit,
            host: configObj.mySQLAddress,
            user: configObj.mySQLUser,
            password: configObj.mySQLPassword,
            database: configObj.mySQLDataBase
        });
        this.pool = pool;
    }
    query(sql,callback){
        this.pool.getConnection(function (err,connection) {
            if(err){
                connection.release();
                callback(err);
            }
            else{
                connection.query(sql,function (err,result) {
                    connection.release();
                    callback(err,result);
                })
            }
        })
    }
}

connection = new Connection();

module.exports = {connection};
