function GameEngine(Operator) {
    this.operator = new Operator;

    this.USER_POSITION = 1;
    this.PLAYERS_NUM = 8;
    this.REQUEST_INTERVAL = 160;
    this.ROUND_INTERVAL = 1000;
    this.SESSION_DELAY = 10000;
    this.STAKES = [1, 2];
    this.ROUND_NAME =  ['PreFlop', 'Flop', 'Turn', 'River'];
    this.TIER_LIST = ["AA","KK","QQ","Aks","AQs","JJ","KQs","AJs","KJs","ATs","AKo","TT","QJs","KTs","QTs","JTs","99","AQo","A9s","KQo","T9s","A8s","K9s","J9s","A5s","Q9s","88","AJo","A7s","A4s","A6s","A3s","KJo","QJo","77","T8s","K8s","ATo","A2s","98s","K7s","Q8s","J8s","KTo","JTo","66","QTo","K6s","87s","K5s","97s","T7s","K4s","76s","55","K3s","Q7s","44","J7s","33","22","K2s","86s","65s","Q6s","54s","Q5s","96s","75s","Q4s","T9o","A9o","T6s","Q3s","J6s","64s","Q2s","85s","K9o","J9o","J5s","53s","Q9o","A8o","J4s","J3s","74s","95s","43s","J2s","T5s","A7o","A5o","T4s","63s","T8o","98o","A4o","T3s","84s","52s","T2s","A6o","42s","A3o","J8o","K8o","94s","87o","73s","Q8o","93s","32s","A2o","92s","62s","K7o","83s","97o","82s","76o","K6o","T7o","72s","65o","K5o","86o","54o","J7o","K4o","Q7o","75o","K3o","96o","K2o","Q6o","64o","Q5o","T6o","85o","53o","Q4o","J6o","Q3o","Q2o","74o","43o","J5o","95o","J4o","63o","T5o","J3o","J2o","T4o","52o","84o","T3o","42o","T2o","73o","94o","32o","93o","62o","92o","83o","82o","72o"];

    this.activePlayersNum = 8;
    this.bb = 0;
    this.sb;
    this.round; // 現在のラウンド - 0:PreFlop, 1:Flop, 2:Turn, 3:River
    this.mainPot = 0;
    this.sidePots = [];
    this.minimum;

    this.raiseCount;
    this.foldCount;
    this.requestCount;
    this.requestNum;

    this.players = [];
    this.cards = [];
    this.boards = [];

    this.init();
    this.setUp();
}

/**
 * カードの情報
 * num: 2 ~ 14
 * suit: 0 ~ 3 ["♠","♥","♦","♣"]
 */
GameEngine.prototype.initCard = function() {
    for (var i = 2; i <= 14; i++) {
        for (var j = 0; j <= 3; j++) {
            this.cards.push(new Card(i,j));
        }
    }
}

GameEngine.prototype.initPlayers = function() {
    for (var i = 0; i < this.PLAYERS_NUM; i++) {
        this.players.push(new Player());

        this.players[i].id = i;
        this.operator.addSeat(i);
        this.operator.addMsgBox(this.players[i]);
        this.operator.addHand(this.players[i]);
    }
}

GameEngine.prototype.setEventListener = function(player) {
    var clickDevice = (window.ontouchstart === undefined) ? 'mousedown' : 'touchstart';
    var self = this;

    // fold
    this.operator.btnContainer[0].addEventListener(clickDevice, function() {
        if (!self.operator.btnParmissions[0]) return;
        self.acceptAction(player, player.fold());
        this.classList.add('on');
        for (var c in self.operator.btnParmissions) self.operator.btnParmissions[c] = false;
    });
    // check
    this.operator.btnContainer[1].addEventListener(clickDevice, function() {
        if (!self.operator.btnParmissions[1]) return;
        self.acceptAction(player, player.check(self.round, self.raiseCount, self.minimum));
        this.classList.add('on');
        for (var c in self.operator.btnParmissions) self.operator.btnParmissions[c] = false;
    });
    // call
    this.operator.btnContainer[2].addEventListener(clickDevice, function() {
        if (!self.operator.btnParmissions[2]) return;
        self.acceptAction(player, player.call(self.minimum));
        this.classList.add('on');
        for (var c in self.operator.btnParmissions) self.operator.btnParmissions[c] = false;
    });
    // raise
    this.operator.btnContainer[3].addEventListener(clickDevice, function() {
        if (!self.operator.btnParmissions[3]) return;
        self.acceptAction(player, player.raise(self.raiseCount, self.minimum));
        this.classList.add('on');
        for (var c in self.operator.btnParmissions) self.operator.btnParmissions[c] = false;
    });
}

