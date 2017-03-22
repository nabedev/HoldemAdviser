function Player() {
    this.id;
    this.roll;
    this.hand = [];
    this.handText = '';
    this.handStrength;
    // 役の種類と詳細
    this.handRank = {
        rank: 0,
        type: "",
        kickers: []
    };
    this.stack = 100;
    this.bet = 0;
    this.sidePot = false;
    this.isFold = false;
    this.isAllin = false;
    this.isSitout = false;
}

Player.prototype.sethandStrength = function(tierList) {
    this.handText = '';
    
    // 文字列に変換
    for (var i = 0; i < this.hand.length; i++) {
        this.handText += this.convertNum2Str(this.hand[i].num);
    }

    // 昇順に変換
    if (this.hand[0].num < this.hand[1].num) {
        var low = this.handText.charAt(0);
        var high = this.handText.charAt(1);
        this.handText = high + low;
    }

    // Suited判定(s,o付与)
    if (this.hand[0].suit === this.hand[1].suit) {
        this.handText += "s";
    } else if (this.hand[0].num !== this.hand[1].num) {
        this.handText += "o";
    }

    /*
    　* 全通り(1326)のハンドの内、プレイヤーのハンドがtierListの上位何組目かで強さ判定
     * 各パターンの組み合わせ数
     * ポケット:4組, スーテッド:6組, オフスート:12組
     */
    var combCnt = 0;
    for (var i = 0; i < tierList.length; i++) {
        // tierListの中からプレイヤーのハンドが現れるまで組み合わせを加算
        if (tierList[i].length === 2) {
            combCnt += 4;
        } else if (tierList[i].match(/s/)) {
            combCnt += 6;
        } else if (tierList[i].match(/o/)) {
            combCnt += 12;
        }

        if (tierList[i] === this.handText) {
            var pow = Math.pow(10, 2);
            this.handStrength = Math.round(combCnt / 1326 * 100 * pow) / pow;
            break;
        }
    }
}

/**
 * ハンドの数値を文字列に変換
 * @return {string}
 */
Player.prototype.convertNum2Str = function(num) {
    switch (num) {
        case 14:
            return "A";
            break;
        case 13:
            return "K";
            break;
        case 12:
            return "Q";
            break;
        case 11:
            return "J";
            break;
        case 10:
            return "T";
            break;
        default:
            return String(num);
            break;
    }
}

/**
 * AIのアクション
 *
 * プリフロップ
 * 15%以上のハンドで参加(R:C=80:20)
 * 3-bet or C to 3-Bet: 10%↑
 * 4-bet or allin(stackの80%以上): 6%↑
 *
 * フロップ以降
 * 状況判断と条件分岐が多すぎるので断念
 *
 * @return {object} - type:アクションのタイプ(String), chip:ベットしてるチップ量(Number)
 */
Player.prototype.actionAI = function(round, raiseCount, minimum) {

    if (this.handStrength > 1110) {
        return this.fold();
    }

    var r = Math.floor(Math.random() * 10 + 1);

    // フロップ
    if (round === 0) {
        switch (raiseCount) {
            case 0:
                if (r < 8) return this.raise(raiseCount, minimum);
                return this.call(minimum);
            case 1:
                if (this.handStrength >= 10) return this.raise(raiseCount, minimum);
                return this.call(minimum);
            case 2:
                if (this.handStrength >= 10) return this.raise(raiseCount, minimum);
                return this.call(minimum);
            case 3:
                if (this.handStrength >= 6) return this.call(minimum);
                return this.fold();
            default:
                return this.raise(raiseCount, minimum);
        }
    }

    // フロップ以降
    if (raiseCount < 1) {
        if (r > 8) return this.raise(raiseCount, minimum);
        return this.check(round, raiseCount, minimum);
    }

    if (r > 8) return this.raise(raiseCount, minimum);
    else if (r > 3) return this.call(minimum);
    return this.fold();
}

/**
 * @param {boolean} bool - 規定額に足りなくてALLINコール:false, ALLINレイズ:true
 */
Player.prototype.allin = function(bool) {
    var additionalChip = Math.abs(this.stack - this.bet);
    this.bet += this.stack;
    this.stack = 0;
    this.isAllin = true;

    return {
        type: "ALLIN",
        chip: additionalChip,
        isRaise: bool
    }
}

Player.prototype.raise = function(raiseCount, minimum) {
    var betType = "";
    var value = 0;

    switch (raiseCount) {
        case 0:
            betType = "Bet";
            break;
        case 1:
            betType = "Raise";
            break;
        case 2:
            betType = "3-bet";
            break;
        case 3:
            betType = "4-bet";
            break;
        default:
            betType = "Raise";
            break;
    }

    // ALLINコール
    if (this.bet + this.stack <= minimum) return this.allin(false);
    if (this.bet + this.stack <= minimum * 3 && this.bet + this.stack <= minimum) return this.allin(false);
    if (this.bet + this.stack <= minimum * 3 && this.bet + this.stack > minimum) return this.allin(true);

    var additionalChip = minimum * 3 - this.bet;
    this.stack -= additionalChip;
    this.bet += additionalChip;

    return {
        type: betType,
        chip: additionalChip,
        isRaise: true
    }
}

