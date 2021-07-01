let jwt = require('jsonwebtoken');//用来创建和确认用户信息摘要


var convertToken = function (req, res, next) {
    if(req.query.token)
        var token = req.query.token;
    else
        var token = req.headers["x-token"];
    if (token) {
        jwt.verify(token,require("../config").superSecret, function (err, decode) {
            if (err) { // 时间失效的时候/ 伪造的token
                req.session = {invalid:true};
                next()
            } else {//token有效
                req.session = decode;
                next()
            }
        });
    }
    else{//如果没有token时，记此请求用户还未登陆
        req.session = {success:false};
        next()
    }


};

module.exports = convertToken;
