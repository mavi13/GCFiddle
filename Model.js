// Model.js - Model
//
/* globals */

"use strict";

var Utils;

if (typeof require !== "undefined") {
	Utils = require("./Utils.js"); // eslint-disable-line global-require
}

function Model(config, initialConfig) {
	this.init(config, initialConfig);
}

Model.prototype = {
	init: function (config, initialConfig) {
		this.config = config || {}; // store only a reference
		this.initialConfig = initialConfig || {};
		this.databases = {};
		this.examples = {}; // loaded examples per database (properties: database, key, script, title)

		this.initVariables();
	},
	getProperty: function (sProperty) {
		return this.config[sProperty];
	},
	setProperty: function (sProperty, sValue) {
		this.config[sProperty] = sValue;
		return this;
	},
	getAllProperties: function () {
		return this.config;
	},
	getAllInitialProperties: function () {
		return this.initialConfig;
	},

	getVariable: function (sVar) {
		return this.variables[sVar];
	},
	getAllVariables: function () {
		return this.variables;
	},
	initVariables: function () {
		this.variables = {
			gcfOriginal: {}
		};
		return this;
	},

	addDatabases: function (oDb) {
		var sPar, oEntry;

		for (sPar in oDb) {
			if (oDb.hasOwnProperty(sPar)) {
				oEntry = oDb[sPar];
				this.databases[sPar] = oEntry;
				this.examples[sPar] = {};
			}
		}
		return this;
	},
	getAllDatabases: function () {
		return this.databases;
	},
	getDatabase: function () {
		var sDatabase = this.getProperty("database");

		return this.databases[sDatabase];
	},


	getAllExamples: function () {
		var selectedDatabase = this.getProperty("database");

		return this.examples[selectedDatabase];
	},
	fnGetFilterCategories: function () {
		var mFilterCategory, sFilterCategory, aFilterCategory, i;

		sFilterCategory = this.getProperty("filterCategory");
		if (sFilterCategory !== "") { // split: empty string returns array with empty string
			aFilterCategory = sFilterCategory.split(",");
			mFilterCategory = {};
			for (i = 0; i < aFilterCategory.length; i += 1) {
				mFilterCategory[aFilterCategory[i]] = true;
			}
		}
		return mFilterCategory; // for empty list return undefined
	},
	fnGetExampleTitle: function (oExample) {
		var sComment, iIndex, sTitle;

		sComment = oExample.position.getComment(); // category and title
		iIndex = sComment.indexOf("!");
		sTitle = (iIndex >= 0) ? sComment.substring(iIndex + 1) : "";
		return sTitle;
	},
	fnGetExampleCategory: function (oExample) {
		var sComment, iIndex, sCategory;

		sComment = oExample.position.getComment(); // category and title
		iIndex = sComment.indexOf("!");
		sCategory = (iIndex >= 0) ? sComment.substring(0, iIndex) : "";
		return sCategory;
	},
	fnGetAllExampleCategories: function () {
		var oItems = {},
			oAllExamples = this.getAllExamples(),
			oExample, sKey, sCategory;

		// Get all categories from example titles
		for (sKey in oAllExamples) {
			if (oAllExamples.hasOwnProperty(sKey)) {
				oExample = oAllExamples[sKey];
				sCategory = this.fnGetExampleCategory(oExample);
				oItems[sCategory] = true;
			}
		}
		return oItems;
	},
	getFilteredExamples: function () {
		var aItems = [],
			oAllExamples = this.getAllExamples(),
			mFilterCategories = this.fnGetFilterCategories(),
			sFilterId = this.getProperty("filterId").toLowerCase(),
			sFilterTitle = this.getProperty("filterTitle").toLowerCase(),
			sKey, oExample, sTitle, sCategory;

		for (sKey in oAllExamples) {
			if (oAllExamples.hasOwnProperty(sKey)) {
				oExample = oAllExamples[sKey];
				sTitle = this.fnGetExampleTitle(oExample);
				sCategory = this.fnGetExampleCategory(oExample);

				if ((!mFilterCategories || mFilterCategories[sCategory])
					&& (sFilterId === "" || sKey.toLowerCase().indexOf(sFilterId) >= 0)
					&& (sFilterTitle === "" || sTitle.toLowerCase().indexOf(sFilterTitle) >= 0)) { // filter
					aItems.push(oExample);
				} else if (Utils.debug > 1) {
					Utils.console.debug("DEBUG: getFilteredExamples: item " + sKey + " filtered");
				}
			}
		}
		return aItems;
	},
	getExample: function (sKey) {
		var selectedDatabase = this.getProperty("database");

		return this.examples[selectedDatabase][sKey];
	},
	setExample: function (oExample) {
		var selectedDatabase = this.getProperty("database"),
			sKey = oExample.key;

		if (!this.examples[selectedDatabase][sKey]) {
			if (Utils.debug) {
				Utils.console.debug("setExample: creating new example: " + sKey);
			}
		}
		this.examples[selectedDatabase][sKey] = oExample;
		return this;
	},
	deleteExample: function (sKey) {
		var selectedDatabase = this.getProperty("database");

		if (!this.examples[selectedDatabase][sKey]) {
			Utils.console.warn("deleteExample: example does not exist: " + sKey);
		}
		delete this.examples[selectedDatabase][sKey];
		return this;
	}
};


if (typeof module !== "undefined" && module.exports) {
	module.exports = Model;
}
// end
