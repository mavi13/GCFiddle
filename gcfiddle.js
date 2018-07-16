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
		}
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

function getLoadedFile() {
	var sFile = "";

	try {
		throw new Error("getStackTrace");
	} catch (e) {
		sFile = e.stack.trim().split("\n").pop();
		// e.g. Google Chrome: "file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"; Firefox: "@file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"
	}
	return sFile;
}

// if category is not specified it is extracted from the filename in the call stack
function parseExample(input, category, emptyExample) {
	var sInput = (typeof input === "string") ? input : hereDoc(input).trim(),
		oExample = {
			category: category,
			key: "",
			title: "",
			script: sInput
		},
		sLine, aParts, oCategory;

	if (!category) {
		sLine = getLoadedFile();
		aParts = sLine.match(/(\w+)\/(\w+)\.js/);
		if (aParts) {
			oExample.category = aParts[1];
			/*
			if ((oExample.key !== aParts[2]) && aParts[2] !== "0index") {
				window.console.warn("parseExample: different example keys found: " + oExample.key + " <> " + aParts[2]);
			}
			*/
			oExample.key = aParts[2]; // filename as key
			oCategory = gcFiddle.categories[oExample.category]; // try to get title from category index
			if (oCategory) {
				oExample.title = (oCategory[oExample.key]) ? oCategory[oExample.key].title : "";
			}
		}
	}

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
	var oItem = parseExample(input, category, emptyExample);

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
		aLines,
		mItems = {};

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

function onVarSelectChange() {
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
	varInput.type = sType; // set type before value
	varInput.value = sValue;
	varSelect.title = (varSelect.selectedIndex >= 0) ? varSelect.options[varSelect.selectedIndex].title : "";
	document.getElementById("varLegend").textContent = "Variables (" + varSelect.length + ")";
}

function onVarViewSelectChange() {
	gcFiddle.config.variableType = document.getElementById("varViewSelect").value;
	onVarSelectChange();
}

function onWaypointSelectChange() {
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

function onVarInputChange() {
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
		onVarSelectChange(); // title change?
		setWaypointSelectOptions();
		setMarkers(variables);
		gcFiddle.maFa.setPolyline();
		gcFiddle.maFa.showMarkers();
		onWaypointSelectChange();
	}
}

function onWaypointInputChange() {
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
		onWaypointSelectChange();
	}
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


function onExecuteButtonClick() {
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
	onVarSelectChange();
	removeSelectOptions(waypointSelect);
	setWaypointSelectOptions();
	if (waypointSelect.options.length) {
		waypointSelect.selectedIndex = waypointSelect.options.length - 1; // select last waypoint
	}
	onWaypointSelectChange();
	gcFiddle.maFa.fitBounds();
	gcFiddle.maFa.setPolyline();
	gcFiddle.maFa.showMarkers();
}


function onUndoButtonClick() {
	setInputAreaValue(gcFiddle.inputStack.undo());
	updateUndoRedoButtons();
	setOutputAreaValue("");
}

function onRedoButtonClick() {
	setInputAreaValue(gcFiddle.inputStack.redo());
	updateUndoRedoButtons();
	setOutputAreaValue("");
}

function doPreprocess() {
	var inputArea = document.getElementById("inputArea"),
		sInput = inputArea.value,
		sOutput = "",
		oProcessor;

	oProcessor = new Preprocessor();
	sOutput = oProcessor.processText(sInput);

	putChangedInputOnStack();
	setInputAreaValue(sOutput);
	onExecuteButtonClick();
}

function onPreprocessButtonClick() {
	var sUrl = "Preprocessor.js";

	if (typeof Preprocessor === "undefined") { // load module on demand
		Utils.loadScript(sUrl, function () {
			window.console.log(sUrl + " loaded");
			doPreprocess();
		});
	} else {
		doPreprocess();
	}
}

function onExampleLoaded(sExample, bSuppressLog) {
	var sCategory = gcFiddle.config.category,
		oExamples = gcFiddle.examples[sCategory],
		sName = sCategory + "/" + sExample + ".js",
		sUnknownExample;

	gcFiddle.config.example = sExample;
	if (!bSuppressLog) {
		window.console.log("Example " + sName + " loaded");
	}
	if (oExamples[sExample] === undefined) { // TODO: example without id loaded (Do we still need this?)
		window.console.warn("Example " + sName + ": Wrong format! Must start with #<id>: <title>");
		sUnknownExample = gcFiddle.emptyExample.unknown.key;
		if (oExamples[sUnknownExample]) {
			oExamples[sExample] = oExamples[sUnknownExample];
			delete oExamples[sUnknownExample];
		} else {
			window.console.error("No example 'unknown' found");
			oExamples[sExample] = parseExample("", "", sExample);
		}
	}
	setInputAreaValue(oExamples[sExample].script);
	initUndoRedoButtons();
	onExecuteButtonClick();
}

function onExampleSelectChange() {
	var sCategory = gcFiddle.config.category,
		exampleSelect = document.getElementById("exampleSelect"),
		sExample = exampleSelect.value,
		oExamples = gcFiddle.examples[sCategory],
		sName;

	exampleSelect.title = (exampleSelect.selectedIndex >= 0) ? exampleSelect.options[exampleSelect.selectedIndex].title : "";
	if (oExamples[sExample] !== undefined) {
		onExampleLoaded(sExample, true);
	} else if (sExample) {
		setInputAreaValue("#loading " + sExample + "...");
		setOutputAreaValue("waiting...");
		sName = sCategory + "/" + sExample + ".js";
		Utils.loadScript(sName, onExampleLoaded, sExample);
	} else {
		setInputAreaValue("");
		gcFiddle.config.example = "";
		initUndoRedoButtons();
		onExecuteButtonClick();
	}
}

function onCategoryLoaded(sCategory) {
	var exampleSelect = document.getElementById("exampleSelect"),
		sName = sCategory + "/0index.js";

	gcFiddle.config.category = sCategory;
	window.console.log("category " + sName + " loaded");
	removeSelectOptions(exampleSelect);
	setExampleList();
	onExampleSelectChange();
}

function loadCategoryLocalStorage(sCategory) {
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
	onCategoryLoaded(sCategory);
}

function onCategorySelectChange() {
	var categorySelect = document.getElementById("categorySelect"),
		sCategory = categorySelect.value,
		exampleSelect = document.getElementById("exampleSelect"),
		oCategories = gcFiddle.categories,
		sName;

	if (oCategories[sCategory] !== undefined) {
		gcFiddle.config.category = sCategory;
		removeSelectOptions(exampleSelect);
		setExampleList();
		onExampleSelectChange();
	} else {
		document.getElementById("inputArea").value = "#loading index " + sCategory + "...";
		if (sCategory === "saved") {
			loadCategoryLocalStorage(sCategory);
		} else {
			sName = sCategory + "/0index.js";
			Utils.loadScript(sName, onCategoryLoaded, sCategory);
		}
	}
	setDisabled("deleteButton", (sCategory !== "saved") || !Object.keys(gcFiddle.categories.saved).length);
}

function onInputLegendClick() {
	gcFiddle.config.showInput = Utils.toogleHidden("inputArea");
}

function onOutputLegendClick() {
	gcFiddle.config.showOutput = Utils.toogleHidden("outputArea");
}

function onVarLegendClick() {
	gcFiddle.config.showVariable = Utils.toogleHidden("varArea");
}

function onNotesLegendClick() {
	gcFiddle.config.showNotes = Utils.toogleHidden("notesArea");
}

function onWaypointLegendClick() {
	gcFiddle.config.showWaypoint = Utils.toogleHidden("waypointArea");
}

function onMapLegendClick() {
	var sMapType = gcFiddle.config.mapType;

	gcFiddle.config.showMap = Utils.toogleHidden("mapCanvas-" + sMapType);
	if (gcFiddle.config.showMap) {
		gcFiddle.maFa.resize();
		gcFiddle.maFa.fitBounds();
	}
}

function onLogsLegendClick() {
	gcFiddle.config.showLogs = Utils.toogleHidden("logsArea");
}

function onConsoleLogLegendClick() {
	gcFiddle.config.showConsole = Utils.toogleHidden("consoleLogArea");
}

function onFitBoundsButtonClick() {
	var oMaFa = gcFiddle.maFa;

	oMaFa.clearMarkers(); // clear needed for SimpleMarker
	oMaFa.clearPolyline();
	oMaFa.fitBounds();
	oMaFa.setPolyline();
	oMaFa.showMarkers();
}

function onLocationButtonClick() {
	function showPosition(position) {
		var oPos = new LatLng(position.coords.latitude, position.coords.longitude),
			iMarkersLength = gcFiddle.maFa.getMarkers().length;

		window.console.log("Location: " + oPos.toString());
		gcFiddle.maFa.setMarker({
			position: oPos
		}, iMarkersLength);
		onFitBoundsButtonClick();
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
}

function onOutputAreaClick(event) {
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
					onWaypointSelectChange();
				}
			} else if (sPar !== varSelect.value) {
				varSelect.value = sPar;
				onVarSelectChange();
			}
		}
	}
}


