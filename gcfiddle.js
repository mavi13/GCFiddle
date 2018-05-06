// gcfiddle.js - GCFiddle
// (c) mavi13, 2018
// https://mavi13.github.io/GCFiddle/
//
/* globals window, document, MapProxy */ // make ESlint happy

"use strict";

var gDebug,
	gcFiddleExternalConfig, // set in gcconfig.js
	gcFiddle = {
		config: {
			debug: 0,
			category: "test", // test, tofind, found, archived, saved
			example: "GCNEW1", // GCNEW1, GCTEST1, GCJVT3
			showInput: true,
			showOutput: true,
			showVariable: true,
			showNotes: true,
			showWaypoint: true,
			showMap: true,
			showConsole: false, // for debugging
			variableType: "number", // number, text, range
			positionFormat: "dmm", // position output format: dmm, dms, dd
			mapboxKey: "", // mapbox access token (for leaflet maps)
			mapType: "simple", // simple, google, leaflet, openlayers
			googleKey: "", // Google API key
			zoom: 15, // default zoom level
			leafletUrl: "https://unpkg.com/leaflet@1.3.1/dist/leaflet.js",
			openLayersUrl: "https://cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js"
		},
		initialConfig: null,
		mapProxy: { },
		maFa: null,
		categories: { },
		examples: { },
		variables: {
			gcfOriginal: { }
		},
		inputStack: null
	},
	Utils;

//
// Utilities
//
// see: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript?rq=1
function hereDoc(fn) {
	return fn.toString().
		replace(/^[^/]+\/\*\S*/, "").
		replace(/\*\/[^/]+$/, "");
}

function getLoadedFile() {
	var sFile = "";

	try {
		throw new Error("getStackTrace");
	} catch (e) {
		sFile = e.stack.trim().split("\n").pop();
		// e.g. Google Chrome: "file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"; Firefox: "@file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"
	}
	return sFile;
}

// if category is not specified it is extracted from the filename in the call stack
function parseExample(input, category) {
	var sInput = (typeof input === "string") ? input.trim() : hereDoc(input).trim(),
		sLine = sInput.split("\n", 1)[0],
		aParts = sLine.match(/^#([\w\d]+)\s*:\s*(.+)/),
		sKey, sTitle;

	if (aParts) {
		sKey = aParts[1];
		sTitle = aParts[2];
	} else {
		window.console.warn("parseExample: Example must start with #<id>: <title>");
		sKey = "GCTEMPLATE";
		sTitle = "Template Title";
		sInput = "#" + sKey + ": " + sTitle + "\n" + sInput;
	}

	if (!category) {
		sLine = getLoadedFile();
		aParts = sLine.match(/(\w+)\/(\w+)\.js/);
		if (aParts) {
			category = aParts[1];
			if ((sKey !== aParts[2]) && aParts[2] !== "0index") {
				window.console.warn("parseExample: different example keys found: " + sKey + " <> " + aParts[2]);
			}
		}
	}
	return {
		category: category,
		key: sKey,
		title: sTitle,
		input: sInput
	};
}

// called also from files GCxxxxx.js
// if category is not specified it is extracted from the filename in the call stack
function addExample(input, category) {
	var oItem = parseExample(input, category);

	window.console.log("addExample: category=" + oItem.category + "(" + gcFiddle.config.category + ") key=" + oItem.key);
	if (gcFiddle.examples[oItem.category]) {
		gcFiddle.examples[oItem.category][oItem.key] = oItem.input;
	} else {
		window.console.error("Unknown category: " + oItem.category);
	}
	return oItem;
}

// called also from file 0index.js
// if category is not specified it is extracted from the filename in the call stack
function setExampleIndex(input, category) {
	var sInput = (typeof input === "string") ? input.trim() : hereDoc(input).trim(),
		aLines,
		mItems = {};

	if (sInput) {
		aLines = sInput.split("\n");
		aLines.forEach(function(sLine) {
			var oItem = parseExample(sLine, category);

			if (!category) {
				category = oItem.category;
			}
			mItems[oItem.key] = {
				title: oItem.title
			};
		});
	}

	gcFiddle.categories[category] = mItems;
	if (!gcFiddle.examples[category]) {
		gcFiddle.examples[category] = {};
	}
	return mItems;
}


Utils = {
	toRadians: function (deg) {
		return deg * Math.PI / 180;
	},
	toDegrees: function (rad) {
		return rad * 180 / Math.PI;
	},
	objectAssign: function (oTarget) { // varargs; Object.assign is ES6, not in IE
		var oTo = oTarget,
			i,
			oNextSource,
			sNextKey;

		for (i = 1; i < arguments.length; i += 1) {
			oNextSource = arguments[i];
			for (sNextKey in oNextSource) {
				if (oNextSource.hasOwnProperty(sNextKey)) {
					oTo[sNextKey] = oNextSource[sNextKey];
				}
			}
		}
		return oTo;
	},
	loadScript: function (url, callback, arg) {
		var script = document.createElement("script");

		script.type = "text/javascript";
		script.defer = "defer"; // only for IE
		script.async = true;
		if (script.readyState) { // IE
			script.onreadystatechange = function () {
				if (script.readyState === "loaded" || script.readyState === "complete") {
					script.onreadystatechange = null;
					return callback();
				}
				return null;
			};
		} else { // Others
			script.onload = function () {
				callback(arg);
			};
		}
		script.src = url;
		document.getElementsByTagName("head")[0].appendChild(script);
	},
	loadStyle: function (url, callback, arg) {
		var link = document.createElement("link");

		link.rel = "stylesheet";
		link.onload = function () {
			callback(arg);
		};
		link.href = url;
		document.getElementsByTagName("head")[0].appendChild(link);
	},
	getHidden: function (id) {
		return document.getElementById(id).hidden;
	},
	setHidden: function (id, hidden) {
		var element = document.getElementById(id),
			bHidden = element.hidden;

		element.hidden = hidden;
		return bHidden; // return old value
	},
	toogleHidden: function (id) {
		return this.setHidden(id, !this.getHidden(id));
	}
};


//
function strNumFormat(s, iLen, sFillChar) {
	var i;

	s = s.toString();
	if (sFillChar === null) {
		sFillChar = " ";
	}
	for (i = s.length; i < iLen; i += 1) {
		s = sFillChar + s;
	}
	return s;
}

function strZeroFormat(s, iLen) {
	return strNumFormat(s, iLen, "0");
}

// based on: http://www.movable-type.co.uk/scripts/latlong.html
// Latitude/longitude spherical geodesy tools
// (c) Chris Veness 2002-2016
function LatLng(lat, lng) {
	this.lat = Number(lat);
	this.lng = Number(lng);
}

LatLng.prototype = {
	distanceTo: function (point) {
		var radius = 6371e3,
			phi1 = Utils.toRadians(this.lat),
			lambda1 = Utils.toRadians(this.lng),
			phi2 = Utils.toRadians(point.lat),
			lambda2 = Utils.toRadians(point.lng),
			deltaphi = phi2 - phi1,
			deltalambda = lambda2 - lambda1,

			a = Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2),
			c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
			d = radius * c;

		return d;
	},
	bearingTo: function (point) {
		var phi1 = Utils.toRadians(this.lat),
			phi2 = Utils.toRadians(point.lat),
			deltalambda = Utils.toRadians(point.lng - this.lng),

			// see http://mathforum.org/library/drmath/view/55417.html
			y = Math.sin(deltalambda) * Math.cos(phi2),
			x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltalambda),
			theta = Math.atan2(y, x);

		return (Utils.toDegrees(theta) + 360) % 360;
	},
	destinationPoint: function (distance, bearing) {
		var radius = 6371e3, // see http://williams.best.vwh.net/avform.htm#LL
			delta = Number(distance) / radius, // angular distance in radians
			theta = Utils.toRadians(Number(bearing)),

			phi1 = Utils.toRadians(this.lat),
			lambda1 = Utils.toRadians(this.lng),

			sinphi1 = Math.sin(phi1),
			cosphi1 = Math.cos(phi1),
			sindelta = Math.sin(delta),
			cosdelta = Math.cos(delta),
			sintheta = Math.sin(theta),
			costheta = Math.cos(theta),

			sinphi2 = sinphi1 * cosdelta + cosphi1 * sindelta * costheta,
			phi2 = Math.asin(sinphi2),
			y = sintheta * sindelta * cosphi1,
			x = cosdelta - sinphi1 * sinphi2,
			lambda2 = lambda1 + Math.atan2(y, x);

		return new LatLng(Utils.toDegrees(phi2), (Utils.toDegrees(lambda2) + 540) % 360 - 180); // normalise to −180..+180°
	},
	intersection: function (p1, bearing1, p2, bearing2) { // no this used
		// see http://williams.best.vwh.net/avform.htm#Intersection
		var phi1 = Utils.toRadians(p1.lat),
			lambda1 = Utils.toRadians(p1.lng),
			phi2 = Utils.toRadians(p2.lat),
			lambda2 = Utils.toRadians(p2.lng),
			theta13 = Utils.toRadians(Number(bearing1)),
			theta23 = Utils.toRadians(Number(bearing2)),
			deltaphi = phi2 - phi1,
			deltalambda = lambda2 - lambda1,
			delta12, thetaa, thetab, theta12, theta21, alpha1, alpha2, alpha3, delta13, phi3, deltalambda13, lambda3;

		delta12 = 2 * Math.asin(Math.sqrt(Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2)
			+ Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2)));

		if (delta12 === 0) {
			return null;
		}

		// initial/final bearings between points
		thetaa = Math.acos((Math.sin(phi2) - Math.sin(phi1) * Math.cos(delta12)) / (Math.sin(delta12) * Math.cos(phi1)));
		if (isNaN(thetaa)) { // protect against rounding
			thetaa = 0;
		}
		thetab = Math.acos((Math.sin(phi1) - Math.sin(phi2) * Math.cos(delta12)) / (Math.sin(delta12) * Math.cos(phi2)));

		theta12 = Math.sin(lambda2 - lambda1) > 0 ? thetaa : 2 * Math.PI - thetaa;
		theta21 = Math.sin(lambda2 - lambda1) > 0 ? 2 * Math.PI - thetab : thetab;

		alpha1 = (theta13 - theta12 + Math.PI) % (2 * Math.PI) - Math.PI; // angle 2-1-3
		alpha2 = (theta21 - theta23 + Math.PI) % (2 * Math.PI) - Math.PI; // angle 1-2-3

		if (Math.sin(alpha1) === 0 && Math.sin(alpha2) === 0) { // infinite intersections
			return null;
		}
		if (Math.sin(alpha1) * Math.sin(alpha2) < 0) { // ambiguous intersection
			return null;
		}

		alpha3 = Math.acos(-Math.cos(alpha1) * Math.cos(alpha2) + Math.sin(alpha1) * Math.sin(alpha2) * Math.cos(delta12));
		delta13 = Math.atan2(Math.sin(delta12) * Math.sin(alpha1) * Math.sin(alpha2), Math.cos(alpha2) + Math.cos(alpha1) * Math.cos(alpha3));
		phi3 = Math.asin(Math.sin(phi1) * Math.cos(delta13) + Math.cos(phi1) * Math.sin(delta13) * Math.cos(theta13));
		deltalambda13 = Math.atan2(Math.sin(theta13) * Math.sin(delta13) * Math.cos(phi1), Math.cos(delta13) - Math.sin(phi1) * Math.sin(phi3));
		lambda3 = lambda1 + deltalambda13;

		return new LatLng(Utils.toDegrees(phi3), (Utils.toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
	},
	midpointTo: function(point) {
		var phi1 = Utils.toRadians(this.lat),
			lambda1 = Utils.toRadians(this.lng),
			phi2 = Utils.toRadians(point.lat),
			deltaLambda = Utils.toRadians(point.lng - this.lng),

			Bx = Math.cos(phi2) * Math.cos(deltaLambda),
			By = Math.cos(phi2) * Math.sin(deltaLambda),

			x = Math.sqrt((Math.cos(phi1) + Bx) * (Math.cos(phi1) + Bx) + By * By),
			y = Math.sin(phi1) + Math.sin(phi2),
			phi3 = Math.atan2(y, x),
			lambda3 = lambda1 + Math.atan2(By, Math.cos(phi1) + Bx);

		return new LatLng(Utils.toDegrees(phi3), (Utils.toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
	},
	parse: function (coord) {
		var lat = 0,
			lng = 0,
			aParts, bParseOk;

		function dmm2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+)°?\s*(\d+\.\d+)\s*(E|W)\s*(\d+)°?\s*(\d+\.\d+)/); // dmm
			if (aParts && aParts.length === 7) {
				lat = parseInt(aParts[2], 10) + parseFloat(aParts[3]) / 60;
				lng = parseInt(aParts[5], 10) + parseFloat(aParts[6]) / 60;
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[4] === "W") {
					lng = -lng;
				}
				return true;
			}
			return false;
		}

		function dms2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+)°?\s*(\d+)'\s*(\d+\.?\d*)"\s*(E|W)\s*(\d+)°?\s*(\d+)'\s*(\d+\.?\d*)"/);
			if (aParts && aParts.length === 9) {
				lat = parseInt(aParts[2], 10) + parseFloat(aParts[3]) / 60 + parseFloat(aParts[4]) / 3600;
				lng = parseInt(aParts[6], 10) + parseFloat(aParts[7]) / 60 + parseFloat(aParts[8]) / 3600;
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[5] === "W") {
					lng = -lng;
				}
				return true;
			}
			return false;
		}

		function dd2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+\.\d+)°?\s*(E|W)\s*(\d+\.\d+)°?$/);
			if (aParts && aParts.length === 5) {
				lat = parseFloat(aParts[2]);
				lng = parseFloat(aParts[4]);
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[3] === "W") {
					lng = -lng;
				}
				return true;
			}
			return false;
		}

		bParseOk = dmm2position() || dms2position() || dd2position();
		this.lat = lat;
		this.lng = lng;
		if (!bParseOk) {
			window.console.warn("parse2position: Do not know how to parse '" + coord + "'");
		}
		return this;
	},
	toString: function (format) {
		var sValue;

		function position2dmm(position) {
			var lat = Math.abs(position.lat),
				lng = Math.abs(position.lng),
				latNS = (position.lat >= 0) ? "N" : "S",
				lngEW = (position.lng >= 0) ? "E" : "W",
				latdeg = Math.floor(lat),
				latmin = (lat - latdeg) * 60,
				lngdeg = Math.floor(lng),
				lngmin = (lng - lngdeg) * 60;

			return latNS + " " + strZeroFormat(latdeg, 2) + "° " + strZeroFormat(latmin.toFixed(3), 6) + " " + lngEW + " " + strZeroFormat(lngdeg, 3) + "° " + strZeroFormat(lngmin.toFixed(3), 6);
		}

		function position2dms(position) {
			var lat = Math.abs(position.lat),
				lng = Math.abs(position.lng),
				latNS = (position.lat >= 0) ? "N" : "S",
				lngEW = (position.lng >= 0) ? "E" : "W",
				latdeg = Math.floor(lat),
				latmin = Math.floor((lat - latdeg) * 60),
				latsec = Math.round((lat - latdeg - latmin / 60) * 1000 * 3600) / 1000,
				lngdeg = Math.floor(lng),
				lngmin = Math.floor((lng - lngdeg) * 60),
				lngsec = Math.floor((lng - lngdeg - lngmin / 60) * 1000 * 3600) / 1000;

			return latNS + " " + strZeroFormat(latdeg, 2) + "° " + strZeroFormat(latmin, 2) + "' " + strZeroFormat(latsec.toFixed(2), 5) + "\" "
				+ lngEW + " " + strZeroFormat(lngdeg, 3) + "° " + strZeroFormat(lngmin, 2) + "' " + strZeroFormat(lngsec.toFixed(2), 5) + "\"";
		}

		function position2dd(position) {
			var latNS = (position.lat >= 0) ? "N" : "S",
				lngEW = (position.lng >= 0) ? "E" : "W",
				sDD;

			sDD = latNS + " " + strZeroFormat(position.lat.toFixed(5), 8) + "° " + lngEW + " " + strZeroFormat(position.lng.toFixed(5), 9) + "°";
			return sDD;
		}

		format = format || gcFiddle.config.positionFormat;
		switch (format) {
		case "dmm":
			sValue = position2dmm(this);
			break;
		case "dms":
			sValue = position2dms(this);
			break;
		case "dd":
			sValue = position2dd(this);
			break;
		default:
			window.console.warn("position2string: Unknown format", format);
		}
		return sValue;
	}
};