GameEngine.prototype.init = function() {
    this.initCard();
    this.initPlayers();
    this.setEventListener(this.players[this.USER_POSITION]);
}

GameEngine.prototype.shuffleCard = function() {
    var len = this.cards.length;
    for (var i = len - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i+1));
        var s = this.cards[i];
        this.cards[i] = this.cards[j];
        this.cards[j] = s;
    }
}

GameEngine.prototype.setBoard = function() {
    this.boards = [];
    for (var i = 0; i < 5; i++) {
        this.boards.push(this.cards[i]);
    }
}

GameEngine.prototype.setHand = function() {
    var j = 5;
    for (var i = 0; i < this.PLAYERS_NUM; i++) {
        if (this.players[i].isSitout) continue;
        this.players[i].hand[0] = this.cards[j];
        this.players[i].hand[1] = this.cards[j+1];
        this.players[i].sethandStrength(this.TIER_LIST);
        j += 2;

        if (this.players[i].id === this.USER_POSITION) this.operator.setHand(this.players[i]);
    }
}

/**
 * BB,SBを決定し強制Bet処理
 */
GameEngine.prototype.setRoll = function() {
    this.bb++;
    if (this.bb >= this.players.length) this.bb = 0;
    while (this.players[this.bb].isSitout) {
        this.bb++;
        if (this.bb >= this.players.length) this.bb = 0;
    }

    this.sb = (this.bb === 0) ? this.players.length - 1 : this.bb - 1;
    while (this.players[this.sb].isSitout) {
        this.sb--;
        if (this.sb < 0) this.sb = this.players.length - 1;
    }

    this.players[this.bb].stack -= this.STAKES[1];
    this.players[this.bb].bet = this.STAKES[1];

    this.players[this.sb].stack -= this.STAKES[0];
    this.players[this.sb].bet = this.STAKES[0];

    this.raiseCount++;
    this.mainPot += this.STAKES[0] + this.STAKES[1];
    this.operator.setPot(this.mainPot);

    this.operator.addRollBox(this.players[this.bb], 'BB');
    this.operator.setMsg(this.players[this.bb], this.players[this.bb].bet);

    this.operator.addRollBox(this.players[this.sb], 'SB');
    this.operator.setMsg(this.players[this.sb], this.players[this.sb].bet);
}

GameEngine.prototype.setUp = function() {
    this.mainPot = 0;
    this.minimum = this.STAKES[1];
    this.raiseCount = 0;
    this.foldCount = 0;
    this.round = 0;
    this.activePlayersNum = 0;

    for (var c in this.players) {
        if (this.players[c].stack < this.STAKES[1]) {
            this.players[c].isSitout = true;
            continue;
        }
        this.players[c].isFold = false;
        this.players[c].isAllin = false;
        this.players[c].bet = 0;
        this.activePlayersNum++;

        this.operator.setStack(this.players[c]);
    }

    if (this.activePlayersNum < 2) {
        this.operator.addLogMsg('Please reload your browser.', false, true);
        return;
    }

    this.operator.removeDispClasses(true, true, true, true, this.players);
    this.shuffleCard();
    this.setBoard();
    this.setHand();
    this.setRoll();

    this.operator.addLogMsg(this.ROUND_NAME[this.round], false, true);
    this.startSession();
}

GameEngine.prototype.startSession = function() {
    this.requestNum = (this.round === 0) ? this.bb : this.sb-1;
    this.requestCount = 0;

    this.actionRequest();
}

