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
	// Find undefined variables and put them on top of the script
	fnFixScript: function (script, scriptParser) {
		var oVars = {},
			sVariables = "",
			iMaxRuns = 100, // no endless loop, if something goes wrong
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
				iMaxRuns -= 1;
			} while (oError && iMaxRuns);
		}
		return sVariables + script;
	},

	// aPat = list of patterns in order; every pattern with at least one parenthesis to return match
	fnMatchPatterns: function (str, aPat) {
		var mOut = {},
			s2 = str,
			i, rPat, aRes, aGroup, j, sKey, sVal;

		for (i = 0; i < aPat.length; i += 1) {
			rPat = aPat[i];
			if (rPat.startIndex || rPat.startIndex === 0) {
				s2 = str.substring(rPat.startIndex); // make it possible to restart from beginning
			}
			if (rPat.defaults) {
				for (sKey in rPat.defaults) {
					if (rPat.defaults.hasOwnProperty(sKey)) {
						mOut[sKey] = rPat.defaults[sKey];
					}
				}
			}
			aRes = s2.match(rPat.pattern);
			if (aRes === null) {
				aRes = "";
			}
			if (aRes) {
				aGroup = rPat.groups.split(",");
				for (j = 0; j < aGroup.length; j += 1) {
					sKey = aGroup[j];
					sVal = aRes[j + 1];
					if (rPat.formatter && rPat.formatter[sKey]) {
						sVal = rPat.formatter[sKey](sVal);
					}
					mOut[sKey] = sVal;
				}
				s2 = s2.substring(aRes.index + aRes[0].length);
			}
		}
		return mOut;
	},
	fnFindInfo: function (str) {
		var aPat = [
				{
					pattern: /\nYour profile photo[\s\n]?(.+?)[\s\n]?([\d,]+) Finds/, // Your profile photo xxx 2,005 Finds
					groups: "name,finds",
					formatter: {
						finds: function (sVal) {
							return parseFloat(sVal.replace(",", "")); // remove decimal separator
						}
					}
				},
				{
					pattern: /\n(GC\w+)[^\n]*\n([^\n ]*)[^\n]*\n([^\n]*)/, // GCxxx ▼\nTraditional Geocache\nTitle
					// Traditional Geocache, Mystery Cache,...
					groups: "id,type,title",
					formatter: {
						type: function (sVal) {
							return sVal.toLowerCase();
						}
					}
				},
				{
					pattern: /\nA cache by ([^\n]*)[\s\n]Message this owner/, // A cache by xxx Message...
					groups: "owner"
				},
				{
					pattern: /Hidden : (\d{2}\/\d{2}\/\d{4})/, // Hidden : mm/dd/yyyy
					groups: "hidden",
					formatter: {
						hidden: function (sVal) {
							return sVal.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2");
						}
					}
				},
				{
					pattern: /\nDifficulty:[\s\n]*([\d.]+)/, // Difficulty:\n	2 out of 5
					groups: "difficulty",
					formatter: {
						difficulty: function (sVal) {
							return parseFloat(sVal);
						}
					}
				},
				{
					pattern: /\nTerrain:[\s\n]*([\d.]+)/, // Terrain:\n  1.5 out of 5
					groups: "terrain",
					formatter: {
						terrain: function (sVal) {
							return parseFloat(sVal);
						}
					}
				},
				{
					pattern: /\nSize: Size: (\w+)/, // Size: Size: small (small)
					groups: "size"
				},
				{
					pattern: /\n(\d+) Favorites/, // 0 Favorites
					groups: "favorites",
					formatter: {
						favorites: function (sVal) {
							return parseFloat(sVal);
						}
					}
				},
				{
					pattern: /\n(N \d{2}° \d{2}\.\d{3} E \d{3}° \d{2}\.\d{3})/, // N xx° xx.xxx E xxx° xx.xxx
					groups: "waypoint"
				},
				{
					pattern: /\nIn ([^ ,]+), ([^\n ]*)\n/, // In Baden-Württemberg, Germany
					groups: "state,country"
				},
				{
					startIndex: 0, // start from beginning
					pattern: /\nThis cache has been (archived)/, // This cache has been archived.
					groups: "archived",
					formatter: {
						archived: function (sVal) {
							return Boolean(sVal);
						}
					},
					defaults: {
						archived: false
					}
				},
				{
					startIndex: 0, // start from beginning
					pattern: /\nThis cache is temporarily (unavailable)/, // This cache is temporarily unavailable.
					groups: "available",
					formatter: {
						available: function (sVal) {
							return !sVal;
						}
					},
					defaults: {
						available: true
					}
				},
				{
					startIndex: 0, // start from beginning
					pattern: /\nThis is a (Premium) Member Only cache/, // This is a Premium Member Only cache.
					groups: "premium",
					formatter: {
						premium: function (sVal) {
							return Boolean(sVal);
						}
					},
					defaults: {
						premium: false
					}
				}
			],
			mOut;

		mOut = this.fnMatchPatterns(str, aPat);
		return mOut;
	},
	fnFindLoggedInfo: function (str) {
		var aPat = [
				{
					pattern: /\n(Did Not Find|Found It!)\nLogged on: (\d{2}\/\d{2}\/\d{4})/, // Did Not Find\nLogged on: 06/06/2018	 (if no log, simply: "Log geocache")
					groups: "log,loggedOn",
					formatter: {
						log: function (sVal) {
							if (sVal === "Found It!") {
								sVal = "found";
							} else if (sVal === "Did Not Find") {
								sVal = "not found";
							}
							return sVal;
						},
						loggedOn: function (sVal) {
							return sVal.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2");
						}
					}
				},
				{
					pattern: /\nView Gallery \((\d*)\)\n(Watch|Stop Watching) \((\d*)\)/, // View Gallery (3)\n  Watch (5)
					groups: "galleryCount,watching,watchCount",
					formatter: {
						galleryCount: function (sVal) {
							return parseFloat(sVal);
						},
						watching: function (sVal) {
							return sVal === "Stop Watching";
						},
						watchCount: function (sVal) {
							return parseFloat(sVal);
						}
					}
				}
			],
			mOut;

		mOut = this.fnMatchPatterns(str, aPat);
		return mOut;
	},
	fnFindFooterInfo: function (str) {
		var aPat = [
				{
					pattern: /\nCurrent Time: (\S+ \S+) Pacific Daylight Time \((\S+)/, // Current Time: 06/30/2018 00:00:07 Pacific Daylight Time (07:00 GMT)
					groups: "currentTime,currentGMTTime",
					formatter: {
						currentTime: function (sVal) {
							var aDate, oDate, iOffsetMs;

							aDate = sVal.split(/[/ :]/);
							iOffsetMs = Number("+7") * 3600 * 1000; // hr to ms
							oDate = new Date(Date.UTC(aDate[2], aDate[0] - 1, aDate[1], aDate[3], aDate[4], aDate[5]) + iOffsetMs);
							return oDate.toISOString().replace(".000Z", "Z");
						}
					}
				},
				{
					pattern: /Last Updated: (\S+) on (\S+ \S+)/, // Last Updated: 2018-06-29T05:53:07Z on 06/28/2018 22:53:07 Pacific Daylight Time (05:53 GMT)
					// or: "Last Updated: 2017-02-04T18:39:52Z on 02/04/2017 10:39:52 (UTC-08:00) Pacific Time (US & Canada) (18:39 GMT)"
					// or: "Last Updated: 8 months ago on 01/21/2017 20:06:47 (UTC-08:00) Pacific Time (US & Canada) (04:06 GMT)" //TODO
					groups: "lastUpdated"
				}
			],
			mOut;

		mOut = this.fnMatchPatterns(str, aPat);
		return mOut;
	},
	fnVariables: function (str) { // Find Variables (x=) and set them to <number>, <expression> or 0
		var sOut = "",
			aLines, iLine, aParts, iLengthMinus1, i, sLeft, sRight, aMatchLeft, aMatchRight, aMatchRight2;

		aLines = str.split("\n");
		for (iLine = 0; iLine < aLines.length; iLine += 1) {
			aParts = aLines[iLine].split("=");
			iLengthMinus1 = aParts.length - 1;
			for (i = 0; i < iLengthMinus1; i += 1) {
				sLeft = aParts[i];
				sRight = aParts[i + 1];
				aMatchLeft = sLeft.match(/([A-Za-z]\w*)[ ]*$/);
				if (aMatchLeft) {
					aMatchRight = sRight.match(/^[ ]*([0-9A-Za-z()]+(?:[ ]*[+\-*/][ ]*[0-9A-Za-z()]+)+)/); // expression with operand(s)?
					if (!aMatchRight) {
						aMatchRight = sRight.match(/^[ ]*([0-9]+)/); // just a number?
					}
					aMatchRight2 = sRight.match(/([A-Za-z]\w*)[ ]*$/);
					if (((i + 1) < iLengthMinus1) && aMatchRight2) {
						sLeft += "=" + Utils.stringTrimRight(sRight.substring(0, aMatchRight2.index)) + "\n" + aMatchLeft[1];
						sRight = ((aMatchRight) ? Utils.stringTrimRight(aMatchRight[1]) : "0") + "\n#" + sRight.substring(aMatchRight2.index);
					} else {
						sLeft += "=" + sRight + "\n" + aMatchLeft[1];
						sRight = ((aMatchRight) ? Utils.stringTrimRight(aMatchRight[1]) : "0");
					}
					sOut += sLeft + "=";
				} else {
					sOut += sLeft + "\n#=";
				}
				aParts[i + 1] = sRight;
			}
			sOut += aParts[i] + "\n";
		}
		return sOut;
	},
	fnWaypoints: function (str) {
		var that = this,
			sExpression = "[ ]*([0-9A-Za-z()\\[\\]+\\-*/]+)[ ]*",
			rWaypoint = new RegExp("N" + sExpression + "°" + sExpression + "[.,]" + sExpression + "(?:\\n#)?E" + sExpression + "°" + sExpression + "[.,]" + sExpression + "([#\\n ])", "g"),
			iWpIndex = 1;

		if (!Utils.stringEndsWith(str, "\n")) {
			str += "\n";
		}

		str = str.replace(rWaypoint, function (sMatch) { // varargs
			var aArgs = [],
				iLength, sArg, aRes, i, sRemain;

			iLength = Math.min(arguments.length, 6 + 1); // we need at most 6 arguments starting with index 1
			for (i = 1; i < iLength; i += 1) {
				sArg = arguments[i];
				sArg = String(sArg).replace(/['"]/, ""); // remove apostropthes, quotes
				if (i === iLength - 1) { // last argument?
					if (Utils.stringEndsWith(sArg, ")") && sArg.indexOf("(") < 0) { // sometimes a waypoint is surrounded by parenthesis, remove closing parenthesis
						sArg = sArg.substring(0, sArg.length - 1);
					}
				}
				if (/^\d+$/.test(sArg)) { // number?
					// sArg
				} else if (sArg in that.mVariables) { // variable?
					sArg = '" ' + sArg + ' "';
				} else { // e.g. expression
					aRes = sArg.match(/^(\d+)(\w+)$/); // number and variable?
					if (aRes) {
						sArg = aRes[1] + '" ' + aRes[2] + ' "';
					} else if (sArg.match(/^\(.*\)$/)) { // surroundes by parenthesis?
						sArg = '" ' + sArg + ' "';
					} else {
						sArg = '" ' + sArg + ' "';
					}
				}
				aArgs.push(sArg);
			}
			sArg = "N " + aArgs[0] + "° " + aArgs[1] + "." + aArgs[2] + " E " + aArgs[3] + "° " + aArgs[4] + "." + aArgs[5];
			if (sArg.indexOf('"') >= 0) {
				sArg = '["' + sArg + '"]';
			} else {
				sArg = '"' + sArg + '"';
			}
			sArg = sArg.replace(/\s*""\s*/, ""); // remove double quotes
			sMatch = sMatch.trim();
			if (!Utils.stringEndsWith(sMatch, "\n")) {
				sMatch += "\n";
			}
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
		return String(s).replace(/[A-Za-z]/g, function (c) {
			return String.fromCharCode(c.charCodeAt(0) + (c.toUpperCase() <= "M" ? 13 : -13));
		});
	},
	fnRot13WithBrackets: function (s) { // keep text in brackets []
		var that = this,
			aStr = String(s).split(/(\[|\])/),
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
		var aHints = str.match(/\((Decrypt|Encrypt|No hints available.)\)\n?/);

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
		var mTypeMap = {
				"Found it": "found",
				"Didn't find it": "not found",
				"Needs Maintenance": "maintenance",
				"Write note": "note",
				"Publish Listing": "published"
			},
			oPat1 = /\nView Log\n|\nView \/ Edit Log[^\n]*\n/,
			// "View Log", "View / Edit Log / Images   Upload Image": end marker for log entry / own log entry
			aPat2 = [
				{
					pattern: /\n([^\n]+)\n\[?(Member|Premium Member|Reviewer)/,
					// example entry from Firefox: xxx\n[Premium Member] Premium Member\nProfile photo for xxx\n[Caches Found] 279\nDidn't find itDidn't find it\n08/05/2018\n
					// example entry from Google: xxx\n\nPremium MemberPremium Member\nProfile photo for xxx\nCaches Found279\nDidn't find itDidn't find it\n08/05/2018\n
					// example: xxx\n[Reviewer] Reviewer\nProfile photo for xxx\n[Caches Found] 25\nPublish ListingPublish Listing\n07/22/2018\nPublished
					// Note: Cacher name xxx can contain spaces, parenthesis
					groups: "name,premium",
					formatter: {
						premium: function (sVal) {
							return (sVal === "Premium Member");
						}
					}
				},
				{
					pattern: /\n\[?Caches Found\]? ?(\d*)\n([^\n]*)\n?(\d{2}\/\d{2}\/\d{4})\n([\s\S]*)/, // continued
					groups: "finds,type,date,text",
					formatter: {
						finds: function (sVal) {
							return parseFloat(sVal);
						},
						type: function (sVal) {
							sVal = sVal.substr(0, sVal.length / 2).trim(); // keep first part of repeated string, e.g. "Found it Found it"
							sVal = (mTypeMap[sVal]) ? mTypeMap[sVal] : sVal;
							return sVal;
						},
						date: function (sVal) {
							return sVal.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2");
						}
					}
				}
			],
			aOut = [],
			aLogs, i, sLog, mOut;

		if (!Utils.stringEndsWith(str, "\n")) {
			str += "\n";
		}
		aLogs = str.split(oPat1);
		for (i = 0; i < aLogs.length; i += 1) {
			sLog = aLogs[i];
			if (sLog) {
				mOut = this.fnMatchPatterns("\n" + sLog, aPat2);
				if (Object.keys(mOut).length > 0) {
					aOut.push(mOut);
				} else {
					window.console.log("fnLogs: Cannot parse log entry " + i + ": " + sLog);
				}
			}
		}
		return {
			logs: aOut
		};
	},
	processPart: function (sSectionName, sInput) {
		var sOutput = "";

		switch (sSectionName) {
		case "Skip to Content":
			Utils.objectAssign(this.mInfo, this.fnFindInfo("\n" + sInput));
			break;
		case "Geocache Description:":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			sOutput = "#" + sSectionName + "\n" + sOutput;
			break;
		case "Additional Hints":
			sOutput = "#" + sSectionName + "\n" + this.fnPrefixHash(this.fnHints("\n" + sInput));
			break;
		case "Decryption Key": // section present only if hints available
			Utils.objectAssign(this.mInfo, this.fnFindLoggedInfo("\n" + sInput));
			break;
		case "Additional Waypoints":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			sOutput = "#" + sSectionName + "\n" + sOutput;
			break;
		case "View Larger Map":
			break;
		case "Current Time:": // section name is also used for key, so put it in front...
			if (sInput.indexOf("#") === 0) {
				sInput = sInput.substr(1); // remove first "#"
			}
			Utils.objectAssign(this.mInfo, this.fnFindFooterInfo("\n" + sSectionName + " " + sInput)); // add space which was removed
			break;
		case "_ONEPART":
			sOutput = this.fnPrefixHash(sInput);
			sOutput = this.fnVariables(sOutput);
			sOutput = this.fnWaypoints(sOutput);
			break;
		default:
			if (Utils.stringEndsWith(sSectionName, "Logged Visits")) { // 83 Logged Visits
				Utils.objectAssign(this.mInfo, this.fnLogs("\n" + sInput));
			} else {
				window.console.warn("Unknown part: " + sSectionName);
				sOutput = this.fnPrefixHash(sInput);
			}
			break;
		}
		if (sOutput !== "") {
			if (!Utils.stringEndsWith(sOutput, "\n")) {
				sOutput += "\n";
			}
		}
		return sOutput;
	},
	processSection: function (sSectionName, sInput) {
		var sOutput = "",
			aPart, iIndex, sStr;

		sInput = sInput.trim();
		if (Utils.stringEndsWith(sSectionName, "Logged Visits")) { // not for section xx Logged Visits
			aPart = ["\n" + sInput];
		} else {
			aPart = ("\n" + sInput).split(/((?:\n#[^\n]*)+)/); // split into commented and uncommented parts
		}
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

		// replace Unicode dash by minus (dash and minus are hard to distinguish, sometimes dash is written in formulas instead of minus)
		sInput = sInput.replace("\u2013", "-");

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