// based on: https://www.codeproject.com/Articles/345888/How-to-write-a-simple-interpreter-in-JavaScript
// (and: http://crockford.com/javascript/tdop/tdop.html ; test online: http://jsfiddle.net/h3xwj/embedded/result/)
// How to write a simple interpreter in JavaScript
// Peter_Olson, 30 Oct 2014
function ScriptParser() {
	return this;
}

ScriptParser.prototype = {
	lex: function (input) {
		var isComment = function (c) {
				return (/[#]/).test(c);
			},
			isOperator = function (c) {
				return (/[+\-*/^%=()[\],]/).test(c);
			},
			isDigit = function (c) {
				return (/[0-9]/).test(c);
			},
			isWhiteSpace = function (c) {
				return (/\s/).test(c);
			},
			isQuotes = function (c) {
				return (/["]/).test(c);
			},
			isNotQuotes = function (c) {
				return typeof c === "string" && !isQuotes(c);
			},
			isApostrophe = function (c) {
				return (/[']/).test(c);
			},
			isNotApostrophe = function (c) {
				return typeof c === "string" && !isApostrophe(c);
			},
			isIdentifier = function (c) {
				return typeof c === "string" && (/[$\w]/).test(c);
			},
			isFormatter = function (c) {
				return (/[:]/).test(c);
			},
			isNotFormatter = function (c) {
				return typeof c === "string" && (/[0#.]/).test(c);
			},
			isNotNewLine = function (c) {
				return typeof c === "string" && c !== "\n";
			},
			aTokens = [],
			sToken,
			sChar,
			iStartPos,
			iIndex = 0,

			advance = function () {
				iIndex += 1;
				return input[iIndex];
			},
			advanceWhile = function(fn) {
				var sToken2 = "";

				do {
					sToken2 += sChar;
					sChar = advance();
				} while (fn(sChar));
				return sToken2;
			},
			advanceWhileEscape = function(fn) {
				var sToken2 = "";

				do {
					if (sChar === "\\") {
						sChar = advance();
						if (sChar === "n") {
							sChar = "\n";
						}
					}
					sToken2 += sChar;
					sChar = advance();
				} while (fn(sChar));
				return sToken2;
			},
			addToken = function (type, value, iPos) {
				aTokens.push({
					type: type,
					value: value,
					pos: iPos
				});
			};

		while (iIndex < input.length) {
			iStartPos = iIndex;
			sChar = input[iIndex];
			if (isWhiteSpace(sChar)) {
				sChar = advance();
			} else if (isComment(sChar)) {
				advanceWhile(isNotNewLine);
			} else if (isOperator(sChar)) {
				addToken(sChar, 0, iStartPos);
				sChar = advance();
			} else if (isDigit(sChar)) {
				sToken = advanceWhile(isDigit);
				if (sChar === ".") {
					sToken += advanceWhile(isDigit);
				}
				sToken = parseFloat(sToken);
				if (!isFinite(sToken)) {
					throw new ScriptParser.ErrorObject("Number is too large or too small", sToken, iStartPos); // for a 64-bit double
				}
				addToken("number", sToken, iStartPos);
			} else if (isQuotes(sChar)) {
				sChar = "";
				sToken = advanceWhileEscape(isNotQuotes);
				addToken("string", sToken, iStartPos + 1);
				if (!isQuotes(sChar)) {
					throw new ScriptParser.ErrorObject("Unterminated string", sToken, iStartPos + 1);
				}
				sChar = advance();
			} else if (isApostrophe(sChar)) {
				sChar = "";
				sToken = advanceWhile(isNotApostrophe);
				addToken("string", sToken, iStartPos + 1);
				if (!isApostrophe(sChar)) {
					throw new ScriptParser.ErrorObject("Unterminated string", sToken, iStartPos + 1);
				}
				sChar = advance();
			} else if (isIdentifier(sChar)) {
				sToken = advanceWhile(isIdentifier);
				addToken("identifier", sToken, iStartPos);
			} else if (isFormatter(sChar)) {
				sChar = "";
				sToken = advanceWhile(isNotFormatter);
				addToken("formatter", sToken, iStartPos);
				if (!isFormatter(sChar)) {
					throw new ScriptParser.ErrorObject("Unterminated formatter", sToken, iStartPos + 1);
				}
				sChar = advance();
			} else {
				throw new ScriptParser.ErrorObject("Unrecognized token", sChar, iStartPos);
			}
		}
		addToken("(end)", 0, iIndex);
		return aTokens;
	},
	// http://crockford.com/javascript/tdop/tdop.html (old: http://javascript.crockford.com/tdop/tdop.html)
	// Operator precedence parsing
	// Operator: With left binding power (lbp) and operational function.
	// Manipulates tokens to its left (e.g: +)? => left denotative function (led), otherwise null denotative function (nud), (e.g. unary -)
	// identifiers, numbers: also nud.
	parse: function (tokens) {
		var oSymbols = {},
			iIndex = 0,
			aParseTree = [],

			symbol = function (id, nud, lbp, led) {
				var oSym = oSymbols[id] || {};

				oSymbols[id] = {
					lbp: oSym.lbp || lbp,
					nud: oSym.nud || nud,
					led: oSym.lef || led
				};
			},

			interpretToken = function (oToken) {
				var oSym;

				if (!oToken) {
					return null; // maybe EOF
				}
				oSym = Object.create(oSymbols[oToken.type]);
				oSym.type = oToken.type;
				oSym.value = oToken.value;
				oSym.pos = oToken.pos;
				return oSym;
			},

			token = function () {
				return interpretToken(tokens[iIndex]);
			},

			advance = function () {
				iIndex += 1;
				return token();
			},

			expression = function (rbp) {
				var left,
					t = token();

				if (gDebug && gDebug.level > 2) {
					gDebug.log("DEBUG: expression rbp=" + rbp + " type=" + t.type + " t=%o", t);
				}
				advance();
				if (!t.nud) {
					if (t.type === "(end)") {
						throw new ScriptParser.ErrorObject("Unexpected end of file", "", t.pos);
					} else {
						throw new ScriptParser.ErrorObject("Unexpected token", t.type, t.pos);
					}
				}
				left = t.nud(t);
				while (rbp < token().lbp) {
					t = token();
					advance();
					if (!t.led) {
						throw new ScriptParser.ErrorObject("Unexpected token", t.type, tokens[iIndex].pos);
					}
					left = t.led(left);
				}
				return left;
			},

			infix = function (id, lbp, rbp, led) {
				rbp = rbp || lbp;
				symbol(id, null, lbp, led || function (left) {
					return {
						type: id,
						left: left,
						right: expression(rbp)
					};
				});
			},
			prefix = function (id, rbp) {
				symbol(id, function () {
					return {
						type: id,
						right: expression(rbp)
					};
				});
			};

		symbol(",");
		symbol(")");
		symbol("]");
		symbol("(end)");

		symbol("number", function (number) {
			return number;
		});
		symbol("string", function (s) {
			return s;
		});
		symbol("identifier", function (oName) {
			var iParseIndex = iIndex,
				aArgs = [];

			if (token().type === "(") {
				if (tokens[iIndex + 1].type === ")") {
					advance();
				} else {
					do {
						advance();
						aArgs.push(expression(2));
					} while (token().type === ",");
					if (token().type !== ")") {
						throw new ScriptParser.ErrorObject("Expected closing parenthesis for function", ")", tokens[iParseIndex].pos);
					}
				}
				advance();
				return {
					type: "call",
					args: aArgs,
					name: oName.value,
					pos: tokens[iParseIndex - 1].pos
				};
			}
			return oName;
		});

		symbol("(", function () {
			var iParseIndex = iIndex,
				value = expression(2);

			if (token().type !== ")") {
				throw new ScriptParser.ErrorObject("Expected closing parenthesis", ")", tokens[iParseIndex].pos);
			}
			advance();
			return value;
		});

		symbol("[", function () {
			var iParseIndex = iIndex,
				oValue,
				aArgs = [];

			if (tokens[iIndex + 1].type === "]") {
				oValue = expression(2);
			} else {
				do {
					aArgs.push(expression(2));
				} while (token().type !== "]" && token().type !== "(end)");
				if (token().type !== "]") {
					throw new ScriptParser.ErrorObject("Expected closing bracket", "]", tokens[iParseIndex].pos);
				}
				oValue = {
					type: "call",
					args: aArgs,
					name: "concat",
					pos: tokens[iParseIndex - 1].pos
				};
			}
			advance();
			return oValue;
		});

		// sort of suffix function
		symbol("formatter", null, 3, function (left) {
			return {
				type: "formatter",
				value: tokens[iIndex - 1].value, //fast hack
				left: left
			};
		});

		prefix("-", 8);
		infix("^", 7, 6);
		infix("*", 5);
		infix("/", 5);
		infix("%", 5);
		infix("+", 4);
		infix("-", 4);

		infix("=", 1, 2, function (left) {
			var i, oObj;

			if (left.type === "call") {
				for (i = 0; i < left.args.length; i += 1) {
					if (left.args[i].type !== "identifier") {
						throw new ScriptParser.ErrorObject("Invalid argument " + (i + 1) + " for function", left.name, left.pos);
					}
				}
				oObj = {
					type: "function",
					name: left.name,
					args: left.args,
					value: expression(2),
					pos: left.pos
				};
			} else if (left.type === "identifier") {
				oObj = {
					type: "assign",
					name: left.value,
					value: expression(2),
					pos: left.pos
				};
			} else {
				oObj = tokens[iIndex - 1]; // or this
				throw new ScriptParser.ErrorObject("Invalid lvalue at", oObj.type, oObj.pos);
			}
			return oObj;
		});

		while (token().type !== "(end)") {
			aParseTree.push(expression(0));
		}
		return aParseTree;
	},
	//
	// evaluate
	//
	evaluate: function (parseTree, variables) {
		var sOutput = "",
			oOperators = {
				"+": function (a, b) {
					return Number(a) + Number(b);
				},
				"-": function (a, b) {
					if (b === undefined) {
						return -a;
					}
					return a - b;
				},
				"*": function (a, b) {
					return a * b;
				},
				"/": function (a, b) {
					return a / b;
				},
				"%": function (a, b) {
					return a % b;
				},
				"^": function (a, b) {
					return Math.pow(a, b);
				}
			},

			oFunctions = {
				concat: function () { // varargs
					var	s = "",
						i;

					for (i = 0; i < arguments.length; i += 1) {
						s += String(arguments[i]);
					}
					return s;
				},
				sin: function (degrees) {
					return Math.sin(Utils.toRadians(degrees));
				},
				cos: function (degrees) {
					return Math.cos(Utils.toRadians(degrees));
				},
				tan: function (degrees) {
					return Math.tan(Utils.toRadians(degrees));
				},
				asin: function (x) {
					return Utils.toDegrees(Math.asin(x));
				},
				acos: function (x) {
					return Utils.toDegrees(Math.acos(x));
				},
				atan: function (x) {
					return Utils.toDegrees(Math.atan(x));
				},
				abs: Math.abs,
				round: Math.round,
				ceil: Math.ceil,
				floor: Math.floor,
				"int": function (x) { return (x > 0) ? Math.floor(x) : Math.ceil(x); }, // ES6: Math.trunc
				// mod: or should it be... https://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
				mod: function (a, b) { return a % b; },
				log: Math.log,
				exp: Math.exp,
				sqrt: Math.sqrt,
				max: Math.max,
				min: Math.min,
				random: Math.random,

				// gcd (Euclid)
				gcd: function (a, b) {
					var h;

					while (b !== 0) {
						h = a % b;
						a = b;
						b = h;
					}
					return a;
				},

				// fib (Fibonacci)
				fib: function (x) {
					var fib = [
							0,
							1
						],
						i;

					for (i = 2; i <= x; i += 1) {
						fib[i] = fib[i - 2] + fib[i - 1];
					}
					return fib[x];
				},

				// r2d (rad2deg)
				r2d: function (radians) {
					return Utils.toDegrees(radians);
				},
				// d2r (deg2rad)
				d2r: function (degrees) {
					return Utils.toRadians(degrees);
				},

				bearing: function (w1, w2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2);

					return oPosition1.bearingTo(oPosition2);
				},
				// cb (crossbearing)
				cb: function (w1, angle1, w2, angle2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2),
						oPosition3,	sValue;

					oPosition3 = LatLng.prototype.intersection(oPosition1, angle1, oPosition2, angle2);
					sValue = oPosition3.toString();
					return sValue;
				},
				distance: function (w1, w2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2),
						nValue;

					nValue = oPosition1.distanceTo(oPosition2);
					return nValue;
				},
				project: function (w1, bearing, distance) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2,	sValue;

					oPosition2 = oPosition1.destinationPoint(distance, bearing); // order of arguments!
					sValue = oPosition2.toString();
					return sValue;
				},

				// midpoint(w1, w2): Same as: project(w1, bearing(w1, w2), distance(w1, w2) / 2)
				midpoint: function (w1, w2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2),
						oPosition3,	sValue;

					oPosition3 = oPosition1.midpointTo(oPosition2);
					sValue = oPosition3.toString();
					return sValue;
				},

				format: function (w1, format) {
					var oPosition = new LatLng().parse(w1),
						sValue;

					sValue = oPosition.toString(format);
					if (sValue === undefined) { // format not dmm, dms, dd
						throw new ScriptParser.ErrorObject("Unknown format", format, this.pos);
					}
					return sValue;
				},

				// ct (crosstotal)
				ct: function (x) {
					return x.toString().replace(/[^\d]/g, "").split("").reduce(
						function (iSum, sDigit) {
							return iSum + Number(sDigit);
						},
						0
					);
				},
				// cti (crosstotal iterated)
				cti: function (x) {
					do {
						x = oFunctions.ct(x);
					} while (x > 9);
					return x;
				},

				// val (value) for A-Z, a-z: 1-26
				val: function (s) {
					var iCodeBeforeA = "a".charCodeAt(0) - 1;

					return s.toString().toLowerCase().split("").reduce(
						function (sum, value) {
							var number = value.charCodeAt(0) - iCodeBeforeA;

							if ((number < 0) || (number > 26)) {
								number = 0;
							}
							return sum + number;
						},
						0
					);
				},

				// sval (s value) for A-Z, a-z: 01 02 03 ...
				sval: function (s) {
					var iCodeBeforeA = "a".charCodeAt(0) - 1,
						sOut = "",
						i;

					s = s.toString().toLowerCase().replace(/[^a-z]/g, "");
					for (i = 0; i < s.length; i += 1) {
						sOut += ((i > 0) ? " " : "") + oFunctions.zformat(s.charCodeAt(i) - iCodeBeforeA, 2);
					}
					return sOut;
				},

				// example rot13: sourceMap="NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm" destinatonMap="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
				// https://stackoverflow.com/questions/617647/where-is-my-one-line-implementation-of-rot13-in-javascript-going-wrong
				encode: function (s, sourceMap, destinatonMap) {
					var rSearch = new RegExp("[" + sourceMap + "]", "g");

					return s.replace(rSearch, function (c) {
						return destinatonMap.charAt(
							sourceMap.indexOf(c)
						);
					});
				},
				// ic(n) Ignore variable case (not implemented, we are case sensitive)
				ic: function () {
					return false;
				},
				// instr (indexOf with positions starting with 1), 'start' is optional
				instr: function (s, search, start) {
					return s.toString().indexOf(search, (start) ? (start - 1) : 0) + 1;
				},
				// count(s, c) Count number of characters/strings c in s
				// https://stackoverflow.com/questions/881085/count-the-number-of-occurrences-of-a-character-in-a-string-in-javascript
				count: function (s, c) {
					return (s.toString().match(new RegExp(c, "g")) || []).length;
				},
				// len (length)
				len: function (s) {
					return s.toString().length;
				},
				// mid (substr with positions starting with 1)
				mid: function (s, start, length) {
					return s.toString().substr(start - 1, length);
				},
				// uc (toUpperCase)  beware: toUpperCase converts 'ß' to 'SS'!
				uc: function (s) {
					return s.toString().toUpperCase();
				},
				// lc (toLowerCase)
				lc: function (s) {
					return s.toString().toLowerCase();
				},
				// replace all occurences
				replace: function (s, search, replace) {
					var oPattern = new RegExp(search, "g");

					return s.toString().replace(oPattern, replace);
				},
				reverse: function (s) {
					return s.toString().split("").reverse().join("");
				},
				rot13: function (s) {
					return s.toString().replace(/[A-Za-z]/g, function (c) {
						return String.fromCharCode(c.charCodeAt(0) + (c.toUpperCase() <= "M" ? 13 : -13));
					});
				},
				zformat: function (s, length) {
					var i;

					s = s.toString();
					for (i = s.length; i < length; i += 1) {
						s = "0" + s;
					}
					return s;
				},
				nformat: function (s, format) {
					var aFormat;

					if (format.indexOf(".") < 0) {
						s = Number(s).toFixed(0);
						s = oFunctions.zformat(s, format.length);
					} else { // assume 000.00
						aFormat = format.split(".", 2);
						s = Number(s).toFixed(aFormat[1].length);
						s = oFunctions.zformat(s, format.length);
					}
					return s;
				},
				// isEqual - or return 0,1?
				isEqual: function (a, b) {
					return a === b;
				},
				// getConst(): get constant
				getConst: function (name) {
					switch (name) {
					case "PI":
						return Math.PI;
					case "E":
						return Math.E;
					default:
						throw new ScriptParser.ErrorObject("Unknown constant", name, this.pos);
					}
				},
				parse: function (input) {
					var oVars = {},
						sOut = new ScriptParser().calculate(input, oVars),
						iEndPos;

					if (sOut instanceof ScriptParser.ErrorObject) {
						iEndPos = sOut.pos + sOut.value.toString().length;
						sOut = sOut.message + ": '" + sOut.value + "' (pos " + sOut.pos + "-" + iEndPos + ")";
					}
					return sOut;
				},
				// assert(c1, c2) (assertEqual: c1 === c2)
				assert: function (a, b) {
					if (a !== b) {
						throw new ScriptParser.ErrorObject("Assertion failed: '" + a + " != " + b + "'", "assert", this.pos);
					}
				},
				cls: function () {
					sOutput = "";
					return "";
				}
			},

			oArgs = { },

			parseNode = function (node) {
				var i,
					sValue,
					aNodeArgs;

				if (gDebug && gDebug.level > 2) {
					gDebug.log("DEBUG: parseNode node=%o type=" + node.type + " name=" + node.name + " value=" + node.value + " left=%o right=%o args=%o", node, node.left, node.right, node.args);
				}
				if (node.type === "number" || node.type === "string") {
					sValue = node.value;
				} else if (oOperators[node.type]) {
					if (node.left) {
						sValue = oOperators[node.type](parseNode(node.left), parseNode(node.right));
					} else {
						sValue = oOperators[node.type](parseNode(node.right));
					}
				} else if (node.type === "identifier") {
					sValue = oArgs.hasOwnProperty(node.value) ? oArgs[node.value] : variables[node.value];
					if (sValue === undefined) {
						throw new ScriptParser.ErrorObject("Variable is undefined", node.value, node.pos);
					}
				} else if (node.type === "assign") {
					sValue = parseNode(node.value);
					if (variables.gcfOriginal && variables.gcfOriginal[node.name] !== undefined && variables.gcfOriginal[node.name] !== variables[node.name]) {
						window.console.log("Variable is set to hold: " + node.name + "=" + variables[node.name] + " (" + sValue + ")");
						sValue = node.name + "=" + variables[node.name];
					} else {
						variables[node.name] = sValue;
						sValue = node.name + "=" + sValue;
					}
				} else if (node.type === "call") {
					aNodeArgs = []; // no not modify node.args here (could be parameter of defined function)
					for (i = 0; i < node.args.length; i += 1) {
						aNodeArgs[i] = parseNode(node.args[i]);
					}
					if (oFunctions[node.name] === undefined) {
						throw new ScriptParser.ErrorObject("Function is undefined", node.name, node.pos);
					}
					sValue = oFunctions[node.name].apply(node, aNodeArgs);
				} else if (node.type === "function") {
					oFunctions[node.name] = function () {
						for (i = 0; i < node.args.length; i += 1) {
							oArgs[node.args[i].value] = arguments[i];
						}
						sValue = parseNode(node.value);
						oArgs = {};
						return sValue;
					};
				} else if (node.type === "formatter") {
					sValue = parseNode(node.left);
					sValue = oFunctions.nformat(sValue, node.value);
				} else {
					window.console.error("parseNode node=%o unknown type=" + node.type, node);
					sValue = node;
				}
				return sValue;
			},

			i,
			sNode;

		for (i = 0; i < parseTree.length; i += 1) {
			if (gDebug && gDebug.level > 1) {
				gDebug.log("DEBUG: parseTree i=%d, node=%o", i, parseTree[i]);
			}
			sNode = parseNode(parseTree[i]);
			if ((sNode !== undefined) && (sNode !== "")) {
				sOutput += sNode + "\n";
			}
		}
		return sOutput;
	},
	calculate: function (input, variables) {
		var aTokens,
			aParseTree,
			sOutput;

		try {
			aTokens = this.lex(input);
			aParseTree = this.parse(aTokens);
			sOutput = this.evaluate(aParseTree, variables);
			return sOutput;
		} catch (e) {
			return e;
		}
	}
};


ScriptParser.ErrorObject = function (message, value, pos) {
	this.message = message;
	this.value = value;
	this.pos = pos;
};


//
// MarkerFactory: settings={draggable}
function MarkerFactory(options) {
	this.init(options);
}

MarkerFactory.prototype = {
	initMap: function (mapProxy) {
		var aMarkerOptions = [],
			oMarker, oMarkerOptions, i;

		if (mapProxy && mapProxy.getMap()) {
			this.mapProxy = mapProxy;
			for (i = 0; i < this.aMarkerList.length; i += 1) {
				oMarker = this.aMarkerList[i];
				if (oMarker) {
					aMarkerOptions.push(
						{
							position: oMarker.getPosition(),
							label: oMarker.getLabel(),
							title: oMarker.getTitle()
						}
					);
				}
			}
			this.deleteMarkers();
			this.deletePolyline();
			this.deleteInfoWindow();

			this.createInfoWindow();
			for (i = 0; i < aMarkerOptions.length; i += 1) {
				oMarkerOptions = aMarkerOptions[i];
				oMarkerOptions.infoWindow = this.infoWindow;
				this.setMarker(oMarkerOptions, i);
			}
			this.fitBounds();
			this.setPolyline();
			this.showMarkers();
		} else {
			this.mapProxy = null;
		}
	},
	init: function (options) {
		this.oCommonOptions = options;
		this.aMarkerList = [];
		this.initMap(null);
	},
	getMarkers: function () {
		return this.aMarkerList;
	},
	setMarker: function (options, i) {
		var oMarkerOptions = Utils.objectAssign({}, this.oCommonOptions, options),
			mapProxy = this.mapProxy,
			oMarker;

		if (!oMarkerOptions.label) {
			oMarkerOptions.label = strZeroFormat(i.toString(), 2);
		}
		if (!oMarkerOptions.title) {
			oMarkerOptions.title = "W" + oMarkerOptions.label;
		}

		oMarkerOptions.infoWindow = this.infoWindow;

		if (i >= this.aMarkerList.length) { // add new marker
			if (mapProxy) {
				oMarker = mapProxy.createMarker(oMarkerOptions);
				if (this.aMarkerList.length === 0) { // for the first marker
					this.setCenter(oMarker);
				}
			} else { // !map
				oMarker = Utils.objectAssign({
					getPosition: function () {
						return this.position;
					},
					getTitle: function () {
						return this.title;
					},
					getLabel: function () {
						return this.label;
					},
					getMap: function () {
						return this.map;
					},
					setMap: function (map) {
						this.map = map;
					}
				}, oMarkerOptions);
			}
		} else { // adapt existing marker
			oMarker = this.aMarkerList[i];
			if (oMarkerOptions.position) {
				oMarker.setPosition(oMarkerOptions.position);
			}
			if (oMarkerOptions.title) {
				oMarker.setTitle(oMarkerOptions.title);
			}
			if (oMarkerOptions.label) {
				oMarker.setLabel(oMarkerOptions.label);
			}
			if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
				this.infoWindow.setContent(oMarker);
			}
		}
		if (oMarker) {
			this.aMarkerList[i] = oMarker;
		}
	},
	setMapOnAllMarkers: function (mapProxy) {
		var map, oMarker, i;

		map = mapProxy ? mapProxy.getMap() : null;
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			oMarker = this.aMarkerList[i];
			if (oMarker && oMarker.getMap() !== map) {
				oMarker.setMap(map);
			}
		}
	},
	showMarkers: function () {
		this.setMapOnAllMarkers(this.mapProxy);
	},
	clearMarkers: function () {
		this.setMapOnAllMarkers(null);
	},
	deleteMarkers: function () {
		var oMarker, i;

		this.clearMarkers();
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			oMarker = this.aMarkerList[i];
			if (oMarker && oMarker.destroy) { // osm needed?
				oMarker.destroy();
			}
			this.aMarkerList[i] = null;
		}
		this.aMarkerList = [];
	},
	setCenter: function(marker) {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().setCenter(marker.getPosition());
		}
	},
	fitBounds: function () {
		var mapProxy = this.mapProxy,
			oBounds, i;

		if (mapProxy) {
			if (this.aMarkerList.length) {
				oBounds = mapProxy.createLatLngBounds();

				for (i = 0; i < this.aMarkerList.length; i += 1) {
					oBounds.extend(this.aMarkerList[i].getPosition());
				}
				mapProxy.getMap().fitBounds(oBounds);
			}
		}
	},
	resize: function () {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().resize();
		}
	},
	clearPolyline: function () {
		if (this.polyLine) {
			this.polyLine.setMap(null);
		}
	},
	deletePolyline: function () {
		this.clearPolyline();
		this.polyLine = null;
	},
	setPolyline: function () {
		var aList = [],
			mapProxy = this.mapProxy,
			oPolyLineOptions, i;

		if (mapProxy) {
			for (i = 0; i < this.aMarkerList.length; i += 1) {
				aList.push(this.aMarkerList[i].getPosition());
			}
			if (!this.polyLine) {
				oPolyLineOptions = {
					clickable: true,
					strokeColor: "red",
					strokeOpacity: 0.8,
					strokeWeight: 0.5
				};
				this.polyLine = mapProxy.createPolyline(oPolyLineOptions);
			}
			this.polyLine.setMap(mapProxy.getMap());
			this.polyLine.setPath(aList);
		}
	},
	deleteInfoWindow: function () {
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	},
	createInfoWindow: function () {
		var mapProxy = this.mapProxy,
			that = this;

		if (mapProxy) {
			this.infoWindow = mapProxy.createInfoWindow({
				onGetInfoWindowContent: function (marker) {
					var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
						sContent, oPreviousMarker, iIndex, oPosition1, oPosition2, iAngle, iDistance, sDirection;

					sContent = marker.getTitle() + ": " + marker.getPosition().toString();
					iIndex = that.aMarkerList.indexOf(marker);
					if (iIndex >= 1) {
						oPreviousMarker = that.aMarkerList[iIndex - 1];
						oPosition1 = oPreviousMarker.getPosition();
						oPosition2 = marker.getPosition();
						iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
						iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
						sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
						sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
					}
					return sContent;
				}
			});
		}
	}
};


