/* globals getShorthandName, chances */

"use strict";

var g_data;
var g_liveGames;
var g_prevLiveGames;
var g_mode;
var g_updateTimeout;
var g_bmacAnimating;
var g_ehlerCount;

var MAX_HUE = 240.0;
var COLORBLIND_START_R = 75.0;
var COLORBLIND_START_G = 0.0;
var COLORBLIND_START_B = 130.0;
var COLORBLIND_END_R = 50.0;
var COLORBLIND_END_G = 205.0;
var COLORBLIND_END_B = 50.0;

var MODE_COUNT = "count";
var MODE_FIRST_GAME = "firstGame";
var MODE_FIRST_GAME_SEASON = "firstGameSeason";
var MODE_LAST_GAME = "lastGame";
var MODE_EHLER = "ehler";

var GROUP_ALL = "all";
var GROUP_ONGOING = "ongoing";
var GROUP_FINISHED = "finished";
var GROUP_TEN = "ten";

var debug = window.location.href.startsWith("http://localhost");

if (debug) {
	document.title = "(DEBUG) " + document.title;
}

$.ajax({
	url: "/fantasyigami/data.json",
	success: function (data) {
		g_data = data;
		checkReady();
	},
	error: function (data) {
		console.log("error");
		console.log(data);
	}
});

window.onload = function () {
	checkReady();
};

function checkReady() {
	if (g_data && document.readyState === "complete") {
		render();
		setupEvents();
	}
}

