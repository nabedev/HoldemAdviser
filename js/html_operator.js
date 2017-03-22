function HTMLOperator() {
    this.clickDevice;
    this.btnContainer = document.querySelectorAll('.btn');
    this.tableContainer = document.querySelector('.table-container');
    this.boardContainer = document.querySelector('.board')
    this.rollBoxContainer = document.querySelector('.roll-box-container');
    this.cardContainer = document.querySelectorAll('.card');
    this.potArea = document.querySelector('.pot');

    this.btnParmissions = [false, false, false, false]; //0:Fold,1:Check,2:Call,3:Raise
    this.suit = ["♠","♥","♦","♣"];
}

HTMLOperator.prototype.setButtonState = function(fold, check, call, raise) {
    this.btnParmissions = [fold, check, call, raise];

    for (var i = 0; i < this.btnContainer.length; i++) {
        this.btnContainer[i].classList.remove('active');
        this.btnContainer[i].classList.remove('on');
        this.btnContainer[i].classList.add('inactive');
    }
    
    for (var c in arguments) {
        if (arguments[c]) {
            this.btnParmissions[c] = arguments[c];
            this.btnContainer[c].classList.remove('inactive');
            this.btnContainer[c].classList.add('active');
        }
    }
}

HTMLOperator.prototype.addSeat = function(num) {
    var div = document.createElement('div');
    var inner = document.createElement('div');
    var position = 'position-' + num;

    div.setAttribute('class', 'seat ' + position);
    inner.setAttribute('class', 'stack');
    // inner.textContent = stack;

    div.appendChild(inner);

    this.tableContainer.appendChild(div);
}

HTMLOperator.prototype.addMsgBox = function(player) {
    var element = document.querySelector('.position-' + player.id);

    var box = document.createElement('div');
    box.setAttribute('class', 'msg-box');
    element.appendChild(box);
}

HTMLOperator.prototype.addRollBox = function(player, roll) {
    var element = document.querySelector('.position-' + player.id);
    var div = document.createElement('div');
    var y = element.offsetTop - 10;
    var x = element.offsetLeft - 10;

    div.setAttribute('class', 'roll-box');
    div.style.top = y + 'px';
    div.style.left = x + 'px';
    div.textContent = roll;

    this.rollBoxContainer.appendChild(div);
}

HTMLOperator.prototype.addHand = function(player)  {
    var element = document.querySelector('.position-' + player.id);
    var hand1 = document.createElement('div');
    var hand2 = document.createElement('div');

    hand1.setAttribute('class', 'hand');
    hand2.setAttribute('class', 'hand');
    element.appendChild(hand1);
    element.appendChild(hand2);

    var margin = 3;
    hand1.style.left = element.clientWidth + margin + 'px';
    hand2.style.left = element.clientWidth + hand2.clientWidth + margin*2 + 'px';
}

HTMLOperator.prototype.setPot = function(value) {
    this.potArea.textContent = "Pot: " + value;
}

HTMLOperator.prototype.setStack = function(player) {
    var element = document.querySelector('.position-' + player.id).children[0];
    element.textContent = player.stack;

    if (player.isSitout) element.textContent = '';
}

HTMLOperator.prototype.setHand = function(player) {
    var hand1 = document.querySelector('.position-' + player.id).children[2];
    var hand2 = document.querySelector('.position-' + player.id).children[3];

    hand1.textContent = player.convertNum2Str(player.hand[0].num) + this.suit[player.hand[0].suit];
    hand2.textContent = player.convertNum2Str(player.hand[1].num) + this.suit[player.hand[1].suit];

    hand1.style.color = this.getTextColor(player.hand[0].suit);
    hand2.style.color = this.getTextColor(player.hand[1].suit);

    hand1.classList.add('show');
    hand2.classList.add('show');
}

HTMLOperator.prototype.setBoard = function(round, boards) {
    if (round === 1) {
        for (var i = 0; i < 3; i++) {
            this.boardContainer.children[i].textContent = this.convertNum2Str(boards[i].num) + this.suit[boards[i].suit];
            this.boardContainer.children[i].style.color = this.getTextColor(boards[i].suit);
            this.boardContainer.children[i].classList.add('show');
        }
    } else {
        this.boardContainer.children[round+1].textContent = this.convertNum2Str(boards[round+1].num) + this.suit[boards[round+1].suit];
        this.boardContainer.children[round+1].style.color = this.getTextColor(boards[round+1].suit);
        this.boardContainer.children[round+1].classList.add('show');
    }
}

HTMLOperator.prototype.setMsg = function(player, text) {
    var element = document.querySelector('.position-' + player.id);
    var box = element.children[1];
    var seatSize = element.clientHeight;

    box.textContent = text;
    box.style.top = '-' + seatSize + 'px';
    box.style.left = seatSize/2 - box.clientWidth/2 + 'px';

    box.classList.remove('active');
    void box.offsetWidth;
    box.classList.add('active');
}

HTMLOperator.prototype.addLogMsg = function(text, player, announce, delay, adviser) {
    var element = document.querySelector('.log-container');
    var ul = element.children[0];
    var li = document.createElement('li');
    // li.setAttribute('class', 'adviser');

    if (adviser) {
        li.setAttribute('class', 'adviser');
        li.textContent = text;
        ul.appendChild(li);

        li = document.createElement('li');
        li.setAttribute('class', 'info');
        li.textContent = 'ADVISER';
        ul.appendChild(li);
    }

    if (announce) {
        li.setAttribute('class', 'announce');
        li.textContent = text;
        ul.appendChild(li);

        if (delay) {
            (function(){
                var i = delay;
                function timer() {
                    li.textContent = 'Starting next ... ' + i/1000 + 'sec';
                    var tid = setTimeout(function(){
                        i -= 1000;
                        timer();                    
                    }, 1000);
                    if (i === 0) clearTimeout(tid);
                }
                timer();
            })();
        }
    }

    if (player) {
        li.textContent = (player.id === 1) ? 'You: ' + text : 'AI-' + player.id + ': ' + text;
        ul.appendChild(li);
    }

    element.scrollTop = ul.clientHeight;

}

/**
 * スートに応じてtextcolorを返す
 * @return {string}
 */
HTMLOperator.prototype.getTextColor = function(num) {
    return (num === 1 || num === 2) ? "red" : "black";
}

HTMLOperator.prototype.convertNum2Str = function(num) {
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
 * 引数で受け取ったクラスから表示用クラスを削除
 * @param {boolean}
 */
HTMLOperator.prototype.removeDispClasses = function(msgBox, hand, rollBox, board, player) {

    if (msgBox) {
        var msgBox = document.getElementsByClassName('msg-box');
        for (var i = 0; i < msgBox.length; i++) {
            if ((player[i].isAllin || player[i].isFold) && !player[i].isSitout) continue;
            msgBox[i].classList.remove('active');
        }
    }

    if (hand) {
        var hand = document.getElementsByClassName('hand');
        for (var i = 0; i < hand.length; i++) {
            hand[i].classList.remove('show');
        }
    }

    if (rollBox) {
        this.rollBoxContainer.textContent = null;
    }

    if (board) {
        for (var i = 0; i < this.boardContainer.children.length; i++) {
            this.boardContainer.children[i].classList.remove('show');
        }
    }
}