//
//
function isWaypoint(s) {
	return s.indexOf("$") === 0; // waypoints start with "$"
}

function setMarkers(variables) {
	var i = 0,
		sPar, oSettings;

	for (sPar in variables) {
		if (variables.hasOwnProperty(sPar) && isWaypoint(sPar)) {
			oSettings = {
				position: new LatLng().parse(variables[sPar]),
				label: strZeroFormat(i.toString(), 2),
				title: sPar
			};
			gcFiddle.maFa.setMarker(oSettings, i);
			i += 1;
		}
	}
}

function setSelectOptions(select, fnSel, fnTextFormat) {
	var oVariables = gcFiddle.variables,
		aOptions = select.options,
		sPar, sText, sTitle, option,
		i = 0;

	for (sPar in oVariables) {
		if (oVariables.hasOwnProperty(sPar) && (sPar !== "gcfOriginal") && fnSel(sPar)) {
			sTitle = sPar + "=" + oVariables[sPar];
			sText = (fnTextFormat) ? fnTextFormat(sPar, oVariables[sPar]) : sTitle;
			if (oVariables.gcfOriginal[sPar] !== undefined && oVariables.gcfOriginal[sPar] !== oVariables[sPar]) {
				sText += " [c]";
				sTitle += " [changed]";
			}
			if (i >= select.length) {
				option = document.createElement("option");
				option.value = sPar;
				option.text = sText;
				option.title = sTitle;
				select.add(option);
			} else {
				option = aOptions[i];
				if (option.text !== sText) {
					if (gDebug) { // eslint-disable-line max-depth
						gDebug.log("DEBUG: setSelect: " + sText);
					}
					option.text = sText;
					option.title = sTitle;
				}
			}
			i += 1;
		}
	}
}

