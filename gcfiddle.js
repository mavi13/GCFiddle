// gcfiddle.js - GCFiddle
// (c) mavi13, 2018
// https://mavi13.github.io/GCFiddle/
//
/* globals window, document, CommonEventHandler, InputStack, LatLng, MarkerFactory, Preprocessor, ScriptParser, Utils */ // ESlint

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
		commonEventHandler: null,
		pendingScripts: [],
		localStorage: window.localStorage,

		// see: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript?rq=1
		fnHereDoc: function (fn) {
			return fn.toString().
				replace(/^[^/]+\/\*\S*/, "").
				replace(/\*\/[^/]+$/, "");
		},

		fnGetPendingCategory: function () {
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
		},

		// if category is not specified it is taken from gcFiddle.pendingScripts
		fnParseExample: function (input, category, emptyExample) {
			var sInput = (typeof input === "string") ? Utils.stringTrimLeft(input) : gcFiddle.fnHereDoc(input).trim(),
				oExample = {
					category: category,
					key: "",
					title: "",
					script: sInput
				},
				sLine, aParts;

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
		},

		// called also from files GCxxxxx.js
		// if category is not specified it is extracted from the filename in the call stack
		fnAddExample: function (input, category, emptyExample) {
			var oItem;

			if (!category) {
				category = gcFiddle.fnGetPendingCategory();
			}
			oItem = gcFiddle.fnParseExample(input, category, emptyExample);

			window.console.log("addExample: category=" + oItem.category + "(" + gcFiddle.config.category + ") key=" + oItem.key);
			if (gcFiddle.examples[oItem.category]) {
				gcFiddle.examples[oItem.category][oItem.key] = oItem;
			} else {
				window.console.error("Unknown category: " + oItem.category);
			}
			return oItem;
		},

		// called also from file 0index.js
		// if category is not specified it is extracted from the filename in the call stack
		fnSetExampleIndex: function (input, category) {
			var sInput = (typeof input === "string") ? input.trim() : gcFiddle.fnHereDoc(input).trim(),
				mItems = {},
				aLines;

			if (!category) {
				category = gcFiddle.fnGetPendingCategory();
			}
			if (sInput) {
				aLines = sInput.split("\n");
				aLines.forEach(function (sLine) {
					var oItem = gcFiddle.fnParseExample(sLine, category);

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
		},

		fnIsWaypoint: function (s) {
			return s.indexOf("$") === 0; // waypoints start with "$"
		},

		fnSetMarkers: function (variables) {
			var i = 0,
				sPar, oSettings;

			for (sPar in variables) {
				if (variables.hasOwnProperty(sPar) && gcFiddle.fnIsWaypoint(sPar)) {
					oSettings = {
						position: new LatLng().parse(variables[sPar].toString(gcFiddle.config.positionFormat)),
						label: Utils.strZeroFormat(i.toString(), 2),
						title: sPar
					};
					gcFiddle.maFa.setMarker(oSettings, i);
					i += 1;
				}
			}
		},

		fnRemoveAdditionalSelectOptions: function (select, iRemain) {
			var i;

			iRemain = iRemain || 0;
			for (i = select.length - 1; i >= iRemain; i -= 1) {
				select.remove(i);
			}
		},

		fnSetSelectOptions: function (select, fnSel, fnTextFormat) {
			var oVariables = gcFiddle.variables,
				i = 0,
				sPar, sText, sTitle, option;

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
						option = select.options[i];
						if (option.value !== sPar) {
							option.value = sPar;
						}
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
			gcFiddle.fnRemoveAdditionalSelectOptions(select, i);
		},

		fnSetVarSelectOptions: function () {
			gcFiddle.fnSetSelectOptions(document.getElementById("varSelect"),
				function (s) { return !gcFiddle.fnIsWaypoint(s); }
			);
		},

		fnSetWaypointSelectOptions: function () {
			var fnTextFormat = function (parameter, value) {
				value = value.toString(gcFiddle.config.positionFormat).replace(/(N|S|E|W)\s*(\d+)°?\s*/g, "");

				parameter = parameter.substring(1, 4);
				return parameter + "=" + value;
			};

			gcFiddle.fnSetSelectOptions(document.getElementById("waypointSelect"), gcFiddle.fnIsWaypoint, fnTextFormat);
		},

		fnSetExampleList: function () {
			var categorySelect = document.getElementById("categorySelect"),
				select = document.getElementById("exampleSelect"),
				oExamples = gcFiddle.categories[categorySelect.value],
				i = 0,
				sId, sText, sTitle, option, selectExample;

			for (sId in oExamples) {
				if (oExamples.hasOwnProperty(sId)) {
					sTitle = sId + ": " + oExamples[sId].title;
					sTitle = sTitle.substr(0, 160);
					sText = sTitle.substr(0, 20);
					if (i >= select.length) {
						option = document.createElement("option");
						option.value = sId;
						option.title = sTitle;
						option.text = sText;
						select.add(option);
					} else {
						option = select.options[i];
						if (option.value !== sId) {
							option.value = sId;
						}
						if (option.text !== sText) {
							option.text = sText;
							option.title = sTitle;
						}
					}
					if (!selectExample || option.value === gcFiddle.config.example) {
						selectExample = option.value;
					}
					i += 1;
				}
			}
			gcFiddle.fnRemoveAdditionalSelectOptions(select, i);
			if (selectExample) {
				select.value = selectExample;
			}
		},


		fnSetInputAreaValue: function (value) {
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
		},

		fnSetOutputAreaValue: function (value) {
			document.getElementById("outputArea").value = value;
		},

		fnCalculate2: function () {
			var variables = gcFiddle.variables,
				inputArea = document.getElementById("inputArea"),
				input = inputArea.value,
				oOutput, oError, iEndPos,

				fnScrollToSelection = function (textArea) {
					// scrolling needed for Chrome (https://stackoverflow.com/questions/7464282/javascript-scroll-to-selection-after-using-textarea-setselectionrange-in-chrome)
					var charsPerRow = textArea.cols,
						selectionRow = (textArea.selectionStart - (textArea.selectionStart % charsPerRow)) / charsPerRow,
						lineHeight = textArea.clientHeight / textArea.rows;

					textArea.scrollTop = lineHeight * selectionRow;
				};

			oOutput = new ScriptParser().calculate(input, variables);
			if (oOutput.error) {
				oError = oOutput.error;
				iEndPos = oError.pos + ((oError.value !== undefined) ? oError.value.toString().length : 0);
				if (inputArea.selectionStart !== undefined) {
					inputArea.focus();
					inputArea.selectionStart = oError.pos;
					inputArea.selectionEnd = iEndPos;
					fnScrollToSelection(inputArea);
				}
				oOutput.text = oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")";
			}
			gcFiddle.fnSetOutputAreaValue(oOutput.text);
		},

		fnUpdateUndoRedoButtons: function () {
			Utils.setDisabled("undoButton", !gcFiddle.inputStack.canUndoKeepOne());
			Utils.setDisabled("redoButton", !gcFiddle.inputStack.canRedo());
		},

		fnInitUndoRedoButtons: function () {
			gcFiddle.inputStack.init();
			gcFiddle.fnUpdateUndoRedoButtons();
		},

		fnPutChangedInputOnStack: function () {
			var sInput = document.getElementById("inputArea").value,
				sStackInput = gcFiddle.inputStack.getInput();

			if (sStackInput !== sInput) {
				gcFiddle.inputStack.save(sInput);
				gcFiddle.fnUpdateUndoRedoButtons();
			}
		},

		fnParseXml: function (sXml) {
			var oParser = new window.DOMParser(),
				oXml = oParser.parseFromString(sXml, "text/xml"),
				mInfo = {},
				oJson, aWpt, iWp, oWpt;

			// based on: http://blogs.sitepointstatic.com/examples/tech/xml2json/index.html, https://codepen.io/KurtWM/pen/JnLak
			function xml2json(node) {
				var data = {},
					i, cn;

				function addItem(name, value) { // append value
					if (data[name]) {
						if (data[name].constructor !== Array) {
							data[name] = [data[name]];
						}
						data[name][data[name].length] = value;
					} else {
						data[name] = value;
					}
				}
				if (node.nodeType === 1) { // element
					for (i = 0; i < node.attributes.length; i += 1) { // element attributes
						cn = node.attributes.item(i);
						addItem(cn.name, cn.value);
					}
				}
				// child elements
				if (node.hasChildNodes()) {
					for (i = 0; i < node.childNodes.length; i += 1) {
						cn = node.childNodes[i];
						if (cn.nodeType === 1) {
							if (cn.childNodes.length === 1 && cn.firstChild.nodeType === 3) {
								addItem(cn.nodeName, cn.firstChild.nodeValue); // text value
							} else {
								addItem(cn.nodeName, xml2json(cn)); // sub-object
							}
						}
					}
				}
				return data;
			}

			oJson = xml2json(oXml);
			if (oJson.gpx && oJson.gpx.wpt && oJson.gpx.wpt.length) {
				aWpt = oJson.gpx.wpt;
				mInfo.script = "";
				for (iWp = 0; iWp < aWpt.length; iWp += 1) {
					oWpt = aWpt[iWp];
					mInfo.script += "$W" + iWp + '="' + new LatLng(oWpt.lat, oWpt.lon).toString(gcFiddle.config.positionFormat) + '" # ' + oWpt.name + ", " + oWpt.cmt + "\n";
				}
			}
			return mInfo;
		},

		fnDoPreprocess: function () {
			var inputArea = document.getElementById("inputArea"),
				sInput = inputArea.value,
				sOutput = "",
				oProcessor, mInfo;

			oProcessor = new Preprocessor({
				scriptParser: new ScriptParser()
			});
			if (sInput.substr(0, 6) === "<?xml ") {
				mInfo = gcFiddle.fnParseXml(sInput);
			} else {
				mInfo = oProcessor.processText(sInput);
			}
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

			gcFiddle.fnPutChangedInputOnStack();
			gcFiddle.fnSetInputAreaValue(sOutput);
			gcFiddle.commonEventHandler.onExecuteButtonClick();
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

		fnEncodeUriParam: function (params) {
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
		},

		// https://stackoverflow.com/questions/6604192/showing-console-errors-and-alerts-in-a-div-inside-the-page
		fnRedirectConsole: function () {
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
							if (fnMethod.apply) {
								fnMethod.apply(console, arguments);
							} else { // we do our best without apply
								fnMethod(arguments);
							}
						}
						oLog.value += sVerb2 + ": " + Array.prototype.slice.call(arguments).join(" ") + "\n";
					};
				}(window.console[sVerb], sVerb, consoleLogArea));
			}
		},

		fnDoStart: function () {
			var oConfig = gcFiddle.config;

			Utils.objectAssign(oConfig, gcFiddleExternalConfig || {});
			gcFiddle.initialConfig = Utils.objectAssign({}, oConfig);
			gcFiddle.fnParseUri(oConfig);
			if (oConfig.showConsole) {
				gcFiddle.fnRedirectConsole();
			}
			Utils.setHidden("consoleLogBox", !oConfig.showConsole);

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

			gcFiddle.commonEventHandler = new CommonEventHandler();

			if (oConfig.variableType) {
				document.getElementById("varViewSelect").value = oConfig.variableType;
			}

			Utils.setHidden("inputArea", !oConfig.showInput);
			Utils.setHidden("outputArea", !oConfig.showOutput);
			Utils.setHidden("varArea", !oConfig.showVariable);
			Utils.setHidden("notesArea", !oConfig.showNotes);
			Utils.setHidden("waypointArea", !oConfig.showWaypoint);
			Utils.setHidden("logsArea", !oConfig.showLogs);
			Utils.setHidden("consoleLogArea", !oConfig.showConsole);
			Utils.setHidden("mapCanvas-" + oConfig.mapType, !oConfig.showMap);

			if (oConfig.example) {
				document.getElementById("exampleSelect").value = oConfig.example;
			}

			if (oConfig.category) {
				document.getElementById("categorySelect").value = oConfig.category;
				gcFiddle.commonEventHandler.onCategorySelectChange();
			} else {
				gcFiddle.commonEventHandler.onExampleSelectChange();
			}

			if (oConfig.mapType) {
				document.getElementById("mapTypeSelect").value = oConfig.mapType;
			}
			gcFiddle.commonEventHandler.onMapTypeSelectChange();
		},

		fnOnLoad: function () {
			var sUrl = "Polyfills.js",
				bDebugForcePolyFill = false; // switch in debugger for testing

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
					if (!gcFiddle.localStorage && window.myLocalStorage) {
						gcFiddle.localStorage = window.myLocalStorage;
					}
					gcFiddle.fnDoStart();
				});
			} else {
				gcFiddle.fnDoStart();
			}
		}
	};

// called from file 0index.js
function setExampleIndex(input) { // eslint-disable-line no-unused-vars
	return gcFiddle.fnSetExampleIndex(input);
}

// called from files GCxxxxx.js
function addExample(input) { // eslint-disable-line no-unused-vars
	return gcFiddle.fnAddExample(input);
}

gcFiddle.fnOnLoad(); // if gcfiddle.js is the last script, we do not need to wait for window.onload
// end