function onMapLoaded(map) {
	var sMapType = map.options.mapType,
		oMapProxy = gcFiddle.mapProxy[sMapType];

	oMapProxy.setMap(map);
	if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(oMapProxy);
	}
}

function onMapProxyLoaded(mapProxy) {
	var sMapType = mapProxy.options.mapType,
		sMapTypeId = "mapCanvas-" + sMapType;

	gcFiddle.mapProxy[sMapType] = mapProxy;
	mapProxy.createMap({
		googleKey: gcFiddle.config.googleKey,
		leafletUrl: gcFiddle.config.leafletUrl,
		mapboxKey: gcFiddle.config.mapboxKey,
		openLayersUrl: gcFiddle.config.openLayersUrl,
		zoom: gcFiddle.config.zoom,
		mapType: sMapType,
		mapDivId: sMapTypeId,
		onload: onMapLoaded
	});
}

function onMapTypeSelectChange() {
	var	aMapCanvas = document.getElementsByClassName("canvas"),
		mapTypeSelect = document.getElementById("mapTypeSelect"),
		sMapType = mapTypeSelect.value,
		sMapTypeId = "mapCanvas-" + sMapType,
		oItem, i;

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
			onload: onMapProxyLoaded
		});
	} else if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(gcFiddle.mapProxy[sMapType]);
	}
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