function removeSelectOptions(select) {
	var i;

	for (i = select.length - 1; i >= 0; i -= 1) {
		select.remove(i);
	}
}

function setVarSelectOptions() {
	setSelectOptions(document.getElementById("varSelect"),
		function(s) { return !isWaypoint(s); }
	);
}

function setWaypointSelectOptions() {
	var fnTextFormat = function (parameter, value) {
		value = value.replace(/(N|S|E|W)\s*(\d+)°?\s*/g, "");

		parameter = parameter.substring(1, 4);
		return parameter + "=" + value;
	};

	setSelectOptions(document.getElementById("waypointSelect"), isWaypoint, fnTextFormat);
}

function setExampleList() {
	var categorySelect = document.getElementById("categorySelect"),
		exampleSelect = document.getElementById("exampleSelect"),
		oExamples = gcFiddle.categories[categorySelect.value],
		sId,
		sTitle,
		sText,
		option,
		i = 0,
		selectExample;

	for (sId in oExamples) {
		if (oExamples.hasOwnProperty(sId)) {
			sTitle = sId + ": " + oExamples[sId].title;
			sTitle = sTitle.substr(0, 160);
			sText = sTitle.substr(0, 20);
			if (i >= exampleSelect.length) {
				option = document.createElement("option");
				option.value = sId;
				option.title = sTitle;
				option.text = sText;
				exampleSelect.add(option);
			} else {
				option = exampleSelect.options[i];
				if (option.text !== sText) {
					option.text = sText;
				}
			}
			if (option.value === gcFiddle.config.example) {
				selectExample = option.value;
			}
			i += 1;
		}
	}
	if (selectExample) {
		exampleSelect.value = selectExample;
	}
}

