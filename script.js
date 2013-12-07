// Conway's Game of War
// by Alex Thornton-Clark, Jill Sauer, and Ryan Casey
// www.highclasskitsch.com

// uses createjs and jquery


// var for the preload queue
var queue;

// var for the easeljs stage object
var stage;

// two-dimensional array for the game grid
// note: this array holds JSON objects with the indicies of children we add to the stage, their allegience, and their status (see below)
var gridArr = new Array();

// vars for cell status
var DEAD = 0;
var ALIVE = 1;
var TO_LIVE = 2;
var TO_DIE = 3;

// 'constants' for array sizes
// this is NOT grid size in px
// I, uh, I made that mistake a couple of times
var GRID_WIDTH = 14;
var GRID_HEIGHT = 7;

// 'constants' for grid size in px
// (see above)
var CANVAS_WIDTH = 700;
var CANVAS_HEIGHT = 350

// size of the tiles in px
var TILE_SIZE = 50;

// are we currently playing the game?
var playing = false;

// have we picked up a tile?
var grabbed = false;

// have we moved/created a cell this turn?
var grabbedThisTurn = false;

// the team controlling the current turn
var turn = 1;

// number of live cells each player currently controls
var player1Cells = 0;
var player2Cells = 0;

// instance of the music we'll be using
var musicInstance;

// indicies of the help popup components in the stage's children
var helpIn = 0;
var helpCloseIn = 0;
var pageIn = 0;
var helpPage = 1;

// sets everything up
function init() {
	// set up array for game grid
	// tiles are 50 x 50, grid is 700 x 350, gives us 14 x 7 elements in the arrays
	for (var i = 0; i < GRID_WIDTH; i++) {
		gridArr[i] = new Array();
		for (var j = 0; j < GRID_HEIGHT; j++) {
			gridArr[i][j] = Math.random();
		}
	}

	stage = new createjs.Stage("gameCanvas");

	// do all that preloading stuff
	queue = new createjs.LoadQueue(false);
	queue.installPlugin(createjs.Sound);
	queue.addEventListener("complete", handleComplete);
	queue.loadManifest([
		{id:"grid", src:"assets/game/gridOverlay.png"},
		{id:"forestTile", src:"assets/game/foresttile1.png"},
		{id:"techTile", src:"assets/game/techtile1.png"},
		{id:"bgMusic", src:"assets/game/bgMusic.mp3"},
		{id:"player1Win", src:"assets/ui/PlayerOneWin.png"},
		{id:"player2Win", src:"assets/ui/PlayerTwoWin.png"},
		{id:"help1", src:"assets/help/HowTo1.png"},
		{id:"help2", src:"assets/help/HowTo2.png"},
		{id:"close", src:"assets/help/Close.png"},
		{id:"pg1", src:"assets/help/Page1Indicator.png"},
		{id:"pg2", src:"assets/help/Page2Indicator.png"}
	]);
}

// set up the game now that we've loaded everything
function handleComplete() {

	// show that grid
	var grid = new createjs.Bitmap(queue.getResult("grid"));
	grid.x = 0;
	grid.y = 0;
	stage.addChild(grid);

	// lel generate randum greed
	var cell;
	
	for (var i = 0; i < GRID_WIDTH; i++) {
		for (var j = 0; j < GRID_HEIGHT; j++) {
			if (Math.random() > gridArr[i][j]) {
				if (i < 7) {
					gridArr[i][j] = {"index":addTile(i, j, "forestTile"), "team":1, "status":ALIVE};
					player1Cells++;
				}
				else {
					gridArr[i][j] = {"index":addTile(i, j, "techTile"), "team":2, "status":ALIVE};
					player2Cells++;
				}
			}
			else {
				// add white, transparent cell (placeholder)
				gridArr[i][j] = {"index":addCell(i, j, "rgba(255,255,255,0.1)"), "team":0, "status":DEAD};
			}
		}
	}
	
	// start playing the background music and set up event listener to loop indefinitely
	musicInstance = createjs.Sound.play("bgMusic");
	musicInstance.addEventListener("complete", playAgain);
	
	// once we've created and populated the grid, maken that update
	stage.update()
	
	playing = true;
}