function onReloadButtonClick() {
	var oChanged = getChangedParameters(gcFiddle.config, gcFiddle.initialConfig);

	window.location.search = "?" + encodeUriParam(oChanged); // jQuery.param(oChanged, true)
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

function onSaveButtonClick() {
	var categorySelect = document.getElementById("categorySelect"),
		sCategory = categorySelect.value,
		exampleSelect = document.getElementById("exampleSelect"),
		oselectedExample = gcFiddle.examples[sCategory][exampleSelect.value],
		sInput = document.getElementById("inputArea").value,
		oExample, oSavedList;

	if (sCategory !== "saved") {
		sCategory = "saved";
		categorySelect.value = sCategory;
		onCategorySelectChange(); // may change example value as well
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
		onExampleSelectChange(); // make sure correct input is shown
	} else {
		oSavedList[oExample.key] = oExample;
		gcFiddle.config.example = oExample.key;
		setExampleList();
		onExampleSelectChange();
	}
	setDisabled("deleteButton", !Object.keys(oSavedList).length);
}

function onDeleteButtonClick() {
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
			onExampleSelectChange();
		}
		setDisabled("deleteButton", !Object.keys(oSavedList).length);
	}
}

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
		window.console[sVerb] = (function (oOldLog, oLog, sVerb2) {
			return function () {
				oLog.value += sVerb2 + ": " + Array.prototype.slice.call(arguments).join(" ") + "\n";
				oOldLog.apply(console, arguments);
			};
		}(window.console.log.bind(console), consoleLogArea, sVerb));
	}
	document.getElementById("consoleLogBox").hidden = false;
}