function onVarSelectChange() {
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
	varInput.value = sValue;
	if (!(/^[\d]+$/).test(sValue)) { // currently only digits (without -,.) are numbers
		sType = "text";
	}
	varInput.type = sType;
	varSelect.title = (varSelect.selectedIndex >= 0) ? varSelect.options[varSelect.selectedIndex].title : "";
}

function onVarViewSelectChange() {
	gcFiddle.config.variableType = document.getElementById("varViewSelect").value;
	onVarSelectChange();
}

function onWaypointSelectChange() {
	var variables = gcFiddle.variables,
		waypointSelect = document.getElementById("waypointSelect"),
		waypointLabel = document.getElementById("waypointLabel"),
		waypointInput = document.getElementById("waypointInput"),
		sPar = waypointSelect.value,
		aMarkers = gcFiddle.maFa.getMarkers(),
		sValue,	oMarker, i;

	// center to selected waypoint
	for (i = 0; i < aMarkers.length; i += 1) {
		oMarker = aMarkers[i];
		if (oMarker && sPar === oMarker.getTitle()) {
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
	waypointSelect.title = (waypointSelect.selectedIndex >= 0) ? waypointSelect.options[waypointSelect.selectedIndex].title : "";
}

// scrolling needed for Chrome (https://stackoverflow.com/questions/7464282/javascript-scroll-to-selection-after-using-textarea-setselectionrange-in-chrome)
function scrollToSelection(textArea) {
	var charsPerRow = textArea.cols,
		selectionRow = (textArea.selectionStart - (textArea.selectionStart % charsPerRow)) / charsPerRow,
		lineHeight = textArea.clientHeight / textArea.rows;

	textArea.scrollTop = lineHeight * selectionRow;
}

function calculate2() {
	var variables = gcFiddle.variables,
		inputArea = document.getElementById("inputArea"),
		outputArea = document.getElementById("outputArea"),
		input = inputArea.value,
		output,
		iEndPos;

	output = new ScriptParser().calculate(input, variables);
	if (output instanceof ScriptParser.ErrorObject) {
		iEndPos = output.pos + ((output.value !== undefined) ? output.value.toString().length : 0);
		if (inputArea.selectionStart !== undefined) {
			inputArea.focus();
			inputArea.selectionStart = output.pos;
			inputArea.selectionEnd = iEndPos;
			scrollToSelection(inputArea);
		}
		output = output.message + ": '" + output.value + "' (pos " + output.pos + "-" + iEndPos + ")";
	}
	outputArea.value = output;
}

function onVarInputChange() {
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
		calculate2();
		setVarSelectOptions();
		onVarSelectChange(); // title change?
		setWaypointSelectOptions();
		setMarkers(variables);
		gcFiddle.maFa.setPolyline();
		gcFiddle.maFa.showMarkers();
		onWaypointSelectChange();
	}
}

function onWaypointInputChange() {
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
		calculate2();
		setVarSelectOptions();
		setWaypointSelectOptions();
		setMarkers(variables);
		gcFiddle.maFa.setPolyline();
		gcFiddle.maFa.showMarkers();
		onWaypointSelectChange();
	}
}


