(function($, window, undefined) {

var hasOwn = Object.prototype.hasOwnProperty,
    push = Array.prototype.push,
    shallowMerge = function(o) {
      for (var key in o) {
        if (hasOwn.call(o, key)) {
          this[key] = o[key];
        }
      }
      return this;
    },
    randomInt = function (min, max) {
      return min + Math.floor(Math.random() * (max - min + 1))
    },
    indexOf = hasOwn.call(Array.prototype, 'indexOf') ? Array.prototype.indexOf :
      // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
      function(searchElement, fromIndex) {
        if (this === void 0 || this === null) {
          throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
          return -1;
        }

        var n = 0;
        if (fromIndex !== undefined) {
          n = Number(fromIndex);
          if (n !== n) { // shortcut for verifying if it's NaN
            n = 0;
          } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
            n = (n > 0 || -1) * Math.floor(Math.abs(n));
          }
        }

        if (n >= len) {
          return -1;
        }

        var k = n >= 0 ?
              n :
              Math.max(len - Math.abs(n), 0);

        for (; k < len; k++) {
          if (k in t && t[k] === searchElement) {
            return k;
          }
        }
        return -1;
      };

var Square = function (options) {
  var defaults = {
    is_mine: false,
    is_flagged: false,
    is_opened: false
  };
  var options = shallowMerge.call(defaults, options);

  for (var key in defaults) {
    this[key] = options[key];
  }
};

Square.prototype = {
  constructor: Square,

  setIsMine: function (is_mine) {
    this.is_mine = !!is_mine;
  },

  isMine: function () {
    return !!this.is_mine;
  },

  isFlagged: function () {
    return !!this.is_flagged;
  },

  isOpened: function () {
    return !!this.is_opened;
  },

  toggleFlag: function () {
    this.is_flagged = !this.is_flagged;
    return this.isFlagged();
  },

  open: function () {
    this.is_opened = true;

    return !this.isMine();
  }
};

//  9x9  = 10
// 16x16 = 40
// 16x30 = 99
var Board = function (options) {
  var defaults = {
    width: 9,
    height: 9,
    mines: 10
  };
  var options = shallowMerge.call(defaults, options);

  for (var key in defaults) {
    this[key] = options[key];
  }

  this.generateSquares();
  this.opened_squares = 0;
};

Board.prototype = {
  constructor: Board,

  generateSquares: function () {
    this.squares = [];
    this.mine_coords = [];

    for (var x=0; x < this.width; x++) {
      push.call(this.squares, []);
      for (var y=0; y < this.height; y++) {
        push.call(this.squares[x], new Square());
      }
    }

    var randoms = [],
        min = 0,
        max = this.width * this.height - 1;

    for (var i=0; i < this.mines; i++) {
      var random;
      do {
        random = randomInt(min, max);
      } while (indexOf.call(randoms, random) !== -1);
      push.call(randoms, random);

      var x = random % this.width,
          y = Math.floor(random / this.width);
      this.squares[x][y].setIsMine(true);
      push.call(this.mine_coords, {x:x, y:y});
    }
  },

  getSquare: function (x, y) {
    return this.squares[x][y];
  },

  countNeighbours: function (x, y) {
    var neighbours = this.getNeighbours(x, y);
    var count = 0;
    for (var i=0, l=neighbours.length; i < l; i++) {
      if (this.squares[neighbours[i].x][neighbours[i].y].isMine()) {
        count++;
      }
    }
    return count;
  },

  getNeighbours: function (x, y) {
    var neighbours = [];
    if (x > 0 && y > 0) { // top left
      push.call(neighbours, {x:x-1, y:y-1});
    }
    if (x > 0) { // left
      push.call(neighbours, {x:x-1, y:y});
    }
    if (y > 0) { // top
      push.call(neighbours, {x:x, y:y-1});
    }
    if (x < this.width - 1 && y < this.height - 1) { // bottom right
      push.call(neighbours, {x:x+1, y:y+1});
    }
    if (x < this.width - 1) { // right
      push.call(neighbours, {x:x+1, y:y});
    }
    if (y < this.height - 1) { // bottom
      push.call(neighbours, {x:x, y:y+1});
    }
    if (x < this.width - 1 && y > 0) { // top right
      push.call(neighbours, {x:x+1, y:y-1});
    }
    if (x > 0 && y < this.height - 1) { // bottom left
      push.call(neighbours, {x:x-1, y:y+1});
    }
    return neighbours;
  }
};

var Timer = function (context, callback, interval) {
  this.context = context;
  this.callback = callback;
  this.timerID = null;
  this.interval = interval;
  this.steps = 0;
  this.step();
};

Timer.prototype = {
  constructor: Timer,

  step: function () {
    this.cancel();
    var that = this;
    this.timerID = window.setTimeout(function () {
      that.timerID = null;
      that.steps++;
      that.step();
      that.callback.call(that.context);
    }, this.interval * 1000);
  },

  totalSteps: function () {
    return this.steps;
  },

  cancel: function () {
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }
};

var Game = function (options) {
  var defaults = {
    view: null
  };
  var options = shallowMerge.call(defaults, options);

  for (var key in defaults) {
    this[key] = options[key];
  }

  this.view.setDelegate(this);
  this.view.initialMenu();

  this.board = null;
  this.timer = null;
};

Game.prototype = {
  constructor: Game,

  newGame: function (data) {
    if (this.timer !== null) {
      this.timer.cancel();
    }
    this.board = new Board({
      width: Math.floor(this.view.width.val()),
      height: Math.floor(this.view.height.val()),
      mines: Math.floor(this.view.mines.val())
    });
    this.view.createBoard(this.board.width, this.board.height);
    this.view.playingMenu();
    this.view.setTimer(0);
    this.timer = new Timer(this, this.timerStep, 1);
  },

  timerStep: function () {
    this.view.setTimer(this.timer.totalSteps());
  },

  pause: function (data) {
    this.timer.cancel();
    this.view.toggleShowBoard(false);
    this.view.pauseMenu();
  },

  resume: function (data) {
    this.view.toggleShowBoard(true);
    this.view.playingMenu();
    this.timer.step();
  },

  gameOver: function (win) {
    var class_to_add;
    if (win) {
      class_to_add = 'foundMine';
    } else {
      class_to_add = 'blownMine';
    }
    this.timer.cancel();
    this.view.initialMenu();
    for (var i=0, l=this.board.mine_coords.length; i < l; i++) {
      this.view.getSquare(this.board.mine_coords[i].x, this.board.mine_coords[i].y).addClass(class_to_add);
    }
    $('.square').unbind().removeAttr('href').removeClass('highlightSquare');
  },

  squareClicked: function (data) {
    var x     = data.x,
        y     = data.y,
        model = this.board.getSquare(x, y);
        view  = this.view.getSquare(x, y);

    if (model.isMine() && !model.isFlagged()) {
      this.gameOver(false);
    } else if (!model.isOpened() && !model.isFlagged()) {
      this.board.opened_squares++;
      model.open();
      var count = this.board.countNeighbours(x, y);
      this.view.squareClicked(x, y, count);
      if (count < 1) {
        var neighbours = this.board.getNeighbours(x, y);
        for (var i=0, l=neighbours.length; i < l; i++) {
          this.squareClicked(neighbours[i]);
        }
      }
      if (this.board.opened_squares >= this.board.width * this.board.height - this.board.mines) {
        this.gameOver(true);
      }
    }
  },
  squareRightClicked: function (data) {
    var x     = data.x,
        y     = data.y,
        model = this.board.getSquare(x, y);

    if (!model.isOpened()) {
      this.view.toggleFlag(x, y, model.toggleFlag());
    }
  }
};

var View = function () {
  this.delegate = null;
  this.menu = $('#menu');
  this.board = $('#board').hide();
  this.timer = $('#timer');
  this.width = $('#width').val('9');
  this.height = $('#height').val('9');
  this.mines = $('#mines').val('10');
  this.menu_items = {};
  this.square_width = 30;
  this.square_height = 30;
};

View.prototype = {
  constructor: View,

  setDelegate: function (delegate) {
    this.delegate = delegate;
  },

  createMenuItems: function () {
    var new_game = $('<li>').append($('<a>').attr('href', '#').text('New Game').
      click({
        context: this.delegate,
        callback: this.delegate.newGame
      }, this.processEvent));

    var pause = $('<li>').append($('<a>').attr('href', '#').text('Pause').
      click({
        context: this.delegate,
        callback: this.delegate.pause
      }, this.processEvent));

    var resume = $('<li>').append($('<a>').attr('href', '#').text('Resume').
      click({
        context: this.delegate,
        callback: this.delegate.resume
      }, this.processEvent));

    this.menu_items = {
      new_game: new_game,
      pause: pause,
      resume: resume
    };
  },

  initialMenu: function () {
    this.createMenuItems();
    this.menu.empty().append(this.menu_items.new_game);
  },

  pauseMenu: function () {
    this.createMenuItems();
    this.menu.empty().append(this.menu_items.new_game).append(this.menu_items.resume);
  },

  playingMenu: function () {
    this.createMenuItems();
    this.menu.empty().append(this.menu_items.new_game).append(this.menu_items.pause);
  },

  processEvent: function (event) {
    event.data.callback.call(event.data.context, event.data, event);
    return false;
  },

  createBoard: function (cols, rows) {
    var that = this;
    this.squares = [];
    this.board.hide('fast', function () {
      that.board.empty();
      that.board.width(cols * (that.square_width + 1));
      that.board.height(rows * (that.square_height + 1));
      for (var y=0; y < rows; y++) {
        var row = $('<div>').addClass('row');
        push.call(that.squares, []);
        for (var x=0; x < cols; x++) {
          push.call(that.squares[y], $('<a>').attr('href', '#').addClass('square').text(' ').click({
            context: that.delegate,
            callback: that.delegate.squareClicked,
            x: x,
            y: y
          }, that.processEvent).mouseenter({
            context: that,
            callback: that.highlightSquare,
            x: x,
            y: y
          }, that.processEvent).mouseleave({
            context: that,
            callback: that.unhighlightSquare,
            x: x,
            y: y
          }, that.processEvent).mousedown({
            context: that,
            callback: that.rightClick,
            x: x,
            y: y
          }, that.processEvent).bind('contextmenu', function(event) {
            event.preventDefault();
          }));
          row.append(that.squares[y][x]);
        }
        that.board.append(row);
      }
      that.board.show('fast');
    });
  },

  highlightSquare: function (data) {
    var square = this.squares[data.y][data.x];
    square.addClass('highlightSquare');
  },

  unhighlightSquare: function (data) {
    var square = this.squares[data.y][data.x];
    square.removeClass('highlightSquare');
  },

  rightClick: function (data, event) {
    var code = hasOwn.call(event, 'keyCode') && event.keyCode ? event.keyCode :
              (hasOwn.call(event, 'which') ? event.which : null);
    if (code === 3) {
      this.delegate.squareRightClicked(data);
    }
  },

  getSquare: function (x, y) {
    return this.squares[y][x];
  },

  setTimer: function (time) {
    this.timer.text(time);
  },

  toggleFlag: function (x, y, flag) {
    if (flag) {
      this.squares[y][x].addClass('flagged').text('F');
    } else {
      this.squares[y][x].removeClass('flagged').text('');
    }
  },

  toggleShowBoard: function (show) {
    if (show) {
      this.board.show('fast');
    } else {
      this.board.hide('fast');
    }
  },

  squareClicked: function (x, y, neighbour_count) {
    var square = this.squares[y][x];
    if (neighbour_count > 0) {
      square.text(neighbour_count).addClass('count'+neighbour_count);
    }
    square.removeAttr('href').unbind('click').addClass('opened');
  }
};

$(window.document).ready(function () {

  var v = new View();
  var g = new Game({view:v});

});

})(jQuery, window);