GameEngine.prototype.actionRequest = function() {
    this.requestCount++;
    if (this.requestCount === this.players.length) {
        this.promoteRound();
        return;
    }

    this.requestNum++;
    if (this.requestNum >= this.players.length) this.requestNum = 0;

    // アクション権限の無いプレイヤーはスキップ
    while (this.players[this.requestNum].isFold || this.players[this.requestNum].isAllin || this.players[this.requestNum].isSitout) {
        this.requestCount++;
        if (this.requestCount === this.players.length) {
            this.promoteRound();
            return;
        }

        this.requestNum++;
        if (this.requestNum >= this.players.length) this.requestNum = 0;
    }

    if (this.requestNum === this.USER_POSITION) {
        this.actionUser();
    } else {
        this.actionAI();
    }
}

/**
 * AI,USERのアクションを受け取り、Pot計算,HTML更新,次のアクションリクエスト呼び出し
 * @param {object}
 */
GameEngine.prototype.acceptAction = function(player, res) {
    var self = this;

    this.mainPot += res.chip;
    this.operator.setPot(this.mainPot);

    var text = (res.chip > 0) ? res.type + ' ' + player.bet : res.type;
    this.operator.setMsg(player, text);
    this.operator.addLogMsg(res.type, player);
    this.operator.setStack(player);

    if (player.id === this.USER_POSITION && this.round === 0) {
        this.adviserEngine(res);
    } else {
        this.callActionRquest(player,res);
    }
}

GameEngine.prototype.callActionRquest = function(player, res) {

    if (res.type === "Fold") {
        this.foldCount++;
        if (this.foldCount === this.activePlayersNum - 1) {
            this.endSession();
            return;
        }
    }

    if (res.hasOwnProperty('isRaise') && res.isRaise) {
        this.raiseCount++;
        this.minimum = player.bet;
        this.requestCount = 0;
    }

    this.actionRequest();
}

/**
 * ユーザーの判断からアドバイス(現状プリフロップのみ)
 * @param {object} res - ユーザーのアクション情報
 */
GameEngine.prototype.adviserEngine = function(res) {
    var self = this;
    var msg = new SpeechSynthesisUtterance();

    msg.lang = 'en-US';
    msg.volume = 0.1;

    var text = '';
    var p = this.players[this.USER_POSITION];
    var fixedPhrase = p.handText + ' is the top ' + p.handStrength + '% hand.';

    // レイザー無し
    switch (res.type) {
        case "Fold":
            if (p.handStrength <= 15) text = 'Wait! ' + fixedPhrase + ' It\'s strong enough hand to join this game!';
            else text = 'Nice Fold! ' + fixedPhrase + ' It\'s pretty weak.';
            break;
        case "Check":
            if (p.handStrength < 10) text = fixedPhrase + 'It\'s strong hand. So you should Riase basically.';
            else if (p.handStrength <= 18) text = 'I think it\'s good. Even the raising may be fine.'
            else text = 'Nice Check!' + fixedPhrase + ' It\'s pretty weak to raising.';
            break;
        case "Call":
            if (p.handStrength < 10) text = 'I think it\'s pretty good. But ' + fixedPhrase + ' So basically it\'s a hand to raise'; 
            else if (p.handStrength <= 18) text = 'I think it\'s good. Even the raising may be fine.';
            else text = 'I think you should Fold. ' + fixedPhrase + ' It\s pretty weak.';
            break;
        default:
            if (p.handStrength <= 18) text = 'Nice Raise! ' + fixedPhrase + ' Good luck!';
            else text =  'I think you should Fold. ' + fixedPhrase + ' It\s pretty weak to raising.';
            break;
    }

    this.operator.addLogMsg(text, false, false, false, true);
    msg.text = text;
    speechSynthesis.speak(msg);

    setTimeout(function(){
        self.callActionRquest(p, res);
    }, 8000);
}

GameEngine.prototype.actionUser = function() {
    var user = this.players[this.USER_POSITION];

    // call(allin)
    if (user.bet + user.stack <= this.minimum) this.operator.setButtonState(true, false, true, false);

    // check, raise
    else if (user.bet < this.minimum) {
        if (this.round > 0 && this.raiseCount === 0) this.operator.setButtonState(true, true, false, true);
        else this.operator.setButtonState(true, false, true, true);
    }
    else if (user.bet === this.minimum) this.operator.setButtonState(true, true, false, true);
}

GameEngine.prototype.actionAI = function() {
    var self = this;
    var player = this.players[this.requestNum];

    setTimeout(function(){
        self.acceptAction(player, player.actionAI(self.round, self.raiseCount, self.minimum));
    }, this.REQUEST_INTERVAL);
}