// see: https://github.com/jzaefferer/undo
function InputStack() {
	this.init();
}

InputStack.prototype = {
	init: function () {
		this.aInput = [];
		this.iStackPosition = -1;
	},
	getInput: function () {
		return this.aInput[this.iStackPosition];
	},
	clearRedo: function () {
		this.aInput = this.aInput.slice(0, this.iStackPosition + 1);
	},
	save: function (sInput) {
		this.clearRedo();
		this.aInput.push(sInput);
		this.iStackPosition += 1;
	},
	canUndo: function () {
		return this.iStackPosition >= 0;
	},
	canUndoKeepOne: function () {
		return this.iStackPosition > 0;
	},
	undo: function () {
		this.iStackPosition -= 1;
		return this.getInput();
	},
	canRedo: function () {
		return this.iStackPosition < this.aInput.length - 1;
	},
	redo: function () {
		this.iStackPosition += 1;
		return this.getInput();
	}
};


function setDisabled(id, bDisabled) {
	var element = document.getElementById(id);

	element.disabled = bDisabled;
}

function updateUndoRedoButtons() {
	setDisabled("undoButton", !gcFiddle.inputStack.canUndoKeepOne());
	setDisabled("redoButton", !gcFiddle.inputStack.canRedo());
}

function initUndoRedoButtons() {
	gcFiddle.inputStack.init();
	updateUndoRedoButtons();
}

function putChangedInputOnStack() {
	var sInput = document.getElementById("inputArea").value,
		sStackInput = gcFiddle.inputStack.getInput();

	if (sStackInput !== sInput) {
		gcFiddle.inputStack.save(sInput);
		updateUndoRedoButtons();
	}
}


function onExecuteButtonClick() {
	var varSelect = document.getElementById("varSelect"),
		waypointSelect = document.getElementById("waypointSelect");

	putChangedInputOnStack();

	gcFiddle.variables = {
		gcfOriginal: { }
	};
	calculate2();
	gcFiddle.maFa.deleteMarkers();
	gcFiddle.maFa.deletePolyline();
	setMarkers(gcFiddle.variables);
	removeSelectOptions(varSelect);
	setVarSelectOptions();
	onVarSelectChange();
	removeSelectOptions(waypointSelect);
	setWaypointSelectOptions();
	if (waypointSelect.options.length) {
		waypointSelect.selectedIndex = waypointSelect.options.length - 1; // select last waypoint
	}
	onWaypointSelectChange();
	gcFiddle.maFa.fitBounds();
	gcFiddle.maFa.setPolyline();
	gcFiddle.maFa.showMarkers();
}


function setInputAreaValue(value) {
	document.getElementById("inputArea").value = value;
}

function setOutputAreaValue(value) {
	document.getElementById("outputArea").value = value;
}

function onUndoButtonClick() {
	setInputAreaValue(gcFiddle.inputStack.undo());
	updateUndoRedoButtons();
	setOutputAreaValue("");
}

function onRedoButtonClick() {
	setInputAreaValue(gcFiddle.inputStack.redo());
	updateUndoRedoButtons();
	setOutputAreaValue("");
}

