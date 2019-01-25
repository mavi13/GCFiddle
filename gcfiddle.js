// gcfiddle.js - GCFiddle
// (c) mavi13, 2018
// https://mavi13.github.io/GCFiddle/
//
/* globals Controller, Model, Utils, View */

"use strict";

var gcFiddleExternalConfig, // set in gcconfig.js
	gcFiddle = {
		config: {
			debug: 0,
			exampleDir: "./test", // "examples" // example base directory
			dbIndex: "0dbindex.js", // DB index relative to exampleDir
			testNewExamples: true,
			database: "testDB", // DB
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
			waypointFormat: "", // waypoint output format: "", dmm, dms, dd, dmmc, dmsc, ddc
			leafletMapboxKey: "", // mapbox access token (for leaflet maps, currently unused)
			mapType: "leaflet", // simple, google, leaflet, openlayers, none
			googleKey: "", // Google API key
			zoom: 15, // default zoom level
			leafletUrl: "https://unpkg.com/leaflet@1.3.1/dist/leaflet.js",
			openlayersUrl: "https://cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js",
			testIndexedDb: false
		},
		model: null,
		view: null,
		controller: null,

		addDatabases: function (oDb) {
			return gcFiddle.model.addDatabases(oDb);
		},

		addIndex: function (sLocation, fnInput) {
			return gcFiddle.controller.fnAddIndex(sLocation, fnInput);
		},

		addItem: function (sKey, fnInput) {
			return gcFiddle.controller.fnAddItem(sKey, fnInput);
		},

		// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
		fnParseUri: function (oConfig) {
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
		},

		fnDoStart2: function () {
			var that = this,
				sUrl = "Polyfills.js",
				bDebugForcePolyFill = false; // switch in debugger for testing

			if (bDebugForcePolyFill) {
				window.console = null;
				String.prototype.trim = null; // eslint-disable-line no-extend-native
				document.getElementsByClassName = null;
				document.addEventListener = null;
				Array.prototype.forEach = null; // eslint-disable-line no-extend-native
			}

			if ((!window.console || !Array.prototype.forEach || !Object.create || !Utils.localStorage) && typeof Polyfills === "undefined") { // need Polyfill?, load module on demand
				Utils.loadScript(sUrl, function () {
					window.console.log(sUrl + " loaded");
					that.fnDoStart();
				});
			} else {
				this.fnDoStart();
			}
		},

		fnDoStart: function () {
			var that = this,
				oStartConfig = this.config,
				oInitialConfig,	oModel, iDebug, sDbIndex;

			if (Utils.debug) { // not yet active
				Utils.console.debug("DEBUG: fnDoStart: gcFiddle started");
			}
			Utils.objectAssign(oStartConfig, gcFiddleExternalConfig || {}); // merge external config from gcconfig.js
			oInitialConfig = Utils.objectAssign({}, oStartConfig); // save config
			this.fnParseUri(oStartConfig); // modify config with URL parameters
			this.model = new Model({
				config: oStartConfig,
				initialConfig: oInitialConfig
			});
			this.view = new View({});
			oModel = this.model;
			if (oModel.getProperty("showConsole")) {
				this.view.redirectConsole();
			}
			iDebug = Number(oModel.getProperty("debug"));
			Utils.debug = iDebug;

			sDbIndex = oModel.getProperty("exampleDir") + "/" + oModel.getProperty("dbIndex");

			if (sDbIndex) {
				Utils.loadScript(sDbIndex, function () {
					window.console.log(sDbIndex + " loaded");
					that.controller = new Controller(that.model, that.view);
				});
			} else {
				window.console.warn("DbIndex not set");
				this.controller = new Controller(this.model, this.view);
			}
		},

		fnOnLoad: function () {
			var that = this,
				sUrl = "Polyfills.js",
				bDebugForcePolyFill = false; // switch in debugger for testing

			Utils.initLocalStorage();

			if (bDebugForcePolyFill) {
				window.console = null;
				String.prototype.trim = null; // eslint-disable-line no-extend-native
				document.getElementsByClassName = null;
				document.addEventListener = null;
				Array.prototype.forEach = null; // eslint-disable-line no-extend-native
			}

			if ((!window.console || !Array.prototype.forEach || !Object.create || !Utils.localStorage) && typeof Polyfills === "undefined") { // need Polyfill?, load module on demand
				Utils.loadScript(sUrl, function () {
					window.console.log(sUrl + " loaded");
					that.fnDoStart();
				});
			} else {
				this.fnDoStart();
			}
		}
	};


// Deprecated function called from file 0index.js
function setExampleIndex(input) { // eslint-disable-line no-unused-vars
	var sAdapted = "",
		sInput, aLines, i, sLine, aParts, sKey, sTitle;

	Utils.console.warn("setExampleIndex: Deprecated example index format found! Trying to load and adapt...");

	sInput = (typeof input === "string") ? Utils.stringTrimLeft(input) : gcFiddle.controller.fnHereDoc(input).trim();

	if (sInput) {
		aLines = sInput.split("\n");
		for (i = 0; i < aLines.length; i += 1) {
			sLine = aLines[i];
			aParts = sLine.match(/^#([\w\d]+)\s*:\s*(.+)/);
			if (aParts) {
				sKey = aParts[1];
				sTitle = aParts[2];
				sTitle = String(sTitle).replace(/"/g, "'"); // replace quotes by apostropthes
				sAdapted += "$" + sKey + '="!!' + sTitle + '"\n';
			} else {
				window.console.warn("setExampleIndex: ignoring line " + sLine);
			}
		}
	}
	return gcFiddle.controller.fnAddIndex("./", sAdapted);
}

// Deprecated function called from old files GCxxxxx.js
function addExample(input) { // eslint-disable-line no-unused-vars
	var sInput, aSplit, sLine, aParts, sKey, sTitle;

	sInput = (typeof input === "string") ? Utils.stringTrimLeft(input) : gcFiddle.controller.fnHereDoc(input).trim();

	aSplit = sInput.split("\n", 1);
	sLine = aSplit[0]; // first line

	Utils.console.warn("addExample: Deprecated example format found! Trying to load and adapt: " + sLine);

	aParts = sLine.match(/^#([\w\d]+)\s*:\s*(.+)/);
	if (aParts) {
		sKey = aParts[1];
		sTitle = aParts[2];
		sTitle = String(sTitle).replace(/"/g, "'"); // replace quotes by apostropthes
		sInput = "$" + sKey + '="!!' + sTitle + '"\n' + sInput;
	} else {
		window.console.warn("parseExample: Example must start with #<id>: <title>");
	}
	return gcFiddle.controller.fnAddItem("", sInput);
}


gcFiddle.fnOnLoad(); // if gcfiddle.js is the last script, we do not need to wait for window.onload
// end