//sets up table
function render() {

	var matrix = g_data.matrix;

	var table = document.getElementById("scoreTable");
	if (table) {
		var htmlString = "";

		htmlString += "<tr><td id='hAxisLabel' class='axisLabel' colspan=" + (g_data.maxpts + 2) + ">Winning Team Score</td>";
		htmlString += "<td id='vAxisLabel' class='axisLabel' rowspan=" + (g_data.maxpts + 3) + "><div class='vertical'>Losing Team Score</div></td></tr>";

		//cycle through all elements in the table (maxpts will always be the length and width of the matrix)
		//start at -1 so labels can be added
		for (var i = -1; i <= g_data.maxpts; i++) {
			htmlString += "<tr id='row_" + i + "'>";
			for (var j = 0; j <= g_data.maxpts + 1; j++) {
				//if i===-1, we are in the label row
				if (i === -1) {
					//do not label the top right cell, since the left column is all labels
					if (j > g_data.maxpts) {
						htmlString += "<th></th>";
					}
					//adding column lables
					else {
						htmlString += "<th id='colHeader_" + j + "'>" + j + "</th>";
					}
				}
				else {
					//coloring black squares
					if (j < i - 1) {
						htmlString += "<td class='black'></td>";
					}
					//adding row label
					else if (j === i - 1) {
						htmlString += "<th id='specialHeader_" + i + "' class='black'></th>";
					}
					//adding row label
					else if (j === g_data.maxpts + 1) {
						htmlString += "<th id='rowHeader_" + i + "'>" + i + "</th>";
					}
					//color in green squares
					else if (matrix[i][j].count > 0) {
						//htmlString += "<td id='cell_" + i + "-" + j + "' class='green'><a href='https://www.pro-football-reference.com/boxscores/game_scores_find.cgi?pts_win=" + j + "&pts_lose=" + i +"'><div id='hover_" + i + "-" + j + "' class='hover'><div id='count_" + i + "-" + j + "' class='count'>" + matrix[i][j].count + "</div></div></a></td>";
						htmlString += "<td id='cell_" + i + "-" + j + "' class='green'><div id='hover_" + i + "-" + j + "' class='hover'><div id='count_" + i + "-" + j + "' class='count'>" + matrix[i][j].count + "</div></div></td>";
					}
					//fill in empty squares
					else {
						//color black squares for impossible scores along 1 point line
						//NOTE: we can do this after coloring in the green squares since these squares will never be green
						if (i === 1) {
							switch (j) {
								case 1:
								/* falls through */
								case 2:
								/* falls through */
								case 3:
								/* falls through */
								case 4:
								/* falls through */
								case 5:
								//	htmlString += "<td class='black'></td>";
								//	break;
								case 7:
								//	htmlString += "<td  id='cell_ehler' class='black'></td>";
								//	break;
								default:
									htmlString += "<td id='cell_" + i + "-" + j + "' class='blank'><div id='hover_" + i + "-" + j + "' class='hover'></div></td>";
									break;

							}
						}
						//color 0,1 square black since that is also impossible
						//NOTE: we can do this after coloring in the green squares since this square will never be green
					//	else if (i === 0 && j === 1) {
					//		htmlString += "<td class='black'></td>";
					//	}
						else {
							htmlString += "<td id='cell_" + i + "-" + j + "' class='blank'><div id='hover_" + i + "-" + j + "' class='hover'></div></td>";
						}
					}
				}
			}
			htmlString += "</tr>";
		}
		table.innerHTML = htmlString;

		var loadingTable = document.getElementById("loadingTable");
		if (loadingTable) {
			loadingTable.classList.add("hidden");
		}

		toggleEmptyRows(false);

		var helper = document.getElementById("helper");
		if (helper) {
			var helperRect = helper.getBoundingClientRect();
			helper.style.left = (window.innerWidth / 2) - (helperRect.width / 2);
			helper.style.top = (window.innerHeight / 2) - (helperRect.height / 2);
			helper.classList.remove("invisible");

			setTimeout(function () {
				helper.classList.add("hide-opacity");
				setTimeout(hideHelper, 1000);
			}, 3000);
		}
	}

	//populate hue spectrum (because doing this manually would be tedious)
	var htmlStringLogarithmic = "";
	var htmlStringLinear = "";
	//var cssString = "background: linear-gradient(to right";
	var hueSpectrumLogarithmicColors = document.getElementById("hueSpectrumLogarithmicColors");
	var hueSpectrumLinearColors = document.getElementById("hueSpectrumLinearColors");

	var num = 600 / Math.log(MAX_HUE + 2);

	for (var i = 0; i <= MAX_HUE; i++) {
		var width = (Math.log(MAX_HUE + 2 - i) - Math.log(MAX_HUE + 1 - i)) * num;
		htmlStringLogarithmic += "<span id='hueLog_" + i + "' class='hueColor' style='background-color:hsl(" + (MAX_HUE - i) + ",50%,50%);width:" + width + "px'></span>";
		htmlStringLinear += "<span id='hueLin_" + i + "' class='hueColor' style='background-color:hsl(" + (MAX_HUE - i) + ",50%,50%);width:2.5px'></span>";
	}

	hueSpectrumLogarithmicColors.innerHTML = htmlStringLogarithmic;
	hueSpectrumLinearColors.innerHTML = htmlStringLinear;

	var hueSpectrumLogarithmicLabelMaxCount = document.getElementById("hueSpectrumLogarithmicLabelMaxCount");
	if (hueSpectrumLogarithmicLabelMaxCount) {
		hueSpectrumLogarithmicLabelMaxCount.innerHTML = g_data.maxcount;
	}
	var hueSpectrumLinearLabelMaxCount = document.getElementById("hueSpectrumLinearLabelMaxCount");
	if (hueSpectrumLinearLabelMaxCount) {
		hueSpectrumLinearLabelMaxCount.innerHTML = new Date().getFullYear();
	}

	var video = document.getElementById("video");
	if (video) {
		video.src = "https://www.youtube.com/embed/9l5C8cGMueY?rel=0";
	}

	var lastUpdated = document.getElementById("lastUpdated");
	if (lastUpdated) {
		lastUpdated.innerHTML = "Last Updated: " + g_data.lastUpdated + " | ";
	}
}