// advance the simulation
function advance() {
	if (playing) {
		var n = 0;

		// mark up cells based on the rules
		for (var i = 0; i < GRID_WIDTH; i++) {
			for (var j = 0; j < GRID_HEIGHT; j++) {
				// check neighbors based on whose turn it is
				n = checkNeighbors(i, j, turn);
			
				// only the current team's cells can die due to population
				if (gridArr[i][j].team == turn && gridArr[i][j].status == ALIVE) {
					// die from underpopulation
					if (n < 2) {
						gridArr[i][j].status = TO_DIE;
					}
					// die from overpopulation
					else if (n > 3) {
						gridArr[i][j].status = TO_DIE;
					}
				}
				// live from neighbors based on team
				else if ((gridArr[i][j].status == DEAD || gridArr[i][j].team != turn) && n == 3) {
				
						// update cell counts if we're overwriting a cell
						if (gridArr[i][j].team == 1) {
							player1Cells--;
						}
						else if (gridArr[i][j].team == 2) {
							player2Cells--;
						}
				
						// we get a little bit tricky here: instead of adding separate TO_LIVE states for each team
						// we just change the target cell's team to the team of the current player
						// therefore when the cell 'lives' it has the new team
						gridArr[i][j].status = TO_LIVE;
						gridArr[i][j].team = turn;					
				}
			}
		}
		
		// now actually create/destroy cells
		for (var i = 0; i < GRID_WIDTH; i++) {
			for (var j = 0; j < GRID_HEIGHT; j++) {
				if (gridArr[i][j].status == TO_DIE) {
					// remove it from the stage and add palceholder in its place
					killCell(i, j);
					if (gridArr[i][j].team == 1) {
						player1Cells--;
					}
					else if (gridArr[i][j].team == 2) {
						player2Cells--;
					}
					
					gridArr[i][j] = {"index":addCell(i, j, "rgba(255,255,255,0.1)"), "team":0, "status":DEAD};
				}
				else if (gridArr[i][j].status == TO_LIVE) {
					var team = gridArr[i][j].team;
					
					killCell(i, j);
					
					if (team == 1) {
						var ind = addTile(i, j, "forestTile");
					}
					else {
						var ind = addTile(i, j, "techTile");
					}
					
					if (team == 1) {
						player1Cells++;
					}
					else if (team == 2) {
						player2Cells++;
					}
					
					gridArr[i][j] = {"index":ind, "team":team, "status":ALIVE};
				}
			}
		}
		
		// remind the players whose turn it is
		turn++;
		
		if (turn == 2) {
			$("#turnIndicator").html("<img src='assets/ui/PlayerTwoTurn.png' alt='Player Two's Turn' height='100' width='300'></img>");
		}
		else {
			turn = 1;
			$("#turnIndicator").html("<img src='assets/ui/PlayerOneTurn.png' alt='Player One's Turn' height='100' width='300'></img>");
		}
		
		// check for VICTORY
		if (player1Cells <= 0) {
			playing = false;
			//stage.removeAllChildren();
			var winMsg = new createjs.Bitmap(queue.getResult("player2Win"));
			winMsg.x = (CANVAS_WIDTH - 300) / 2;
			winMsg.y = (CANVAS_HEIGHT - 100) / 2;
			stage.addChild(winMsg);
			$("#nextTurn").html("");
			$("#helpMe").html("");
		}
		else if (player2Cells <= 0) {
			playing = false;
			//stage.removeAllChildren();
			var winMsg = new createjs.Bitmap(queue.getResult("player1Win"));
			winMsg.x = (CANVAS_WIDTH - 300) / 2;
			winMsg.y = (CANVAS_HEIGHT - 100 )/ 2;
			stage.addChild(winMsg);
			$("#nextTurn").html("");
			$("#helpMe").html("");
		}
		else {
			grabbedThisTurn = false;
			$("#nextTurn").html("<a href='javascript:advance()'><img src='assets/ui/NextIcon.gif' alt='Advance Turn' height='50' width='100'></img></a>");
			$("#helpMe").html("<a href='javascript:showHelp()'><img src='assets/ui/HelpIcon.gif' alt='Help' height='50' width='50'></img></a>");
		}
		
		// remember to actually update the stage so we can see the changes
		stage.update();
	}
}

