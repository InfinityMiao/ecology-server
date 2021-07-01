var tokenVerify = function (req,res,callback) {//验证token是否有效
    if(req.session.invalid){
        res.json({
            "code": 50014,
            "message": 'tokenError',
            "data": {}
        });
        callback(false);
    }
    else
        callback(true)
};
var loginVerify = function (req,res,callback) {//验证用户是否登录
    tokenVerify(req,res,function (status) {
        if(status) {//如果token有效
            if (req.session.success)
                callback(true);
            else {
                res.json({
                    "code": 0,
                    "message": 'loginFirst',
                    "data": {}
                });
                callback(false)
            }
        }
        else
            callback(false)
    })

};
var adminVerify = function (req,res,callback) {//验证用户是否有管理员权限
    loginVerify(req,res,function (status) {
        if(status){//如果用户已登录
            if(req.session.roles.indexOf('admin') == -1){//如果用户没有管理员权限
                res.json({
                    "code":0,
                    "message": 'roleError',
                    "data":{}
                });
                callback(false);
            }
            else//如果有管理员权限
                callback(true)
        }
        else
            callback(false);
    });
};

module.exports = {adminVerify,loginVerify};