function setupEvents() {
	//add hover events to cells
	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = 0; j <= g_data.maxpts; j++) {
			var cell = document.getElementById("cell_" + i + "-" + j);
			if (cell) {
				cell.addEventListener("mouseover", mouseOverDelegate(i, j));
				cell.addEventListener("mouseout", mouseOffDelegate(i, j));
				cell.addEventListener("click", onClickDelegate(i, j));
			}
		}
	}

	var modeSelector = document.getElementById("modeSelector");
	if (modeSelector) {
		g_mode = modeSelector.options[modeSelector.selectedIndex].value;
		modeSelector.addEventListener("change", function (e) { changeMode(); });
	}

	var colorblindSwitch = document.getElementById("colorblindSwitch");
	if (colorblindSwitch) {
		colorblindSwitch.addEventListener("change", function (e) { toggleColorblind(e.target.checked); });
	}

	var countSwitch = document.getElementById("countSwitch");
	if (countSwitch) {
		countSwitch.addEventListener("change", function (e) { toggleNumber(e.target.checked); });
	}

	var gradientSwitch = document.getElementById("gradientSwitch");
	if (gradientSwitch) {
		gradientSwitch.addEventListener("change", function (e) { toggleGradient(e.target.checked); });
	}

	var emptyRowsSwitch = document.getElementById("emptyRowsSwitch");
	if (emptyRowsSwitch) {
		emptyRowsSwitch.addEventListener("change", function (e) { toggleEmptyRows(e.target.checked); });
	}

	var yearSlider = document.getElementById("yearSlider");
	if (yearSlider) {
		var date = new Date().getFullYear();
		yearSlider.max = date;
		yearSlider.value = date;
		yearSlider.addEventListener("input", function (e) { changeYearSlider(); });
	}

	var cellEhler = document.getElementById("cell_ehler");
	if (cellEhler) {
		console.log("zxcvzxcvzxcv");
		g_ehlerCount = 0;
		cellEhler.addEventListener("click", function (e) { ehlerClick(); });
	}

	changeMode();
}

function changeMode() {
	var modeSelector = document.getElementById("modeSelector");
	if (modeSelector) {
		g_mode = modeSelector.options[modeSelector.selectedIndex].value;
	}

	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = i; j <= g_data.maxpts; j++) {
			var div = document.getElementById("count_" + i + "-" + j);
			if (div) {
				switch (g_mode) {
					case MODE_FIRST_GAME_SEASON:
						var year = parseInt(g_data.matrix[i][j].first_date.substr(0, 4));
						if(parseInt(g_data.matrix[i][j].first_date.substr(5, 2)) <= 3) year--;
						div.innerHTML = year
						div.style.fontSize = "6px";
						break;
					case MODE_FIRST_GAME:
						div.innerHTML = g_data.matrix[i][j].first_date.substr(0, 4);
						div.style.fontSize = "6px";
						break;
					case MODE_EHLER:
					/* falls through */
					case MODE_LAST_GAME:
						div.innerHTML = g_data.matrix[i][j].last_date.substr(0, 4);
						div.style.fontSize = "6px";
						break;
					case MODE_COUNT:
					/* falls through */
					default:
						div.innerHTML = g_data.matrix[i][j].count;
						div.style.fontSize = "8px";
						break;
				}
			}
		}
	}

	var countSwitchText = document.getElementById("countSwitchText");
	if (countSwitchText) {
		switch (g_mode) {
			case MODE_FIRST_GAME_SEASON:
			/* falls through */
			case MODE_FIRST_GAME:
			/* falls through */
			case MODE_LAST_GAME:
			/* falls through */
			case MODE_EHLER:
				countSwitchText.innerHTML = "Show Year";
				break;
			case MODE_COUNT:
			/* falls through */
			default:
				countSwitchText.innerHTML = "Show Count";
				break;
		}
	}

	switch (g_mode) {
		case MODE_FIRST_GAME_SEASON:
		/* falls through */
		case MODE_FIRST_GAME:
			showSlider();
			break;
		case MODE_LAST_GAME:
		/* falls through */
		case MODE_EHLER:
		/* falls through */
		case MODE_COUNT:
		/* falls through */
		default:
			hideSlider();
			break;
	}

	if(g_mode === MODE_EHLER)
	{
		for (var i = 0; i <= g_data.maxpts; i++) {
			for (var j = i; j <= g_data.maxpts; j++) {
				var cell = document.getElementById("cell_" + i + "-" + j);
				if (cell && cell.classList.contains("green")) {
					var year = parseInt(g_data.matrix[i][j].last_date.substr(0, 4));
					if (year < 2013) {
						cell.classList.add("later");
					}
				}
			}
		}
	}

	var spectrumLogarithmic = document.getElementById("hueSpectrumLogarithmic");
	var spectrumLinear = document.getElementById("hueSpectrumLinear");
	if (spectrumLogarithmic && spectrumLinear) {
		switch (g_mode) {
			case MODE_FIRST_GAME_SEASON:
			/* falls through */
			case MODE_FIRST_GAME:
			/* falls through */
			case MODE_LAST_GAME:
				/* falls through */
			case MODE_EHLER:
				spectrumLogarithmic.classList.remove("invisible");
				spectrumLogarithmic.classList.add("hidden");
				spectrumLinear.classList.remove("hidden");
				spectrumLinear.classList.add("invisible");
				break;
			case MODE_COUNT:
			/* falls through */
			default:
				spectrumLogarithmic.classList.add("invisible");
				spectrumLogarithmic.classList.remove("hidden");
				spectrumLinear.classList.add("hidden");
				spectrumLinear.classList.remove("invisible");
				break;
		}
	}

	var colorblindSwitch = document.getElementById("colorblindSwitch");
	var countSwitch = document.getElementById("countSwitch");
	var gradientSwitch = document.getElementById("gradientSwitch");
	var emptyRowsSwitch = document.getElementById("emptyRowsSwitch");

	toggleColorblind(colorblindSwitch.checked);
	toggleNumber(countSwitch.checked);
	toggleGradient(gradientSwitch.checked);
	toggleEmptyRows(emptyRowsSwitch.checked);
}