// add a cell to the stage with the designated x, y, and color values
// returns the index of the new cell in the stage
function addCell(x, y, color) {
	var cell = new createjs.Shape();
	cell.graphics.beginFill(color).drawRect(x * TILE_SIZE,y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
	cell.addEventListener("click", handleClick);
	cell.name = x + ", " + y;
	cell.gridX = x;
	cell.gridY = y;
	var chld = stage.addChild(cell);
	
	return stage.getChildIndex(chld);
}

// add a cell to the stage with the designated x, y, and color values
// returns the index of the new cell in the stage
function addTile(x, y, tile) {
	var cell = new createjs.Bitmap(queue.getResult(tile));
	cell.addEventListener("click", handleClick);
	cell.x = x * TILE_SIZE;
	cell.y = y * TILE_SIZE;
	cell.name = x + ", " + y;
	cell.gridX = x;
	cell.gridY = y;
	var chld = stage.addChild(cell);
	
	return stage.getChildIndex(chld);
}

// remove the cell at x,y from the grid and remove it from the stage
// also update all remaining cell's indicies to account for the maintenace the stage does
// NB: does not automatically adda a dead cell in the old cell's place because we also use this to remove dead cells
function killCell(x, y) {
	var ind = gridArr[x][y].index;
	
	stage.removeChildAt(ind);
	
	gridArr[x][y].status = DEAD;
	
	// now update the other indicies
	for (var i = 0; i < GRID_WIDTH; i++) {
		for (var j = 0; j < GRID_HEIGHT; j++) {
			if (gridArr[i][j].index > ind) {
				gridArr[i][j].index = gridArr[i][j].index - 1;
			}
		}
	}
}

// count how many currently living neighbors of the same team a living cell has
function checkNeighbors(x, y, team) {
	var neighbors = 0;
		
	for (var i = x - 1; i <= x + 1; i++) {
		// make sure we're checking within the horizontal bounds
		if (i >= 0 && i < GRID_WIDTH) {
			for(var j = y - 1; j <= y + 1; j++) {
				// make sure we're checking within the vertical bounds
				if (j >= 0 && j < GRID_HEIGHT) {
					// if that space is not null, we've got a live neighbor
					if ((i != x || j != y) && gridArr[i][j].status != DEAD && gridArr[i][j].status != TO_LIVE && gridArr[i][j].team == turn) {
						neighbors++;
					}
				}
			}
		}
	}
	
	return neighbors;
}

// what to do when clicking on cells (alive or otherwise)
function handleClick(event) {
	if (playing) {
		var targ = event.target;
		
		// if we haven't manipulated any cells this turn
		if (!grabbedThisTurn) {
			// create a cell on a dead space
			if (gridArr[targ.gridX][targ.gridY].status == DEAD) {
				killCell(targ.gridX, targ.gridY);
				if (turn == 1) {
					var ind = addTile(targ.gridX, targ.gridY, "forestTile");
				}
				else {
					var ind = addTile(targ.gridX, targ.gridY, "techTile");
				}
				
				if (turn == 1) {
					player1Cells++;
				}
				else if (turn == 2) {
					player2Cells++;
				}
				
				gridArr[targ.gridX][targ.gridY] = {"index":ind, "team":turn, "status":ALIVE};
				grabbedThisTurn = true;
				grabbed = false;
				stage.update();
				$("#nextTurn").html("<a href='javascript:advance()'><img src='assets/ui/NextIconGold.gif' alt='Advance Turn' height='50' width='100'></img></a>");
				$("#helpMe").html("<a href='javascript:showHelp()'><img src='assets/ui/HelpIconGold.gif' alt='Help' height='50' width='50'></img></a>");
			}
			// or pick one up from a live space
			else if (!grabbed && gridArr[targ.gridX][targ.gridY].status == ALIVE && gridArr[targ.gridX][targ.gridY].team == turn) {
				grabbed = true;
				killCell(targ.gridX, targ.gridY);
				
				if (turn == 1) {
					player1Cells--;
				}
				else if (turn == 2) {
					player2Cells--;
				}
				
				gridArr[targ.gridX][targ.gridY] = {"index":addCell(targ.gridX, targ.gridY, "rgba(255,255,255,0.1)"), "team":0, "status":DEAD};
				stage.update();
			}
		}
	}
}

// handle showing the help menu
function showHelp() {
	if (playing) {
		playing = false;
		
		// show that helpfulness
		// gotta manually construct the help popup
		var help = new createjs.Bitmap(queue.getResult("help1"));
		help.addEventListener("click", changeHelpPage);
		help.x = (CANVAS_WIDTH - 350) / 2;
		help.y = 0;
		helpIn = stage.getChildIndex(stage.addChild(help));
		var close = new createjs.Bitmap(queue.getResult("close"));
		close.addEventListener("click", closeHelp);
		close.x = 467;
		close.y = 29;
		helpCloseIn = stage.getChildIndex(stage.addChild(close));
		var pg = new createjs.Bitmap(queue.getResult("pg1"));
		pg.addEventListener("click", changeHelpPage);
		pg.x = (CANVAS_WIDTH - 42) / 2;
		pg.y = CANVAS_HEIGHT - 50;
		pageIn = stage.getChildIndex(stage.addChild(pg));
		helpPage = 1;
		stage.update();
	}
	else {
		closeHelp();
	}
}

// switch help pages
function changeHelpPage() {
	// clear old help page
	closeHelp();
	playing = false;
	
	if (helpPage == 1) {
		var help = new createjs.Bitmap(queue.getResult("help2"));
		var pg = new createjs.Bitmap(queue.getResult("pg2"));
		helpPage = 2;
	}
	else {
		var help = new createjs.Bitmap(queue.getResult("help1"));
		var pg = new createjs.Bitmap(queue.getResult("pg1"));
		helpPage = 1;
	}
	
	help.addEventListener("click", changeHelpPage);
	help.x = (CANVAS_WIDTH - 350) / 2;
	help.y = 0;
	helpIn = stage.getChildIndex(stage.addChild(help));
	var close = new createjs.Bitmap(queue.getResult("close"));
	close.addEventListener("click", closeHelp);
	close.x = 467;
	close.y = 29;
	helpCloseIn = stage.getChildIndex(stage.addChild(close));
	pg.addEventListener("click", changeHelpPage);
	pg.x = (CANVAS_WIDTH - 42) / 2;
	pg.y = CANVAS_HEIGHT - 50;
	pageIn = stage.getChildIndex(stage.addChild(pg));
	stage.update();
}

// clear the help popup
function closeHelp() {
	// stop showing that helpfulness
	// manually remove the help popup
	playing = true;
	stage.removeChildAt(pageIn); // the page indicator (adjusted to account for removing the help body and the close icon)
	stage.removeChildAt(helpCloseIn); // the close button (adjusted to account for removing the help body)
	stage.removeChildAt(helpIn); // the popup body
	stage.update();
}

// loop that music ad infinitum
// blame Ryan if it causes madness
function playAgain(event) {
	musicInstance.play();
}