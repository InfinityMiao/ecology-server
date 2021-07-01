cooperation = 1;
betray = 0;

class Net{
    constructor(N, T, K, X0, R0, c, d, o,t) {
        //do not change，网络固定参数
        this.N = N;//网络大小
        this.T = T;
        this.K = K;
        this.c = c;
        this.d = d;
        this.o = o;
        this.t = t;
        this.X0 = X0;//初始合作比例
        this.R0 = R0;//初始资源量

        //change each term，会变的网络实时参数
        this.X = X0;//网络中当前的合作比例
        this.R = R0;//网络的当前资源量
        this.nt = 0;//网络的当前轮次数

        this.neighbor_net = this.construct_complete_net();//创建二维矩阵作为邻居网络，里面的每一行即一个结点，一行中的每一个值为其邻居结点的索引，如全连接网络的shape=(500,499)
        this.nodes = this.construct_nodes();//记录每一个节点的信息，包含这个节点所分配的用户uid(默认为null)，last_strategy(上一次的策略，根据X值初始化),last_income(上一次选择后的收入，默认为0)
        this.user_indexs = {};//节点分配记录，记录每个加进来的用户被分配的节点索引，uid做name,即uid->index，根据节点的index在neighbor_net，nodes中可以得到此节点的邻居，节点信息

        this.random_indexs = this.construct_indexs();//一个size=N，范围在0-N的随机数组作为每添加一个用户（调用adduser）时，用户在网络中的索引，仅在加入用户时辅助用

        this.playAble = false;
    }
    construct_complete_net(){//建立全连接网络
        var neighbor_net = [];
        for(var i=0;i<this.N;i++) {//为每个节点创造记录邻居索引的数组
            neighbor_net[i] = [];
            for (var j = 0; j < this.N; j++) {
                if (i == j)
                    continue;
                else
                    neighbor_net[i].push(j);
            }
        }
        return neighbor_net
    }
    construct_nodes() {
        //创建节点信息，name为节点的index，value为节点的信息
        var nodes = {};
        var strategies = [];
        for(let i=0;i<this.N;i++){
            if (i < this.X*this.N)
                strategies[i] = cooperation;
            else
                strategies[i] = betray;
        }
        strategies.shuffle();
        for(var i=0;i<this.N;i++){
            //随机模拟在i索引的节点的上一次策略
            nodes[i] = {
                uid:undefined,
                last_strategy:strategies[i],
                last_income:0,
                last_nt:0//记录玩家上一次做选择时的轮次
            }
        }

        //更新网络中的实际X,及其邻居
        var CNum = 0;//网络中的总合作人数
        for(var node of Object.values(nodes))
            if(node.last_strategy == cooperation)
                CNum += 1;
        this.X = CNum/this.N;

        //初始化节点的last_income
        for(var user_index of Object.keys(this.neighbor_net)){
            var cnum = 0;
            for(var nei_index of Object.values(this.neighbor_net[user_index]))
                if(nodes[nei_index].last_strategy == cooperation)
                    cnum += 1;
            var nc = cnum/this.neighbor_net[user_index].length;
            if(nodes[user_index].last_strategy == cooperation)
                nodes[user_index].last_income = nc * this.c * this.T / this.N;
            else
                nodes[user_index].last_income = this.R * this.d * this.T / this.N + this.o * this.T / this.N;

            //邻居
            nodes[user_index].neighbor_index = this.neighbor_net[user_index][Math.floor(Math.random()*this.neighbor_net[user_index].length)];
        }

        return nodes
    }
    construct_indexs(){
        //建立一个随机数组
        var indexs = [];
        for(var i=0;i<this.N;i++)
            indexs.push(i)
        indexs.sort(function() {
            return (0.5-Math.random());
        });
        return indexs
    }
    add_user(uid){//加入用户并分配节点,如果可以返回true，否则返回false
        if(Object.keys(this.user_indexs).indexOf(String(uid)) >= 0)//判断是否已经在网络中
            return true;
        else if(this.random_indexs.length === 0)//如果人数已满
            return false;
        else{
            var user_index = this.random_indexs.pop();//user_index为此用户分配的节点的索引
            this.nodes[user_index].uid = uid;
            this.user_indexs[uid] = user_index;//记录此用户分配到那个节点
            return true;
        }
    }
    get_neighbor_strategies(uid, user_index){//获取uid邻居的策略信息，即邻居们上一次选择合作的比例
        if(uid !== false)
            user_index = this.user_indexs[uid];//user_index为此uid用户在网络中的节点的索引
        var CNum = 0;//邻居中合作的数量
        var NNum = this.neighbor_net[user_index].length;//邻居数

        //找到此uid在网络中的所有邻居信息
        for(var neighbor_index of this.neighbor_net[user_index]){
            var strategy = this.nodes[neighbor_index].last_strategy;
            //console.log(strategy);
            if(strategy == cooperation)
                CNum += 1
        }
        var nc = CNum/NNum;//uid的邻居的合作比例

        return nc
    }
    get_random_neighbor(uid, user_index){//返回uid的一个随机邻居的上一次策略以及收入
        if(uid !== false)
            user_index = this.user_indexs[uid];//user_index为此uid用户在网络中的节点的索引
        var neighbor_index = this.nodes[user_index].neighbor_index;//一个uid的随机邻居的索引

        if(this.nodes[neighbor_index].last_strategy == cooperation){
            var CNum = 0;//邻居中合作的数量
            var NNum = this.neighbor_net[neighbor_index].length;//邻居数

            for(var index of this.neighbor_net[neighbor_index])
                if(this.nodes[index].last_strategy == cooperation)
                    CNum += 1;
            var nc = CNum/NNum;
            // var nei_income = nc * ec;
            var nei_income = this.calculate(nc,cooperation)[0];
        }
        else{
            // var nei_income = this.R * ed+eo;
            var nei_income = this.calculate(0,betray)[0]
        }
        return [neighbor_index,this.nodes[neighbor_index].last_strategy,nei_income];
    }
    make_choice(uid,strategy,user_index){
        if(uid !== false){
            user_index = this.user_indexs[uid];
            if (Object.keys(this.user_indexs).indexOf(String(uid)) < 0)//如果此用户不在此网络中
                return [false];
        }

        var before_X = this.X;
        var nc = this.get_neighbor_strategies(uid, user_index);//nc为邻居的合作比例
        //更新网络的X
        if(this.nodes[user_index].last_strategy != strategy){//如果用户此次策略与上一次策略不相同
            if(strategy == cooperation)//如果此次策略为合作，那么意味着上一次的策略为背叛，则X增加
                this.X += 1/this.N;
            else//如果此次策略为背叛，那么意味着上一次的策略为合作，则X减小
                this.X -= 1/this.N;
        }

        var [income,R] = this.calculate(nc,strategy);//计算得失，income为用户收入，newR为新的网络总资源

        var before_R = this.R;
        this.R = R;//将网络资源更新
        this.nt += 1;

        //更新用户的最新信息
        var last_strategy = this.nodes[user_index].last_strategy;
        var last_income = this.nodes[user_index].last_income;
        this.nodes[user_index].last_strategy = strategy;
        this.nodes[user_index].last_income = income;
        this.nodes[user_index].last_nt = this.nt;
        this.nodes[user_index].neighbor_index = this.neighbor_net[user_index][Math.floor(Math.random()*this.neighbor_net[user_index].length)];

        return [(this.nt <= this.N*this.t && this.R > 0),income,before_R,before_X,last_strategy,last_income] ;//返回此用户的收益，新资源，之前的策略
    }
    calculate(nc,strategy) {//计算当邻居中合作比例为nc，此次策略为strategy时的收入及总资源影响
        // nc 邻居合作比例，不包括自己，上一轮选择,
        // N T R K c d o net parameters
        // cnum total player who choosed coporation
        // caculate ec ed eo
        var ec = this.c * this.T / this.N;
        var ed = this.d * this.T / this.N;
        var eo = this.o * this.T / this.N;
        if (strategy == cooperation) {//choice cooperation
            //caculate payoff uc
            // var income = nc * ec;
            var income = this.R * ec;
            // update total Resources R
            var new_R = this.R + (this.T * this.R * (1 - this.R / this.K) - this.N * this.R * (this.X * ec + (1 - this.X )* ed))/this.N;
        }
        else {//choice betray
            //caculate payoff
            // var income = this.R * ed + eo;
            var income = this.R * ed;
            // update total Resources R
            var new_R = this.R + (this.T * this.R * (1 - this.R / this.K) - this.N * this.R * (this.X * ec + (1 - this.X )* ed))/this.N;
        }
        return [income, new_R]
    }
    playGame(uid){//获取轮次信息
        var user_index = this.user_indexs[uid];
        var last_choice = this.nodes[user_index].last_strategy;
        var last_income = this.calculate(this.get_neighbor_strategies(uid),last_choice)[0];//自己的轮次信息改为同步的
        var [neibor_index,neibor_choose,neibor_income] = this.get_random_neighbor(uid);
        var nc = this.get_neighbor_strategies(uid,user_index);
        return [this.R,last_choice,last_income,neibor_choose,neibor_income,nc]
    }
    getVector(){
        var temp = [];
        for(var index of Object.keys(this.nodes))
            temp[index] = this.nodes[index].last_strategy;
        return temp;
    }
    getJoining(uid){//获得玩家是否已被加入至网络中
        if(Object.keys(this.user_indexs).indexOf(String(uid)) >= 0)//判断uid是否已加入游戏
            return true;
        else
            return false;
    }
    getPlayAble(){
        return this.playAble;
    }
    setPlayAble(playAble){
        this.playAble = playAble;
    }
    getNeighborStrategyRating(uid,user_index){//获得uid玩家的邻居中合作与非合作的数量
        if(uid !== false){
            user_index = this.user_indexs[uid];//user_index为此uid用户在网络中的节点的索引
        }
        var CNum = 0;//邻居中合作的数量
        var NNum = this.neighbor_net[user_index].length;//邻居数

        //找到此uid在网络中的所有邻居信息
        for(var neighbor_index of this.neighbor_net[user_index]){
            var strategy = this.nodes[neighbor_index].last_strategy;
            //console.log(strategy);
            if(strategy == cooperation)
                CNum += 1
        }

        return [CNum,NNum-CNum];
    }
    getResource(){
        return this.R;
    }
    refactorNet(data){
        //对csv读取内容进行清理
        data = data.split("\n");
        for(let i=0;i<data.length;i++){
            data[i] = data[i].trim();
            if(data[i] === "")
                data.splice(i);
        }
        if(data.length !== this.N){
            return false;
        }
        //将从csv读取到的内容转换为数组
        let matrix = [];
        for(let i=0;i<data.length;i++){
            matrix[i] = [];
            let line = data[i].split(",");
            // console.log(line);
            for(let j=0;j<line.length;j++){
                matrix[i].push(parseInt(line[j]));
            }
        }
        // console.log(matrix);
        //将数组转换为邻居矩阵
        let neighbor_net = [];
        for(let i=0;i<matrix.length;i++){
            neighbor_net[i] = [];
            for(let j=0;j<matrix[i].length;j++){
                if(matrix[i][j] == 1){
                    neighbor_net[i].push(j);
                }
            }
        }
        this.neighbor_net = neighbor_net;
        this.nodes = this.construct_nodes();//重构节点信息
        return true;
    }
    autoPlayExcept(uid){
        var user_index = this.user_indexs[uid];//user_index为此uid用户在网络中的节点的索引
        var ec = this.c * this.T / this.N;
        var ed = this.d * this.T / this.N;
        var eo = this.o * this.T / this.N;
        var Umax = eo +ed;

        //遍历uid的所有邻居
        for(var index of this.neighbor_net[user_index]){
            var strategy = this.nodes[index].last_strategy;
            var [neighbor_index,nei_strategy,nei_income] = this.get_random_neighbor(String(this.nodes[index].uid));

            //计算Uj，Uk
            if(strategy == cooperation){
                var [CNum,DNum] = this.getNeighborStrategyRating(this.nodes[index].uid);
                var Uj = CNum/(CNum+DNum) * ec;
            }
            else{
                var Uj = this.R * ed + eo;
            }
            if(nei_strategy == cooperation){
                [CNum,DNum] = this.getNeighborStrategyRating(this.nodes[neighbor_index].uid);
                var Uk = CNum/(CNum+DNum) * ec;
            }
            else{
                var Uk = this.R * ed + eo;
            }

            var p = 1/2 + (this.w/2)*((Uk-Uj)/Umax);

            //判定此次的strategy
            if(Math.random() < p)
                strategy = nei_strategy;

            this.make_choice(this.nodes[index].uid,strategy)
        }
    }
    autoPlay(){
        let ec = this.c * this.T / this.N;
        let ed = this.d * this.T / this.N;
        let eo = this.o * this.T / this.N;
        let Umax = eo +ed;

        let X_ = [];
        let user_index_ = [];
        let strategy_ = [];
        let income_ = [];
        let nei_index_ = [];
        let nei_strategy_ = [];
        let nei_income_ = [];
        let R_ = [];
        let last_strategy_ = [];
        let last_income_ = [];
        let vector_ = [];
        //轮循每个节点
        for(let user_index=0;user_index < this.N;user_index++){
            //判断此没有分配用户的节点N个时间内有没有进行过选择，如果有，则继续轮循
            if(this.nodes[user_index].uid === undefined){
                if(this.nt - this.nodes[user_index].last_nt < this.N)
                    continue;
            }
            //判断此经过分配用户的节点2N个时间内有没有进行过选择，如果有，则继续轮循
            else if(this.nodes[user_index].uid !== undefined){
                if(this.nt - this.nodes[user_index].last_nt < (2 * this.N))
                    continue;
            }

            //自动选择
            var strategy = this.nodes[user_index].last_strategy;
            // let neighbor_index = this.nodes[user_index].neighbor_index;
            // let nei_strategy = this.nodes[neighbor_index].last_strategy;
            var [neighbor_index,nei_strategy,nei_income] = this.get_random_neighbor(false, user_index);
            //
            // //计算Uj，Uk
            // if(strategy == cooperation){
            //     let [CNum,DNum] = this.getNeighborStrategyRating(false,user_index);
            //     var Uj = CNum/(CNum+DNum) * ec;
            // }
            // else{
            //     var Uj = this.R * ed + eo;
            // }
            // if(nei_strategy == cooperation){
            //     let [CNum,DNum] = this.getNeighborStrategyRating(false,user_index);
            //     var Uk = CNum/(CNum+DNum) * ec;
            // }
            // else{
            //     var Uk = this.R * ed + eo;
            // }
            //
            // let p = 1/2 + (this.w/2)*((Uk-Uj)/Umax);

            //判定此次的strategy
            strategy = Math.round(Math.random());
            let [status,income,R,X,last_strategy,last_income] = this.make_choice(false,strategy,user_index);

            R_.push(R);
            X_.push(X);
            user_index_.push(user_index);
            strategy_.push(strategy);
            income_.push(income);
            last_strategy_.push(last_strategy);
            last_income_.push(last_income);
            nei_index_.push(neighbor_index);
            nei_strategy_.push(nei_strategy);
            nei_income_.push(nei_income);
            vector_.push(this.getVector().join(";"));
        }
        return [R_,X_,user_index_,strategy_,income_,last_strategy_,last_income_,nei_index_,nei_strategy_,nei_income_,vector_];
    }
}

Array.prototype.shuffle = function() {
    var array = this;
    var m = array.length,
        t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}
//N, T, K, X0, R0, c, d, o

// net = new Net(6,2,1,0.8,0.2,0.7,3,0.2);
// net = JSON.stringify(net);
// net = JSON.parse(net);
// console.log(net.neighbor_net.length);
// console.log(net.neighbor_net[0].length);
// console.log(net)
// console.log(net.add_user(456));
// console.log(net.make_choice(456,cooperation));
// console.log(net.get_random_neighbor(456));

// console.log(net.make_choice(456,cooperation));

module.exports = Net;