function showSlider() {
	var sliderContainer = document.getElementById("sliderContainer");
	if (sliderContainer) {
		sliderContainer.classList.remove("invisible");
	}
	changeYearSlider();
}

function hideSlider() {
	var sliderContainer = document.getElementById("sliderContainer");
	if (sliderContainer) {
		sliderContainer.classList.add("invisible");
	}

	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = i; j <= g_data.maxpts; j++) {
			var cell = document.getElementById("cell_" + i + "-" + j);
			if (cell) {
				cell.classList.remove("later");
				cell.classList.remove("red");
			}
		}
	}
}

function changeYearSlider() {
	var value = parseInt(document.getElementById("yearSlider").value);

	var sliderValue = document.getElementById("sliderValue");
	if (sliderValue) {
		sliderValue.innerHTML = value;
		if(g_mode == MODE_FIRST_GAME_SEASON) // && value >= 1969)
		{
			var nextvalue = value + 1;
			sliderValue.innerHTML += " - " + nextvalue;
		}
	}

	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = i; j <= g_data.maxpts; j++) {
			var cell = document.getElementById("cell_" + i + "-" + j);
			if (cell && cell.classList.contains("green")) {
				var year = parseInt(g_data.matrix[i][j].first_date.substr(0, 4));
				if(g_mode == MODE_FIRST_GAME_SEASON && parseInt(g_data.matrix[i][j].first_date.substr(5, 2)) <= 3) year--;
				if (year > value) {
					cell.classList.add("later");
					cell.classList.remove("red");
				}
				else if (year === value) {
					cell.classList.add("red");
					cell.classList.remove("later");
				}
				else {
					cell.classList.remove("red");
					cell.classList.remove("later");
				}
			}
		}
	}

}