GameEngine.prototype.endSession = function() {
    // 残ったプレイヤーにPot配分
    for (var i = 0; i < this.PLAYERS_NUM; i++) {
        if (!this.players[i].isSitout && !this.players[i].isFold) {
            this.operator.addLogMsg('AI-' + this.players[i].id + ' won (+'+ this.mainPot + ')', false, true);
            this.players[i].stack += this.mainPot;
            this.mainPot = 0;
            break;
        }
    }

    this.operator.addLogMsg('setting...', false, true, this.SESSION_DELAY);
    var self = this;
    setTimeout(function(){
        self.setUp();
    }, this.SESSION_DELAY);
}

GameEngine.prototype.promoteRound = function() {
    var self = this;

    this.round++;
    this.minimum = this.STAKES[1];
    this.raiseCount = 0;

    if (this.round === 4) {
        setTimeout(function(){
            self.operator.addLogMsg('ShowDown', false, true);
            self.showDown();
        }, this.ROUND_INTERVAL);
        return;
    }

    // プレイヤーのベットを回収　ALLINの場合Pot獲得時の計算に使用するので保持
    for (var i = 0; i < this.players.length; i++) {
        if (!this.players[i].isAllin) this.players[i].bet = 0;
    }

    setTimeout(function(){
        self.operator.removeDispClasses(true, false, false, false, self.players);
        self.operator.setBoard(self.round, self.boards);
        self.operator.addLogMsg(self.ROUND_NAME[self.round], false, true);
    }, this.ROUND_INTERVAL);
    
    setTimeout(function(){
        self.startSession();
    }, this.ROUND_INTERVAL*2);
}

GameEngine.prototype.showDown = function() {
    // ハンドランク判定
    var sortArray = [];
    for (var c in this.players) {
        if (!this.players[c].isFold && !this.players[c].isSitout) {
            this.players[c].setHandRank(this.boards);
            sortArray.push(this.players[c]);

            this.operator.setHand(this.players[c]);
            this.operator.setMsg(this.players[c], this.players[c].handRank.type);
        }
    }
    
    // ハンドランク昇順にバブルソート
    (function(){
        for (var i = 0; i < sortArray.length-1; i++) {
            for (var j = sortArray.length-1; j > i; j--) {
                if (sortArray[j-1].handRank.rank > sortArray[j].handRank.rank) continue;
                if (sortArray[j-1].handRank.rank === sortArray[j].handRank.rank) {
                    var isContinue = false;
                    for (var k = 0; k < sortArray[j].handRank.kickers.length; k++) {
                        if (sortArray[j-1].handRank.kickers[k] > sortArray[j].handRank.kickers[k]) isContinue = true;
                    }                
                    if (isContinue) continue;
                }

                var temp = sortArray[j-1];
                sortArray[j-1] = sortArray[j];
                sortArray[j] = temp;
            }
        }
    })();

    // 同率を考慮し最終順位確定
    var order = [];
    (function(){
        var n = 0;
        for (var i = 0; i < sortArray.length; i++) order[i] = [];
        for (var i = 0; i < sortArray.length; i++) {
            order[n].push(sortArray[i]);
            if (i === sortArray.length - 1) break;
            if (sortArray[i].handRank.rank === sortArray[i+1].handRank.rank) {
                var isSame = true;
                for (var k = 0; k < sortArray[i].handRank.kickers.length; k++) {
                    if (sortArray[i].handRank.kickers[k] > sortArray[i+1].handRank.kickers[k]) isSame = false;
                }
                if (isSame) n--;
            }
            n++;
        }
    })();

    // Pot配分(sidePot考慮していない)
    var self = this;
    (function(){
        var getPot = Math.floor(self.mainPot / order[0].length);
        for (var c in order[0]) order[0][c].stack += getPot;

        for (var c in order[0]) {
            var text = 'AI-' + order[0][c].id + ' won ' + order[0][c].handRank.type + ' (+' + getPot + ')';

            self.operator.addLogMsg(text, false, true);
        }
    })();

    this.operator.addLogMsg('setting...', false, true, this.SESSION_DELAY);
    var self = this;
    setTimeout(function(){
        self.setUp();
    }, this.SESSION_DELAY);
}
