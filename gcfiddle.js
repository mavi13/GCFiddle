// gcfiddle.js - GCFiddle
// (c) mavi13, 2018
// https://mavi13.github.io/GCFiddle/
//
/* globals window, document, InputStack, LatLng, MapProxy, MarkerFactory, Preprocessor, ScriptParser, Utils */ // ESlint

"use strict";

var gDebug,
	gcFiddleExternalConfig, // set in gcconfig.js
	gcFiddle = {
		config: {
			debug: 0,
			category: "test", // test, tofind, found, archived, saved
			example: "GCNEW1", // GCNEW1, GCTEST1, GCJVT3
			showInput: true,
			showOutput: true,
			showVariable: true,
			showNotes: true,
			showWaypoint: true,
			showMap: true,
			showLogs: false,
			showConsole: false, // for debugging
			variableType: "number", // number, text, range
			positionFormat: "dmm", // position output format: dmm, dms, dd
			mapboxKey: "", // mapbox access token (for leaflet maps)
			mapType: "simple", // simple, google, leaflet, openlayers
			googleKey: "", // Google API key
			zoom: 15, // default zoom level
			leafletUrl: "https://unpkg.com/leaflet@1.3.1/dist/leaflet.js",
			openLayersUrl: "https://cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js",
			testIndexedDb: false
		},
		initialConfig: null,
		mapProxy: { },
		maFa: null,
		categories: { },
		examples: { },
		variables: {
			gcfOriginal: { }
		},
		inputStack: null,
		sJsonMarker: "#GC_INFO:",
		emptyExample: {
			draft: {
				key: "GC_DRAFT",
				title: "Draft"
			},
			unknown: {
				key: "GC_UNKNOWN",
				title: "Unknown"
			}
		},
		eventHandlers: null,
		pendingScripts: []
	};

//
// Utilities
//
// see: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript?rq=1
function hereDoc(fn) {
	return fn.toString().
		replace(/^[^/]+\/\*\S*/, "").
		replace(/\*\/[^/]+$/, "");
}

/*
function getLoadedFile() {
	var sFile = "",
		sFileDebug = gcFiddle.pendingScripts.pop(); //TTT

	try {
		throw new Error("getStackTrace");
	} catch (e) {
		if (e.stack) {
			sFile = e.stack.trim().split("\n").pop();
			// e.g. Google Chrome: "file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"; Firefox: "@file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"
		} else {
			sFile = sFileDebug;
		}
	}
	return sFileDebug; // sFile; //TTT
}
*/

function getPendingCategory() {
	var sCategory = "",
		oFile;

	if (gcFiddle.pendingScripts.length) {
		oFile = gcFiddle.pendingScripts.pop();
		sCategory = oFile.category;
		if (gDebug) {
			gDebug.log("DEBUG: getPendingCategory: category=" + sCategory + " taken from file " + oFile.url);
		}
	} else {
		window.console.warn("getPendingCategory: No pending file, cannot get category");
	}
	return sCategory;
}