//shades the cells based on the number of times that score has been achieved
function toggleGradient(on) {
	var matrix = g_data.matrix;

	var max;
	var min;
	var colorblind = document.getElementById("colorblindSwitch").checked;

	switch (g_mode) {
		case MODE_FIRST_GAME_SEASON:
		/* falls through */
		case MODE_FIRST_GAME:
		/* falls through */
		case MODE_LAST_GAME:
			max = new Date().getFullYear();
			min = 2018;
			break;
		case MODE_EHLER:
			max = new Date().getFullYear();
			min = 2018;
			break;
		case MODE_COUNT:
		/* falls through */
		default:
			max = Math.log(g_data.maxcount);
			min = 0;
			break;
	}

	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = i; j <= g_data.maxpts; j++) {
			var cell = document.getElementById("cell_" + i + "-" + j);
			if (cell) {
				if (on) {
					cell.classList.add("gradient");
					if (cell.classList.contains("green")) {
						if (colorblind) {
							var r;
							var g;
							var b;
							var rDiff = COLORBLIND_START_R - COLORBLIND_END_R;
							var gDiff = COLORBLIND_START_G - COLORBLIND_END_G;
							var bDiff = COLORBLIND_START_B - COLORBLIND_END_B;
							switch (g_mode) {
								case MODE_FIRST_GAME_SEASON:
								/* falls through */
								case MODE_FIRST_GAME:
									var year = parseInt(matrix[i][j].first_date.substr(0, 4));
									r = COLORBLIND_START_R - rDiff * (year - min) / (max - min);
									g = COLORBLIND_START_G - gDiff * (year - min) / (max - min);
									b = COLORBLIND_START_B - bDiff * (year - min) / (max - min);
									break;
								case MODE_LAST_GAME:
								/* falls through */
								case MODE_EHLER:
									var year = parseInt(matrix[i][j].last_date.substr(0, 4));
									r = COLORBLIND_START_R - rDiff * (year - min) / (max - min);
									g = COLORBLIND_START_G - gDiff * (year - min) / (max - min);
									b = COLORBLIND_START_B - bDiff * (year - min) / (max - min);
									break;
								case MODE_COUNT:
								/* falls through */
								default:
									r = COLORBLIND_START_R - rDiff * Math.log(matrix[i][j].count) / max;
									g = COLORBLIND_START_G - gDiff * Math.log(matrix[i][j].count) / max;
									b = COLORBLIND_START_B - bDiff * Math.log(matrix[i][j].count) / max;
									break;
							}
							cell.style.backgroundColor = "rgba(" + r + "," + g + "," + b + ",1)";
						}
						else {
							// var alpha = 0.9 * matrix[i][j].count / g_data.maxcount + 0.1;
							// cell.style.backgroundColor = "rgba(0,128,0," + alpha + ")";
							var hue;
							switch (g_mode) {
								case MODE_FIRST_GAME_SEASON:
								/* falls through */
								case MODE_FIRST_GAME:
									var year = parseInt(matrix[i][j].first_date.substr(0, 4));
									hue = MAX_HUE - MAX_HUE * (year - min) / (max - min);
									break;
								case MODE_LAST_GAME:
								/* falls through */
								case MODE_EHLER:
									var year = parseInt(matrix[i][j].last_date.substr(0, 4));
									hue = MAX_HUE - MAX_HUE * (year - min) / (max - min);
									break;
								case MODE_COUNT:
								/* falls through */
								default:
									hue = MAX_HUE - MAX_HUE * Math.log(matrix[i][j].count) / max;
									break;
							}
							cell.style.backgroundColor = "hsl(" + hue + ",50%,50%)";
						}
					}
				}
				else {
					cell.classList.remove("gradient");
					if (cell.classList.contains("green")) {
						cell.style.backgroundColor = "";
					}
				}
			}
		}
	}
	var spectrumLogarithmic = document.getElementById("hueSpectrumLogarithmic");
	if (spectrumLogarithmic && g_mode === MODE_COUNT) {
		if (on && !colorblind) {
			spectrumLogarithmic.classList.remove("invisible");
		}
		else {
			spectrumLogarithmic.classList.add("invisible");
		}
	}
	var spectrumLinear = document.getElementById("hueSpectrumLinear");
	if (spectrumLinear && (g_mode === MODE_FIRST_GAME_SEASON || g_mode === MODE_FIRST_GAME || g_mode === MODE_LAST_GAME|| g_mode === MODE_EHLER)) {
		if (on && !colorblind) {
			spectrumLinear.classList.remove("invisible");
		}
		else {
			spectrumLinear.classList.add("invisible");
		}
	}
}

function toggleColorblind(on) {
	var body = document.getElementById("body");
	if (on) {
		body.classList.add("colorblind");
	}
	else {
		body.classList.remove("colorblind");
	}

	var gradientSwitch = document.getElementById("gradientSwitch");
	toggleGradient(gradientSwitch.checked);
}

function toggleNumber(on) {
	for (var i = 0; i <= g_data.maxpts; i++) {
		for (var j = i; j <= g_data.maxpts; j++) {
			var div = document.getElementById("count_" + i + "-" + j);
			if (div) {
				if (on) {
					div.classList.remove("hidden");
				}
				else {
					div.classList.add("hidden");
				}
			}
		}
	}
}

function toggleEmptyRows(on) {
	for (var i = g_data.maxlosepts + 1; i <= g_data.maxpts; i++) {
		var row = document.getElementById("row_" + i);
		if (row) {
			if (on) {
				row.classList.remove("hidden");
			}
			else {
				row.classList.add("hidden");
			}
		}
	}
}

