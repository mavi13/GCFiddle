// Preprocessor.js - Preprocess text to scripts
//
/* globals Utils */ /* and implicit: ScriptParser */

"use strict";

function Preprocessor(options) {
	this.init(options);
}

Preprocessor.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({
			scriptParser: null
		}, options);
		this.mVariables = {};
		this.mInfo = {};
	},
	fnEndsWith: function (str, find) {
		return str.indexOf(find, str.length - find.length) !== -1;
	},
	// Find undefined variables and put them on top of the script
	fnFixScript: function (script, scriptParser) {
		var oVars = {},
			sVariables = "",
			sVariable,
			oOutput, oError;

		if (scriptParser) {
			do {
				oOutput = scriptParser.calculate(sVariables + script, oVars);
				oError = oOutput.error;
				if (oError && (oError.message === "Variable is undefined")) {
					sVariable = oError.value;
					if (oError.value in this.mVariables) {
						sVariables += sVariable + "=" + this.mVariables[sVariable] + " #see below\n";
					} else {
						sVariables += sVariable + "=0 #not detected\n";
					}
				} else {
					break;
				}
			} while (oError);
		}
		return sVariables + script;
	},
	// mPat = hash of patterns; every pattern with at least one parenthesis to retrun match
	fnMatchPatterns: function (str, mPat) {
		var mOut = {},
			sKeys, rPat, aRes, aKeys, i;

		for (sKeys in mPat) {
			if (mPat.hasOwnProperty(sKeys)) {
				rPat = mPat[sKeys];
				aRes = str.match(rPat);
				if (aRes === null) {
					aRes = "";
				}
				if (aRes) {
					aKeys = sKeys.split(",");
					for (i = 0; i < aKeys.length; i += 1) {
						mOut[aKeys[i]] = aRes[i + 1];
					}
				}
			}
		}
		return mOut;
	},
	fnFindInfo: function (str) {
		var mPat = {
				"name,finds": /\nYour profile photo[\s\n]?(.+?)[\s\n]?([\d,]+) Finds/, // Your profile photo xxx 2,005 Finds
				"id,type,title": /\n(GC\w+)[^\n]*\n([^\n ]*)[^\n]*\n([^\n]*)/, // GCxxx ▼\nTraditional Geocache\nTitle
				// Traditional Geocache, Mystery Cache,...
				owner: /\nA cache by ([^\n]*)[\s\n]?Message this owner/, // A cache by xxx
				hidden: /Hidden : ([\d/]+)/, // Hidden : mm/dd/yyyy
				difficulty: /\nDifficulty:[\s\n]*([\d.]+)/, // Difficulty:\n	2 out of 5
				terrain: /\nTerrain:[\s\n]*([\d.]+)/, // Terrain:\n  1.5 out of 5
				size: /\nSize: Size: (\w+)/, // Size: Size: small (small)
				favorites: /\n(\d+) Favorites/, // 0 Favorites
				archived: /\nThis cache has been (archived)/, // This cache has been archived.
				available: /\nThis cache is temporarily (unavailable)/, // This cache is temporarily unavailable.
				premium: /\nThis is a (Premium) Member Only cache/, // This is a Premium Member Only cache.
				waypoint: /\n(N \d{2}° \d{2}\.\d{3} E \d{3}° \d{2}\.\d{3})/, // N xx° xx.xxx E xxx° xx.xxx
				"state,country": /\nIn ([^ ,]+), ([^\n ]*)\n/ // In Baden-Württemberg, Germany
			},
			mOut = this.fnMatchPatterns(str, mPat);

		if (mOut.type) {
			mOut.type = (mOut.type || "").toLowerCase();
		}
		mOut.archived = Boolean(mOut.archived);
		mOut.premium = Boolean(mOut.premium);
		mOut.available = !mOut.available;
		if (mOut.hidden) {
			mOut.hidden = mOut.hidden.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2");
		}
		return mOut;
	},
	fnFindLoggedInfo: function (str) {
		var mPat = {
				"log,loggedOn": /\n(Did Not Find|Found It!)\nLogged on: (\S+)/, // Did Not Find\n#Logged on: 06/06/2018	 (if no log, simply: "Log geocache")
				"galleryCount,watching,watchCount": /\nView Gallery \((\d*)\)\n(Watch|Stop Watching) \((\d*)\)/ // View Gallery (3)\n  Watch (5)
			},
			mOut = this.fnMatchPatterns(str, mPat);

		if (mOut.log) {
			if (mOut.log === "Found It!") {
				mOut.log = "found";
			} else if (mOut.log === "Did Not Find") {
				mOut.log = "not found";
			}
		}
		if (mOut.loggedOn) {
			mOut.loggedOn = mOut.loggedOn.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2");
		}
		mOut.watching = (mOut.watching === "Stop Watching") ? "1" : "0";
		return mOut;
	},
	fnFindFooterInfo: function (str) {
		var mPat = {
				"currentTime,currentGMTTime": /\nCurrent Time: (\S+ \S+) Pacific Daylight Time \((\S+)/, // Current Time: 06/30/2018 00:00:07 Pacific Daylight Time (07:00 GMT)
				lastUpdated: /Last Updated: (\S+) on (\S+ \S+)/ // Last Updated: 2018-06-29T05:53:07Z on 06/28/2018 22:53:07 Pacific Daylight Time (05:53 GMT)
				// or: "Last Updated: 2017-02-04T18:39:52Z on 02/04/2017 10:39:52 (UTC-08:00) Pacific Time (US & Canada) (18:39 GMT)"
				// or: "Last Updated: 8 months ago on 01/21/2017 20:06:47 (UTC-08:00) Pacific Time (US & Canada) (04:06 GMT)" //TODO
			},
			mOut = this.fnMatchPatterns(str, mPat),
			aDate, oDate, iOffsetMs;

		if (mOut.currentTime) {
			aDate = mOut.currentTime.split(/[/ :]/);
			iOffsetMs = Number("+7") * 3600 * 1000; // hr to ms
			oDate = new Date(Date.UTC(aDate[2], aDate[0] - 1, aDate[1], aDate[3], aDate[4], aDate[5]) + iOffsetMs);
			mOut.currentTime = oDate.toISOString().replace(".000Z", "Z");
		}
		return mOut;
	},
	fnVariables: function (str) { // Find Variables (x=) and set them to <number> or 0
		var that = this;

		str = str.replace(/([A-Za-z]\w*)[ ]*=[ ]*([0-9]*)([^#=\n]*)/g, function (match, p1, p2, p3) {
			//match += "\n" + p1 + "=" + ((p2.length > 0) ? p2 : "0") + " #" + ((p3.length > 0) ? (p3.replace(/x/g, "*")) : ""); // some guys write x for *
			match += "\n" + p1 + "=" + ((p2.length > 0) ? p2 : "0") + " #" + p3;
			that.mVariables[p1] = ((p2.length > 0) ? p2 : "0");
			return match;
		});
		return str;
	},
	fnWaypoints: function (str) {
		var that = this,
			iWpIndex = 1;

		if (!that.fnEndsWith(str, "\n")) {
			str += "\n";
		}
		//str = str.replace(/N\s*(\S+)°\s*(\S+)[.,]\s*(\S+)[\s#]+E\s*(\S+)°\s*(\S+)[.,]\s*(\S+)[#\n ]/g, function (sMatch) { // varargs
		str = str.replace(/N\s*(\S+)°\s*(\S+)\s*[.,]\s*(\S+)[\s]+E\s*(\S+)°\s*(\S+)\s*[.,]\s*(\S+)([#\n ])/g, function (sMatch) { // varargs
			var aArgs = [],
				iLength, sArg, aRes, i, sRemain;

			iLength = Math.min(arguments.length, 6 + 1); // we need at most 6 arguments starting with index 1
			for (i = 1; i < iLength; i += 1) {
				sArg = arguments[i];
				sArg = sArg.toString().replace(/['"]/, ""); // remove apostropthes, quotes
				if (/^\d+$/.test(sArg)) { // number?
					aArgs.push(sArg);
				} else if (sArg in that.mVariables) { // variable?
					aArgs.push('" ' + sArg + ' "');
				} else { // e.g. expression
					aRes = sArg.match(/^(\d+)(\w+)$/); // number and variable?
					if (aRes) {
						aArgs.push(aRes[1] + '" (' + aRes[2] + ') "');
					} else {
						aArgs.push('" (' + sArg + ') "');
					}
				}
			}
			sArg = "N " + aArgs[0] + "° " + aArgs[1] + "." + aArgs[2] + " E " + aArgs[3] + "° " + aArgs[4] + "." + aArgs[5];
			if (sArg.indexOf('"') >= 0) {
				sArg = '["' + sArg + '"]';
			} else {
				sArg = '"' + sArg + '"';
			}
			sMatch = sMatch.trim();
			if (!that.fnEndsWith(sMatch, "\n")) {
				sMatch += "\n";
			}
			//sMatch += "$W" + iWpIndex + "=" + sArg + "\n#";
			sRemain = arguments[7];
			if (sRemain === " ") {
				sRemain = "\n#";
			}
			sMatch += "$W" + iWpIndex + "=" + sArg + sRemain;
			iWpIndex += 1;
			return sMatch;
		});
		return str;
	},
	fnPrefixHash: function (str) {
		// Prefix lines with hash (if not already there)
		str = "#" + str.replace(/\n(?!#)/g, "\n#");
		return str;
	},
	fnRot13: function (s) {
		return s.toString().replace(/[A-Za-z]/g, function (c) {
			return String.fromCharCode(c.charCodeAt(0) + (c.toUpperCase() <= "M" ? 13 : -13));
		});
	},
	fnRot13WithBrackets: function (s) { // keep text in brackets []
		var that = this,
			aStr = s.toString().split(/(\[|\])/),
			iNestingLevel = 0;

		aStr = aStr.map(function (s1) {
			if (s1 === "[") {
				iNestingLevel += 1;
			} else if (s1 === "]") {
				iNestingLevel -= 1;
			} else if (!iNestingLevel) {
				s1 = that.fnRot13(s1);
			}
			return s1;
		});

		return aStr.join("");
	},
	fnHints: function (str) {
		var aHints = str.match(/\((Decrypt|Encrypt|No hints available.)\)\n/);

		if (aHints) {
			str = str.substr(aHints[0].length); // remove matched part
			if (aHints[1] === "Decrypt") {
				str = this.fnRot13WithBrackets(str);
			} else if (aHints[1] === "No hints available.") {
				// no "decryption key" section
				Utils.objectAssign(this.mInfo, this.fnFindLoggedInfo(str));
				str = "#" + aHints[1];
			}
		} else {
			window.console.warn("Unknown hint section: " + str);
		}
		return str;
	},
	fnLogs: function (str) {
		var oPat1 = /\nView Log|\nView \/ Edit Log/,
			// "View Log", "View / Edit Log / Images   Upload Image": end marker for log entry / own log entry
			oPat2 = /\n([^\n]+)\n\[(Member|Premium Member)\][^\n]*\n\[Caches Found\] (\d*)\n([^\n]*)\n([^\n]*)\n/,
			// "<cacher name can contain spaces, parenthesis>\n[Premium Member] Premium Member\n[Caches Found] 4509\nFound it Found it\n06/23/2018"
			// oPat2a = /#(\S+)\n#.(Member|Premium Member)\n.[^\n]*\n#.(\d*)\n#. ([^\n]*)\n#([^\n]*)\n/,
			// Chrome on Android: <cacher>\n?Premium Member\n?\n?903\n? Found it\n07/01/2018
			oPat2a = /\n([^\n]+)\n(Member|Premium Member)[^\n]*\nCaches Found(\d*)\n([^\n]*)(\d{2}\/\d{2}\/\d{4})\n/,
			// Chrome on Android:
			mTypeMap = {
				"Found it": "found",
				"Didn't find it": "not found",
				"Needs Maintenance": "maintenance",
				"Write note": "note"
			},
			aOut = [],
			aLogs, mFind, sType;

		aLogs = str.split(oPat1);
		aLogs.forEach(function (sLog, iLogEntry) {
			mFind = oPat2.exec(sLog);
			if (!mFind) {
				mFind = oPat2a.exec(sLog); // try Chrome for Android pattern
			}
			if (mFind) {
				sType = mFind[4];
				sType = sType.substr(0, sType.length / 2).trim(); // keep first part of repeated string, e.g. "Found it Found it"
				sType = (mTypeMap[sType]) ? mTypeMap[sType] : sType;
				aOut.push({
					name: mFind[1],
					premium: (mFind[2] === "Premium Member"),
					finds: mFind[3],
					type: sType,
					date: (mFind[5] || "").replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2"),
					text: sLog.substring(mFind.index + mFind[0].length)
				});
			} else {
				window.console.log("fnLogs: Cannot parse entry " + iLogEntry + ": " + sLog);
			}
		});
		return {
			logs: aOut
		};
	},
	processPart: function (sSectionName, sInput) {
		var sOutput = "";

		switch (sSectionName) {
		case "Skip to Content":
			Utils.objectAssign(this.mInfo, this.fnFindInfo(sInput));
			break;
		case "Geocache Description:":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			sOutput = "#" + sSectionName + "\n" + sOutput;
			break;
		case "Additional Hints":
			sOutput = "#" + sSectionName + "\n" + this.fnPrefixHash(this.fnHints(sInput));
			break;
		case "Decryption Key": // section present only if hints available
			Utils.objectAssign(this.mInfo, this.fnFindLoggedInfo(sInput));
			break;
		case "Additional Waypoints":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			sOutput = "#" + sSectionName + "\n" + sOutput;
			break;
		case "View Larger Map":
			break;
			/*
		case "Logged Visits": // 83 Logged Visits
			Utils.objectAssign(this.mInfo, this.fnLogs(sInput));
			break;
			*/
		case "Current Time:": // section name is also used for key, so put it in front...
			if (sInput.indexOf("#") === 0) {
				sInput = sInput.substr(1); // remove first "#"
			}
			Utils.objectAssign(this.mInfo, this.fnFindFooterInfo("#" + sSectionName + " " + sInput)); // add space which was removed
			break;
		case "_ONEPART":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			break;
		default:
			if (this.fnEndsWith(sSectionName, "Logged Visits")) { // 83 Logged Visits
				Utils.objectAssign(this.mInfo, this.fnLogs(sInput));
			} else {
				window.console.warn("Unknown part: " + sSectionName);
				sOutput = this.fnPrefixHash(sInput);
			}
			break;
		}
		if (sOutput !== "") {
			if (!this.fnEndsWith(sOutput, "\n")) {
				sOutput += "\n";
			}
		}
		return sOutput;
	},
	processSection: function (sSectionName, sInput) {
		var sOutput = "",
			aPart, iIndex, sStr;

		sInput = sInput.trim();
		/*
		if (sInput !== "" && !this.fnEndsWith(sInput, "\n")) {
			sInput += "\n";
		}
		*/
		aPart = ("\n" + sInput).split(/((?:\n#[^\n]*)+)/);
		for (iIndex = 0; iIndex < aPart.length; iIndex += 1) {
			sStr = aPart[iIndex].substr(1); // remove leading \n
			if (sStr === "") {
				// nothing
			} else if (sStr.indexOf("#") === 0) {
				sOutput += sStr + "\n"; // keep commented parts
			} else {
				sStr = this.processPart(sSectionName, sStr);
				if (sStr) {
					sOutput += sStr; // + "#\n";
				}
			}
		}
		return sOutput;
	},
	processText: function (sInput) {
		var oRe1 = new RegExp("\\n(Skip to Content|Geocache Description:|Additional Hints|Decryption Key|Additional Waypoints|View Larger Map|\\d+ Logged Visits|Current Time:)"),
			sOutput = "",
			mInfo = this.mInfo,
			aParts,	sSectionName, iIndex;

		// replace all kinds of spaces by an ordinary space but keep ""\n"
		sInput = sInput.replace(/[^\S\n]/g, " "); // use double negative to keep \n

		// multi line trim
		sInput = sInput.replace(/\s*\n\s*/gm, "\n");

		// find parts
		aParts = ("\n" + sInput).split(oRe1);
		aParts[0] = aParts[0].substr(1); // remove leading "\n"
		if (aParts.length === 1) {
			aParts.unshift("_ONEPART");
		}
		iIndex = 0;
		sSectionName = "";
		while (iIndex < aParts.length) {
			if (!sSectionName) {
				sSectionName = aParts[iIndex];
				// section "names" starting with dash or newline inside are ignored
				if (sSectionName.indexOf("#") === 0 || sSectionName.indexOf("\n") >= 0) {
					sSectionName = "";
				}
			} else {
				sOutput += this.processSection(sSectionName, aParts[iIndex]);
				sSectionName = "";
			}
			iIndex += 1;
		}
		sOutput = this.fnFixScript(sOutput, this.options.scriptParser);
		if (sOutput === "") {
			sOutput = sInput;
			window.console.log("No sections found. Already preprocessed?");
		}
		mInfo.script = sOutput;
		return mInfo;
	}
};
// end
