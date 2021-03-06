// Model.qunit.js - ...
//
/* globals QUnit */

"use strict";

var Model;

if (typeof require !== "undefined") {
	Model = require("../Model.js"); // eslint-disable-line global-require
}

QUnit.module("Model: Properties", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		var that = this, // eslint-disable-line no-invalid-this
			oInitialConfig = {
				p1: "v1"
			},
			oConfig = {
				p1: "v1",
				p2: "v2"
			};

		that.model = new Model(oConfig, oInitialConfig);
	});

	QUnit.test("init without options", function (assert) {
		var oModel = new Model();

		assert.ok(oModel, "defined");
	});

	QUnit.test("properties", function (assert) {
		var oModel = this.model, // eslint-disable-line no-invalid-this
			oAllProperties;

		oAllProperties = oModel.getAllInitialProperties();
		assert.strictEqual(Object.keys(oAllProperties).join(" "), "p1", "all initial properties: p1");

		assert.strictEqual(oModel.getProperty("p1"), "v1", "p1=v1");
		assert.strictEqual(oModel.getProperty("p2"), "v2", "p2=v2");
		assert.strictEqual(oModel.getProperty(""), undefined, "<empty>=undefiend");

		oAllProperties = oModel.getAllProperties();
		assert.strictEqual(Object.keys(oAllProperties).join(" "), "p1 p2", "all properties: p1 p2");
		assert.strictEqual(oAllProperties.p1, "v1", "p1=v1");
		assert.strictEqual(oAllProperties.p2, "v2", "p2=v2");

		oModel.setProperty("p1", "v1.2");
		assert.strictEqual(oModel.getProperty("p1"), "v1.2", "p1=v1.2");

		oModel.setProperty("p3", "v3");
		assert.strictEqual(oModel.getProperty("p3"), "v3", "p3=v3");

		oAllProperties = oModel.getAllProperties();
		assert.strictEqual(Object.keys(oAllProperties).join(" "), "p1 p2 p3", "all properties: p1 p2 p3");

		oAllProperties = oModel.getAllInitialProperties();
		assert.strictEqual(Object.keys(oAllProperties).join(" "), "p1", "all initial properties: p1");
	});
});

QUnit.module("Model: Variables", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		// var that = this, // eslint-disable-line no-invalid-this
	});

	QUnit.test("get/set one variable", function (assert) {
		var oModel = new Model();

		oModel.initVariables();
		assert.strictEqual(oModel.getVariable("v1"), undefined, "v1=undefined");

		oModel.setVariable("v1", "abc");
		assert.strictEqual(oModel.getVariable("v1"), "abc", "getVariable v1=abc");

		oModel.setVariable("$W1", "N 49");
		assert.strictEqual(oModel.getVariable("$W1"), "N 49", "getVariable $W1=N 49");
	});

	QUnit.test("get all variables", function (assert) {
		var oModel = new Model(),
			oVariables,
			mResult = {
				gcfOriginal: {}
			};

		oModel.initVariables();

		oVariables = oModel.getAllVariables();
		assert.propEqual(oVariables, mResult, "no variables, only gcfOriginal");

		oModel.setVariable("v1", "abc");
		mResult.v1 = "abc";
		oVariables = oModel.getAllVariables();
		assert.propEqual(oVariables, mResult, "one variable with gcfOriginal");

		oModel.setVariable("$W1", "N 49");
		mResult.$W1 = "N 49";
		oVariables = oModel.getAllVariables();
		assert.propEqual(oVariables, mResult, "two variables with gcfOriginal");
	});

	QUnit.test("change variable", function (assert) {
		var oModel = new Model(),
			oVariables, bChanged,
			mResult = {
				v1: "xyz",
				gcfOriginal: {
					v1: "abc"
				}
			};

		oModel.initVariables();
		oModel.setVariable("v1", "abc");
		assert.strictEqual(oModel.getVariable("v1"), "abc", "v1=abc");

		bChanged = oModel.changeVariable("v1", "xyz");
		assert.strictEqual(bChanged, true, "v1 changed");
		assert.strictEqual(oModel.getVariable("v1"), "xyz", "v1=xyz");

		oVariables = oModel.getAllVariables();
		assert.propEqual(oVariables, mResult, "gcfOriginal is filled");

		bChanged = oModel.changeVariable("v1", "xyz");
		assert.strictEqual(bChanged, false, "v1 is not changed again");

		bChanged = oModel.changeVariable("v1", "123");
		assert.strictEqual(oModel.getVariable("v1"), 123, "v1=123 converted to number");
	});
});


