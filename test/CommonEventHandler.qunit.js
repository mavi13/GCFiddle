// CommonEventHandler.qunit.js - ...
//
/* globals QUnit */

"use strict";

var CommonEventHandler;

if (typeof require !== "undefined") {
	CommonEventHandler = require("../CommonEventHandler.js"); // eslint-disable-line global-require
}


function TestModel() {
	this.testData = {}; // contains: config: {}, variables: {}, examples: {}
}

TestModel.prototype = {
	setTestData: function (sGroup, sId, value) {
		if (!this.testData[sGroup]) {
			this.testData[sGroup] = {};
		}
		this.testData[sGroup][sId] = value;
		return this;
	},
	getTestData: function (sGroup, sId) {
		if (sId === undefined) {
			return this.testData[sGroup];
		} else if (this.testData[sGroup] === undefined) {
			return this.testData[sGroup];
		}
		return this.testData[sGroup][sId];
	},

	getProperty: function (sProperty) {
		return this.getTestData("config", sProperty);
	},
	setProperty: function (sProperty, sValue) {
		return this.setTestData("config", sProperty, sValue);
	},
	initVariables: function () {
		this.variables = {};
		return this;
	},
	getVariable: function (sVar) {
		return this.getTestData("variables", sVar);
	},
	setVariable: function (sVar, sValue) {
		return this.setTestData("variables", sVar, sValue);
	},
	changeVariable: function (sVar, sValue) {
		if (sValue !== this.getVariable(sVar)) { // change needed?
			this.setVariable(sVar, sValue);
			return true; // changed
		}
		return false;
	},
	getAllVariables: function () {
		return this.getTestData("variables");
	}
};


function TestView() {
	this.testData = {};
}

TestView.prototype = {
	setTestData: function (sId, value) {
		this.testData[sId] = value;
		return this;
	},
	getTestData: function (sId) {
		return this.testData[sId];
	},
	setDisabled: function () {
		// empty
	},
	getSelectValue: function (sId) {
		return this.getTestData(sId + "Value");
	},
	setSelectValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	getAreaValue: function (sId) {
		return this.getTestData(sId + "Value");
	},
	setAreaValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setSelectTitleFromSelectedOption: function (/* sId */) {
		// empty
	},
	getLabelText: function (sId) {
		return this.getTestData(sId + "Text");
	},
	setLabelText: function (sId, value) {
		return this.setTestData(sId + "Text", value);
	},
	setLabelTitle: function (sId, value) {
		return this.setTestData(sId + "Title", value);
	},
	setInputType: function (sId, value) {
		return this.setTestData(sId + "Type", value);
	},
	setInputMin: function (sId, value) {
		return this.setTestData(sId + "Min", value);
	},
	setInputMax: function (sId, value) {
		return this.setTestData(sId + "Max", value);
	},
	setInputStep: function (sId, value) {
		return this.setTestData(sId + "Step", value);
	},
	getInputValue: function (sId) {
		return this.getTestData(sId + "Value");
	},
	setInputValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setInputTitle: function (sId, value) {
		return this.setTestData(sId + "Title", value);
	},
	setInputInvalid: function () {
		// empty
	},
	getSelectLength: function (sId) {
		return this.getTestData(sId + "Length");
	},
	setLegendText: function (sId, value) {
		return this.setTestData(sId + "Text", value);
	},
	getHidden: function (sId) {
		return this.getTestData(sId + "Hidden");
	},
	setHidden: function (sId, value) {
		return this.setTestData(sId + "Hidden", value);
	},
	toogleHidden: function (sId) {
		return this.setTestData(sId + "Hidden", !this.getHidden(sId + "Hidden"));
	},
	attachEventHandler: function () {
		// empty
	}
};


function TestController(oModel, oView) {
	this.model = oModel;
	this.view = oView;
}

TestController.prototype = {
	fnPutChangedInputOnStack: function () {
		// empty
	},
	fnCalculate2: function () {
		// empty
		var sInput = this.view.getAreaValue("inputArea"),
			sOutput = sInput;

		this.view.setAreaValue("outputArea", sOutput);
	},
	fnSetVarSelectOptions: function () {
		// empty
	},
	fnSetWaypointSelectOptions: function () {
		// empty
	},
	fnSetMarkers: function () {
		// empty
	},
	fnSetLogsAreaValue: function () {
		// empty
	},
	maFa: {
		deleteMarkers: function () {
			// empty
		}
	}
};

/* ... */


