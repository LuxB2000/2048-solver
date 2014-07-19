function AI(grid) {
    this.grid = grid;
}

// performs a search and returns the best move
AI.prototype.search = function(grid, level) {
    //console.log('Iteration level ', level);

    if (level == 2) {
	var value = grid.map_energy();
    //var value = grid.entropy2();
	//console.log('Leave value: ', value);	
	return { move: -1, score: value };
    }

    var bestScore = 100000;
    var bestMove = -1;

    if (this.grid.playerTurn) {
	for (var direction in [0, 1, 2, 3]) {
	    //console.log('direction ', direction);
	    var newGrid = grid.clone();
	    if (newGrid.move(direction).moved) {
            var result = this.search(newGrid, level + 1);
            //console.log('score ', result.score);

            if (result.score < bestScore) {
                bestScore = result.score;
                bestMove = direction;
            }
	    }
	}
    }

    //console.log('best ', bestMove, ' score ', bestScore);
    return { move: bestMove, score: bestScore };
}

AI.prototype.getBest = function() {
    //console.log('New search');
    var result = this.search(this.grid, 1);
    //console.log('End Results: Direction: ', result.move, ' Score: ', result.score);
    return { move: result.move };
}

AI.prototype.getBest2 = function() {
    //console.log('New search');

    var bestScore = 1000;
    var bestMove = -1;

    if (this.grid.playerTurn) {
	for (var direction in [0, 1, 2, 3]) {
	    //console.log('direction ', direction);
	    var newGrid = this.grid.clone();
	    if (newGrid.move(direction).moved) {
		if (newGrid.isWin()) {
		    return { move: direction };
		}

		var score = newGrid.map_energy();
        //var score = newGrid.entropy2();
		//console.log('score ', score);

		if (score < bestScore) {
		    bestScore = score;
		    bestMove = direction;
		}
	    }
	}
    }

    //console.log('best ', bestMove);
    return { move: bestMove };
}

AI.prototype.translate = function(move) {
    return {
	0: 'up',
	1: 'right',
	2: 'down',
	3: 'left'
    }[move];
}

