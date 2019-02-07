/* 0dbindex.js */
/* globals gcFiddle */

"use strict";

gcFiddle.addDatabases(
	{
		test: {
			text: "Test DB",
			title: "Test Database",
			src: "./0index.js"
		},
		saved: {
			text: "Saved DB",
			title: "Saved Database",
			// type: "localstorage",
			src: ""
		}
	}
);