// if category is not specified it is extracted from the filename in the call stack
function parseExample(input, category, emptyExample) {
	var sInput = (typeof input === "string") ? Utils.stringTrimLeft(input) : hereDoc(input).trim(),
		oExample = {
			category: category,
			key: "",
			title: "",
			script: sInput
		},
		sLine, aParts;

	/*
	if (!category) {
		sLine = getLoadedFile();
		aParts = sLine.match(/(\w+)\/(\w+)\.js/);
		if (aParts) {
			oExample.category = aParts[1];
			/ *
			if ((oExample.key !== aParts[2]) && aParts[2] !== "0index") {
				window.console.warn("parseExample: different example keys found: " + oExample.key + " <> " + aParts[2]);
			}
			* /
			oExample.key = aParts[2]; // filename as key
			oCategory = gcFiddle.categories[oExample.category]; // try to get title from category index
			if (oCategory) {
				oExample.title = (oCategory[oExample.key]) ? oCategory[oExample.key].title : "";
			}
		}
	}
	*/

	sLine = sInput.split("\n", 1)[0];
	aParts = sLine.match(/^#([\w\d]+)\s*:\s*(.+)/);
	if (aParts) {
		oExample.key = aParts[1];
		oExample.title = aParts[2];
	} else if (!oExample.key) {
		window.console.warn("parseExample: Example must start with #<id>: <title>");
		emptyExample = emptyExample || gcFiddle.emptyExample.unknown;
		oExample.key = emptyExample.key;
		oExample.title = emptyExample.title;
		// sInput = "#" + oExample.key + ": " + oExample.title + "\n" + sInput;
	} else {
		window.console.log("parseExample: Example does not start with #<id>: <title>, using key " + oExample.key);
	}

	return oExample;
}

// called also from files GCxxxxx.js
// if category is not specified it is extracted from the filename in the call stack
function addExample(input, category, emptyExample) {
	var oItem;

	if (!category) {
		category = getPendingCategory();
	}
	oItem = parseExample(input, category, emptyExample);

	window.console.log("addExample: category=" + oItem.category + "(" + gcFiddle.config.category + ") key=" + oItem.key);
	if (gcFiddle.examples[oItem.category]) {
		gcFiddle.examples[oItem.category][oItem.key] = oItem;
	} else {
		window.console.error("Unknown category: " + oItem.category);
	}
	return oItem;
}

// called also from file 0index.js
// if category is not specified it is extracted from the filename in the call stack
function setExampleIndex(input, category) {
	var sInput = (typeof input === "string") ? input.trim() : hereDoc(input).trim(),
		mItems = {},
		aLines;

	if (!category) {
		category = getPendingCategory();
	}
	if (sInput) {
		aLines = sInput.split("\n");
		aLines.forEach(function (sLine) {
			var oItem = parseExample(sLine, category);

			if (!category) {
				category = oItem.category;
			}
			mItems[oItem.key] = {
				title: oItem.title
			};
		});
	}

	gcFiddle.categories[category] = mItems;
	if (!gcFiddle.examples[category]) {
		gcFiddle.examples[category] = {};
	}
	return mItems;
}


function isWaypoint(s) {
	return s.indexOf("$") === 0; // waypoints start with "$"
}

function setMarkers(variables) {
	var i = 0,
		sPar, oSettings;

	for (sPar in variables) {
		if (variables.hasOwnProperty(sPar) && isWaypoint(sPar)) {
			oSettings = {
				position: new LatLng().parse(variables[sPar].toString()),
				label: Utils.strZeroFormat(i.toString(), 2),
				title: sPar
			};
			gcFiddle.maFa.setMarker(oSettings, i);
			i += 1;
		}
	}
}

function setSelectOptions(select, fnSel, fnTextFormat) {
	var oVariables = gcFiddle.variables,
		aOptions = select.options,
		sPar, sText, sTitle, option,
		i = 0;

	for (sPar in oVariables) {
		if (oVariables.hasOwnProperty(sPar) && (sPar !== "gcfOriginal") && fnSel(sPar)) {
			sTitle = sPar + "=" + oVariables[sPar];
			sText = (fnTextFormat) ? fnTextFormat(sPar, oVariables[sPar]) : sTitle;
			if (oVariables.gcfOriginal[sPar] !== undefined && oVariables.gcfOriginal[sPar] !== oVariables[sPar]) {
				sText += " [c]";
				sTitle += " [changed]";
			}
			if (i >= select.length) {
				option = document.createElement("option");
				option.value = sPar;
				option.text = sText;
				option.title = sTitle;
				select.add(option);
			} else {
				option = aOptions[i];
				if (option.text !== sText) {
					if (gDebug) { // eslint-disable-line max-depth
						gDebug.log("DEBUG: setSelect: " + sText);
					}
					option.text = sText;
					option.title = sTitle;
				}
			}
			i += 1;
		}
	}
}

function removeSelectOptions(select) {
	var i;

	for (i = select.length - 1; i >= 0; i -= 1) {
		select.remove(i);
	}
}

function setVarSelectOptions() {
	setSelectOptions(document.getElementById("varSelect"),
		function (s) { return !isWaypoint(s); }
	);
}

function setWaypointSelectOptions() {
	var fnTextFormat = function (parameter, value) {
		value = value.toString().replace(/(N|S|E|W)\s*(\d+)°?\s*/g, "");

		parameter = parameter.substring(1, 4);
		return parameter + "=" + value;
	};

	setSelectOptions(document.getElementById("waypointSelect"), isWaypoint, fnTextFormat);
}

function setExampleList() {
	var categorySelect = document.getElementById("categorySelect"),
		exampleSelect = document.getElementById("exampleSelect"),
		oExamples = gcFiddle.categories[categorySelect.value],
		sId,
		sTitle,
		sText,
		option,
		i = 0,
		selectExample;

	for (sId in oExamples) {
		if (oExamples.hasOwnProperty(sId)) {
			sTitle = sId + ": " + oExamples[sId].title;
			sTitle = sTitle.substr(0, 160);
			sText = sTitle.substr(0, 20);
			if (i >= exampleSelect.length) {
				option = document.createElement("option");
				option.value = sId;
				option.title = sTitle;
				option.text = sText;
				exampleSelect.add(option);
			} else {
				option = exampleSelect.options[i];
				if (option.text !== sText) {
					option.text = sText;
				}
			}
			if (option.value === gcFiddle.config.example) {
				selectExample = option.value;
			}
			i += 1;
		}
	}
	if (selectExample) {
		exampleSelect.value = selectExample;
	}
}


function setInputAreaValue(value) {
	var sLog = "",
		iPos, sJson, oInfo;

	document.getElementById("inputArea").value = value;
	iPos = value.indexOf(gcFiddle.sJsonMarker);
	if (iPos >= 0) {
		sJson = value.substring(iPos + gcFiddle.sJsonMarker.length);
		try {
			oInfo = window.JSON.parse(sJson);
		} catch (e) {
			window.console.error(e);
		}
		if (oInfo && oInfo.logs) {
			oInfo.logs.forEach(function (oLog) {
				sLog += oLog.date + " (" + oLog.type + ") " + oLog.name + " (" + oLog.finds + ")\n" + oLog.text + "\n";
			});
		}
	}
	document.getElementById("logsArea").value = sLog;
	document.getElementById("logsLegend").textContent = "Logs (" + ((oInfo && oInfo.logs) ? oInfo.logs.length : 0) + ")";
}

function setOutputAreaValue(value) {
	document.getElementById("outputArea").value = value;
}

// scrolling needed for Chrome (https://stackoverflow.com/questions/7464282/javascript-scroll-to-selection-after-using-textarea-setselectionrange-in-chrome)
function scrollToSelection(textArea) {
	var charsPerRow = textArea.cols,
		selectionRow = (textArea.selectionStart - (textArea.selectionStart % charsPerRow)) / charsPerRow,
		lineHeight = textArea.clientHeight / textArea.rows;

	textArea.scrollTop = lineHeight * selectionRow;
}

function calculate2() {
	var variables = gcFiddle.variables,
		inputArea = document.getElementById("inputArea"),
		input = inputArea.value,
		oOutput, oError, iEndPos;

	oOutput = new ScriptParser().calculate(input, variables);
	if (oOutput.error) {
		oError = oOutput.error;
		iEndPos = oError.pos + ((oError.value !== undefined) ? oError.value.toString().length : 0);
		if (inputArea.selectionStart !== undefined) {
			inputArea.focus();
			inputArea.selectionStart = oError.pos;
			inputArea.selectionEnd = iEndPos;
			scrollToSelection(inputArea);
		}
		oOutput.text = oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")";
	}
	setOutputAreaValue(oOutput.text);
}


function setDisabled(id, bDisabled) {
	var element = document.getElementById(id);

	element.disabled = bDisabled;
}

function updateUndoRedoButtons() {
	setDisabled("undoButton", !gcFiddle.inputStack.canUndoKeepOne());
	setDisabled("redoButton", !gcFiddle.inputStack.canRedo());
}

function initUndoRedoButtons() {
	gcFiddle.inputStack.init();
	updateUndoRedoButtons();
}

function putChangedInputOnStack() {
	var sInput = document.getElementById("inputArea").value,
		sStackInput = gcFiddle.inputStack.getInput();

	if (sStackInput !== sInput) {
		gcFiddle.inputStack.save(sInput);
		updateUndoRedoButtons();
	}
}


function doPreprocess() {
	var inputArea = document.getElementById("inputArea"),
		sInput = inputArea.value,
		sOutput = "",
		oProcessor, mInfo;

	oProcessor = new Preprocessor({
		scriptParser: new ScriptParser()
	});
	mInfo = oProcessor.processText(sInput);
	sOutput = mInfo.script;
	mInfo.script = "";
	if (sOutput !== "") {
		if (mInfo.id) {
			sOutput = "#" + mInfo.id + ": " + mInfo.title + "\n"
				+ "#https://coord.info/" + mInfo.id + "\n"
				+ "$" + mInfo.id + '="' + (mInfo.waypoint || "") + '"\n'
				+ sOutput
				+ "#\n"
				+ gcFiddle.sJsonMarker + window.JSON.stringify(mInfo) + "\n";
		}
	}

	putChangedInputOnStack();
	setInputAreaValue(sOutput);
	gcFiddle.eventHandlers.onExecuteButtonClick();
}


function getChangedParameters(current, initial) {
	var oChanged = {},
		sName;

	for (sName in current) {
		if (current.hasOwnProperty(sName)) {
			if (current[sName] !== initial[sName]) {
				oChanged[sName] = current[sName];
			}
		}
	}
	return oChanged;
}

// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function parseUri(oConfig) {
	var aMatch,
		rPlus = /\+/g, // Regex for replacing addition symbol with a space
		rSearch = /([^&=]+)=?([^&]*)/g,
		fnDecode = function (s) { return decodeURIComponent(s.replace(rPlus, " ")); },
		sQuery = window.location.search.substring(1),
		sName,
		sValue;

	while ((aMatch = rSearch.exec(sQuery)) !== null) {
		sName = fnDecode(aMatch[1]);
		sValue = fnDecode(aMatch[2]);
		if (sValue !== null && oConfig.hasOwnProperty(sName)) {
			switch (typeof oConfig[sName]) {
			case "string":
				break;
			case "boolean":
				sValue = (sValue === "true");
				break;
			case "number":
				sValue = Number(sValue);
				break;
			case "object":
				break;
			default:
				break;
			}
		}
		oConfig[sName] = sValue;
	}
}