//called when user moves mouse over an element
//adds adjhover class to all elements in the same row and column as the hovered element
function mouseOver(i, j) {
	for (var k = 0; k <= g_data.maxpts; k++) {
		var cell = document.getElementById("hover_" + i + "-" + k);
		if (cell && k !== j) {
			cell.classList.add("adjhover");
		}
		else if (k === j) {
			cell.classList.add("over");
		}
		cell = document.getElementById("hover_" + k + "-" + j);
		if (cell && k !== i) {
			cell.classList.add("adjhover");
		}
	}
	var colHeader = document.getElementById("colHeader_" + j);
	colHeader.classList.add("adjhover");
	var rowHeader = document.getElementById("rowHeader_" + i);
	rowHeader.classList.add("adjhover");
	var specialHeader2 = document.getElementById("specialHeader_" + (j + 1));
	if (specialHeader2) {
		specialHeader2.innerHTML = j;
		specialHeader2.classList.add("adjhover");
	}
	var specialHeader = document.getElementById("specialHeader_" + i);
	if (specialHeader) {
		specialHeader.innerHTML = i;
		specialHeader.classList.add("adjhover");
	}
}

//called when moves mouse off an element
//removes adjhover class to all elements in the same row and column as the hovered element
function mouseOff(i, j) {
	for (var k = 0; k <= g_data.maxpts; k++) {
		var cell = document.getElementById("hover_" + i + "-" + k);
		if (cell && k !== j) {
			cell.classList.remove("adjhover");
		}
		else if (k === j) {
			cell.classList.remove("over");
		}
		cell = document.getElementById("hover_" + k + "-" + j);
		if (cell && k !== i) {
			cell.classList.remove("adjhover");
		}
	}
	var colHeader = document.getElementById("colHeader_" + j);
	colHeader.classList.remove("adjhover");
	var rowHeader = document.getElementById("rowHeader_" + i);
	rowHeader.classList.remove("adjhover");
	var specialHeader2 = document.getElementById("specialHeader_" + (j + 1));
	if (specialHeader2) {
		specialHeader2.innerHTML = "";
		specialHeader2.classList.remove("adjhover");
	}
	var specialHeader = document.getElementById("specialHeader_" + i);
	if (specialHeader) {
		specialHeader.innerHTML = "";
		specialHeader.classList.remove("adjhover");
	}
}

