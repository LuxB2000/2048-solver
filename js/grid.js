function Grid(size) {
  this.size = size;
  this.startTiles   = 2;

  this.cells = [];

  this.build();
  this.playerTurn = true;
}

// pre-allocate these objects (for speed)
Grid.prototype.indexes = [];
for (var x=0; x<4; x++) {
  Grid.prototype.indexes.push([]);
  for (var y=0; y<4; y++) {
    Grid.prototype.indexes[x].push( {x:x, y:y} );
  }
}

// Build a grid of the specified size
Grid.prototype.build = function () {
  for (var x = 0; x < this.size; x++) {
    var row = this.cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }
};


// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];
  var self = this;

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      //cells.push(self.indexes[x][y]);
      cells.push( {x:x, y:y} );
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

Grid.prototype.clone = function() {
  newGrid = new Grid(this.size);
  newGrid.playerTurn = this.playerTurn;
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (this.cells[x][y]) {
        newGrid.insertTile(this.cells[x][y].clone());
      }
    }
  }
  return newGrid;
};

// Set up the initial tiles to start the game with
Grid.prototype.addStartTiles = function () {
  for (var i=0; i<this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
Grid.prototype.addRandomTile = function () {
  if (this.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    //var value = Math.random() < 0.9 ? 256 : 512;
    var tile = new Tile(this.randomAvailableCell(), value);

    this.insertTile(tile);
  }
};

// Save all tile positions and remove merger info
Grid.prototype.prepareTiles = function () {
  this.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
Grid.prototype.moveTile = function (tile, cell) {
  this.cells[tile.x][tile.y] = null;
  this.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};


Grid.prototype.vectors = {
  0: { x: 0,  y: -1 }, // up
  1: { x: 1,  y: 0 },  // right
  2: { x: 0,  y: 1 },  // down
  3: { x: -1, y: 0 }   // left
}

// Get the vector representing the chosen direction
Grid.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  return this.vectors[direction];
};

// Move tiles on the grid in the specified direction
// returns true if move was successful
Grid.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var score      = 0;
  var won        = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = self.indexes[x][y];
      tile = self.cellContent(cell);

      if (tile) {
        //if (debug) {
          //console.log('tile @', x, y);
        //}
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.insertTile(merged);
          self.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          score += merged.value;

          // The mighty 2048 tile
          if (merged.value > 8000) {
            won = true;
          }
        } else {
          //if (debug) {
            //console.log(cell);
            //console.log(tile);
          //}
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          self.playerTurn = false;
          //console.log('setting player turn to ', self.playerTurn);
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  //console.log('returning, playerturn is', self.playerTurn);
  //if (!moved) {
    //console.log('cell', cell);
    //console.log('tile', tile);
    //console.log('direction', direction);
    //console.log(this.toString());
  //}
  return {moved: moved, score: score, won: won};
};

Grid.prototype.computerMove = function() {
  this.addRandomTile();
  this.playerTurn = true;
}

// Build a list of positions to traverse in the right order
Grid.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

Grid.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.withinBounds(cell) &&
           this.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

Grid.prototype.movesAvailable = function () {
  return this.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
// returns the number of matches
Grid.prototype.tileMatchesAvailable = function () {
  var self = this;

  //var matches = 0;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; //matches++; // These two tiles can be merged
          }
        }
      }
    }
  }

  //console.log(matches);
  return false; //matches;
};

Grid.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

Grid.prototype.toString = function() {
  string = '';
  for (var i=0; i<4; i++) {
    for (var j=0; j<4; j++) {
      if (this.cells[j][i]) {
        string += this.cells[j][i].value + ' ';
      } else {
        string += '_ ';
      }
    }
    string += '\n';
  }
  return string;
}

// check for win
Grid.prototype.isWin = function() {
  var self = this;
  for (var x=0; x<4; x++) {
    for (var y=0; y<4; y++) {
      if (self.cellOccupied(this.indexes[x][y])) {
        if (self.cellContent(this.indexes[x][y]).value > 8000) {
          return true;
        }
      }
    }
  }
  return false;
}

//Grid.prototype.zobristTable = {}
//for
//Grid.prototype.hash = function() {
//}

Grid.prototype.entropy = function() {
    var entropy = 0;

    var cells = 0;

    var lastValue = 0;
    if ( this.cellOccupied( this.indexes[0][0] )) {
	lastValue = Math.log(this.cellContent( this.indexes[0][0] ).value) / Math.log(2);
	cells += 1;
    }

    var direction = false;

    for (var y=0; y<4; y++) {
	for (var x=0; x<4; x++) {
	    if (x == 0 && y == 0) {
		continue;
	    }

	    var coordx = x;
	    if (direction) {
		coordx = 3 - x;
	    }

	    var value = 0;
	    if ( this.cellOccupied( this.indexes[coordx][y] )) {
		value = Math.log(this.cellContent( this.indexes[coordx][y] ).value) / Math.log(2);
		cells += 1;
	    }

	    if (value > lastValue) {
		var delta = value - lastValue;
		entropy += delta * delta;
		//entropy += delta;
	    }

	    lastValue = value;
	}

	direction = !direction;
    }

    entropy += cells * cells;
    return entropy;
}

