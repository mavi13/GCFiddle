// Controller.js - Controller
//
/* globals CommonEventHandler, InputStack, LatLng, MarkerFactory, Preprocessor, ScriptParser, Utils */

"use strict";

function Controller(oModel, oView) {
	this.init(oModel, oView);
}

Controller.prototype = {
	aDirections: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline

	init: function (oModel, oView) {
		var that = this,
			sFilterId, sFilterTitle, sSort, sLocation, sVarType, iVarMin, iVarMax, iVarStep, sWaypointFormat, sMapType, sExample, sUrl,
			onDatabaseIndexLoaded = function () {
				Utils.console.log(sUrl + " loaded");
				that.fnSetDatabaseSelect();
				that.commonEventHandler.onDatabaseSelectChange();
			},
			onDatabaseIndexError = function () {
				Utils.console.log(sUrl + " error");
			};

		this.model = oModel;
		this.view = oView;

		this.sJsonMarker = "#GC_INFO:";

		this.commonEventHandler = new CommonEventHandler(oModel, oView, this);

		oView.setHidden("consoleBox", !oModel.getProperty("showConsole"));

		this.inputStack = new InputStack();

		this.maFa = new MarkerFactory();

		sFilterId = oModel.getProperty("filterId");
		oView.setInputValue("filterIdInput", sFilterId);

		sFilterTitle = oModel.getProperty("filterTitle");
		oView.setInputValue("filterTitleInput", sFilterTitle);

		sSort = oModel.getProperty("sort");
		oView.setSelectValue("sortSelect", sSort);
		oView.setHidden("sortOptionGroup", sSort !== "distance");

		sLocation = oModel.getProperty("location");
		oView.setInputValue("locationInput", sLocation);

		iVarMin = oModel.getProperty("varMin");
		oView.setInputValue("varMinInput", iVarMin);

		iVarMax = oModel.getProperty("varMax");
		oView.setInputValue("varMaxInput", iVarMax);

		iVarStep = oModel.getProperty("varStep");
		oView.setInputValue("varStepInput", iVarStep);

		sVarType = oModel.getProperty("varType");
		oView.setSelectValue("varTypeSelect", sVarType);

		sWaypointFormat = oModel.getProperty("waypointFormat");
		oView.setSelectValue("waypointViewSelect", sWaypointFormat);

		oView.setHidden("specialArea", !oModel.getProperty("showSpecial"));
		oView.setHidden("filterArea", !oModel.getProperty("showFilter"));
		oView.setHidden("sortArea", !oModel.getProperty("showSort"));
		oView.setHidden("scriptArea", !oModel.getProperty("showScript"));
		oView.setHidden("resultArea", !oModel.getProperty("showResult"));
		oView.setHidden("variableArea", !oModel.getProperty("showVariable"));
		oView.setHidden("notesArea", !oModel.getProperty("showNotes"));
		oView.setHidden("waypointArea", !oModel.getProperty("showWaypoint"));
		oView.setHidden("logsArea", !oModel.getProperty("showLogs"));
		oView.setHidden("consoleArea", !oModel.getProperty("showConsole"));

		oView.setHidden("varOptionGroup", oModel.getProperty("varType") === "text");

		sMapType = oModel.getProperty("mapType");
		if (!document.getElementById("mapCanvas-" + sMapType)) {
			sMapType = "none";
			oModel.setProperty("mapType", sMapType);
		}
		oView.setHidden("mapCanvas-" + sMapType, !oModel.getProperty("showMap"));

		sExample = oModel.getProperty("example");
		oView.setSelectValue("exampleSelect", sExample);

		oView.setSelectValue("mapTypeSelect", sMapType);
		this.commonEventHandler.onMapTypeSelectChange();

		sUrl = oModel.getProperty("exampleDir") + "/" + oModel.getProperty("databaseIndex");
		if (sUrl) {
			Utils.loadScript(sUrl, onDatabaseIndexLoaded, onDatabaseIndexError);
		} else {
			Utils.console.error("DatabaseIndex not set");
		}
	},

	// see: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript?rq=1
	fnHereDoc: function (fn) {
		return String(fn).
			replace(/^[^/]+\/\*\S*/, "").
			replace(/\*\/[^/]+$/, "");
	},

	fnIsWaypoint: function (s) {
		return s.indexOf("$") === 0; // waypoints start with "$"
	},

	fnIsNotWaypoint: function (s) {
		return s.indexOf("$") !== 0; // variable (or something else) does not start with "$"
	},

	fnCreateNewExample: function (options) {
		var oItem = {
			key: "",
			position: null, // position and comment (category and title)
			script: "",
			src: null,
			loaded: false
		};

		if (options) {
			Utils.objectAssign(oItem, options);
		}
		return oItem;
	},

	fnAddIndex2: function (oVariables, sItemSrc) {
		var sPar, sKey, oPosition, oItem;

		for (sPar in oVariables) {
			if (oVariables.hasOwnProperty(sPar) && this.fnIsWaypoint(sPar)) {
				sKey = sPar.substring(1); // remove "$"
				oItem = this.model.getExample(sKey);
				oPosition = new LatLng().parse(String(oVariables[sPar]));
				if (oItem) {
					Utils.console.warn("fnAddIndex2: example already exists: " + sKey);
				}
				oItem = this.fnCreateNewExample({ // database, key, script, title, ...
					key: sKey,
					position: oPosition, // position and comment
					src: sItemSrc
				});
				this.model.setExample(oItem);
			}
		}
	},

	// Also called from file 0index.js
	fnAddIndex: function (sItemSrc, input) {
		var oVariables = {},
			sInput, oOutput, oError, iEndPos, oDatabase;

		sInput = (typeof input === "string") ? input.trim() : this.fnHereDoc(input).trim();
		oOutput = new ScriptParser().calculate(sInput, oVariables);
		if (oOutput.error) {
			oError = oOutput.error;
			iEndPos = oError.pos + ((oError.value !== undefined) ? String(oError.value).length : 0);
			oOutput.text = oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")";
			Utils.console.error("fnAddIndex: " + oOutput.text + " (src=" + sItemSrc + ")");
			oDatabase = this.model.getDatabase();
			if (oDatabase) {
				oDatabase.error = oOutput.text;
				oDatabase.script = sInput;
			}
		} else {
			this.fnAddIndex2(oVariables, sItemSrc);
		}
	},

	// Also called from files GCxxxxx.js
	fnAddItem: function (sKey, input) { // optional sKey
		var oVariables = {},
			sInput, oExample, sLine, oOutput, oError, iEndPos, sPar, oPosition;

		sInput = (typeof input === "string") ? Utils.stringTrimLeft(input) : this.fnHereDoc(input).trim();

		sLine = sInput.split("\n", 1)[0]; // only first line
		oOutput = new ScriptParser().calculate(sLine, oVariables); // parse only first line
		if (oOutput.error) {
			oError = oOutput.error;
			iEndPos = oError.pos + ((oError.value !== undefined) ? String(oError.value).length : 0);
			Utils.console.warn("fnAddItem: " + sKey + ": Cannot parse: " + oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")");
		} else {
			for (sPar in oVariables) {
				if (oVariables.hasOwnProperty(sPar) && this.fnIsWaypoint(sPar)) {
					sKey = sPar.substring(1); // remove "$"
					oPosition = new LatLng().parse(String(oVariables[sPar]));
					break; // only first waypoint
				}
			}
		}

		if (!sKey) {
			sKey = this.model.getProperty("example"); // no key specified, take selected example (does not work if multiple examples in one file)
			Utils.console.warn("fnAddItem: No key detected. Taking selected key: " + sKey);
		}
		oExample = this.model.getExample(sKey);
		if (!oExample) {
			oExample = this.fnCreateNewExample({
				key: sKey
			});
			sKey = oExample.key;
			this.model.setExample(oExample);
			Utils.console.log("fnAddItem: Creating new example: " + sKey);
		}
		oExample.key = sKey; // maybe changed
		oExample.script = sInput;
		oExample.position = oPosition || oExample.position || new LatLng();
		oExample.loaded = true;
		Utils.console.log("fnAddItem: " + sKey);
		return sKey;
	},

	fnSetMarkers: function (variables) {
		var aMarkerOptions = [],
			i = 0,
			sPar, oPosition, oSettings;

		for (sPar in variables) {
			if (variables.hasOwnProperty(sPar) && this.fnIsWaypoint(sPar)) {
				oPosition = new LatLng().parse(String(variables[sPar]));
				oSettings = {
					position: oPosition, // position and comment
					label: Utils.strZeroFormat(String(i), 2),
					title: sPar // + ((sComment) ? "<br>" + sComment : "")
				};
				aMarkerOptions.push(oSettings);
				i += 1;
			}
		}
		this.maFa.setMarkers(aMarkerOptions);
	},

	fnSetWaypointVarSelectOptions: function (sSelect, fnSel, fnTextFormat) {
		var oVariables = this.model.getAllVariables(),
			aItems = [],
			oItem, sKey, sValue;

		for (sKey in oVariables) {
			if (oVariables.hasOwnProperty(sKey) && (sKey !== "gcfOriginal") && fnSel(sKey)) {
				sValue = oVariables[sKey];
				oItem = {
					value: sKey,
					title: sKey + "=" + sValue
				};
				oItem.text = (fnTextFormat) ? fnTextFormat(sKey, sValue) : oItem.title;
				if (oVariables.gcfOriginal[sKey] !== undefined && oVariables.gcfOriginal[sKey] !== sValue) {
					oItem.text += " [c]";
					oItem.title += " [changed]";
				}
				aItems.push(oItem);
			}
		}
		this.view.setSelectOptions(sSelect, aItems);
	},

	fnSetVarSelectOptions: function () {
		var fnVariableTextFormat = function (parameter, value) {
			var iMaxLength = 64,
				sValue = String(value);

			sValue = (sValue.length > iMaxLength) ? sValue.substr(0, iMaxLength) + "..." : sValue;
			return parameter + "=" + sValue;
		};

		this.fnSetWaypointVarSelectOptions("varSelect", this.fnIsNotWaypoint, fnVariableTextFormat);
	},

	fnSetWaypointSelectOptions: function () {
		var fnWaypointTextFormat = function (parameter, value) {
			var sValue = String(value),
				iIndex;

			iIndex = sValue.indexOf("!"); // appended comment?
			if (iIndex >= 0) {
				sValue = sValue.substring(0, iIndex);
			}
			sValue = sValue.replace(/(N|S|E|W)\s*(\d+)°?\s*/g, "");

			parameter = parameter.substring(1, 4);
			return parameter + "=" + sValue;
		};

		this.fnSetWaypointVarSelectOptions("waypointSelect", this.fnIsWaypoint, fnWaypointTextFormat);
	},

	fnSetDatabaseSelect: function () {
		var sSelect = "databaseSelect",
			aItems = [],
			oDatabases = this.model.getAllDatabases(),
			sDatabase = this.model.getProperty("database"),
			sValue, oDb, oItem;

		for (sValue in oDatabases) {
			if (oDatabases.hasOwnProperty(sValue)) {
				oDb = oDatabases[sValue];
				oItem = {
					value: sValue,
					text: oDb.text,
					title: oDb.title
				};
				if (sValue === sDatabase) {
					oItem.selected = true;
				}
				aItems.push(oItem);
			}
		}
		this.view.setSelectOptions(sSelect, aItems);
	},

	fnSetFilterCategorySelectOptions: function () {
		var sSelect = "filterCategorySelect",
			oAllCategories = {},
			aItems = [],
			oFilterCategories, sValue, oItem;

		oAllCategories = this.model.fnGetAllExampleCategories();
		oFilterCategories = this.model.fnGetFilterCategories();
		if (oFilterCategories) { // check if selected categories are valid, otherwise remove them all from selected
			for (sValue in oFilterCategories) {
				if (oFilterCategories.hasOwnProperty(sValue)) {
					if (!oAllCategories[sValue]) {
						if (Utils.debug > 1) { // eslint-disable-line max-depth
							Utils.console.debug("fnSetFilterCategorySelectOptions: category selection removed, so all are selected");
						}
						oFilterCategories = null;
						this.model.setProperty("filterCategory", "");
						break;
					}
				}
			}
		}

		for (sValue in oAllCategories) {
			if (oAllCategories.hasOwnProperty(sValue)) {
				oItem = {
					value: sValue.substr(0, 30),
					title: sValue.substr(0, 160),
					selected: (!oFilterCategories || oFilterCategories[sValue])
				};
				oItem.text = oItem.value;
				if (sValue === "") {
					oItem.text = "<unset>";
					oItem.title = "Not set";
				}
				aItems.push(oItem);
			}
		}
		this.view.setSelectOptions(sSelect, aItems);
	},

	fnGetDirectionAngleDistance: function (oPosition1, oPosition2) {
		var fAngle = oPosition1.bearingTo(oPosition2),
			iAngle = Math.round(fAngle),
			fDistance = oPosition1.distanceTo(oPosition2),
			iDistance = Math.round(fDistance),
			sDirection = this.aDirections[Math.round(fAngle / (360 / this.aDirections.length)) % this.aDirections.length];

		return sDirection + ": " + iAngle + "° " + iDistance + "m";
	},

	fnSetExampleSelectOptions: function () {
		var sMaxTitleLength = 160,
			sMaxTextLength = 80, // 37 visible?
			sSelect = "exampleSelect",
			aItems = [],
			sExample = this.model.getProperty("example"),
			aFilteredExamples = this.model.getFilteredExamples(),
			sSort = this.model.getProperty("sort"),
			i, oExample, oItem, sLocationInput, oReferencePosition, iAllExamples, sDirectionAngleDistance,
			fnSorter = null,
			fnSortByNumber = function (a, b) {
				return a.fSort - b.fSort;
			},
			fnSortByString = function (a, b) {
				var x = a.sSort,
					y = b.sSort;

				if (x < y) {
					return -1;
				} else if (x > y) {
					return 1;
				}
				return 0;
			};

		switch (sSort) {
		case "id":
			fnSorter = fnSortByString;
			break;
		case "title":
			fnSorter = fnSortByString;
			break;
		case "distance":
			fnSorter = fnSortByNumber;
			sLocationInput = this.view.getInputValue("locationInput");
			oReferencePosition = new LatLng().parse(String(sLocationInput));
			break;
		case "": // none
			break;
		default:
			Utils.console.warn("fnSetExampleSelectOptions: Unknown sort: " + sSort);
			break;
		}

		for (i = 0; i < aFilteredExamples.length; i += 1) {
			oExample = aFilteredExamples[i];
			oItem = {
				value: oExample.key,
				title: (oExample.key + ": " + this.model.fnGetExampleTitle(oExample)).substr(0, sMaxTitleLength)
			};
			if (oExample.key === sExample) {
				oItem.selected = true;
			}
			switch (sSort) {
			case "id":
				oItem.sSort = oExample.key.toLowerCase();
				break;
			case "title":
				oItem.sSort = this.model.fnGetExampleTitle(oExample);
				break;
			case "distance":
				oItem.fSort = oReferencePosition.distanceTo(oExample.position);
				sDirectionAngleDistance = " (" + this.fnGetDirectionAngleDistance(oReferencePosition, oExample.position) + ")";
				oItem.title += sDirectionAngleDistance;
				break;
			default:
				break;
			}
			oItem.text = oItem.title.substr(0, sMaxTextLength);
			aItems.push(oItem);
		}

		if (fnSorter) {
			aItems = aItems.sort(fnSorter);
		}

		this.view.setSelectOptions(sSelect, aItems);

		iAllExamples = Object.keys(this.model.getAllExamples()).length;
		this.view.setLegendText("filterLegend", "Filter (" + aItems.length + "/" + iAllExamples + ")");
	},

	fnSetLogsAreaValue: function (sValue) {
		var sLog = "",
			iLength = 0,
			oInfo, aLogs, i, oLog;

		oInfo = this.fnExtractGcInfo(sValue);
		if (oInfo && oInfo.logs) {
			aLogs = oInfo.logs;
			iLength = aLogs.length;
			for (i = 0; i < iLength; i += 1) {
				oLog = aLogs[i];
				sLog += oLog.date + " (" + oLog.type + ") " + oLog.name + " (" + oLog.finds + ")\n" + oLog.text + "\n";
			}
		}
		this.view.setAreaValue("logsEditArea", sLog);
		this.view.setLegendText("logsLegend", "Logs (" + iLength + ")");
		this.view.setDisabled("removeLogsButton", !iLength);
	},

	fnCalculate2: function () {
		var sInput = this.view.getAreaValue("inputArea"),
			oVariables = this.model.getAllVariables(), // current variables
			oParseOptions, oOutput, oError, iEndPos, sOutput;

		oParseOptions = {
			ignoreFuncCase: this.model.getProperty("ignoreFuncCase"),
			ignoreVarCase: this.model.getProperty("ignoreVarCase")
		};
		oOutput = new ScriptParser(oParseOptions).calculate(sInput, oVariables);
		if (oOutput.error) {
			oError = oOutput.error;
			iEndPos = oError.pos + ((oError.value !== undefined) ? String(oError.value).length : 0);
			this.view.setAreaSelection("inputArea", oError.pos, iEndPos);
			sOutput = oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")";
		} else {
			sOutput = oOutput.text;
		}
		if (sOutput && sOutput.length > 0) {
			sOutput += "\n";
		}
		this.view.setAreaValue("outputArea", sOutput);
	},

	fnUpdateUndoRedoButtons: function () {
		this.view.setDisabled("undoButton", !this.inputStack.canUndoKeepOne());
		this.view.setDisabled("redoButton", !this.inputStack.canRedo());
	},

	fnInitUndoRedoButtons: function () {
		this.inputStack.init();
		this.fnUpdateUndoRedoButtons();
	},

	fnPutChangedInputOnStack: function () {
		var sInput = this.view.getAreaValue("inputArea"),
			sStackInput = this.inputStack.getInput();

		if (sStackInput !== sInput) {
			this.inputStack.save(sInput);
			this.fnUpdateUndoRedoButtons();
		}
	},

	fnInputAreaNav: function (sPar) {
		var sInput, oParser, aTokens, aParseTree, i, iEndPos;

		sInput = this.view.getAreaValue("inputArea");
		try {
			oParser = new ScriptParser();
			aTokens = oParser.lex(sInput);
			aParseTree = oParser.parse(aTokens);
			for (i = 0; i < aParseTree.length; i += 1) {
				if (aParseTree[i].name === sPar) {
					iEndPos = aParseTree[i].pos + sPar.length;
					this.view.setAreaSelection("inputArea", aParseTree[i].pos, iEndPos);
					break;
				}
			}
		} catch (e) {
			Utils.console.warn("fnInputAreaNav: " + sPar + ": " + e);
		}
	},


	// based on: http://blogs.sitepointstatic.com/examples/tech/xml2json/index.html, https://codepen.io/KurtWM/pen/JnLak
	xml2json: function (node) {
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
						addItem(cn.nodeName, this.xml2json(cn)); // sub-object
					}
				}
			}
		}
		return data;
	},

	fnReplaceUmlauts: function (str) {
		var umlautMap = {
				\u00dc: "UE",
				\u00c4: "AE",
				\u00d6: "OE",
				\u00fc: "ue",
				\u00e4: "ae",
				\u00f6: "oe",
				\u00df: "ss"
			},
			sKeys, oReg;

		sKeys = Object.keys(umlautMap).join("");
		oReg = new RegExp("[" + sKeys + "]", "g");

		return str.replace(oReg, function (a) {
			return umlautMap[a];
		});
	},

	processDescription: function (sDescription) {
		var oProcessor, mInfo;

		sDescription = sDescription.replace(/<[^>]+>/g, ""); // stripe html
		// sDescription = he.decode(sDescription); // TODO: decodedStripedHtml, e.g. https://github.com/mathiasbynens/he
		oProcessor = new Preprocessor({
			scriptParser: new ScriptParser()
		});
		mInfo = oProcessor.processText(sDescription);
		return mInfo;
	},

	parseWpt: function (wpt, mInfo) {
		var sWaypointFormat = this.model.getProperty("waypointFormat"),
			aWpt, iWp, oWpt, oGrCache, sName, sTitle, sCmt, mInfoDescr;

		aWpt = (wpt.length) ? wpt : [wpt]; // array of wp or single wp
		for (iWp = 0; iWp < aWpt.length; iWp += 1) {
			oWpt = aWpt[iWp];

			sName = oWpt.name;
			sName = this.fnReplaceUmlauts(sName);
			sName = sName.replace(/[^A-Za-z0-9]/g, ""); // keep only "normal" characters (needed for e.g. poi-service.de)

			// First try name from groundspeak extension, then try description and finally take the wp name
			oGrCache = oWpt["groundspeak:cache"];
			if (oGrCache && oGrCache["groundspeak:name"]) {
				mInfo.id = oWpt.name;
				mInfo.title = oGrCache["groundspeak:name"];
				sTitle = ""; // suppress wp as additional wp
				mInfo.archived = String(oGrCache.archived).toLowerCase() === "true";
				mInfo.available = String(oGrCache.available).toLowerCase() === "true";
				mInfo.country = oGrCache["groundspeak:country"];
				mInfo.difficulty = parseFloat(oGrCache["groundspeak:difficulty"]);
				mInfo.owner = oGrCache["groundspeak:owner"];
				mInfo.size = oGrCache["groundspeak:container"]; // differs
				mInfo.state = oGrCache["groundspeak:state"];
				mInfo.terrain = parseFloat(oGrCache["groundspeak:terrain"]);
				mInfo.type = oGrCache["groundspeak:type"];
				// hint...
				if (!mInfo.script) { // first entry
					mInfoDescr = this.processDescription(oGrCache["groundspeak:long_description"]);
					mInfo.script = mInfoDescr.script;
					if (!mInfo.waypoint) {
						mInfo.waypoint = new LatLng(oWpt.lat, oWpt.lon).toFormattedString(sWaypointFormat); //TTT
					}
					mInfo.encodedHints = oGrCache["groundspeak:encoded_hints"] || ""; //TTT
					// TODO: logs
				}
			} else if (oWpt.desc) {
				sTitle = oWpt.desc;
			} else {
				sTitle = oWpt.name;
			}

			if (sTitle) { // (additional) wp
				sTitle = sTitle.replace(/"/g, '\\"'); // escape apostrophes
				sCmt = oWpt.cmt; // used for e.g. poi-service.de
				if (sCmt) {
					if (typeof sCmt !== "string") { // could be empty object
						sCmt = "";
					}
					sCmt = sCmt.replace(/\n/g, " "); // replace newlines by spaces
				}
				mInfo.script += "$" + sName + '="' + new LatLng(oWpt.lat, oWpt.lon).toFormattedString(sWaypointFormat) + "!!" + sTitle + '"' + ((sCmt) ? " # " + sCmt : "") + "\n";
				if (Utils.stringStartsWith(sName, "GC") || Utils.stringStartsWith(sName, "OC")) {
					mInfo.script += "#https://coord.info/" + oWpt.name + "\n";
				}
			}
		}
	},

	parseTrk: function (oTrk, mInfo) {
		var sWaypointFormat = this.model.getProperty("waypointFormat"),
			aWpt, iWp, oWpt, sName;

		mInfo.script += "#" + oTrk.name + "\n";
		if (oTrk.trkseg && oTrk.trkseg.trkpt && oTrk.trkseg.trkpt.length) { // track export from e.g. komoot.de
			aWpt = oTrk.trkseg.trkpt;
			for (iWp = 0; iWp < aWpt.length; iWp += 1) {
				oWpt = aWpt[iWp];
				sName = "W" + iWp;
				mInfo.script += "$" + sName + '="' + new LatLng(oWpt.lat, oWpt.lon).toFormattedString(sWaypointFormat) + '" # ' + oWpt.ele + ", " + oWpt.time + "\n";
			}
		}
	},

	fnParseXml: function (sXml) {
		var oParser = new window.DOMParser(),
			oXml = oParser.parseFromString(sXml, "text/xml"),
			mInfo = {},
			oJson, oGpx;

		oJson = this.xml2json(oXml);
		oGpx = oJson.gpx;
		if (oGpx) {
			mInfo.script = "";
			if (oGpx.wpt) { // waypoint export from e.g. geocaching.com, CacheWolf
				this.parseWpt(oGpx.wpt, mInfo);
			}
			if (oGpx.trk) {
				this.parseTrk(oGpx.trk, mInfo);
			}
		}
		return mInfo;
	},

	fnExtractGcInfo: function (sInput) {
		var iPos, sJson, oInfo;

		iPos = sInput.indexOf(this.sJsonMarker);
		if (iPos >= 0) {
			sJson = sInput.substring(iPos + this.sJsonMarker.length);
			iPos = sJson.indexOf("\n"); // EOL?
			if (iPos >= 0) {
				sJson = sJson.substring(0, iPos);
			}
			try {
				oInfo = JSON.parse(sJson);
			} catch (e) {
				Utils.console.error(e);
			}
		}
		return oInfo;
	},

	fnInsertGcInfo: function (sInput, mInfo) {
		var iPos;

		iPos = sInput.indexOf(this.sJsonMarker);
		if (iPos >= 0) {
			sInput = sInput.substring(0, iPos); // remove gcInfo
		}

		if (mInfo) {
			sInput += this.sJsonMarker + JSON.stringify(mInfo) + "\n";
		}
		return sInput;
	},

	fnDoPreprocess: function () {
		var sInput = this.view.getAreaValue("inputArea"),
			sOutput = "",
			oProcessor, mInfo, aCategory, sTitle;

		if (sInput.substr(0, 6) === "<?xml ") {
			mInfo = this.fnParseXml(sInput);
		} else {
			oProcessor = new Preprocessor({
				scriptParser: new ScriptParser()
			});
			mInfo = oProcessor.processText(sInput);
		}
		sOutput = mInfo.script;
		mInfo.script = "";
		if (sOutput !== "") {
			if (mInfo.id) {
				aCategory = [];
				if (mInfo.log) {
					aCategory.push(mInfo.log); // e.g. "found"
				}
				if (mInfo.archived) {
					aCategory.push("archived");
				}
				sTitle = mInfo.title;
				sTitle = sTitle.replace(/"/g, '\\"'); // escape apostrophes
				sOutput = "$" + mInfo.id + '="' + (mInfo.waypoint || "") + "!" + aCategory.join(" ") + "!" + sTitle + '"\n'
					+ "#https://coord.info/" + mInfo.id + "\n"
					+ sOutput
					+ "#\n";

				sOutput = this.fnInsertGcInfo(sOutput, mInfo);
			}
		}

		this.fnPutChangedInputOnStack();
		this.view.setAreaValue("inputArea", sOutput);
		this.fnSetLogsAreaValue(sOutput);
		this.commonEventHandler.onExecuteButtonClick();
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
	}
};

// end
