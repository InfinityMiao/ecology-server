class comNet {
    //inition  N T K X R c d o
    constructor(N, T, K, X, R, c, d, o) {
        //do not change
        this.N = N;
        this.T = T;
        this.K = K;
        this.c = c;
        this.d = d;
        this.o = o;
        this.ec = this.c * this.T / this.N;
        this.ed = this.d * this.T / this.N;
        this.eo = this.o * this.T / this.N;
        //change each term
        this.X = X;
        this.R = R;
        this.CNum = 0;
        this.DNum = 0;

        this.playerNum = 0;
        this.Net = new Array();
        //init net o for coperaton 1 for betray
        for (var i = 0; i < parseInt(this.N * this.X); i++) {
            this.Net[i] = [0, 0]
        }
        for (var i = this.Net.length; i < N; i++) {
            this.Net[i] = [1, 0]
        }

        this.last_strategy = null;
        this.last_income = null;
    }
    addPlayer(id) {
        while (true) {
            var randomAddr = parseInt(Math.random() * this.N, 10);
            if (this.Net[randomAddr][1] == 0) {
                this.Net[randomAddr][1] = id;
                if (this.Net[randomAddr][0] == 0) {
                    this.CNum += 1;
                }
                else {
                    this.DNum += 1;
                }
                break;
            }
        }
        this.playerNum += 1;
        //console.log(this.DNum, this.CNum)
        return randomAddr;
    }
    makeChoice(id, choice) {
        if (choice == 0) {//operation
            var lastCNum = this.CNum;
            var lastDNum = this.DNum;
            var temp = 0;//is this one last term choice  0 for coperation last term   1 for betray
            for (var i = 0; i < this.Net.length; i++) {
                if (this.Net[i][1] == id) {
                    if (this.Net[i][0] == 0) {
                        //last term for operation
                        //cnum no change
                        temp = 1;
                        this.Net[i][0] == 0;
                    }
                    else {
                        this.CNum -= 1;
                        this.DNum += 1;
                    }
                }
            }
            //neighbor coporation total except self last term
            //so when later term is co ->temp=0
            var nc = (lastCNum - temp) / (this.playerNum - 1);
            //console.log('nc:' + nc)
            var uc = nc * this.ec;
            //console.log('uc: ' + uc)
            this.R = this.R + this.T * this.R * (1 - this.R / this.K) - this.N * this.R * (this.X * this.ec + (1 - this.X * this.ed));
            //console.log('R: ' + this.R)
            this.X = this.CNum / this.N//update with this term choice
            //console.log('x: ' + this.X)

            this.last_strategy = choice;
            this.last_income = uc;

            return uc;
        }
        else {
            var temp = 0;//is this one last term choice betray 1 for coperation 0 for betray
            var lastCNum = this.CNum;
            var lastDNum = this.DNum;
            for (var i = 0; i < this.Net.length; i++) {
                if (this.Net[i][1] == id) {
                    if (this.Net[i][0] == 0) {
                        //last term for operation
                        //cnum no change
                        temp = 1;
                        this.Net[i][0] == 1;
                    }
                    else {
                        this.CNum -= 1;
                        this.DNum += 1;
                    }
                }
            }
            var uc = this.R * this.ed + this.eo;
            //console.log('ud: ' + ud)
            this.R = this.R + this.T * this.R * (1 - this.R / this.K) - this.N * this.R * (this.X * this.ec + (1 - this.X * this.ed));
            //console.log('r: ' + this.R)
            this.X = (this.CNum - temp) / this.N//update with this term choice
            //console.log('x: ' + this.X)
            this.last_strategy = choice;
            this.last_income = uc;

            return uc;
        }
    }
    predictChoice(id) {
        var lastCNum = this.CNum;
        var lastDNum = this.DNum;
        var temp = 0;//is this one last term choice  0 for coperation last term   1 for betray
        for (var i = 0; i < this.Net.length; i++) {
            if (this.Net[i][1] == id) {
                if (this.Net[i][0] == 0) {
                    //last term for operation
                    //cnum no change
                    temp = 1;
                    // this.Net[i][0] == 0;
                }
                else {
                    // this.CNum -= 1;
                    // this.DNum += 1;
                }
            }
        }
        var nc = (lastCNum - temp) / (this.playerNum - 1);
        //console.log('nc:' + nc);
        var uc1 = nc * this.ec;
        //console.log('uc: ' + uc);


        var temp = 0;//is this one last term choice betray 1 for coperation 0 for betray
        var lastCNum = this.CNum;
        var lastDNum = this.DNum;
        for (var i = 0; i < this.Net.length; i++) {
            if (this.Net[i][1] == id) {
                if (this.Net[i][0] == 0) {
                    //last term for operation
                    //cnum no change
                    temp = 1;
                    // this.Net[i][0] == 1;
                }
                else {
                    // this.CNum -= 1;
                    // this.DNum += 1;
                }
            }
        }
        var uc2 = this.R * this.ed + this.eo;
        //console.log('ud: ' + ud)
        return [uc1,uc2];
    }
    last_choice(){
        return [this.last_strategy,this.last_income]
    }
}

// var net = new comNet(500,3,1,1,1,1,1,1);
// console.log(net.addPlayer("456"));
// console.log(net.addPlayer("456"));
// console.log(net.makeChoice("456",1));

module.exports = comNet;