function onPreprocessButtonClick() {
	var inputArea = document.getElementById("inputArea"),
		sInput = inputArea.value,
		sOutput = "",
		sTitle = "",
		mVariables = {},
		aParts,	sSection, iIndex,
		fnEndsWith = function (str, find) {
			return str.indexOf(find, str.length - find.length) === -1;
		},
		fnFixScript = function (script) { // put undefined variables on top
			var oScriptParser = new ScriptParser(),
				oVars = {},
				sVariables = "",
				sVariable,
				oError;

			do {
				oError = oScriptParser.calculate(sVariables + script, oVars);
				if ((oError instanceof ScriptParser.ErrorObject) && (oError.message === "Variable is undefined")) {
					sVariable = oError.value;
					if (oError.value in mVariables) {
						sVariables += sVariable + "=" + mVariables[sVariable] + " #see below\n";
					} else {
						sVariables += sVariable + "=0 #not detected\n";
					}
				} else {
					break;
				}
			} while (oError);
			return sVariables + script;
		},
		fnMatchPatterns = function (str, mPat) {
			var oOut = {},
				sKeys, rPat, aRes, aKeys, i;

			for (sKeys in mPat) {
				if (mPat.hasOwnProperty(sKeys)) {
					rPat = mPat[sKeys];
					aRes = str.match(rPat);
					if (aRes) {
						aKeys = sKeys.split(",");
						for (i = 0; i < aKeys.length; i += 1) {
							oOut[aKeys[i]] = aRes[i + 1];
						}
					}
				}
			}
			return oOut;
		},
		fnFindInfo = function(str) {
			var mPat = {
					"id,type,title": /#(GC\w+)[^\n]*\n#([^\n]*)\n#([^\n]*)/,
					owner: /#A cache by ([^\n]*)/,
					hidden: /#Hidden : ([^\n]*)/,
					difficulty: /#Difficulty:\n#\s*([\d.]+)/,
					terrain: /#Terrain:\n#\s*([\d.]+)/,
					size: /#Size: Size: (\w+)/,
					favorites: /#(\d+) Favorites/,
					wp: /#(N \d{2}° \d{2}\.\d{3} E \d{3}° \d{2}\.\d{3})/
				},
				oOut = {},
				sOut = "";

			oOut = fnMatchPatterns(str, mPat);

			if (oOut.id) {
				sOut = "#" + oOut.id + ": " + oOut.title + "\n";
				sOut += "#https://coord.info/" + oOut.id + "\n";
				sOut += "#type=" + oOut.type + " hidden=" + oOut.hidden + " difficulty=" + oOut.difficulty + " terrain=" + oOut.terrain + " size=" + oOut.size
					+ " favorites=" + oOut.favorites + " owner=" + oOut.owner + "\n";
				sOut += "$" + oOut.id + '="' + oOut.wp + '"\n';
				sOut += "#\n";
			}
			return sOut;
		},
		fnVariables = function(str) { // Find Variables (x=) and set them to <number> or 0
			str = str.replace(/([A-Za-z]\w*)[ ]*=[ ]*([0-9]*)([^#=\n]*)/g, function(match, p1, p2, p3) {
				match += "\n" + p1 + "=" + ((p2.length > 0) ? p2 : "0") + " #" + ((p3.length > 0) ? (p3.replace(/x/g, "*")) : ""); // some guys write x for *
				mVariables[p1] = ((p2.length > 0) ? p2 : "0");
				return match;
			});
			return str;
		},
		fnWaypoints = function(str) {
			var iWpIndex = 1;

			str = str.replace(/N\s*(\S+)°\s*(\S+)[.,]\s*(\S+)[\s#]+E\s*(\S+)°\s*(\S+)[.,]\s*(\S+)[#\n ]/g, function(sMatch) { // varargs
				var aArgs = [],
					sArg, aRes, i;

				for (i = 1; i < arguments.length; i += 1) {
					sArg = arguments[i];
					sArg = sArg.toString().replace(/['"]/, ""); // remove apostropthes, quotes
					if (/^\d+$/.test(sArg)) { // number?
						aArgs.push(sArg);
					} else if (sArg in mVariables) { // variable?
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
				if (fnEndsWith(sMatch, "\n")) {
					sMatch += "\n";
				}
				sArg = "N " + aArgs[0] + "° " + aArgs[1] + "." + aArgs[2] + " E " + aArgs[3] + "° " + aArgs[4] + "." + aArgs[5];
				if (sArg.indexOf('"') >= 0) {
					sArg = '["' + sArg + '"]';
				} else {
					sArg = '"' + sArg + '"';
				}
				sMatch += "$W" + iWpIndex + "=" + sArg + "\n#";
				iWpIndex += 1;
				return sMatch;
			});
			return str;
		},
		fnPrefixHash = function(str) {
			// Prefix lines with hash (if not already there)
			str = str.replace(/\n(?!#)/g, "\n#");
			return str;
		},
		fnRot13 = function (s) {
			return s.toString().replace(/[A-Za-z]/g, function (c) {
				return String.fromCharCode(c.charCodeAt(0) + (c.toUpperCase() <= "M" ? 13 : -13));
			});
		};

	// multi line trim
	sInput = sInput.replace(/\s*\n\s*/gm, "\n");

	// find parts
	aParts = sInput.split(/(Skip to Content|Geocache Description:|Additional Hints \((?:Decrypt|Encrypt)\)|Decryption Key|Additional Waypoints|View Larger Map)/);
	if (aParts) {
		if (aParts.length === 1) {
			aParts.unshift("Skip to Content", "GCTEMPLATE X\nUnknown Cache\nTemplate Title", "Geocache Description:");
		}

		iIndex = 0;
		sSection = "";
		while (iIndex < aParts.length) {
			if (!sSection) {
				sSection = aParts[iIndex];
				if (sSection.indexOf("#") === 0 || sSection.indexOf("\n") >= 0) {
					sSection = "";
				}
			} else {
				sInput = fnPrefixHash(aParts[iIndex]);
				switch (sSection) {
				case "Skip to Content":
					sTitle = fnFindInfo(sInput);
					sInput = ""; // ignore part
					break;
				case "Geocache Description:":
					sInput = fnVariables(sInput);
					sInput = fnWaypoints(sInput);
					break;
				case "Additional Hints (Decrypt)":
					sInput = "#Hints:\n" + fnRot13(sInput);
					break;
				case "Additional Hints (Encrypt)":
					sInput = "#Hints:\n" + sInput;
					break;
				case "Decryption Key":
					sInput = ""; // ignore part
					break;
				case "Additional Waypoints":
					sInput = fnVariables(sInput);
					sInput = fnWaypoints(sInput);
					break;
				case "View Larger Map":
					sInput = ""; // ignore logs
					break;
				default:
					window.console.warn("Unknown part: " + sSection);
					break;
				}
				sOutput += sInput;
				sSection = "";
			}
			iIndex += 1;
		}
	}

	if (sOutput !== "") {
		sOutput = fnFixScript(sOutput);
		sOutput = sTitle + sOutput;
	}
	putChangedInputOnStack();
	setInputAreaValue(sOutput);
	onExecuteButtonClick();
}

function onExampleLoaded(sExample) {
	var sCategory = gcFiddle.config.category,
		oExamples = gcFiddle.examples[sCategory],
		sName = sCategory + "/" + sExample + ".js";

	gcFiddle.config.example = sExample;
	window.console.log("Example " + sName + " loaded");
	if (oExamples[sExample] === undefined) { // example without id loaded?
		window.console.warn("Example " + sName + ": Wrong format! Must start with #<id>: <title>");
		if (oExamples["<unknown>"]) {
			oExamples[sExample] = oExamples["<unknown>"];
			delete oExamples["<unknown>"];
		}
	}
	document.getElementById("inputArea").value = oExamples[sExample];
	initUndoRedoButtons();
	onExecuteButtonClick();
}

function onExampleSelectChange() {
	var sCategory = gcFiddle.config.category,
		exampleSelect = document.getElementById("exampleSelect"),
		sExample = exampleSelect.value,
		oExamples = gcFiddle.examples[sCategory],
		sName;

	exampleSelect.title = (exampleSelect.selectedIndex >= 0) ? exampleSelect.options[exampleSelect.selectedIndex].title : "";
	if (oExamples[sExample] !== undefined) {
		gcFiddle.config.example = sExample;
		document.getElementById("inputArea").value = oExamples[sExample];
		initUndoRedoButtons();
		onExecuteButtonClick();
	} else if (sExample) {
		document.getElementById("inputArea").value = "#loading " + sExample + "...";
		document.getElementById("outputArea").value = "waiting...";
		sName = sCategory + "/" + sExample + ".js";
		Utils.loadScript(sName, onExampleLoaded, sExample);
	} else {
		document.getElementById("inputArea").value = "";
		document.getElementById("outputArea").value = "";
		gcFiddle.config.example = "";
		initUndoRedoButtons();
		onExecuteButtonClick();
	}
}

function onCategoryLoaded(sCategory) {
	var exampleSelect = document.getElementById("exampleSelect"),
		sName = sCategory + "/0index.js";

	gcFiddle.config.category = sCategory;
	window.console.log("category " + sName + " loaded");
	removeSelectOptions(exampleSelect);
	setExampleList();
	onExampleSelectChange();
}

function loadCategoryLocalStorage(sCategory) {
	var	oStorage = window.localStorage,
		oExamples,
		i, sKey, sItem;

	oExamples = setExampleIndex("", sCategory); // create category, set example object
	for (i = 0; i < oStorage.length; i += 1) {
		sKey = oStorage.key(i);
		sItem = oStorage.getItem(sKey);
		oExamples[sKey] = addExample(sItem, sCategory);
	}
	onCategoryLoaded(sCategory);
}

function onCategorySelectChange() {
	var categorySelect = document.getElementById("categorySelect"),
		sCategory = categorySelect.value,
		exampleSelect = document.getElementById("exampleSelect"),
		oCategories = gcFiddle.categories,
		sName;

	if (oCategories[sCategory] !== undefined) {
		gcFiddle.config.category = sCategory;
		removeSelectOptions(exampleSelect);
		setExampleList();
		onExampleSelectChange();
	} else {
		document.getElementById("inputArea").value = "#loading index " + sCategory + "...";
		if (sCategory === "saved") {
			loadCategoryLocalStorage(sCategory);
		} else {
			sName = sCategory + "/0index.js";
			Utils.loadScript(sName, onCategoryLoaded, sCategory);
		}
	}
	setDisabled("deleteButton", (sCategory !== "saved") || !Object.keys(gcFiddle.categories.saved).length);
}

function onInputLegendClick() {
	gcFiddle.config.showInput = Utils.toogleHidden("inputArea");
}

function onOutputLegendClick() {
	gcFiddle.config.showOutput = Utils.toogleHidden("outputArea");
}

function onVarLegendClick() {
	gcFiddle.config.showVariable = Utils.toogleHidden("varArea");
}

function onNotesLegendClick() {
	gcFiddle.config.showNotes = Utils.toogleHidden("notesArea");
}

function onWaypointLegendClick() {
	gcFiddle.config.showWaypoint = Utils.toogleHidden("waypointArea");
}

function onMapLegendClick() {
	var sMapType = gcFiddle.config.mapType;

	gcFiddle.config.showMap = Utils.toogleHidden("mapCanvas-" + sMapType);
	if (gcFiddle.config.showMap) {
		gcFiddle.maFa.resize();
		gcFiddle.maFa.fitBounds();
	}
}

function onConsoleLogLegendClick() {
	gcFiddle.config.showConsole = Utils.toogleHidden("consoleLogArea");
}

function onFitBoundsButtonClick() {
	var oMaFa = gcFiddle.maFa;

	oMaFa.clearMarkers(); // clear needed for SimpleMarker
	oMaFa.clearPolyline();
	oMaFa.fitBounds();
	oMaFa.setPolyline();
	oMaFa.showMarkers();
}

function onLocationButtonClick() {
	function showPosition(position) {
		var oPos = new LatLng(position.coords.latitude, position.coords.longitude),
			iMarkersLength = gcFiddle.maFa.getMarkers().length;

		window.console.log(oPos.toString());
		gcFiddle.maFa.setMarker({
			position: oPos
		}, iMarkersLength);
		onFitBoundsButtonClick();
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
}

function onOutputAreaClick(event) {
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
		gDebug.log("onOutputAreaClick: selStart=" + event.target.selectionStart + " selEnd=" + event.target.selectionEnd);
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
			if (isWaypoint(sPar)) {
				if (sPar !== waypointSelect.value) {
					waypointSelect.value = sPar;
					onWaypointSelectChange();
				}
			} else if (sPar !== varSelect.value) {
				varSelect.value = sPar;
				onVarSelectChange();
			}
		}
	}
}


function onMapLoaded(map) {
	var sMapType = map.options.mapType,
		oMapProxy = gcFiddle.mapProxy[sMapType];

	oMapProxy.setMap(map);
	if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(oMapProxy);
	}
}

function onMapProxyLoaded(mapProxy) {
	var sMapType = mapProxy.options.mapType,
		sMapTypeId = "mapCanvas-" + sMapType;

	gcFiddle.mapProxy[sMapType] = mapProxy;
	mapProxy.createMap({
		googleKey: gcFiddle.config.googleKey,
		leafletUrl: gcFiddle.config.leafletUrl,
		mapboxKey: gcFiddle.config.mapboxKey,
		openLayersUrl: gcFiddle.config.openLayersUrl,
		zoom: gcFiddle.config.zoom,
		mapType: sMapType,
		mapDivId: sMapTypeId,
		onload: onMapLoaded
	});
}

function onMapTypeSelectChange() {
	var	aMapCanvas = document.getElementsByClassName("canvas"),
		mapTypeSelect = document.getElementById("mapTypeSelect"),
		sMapType = mapTypeSelect.value,
		sMapTypeId = "mapCanvas-" + sMapType,
		oItem, i;

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
			onload: onMapProxyLoaded
		});
	} else if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(gcFiddle.mapProxy[sMapType]);
	}
}

function getChangedParameters(current, initial) {
	var oChanged = {},
		sName;

	for (sName in current) {
		if (current.hasOwnProperty(sName)) {
			if (current[sName] !== initial[sName]) {
				oChanged[sName] = current[sName];
			}
		}
	}
	return oChanged;
}

// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function parseUri(oConfig) {
	var aMatch,
		rPlus = /\+/g, // Regex for replacing addition symbol with a space
		rSearch = /([^&=]+)=?([^&]*)/g,
		fnDecode = function (s) { return decodeURIComponent(s.replace(rPlus, " ")); },
		sQuery = window.location.search.substring(1),
		sName,
		sValue;

	while ((aMatch = rSearch.exec(sQuery)) !== null) {
		sName = fnDecode(aMatch[1]);
		sValue = fnDecode(aMatch[2]);
		if (sValue !== null && oConfig.hasOwnProperty(sName)) {
			switch (typeof oConfig[sName]) {
			case "string":
				break;
			case "boolean":
				sValue = (sValue === "true");
				break;
			case "number":
				sValue = Number(sValue);
				break;
			case "object":
				break;
			default:
				break;
			}
		}
		oConfig[sName] = sValue;
	}
}