// return the entropy of a single position, 0 if the position is empty
Grid.prototype.cost = function(x,y){
    var empty = 0;
    return this.cellOccupied(this.indexes[x][y]) ?
        Math.log(this.cellContent(this.indexes[x][y]).value) / Math.log(2) : empty;
}

// return the 4 neighborhood positions in the order BELOW,TOP,RIGHT,LEFT
Grid.prototype.neigh4 = function(x,y){
    var dir = [0,1,0,-1,1,0,-1,0];
    var N=4;
    var d=0,dx,dy;
    var neigh = [];

    while(d<(N*2)){
        dx = x + dir[d];
        dy = y + dir[d+1];

        if( dx >= 0 && dx < 4 && dy >= 0 && dy < 4 ){
            neigh.push({x:dx,y:dy});
        }
        d += 2;
    }

    return neigh;
}

// return the 2 neighborhood positions in the order BELOW,LEFT
Grid.prototype.neigh2 = function(x,y){
    var dir = [0,1,1,0];
    var N=2;
    var d=0,dx,dy;
    var neigh = [];

    while(d<(N*2)){
        dx = x + dir[d];
        dy = y + dir[d+1];

        if( dx >= 0 && dx < 4 && dy >= 0 && dy < 4 ){
            neigh.push({x:dx,y:dy});
        }
        d += 2;
    }

    return neigh;
}


Grid.prototype.map_estimation = function () {
    var empty = 0;
    var self = this;

    var grad = function(xi,xj){
        dx = xi.x - xj.x;
        dy = xi.y - xj.y;
        dx = (dx>=0) ? 1 : -1;
        dy = (dy>=0) ? 1 : -1;
        return { dx:dx,dy:dy }
    }
    var GetValue = function(xi){
        var x=xi.x; var y=xi.y;
        return self.cellOccupied(self.indexes[x][y]) ?
            Math.log(self.cellContent(self.indexes[x][y]).value) / Math.log(2) : empty;
    }
    var UnaryPot = function(xi){
        return GetValue(xi);
    }
    var delta = function(li,lj){
        return ((li-lj)==0) ? 0 : 1;
    }
    var PairwiseCoast = function(xi,xj){
        li = GetValue(xi);
        lj = GetValue(xj);
        gd = grad(xi,xj);
        beta_h = 10;
        beta_v = 1 / (4-xi.x);
        if(gd.dx == 0){
            u2 = beta_h * delta(li,lj);
        }else{
            u2 = beta_v * delta(li,lj);
        }
        return u2;

    }
    var U1 = 0, U2 =0;
    for(var x=0; x<4; x++){
        for(var y=0; y<4; y++){
            U1 += UnaryPot({x:x,y:y});

            N = self.neigh2(x,y);
            for(var n=0; n< N.length; n++){
                U2 += PairwiseCoast({x:x,y:y},N[n])
            }
        }
    }

    //console.log('U1:' , U1, ' U2:', U2);


    return (U1 + U2);

}

Grid.prototype.map_energy = function() {
    //var eps = 0.0000001;
    //e = Math.exp( - this.map_estimation() + eps);
    //console.log('E:', e);
    return  this.map_estimation();
}

Grid.prototype.entropy2 = function() {
    var entropy = 0;
    var cells = 0;
    var Ch = 1.5;

    var deltaHandicap = 0;

    for (var y=0; y<4; y++) {
	for (var x=0; x<4; x++) {
        if (this.cellOccupied(this.indexes[x][y])) { cells++; }

        // local value
	    var value = this.cost(x,y);


        var neigh = this.neigh2(x,y);
        //console.log('cur: [',x,',',y,'] - neigh:', neigh);

        // Parse the neigh and compute the entropy
        for(var n=0; n<neigh.length; n++){
            var nV = this.cost(neigh[n].x, neigh[n].y);
            if( nV > value){
                var delta = nV - value + deltaHandicap;
                entropy += Ch * delta * delta;
            }

            entropy += 1.25 * Math.abs( nV - value ) * nV;
        }

        /*
	    if (x != 3) {
            var rightNeigh = this.cost(x+1,y); // right neighbor value

            if (rightNeigh > value) {
                var delta = rightNeigh - value + deltaHandicap;
                entropy += Ch * delta * delta;
                //entropy += delta;
            }

            entropy += 0.5 * Math.abs(rightNeigh - value) * rightNeigh;
	    }

	    if (y != 3) {
            var belowNeigh = this.cost(x,y+1); // below neighbor value

            if (belowNeigh > value) {
                var delta = belowNeigh - value + deltaHandicap;
                entropy += delta * delta;
                //entropy += delta;
            }

		    entropy += 1.25 * Math.abs(belowNeigh - value) * belowNeigh;
	    }
	    */
	}}

    entropy += cells * cells * cells;
    return entropy;
}
