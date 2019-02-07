// Controller.js - Controller
//
/* globals CommonEventHandler, InputStack, LatLng, MarkerFactory, Preprocessor, ScriptParser, Utils */

"use strict";

function Controller(oModel, oView) {
	this.init(oModel, oView);
}

Controller.prototype = {
	init: function (oModel, oView) {
		var that = this,
			sFilterId, sFilterTitle, sVariableType, sWaypointFormat, sMapType, sExample, sUrl,
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

		this.commonEventHandler = new CommonEventHandler(this.model, this.view, this);

		this.view.setHidden("consoleLogBox", !oModel.getProperty("showConsole"));

		this.inputStack = new InputStack();

		this.maFa = new MarkerFactory();

		sFilterId = oModel.getProperty("filterId");
		if (sFilterId) {
			this.view.setInputValue("filterIdInput", sFilterId);
		}

		sFilterTitle = oModel.getProperty("filterTitle");
		if (sFilterTitle) {
			this.view.setInputValue("filterTitleInput", sFilterTitle);
		}

		sVariableType = oModel.getProperty("variableType");
		if (sVariableType) {
			this.view.setSelectValue("varViewSelect", sVariableType);
		}

		sWaypointFormat = oModel.getProperty("waypointFormat");
		if (sWaypointFormat) {
			this.view.setSelectValue("waypointViewSelect", sWaypointFormat);
		}

		this.view.setHidden("filterArea", !oModel.getProperty("showFilter"));
		this.view.setHidden("inputArea", !oModel.getProperty("showInput"));
		this.view.setHidden("outputArea", !oModel.getProperty("showOutput"));
		this.view.setHidden("varArea", !oModel.getProperty("showVariable"));
		this.view.setHidden("notesArea", !oModel.getProperty("showNotes"));
		this.view.setHidden("waypointArea", !oModel.getProperty("showWaypoint"));
		this.view.setHidden("logsArea", !oModel.getProperty("showLogs"));
		this.view.setHidden("consoleLogArea", !oModel.getProperty("showConsole"));

		sMapType = oModel.getProperty("mapType");
		if (!document.getElementById("mapCanvas-" + sMapType)) {
			sMapType = "none";
			oModel.setProperty("mapType", sMapType);
		}
		this.view.setHidden("mapCanvas-" + sMapType, !oModel.getProperty("showMap"));

		sExample = oModel.getProperty("example");
		if (sExample) {
			this.view.setSelectValue("exampleSelect", sExample);
		}

		if (sMapType) {
			this.view.setSelectValue("mapTypeSelect", sMapType);
		}
		this.commonEventHandler.onMapTypeSelectChange();

		sUrl = this.model.getProperty("exampleDir") + "/" + this.model.getProperty("databaseIndex");
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
		var oVariables = this.model.getVariables(),
			aItems = [],
			oItem, sValue;

		for (sValue in oVariables) {
			if (oVariables.hasOwnProperty(sValue) && (sValue !== "gcfOriginal") && fnSel(sValue)) {
				oItem = {
					value: sValue,
					title: sValue + "=" + oVariables[sValue]
				};
				oItem.text = (fnTextFormat) ? fnTextFormat(sValue, oVariables[sValue]) : oItem.title;
				if (oVariables.gcfOriginal[sValue] !== undefined && oVariables.gcfOriginal[sValue] !== oVariables[sValue]) {
					oItem.text += " [c]";
					oItem.title += " [changed]";
				}
				aItems.push(oItem);
			}
		}
		this.view.setSelectOptions(sSelect, aItems);
	},

	fnSetVarSelectOptions: function () {
		var that = this;

		this.fnSetWaypointVarSelectOptions("varSelect",
			function (s) { return !that.fnIsWaypoint(s); }
		);
	},

	fnSetWaypointSelectOptions: function () {
		var fnTextFormat = function (parameter, value) {
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

		this.fnSetWaypointVarSelectOptions("waypointSelect", this.fnIsWaypoint, fnTextFormat);
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

	fnSetExampleSelectOptions: function () {
		var sSelect = "exampleSelect",
			aItems = [],
			sExample = this.model.getProperty("example"),
			aFilteredExamples = this.model.getFilteredExamples(),
			i, oExample, oItem;

		for (i = 0; i < aFilteredExamples.length; i += 1) {
			oExample = aFilteredExamples[i];
			oItem = {
				value: oExample.key,
				title: (oExample.key + ": " + this.model.fnGetExampleTitle(oExample)).substr(0, 160)
			};
			oItem.text = oItem.title.substr(0, 30);
			if (oExample.key === sExample) {
				oItem.selected = true;
			}
			aItems.push(oItem);
		}
		this.view.setSelectOptions(sSelect, aItems);
		this.view.setSpanText("filterSelectedSpan", aItems.length);
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
		this.view.setAreaValue("logsArea", sLog);
		this.view.setLegendText("logsLegend", "Logs (" + iLength + ")");
		this.view.setDisabled("removeLogsButton", !iLength);
	},

	fnCalculate2: function () {
		var sInput = this.view.getAreaValue("inputArea"),
			oVariables = this.model.getVariables(), // current variables
			oOutput, oError, iEndPos;

		oOutput = new ScriptParser().calculate(sInput, oVariables);
		if (oOutput.error) {
			oError = oOutput.error;
			iEndPos = oError.pos + ((oError.value !== undefined) ? String(oError.value).length : 0);
			this.view.setAreaSelection("inputArea", oError.pos, iEndPos);
			oOutput.text = oError.message + ": '" + oError.value + "' (pos " + oError.pos + "-" + iEndPos + ")";
		}
		this.view.setAreaValue("outputArea", oOutput.text);
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

	fnParseXml: function (sXml) {
		var oParser = new window.DOMParser(),
			oXml = oParser.parseFromString(sXml, "text/xml"),
			mInfo = {},
			sWaypointFormat = this.model.getProperty("waypointFormat"),
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
				mInfo.script += "$W" + iWp + '="' + new LatLng(oWpt.lat, oWpt.lon).toFormattedString(sWaypointFormat) + '" # ' + oWpt.name + ", " + oWpt.cmt + "\n";
			}
		} else if (oJson.gpx && oJson.gpx.trk && oJson.gpx.trk.trkseg && oJson.gpx.trk.trkseg.trkpt && oJson.gpx.trk.trkseg.trkpt.length) {
			aWpt = oJson.gpx.trk.trkseg.trkpt;
			mInfo.script = "";
			for (iWp = 0; iWp < aWpt.length; iWp += 1) {
				oWpt = aWpt[iWp];
				mInfo.script += "$W" + iWp + '="' + new LatLng(oWpt.lat, oWpt.lon).toFormattedString(sWaypointFormat) + '" # ' + oWpt.ele + ", " + oWpt.time + "\n";
			}
		}
		return mInfo;
	},

	fnExtractGcInfo: function (sInput) {
		var iPos, sJson, oInfo;

		iPos = sInput.indexOf(this.sJsonMarker);
		if (iPos >= 0) {
			sJson = sInput.substring(iPos + this.sJsonMarker.length);
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
			oProcessor, mInfo, aCategory;

		oProcessor = new Preprocessor({
			scriptParser: new ScriptParser()
		});
		if (sInput.substr(0, 6) === "<?xml ") {
			mInfo = this.fnParseXml(sInput);
		} else {
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
				sOutput = "$" + mInfo.id + '="' + (mInfo.waypoint || "") + "!" + aCategory.join(" ") + "!" + mInfo.title + '"\n'
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