function encodeUriParam(params) {
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

function myConfirm(message) {
	var confirm = window.confirm;

	return confirm(message);
}

function onReloadButtonClick() {
	var oChanged = getChangedParameters(gcFiddle.config, gcFiddle.initialConfig);

	window.location.search = "?" + encodeUriParam(oChanged); // jQuery.param(oChanged, true)
}

function onSaveButtonClick() {
	var categorySelect = document.getElementById("categorySelect"),
		sCategory = categorySelect.value,
		exampleSelect = document.getElementById("exampleSelect"),
		sInput = document.getElementById("inputArea").value,
		oExample,
		oSavedList;

	if (sCategory !== "saved") {
		sCategory = "saved";
		categorySelect.value = sCategory;
		onCategorySelectChange();
	}

	oExample = addExample(sInput, sCategory);
	window.localStorage.setItem(oExample.key, sInput);
	oSavedList = gcFiddle.categories.saved;

	if (oSavedList[oExample.key]) {
		oSavedList[oExample.key] = oExample;
		if (exampleSelect.value !== oExample.key) {
			exampleSelect.value = oExample.key;
			onExampleSelectChange();
		}
	} else {
		oSavedList[oExample.key] = oExample;
		gcFiddle.config.example = oExample.key;
		setExampleList();
		onExampleSelectChange();
	}
	setDisabled("deleteButton", !Object.keys(oSavedList).length);
}

function onDeleteButtonClick() {
	var sCategory = document.getElementById("categorySelect").value,
		exampleSelect = document.getElementById("exampleSelect"),
		sExample = exampleSelect.value,
		oSavedList = gcFiddle.categories.saved;

	if (sCategory !== "saved") {
		return;
	}
	if (!myConfirm("Delete " + sCategory + "/" + sExample)) {
		return;
	}
	window.console.log("Deleting " + sExample);
	window.localStorage.removeItem(sExample);

	if (oSavedList) {
		if (oSavedList[sExample]) {
			delete oSavedList[sExample];
			removeSelectOptions(exampleSelect);
			setExampleList();
			onExampleSelectChange();
		}
		setDisabled("deleteButton", !Object.keys(oSavedList).length);
	}
}

// https://stackoverflow.com/questions/6604192/showing-console-errors-and-alerts-in-a-div-inside-the-page
function redirectConsole() {
	var aVerbs = [
			"log",
			"debug",
			"info",
			"warn",
			"error"
		],
		sVerb,
		consoleLogArea = document.getElementById("consoleLogArea"),
		i;

	for (i = 0; i < aVerbs.length; i += 1) {
		sVerb = aVerbs[i];
		window.console[sVerb] = (function (oOldLog, oLog, sVerb2) {
			return function () {
				oLog.value += sVerb2 + ": " + Array.prototype.slice.call(arguments).join(" ") + "\n";
				oOldLog.apply(console, arguments);
			};
		}(window.console.log.bind(console), consoleLogArea, sVerb));
	}
	document.getElementById("consoleLogBox").hidden = false;
}

function onLoad() {
	var oConfig = gcFiddle.config;

	Utils.objectAssign(oConfig, gcFiddleExternalConfig || {});
	gcFiddle.initialConfig = Utils.objectAssign({}, oConfig);
	parseUri(oConfig);
	if (oConfig.showConsole) {
		redirectConsole();
	}
	if (Number(oConfig.debug) > 0) {
		gDebug = {
			log: window.console.log,
			level: Number(oConfig.debug)
		};
	}

	gcFiddle.inputStack = new InputStack();

	gcFiddle.maFa = new MarkerFactory({
		draggable: true
	});
	document.getElementById("executeButton").onclick = onExecuteButtonClick;
	document.getElementById("undoButton").onclick = onUndoButtonClick;
	document.getElementById("redoButton").onclick = onRedoButtonClick;
	document.getElementById("preprocessButton").onclick = onPreprocessButtonClick;
	document.getElementById("reloadButton").onclick = onReloadButtonClick;
	document.getElementById("saveButton").onclick = onSaveButtonClick;
	document.getElementById("deleteButton").onclick = onDeleteButtonClick;
	document.getElementById("categorySelect").onchange = onCategorySelectChange;
	document.getElementById("exampleSelect").onchange = onExampleSelectChange;
	document.getElementById("varSelect").onchange = onVarSelectChange;
	document.getElementById("varViewSelect").onchange = onVarViewSelectChange;
	document.getElementById("waypointSelect").onchange = onWaypointSelectChange;
	document.getElementById("varLegend").onclick = onVarLegendClick;
	document.getElementById("inputLegend").onclick = onInputLegendClick;
	document.getElementById("outputLegend").onclick = onOutputLegendClick;
	document.getElementById("notesLegend").onclick = onNotesLegendClick;
	document.getElementById("waypointLegend").onclick = onWaypointLegendClick;
	document.getElementById("mapLegend").onclick = onMapLegendClick;
	document.getElementById("mapTypeSelect").onchange = onMapTypeSelectChange;
	document.getElementById("locationButton").onclick = onLocationButtonClick;
	document.getElementById("fitBoundsButton").onclick = onFitBoundsButtonClick;
	document.getElementById("consoleLogLegend").onclick = onConsoleLogLegendClick;

	document.getElementById("outputArea").onclick = onOutputAreaClick;
	document.getElementById("varInput").onchange = onVarInputChange;
	document.getElementById("waypointInput").onchange = onWaypointInputChange;

	if (oConfig.variableType) {
		document.getElementById("varViewSelect").value = oConfig.variableType;
	}

	if (!oConfig.showInput) {
		onInputLegendClick();
	}
	if (!oConfig.showOutput) {
		onOutputLegendClick();
	}
	if (!oConfig.showVariable) {
		onVarLegendClick();
	}
	if (!oConfig.showNotes) {
		onNotesLegendClick();
	}
	if (!oConfig.showWaypoint) {
		onWaypointLegendClick();
	}
	if (oConfig.showMap) {
		onMapLegendClick();
	}

	if (oConfig.example) {
		document.getElementById("exampleSelect").value = oConfig.example;
	}

	if (oConfig.category) {
		document.getElementById("categorySelect").value = oConfig.category;
		onCategorySelectChange();
	} else {
		onExampleSelectChange();
	}

	if (oConfig.mapType) {
		document.getElementById("mapTypeSelect").value = oConfig.mapType;
	}
	onMapTypeSelectChange();
}

window.onload = onLoad;
// end