function encodeUriParam(params) {
	var aParts = [],
		sKey,
		sValue;

	for (sKey in params) {
		if (params.hasOwnProperty(sKey)) {
			sValue = params[sKey];
			aParts[aParts.length] = encodeURIComponent(sKey) + "=" + encodeURIComponent((sValue === null) ? "" : sValue);
		}
	}
	return aParts.join("&");
}

function myConfirm(message) {
	var confirm = window.confirm;

	return confirm(message);
}


function testIndexedDb(oExample) {
	var sDataBaseName = "GCFiddle",
		sStoreName = "geocaches",
		oRequest = window.indexedDB.open(sDataBaseName, 1);

	oRequest.onupgradeneeded = function (event) {
		var oDb = event.target.result,
			oStore, oTitleIndex;

		oStore = oDb.createObjectStore(sStoreName,
			{
				keyPath: "id"
			});

		oTitleIndex = oStore.createIndex("byTitle", "title",
			{
				unique: false
			});
		return oTitleIndex;
	};
	oRequest.onsuccess = function (event) {
		var oDb = event.target.result,
			oTransaction, sInput, iPos, oStore, oReq;

		oTransaction = oDb.transaction(sStoreName, "readwrite");
		oStore = oTransaction.objectStore(sStoreName);

		sInput = oExample.script;
		if (sInput) {
			iPos = sInput.indexOf(gcFiddle.sJsonMarker);
			if (iPos >= 0) {
				oExample = Utils.objectAssign({}, window.JSON.parse(sInput.substring(iPos + gcFiddle.sJsonMarker.length)), oExample);
			}
		}

		oReq = oStore.put(oExample); // add(), or put() to modify if exist
		oReq.onsuccess = function (ev) {
			window.console.log("indexedDB: Insertion successful: " + ev.target.result);
		};
		oReq.onerror = function (ev) {
			window.console.error("indexedDB: Insert error: " + ev.target.error); // or use his.error
		};
	};
	oRequest.onerror = function (event) {
		window.console.error("indexedDB: Database error:" + event.target.errorCode);
	};
}


