// Model.js - Model
//
/* globals */

"use strict";

function Model(options) {
	this.init(options);
}

Model.prototype = {
	init: function (options) {
		this.config = options.config; // store only a reference
		this.initialConfig = options.initialConfig;

		this.databases = {};
		this.examples = { }; // loaded examples per database (properties: database, key, script, title)

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

	getVariables: function () {
		return this.variables;
	},
	initVariables: function () {
		this.variables = {
			gcfOriginal: { }
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

	getDatabase: function (sKey) {
		return this.databases[sKey];
	},

	getAllExamples: function () {
		var selectedDatabase = this.getProperty("database");

		return this.examples[selectedDatabase];
	},

	getExample: function (sKey) {
		var selectedDatabase = this.getProperty("database");

		return this.examples[selectedDatabase][sKey];
	},
	setExample: function (oExample) {
		var selectedDatabase = this.getProperty("database"),
			sKey = oExample.key;

		if (!this.examples[selectedDatabase][sKey]) {
			window.console.debug("setExample: creating new example: " + sKey);
		}
		this.examples[selectedDatabase][sKey] = oExample;
		return this;
	},
	deleteExample: function (sKey) {
		var selectedDatabase = this.getProperty("database");

		if (!this.examples[selectedDatabase][sKey]) {
			window.console.warn("deleteExample: example does not exist: " + sKey);
		}
		delete this.examples[selectedDatabase][sKey];
		return this;
	}
};

// end
