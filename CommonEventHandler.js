// CommonEventHandler.js - CommonEventHandler
//
/* globals Utils, gcFiddle, gDebug, LatLng, MapProxy */

"use strict";

function CommonEventHandler(options) {
	this.init(options);
}

CommonEventHandler.prototype = {
	init: function (/* options */) {
		this.attach();
	},

	attach: function () {
		var that = this,
			fnCommonEventHandler = function (event) {
				var oTarget = event.target,
					sId = (oTarget) ? oTarget.getAttribute("id") : oTarget,
					sType, sHandler;

				if (sId) {
					sType = event.type; // click or change
					sHandler = "on" + Utils.stringCapitalize(sId) + Utils.stringCapitalize(sType);
					if (gDebug) {
						gDebug.log("DEBUG: fnCommonEventHandler: sHandler=" + sHandler);
					}
					if (sHandler in that) {
						that[sHandler](event);
					} else if (!Utils.stringEndsWith(sHandler, "SelectClick") && !Utils.stringEndsWith(sHandler, "InputClick")) { // do not print all messages
						window.console.log("Event handler not found: " + sHandler);
					}
				} else if (gDebug) {
					gDebug.log("DEBUG: Event handler for " + event.type + " unknown target " + oTarget);
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
			sValue,	oMarker, i, oPos, sError,
			fnAddClass = function (element, sClassName) {
				var aClasses = element.className.split(" ");

				if (aClasses.indexOf(sClassName) === -1) {
					element.className += " " + sClassName;
				}
			},
			fnRemoveClass = function (element, sClassName) {
				var regExp = new RegExp("\\b" + sClassName + "\\b", "g");

				element.className = element.className.replace(regExp, "");
			};

		// center to selected waypoint
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			if (oMarker && sPar === oMarker.title) {
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
		oPos = new LatLng().parse(sValue);
		sError = oPos.getError();
		waypointInput.title = sError || oPos.toFormattedString(gcFiddle.config.positionFormat);
		if (sError) {
			fnAddClass(waypointInput, "invalid");
		} else {
			fnRemoveClass(waypointInput, "invalid");
		}

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
			gcFiddle.fnCalculate2();
			gcFiddle.fnSetVarSelectOptions();
			this.onVarSelectChange(); // title change?
			gcFiddle.fnSetWaypointSelectOptions();
			gcFiddle.fnSetMarkers(variables);
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
			gcFiddle.fnCalculate2();
			gcFiddle.fnSetVarSelectOptions();
			gcFiddle.fnSetWaypointSelectOptions();
			gcFiddle.fnSetMarkers(variables);
			this.onWaypointSelectChange();
		}
	},

	onExecuteButtonClick: function () {
		var waypointSelect = document.getElementById("waypointSelect");

		gcFiddle.fnPutChangedInputOnStack();

		gcFiddle.variables = {
			gcfOriginal: { }
		};
		gcFiddle.fnCalculate2();
		gcFiddle.maFa.deleteMarkers();
		gcFiddle.fnSetMarkers(gcFiddle.variables);
		gcFiddle.fnSetVarSelectOptions();
		this.onVarSelectChange();
		gcFiddle.fnSetWaypointSelectOptions();
		if (waypointSelect.options.length) {
			waypointSelect.selectedIndex = waypointSelect.options.length - 1; // select last waypoint
		}
		this.onWaypointSelectChange();
		gcFiddle.maFa.fitBounds();
	},

	onUndoButtonClick: function () {
		gcFiddle.fnSetInputAreaValue(gcFiddle.inputStack.undo());
		gcFiddle.fnUpdateUndoRedoButtons();
		gcFiddle.fnSetOutputAreaValue("");
	},

	onRedoButtonClick: function () {
		gcFiddle.fnSetInputAreaValue(gcFiddle.inputStack.redo());
		gcFiddle.fnUpdateUndoRedoButtons();
		gcFiddle.fnSetOutputAreaValue("");
	},

	onPreprocessButtonClick: function () {
		var sUrl = "Preprocessor.js";

		if (typeof Preprocessor === "undefined") { // load module on demand
			Utils.loadScript(sUrl, function () {
				window.console.log(sUrl + " loaded");
				gcFiddle.fnDoPreprocess();
			});
		} else {
			gcFiddle.fnDoPreprocess();
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
						oExamples2[sExample2] = gcFiddle.fnParseExample("", "", sExample2);
					}
				}
				gcFiddle.fnSetInputAreaValue(oExamples2[sExample2].script);
				gcFiddle.fnInitUndoRedoButtons();
				that.onExecuteButtonClick();
			};

		exampleSelect.title = (exampleSelect.selectedIndex >= 0) ? exampleSelect.options[exampleSelect.selectedIndex].title : "";
		if (oExamples[sExample] !== undefined) {
			fnExampleLoaded("", sExample, true);
		} else if (sExample) {
			gcFiddle.fnSetInputAreaValue("#loading " + sExample + "...");
			gcFiddle.fnSetOutputAreaValue("waiting...");
			sName = sCategory + "/" + sExample + ".js";
			gcFiddle.pendingScripts.push({
				category: sCategory,
				example: sExample,
				url: sName
			});
			Utils.loadScript(sName, fnExampleLoaded, sExample);
		} else {
			gcFiddle.fnSetInputAreaValue("");
			gcFiddle.config.example = "";
			gcFiddle.fnInitUndoRedoButtons();
			this.onExecuteButtonClick();
		}
	},

	onCategorySelectChange: function () {
		var that = this,
			categorySelect = document.getElementById("categorySelect"),
			sCategory = categorySelect.value,
			oCategories = gcFiddle.categories,
			sName,

			fnCategoryLoaded = function (sFullUrl, sCategory2) {
				var	sName2 = sCategory2 + "/0index.js";

				gcFiddle.config.category = sCategory2;
				window.console.log("category " + sName2 + " loaded");
				gcFiddle.fnSetExampleList();
				that.onExampleSelectChange();
			},
			fnLoadCategoryLocalStorage = function () {
				var	oStorage = gcFiddle.localStorage,
					oExamples,
					i, sKey, sItem;

				oExamples = gcFiddle.fnSetExampleIndex("", sCategory); // create category, set example object
				for (i = 0; i < oStorage.length; i += 1) {
					sKey = oStorage.key(i);
					sItem = oStorage.getItem(sKey);
					oExamples[sKey] = gcFiddle.fnAddExample(sItem, sCategory, {
						key: sKey,
						title: "" // currently title not stored in saved data if not in input
					});
				}
				fnCategoryLoaded("", sCategory);
			};

		if (oCategories[sCategory] !== undefined) {
			gcFiddle.config.category = sCategory;
			gcFiddle.fnSetExampleList();
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
		Utils.setDisabled("deleteButton", (sCategory !== "saved") || !Object.keys(gcFiddle.categories.saved).length);
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

		//oMaFa.clearMarkers(); // clear needed for SimpleMarker
		oMaFa.fitBounds();
		//oMaFa.showMarkers();
	},

	onLocationButtonClick: function () {
		var that = this;

		function showPosition(position) {
			var iLastMarker = gcFiddle.maFa.getMarkers().length,
				sLabel = Utils.strZeroFormat(String(iLastMarker), 2),
				oMarker = {
					position: new LatLng(position.coords.latitude, position.coords.longitude),
					label: sLabel,
					title: "W" + sLabel
				};

			window.console.log("Location: " + oMarker.position.toFormattedString(gcFiddle.config.positionFormat));
			gcFiddle.maFa.addMarkers([oMarker]);
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
			gDebug.log("onOutputAreaClick: selectionStart=" + event.target.selectionStart + " selectionEnd=" + event.target.selectionEnd);
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
				if (gcFiddle.fnIsWaypoint(sPar)) {
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

			fnGetInfoWindowContent = function (marker, previousMarker) {
				var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
					sContent, oPosition1, oPosition2, iAngle, iDistance, sDirection;

				sContent = marker.title + "=" + marker.position.toFormattedString(gcFiddle.config.positionFormat); //TTT TODO

				if (previousMarker) {
					oPosition1 = previousMarker.position;
					oPosition2 = marker.position;
					iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
					iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
					sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
					sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
				}
				return sContent;
			},

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
					sMapTypeId2 = "mapCanvas-" + sMapType2,
					mConfig = gcFiddle.config,
					mMapOptions = {
						zoom: mConfig.zoom,
						mapType: sMapType2,
						mapDivId: sMapTypeId2,
						onload: fnMapLoaded,
						onGetInfoWindowContent: fnGetInfoWindowContent
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
				gcFiddle.mapProxy[sMapType2] = mapProxy;
				mapProxy.createMap(mMapOptions);
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
		var oChanged = Utils.getChangedParameters(gcFiddle.config, gcFiddle.initialConfig);

		window.location.search = "?" + gcFiddle.fnEncodeUriParam(oChanged); // jQuery.param(oChanged, true)
	},

	onSaveButtonClick: function () {
		var categorySelect = document.getElementById("categorySelect"),
			sCategory = categorySelect.value,
			exampleSelect = document.getElementById("exampleSelect"),
			oselectedExample = gcFiddle.examples[sCategory][exampleSelect.value],
			sInput = document.getElementById("inputArea").value,
			oExample, oSavedList,

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
						iPos = sInput2.indexOf(gcFiddle.sJsonMarker);
						if (iPos >= 0) {
							oExample2 = Utils.objectAssign({}, window.JSON.parse(sInput2.substring(iPos + gcFiddle.sJsonMarker.length)), oExample2);
						}
					}

					oReq = oStore.put(oExample2); // add(), or put() to modify if exist
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
			};

		if (sCategory !== "saved") {
			sCategory = "saved";
			categorySelect.value = sCategory;
			this.onCategorySelectChange(); // may change example value as well
		}

		oExample = gcFiddle.fnAddExample(sInput, sCategory, oselectedExample || gcFiddle.emptyExample.draft);
		gcFiddle.localStorage.setItem(oExample.key, sInput);

		if (gcFiddle.config.testIndexedDb) {
			fnTestIndexedDb(oExample);
		}

		oSavedList = gcFiddle.categories.saved;

		if (oSavedList[oExample.key]) {
			oSavedList[oExample.key] = oExample;
			if (exampleSelect.value !== oExample.key) {
				exampleSelect.value = oExample.key;
			}
			gcFiddle.fnSetExampleList(); // maybe title change
			this.onExampleSelectChange(); // make sure correct input is shown
		} else {
			oSavedList[oExample.key] = oExample;
			gcFiddle.config.example = oExample.key;
			gcFiddle.fnSetExampleList();
			this.onExampleSelectChange();
		}
		Utils.setDisabled("deleteButton", !Object.keys(oSavedList).length);
	},

	onDeleteButtonClick: function () {
		var sCategory = document.getElementById("categorySelect").value,
			exampleSelect = document.getElementById("exampleSelect"),
			sExample = exampleSelect.value,
			oSavedList = gcFiddle.categories.saved,
			fnConfirmPopup = function (message) {
				var confirm = window.confirm;

				return confirm(message);
			};

		if (sCategory !== "saved") {
			return;
		}
		if (!fnConfirmPopup("Delete " + sCategory + "/" + sExample)) {
			return;
		}
		window.console.log("Deleting " + sExample);
		gcFiddle.localStorage.removeItem(sExample);

		if (oSavedList) {
			if (oSavedList[sExample]) {
				delete oSavedList[sExample];
				gcFiddle.fnSetExampleList();
				this.onExampleSelectChange();
			}
			Utils.setDisabled("deleteButton", !Object.keys(oSavedList).length);
		}
	}
};
// end