function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.substring(1);
}


function CommonEventHandlers(options) {
	this.init(options);
}

CommonEventHandlers.prototype = {
	init: function (/* options */) {
		this.attach();
	},

	attach: function () {
		var that = this,
			fnCommonEventHandler = function (event) {
				var oTarget = event.target,
					sId = oTarget.getAttribute("id"),
					sType, sHandler;

				if (sId) {
					sType = event.type; // click or change
					sHandler = "on" + capitalize(sId) + capitalize(sType);
					if (gDebug) {
						gDebug.log("DEBUG: fnCommonEventHandler: sHandler=" + sHandler);
					}
					if (sHandler in that) {
						that[sHandler](event);
					} else if (!Utils.stringEndsWith(sHandler, "SelectClick") && !Utils.stringEndsWith(sHandler, "InputClick")) { // do not print all messages
						window.console.log("Event handler not found: " + sHandler);
					}
				}
			};

		document.addEventListener("click", fnCommonEventHandler, false);
		document.addEventListener("change", fnCommonEventHandler, false);
	},

	onVarSelectChange: function () {
		var variables = gcFiddle.variables,
			varSelect = document.getElementById("varSelect"),
			varLabel = document.getElementById("varLabel"),
			varInput = document.getElementById("varInput"),
			sPar = varSelect.value,
			sValue,
			sType = document.getElementById("varViewSelect").value;

		if (!sPar) {
			sPar = "";
			sValue = sPar;
		} else {
			sValue = variables[sPar];
		}
		varLabel.innerText = sPar;
		varLabel.title = sPar;
		if (!(/^[\d]+$/).test(sValue)) { // currently only digits (without -,.) are numbers
			sType = "text";
		}
		// old IE throws error when changing input type
		try {
			varInput.type = sType; // set type before value
		} catch (e) {
			window.console.warn("Browser does not allow to set input.type=" + sType + ": " + e.message);
		}
		varInput.value = sValue;
		varSelect.title = (varSelect.selectedIndex >= 0) ? varSelect.options[varSelect.selectedIndex].title : "";
		document.getElementById("varLegend").textContent = "Variables (" + varSelect.length + ")";
	},

	onVarViewSelectChange: function () {
		gcFiddle.config.variableType = document.getElementById("varViewSelect").value;
		this.onVarSelectChange();
	},

	onWaypointSelectChange: function () {
		var variables = gcFiddle.variables,
			waypointSelect = document.getElementById("waypointSelect"),
			waypointLabel = document.getElementById("waypointLabel"),
			waypointInput = document.getElementById("waypointInput"),
			sPar = waypointSelect.value,
			aMarkers = gcFiddle.maFa.getMarkers(),
			sValue,	oMarker, i;

		// center to selected waypoint
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			if (oMarker && sPar === oMarker.getTitle()) {
				gcFiddle.maFa.setCenter(oMarker);
				break;
			}
		}
		if (!sPar) {
			sPar = "";
			sValue = sPar;
		} else {
			sValue = variables[sPar];
		}
		waypointLabel.innerText = sPar;
		waypointLabel.title = sPar;
		waypointInput.value = sValue;
		waypointSelect.title = (waypointSelect.selectedIndex >= 0) ? waypointSelect.options[waypointSelect.selectedIndex].title : "";
		document.getElementById("waypointLegend").textContent = "Waypoints (" + waypointSelect.length + ")";
	},

	onVarInputChange: function () {
		var variables = gcFiddle.variables,
			varLabel = document.getElementById("varLabel"),
			varInput = document.getElementById("varInput"),
			sPar = varLabel.innerText,
			sValue,
			nValueAsNumber;

		if (sPar) {
			sValue = varInput.value;
			nValueAsNumber = parseFloat(sValue);
			if (variables.gcfOriginal[sPar] === undefined) {
				variables.gcfOriginal[sPar] = variables[sPar];
			}
			variables[sPar] = isNaN(nValueAsNumber) ? sValue : nValueAsNumber;
			calculate2();
			setVarSelectOptions();
			this.onVarSelectChange(); // title change?
			setWaypointSelectOptions();
			setMarkers(variables);
			gcFiddle.maFa.setPolyline();
			gcFiddle.maFa.showMarkers();
			this.onWaypointSelectChange();
		}
	},

	onWaypointInputChange: function () {
		var variables = gcFiddle.variables,
			waypointLabel = document.getElementById("waypointLabel"),
			waypointInput = document.getElementById("waypointInput"),
			sPar = waypointLabel.innerText,
			sValue,
			nValueAsNumber;

		if (sPar) {
			sValue = waypointInput.value;
			nValueAsNumber = parseFloat(sValue);
			if (variables.gcfOriginal[sPar] === undefined) {
				variables.gcfOriginal[sPar] = variables[sPar];
			}
			variables[sPar] = isNaN(nValueAsNumber) ? sValue : nValueAsNumber;
			calculate2();
			setVarSelectOptions();
			setWaypointSelectOptions();
			setMarkers(variables);
			gcFiddle.maFa.setPolyline();
			gcFiddle.maFa.showMarkers();
			this.onWaypointSelectChange();
		}
	},

	onExecuteButtonClick: function () {
		var varSelect = document.getElementById("varSelect"),
			waypointSelect = document.getElementById("waypointSelect");

		putChangedInputOnStack();

		gcFiddle.variables = {
			gcfOriginal: { }
		};
		calculate2();
		gcFiddle.maFa.deleteMarkers();
		gcFiddle.maFa.deletePolyline();
		setMarkers(gcFiddle.variables);
		removeSelectOptions(varSelect);
		setVarSelectOptions();
		this.onVarSelectChange();
		removeSelectOptions(waypointSelect);
		setWaypointSelectOptions();
		if (waypointSelect.options.length) {
			waypointSelect.selectedIndex = waypointSelect.options.length - 1; // select last waypoint
		}
		this.onWaypointSelectChange();
		gcFiddle.maFa.fitBounds();
		gcFiddle.maFa.setPolyline();
		gcFiddle.maFa.showMarkers();
	},

	onUndoButtonClick: function () {
		setInputAreaValue(gcFiddle.inputStack.undo());
		updateUndoRedoButtons();
		setOutputAreaValue("");
	},

	onRedoButtonClick: function () {
		setInputAreaValue(gcFiddle.inputStack.redo());
		updateUndoRedoButtons();
		setOutputAreaValue("");
	},

	onPreprocessButtonClick: function () {
		var sUrl = "Preprocessor.js";

		if (typeof Preprocessor === "undefined") { // load module on demand
			Utils.loadScript(sUrl, function () {
				window.console.log(sUrl + " loaded");
				doPreprocess();
			});
		} else {
			doPreprocess();
		}
	},

	onExampleSelectChange: function () {
		var that = this,
			sCategory = gcFiddle.config.category,
			exampleSelect = document.getElementById("exampleSelect"),
			sExample = exampleSelect.value,
			oExamples = gcFiddle.examples[sCategory],
			sName,

			fnExampleLoaded = function (sFullUrl, sExample2, bSuppressLog) {
				var sCategory2 = gcFiddle.config.category,
					oExamples2 = gcFiddle.examples[sCategory2],
					sName2 = sCategory2 + "/" + sExample2 + ".js",
					sUnknownExample;

				gcFiddle.config.example = sExample2;
				if (!bSuppressLog) {
					window.console.log("Example " + sName2 + " loaded");
				}
				if (oExamples2[sExample2] === undefined) { // TODO: example without id loaded (Do we still need this?)
					window.console.warn("Example " + sName2 + ": Wrong format! Must start with #<id>: <title>");
					sUnknownExample = gcFiddle.emptyExample.unknown.key;
					if (oExamples2[sUnknownExample]) {
						oExamples2[sExample2] = oExamples2[sUnknownExample];
						delete oExamples2[sUnknownExample];
					} else {
						window.console.error("No example 'unknown' found");
						oExamples2[sExample2] = parseExample("", "", sExample2);
					}
				}
				setInputAreaValue(oExamples2[sExample2].script);
				initUndoRedoButtons();
				that.onExecuteButtonClick();
			};

		exampleSelect.title = (exampleSelect.selectedIndex >= 0) ? exampleSelect.options[exampleSelect.selectedIndex].title : "";
		if (oExamples[sExample] !== undefined) {
			fnExampleLoaded("", sExample, true);
		} else if (sExample) {
			setInputAreaValue("#loading " + sExample + "...");
			setOutputAreaValue("waiting...");
			sName = sCategory + "/" + sExample + ".js";
			gcFiddle.pendingScripts.push({
				category: sCategory,
				example: sExample,
				url: sName
			});
			Utils.loadScript(sName, fnExampleLoaded, sExample);
		} else {
			setInputAreaValue("");
			gcFiddle.config.example = "";
			initUndoRedoButtons();
			this.onExecuteButtonClick();
		}
	},

	onCategorySelectChange: function () {
		var that = this,
			categorySelect = document.getElementById("categorySelect"),
			sCategory = categorySelect.value,
			exampleSelect = document.getElementById("exampleSelect"),
			oCategories = gcFiddle.categories,
			sName,

			fnCategoryLoaded = function (sFullUrl, sCategory2) {
				var exampleSelect2 = document.getElementById("exampleSelect"),
					sName2 = sCategory2 + "/0index.js";

				gcFiddle.config.category = sCategory2;
				window.console.log("category " + sName2 + " loaded");
				removeSelectOptions(exampleSelect2);
				setExampleList();
				that.onExampleSelectChange();
			},
			fnLoadCategoryLocalStorage = function () {
				var	oStorage = window.localStorage,
					oExamples,
					i, sKey, sItem;

				oExamples = setExampleIndex("", sCategory); // create category, set example object
				for (i = 0; i < oStorage.length; i += 1) {
					sKey = oStorage.key(i);
					sItem = oStorage.getItem(sKey);
					oExamples[sKey] = addExample(sItem, sCategory, {
						key: sKey,
						title: "" // currently title not stored in saved data if not in input
					});
				}
				fnCategoryLoaded("", sCategory);
			};

		if (oCategories[sCategory] !== undefined) {
			gcFiddle.config.category = sCategory;
			removeSelectOptions(exampleSelect);
			setExampleList();
			this.onExampleSelectChange();
		} else {
			document.getElementById("inputArea").value = "#loading index " + sCategory + "...";
			if (sCategory === "saved") {
				fnLoadCategoryLocalStorage(sCategory);
			} else {
				sName = sCategory + "/0index.js";
				gcFiddle.pendingScripts.push({
					category: sCategory,
					example: "0index",
					url: sName
				});
				Utils.loadScript(sName, fnCategoryLoaded, sCategory);
			}
		}
		setDisabled("deleteButton", (sCategory !== "saved") || !Object.keys(gcFiddle.categories.saved).length);
	},

	onInputLegendClick: function () {
		gcFiddle.config.showInput = Utils.toogleHidden("inputArea");
	},

	onOutputLegendClick: function () {
		gcFiddle.config.showOutput = Utils.toogleHidden("outputArea");
	},

	onVarLegendClick: function () {
		gcFiddle.config.showVariable = Utils.toogleHidden("varArea");
	},

	onNotesLegendClick: function () {
		gcFiddle.config.showNotes = Utils.toogleHidden("notesArea");
	},

	onWaypointLegendClick: function () {
		gcFiddle.config.showWaypoint = Utils.toogleHidden("waypointArea");
	},

	onMapLegendClick: function () {
		var sMapType = gcFiddle.config.mapType;

		gcFiddle.config.showMap = Utils.toogleHidden("mapCanvas-" + sMapType);
		if (gcFiddle.config.showMap) {
			gcFiddle.maFa.resize();
			gcFiddle.maFa.fitBounds();
		}
	},

	onLogsLegendClick: function () {
		gcFiddle.config.showLogs = Utils.toogleHidden("logsArea");
	},

	onConsoleLogLegendClick: function () {
		gcFiddle.config.showConsole = Utils.toogleHidden("consoleLogArea");
	},

	onFitBoundsButtonClick: function () {
		var oMaFa = gcFiddle.maFa;

		oMaFa.clearMarkers(); // clear needed for SimpleMarker
		oMaFa.clearPolyline();
		oMaFa.fitBounds();
		oMaFa.setPolyline();
		oMaFa.showMarkers();
	},

	onLocationButtonClick: function () {
		var that = this;

		function showPosition(position) {
			var oPos = new LatLng(position.coords.latitude, position.coords.longitude),
				iMarkersLength = gcFiddle.maFa.getMarkers().length;

			window.console.log("Location: " + oPos.toString());
			gcFiddle.maFa.setMarker({
				position: oPos
			}, iMarkersLength);
			that.onFitBoundsButtonClick();
		}

		function showError(error) {
			switch (error.code) {
			case error.PERMISSION_DENIED:
				window.console.warn("User denied the request for Geolocation.");
				break;
			case error.POSITION_UNAVAILABLE:
				window.console.warn("Location information is unavailable.");
				break;
			case error.TIMEOUT:
				window.console.warn("The request to get user location timed out.");
				break;
			case error.UNKNOWN_ERROR:
				window.console.warn("An unknown error occurred.");
				break;
			default:
				window.console.warn("An error occurred.");
				break;
			}
		}

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(showPosition, showError);
		} else {
			window.console.warn("Geolocation is not supported by this browser.");
		}
	},

	onOutputAreaClick: function (event) {
		var variables = gcFiddle.variables,
			oTarget = event.target,
			iSelStart = oTarget.selectionStart,
			sOutput = oTarget.value,
			iLineStart,
			iLineEnd,
			iEqual,
			sPar = "",
			varSelect = document.getElementById("varSelect"),
			waypointSelect = document.getElementById("waypointSelect");

		if (gDebug) {
			gDebug.log("onOutputAreaClick: selStart=" + event.target.selectionStart + " selEnd=" + event.target.selectionEnd);
		}
		if (sOutput) {
			iLineEnd = sOutput.indexOf("\n", iSelStart);
			if (iLineEnd >= 0) {
				sOutput = sOutput.substring(0, iLineEnd);
			}
			iLineStart = sOutput.lastIndexOf("\n");
			if (iLineStart >= 0) {
				sOutput = sOutput.substring(iLineStart + 1, iLineEnd);
			}
			iEqual = sOutput.indexOf("=");
			if (iEqual >= 0) {
				sPar = sOutput.substring(0, iEqual);
			}
			if (gDebug) {
				gDebug.log("onOutputAreaClick: line='" + sOutput + "' var=" + sPar);
			}
			if (sPar && variables[sPar] !== null) {
				if (isWaypoint(sPar)) {
					if (sPar !== waypointSelect.value) {
						waypointSelect.value = sPar;
						this.onWaypointSelectChange();
					}
				} else if (sPar !== varSelect.value) {
					varSelect.value = sPar;
					this.onVarSelectChange();
				}
			}
		}
	},

	onMapTypeSelectChange: function () {
		var	aMapCanvas = document.getElementsByClassName("canvas"),
			mapTypeSelect = document.getElementById("mapTypeSelect"),
			sMapType = mapTypeSelect.value,
			sMapTypeId = "mapCanvas-" + sMapType,
			oItem, i,

			fnMapLoaded = function (map) {
				var sMapType2 = map.options.mapType,
					oMapProxy = gcFiddle.mapProxy[sMapType2];

				oMapProxy.setMap(map);
				if (gcFiddle.maFa) {
					gcFiddle.maFa.initMap(oMapProxy);
				}
			},
			fnMapProxyLoaded = function (mapProxy) {
				var sMapType2 = mapProxy.options.mapType,
					sMapTypeId2 = "mapCanvas-" + sMapType2;

				gcFiddle.mapProxy[sMapType2] = mapProxy;
				mapProxy.createMap({
					googleKey: gcFiddle.config.googleKey,
					leafletUrl: gcFiddle.config.leafletUrl,
					mapboxKey: gcFiddle.config.mapboxKey,
					openLayersUrl: gcFiddle.config.openLayersUrl,
					zoom: gcFiddle.config.zoom,
					mapType: sMapType2,
					mapDivId: sMapTypeId2,
					onload: fnMapLoaded
				});
			};

		gcFiddle.config.mapType = sMapType;
		for (i = 0; i < aMapCanvas.length; i += 1) {
			oItem = aMapCanvas[i];
			if (oItem.id === sMapTypeId) {
				Utils.setHidden(oItem.id, !gcFiddle.config.showMap);
			} else {
				Utils.setHidden(oItem.id, true);
			}
		}

		if (!gcFiddle.mapProxy[sMapType]) {
			MapProxy.create({
				mapType: sMapType,
				onload: fnMapProxyLoaded
			});
		} else if (gcFiddle.maFa) {
			gcFiddle.maFa.initMap(gcFiddle.mapProxy[sMapType]);
		}
	},

	onReloadButtonClick: function () {
		var oChanged = getChangedParameters(gcFiddle.config, gcFiddle.initialConfig);

		window.location.search = "?" + encodeUriParam(oChanged); // jQuery.param(oChanged, true)
	},

	onSaveButtonClick: function () {
		var categorySelect = document.getElementById("categorySelect"),
			sCategory = categorySelect.value,
			exampleSelect = document.getElementById("exampleSelect"),
			oselectedExample = gcFiddle.examples[sCategory][exampleSelect.value],
			sInput = document.getElementById("inputArea").value,
			oExample, oSavedList;

		if (sCategory !== "saved") {
			sCategory = "saved";
			categorySelect.value = sCategory;
			this.onCategorySelectChange(); // may change example value as well
		}

		oExample = addExample(sInput, sCategory, oselectedExample || gcFiddle.emptyExample.draft);
		window.localStorage.setItem(oExample.key, sInput);

		if (gcFiddle.config.testIndexedDb) {
			testIndexedDb(oExample);
		}

		oSavedList = gcFiddle.categories.saved;

		if (oSavedList[oExample.key]) {
			oSavedList[oExample.key] = oExample;
			if (exampleSelect.value !== oExample.key) {
				exampleSelect.value = oExample.key;
			}
			this.onExampleSelectChange(); // make sure correct input is shown
		} else {
			oSavedList[oExample.key] = oExample;
			gcFiddle.config.example = oExample.key;
			setExampleList();
			this.onExampleSelectChange();
		}
		setDisabled("deleteButton", !Object.keys(oSavedList).length);
	},

	onDeleteButtonClick: function () {
		var sCategory = document.getElementById("categorySelect").value,
			exampleSelect = document.getElementById("exampleSelect"),
			sExample = exampleSelect.value,
			oSavedList = gcFiddle.categories.saved;

		if (sCategory !== "saved") {
			return;
		}
		if (!myConfirm("Delete " + sCategory + "/" + sExample)) {
			return;
		}
		window.console.log("Deleting " + sExample);
		window.localStorage.removeItem(sExample);

		if (oSavedList) {
			if (oSavedList[sExample]) {
				delete oSavedList[sExample];
				removeSelectOptions(exampleSelect);
				setExampleList();
				this.onExampleSelectChange();
			}
			setDisabled("deleteButton", !Object.keys(oSavedList).length);
		}
	}
};

