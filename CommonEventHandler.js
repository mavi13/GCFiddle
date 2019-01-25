// CommonEventHandler.js - CommonEventHandler
//
/* globals */ // LatLng, MapProxy, Utils

"use strict";

var LatLng, MapProxy, Utils;

if (typeof require !== "undefined") {
	LatLng = require("./LatLng.js"); // eslint-disable-line global-require
	MapProxy = require("./MapProxy.js"); // eslint-disable-line global-require
	Utils = require("./Utils.js"); // eslint-disable-line global-require
}

function CommonEventHandler(oModel, oView, oController) {
	this.init(oModel, oView, oController);
}

CommonEventHandler.prototype = {
	init: function (oModel, oView, oController) {
		this.model = oModel;
		this.view = oView;
		this.controller = oController;

		this.mapProxy = {};
		this.attachEventHandler();
	},

	fnCommonEventHandler: function (event) {
		var oTarget = event.target,
			sId = (oTarget) ? oTarget.getAttribute("id") : oTarget,
			sType, sHandler;

		if (sId) {
			sType = event.type; // click or change
			sHandler = "on" + Utils.stringCapitalize(sId) + Utils.stringCapitalize(sType);
			if (Utils.debug) {
				Utils.console.debug("DEBUG: fnCommonEventHandler: sHandler=" + sHandler);
			}
			if (sHandler in this) {
				this[sHandler](event);
			} else if (!Utils.stringEndsWith(sHandler, "SelectClick") && !Utils.stringEndsWith(sHandler, "InputClick")) { // do not print all messages
				Utils.console.log("Event handler not found: " + sHandler);
			}
		} else if (Utils.debug) {
			Utils.console.debug("DEBUG: Event handler for " + event.type + " unknown target " + oTarget);
		}
	},

	attachEventHandler: function () {
		this.view.attachEventHandler(this.fnCommonEventHandler.bind(this));
		return this;
	},

	detachEventHandler: function () {
		this.view.detachEventHandler(this.fnCommonEventHandler.bind(this));
		return this;
	},

	onVarSelectChange: function () {
		var sPar = this.view.getSelectValue("varSelect"),
			variables = this.model.getVariables(),
			sType = this.model.getProperty("variableType"),
			sValue, iSelectLength;

		if (!sPar) {
			sPar = "";
			sValue = sPar;
		} else {
			sValue = variables[sPar];
		}
		this.view.setLabelTextTitle("varLabel", sPar, sPar);

		if (sType !== "text") {
			if (!(/^[\d]+$/).test(sValue)) { // currently only digits (without -,.) are numbers
				if (Utils.debug) {
					Utils.console.debug("DEBUG: onVarSelectChange: Using type=text for non-numerical variable " + sValue);
				}
				sType = "text";
			}
		}
		this.view.setInputType("varInput", sType).setInputValueTitle("varInput", sValue, sValue);

		this.view.setSelectTitleFromSelectedOption("varSelect");
		iSelectLength = this.view.getSelectLength("varSelect");
		this.view.setLegendText("varLegend", "Variables (" + iSelectLength + ")");
	},

	onVarViewSelectChange: function () {
		var sVariableType = this.view.getSelectValue("varViewSelect");

		this.model.setProperty("variableType", sVariableType);
		this.view.setSelectTitleFromSelectedOption("varViewSelect");
		this.onVarSelectChange();
	},

	onWaypointViewSelectChange: function () {
		var sWaypointFormat = this.view.getSelectValue("waypointViewSelect");

		this.model.setProperty("waypointFormat", sWaypointFormat);
		this.view.setSelectTitleFromSelectedOption("waypointViewSelect");
		this.onWaypointSelectChange(null); // title
	},

	fnCenterMapOnWaypoint: function (sTitle2Find) {
		var aMarkers = this.controller.maFa.getMarkers(),
			i, oMarker;

		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			if (oMarker && sTitle2Find === oMarker.title) {
				this.controller.maFa.setCenter(oMarker);
				break;
			}
		}
	},

	onWaypointSelectChange: function (event) {
		var sPar = this.view.getSelectValue("waypointSelect"),
			oVariables = this.model.getVariables(),
			sWaypointFormat = this.model.getProperty("waypointFormat"),
			sValue,	oPos, sError, sTitle, iSelectLength;

		if (!sPar) {
			sPar = "";
			sValue = sPar;
		} else {
			sValue = oVariables[sPar];
		}

		this.view.setLabelTextTitle("waypointLabel", sPar, sPar);

		oPos = new LatLng().parse(sValue);
		sError = oPos.getError();
		sTitle = sError || oPos.toFormattedString(sWaypointFormat);
		this.view.setInputValueTitle("waypointInput", sValue, sTitle).setInputInvalid("waypointInput", Boolean(sError));

		this.view.setSelectTitleFromSelectedOption("waypointSelect");
		iSelectLength = this.view.getSelectLength("waypointSelect");
		this.view.setLegendText("waypointLegend", "Waypoints (" + iSelectLength + ")");

		if (event) { // only if user selected, center to selected waypoint
			this.fnCenterMapOnWaypoint(sPar);
		}
	},

	onVarInputChange: function () {
		var sValue = this.view.getInputValue("varInput"),
			sPar = this.view.getLabelText("varLabel"),
			oVariables = this.model.getVariables(),
			nValueAsNumber;

		if (sPar) {
			nValueAsNumber = parseFloat(sValue);
			if (oVariables.gcfOriginal[sPar] === undefined) {
				oVariables.gcfOriginal[sPar] = oVariables[sPar];
			}
			oVariables[sPar] = isNaN(nValueAsNumber) ? sValue : nValueAsNumber;
			this.controller.fnCalculate2();
			this.controller.fnSetVarSelectOptions();
			this.onVarSelectChange(); // title change?
			this.controller.fnSetWaypointSelectOptions();
			this.controller.fnSetMarkers(oVariables);
			this.onWaypointSelectChange(null); // do not center on wp
		}
	},

	onWaypointInputChange: function () {
		var sValue = this.view.getInputValue("waypointInput"),
			sPar = this.view.getLabelText("waypointLabel"),
			oVariables = this.model.getVariables(),
			nValueAsNumber;

		if (sPar) {
			nValueAsNumber = parseFloat(sValue);
			if (oVariables.gcfOriginal[sPar] === undefined) {
				oVariables.gcfOriginal[sPar] = oVariables[sPar];
			}
			oVariables[sPar] = isNaN(nValueAsNumber) ? sValue : nValueAsNumber;
			this.controller.fnCalculate2();
			this.controller.fnSetVarSelectOptions();
			this.controller.fnSetWaypointSelectOptions();
			this.controller.fnSetMarkers(oVariables);
			this.onWaypointSelectChange(null); // do not center on wp
		}
	},

	onExecuteButtonClick: function () {
		var iSelectLength;

		this.controller.fnPutChangedInputOnStack();

		this.model.initVariables();
		this.controller.fnCalculate2();
		this.controller.maFa.deleteMarkers();
		this.controller.fnSetMarkers(this.model.getVariables());
		this.controller.fnSetVarSelectOptions();
		this.onVarSelectChange();
		this.controller.fnSetWaypointSelectOptions();

		iSelectLength = this.view.getSelectLength("waypointSelect");
		if (iSelectLength) {
			this.view.setSelectedIndex("waypointSelect", iSelectLength - 1); // select last waypoint
		}

		this.onWaypointSelectChange(null); // do not center on wp
	},

	onUndoButtonClick: function () {
		this.controller.fnSetInputAreaValue(this.controller.inputStack.undo());
		this.controller.fnUpdateUndoRedoButtons();
		this.view.setAreaValue("outputArea", "");
	},

	onRedoButtonClick: function () {
		this.controller.fnSetInputAreaValue(this.controller.inputStack.redo());
		this.controller.fnUpdateUndoRedoButtons();
		this.view.setAreaValue("outputArea", "");
	},

	onPreprocessButtonClick: function () {
		var that = this,
			sUrl = "Preprocessor.js";

		if (typeof Preprocessor === "undefined") { // load module on demand
			Utils.loadScript(sUrl, function () {
				Utils.console.log(sUrl + " loaded");
				that.controller.fnDoPreprocess();
			});
		} else {
			this.controller.fnDoPreprocess();
		}
	},

	onExampleSelectChange: function () {
		var that = this,
			sDatabase = this.model.getProperty("database"),
			sExample = this.view.getSelectValue("exampleSelect"),
			sName, oExample, sSrc, oDatabase, sPath,

			fnExampleLoaded = function (sFullUrl, sExample2, bSuppressLog) {
				var sDatabase2 = that.model.getProperty("database"), // still the same after loading?
					oExamples2 = that.model.getAllExamples(sDatabase2),
					sName2 = sDatabase2 + "/" + sExample2 + ".js";

				that.model.setProperty("example", sExample2);
				if (!bSuppressLog) {
					Utils.console.log("Example " + sName2 + " loaded");
				}

				// TODO: example without id loaded (Do we still need this?)
				if (oExamples2[sExample2] === undefined) {
					Utils.console.warn("Example " + sName2 + ": Not in index? What to do next?");
				}
				/*
				if (oExamples2[sExample2] === undefined) { // TODO: example without id loaded (Do we still need this?)
					Utils.console.warn("Example " + sName2 + ": Wrong format! Must start with #<id>: <title>");
					sUnknownExample = that.controller.emptyExample.unknown.key;
					if (oExamples2[sUnknownExample]) {
						oExamples2[sExample2] = oExamples2[sUnknownExample];
						delete oExamples2[sUnknownExample];
					} else {
						Utils.console.error("No example 'unknown' found");
						oExamples2[sExample2] = that.controller.fnParseExample("", "", sExample2);
					}
				}
				*/
				that.controller.fnSetInputAreaValue(oExamples2[sExample2].script);
				that.controller.fnInitUndoRedoButtons();
				that.onExecuteButtonClick();
			};

		this.view.setSelectTitleFromSelectedOption("exampleSelect");
		oExample = this.model.getExample(sExample);
		if (oExample && oExample.loaded) {
			fnExampleLoaded("", sExample, true);
		} else if (sExample) {
			this.controller.fnSetInputAreaValue("#loading " + sExample + "...");
			this.view.setAreaValue("outputArea", "waiting...");

			sSrc = oExample.src;

			//TTT
			sPath = "";
			oDatabase = this.model.getDatabase(sDatabase);
			if (oDatabase.src) {
				sPath = oDatabase.src.split("/").slice(0, -1).join("/");
			}

			if (Utils.stringEndsWith(sSrc, ".js")) {
				sName = this.model.getProperty("exampleDir") + "/" + sPath + "/" + sSrc;
			} else {
				sName = this.model.getProperty("exampleDir") + "/" + sPath + "/" + sSrc + "/" + sExample + ".js";
			}

			this.controller.pendingScripts.push({
				database: sDatabase,
				example: sExample,
				url: sName
			});
			Utils.loadScript(sName, fnExampleLoaded, sExample);
		} else {
			this.controller.fnSetInputAreaValue("");
			this.model.setProperty("example", "");
			this.controller.fnInitUndoRedoButtons();
			this.onExecuteButtonClick();
		}
	},

	onDatabaseSelectChange: function () {
		var that = this,
			sDatabase = this.view.getSelectValue("databaseSelect"),
			sName, bDisabled, oDatabase,

			fnDatabaseLoaded = function (sFullUrl, sDatabase2) {
				if (sDatabase !== sDatabase2) {
					Utils.console.warn("fnDatabaseLoaded: wrong database: " + sDatabase + ", " + sDatabase2);
				}

				oDatabase.loaded = true;
				Utils.console.log("database/database loaded: " + sName);
				that.controller.fnSetExampleList();
				that.onExampleSelectChange();
			},
			fnLoadDatabaseLocalStorage = function () {
				var	oStorage = Utils.localStorage,
					i, sKey, sItem;

				for (i = 0; i < oStorage.length; i += 1) {
					sKey = oStorage.key(i);
					sItem = oStorage.getItem(sKey);
					that.controller.fnAddItem(sKey, sItem);
				}
				oDatabase.loaded = true;
				Utils.console.log("database loaded: " + sDatabase);
				that.controller.fnSetExampleList();
				that.onExampleSelectChange();
			};

		this.model.setProperty("database", sDatabase);
		this.view.setSelectTitleFromSelectedOption("databaseSelect");
		oDatabase = this.model.getDatabase(sDatabase);
		if (!oDatabase) {
			Utils.console.error("onDatabaseSelectChange: database not available: " + sDatabase);
			return;
		}

		if (oDatabase.loaded) {
			this.controller.fnSetExampleList();
			this.onExampleSelectChange();
		} else {
			this.view.setAreaValue("inputArea", "#loading index " + sDatabase + "...");
			if (sDatabase === "saved") {
				fnLoadDatabaseLocalStorage(sDatabase);
			} else {
				sName = this.model.getProperty("exampleDir") + "/" + oDatabase.src;
				this.controller.pendingScripts.push({
					database: sDatabase,
					example: oDatabase.src,
					url: sName
				});
				Utils.loadScript(sName, fnDatabaseLoaded, sDatabase);
			}
		}
		bDisabled = (sDatabase !== "saved") || !Object.keys(this.model.getAllExamples()).length;
		this.view.setDisabled("deleteButton", bDisabled);
	},


	onInputLegendClick: function () {
		var bShowInput = !this.view.toogleHidden("inputArea").getHidden("inputArea");

		this.model.setProperty("showInput", bShowInput);
	},

	onOutputLegendClick: function () {
		var bShowOutput = !this.view.toogleHidden("outputArea").getHidden("outputArea");

		this.model.setProperty("showOutput", bShowOutput);
	},

	onVarLegendClick: function () {
		var bShowVariable = !this.view.toogleHidden("varArea").getHidden("varArea");

		this.model.setProperty("showVariable", bShowVariable);
	},

	onNotesLegendClick: function () {
		var bShowNotes = !this.view.toogleHidden("notesArea").getHidden("notesArea");

		this.model.setProperty("showNotes", bShowNotes);
	},

	onWaypointLegendClick: function () {
		var bShowWaypoint = !this.view.toogleHidden("waypointArea").getHidden("waypointArea");

		this.model.setProperty("showWaypoint", bShowWaypoint);
	},

	onMapLegendClick: function () {
		var sMapType = this.model.getProperty("mapType"),
			sId = "mapCanvas-" + sMapType,
			bShowMap;

		bShowMap = !this.view.toogleHidden(sId).getHidden(sId);
		this.model.setProperty("showMap", bShowMap);
		if (bShowMap) {
			this.controller.maFa.resize();
			this.controller.maFa.fitBounds();
		}
	},

	onLogsLegendClick: function () {
		var bShowLogs = !this.view.toogleHidden("logsArea").getHidden("logsArea");

		this.model.setProperty("showLogs", bShowLogs);
	},

	onConsoleLogLegendClick: function () {
		var bShowConsole = !this.view.toogleHidden("consoleLogArea").getHidden("consoleLogArea");

		this.model.setProperty("showConsole", bShowConsole);
	},

	onFitBoundsButtonClick: function () {
		this.controller.maFa.fitBounds();
	},

	onLocationButtonClick: function () {
		var that = this;

		function showPosition(position) {
			var sWaypointFormat = that.model.getProperty("waypointFormat"),
				iLastMarker = that.controller.maFa.getMarkers().length,
				sLabel = Utils.strZeroFormat(String(iLastMarker), 2),
				oMarker = {
					position: new LatLng(position.coords.latitude, position.coords.longitude),
					label: sLabel,
					title: "W" + sLabel
				};

			Utils.console.log("Location: " + oMarker.position.toFormattedString(sWaypointFormat));
			that.controller.maFa.addMarkers([oMarker]);
			// already done in addMarkers; that.onFitBoundsButtonClick();
		}

		function showError(error) {
			switch (error.code) {
			case error.PERMISSION_DENIED:
				Utils.console.warn("User denied the request for Geolocation.");
				break;
			case error.POSITION_UNAVAILABLE:
				Utils.console.warn("Location information is unavailable.");
				break;
			case error.TIMEOUT:
				Utils.console.warn("The request to get user location timed out.");
				break;
			case error.UNKNOWN_ERROR:
				Utils.console.warn("An unknown error occurred.");
				break;
			default:
				Utils.console.warn("An error occurred.");
				break;
			}
		}

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(showPosition, showError);
		} else {
			Utils.console.warn("Geolocation is not supported by this browser.");
		}
	},

	onInputAreaClick: function () {
		var oSelection = this.view.getAreaSelection("inputArea"); // also in event.target

		if (Utils.debug) {
			Utils.console.debug("DEBUG: onInputAreaClick: selectionStart=" + oSelection.selectionStart + " selectionEnd=" + oSelection.selectionEnd);
		}
		// nothing to do
	},

	onOutputAreaClick: function () {
		var variables = this.model.getVariables(),
			sPar = "",
			oSelection,	sOutput, iSelStart,	iLineStart,	iLineEnd, iEqual;

		oSelection = this.view.getAreaSelection("outputArea"); // also in event.target
		sOutput = oSelection.value;
		iSelStart = oSelection.selectionStart;

		if (Utils.debug) {
			Utils.console.debug("DEBUG: onOutputAreaClick: selectionStart=" + oSelection.selectionStart + " selectionEnd=" + oSelection.selectionEnd);
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
			if (Utils.debug) {
				Utils.console.debug("DEBUG: onOutputAreaClick: line='" + sOutput + "' var=" + sPar);
			}
			if (sPar && variables[sPar] !== undefined) {
				if (this.controller.fnIsWaypoint(sPar)) {
					if (sPar !== this.view.getSelectValue("waypointSelect")) {
						this.view.setSelectValue("waypointSelect", sPar);
						this.onWaypointSelectChange({}); // center on wp
					}
				} else if (sPar !== this.view.getSelectValue("varSelect")) {
					this.view.setSelectValue("varSelect", sPar);
					this.onVarSelectChange();
				}
			}
		}
	},

	onMapTypeSelectChange: function () {
		var	that = this,
			sMapType = this.view.getSelectValue("mapTypeSelect"),
			sMapTypeId = "mapCanvas-" + sMapType,
			oMapProxyUnused, // currently not needed

			fnGetInfoWindowContent = function (marker, previousMarker) {
				var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
					sWaypointFormat = that.model.getProperty("waypointFormat"),
					sContent, oPosition0, oPosition, fAngle, iAngle, fDistance, iDistance, sDirection;

				oPosition = marker.getPosition();
				sContent = marker.getTitle() + "=" + oPosition.toFormattedString(sWaypointFormat);

				if (previousMarker) {
					oPosition0 = previousMarker.getPosition();
					fAngle = oPosition0.bearingTo(oPosition);
					iAngle = Math.round(fAngle);
					fDistance = oPosition0.distanceTo(oPosition);
					iDistance = Math.round(fDistance);
					sDirection = aDirections[Math.round(fAngle / (360 / aDirections.length)) % aDirections.length];
					sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
				}
				return sContent;
			},

			fnMapLoaded = function (map) {
				var sMapType2 = map.options.mapType,
					oMapProxy = that.mapProxy[sMapType2];

				oMapProxy.setMap(map);
				if (that.controller.maFa) {
					that.controller.maFa.initMap(oMapProxy);
				}
			},
			fnMapProxyLoaded = function (mapProxy) {
				var sMapType2 = mapProxy.options.mapType,
					sMapTypeId2 = "mapCanvas-" + sMapType2,
					mConfig = that.model.getAllProperties(),
					mMapOptions = {
						zoom: mConfig.zoom,
						mapType: sMapType2,
						mapDivId: sMapTypeId2,
						onload: fnMapLoaded,
						onGetInfoWindowContent: fnGetInfoWindowContent,
						view: that.view
					},
					sKey;

				// include map specific parameters, e.g. googleKey, leafletMapboxKey, leafletUrl, openLayersUrl
				for (sKey in mConfig) {
					if (mConfig.hasOwnProperty(sKey)) {
						if (Utils.stringStartsWith(sKey, sMapType2)) {
							mMapOptions[sKey] = mConfig[sKey];
						}
					}
				}
				that.mapProxy[sMapType2] = mapProxy;
				mapProxy.createMap(mMapOptions);
			};

		this.model.setProperty("mapType", sMapType);

		this.view.activateCanvasById(sMapTypeId, !this.model.getProperty("showMap"));

		if (!this.mapProxy[sMapType]) {
			oMapProxyUnused = new MapProxy({
				mapType: sMapType,
				onload: fnMapProxyLoaded
			});
		} else if (this.controller.maFa) {
			this.controller.maFa.initMap(this.mapProxy[sMapType]);
		}
	},

	onReloadButtonClick: function () {
		var oChanged = Utils.getChangedParameters(this.model.getAllProperties(), this.model.getAllInitialProperties());

		window.location.search = "?" + this.controller.fnEncodeUriParam(oChanged); // jQuery.param(oChanged, true)
	},

	onSaveButtonClick: function () {
		var sDatabase = this.model.getProperty("database"),
			sExample = this.model.getProperty("example"),
			sInput = this.view.getAreaValue("inputArea"),
			oExample,

			fnTestIndexedDb = function (oExample2) {
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
						oTransaction, sInput2, iPos, oStore, oReq;

					oTransaction = oDb.transaction(sStoreName, "readwrite");
					oStore = oTransaction.objectStore(sStoreName);

					sInput2 = oExample2.script;
					if (sInput2) {
						iPos = sInput2.indexOf(this.controller.sJsonMarker);
						if (iPos >= 0) {
							oExample2 = Utils.objectAssign({}, JSON.parse(sInput2.substring(iPos + this.controller.sJsonMarker.length)), oExample2);
						}
					}

					oReq = oStore.put(oExample2); // add(), or put() to modify if exist
					oReq.onsuccess = function (ev) {
						Utils.console.log("indexedDB: Insertion successful: " + ev.target.result);
					};
					oReq.onerror = function (ev) {
						Utils.console.error("indexedDB: Insert error: " + ev.target.error); // or use his.error
					};
				};
				oRequest.onerror = function (event) {
					Utils.console.error("indexedDB: Database error:" + event.target.errorCode);
				};
			};

		if (sDatabase !== "saved") {
			sDatabase = "saved";
			this.view.setSelectValue("databaseSelect", sDatabase);
			this.onDatabaseSelectChange(); // may change example value as well
		}

		sExample = this.controller.fnAddItem(sExample, sInput);

		Utils.localStorage.setItem(sExample, sInput);

		if (this.model.getProperty("testIndexedDb")) {
			fnTestIndexedDb(oExample);
		}

		if (this.view.getSelectValue("exampleSelect") !== sExample) {
			this.view.setSelectValue("exampleSelect", sExample);
		}
		this.model.setProperty("example", sExample);
		this.controller.fnSetExampleList();
		this.onExampleSelectChange();
		this.view.setDisabled("deleteButton", !Object.keys(this.model.getAllExamples()).length);
	},

	onDeleteButtonClick: function () {
		var sDatabase = this.model.getProperty("database"),
			sExample = this.model.getProperty("example"),
			oExample;

		if (sDatabase !== "saved") {
			return;
		}
		if (!this.view.showConfirmPopup("Delete " + sDatabase + "/" + sExample)) {
			return;
		}
		Utils.console.log("Deleting " + sExample);
		Utils.localStorage.removeItem(sExample);

		oExample = this.model.getExample(sExample);
		if (oExample) {
			this.model.deleteExample(sExample);
			this.controller.fnSetExampleList();
			this.onExampleSelectChange();
		}
		this.view.setDisabled("deleteButton", !Object.keys(this.model.getAllExamples()).length);
	}
};


if (typeof module !== "undefined" && module.exports) {
	module.exports = CommonEventHandler;
}
// end