function onClick(i, j) {
	hideHelper();
	var data = g_data.matrix[i][j];
	var infoBox = document.getElementById("infoBox");
	var cell = document.getElementById("cell_" + i + "-" + j);
	if (infoBox) {
		infoBox.classList.add("hidden");

		if (cell && !cell.classList.contains("later") && data.count > 0) {
			var htmlString = "";

			htmlString += "<span id=infoBoxScore>Score: " + j + "-" + i + "</span> ";
			if (data.count > 1) {
				htmlString += "(<a href='https://www.pro-football-reference.com/boxscores/game_scores_find.cgi?pts_win=" + j + "&pts_lose=" + i + "'>view all " + data.count + " games</a>)";
			}

			htmlString += "<span id='infoBoxClose' onclick='closeInfoBox()'>(<u>close</u>)</span>";

                        //var dateOptions = { year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" };
			//var firstDate = new Date(data.first_date).toLocaleDateString("en-US", dateOptions);
                        var firstDate = data.first_date

			htmlString += "<br/>First Game: ";
			if (i !== j) {
				htmlString += "<b>";
			}
			htmlString += data.first_team_win + " " + j + " ";
			if (i !== j) {
				htmlString += "</b>";
			}
			if (data.first_team_win === data.first_team_home) {
				htmlString += "vs";
			}
			else {
				htmlString += "@";
			}
			htmlString += " " + i + " " + data.first_team_lose + " | ";
			htmlString += firstDate + " ";
			htmlString += "(<a href='" + data.first_link + "'>boxscore</a>)<br/>";

			if (data.count > 1) {
			//	var lastDate = new Date(data.last_date).toLocaleDateString("en-US", dateOptions);
                                var lastDate = data.last_date

				htmlString += "Latest Game: ";
				if (i !== j) {
					htmlString += "<b>";
				}
				htmlString += data.last_team_win + " " + j + " ";
				if (i !== j) {
					htmlString += "</b>";
				}
				if (data.last_team_win === data.last_team_home) {
					htmlString += "vs";
				}
				else {
					htmlString += "@";
				}
				htmlString += " " + i + " " + data.last_team_lose + " | ";
				htmlString += lastDate + " ";
				htmlString += "(<a href='" + data.last_link + "'>boxscore</a>)<br/>";
			}
			infoBox.innerHTML = htmlString;
			infoBox.classList.remove("hidden");

			infoBox.style.left = 0;
			infoBox.style.right = "";
			infoBox.style.width = "";
			infoBox.style.top = 0;

			var INFOBOX_OUTER_PIXELS = 5; //determined by infobox padding + border in common.css
			var cellRect = cell.getBoundingClientRect();
			var infoBoxRect = infoBox.getBoundingClientRect();
			var windowRight = window.pageXOffset + document.documentElement.clientWidth;
			var boxLeft;
			var boxRight;
			//if the box would extend past the right side of the screen, place it on the right side of the screen
			if (window.pageXOffset + cellRect.x - (infoBoxRect.width + cellRect.width) / 2 + infoBoxRect.width + 2 * INFOBOX_OUTER_PIXELS > windowRight) {
				boxRight = document.body.offsetWidth - document.documentElement.clientWidth - window.pageXOffset;
				boxLeft = Math.floor(windowRight - infoBoxRect.width);
			}
			//otherwise center it horizontally on the clicked cell
			else {
				boxLeft = window.pageXOffset + cellRect.x - (infoBoxRect.width + cellRect.width) / 2;
				infoBox.style.width = infoBoxRect.width;
			}
			//if the box would extend past the left side of the screen, place it on the left side of the screen
			if (boxLeft < window.pageXOffset) {
				boxLeft = window.pageXOffset;
			}
			infoBox.style.left = boxLeft;
			infoBox.style.right = boxRight;
			infoBoxRect = infoBox.getBoundingClientRect();
			//place it above the cell, unless it would extend past the top of the screen
			if (cellRect.y - infoBoxRect.height - 2 * INFOBOX_OUTER_PIXELS < 0) {
				infoBox.style.top = window.pageYOffset + cellRect.y + cellRect.height - 2 * INFOBOX_OUTER_PIXELS;
			}
			else {
				infoBox.style.top = window.pageYOffset + cellRect.y - infoBoxRect.height - 2 * INFOBOX_OUTER_PIXELS;
			}
		}
	}
}

/* exported closeInfoBox */
function closeInfoBox() {
	var infoBox = document.getElementById("infoBox");
	if (infoBox) {
		infoBox.classList.add("hidden");
	}
}

function hideHelper() {
	var helper = document.getElementById("helper");
	if (helper) {
		helper.classList.add("hidden");
	}
}

function factorial(n) {
	if (n <= 1) {
		return 1;
	}
	return n * factorial(n - 1);
}

function getProb(quarter, clock, chance) {
	var prob = Math.exp(-1 * (((4 - quarter) * 15 + (clock / 60.0)) / 60.0 * 4.22)) * Math.pow((((4 - quarter) * 15 + (clock / 60.0)) / 60 * 4.22), (chance.td_1pt + chance.fg + chance.td + chance.td_2pt + chance.safety)) / factorial(chance.td_1pt + chance.fg + chance.td + chance.td_2pt + chance.safety) * chance.bin_chance;

	return prob;
}

//delegate functions to make it possible to create event listeners in a loop
function onClickDelegate(i, j) {
	return function () {
		onClick(i, j);
	};
}

function mouseOverDelegate(i, j) {
	return function () {
		mouseOver(i, j);
	};
}

function mouseOffDelegate(i, j) {
	return function () {
		mouseOff(i, j);
	};
}

function ehlerClick() {
	g_ehlerCount++;
	if(g_ehlerCount === 10)
	{
		var modeSelector = document.getElementById("modeSelector");
		modeSelector.innerHTML += '<option value="ehler">Latest Game (Ehler)</option>';
		modeSelector.value = "ehler";
		changeMode();
	}
}