function onLoad() {
	var oConfig = gcFiddle.config;

	Utils.objectAssign(oConfig, gcFiddleExternalConfig || {});
	gcFiddle.initialConfig = Utils.objectAssign({}, oConfig);
	parseUri(oConfig);
	if (oConfig.showConsole) {
		redirectConsole();
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
	document.getElementById("executeButton").onclick = onExecuteButtonClick;
	document.getElementById("undoButton").onclick = onUndoButtonClick;
	document.getElementById("redoButton").onclick = onRedoButtonClick;
	document.getElementById("preprocessButton").onclick = onPreprocessButtonClick;
	document.getElementById("reloadButton").onclick = onReloadButtonClick;
	document.getElementById("saveButton").onclick = onSaveButtonClick;
	document.getElementById("deleteButton").onclick = onDeleteButtonClick;
	document.getElementById("categorySelect").onchange = onCategorySelectChange;
	document.getElementById("exampleSelect").onchange = onExampleSelectChange;
	document.getElementById("varSelect").onchange = onVarSelectChange;
	document.getElementById("varViewSelect").onchange = onVarViewSelectChange;
	document.getElementById("waypointSelect").onchange = onWaypointSelectChange;
	document.getElementById("varLegend").onclick = onVarLegendClick;
	document.getElementById("inputLegend").onclick = onInputLegendClick;
	document.getElementById("outputLegend").onclick = onOutputLegendClick;
	document.getElementById("notesLegend").onclick = onNotesLegendClick;
	document.getElementById("waypointLegend").onclick = onWaypointLegendClick;
	document.getElementById("mapLegend").onclick = onMapLegendClick;
	document.getElementById("mapTypeSelect").onchange = onMapTypeSelectChange;
	document.getElementById("locationButton").onclick = onLocationButtonClick;
	document.getElementById("fitBoundsButton").onclick = onFitBoundsButtonClick;
	document.getElementById("logsLegend").onclick = onLogsLegendClick;
	document.getElementById("consoleLogLegend").onclick = onConsoleLogLegendClick;

	document.getElementById("outputArea").onclick = onOutputAreaClick;
	document.getElementById("varInput").onchange = onVarInputChange;
	document.getElementById("waypointInput").onchange = onWaypointInputChange;

	if (oConfig.variableType) {
		document.getElementById("varViewSelect").value = oConfig.variableType;
	}

	if (!oConfig.showInput) {
		onInputLegendClick();
	}
	if (!oConfig.showOutput) {
		onOutputLegendClick();
	}
	if (!oConfig.showVariable) {
		onVarLegendClick();
	}
	if (!oConfig.showNotes) {
		onNotesLegendClick();
	}
	if (!oConfig.showWaypoint) {
		onWaypointLegendClick();
	}
	if (oConfig.showMap) {
		onMapLegendClick();
	}

	if (!oConfig.showLogs) {
		onLogsLegendClick();
	}

	if (oConfig.example) {
		document.getElementById("exampleSelect").value = oConfig.example;
	}

	if (oConfig.category) {
		document.getElementById("categorySelect").value = oConfig.category;
		onCategorySelectChange();
	} else {
		onExampleSelectChange();
	}

	if (oConfig.mapType) {
		document.getElementById("mapTypeSelect").value = oConfig.mapType;
	}
	onMapTypeSelectChange();
}

window.onload = onLoad;
// end