Player.prototype.call = function(minimum) {
    //　コールに必要なスタックが無ければALL-IN
    if (this.stack + this.bet <= minimum) {
        return this.allin();
    }

    var additionalChip = minimum - this.bet;
    this.stack -= additionalChip;
    this.bet += additionalChip;

    return {
        type: "Call",
        chip: additionalChip
    }
}

Player.prototype.check = function(round, raiseCount, minimum) {
    // フロップ以降レイズが入っていなければ無条件でcheck可
    if (this.bet < minimum) {
        if (round === 0 || raiseCount !==0) return this.fold();
    }

    return {
        type: "Check",
        chip: 0
    }
}

Player.prototype.fold = function() {
    this.isFold = true;

    return {
        type: "Fold",
        chip: 0
    }
}

Player.prototype.setHandRank = function(boards) {
    // ボードとハンドを合わせた7枚から役を判定
    var judge7 = [];
    for (var c in boards) {
        judge7.push(boards[c]);
    }
    for (var c in this.hand) {
        judge7.push(this.hand[c]);
    }

    var isFlush = false,
        isStraight = false,
        isQuads = false,
        isTrips = false,
        havePair = [];

    // フラッシュ判定
    var map = [];
    for (var i = 0; i <= 3; i++) map[i] = 0;
    for (var c in judge7) map[judge7[c].suit]++;
    for (var c in map) {
        if (map[c] >= 5) {
            isFlush = c;
            break;
        }
    }

    // ストレート判定
    map = [];
    for (var i = 2; i <= 14; i++) map[i] = 0;
    for (var c in judge7) map[judge7[c].num]++;
    for (var i = 14; i > 5; i--) {
        isStraight = i;
        for (var j = 0; j < 5; j++) {
            if (map[i-j] === 0) {
                isStraight = false;
                break;
            }
        }
        if (isStraight) break;
    }

    // ペア判定
    for (var i = 14; i > 1; i--) {
        switch (map[i]) {
            case 4:
                isQuads = i;
                break;
            case 3:
                if (!isTrips) isTrips = i;
                break;
            case 2:
                havePair.push(i);
                break;
        }
    }

    this.handRank.kickers = [];
    // StraightFlush
    if (isFlush && isStraight) {
        this.handRank.rank = 9;
        this.handRank.type = "StraightFlush";
        this.handRank.kickers.push(isStraight);
    }
    // Quads
    else if (isQuads) {
        this.handRank.rank = 8;
        this.handRank.type = "Quads";
        this.handRank.kickers.push(isQuads);
        for (var i = 14; i > 1; i--) {
            if (i === isQuads) continue;
            if (map[i]) this.handRank.kickers.push(i);
            if (this.handRank.kickers.length > 0) break;
        }
    }
    // FullHouse
    else if (isTrips && havePair.length !== 0) {
        this.handRank.rank = 7;
        this.handRank.type = "FullHouse";
        this.handRank.kickers.push(isTrips);
        this.handRank.kickers.push(havePair[0]);
    }
    // Flush
    else if (isFlush !== false) {
        this.handRank.rank = 6;
        this.handRank.type = "Flush";
        for (var c in judge7) {
            if (judge7[c].suit == isFlush) this.handRank.kickers.push(judge7[c].num);
        }
        this.handRank.kickers.sort(
            function(a,b) { return a < b ? 1 : -1}
        );
        this.handRank.kickers.splice(5, this.handRank.kickers.length);
    }
    // Straight
    else if (isStraight) {
        this.handRank.rank = 5;
        this.handRank.type = "Straight";
        this.handRank.kickers.push(isStraight);
    }
    // Trips
    else if (isTrips) {
        this.handRank.rank = 4;
        this.handRank.type = "Trips";
        this.handRank.kickers.push(isTrips);
        for (var i = 14; i > 1; i--) {
            if (i === isTrips) continue;
            if (map[i]) this.handRank.kickers.push(i);
            if (this.handRank.kickers.length > 2) break;
        }
    }
    // TwoPair
    else if (havePair.length >= 2) {
        this.handRank.rank = 3;
        this.handRank.type = "TwoPair";
        this.handRank.kickers.push(havePair[0]);
        this.handRank.kickers.push(havePair[1]);
        for (var i = 14; i > 1; i--) {
            if (i === havePair[0] || i === havePair[1]) continue;
            if (map[i]) {
                this.handRank.kickers.push(i);
                break;
            }
        }
    }
    // Pair
    else if (havePair.length === 1) {
        this.handRank.rank = 2;
        this.handRank.type = "Pair";
        this.handRank.kickers.push(havePair[0]);
        for (var i = 14; i > 1; i--) {
            if (i === havePair[0]) continue;
            if (map[i]) this.handRank.kickers.push(i);
            if (this.handRank.kickers.length > 3) break;
        }
    }
    // HighCard
    else {
        this.handRank.rank = 1;
        this.handRank.type = "HighCard";
        for (var i = 14; i > 1; i--) {
            if (map[i]) this.handRank.kickers.push(i);
            if (this.handRank.kickers.length > 4) break;
        }
    }
}