QUnit.module("CommonEventHandler test", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		var that = this; // eslint-disable-line no-invalid-this

		that.oMock = {
			model: new TestModel(),
			view: new TestView()
		};
		that.oMock.controller = new TestController(that.oMock.model, that.oMock.view);

		that.oCommonEventHandler = new CommonEventHandler(that.oMock.model, that.oMock.view, that.oMock.controller);
	});

	QUnit.test("onVarSelectChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view,
			mModelResultA = {
				config: {
					varMax: 20,
					varMin: 0,
					varStep: 1,
					varType: "number"
				},
				variables: {
					$w: "N 49° 18.071 E 008° 42.167",
					a: 12,
					b: "t1"
				}
			},
			mViewResultA = {
				varInputMax: 20,
				varInputMin: 0,
				varInputStep: 1,
				varInputTitle: 12,
				varInputType: "number",
				varInputValue: 12,
				varLabelText: "a",
				varLabelTitle: "a",
				varLegendText: "Variables (undefined)",
				varSelectValue: "a"
			},
			mViewResultB = {
				varInputMax: 20,
				varInputMin: 0,
				varInputStep: 1,
				varInputTitle: "t1",
				varInputType: "text",
				varInputValue: "t1",
				varLabelText: "b",
				varLabelTitle: "b",
				varLegendText: "Variables (2)",
				varSelectLength: 2,
				varSelectValue: "b"
			};

		oModel.setTestData("config", "varMin", 0);
		oModel.setTestData("config", "varMax", 20);
		oModel.setTestData("config", "varStep", 1);
		oModel.setTestData("config", "varType", "number");
		oModel.setTestData("variables", "a", 12);
		oModel.setTestData("variables", "b", "t1");
		oModel.setTestData("variables", "$w", "N 49° 18.071 E 008° 42.167");

		oView.setTestData("varSelectValue", "a");
		oCommonEventHandler.onVarSelectChange();
		assert.deepEqual(oModel.testData, mModelResultA, "variable a selected (model)");
		assert.deepEqual(oView.testData, mViewResultA, "variable a selected");

		oView.setTestData("varSelectLength", 2);
		oView.setTestData("varSelectValue", "b");
		oCommonEventHandler.onVarSelectChange();
		assert.deepEqual(oModel.testData, mModelResultA, "variable b selected (model no change)"); // no change
		assert.deepEqual(oView.testData, mViewResultB, "variable b selected");
	});

	QUnit.test("onWaypointSelectChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view,
			//sScript = '$W0="N 49° 18.071 E 008° 42.167" a=213 b=289	$W1=["N 49° 18." a " E 008° 42." b]	#$W2=project($W0,0,50)',
			mModelResultA = {
				config: {
					waypointFormat: "dmmc"
				},
				variables: {
					$w: "N 49° 18.071 E 008° 42.167!test!Title 1"
				}
			},
			mViewResultA = {
				waypointInputTitle: "N 49° 18.071 E 008° 42.167!test!Title 1",
				waypointInputValue: "N 49° 18.071 E 008° 42.167!test!Title 1",
				waypointLabelText: "$w",
				waypointLabelTitle: "$w",
				waypointSelectLength: 1,
				waypointLegendText: "Waypoints (1)",
				waypointSelectValue: "$w"
			};

		oModel.setTestData("config", "waypointFormat", "dmmc");

		oModel.setTestData("variables", "$w", "N 49° 18.071 E 008° 42.167!test!Title 1");
		oView.setTestData("waypointSelectLength", 1);
		oView.setTestData("waypointSelectValue", "$w");
		oCommonEventHandler.onWaypointSelectChange(null);
		assert.deepEqual(oModel.testData, mModelResultA, "waypoint $w selected (model)");
		assert.deepEqual(oView.testData, mViewResultA, "waypoint $w selected");
	});

	QUnit.test("onWaypointViewSelectChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setProperty("waypointFormat", "");
		oView.setSelectValue("waypointViewSelect", "auto");
		oCommonEventHandler.onWaypointViewSelectChange();
		assert.strictEqual(oModel.getProperty("waypointFormat"), "auto", "waypointFormat");
	});

	QUnit.test("onVarInputChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setVariable("a", 0);

		oView.setLabelText("varLabel", "a");
		oView.setInputValue("varInput", 3);

		oCommonEventHandler.onVarInputChange();
		assert.strictEqual(oModel.getVariable("a"), 3, "a=3");
	});

	QUnit.test("onVarInputInput", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setTestData("config", "varType", "text");
		oModel.setVariable("a", 0);

		oView.setLabelText("varLabel", "a");
		oView.setInputValue("varInput", 3);
		oCommonEventHandler.onVarInputInput();
		assert.strictEqual(oModel.getVariable("a"), 0, "a=0"); // not changed

		oModel.setProperty("varType", "number");
		oCommonEventHandler.onVarInputInput();
		assert.strictEqual(oModel.getVariable("a"), 3, "a=3"); // changed
	});

	QUnit.test("onVarMinInputChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setProperty("varMin", "");
		oView.setInputValue("varMinInput", 3);
		oCommonEventHandler.onVarMinInputChange();
		assert.strictEqual(oModel.getProperty("varMin"), 3, "varMin");
	});

	QUnit.test("onVarMaxInputChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setProperty("varMax", "");
		oView.setInputValue("varMaxInput", 5);
		oCommonEventHandler.onVarMaxInputChange();
		assert.strictEqual(oModel.getProperty("varMax"), 5, "varMax");
	});

	QUnit.test("onVarStepInputChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setProperty("varStep", "");
		oView.setInputValue("varStepInput", 5);
		oCommonEventHandler.onVarStepInputChange();
		assert.strictEqual(oModel.getProperty("varStep"), 5, "varStep");
	});

	QUnit.test("onVarTypeSelectChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setProperty("varType", "");
		oView.setSelectValue("varTypeSelect", "text");
		oCommonEventHandler.onVarTypeSelectChange();
		assert.strictEqual(oModel.getProperty("varType"), "text", "varType");
	});

	QUnit.test("onVarResetButtonClick", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view,
			mModelResultA = {
				config: {
					varMin: 0,
					varMax: 9999,
					varStep: 1,
					varType: "number"
				}
			},
			mViewResultA = {
				varInputMax: 9999,
				varInputMin: 0,
				varInputStep: 1,
				varInputTitle: "",
				varInputType: "text",
				varInputValue: "",
				varLabelText: "",
				varLabelTitle: "",
				varLegendText: "Variables (undefined)",
				varMaxInputValue: 9999,
				varMinInputValue: 0,
				varOptionGroupHidden: false,
				varStepInputValue: 1,
				varTypeSelectValue: "number"
			};

		oCommonEventHandler.onVarResetButtonClick();
		assert.deepEqual(oModel.testData, mModelResultA, "onVarResetButtonClick: Model");
		assert.deepEqual(oView.testData, mViewResultA, "onVarResetButtonClick: View");
	});

	QUnit.test("onWaypointInputChange", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view;

		oModel.setVariable("$w", "");

		oView.setLabelText("waypointLabel", "$w");
		oView.setInputValue("waypointInput", "N 49° 18.071 E 008° 42.167");

		oCommonEventHandler.onWaypointInputChange();
		assert.strictEqual(oModel.getVariable("$w"), "N 49° 18.071 E 008° 42.167", "$w set");
	});

	QUnit.test("onExecuteButtonClick", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oView = that.oMock.view;

		oView.setAreaValue("inputArea", "script...");

		oCommonEventHandler.onExecuteButtonClick();
		assert.strictEqual(oView.getAreaValue("outputArea"), "script...", "script executed");
	});

	QUnit.test("on<Any>LegendClick", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view,
			aLegends = [
				"special",
				"filter",
				"sort",
				"script",
				"result",
				"variable",
				"notes",
				"waypoint",
				// "map", see next test
				"logs",
				"console"
			],
			mModelResultA = {
				config: {}
			},
			mViewResultA = {},
			i, sLegend, sModelPar, sViewPar, sClickMethod,

			stringCapitalize = function (str) {
				return str.charAt(0).toUpperCase() + str.substring(1);
			};

		for (i = 0; i < aLegends.length; i += 1) {
			sLegend = aLegends[i];
			sModelPar = "show" + stringCapitalize(sLegend); // e.g. "showScript"
			sViewPar = sLegend + "AreaHidden"; // e.g. "scriptAreaHidden"
			sClickMethod = "on" + stringCapitalize(sLegend) + "LegendClick"; // e.g. "onScriptLegendClick"

			oModel.setTestData("config", sModelPar, true);
			oView.setTestData(sViewPar, false);
			oCommonEventHandler[sClickMethod](); // e.g. onScriptLegendClick()

			mModelResultA.config[sModelPar] = false;
			mViewResultA[sViewPar] = true;
			assert.deepEqual(oModel.testData, mModelResultA, sClickMethod + ": Model " + sModelPar);
			assert.deepEqual(oView.testData, mViewResultA, sClickMethod + ": View " + sViewPar);
		}
	});

	QUnit.test("onMapLegendClick", function (assert) {
		var that = this, // eslint-disable-line no-invalid-this
			oCommonEventHandler = that.oCommonEventHandler,
			oModel = that.oMock.model,
			oView = that.oMock.view,
			mModelResultA = {
				config: {
					showMap: false,
					mapType: "none"
				}
			},
			mViewResultA = {
				"mapCanvas-noneHidden": true
			};

		oModel.setTestData("config", "mapType", "none");

		oModel.setTestData("config", "showMap", true);
		oView.setTestData("mapCanvas-noneHidden", false);
		oCommonEventHandler.onMapLegendClick();
		assert.deepEqual(oModel.testData, mModelResultA, "onMapLegendClick: Model");
		assert.deepEqual(oView.testData, mViewResultA, "onMapLegendClick: View");
	});
});
// end