// https://stackoverflow.com/questions/6604192/showing-console-errors-and-alerts-in-a-div-inside-the-page
function redirectConsole() {
	var aVerbs = [
			"log",
			"debug",
			"info",
			"warn",
			"error"
		],
		sVerb,
		consoleLogArea = document.getElementById("consoleLogArea"),
		i;

	for (i = 0; i < aVerbs.length; i += 1) {
		sVerb = aVerbs[i];
		window.console[sVerb] = (function (fnMethod, sVerb2, oLog) {
			return function () {
				if (fnMethod) {
					fnMethod.apply(console, arguments);
				}
				oLog.value += sVerb2 + ": " + Array.prototype.slice.call(arguments).join(" ") + "\n";
			};
		}(window.console[sVerb], sVerb, consoleLogArea));
	}
}

function doStart() {
	var oConfig = gcFiddle.config;

	Utils.objectAssign(oConfig, gcFiddleExternalConfig || {});
	gcFiddle.initialConfig = Utils.objectAssign({}, oConfig);
	parseUri(oConfig);
	if (oConfig.showConsole) {
		redirectConsole();
		document.getElementById("consoleLogBox").hidden = false;
	}
	if (Number(oConfig.debug) > 0) {
		gDebug = {
			log: window.console.log,
			level: Number(oConfig.debug)
		};
	}

	gcFiddle.inputStack = new InputStack();

	gcFiddle.maFa = new MarkerFactory({
		draggable: true
	});

	gcFiddle.eventHandlers = new CommonEventHandlers();

	if (oConfig.variableType) {
		document.getElementById("varViewSelect").value = oConfig.variableType;
	}

	if (!oConfig.showInput) {
		gcFiddle.eventHandlers.onInputLegendClick();
	}
	if (!oConfig.showOutput) {
		gcFiddle.eventHandlers.onOutputLegendClick();
	}
	if (!oConfig.showVariable) {
		gcFiddle.eventHandlers.onVarLegendClick();
	}
	if (!oConfig.showNotes) {
		gcFiddle.eventHandlers.onNotesLegendClick();
	}
	if (!oConfig.showWaypoint) {
		gcFiddle.eventHandlers.onWaypointLegendClick();
	}
	if (oConfig.showMap) {
		gcFiddle.eventHandlers.onMapLegendClick();
	}

	if (!oConfig.showLogs) {
		gcFiddle.eventHandlers.onLogsLegendClick();
	}

	if (oConfig.example) {
		document.getElementById("exampleSelect").value = oConfig.example;
	}

	if (oConfig.category) {
		document.getElementById("categorySelect").value = oConfig.category;
		gcFiddle.eventHandlers.onCategorySelectChange();
	} else {
		gcFiddle.eventHandlers.onExampleSelectChange();
	}

	if (oConfig.mapType) {
		document.getElementById("mapTypeSelect").value = oConfig.mapType;
	}
	gcFiddle.eventHandlers.onMapTypeSelectChange();
}

function onLoad() {
	var sUrl = "Polyfills.js",
		bDebugForcePolyFill = false; //switch in debugger for testing

	if (bDebugForcePolyFill) {
		window.console = null;
		String.prototype.trim = null; // eslint-disable-line no-extend-native
		document.getElementsByClassName = null;
		document.addEventListener = null;
		Array.prototype.forEach = null; // eslint-disable-line no-extend-native
	}

	if ((!window.console || !Array.prototype.forEach || !Object.create) && typeof Polyfills === "undefined") { // need Polyfill?, load module on demand
		Utils.loadScript(sUrl, function () {
			window.console.log(sUrl + " loaded");
			doStart();
		});
	} else {
		doStart();
	}
}

window.onload = onLoad;
// end