QUnit.module("Model: Databases", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		// var that = this, // eslint-disable-line no-invalid-this
	});

	QUnit.test("databases", function (assert) {
		var oModel = new Model(),
			mDatabases = {
				db1: {
					text: "text1",
					title: "title1",
					src: "src1"
				},
				db2: {
					text: "text1",
					title: "title2",
					src: ""
				}
			},
			oDatabases;

		oDatabases = oModel.getAllDatabases();
		assert.strictEqual(Object.keys(oDatabases).length, 0, "no databases");

		oModel.addDatabases(mDatabases);

		assert.strictEqual(Object.keys(oDatabases).join(" "), "db1 db2", "two databases: db1, db2");

		oModel.setProperty("database", "db1");

		assert.strictEqual(oModel.getDatabase(), mDatabases.db1, "databases db1");

		oModel.setProperty("database", "db2");

		assert.strictEqual(oModel.getDatabase(), mDatabases.db2, "databases db2");

		oModel.setProperty("database", "");

		assert.strictEqual(oModel.getDatabase(), undefined, "databases undefined");
	});
});


QUnit.module("Model: Examples", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		var that = this, // eslint-disable-line no-invalid-this
			mDatabases = {
				db1: {
					text: "db1Text",
					title: "db1Title",
					src: "db1Src"
				},
				db2: {
					text: "db2text"
				}
			},
			mExample1 = {
				key: "ex1",
				position: {
					getComment: function () {
						return "ex1Cat!ex1Title";
					}
				}
			},
			mExample2 = {
				key: "ex2",
				position: {
					getComment: function () {
						return "ex2Cat!ex2Title";
					}
				}
			},
			oModel;

		oModel = new Model();
		oModel.addDatabases(mDatabases);
		oModel.setProperty("database", "db1");
		oModel.setExample(mExample1);
		oModel.setExample(mExample2);
		that.model = oModel;
	});

	QUnit.test("examples", function (assert) {
		var oModel = this.model; // eslint-disable-line no-invalid-this

		assert.strictEqual(oModel.getExample("ex1").key, "ex1", "ex1");
		assert.strictEqual(oModel.getExample("ex2").key, "ex2", "ex2");

		assert.strictEqual(Object.keys(oModel.getAllExamples()).join(), "ex1,ex2", "two examples: ex1,ex2");

		oModel.deleteExample("ex2");
		assert.strictEqual(oModel.getExample("ex2"), undefined, "example 2 not found");

		oModel.deleteExample("ex1");
		assert.strictEqual(Object.keys(oModel.getAllExamples()).length, 0, "no examples in database");
	});

	QUnit.test("examples: fnGetAllExampleCategories", function (assert) {
		var oModel = this.model, // eslint-disable-line no-invalid-this
			oCat;

		oCat = oModel.fnGetAllExampleCategories();
		assert.strictEqual(Object.keys(oCat).join(), "ex1Cat,ex2Cat", "two categories: ex1Cat,ex2Cat");
	});

	QUnit.test("examples: getFilteredExamples", function (assert) {
		var oModel = this.model, // eslint-disable-line no-invalid-this
			fnGetKey = function (obj) {
				return obj.key;
			},
			aExamples;

		oModel.setProperty("filterCategory", "");
		oModel.setProperty("filterId", "");
		oModel.setProperty("filterTitle", "");
		aExamples = oModel.getFilteredExamples();
		assert.strictEqual(aExamples.map(fnGetKey).join(), "ex1,ex2", "no filter: ex1,ex2");

		oModel.setProperty("filterCategory", "ex1Cat");
		oModel.setProperty("filterId", "ex1");
		oModel.setProperty("filterTitle", "ex1Title");
		aExamples = oModel.getFilteredExamples();
		assert.strictEqual(aExamples.map(fnGetKey).join(), "ex1", "3 filters for 1: ex1");

		oModel.setProperty("filterCategory", "ex2Cat");
		oModel.setProperty("filterId", "2");
		oModel.setProperty("filterTitle", "ex2tit");
		aExamples = oModel.getFilteredExamples();
		assert.strictEqual(aExamples.map(fnGetKey).join(), "ex2", "3 filters for 2: ex2");

		oModel.setProperty("filterId", "1");
		aExamples = oModel.getFilteredExamples();
		assert.strictEqual(aExamples.map(fnGetKey).join(), "", "2 filters for 2, one for 1: no examples");

		oModel.setProperty("filterCategory", "ex1Cat,ex2Cat");
		oModel.setProperty("filterId", "Ex");
		oModel.setProperty("filterTitle", "Title");
		aExamples = oModel.getFilteredExamples();
		assert.strictEqual(aExamples.map(fnGetKey).join(), "ex1,ex2", "3 filters for both: ex1,ex2");
	});
});
// end
