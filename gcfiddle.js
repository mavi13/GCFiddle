// gcfiddle.js - GCFiddle
// (c) mavi13, 2018
// https://mavi13.github.io/GCFiddle/
//
/* globals window, document, google, OpenLayers */ // make JSlint happy

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
			mapType: "simple", // simple, google, osm
			key: "", // Google API key
			zoom: 15, // zoom level for Google maps, OSM
			openLayersUrl: "https://cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js"
			// openLayersUrl: "http://www.openlayers.org/api/OpenLayers.js" // http only
			// openLayersUrl: "lib/OpenLayers.js" // local version; or "lib/OpenLayers.light.js"
		},
		initialConfig: null,
		map: { },
		maFa: null,
		categories: { },
		examples: { },
		variables: {
			gcfOriginal: { }
		}
	};

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
		// e.g. Google: "file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"; FF: "@file:///E:/work/develop/2018/GCFiddle/test/GCNEW1.js:5:1"
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
		sKey = "<unknown>";
		sInput = '"WARNING: Example must start with #<id>: <title>"\n\n' + sInput;
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

	window.console.log("INFO: addExample: category=" + oItem.category + "(" + gcFiddle.config.category + ") key=" + oItem.key);
	if (gcFiddle.examples[oItem.category]) {
		gcFiddle.examples[oItem.category][oItem.key] = oItem.input;
	} else {
		window.console.warn("ERROR: Unknown category: " + oItem.category);
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

function myObjectAssign(oTarget) { // varargs; Object.assign is ES6, not in IE
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
}

function loadScript(url, callback, arg) {
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
}

//
//
function toRadians(deg) {
	return deg * Math.PI / 180;
}

function toDegrees(rad) {
	return rad * 180 / Math.PI;
}

// based on: http://www.movable-type.co.uk/scripts/latlong.html
// Latitude/longitude spherical geodesy tools
// (c) Chris Veness 2002-2016
function LatLng(lat, lng) {
	this.lat = Number(lat);
	this.lng = Number(lng);
}

LatLng.prototype.distanceTo = function (point) {
	var radius = 6371e3,
		phi1 = toRadians(this.lat),
		lambda1 = toRadians(this.lng),
		phi2 = toRadians(point.lat),
		lambda2 = toRadians(point.lng),
		deltaphi = phi2 - phi1,
		deltalambda = lambda2 - lambda1,

		a = Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2),
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
		d = radius * c;

	return d;
};

LatLng.prototype.bearingTo = function (point) {
	var phi1 = toRadians(this.lat),
		phi2 = toRadians(point.lat),
		deltalambda = toRadians(point.lng - this.lng),

		// see http://mathforum.org/library/drmath/view/55417.html
		y = Math.sin(deltalambda) * Math.cos(phi2),
		x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltalambda),
		theta = Math.atan2(y, x);

	return (toDegrees(theta) + 360) % 360;
};

LatLng.prototype.destinationPoint = function (distance, bearing) {
	var radius = 6371e3, // see http://williams.best.vwh.net/avform.htm#LL
		delta = Number(distance) / radius, // angular distance in radians
		theta = toRadians(Number(bearing)),

		phi1 = toRadians(this.lat),
		lambda1 = toRadians(this.lng),

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

	return new LatLng(toDegrees(phi2), (toDegrees(lambda2) + 540) % 360 - 180); // normalise to −180..+180°
};

LatLng.intersection = function (p1, bearing1, p2, bearing2) {
	// see http://williams.best.vwh.net/avform.htm#Intersection
	var phi1 = toRadians(p1.lat),
		lambda1 = toRadians(p1.lng),
		phi2 = toRadians(p2.lat),
		lambda2 = toRadians(p2.lng),
		theta13 = toRadians(Number(bearing1)),
		theta23 = toRadians(Number(bearing2)),
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

	return new LatLng(toDegrees(phi3), (toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
};

LatLng.prototype.midpointTo = function(point) {
	var phi1 = toRadians(this.lat),
		lambda1 = toRadians(this.lng),
		phi2 = toRadians(point.lat),
		deltaLambda = toRadians(point.lng - this.lng),

		Bx = Math.cos(phi2) * Math.cos(deltaLambda),
		By = Math.cos(phi2) * Math.sin(deltaLambda),

		x = Math.sqrt((Math.cos(phi1) + Bx) * (Math.cos(phi1) + Bx) + By * By),
		y = Math.sin(phi1) + Math.sin(phi2),
		phi3 = Math.atan2(y, x),
		lambda3 = lambda1 + Math.atan2(By, Math.cos(phi1) + Bx);

	return new LatLng(toDegrees(phi3), (toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
};

// https://stackoverflow.com/questions/18838915/convert-lat-lon-to-pixel-coordinate
// (stretched) Mercator projection
// map={width, height, latBottom, latTop, lngLeft, lngRight}
function convertGeoToPixel(position, map) {
	var lat = toRadians(position.lat),
		lng = toRadians(position.lng),
		south = toRadians(map.latBottom),
		north = toRadians(map.latTop),
		west = toRadians(map.lngLeft),
		east = toRadians(map.lngRight),
		mercY = function(lat1) {
			return Math.log(Math.tan(lat1 / 2 + Math.PI / 4));
		},
		ymin = mercY(south),
		ymax = mercY(north),
		xFactor = map.width / ((east - west) || 1),
		yFactor = map.height / ((ymax - ymin) || 1),
		x,
		y;

	x = lng;
	y = mercY(lat);
	x = (x - west) * xFactor;
	y = (ymax - y) * yFactor; // y points south
	return {
		x: x,
		y: y
	};
}

//
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

//
//
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

function latLng2position(lat, lng) {
	var position = new LatLng(lat, lng);

	return position;
}

/* currently unused
function mm2position(latmin, lngmin) {
	var latNS = 1, //N=1, S=-1
		lngEW = 1, //E=1, W=-1
		latdeg = 49,
		lngdeg = 8,
		lat = latNS * latdeg + latmin / 60,
		lng = lngEW * lngdeg + lngmin / 60;
	return latLng2position(lat, lng);
}
*/

/* currently unused
function mmParts2position(latminP1, latminP2, lngminP1, lngminP2) {
	return mm2position(latminP1 + latminP2 / 1000, lngminP1 + lngminP2 / 1000);
}
*/

function parse2position(coord) {
	var aParts,
		lat = 0,
		lng = 0,
		sPos;

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
			return latLng2position(lat, lng);
		}
		return null;
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
			return latLng2position(lat, lng);
		}
		return null;
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
			return latLng2position(lat, lng);
		}
		return null;
	}

	sPos = dmm2position() || dms2position() || dd2position();
	if (!sPos) {
		window.console.log("WARNING: parse2position: Do not know how to parse '" + coord + "'");
		sPos = latLng2position(lat, lng);
	}
	return sPos;
}

//
//
function ErrorObject(message, value, pos) {
	this.message = message;
	this.value = value;
	this.pos = pos;
}

// based on: https://www.codeproject.com/Articles/345888/How-to-write-a-simple-interpreter-in-JavaScript
// (and: http://crockford.com/javascript/tdop/tdop.html ; test online: http://jsfiddle.net/h3xwj/embedded/result/)
// How to write a simple interpreter in JavaScript
// Peter_Olson, 30 Oct 2014
function ScriptParser() {
	return this;
}

ScriptParser.prototype.lex = function (input) {
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
				throw new ErrorObject("Number is too large or too small", sToken, iStartPos); // for a 64-bit double
			}
			addToken("number", sToken, iStartPos);
		} else if (isQuotes(sChar)) {
			sChar = "";
			sToken = advanceWhileEscape(isNotQuotes);
			addToken("string", sToken, iStartPos + 1);
			if (!isQuotes(sChar)) {
				throw new ErrorObject("Unterminated string", sToken, iStartPos + 1);
			}
			sChar = advance();
		} else if (isApostrophe(sChar)) {
			sChar = "";
			sToken = advanceWhile(isNotApostrophe);
			addToken("string", sToken, iStartPos + 1);
			if (!isApostrophe(sChar)) {
				throw new ErrorObject("Unterminated string", sToken, iStartPos + 1);
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
				throw new ErrorObject("Unterminated formatter", sToken, iStartPos + 1);
			}
			sChar = advance();
		} else {
			throw new ErrorObject("Unrecognized token", sChar, iStartPos);
		}
	}
	addToken("(end)", 0, iIndex);
	return aTokens;
};

// http://crockford.com/javascript/tdop/tdop.html (old: http://javascript.crockford.com/tdop/tdop.html)
// Operator precedence parsing
// Operator: With left binding power (lbp) and operational function.
// Manipulates tokens to its left (e.g: +)? => left denotative function (led), otherwise null denotative function (nud), (e.g. unary -)
// identifiers, numbers: also nud.
ScriptParser.prototype.parse = function (tokens) {
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
					throw new ErrorObject("Unexpected end of file", "", t.pos);
				} else {
					throw new ErrorObject("Unexpected token", t.type, t.pos);
				}
			}
			left = t.nud(t);
			while (rbp < token().lbp) {
				t = token();
				advance();
				if (!t.led) {
					throw new ErrorObject("Unexpected token", t.type, tokens[iIndex].pos);
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
		/*
		suffix = function (id, lbp, led) {
			symbol(id, null, lbp, led || function (left) {
				return {
					type: id,
					left: left
				};
			});
		};
		*/

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
					throw new ErrorObject("Expected closing parenthesis for function", ")", tokens[iParseIndex].pos);
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
			throw new ErrorObject("Expected closing parenthesis", ")", tokens[iParseIndex].pos);
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
				throw new ErrorObject("Expected closing bracket", "]", tokens[iParseIndex].pos);
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
					throw new ErrorObject("Invalid argument " + (i + 1) + " for function", left.name, left.pos);
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
			throw new ErrorObject("Invalid lvalue at", oObj.type, oObj.pos);
		}
		return oObj;
	});

	while (token().type !== "(end)") {
		aParseTree.push(expression(0));
	}
	return aParseTree;
};


ScriptParser.prototype.evaluate = function (parseTree, variables) {
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
				return Math.sin(toRadians(degrees));
			},
			cos: function (degrees) {
				return Math.cos(toRadians(degrees));
			},
			tan: function (degrees) {
				return Math.tan(toRadians(degrees));
			},
			asin: function (x) {
				return toDegrees(Math.asin(x));
			},
			acos: function (x) {
				return toDegrees(Math.acos(x));
			},
			atan: function (x) {
				return toDegrees(Math.atan(x));
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
				return toDegrees(radians);
			},
			// d2r (deg2rad)
			d2r: function (degrees) {
				return toRadians(degrees);
			},

			bearing: function (w1, w2) {
				var oPosition1 = parse2position(w1),
					oPosition2 = parse2position(w2);

				return LatLng.prototype.bearingTo.call(oPosition1, oPosition2);
			},
			// cb (crossbearing)
			cb: function (w1, angle1, w2, angle2) {
				var oPosition1 = parse2position(w1),
					oPosition2 = parse2position(w2),
					oPosition3,
					sValue;

				oPosition3 = LatLng.intersection(oPosition1, angle1, oPosition2, angle2);
				sValue = position2dmm(oPosition3);
				return sValue;
			},
			distance: function (w1, w2) {
				var oPosition1 = parse2position(w1),
					oPosition2 = parse2position(w2),
					nValue;

				nValue = LatLng.prototype.distanceTo.call(oPosition1, oPosition2);
				return nValue;
			},
			project: function (w1, bearing, distance) {
				var oPosition1 = parse2position(w1),
					oPosition2,
					sValue;

				oPosition2 = LatLng.prototype.destinationPoint.call(oPosition1, distance, bearing); // order of arguments!
				sValue = position2dmm(oPosition2);
				return sValue;
			},

			// midpoint(w1, w2): Same as: project(w1, bearing(w1, w2), distance(w1, w2) / 2)
			midpoint: function (w1, w2) {
				var oPosition1 = parse2position(w1),
					oPosition2 = parse2position(w2),
					oPosition3,
					sValue;

				oPosition3 = LatLng.prototype.midpointTo.call(oPosition1, oPosition2);
				sValue = position2dmm(oPosition3);
				return sValue;
			},

			format: function (w1, format) {
				var oPosition = parse2position(w1),
					sValue;

				switch (format) {
				case "dmm":
					sValue = position2dmm(oPosition);
					break;
				case "dms":
					sValue = position2dms(oPosition);
					break;
				case "dd":
					sValue = position2dd(oPosition);
					break;
				default:
					throw new ErrorObject("Unknown format", format, this.pos);
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
					throw new ErrorObject("Unknown constant", name, this.pos);
				}
			},
			parse: function (input) {
				var oVars = {},
					sOut = new ScriptParser().calculate(input, oVars),
					iEndPos;

				if (sOut instanceof ErrorObject) {
					iEndPos = sOut.pos + sOut.value.toString().length;
					sOut = sOut.message + ": '" + sOut.value + "' (pos " + sOut.pos + "-" + iEndPos + ")";
				}
				return sOut;
			},
			// assert(c1, c2) (assertEqual: c1 === c2)
			assert: function (a, b) {
				if (a !== b) {
					throw new ErrorObject("Assertion failed: '" + a + " != " + b + "'", "assert", this.pos);
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
					throw new ErrorObject("Variable is undefined", node.value, node.pos);
				}
			} else if (node.type === "assign") {
				sValue = parseNode(node.value);
				if (variables.gcfOriginal[node.name] !== undefined && variables.gcfOriginal[node.name] !== variables[node.name]) {
					window.console.log("NOTE: Variable is readonly: " + node.name + "=" + variables[node.name] + " (" + sValue + ")");
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
					throw new ErrorObject("Function is undefined", node.name, node.pos);
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
				window.console.log("ERROR: parseNode node=%o unknown type=" + node.type, node);
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
};

ScriptParser.prototype.calculate = function (input, variables) {
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
};

/*
function parseValues(values) {
	var valueList = String(values).split(/[ ,]+/), //split into components separated by space or comma
		valueList2 = [],
		i,
		matches,
		start,
		stop,
		j;

	for (i = 0; i < valueList.length; i += 1) {
		matches = valueList[i].match(/(\S+)\-(\S+)/); //range by using minus
		if (matches) {
			start = parseFloat(matches[1]);
			stop = parseFloat(matches[2]);
			for (j = start; j <= stop; j += 1) {
				valueList2.push(j);
			}
		} else {
			valueList2.push(parseFloat(valueList[i]));
		}
	}
	return valueList2;
}
*/

//
//
function SimpleLatLngBounds() {
	this.oBounds = {
		latBottom: Number.MAX_VALUE,
		latTop: Number.MIN_VALUE,
		lngLeft: Number.MAX_VALUE,
		lngRight: Number.MIN_VALUE
	};
}

SimpleLatLngBounds.prototype.getBounds = function () {
	return this.oBounds;
};

SimpleLatLngBounds.prototype.extend = function (position) {
	this.oBounds.latBottom = Math.min(this.oBounds.latBottom, position.lat);
	this.oBounds.latTop = Math.max(this.oBounds.latTop, position.lat);
	this.oBounds.lngLeft = Math.min(this.oBounds.lngLeft, position.lng);
	this.oBounds.lngRight = Math.max(this.oBounds.lngRight, position.lng);
};

//
// SimpleMap: settings={zoom}
function SimpleMap(mapCanvas, settings) {
	var bHidden = mapCanvas.hidden,
		iWidth, iHeight, canvas, i;

	this.div = mapCanvas;
	this.settings = myObjectAssign({
		markerStyle: "green",
		textStyle: "black",
		lineStyle: "red",
		backgroundStyle: "#E6E6E6",
		zoom: 0 // not used
	}, settings);

	if (bHidden) {
		mapCanvas.hidden = false; // allow to get width, height
	}
	iWidth = mapCanvas.clientWidth;
	iHeight = mapCanvas.clientHeight;
	mapCanvas.hidden = bHidden;
	window.console.log("SimpleMap: width=" + iWidth + " height=" + iHeight);

	this.aCanvas = [];
	for (i = 0; i <= 1; i += 1) {
		canvas = document.createElement("CANVAS");
		canvas.width = iWidth;
		canvas.height = iHeight;
		canvas.id = "canvas" + (i + 1);
		canvas.style.position = "absolute";
		mapCanvas.appendChild(canvas);
		this.aCanvas.push(canvas);
	}

	this.oPixelMap = {
		width: iWidth * 8 / 10,
		height: iHeight * 8 / 10
		// will be extended by latBottom, latTop, lngLeft, lngRight in fitBounds()
	};
}

SimpleMap.prototype.getDiv = function () {
	return this.div;
};

SimpleMap.prototype.setZoom = function (zoom) {
	this.zoom = zoom;
};

SimpleMap.prototype.setCenter = function (/* position */) {
	// currently empty
};

SimpleMap.prototype.myDrawPath = function (path, lineStyle) {
	var context, i, oPos,
		strokeStyle = lineStyle || this.settings.lineStyle,
		iLineWidth = 1,
		canvas = this.aCanvas[0];

	if (path.length) {
		context = canvas.getContext("2d");
		if (strokeStyle !== this.settings.backgroundStyle) {
			context.save();
			context.translate((canvas.width - this.oPixelMap.width) / 2, (canvas.height - this.oPixelMap.height) / 2);
			context.strokeStyle = strokeStyle;
			context.lineWidth = iLineWidth;
			context.beginPath();
			for (i = 0; i < path.length; i += 1) {
				oPos = convertGeoToPixel(path[i], this.oPixelMap);
				if (i === 0) {
					context.moveTo(oPos.x, oPos.y);
				} else {
					context.lineTo(oPos.x, oPos.y);
				}
			}
			context.stroke();
			context.restore();
		} else {
			context.clearRect(0, 0, canvas.width, canvas.height); // we simply clear all
		}
	}
};

SimpleMap.prototype.myDrawMarker = function (marker, markerStyle, textStyle) {
	var context, oPos,
		strokeStyle = markerStyle || this.settings.markerStyle,
		fillStyle = textStyle || this.settings.textStyle,
		iRadius = 10,
		iLineWidth = 1,
		canvas = this.aCanvas[1];

	oPos = convertGeoToPixel(marker.position, this.oPixelMap);

	context = canvas.getContext("2d");
	context.save();
	context.translate((canvas.width - this.oPixelMap.width) / 2, (canvas.height - this.oPixelMap.height) / 2);
	if (strokeStyle !== this.settings.backgroundStyle) {
		context.strokeStyle = strokeStyle;
		context.lineWidth = iLineWidth;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = "14px sans-serif";
		context.fillStyle = fillStyle;

		context.beginPath();
		context.arc(oPos.x, oPos.y, iRadius, 0, 2 * Math.PI);
		context.fillText(marker.label, oPos.x, oPos.y);
		context.stroke();
	} else {
		iRadius += Math.ceil(iLineWidth / 2);
		context.clearRect(oPos.x - iRadius, oPos.y - iRadius, iRadius * 2, iRadius * 2);
	}
	context.restore();
};

SimpleMap.prototype.fitBounds = function (bounds) {
	var oBounds = bounds.getBounds();

	// We do no redraw here. Please clear, redraw if needed.
	myObjectAssign(this.oPixelMap, oBounds);
};

//
// SimpleMarker: settings={position, title, label, [map]}
function SimpleMarker(settings) {
	this.position = settings.position;
	this.title = settings.title;
	this.label = settings.label;
	this.map = settings.map;
}

SimpleMarker.prototype.getSimplePosition = function () {
	return this.position;
};

SimpleMarker.prototype.getPosition = function () {
	return this.position;
};

SimpleMarker.prototype.setPosition = function (position) {
	if (this.position.lat !== position.lat || this.position.lng !== position.lng) {
		if (this.map) {
			this.map.myDrawMarker(this, this.map.settings.backgroundStyle, this.map.settings.backgroundStyle); // old marker
		}
		this.position = position;
		if (this.map) {
			this.map.myDrawMarker(this); // new marker
		}
	}
};

SimpleMarker.prototype.getTitle = function () {
	return this.title;
};

SimpleMarker.prototype.setTitle = function (title) {
	this.title = title;
};

SimpleMarker.prototype.getLabel = function () {
	return this.label;
};

SimpleMarker.prototype.setLabel = function (label) {
	this.label = label;
};

SimpleMarker.prototype.getMap = function () {
	return this.map;
};

SimpleMarker.prototype.setMap = function (map) {
	if (this.map) {
		this.map.myDrawMarker(this, this.map.settings.backgroundStyle, this.map.settings.backgroundStyle); // old marker
	}
	this.map = map;
	if (this.map) {
		this.map.myDrawMarker(this); // new marker
	}
};

//
// MyPolyline: settings={map, strokeColor, strokeOpacity, strokeWeight}
function SimplePolyline(settings) {
	this.map = settings.map;
	this.strokeColor = settings.strokeColor;
}

SimplePolyline.prototype.setPath = function (path) {
	if (this.map) {
		if (this.path) {
			this.map.myDrawPath(this.path, this.map.settings.backgroundStyle); // old path: background (draw over old path)
		}
		this.map.myDrawPath(path, this.strokeColor); // new path
	}
	this.path = path;
};

SimplePolyline.prototype.getMap = function () {
	return this.map;
};

SimplePolyline.prototype.setMap = function (map) {
	if (this.map && this.path) {
		this.map.myDrawPath(this.path, this.map.settings.backgroundStyle); // old path: background (draw over old path)
	}
	this.map = map;
	if (this.map && this.path) {
		this.map.myDrawPath(this.path, this.strokeColor); // new path
	}
};


// Special OpenLayers Marker
function OlMarker(settings) {
	var oPosition = new OpenLayers.LonLat(settings.position.lng, settings.position.lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

	OpenLayers.Feature.Vector.call(this,
		new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat),
		{ // attributes
			position: settings.position,
			title: settings.title,
			label: settings.label
		}
	);
	this.map = settings.map;
}

OlMarker.createPrototype = function () {
	OlMarker.prototype = Object.create(OpenLayers.Feature.Vector.prototype);

	OlMarker.prototype.getTitle = function () {
		return this.attributes.title;
	};

	OlMarker.prototype.setTitle = function (title) {
		this.attributes.title = title;
	};

	OlMarker.prototype.getLabel = function () {
		return this.attributes.label;
	};

	OlMarker.prototype.setLabel = function (label) {
		this.attributes.label = label;
	};

	OlMarker.prototype.getSimplePosition = function () {
		return this.attributes.position;
	};

	OlMarker.prototype.setSimplePosition = function (position) {
		this.attributes.position = position;
	};

	OlMarker.prototype.getPosition = function () {
		return new OpenLayers.LonLat(this.geometry.x, this.geometry.y); // tansformed position
	};

	OlMarker.prototype.setPosition = function (position) {
		var oLonLat = new OpenLayers.LonLat(position.lng, position.lat).transform(new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject()),
			oInfoWindow;

		this.move(oLonLat);
		this.setSimplePosition(position);

		oInfoWindow = this.map && this.map.popups[0];
		if (oInfoWindow && oInfoWindow.getAnchor() === this) {
			oInfoWindow.setPosition(oLonLat);
		}
	};

	OlMarker.prototype.getMap = function () {
		return this.map;
	};

	OlMarker.prototype.setMap = function (map) {
		var oMarkers, oInfoWindow;

		if (map) {
			oMarkers = map.getLayersByName("Markers")[0];
			oMarkers.addFeatures(this);
		} else if (this.map) { // delete map?
			oMarkers = this.map.getLayersByName("Markers")[0];
			oMarkers.removeFeatures(this);
			oInfoWindow = this.map.popups[0];
			if (oInfoWindow && oInfoWindow.getAnchor() === this) {
				oInfoWindow.close();
			}
		}
		this.map = map;
	};
};


function OlPolyline(settings) {
	OpenLayers.Geometry.LineString.call(this);
	this.settings1 = settings;
	this.map = settings.map;
}

OlPolyline.createPrototype = function () {
	OlPolyline.prototype = Object.create(OpenLayers.Geometry.LineString.prototype);

	OlPolyline.prototype.setPath = function (aList) {
		var oPosition,
			oPoint,
			i;

		for (i = 0; i < aList.length; i += 1) {
			oPosition = aList[i];
			if (i >= this.components.length) {
				this.addPoint(new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat));
			} else {
				oPoint = this.components[i];
				oPoint.move(oPosition.lon - oPoint.x, oPosition.lat - oPoint.y);
			}
		}
		if (this.map) {
			this.map.getLayersByName("Lines")[0].redraw();
		}
	};

	OlPolyline.prototype.getMap = function () {
		return this.map;
	};

	OlPolyline.prototype.setMap = function (map) {
		var oLines,	oFeature;

		if (map) {
			oFeature = new OpenLayers.Feature.Vector(this, {}, this.settings1);
			oLines = map.getLayersByName("Lines")[0];
			oLines.addFeatures(oFeature);
		} else if (this.map) {
			oLines = this.map.getLayersByName("Lines")[0];
			oLines.removeAllFeatures();
		}
		this.map = map;
	};
};


function OlInfoWindow() {
	var that = this,
		fncloseBoxCallback = function(event) {
			that.close();
			OpenLayers.Event.stop(event);
		};

	OpenLayers.Popup.FramedCloud.call(this, null, null, null, null, null, true, fncloseBoxCallback);
	// or: this.addCloseBox(); this.closeDiv.style.zIndex = 1;
}

OlInfoWindow.createPrototype = function () {
	OlInfoWindow.prototype = Object.create(OpenLayers.Popup.FramedCloud.prototype);

	OlInfoWindow.prototype.setContent = function(content) {
		this.setContentHTML('<div style="font-size:.8em">' + content + "</div>");
	};

	OlInfoWindow.prototype.setPosition = function (lonlat) {
		this.lonlat = lonlat;
		this.updatePosition();
	};

	OlInfoWindow.prototype.open = function (map, marker) {
		this.anchor1 = marker;
		this.lonlat = OpenLayers.LonLat.fromString(marker.geometry.toShortString());
		map.addPopup(this);
		this.updateSize();
	};

	OlInfoWindow.prototype.getMap = function() {
		return this.map;
	};

	OlInfoWindow.prototype.getAnchor = function() {
		return this.anchor1;
	};

	OlInfoWindow.prototype.close = function () {
		this.anchor1 = null;
		if (this.map) {
			this.map.removePopup(this);
		}
	};
};


//
// https://developers.google.com/maps/documentation/javascript/reference
// MarkerFactory: settings={draggable}
function MarkerFactory(settings) {
	this.init(settings);
}

MarkerFactory.prototype.getMapType = function (map) {
	var mapType;

	if (map) {
		mapType = map.getDiv().id.split("-", 2)[1];
	}
	return mapType;
};

MarkerFactory.prototype.initMap = function (map) {
	var aMarkerOptions = [],
		oMarker,
		i;

	if (map) {
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			oMarker = this.aMarkerList[i];
			aMarkerOptions.push(
				{
					position: oMarker.getSimplePosition(),
					label: oMarker.getLabel(),
					title: oMarker.getTitle()
				}
			);
		}
		this.deleteMarkers();
		this.deletePolyline();
		if (this.oInfoWindow) {
			this.oInfoWindow.close();
			if (this.oInfoWindow.dispose) {
				this.oInfoWindow.dispose(); // osm
			}
			this.oInfoWindow = null;
		}
		for (i = 0; i < aMarkerOptions.length; i += 1) {
			oMarker = aMarkerOptions[i];
			this.setMarker(oMarker, i, map);
		}
		gcFiddle.maFa.fitBounds(map);
		this.setPolyline(map);
		gcFiddle.maFa.setMapOnAllMarkers(map);

		if (!this.oInfoWindow) {
			switch (this.getMapType(map)) {
			case "google":
				this.oInfoWindow = new google.maps.InfoWindow({});
				break;
			case "osm":
				this.oInfoWindow = new OlInfoWindow();
				break;
			case "simple":
				break;
			default:
				throw new Error("initMap: Unknown mapType " + this.getMapType(map));
			}
		}
	}
};

MarkerFactory.prototype.init = function (settings) {
	this.settings = settings;
	this.aMarkerList = [];

	this.initMap(gcFiddle.map[gcFiddle.config.mapType]);
};


MarkerFactory.prototype.getMarkers = function () {
	return this.aMarkerList;
};


MarkerFactory.prototype.prepareInfoWindowContent = function (marker) {
	var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
		sContent, oPreviousMarker, iIndex, oPosition1, oPosition2, iAngle, iDistance, sDirection;

	sContent = marker.getTitle() + ": " + position2dmm(marker.getSimplePosition());
	iIndex = this.aMarkerList.indexOf(marker);
	if (iIndex >= 1) {
		oPreviousMarker = this.aMarkerList[iIndex - 1];
		oPosition1 = oPreviousMarker.getSimplePosition();
		oPosition2 = marker.getSimplePosition();
		iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
		iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
		sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
		sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
	}
	return sContent;
};

MarkerFactory.prototype.setMarker = function (options, i, map) {
	var oMarkerOptions = myObjectAssign({}, this.settings, options),
		oMarker,
		that = this;

	if (typeof oMarkerOptions.position === "function") {
		oMarkerOptions.position = (oMarkerOptions.position)();
	}

	if (!oMarkerOptions.label) {
		oMarkerOptions.label = strZeroFormat(i.toString(), 2);
	}
	if (!oMarkerOptions.title) {
		oMarkerOptions.title = "W" + oMarkerOptions.label;
	}

	if (i >= this.aMarkerList.length) { // add new marker
		if (map) {
			switch (this.getMapType(map)) {
			case "google":
				oMarkerOptions.position = new google.maps.LatLng(oMarkerOptions.position.lat, oMarkerOptions.position.lng); // make Google happy: LatLng or LatLngLiteral
				oMarker = new google.maps.Marker(oMarkerOptions);
				oMarker.getSimplePosition = function() {
					return {
						lat: this.position.lat(),
						lng: this.position.lng()
					};
				};
				google.maps.event.addListener(oMarker, "click", function () {
					if (that.oInfoWindow.getAnchor() !== oMarker) {
						that.oInfoWindow.setContent(that.prepareInfoWindowContent(oMarker));
						that.oInfoWindow.open(map, oMarker);
					} else {
						that.oInfoWindow.close();
					}
				});
				google.maps.event.addListener(oMarker, "drag", function () {
					if (that.oInfoWindow.getAnchor() === oMarker) {
						that.oInfoWindow.setContent(that.prepareInfoWindowContent(oMarker));
					}
				});
				break;
			case "osm":
				oMarker = new OlMarker(oMarkerOptions);
				break;
			case "simple":
				oMarker = new SimpleMarker(oMarkerOptions);
				break;
			default:
				throw new Error("setMarker: Unknown mapType " + this.getMapType(map));
			}
			if (this.aMarkerList.length === 0) { // for the first marker
				map.setCenter(oMarker.getPosition());
			}
		} else { // !map
			oMarker = new SimpleMarker(oMarkerOptions);
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
		if (this.oInfoWindow && this.oInfoWindow.getAnchor() === oMarker) {
			this.oInfoWindow.setContent(this.prepareInfoWindowContent(oMarker));
		}
	}
	this.aMarkerList[i] = oMarker;
};

MarkerFactory.prototype.setMapOnAllMarkers = function (map) {
	var oMarker, i;

	for (i = 0; i < this.aMarkerList.length; i += 1) {
		oMarker = this.aMarkerList[i];
		if (oMarker.getMap() !== map) {
			this.aMarkerList[i].setMap(map);
		}
	}
};

MarkerFactory.prototype.clearMarkers = function () {
	this.setMapOnAllMarkers(null);
};

// MarkerFactory.prototype.showMarkers = function (map) {
// 	this.setMapOnAllMarkers(map);
// };

MarkerFactory.prototype.deleteMarkers = function () {
	var oMarker, i;

	this.clearMarkers();
	for (i = 0; i < this.aMarkerList.length; i += 1) {
		oMarker = this.aMarkerList[i];
		if (oMarker.destroy) { // osm needed?
			oMarker.destroy();
		}
		this.aMarkerList[i] = null;
	}
	this.aMarkerList = [];
};

MarkerFactory.prototype.clearPolyline = function () {
	if (this.oPolyLine) {
		this.oPolyLine.setMap(null);
	}
};

MarkerFactory.prototype.deletePolyline = function () {
	this.clearPolyline();
	this.oPolyLine = null;
};

MarkerFactory.prototype.setPolyline = function (map) {
	var aList = [],
		oPolyLineOptions = {
			clickable: true,
			strokeColor: "red",
			strokeOpacity: 0.8,
			strokeWeight: 0.5,
			map: map
		},
		i;

	if (map) {
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			aList.push(this.aMarkerList[i].getPosition());
		}

		if (!this.oPolyLine) {
			switch (this.getMapType(map)) {
			case "google":
				this.oPolyLine = new google.maps.Polyline(oPolyLineOptions);
				break;
			case "osm":
				this.oPolyLine = new OlPolyline(oPolyLineOptions);
				break;
			case "simple":
				this.oPolyLine = new SimplePolyline(oPolyLineOptions);
				break;
			default:
				throw new Error("setPolyline: Unknown mapType " + this.getMapType(map));
			}
		}
		this.oPolyLine.setMap(map);
		this.oPolyLine.setPath(aList);
	}
};

MarkerFactory.prototype.fitBounds = function (map) {
	var oBounds,
		mapType = this.getMapType(map),
		i;

	if (map) {
		if (this.aMarkerList.length) {
			switch (mapType) {
			case "google":
				oBounds = new google.maps.LatLngBounds();
				break;
			case "osm":
				oBounds = new OpenLayers.Bounds();
				break;
			case "simple":
				oBounds = new SimpleLatLngBounds();
				break;
			default:
				throw new Error("fitBounds: Unknown mapType " + mapType);
			}

			for (i = 0; i < this.aMarkerList.length; i += 1) {
				oBounds.extend(this.aMarkerList[i].getPosition());
			}
			map.fitBounds(oBounds);
			if (mapType === "google" && this.aMarkerList.length === 1) { // google: limit zoom level for 1 waypoint
				window.setTimeout(function () {
					map.setZoom(gcFiddle.config.zoom);
				}, 100);
			}
		}
	}
};

MarkerFactory.prototype.getInfoWindow = function () {
	return this.oInfoWindow;
};


//
//
function isWaypoint(s) {
	return s.indexOf("$") === 0; // waypoints start with "$"
}

function setMarkers(variables) {
	var map = gcFiddle.map[gcFiddle.config.mapType],
		sPar,
		oSettings,
		i = 0;

	for (sPar in variables) {
		if (variables.hasOwnProperty(sPar) && isWaypoint(sPar)) {
			oSettings = {
				position: parse2position(variables[sPar]),
				title: sPar
			};
			gcFiddle.maFa.setMarker(oSettings, i, map);
			i += 1;
		}
	}
}

function setPolyline() {
	var map = gcFiddle.map[gcFiddle.config.mapType];

	gcFiddle.maFa.setPolyline(map);
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
		sValue,	oMarker, oPosition,	i, map;

	// center to selected waypoint
	for (i = 0; i < aMarkers.length; i += 1) {
		oMarker = aMarkers[i];
		if (oMarker && sPar === oMarker.getTitle()) {
			oPosition = oMarker.getPosition();
			map = oMarker.getMap();
			if (map) {
				map.setCenter(oPosition);
			}
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
	if (output instanceof ErrorObject) {
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
		setPolyline();
		gcFiddle.maFa.setMapOnAllMarkers(gcFiddle.map[gcFiddle.config.mapType]);
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
		setPolyline();
		gcFiddle.maFa.setMapOnAllMarkers(gcFiddle.map[gcFiddle.config.mapType]);
		onWaypointSelectChange();
	}
}

function onExecuteButtonClick() {
	var varSelect = document.getElementById("varSelect"),
		waypointSelect = document.getElementById("waypointSelect");

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
	gcFiddle.maFa.fitBounds(gcFiddle.map[gcFiddle.config.mapType]);
	setPolyline();
	gcFiddle.maFa.setMapOnAllMarkers(gcFiddle.map[gcFiddle.config.mapType]);
}

function onPreprocessButtonClick() {
	var sInput = document.getElementById("inputArea").value,
		aParts,
		sSection,
		sOutput = "",
		iIndex,
		fnFindTitle = function(str) {
			var sOut = "",
				aParts2 = str.match(/(GC\w+) \S\n([^\n]*)\n([^\n]*)/);

			if (aParts2) {
				sOut = "#" + aParts2[1] + ": " + aParts2[3] + "\n";
			}
			return sOut;
		},
		fnVariables = function(str) { // Find Variables (x=) and set them to 0
			str = str.replace(/(\w+)[ ]*=[ ]*([0-9]*)(.*)/g, function(match, p1, p2, p3) {
				match = match + "\n" + p1 + "=" + ((p2.length > 0) ? p2 : "0") + " #" + ((p3.length > 0) ? (p3.replace(/x/g, "*")) : ""); // some guys write x for *
				// debugVars += p1 + "=" + ((p2.length > 0) ? p2 : "0") + " #" + ((p3.length > 0) ? (p3.replace(/x/g, "*")) : "") + "\n"; // some guys write x for *
				return match;
			});
			return str;
		},
		fnWaypoints = function(str) {
			var iWpIndex = 1;

			str = str.replace(/N\s*(\S+)°\s*(\S+)\.(\S+)[\s#]+E\s*(\S+)°\s*(\S+)\.(\S+)[#\n ]/g, function(sMatch) { // varargs
				var aArgs = [],
					sArg,
					i;

				for (i = 1; i < arguments.length; i += 1) {
					sArg = arguments[i];
					sArg = sArg.toString().replace(/['"]/, ""); // remove apostropthes, quotes
					aArgs.push((/^\d+$/.test(sArg)) ? sArg : '" (' + sArg + ') "');
				}
				if (sMatch.indexOf("\n", sMatch.length - "\n".length) === -1) { // endsWith
					sMatch += "\n";
				}
				sArg = "N " + aArgs[0] + "° " + aArgs[1] + "." + aArgs[2] + " E " + aArgs[3] + "° " + aArgs[4] + "." + aArgs[5];
				if (sArg.indexOf('"') >= 0) {
					sArg = '["' + sArg + '"]';
				} else {
					sArg = '"' + sArg + '"';
				}
				sMatch += "$W" + iWpIndex + "=" + sArg + "\n#";
				// debugWp += "$W" + iWpIndex + "=" + sArg + "\n";
				iWpIndex += 1;
				return sMatch;
			});
			return str;
		},
		fnPrefixHash = function(str) {
			// Prefix lines with hash (if not already there)
			str = str.replace(/\n(?!#)/g, "\n#");
			return str;
		};

	// multi line trim
	sInput = sInput.replace(/\s*\n\s*/gm, "\n");

	// find parts
	aParts = sInput.split(/(Geocache Description:|Additional Hints \((?:Decrypt|Encrypt)\)|Decryption Key|Additional Waypoints|View Larger Map)/);
	if (aParts && aParts.length > 2) {
		iIndex = 0;
		sOutput = fnFindTitle(aParts[iIndex]);
		iIndex += 1;
		sSection = "";
		while (iIndex < aParts.length) {
			if (!sSection) {
				sSection = aParts[iIndex];
			} else {
				sInput = fnPrefixHash(aParts[iIndex]);
				switch (sSection) {
				case "Geocache Description:":
					sInput = fnVariables(sInput);
					sInput = fnWaypoints(sInput);
					break;
				case "Additional Hints (Decrypt)":
				case "Additional Hints (Encrypt)":
					// sInput contains hint
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
					// unknown part ??
					break;
				}
				sOutput += sInput;
				sSection = "";
			}
			iIndex += 1;
		}
	} else {
		sOutput = fnFindTitle(sInput);
		sInput = fnVariables(sInput);
		sInput = fnWaypoints(sInput);
		sOutput += sInput;
	}

	document.getElementById("outputArea").value = sOutput;
}

function onExampleLoaded(sExample) {
	var sCategory = gcFiddle.config.category,
		oExamples = gcFiddle.examples[sCategory],
		sName = sCategory + "/" + sExample + ".js";

	gcFiddle.config.example = sExample;
	window.console.log("NOTE: Example " + sName + " loaded");
	if (oExamples[sExample] === undefined) { // example without id loaded?
		window.console.log("WARNING: Example " + sName + ": Wrong format! Must start with #<id>: <title>");
		if (oExamples["<unknown>"]) {
			oExamples[sExample] = oExamples["<unknown>"];
			delete oExamples["<unknown>"];
		}
	}
	document.getElementById("inputArea").value = oExamples[sExample];
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
		onExecuteButtonClick();
	} else if (sExample) {
		document.getElementById("inputArea").value = "#loading " + sExample + "...";
		document.getElementById("outputArea").value = "waiting...";
		sName = sCategory + "/" + sExample + ".js";
		loadScript(sName, onExampleLoaded, sExample);
	} else {
		document.getElementById("inputArea").value = "#GCTMPL1: Template1\n";
		document.getElementById("outputArea").value = "";
		gcFiddle.config.example = "";
		onExecuteButtonClick();
	}
}

function onCategoryLoaded(sCategory) {
	var exampleSelect = document.getElementById("exampleSelect"),
		sName = sCategory + "/0index.js";

	gcFiddle.config.category = sCategory;
	window.console.log("NOTE: category " + sName + " loaded");
	removeSelectOptions(exampleSelect);
	setExampleList();
	onExampleSelectChange();
}

function setDisabled(id, bDisabled) {
	var element = document.getElementById(id);

	element.disabled = bDisabled;
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
			loadScript(sName, onCategoryLoaded, sCategory);
		}
	}
	setDisabled("deleteButton", (sCategory !== "saved") || !Object.keys(gcFiddle.categories.saved).length);
}

function setHidden(id, bHidden) {
	var element = document.getElementById(id);

	element.hidden = bHidden;
}

function toogleHidden(id) {
	var element = document.getElementById(id);

	element.hidden = !element.hidden;
	return !element.hidden;
}

function onInputLegendClick() {
	gcFiddle.config.showInput = toogleHidden("inputArea");
}

function onOutputLegendClick() {
	gcFiddle.config.showOutput = toogleHidden("outputArea");
}

function onVarLegendClick() {
	gcFiddle.config.showVariable = toogleHidden("varArea");
}

function onNotesLegendClick() {
	gcFiddle.config.showNotes = toogleHidden("notesArea");
}

function onWaypointLegendClick() {
	gcFiddle.config.showWaypoint = toogleHidden("waypointArea");
}

function onMapLegendClick() {
	var sMapType = gcFiddle.config.mapType;

	gcFiddle.config.showMap = toogleHidden("mapCanvas-" + sMapType);
	if (gcFiddle.config.showMap) {
		if (gcFiddle.map[sMapType]) {
			gcFiddle.maFa.fitBounds(gcFiddle.map[sMapType]);
			if (sMapType === "google") {
				google.maps.event.trigger(gcFiddle.map[sMapType], "resize");
			}
		}
	}
}

function onConsoleLogLegendClick() {
	gcFiddle.config.showConsole = toogleHidden("consoleLogArea");
}

function onLocationButtonClick() {
	function showPosition(position) {
		var oPos = latLng2position(position.coords.latitude, position.coords.longitude),
			map = gcFiddle.map[gcFiddle.config.mapType],
			aMarkers = gcFiddle.maFa.getMarkers();

		window.console.log(position2dmm(oPos));
		gcFiddle.maFa.setMarker({
			position: oPos
		}, aMarkers.length, map);

		gcFiddle.maFa.clearMarkers(); // clear needed for SimpleMarker
		gcFiddle.maFa.clearPolyline();
		gcFiddle.maFa.fitBounds(map);
		setPolyline();
		gcFiddle.maFa.setMapOnAllMarkers(map);
	}

	function showError(error) {
		switch (error.code) {
		case error.PERMISSION_DENIED:
			window.console.log("User denied the request for Geolocation.");
			break;
		case error.POSITION_UNAVAILABLE:
			window.console.log("Location information is unavailable.");
			break;
		case error.TIMEOUT:
			window.console.log("The request to get user location timed out.");
			break;
		case error.UNKNOWN_ERROR:
			window.console.log("An unknown error occurred.");
			break;
		default:
			window.console.log("An error occurred.");
			break;
		}
	}

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(showPosition, showError);
	} else {
		window.console.log("Geolocation is not supported by this browser.");
	}
}

function onFitBoundsButtonClick() {
	var map = gcFiddle.map[gcFiddle.config.mapType];

	gcFiddle.maFa.clearMarkers(); // clear needed for SimpleMarker
	gcFiddle.maFa.clearPolyline();
	gcFiddle.maFa.fitBounds(map);
	setPolyline();
	gcFiddle.maFa.setMapOnAllMarkers(map);
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

function onGoogleApiLoaded() {
	var oMapSettings = {
			zoom: gcFiddle.config.zoom
		},
		sMapType = "google",
		mapCanvas = document.getElementById("mapCanvas-" + sMapType),
		oMap;

	window.console.log("NOTE: onGoogleApiLoaded");

	if (!gcFiddle.map[sMapType]) {
		oMap = new google.maps.Map(mapCanvas, oMapSettings);
		gcFiddle.map[sMapType] = oMap;
	}
	if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(gcFiddle.map[sMapType]);
	}
}

function onOpenLayersLoaded() {
	var oMapSettings = {
			zoom: gcFiddle.config.zoom
		},
		sMapType = "osm",
		sMapCanvasId = "mapCanvas-" + sMapType,
		oMap, oMarkers,	oLines,	oSelect, oDrag;

	if (!gcFiddle.map[sMapType]) {
		//fast hack: create prototypes for loaded OpenLayers library
		OlMarker.createPrototype();
		OlPolyline.createPrototype();
		OlInfoWindow.createPrototype();

		setHidden(sMapCanvasId, false); // make sure canvas is not hidden
		oMap = new OpenLayers.Map(sMapCanvasId, oMapSettings);
		setHidden(sMapCanvasId, !gcFiddle.config.showMap);

		oMap.getDiv = function () {
			return this.div;
		};
		oMap.fitBounds = function (bounds) {
			return this.zoomToExtent(bounds);
		};

		gcFiddle.map[sMapType] = oMap;

		oMarkers = new OpenLayers.Layer.Vector("Markers", {
			// http://docs.openlayers.org/library/feature_styling.html
			styleMap: new OpenLayers.StyleMap(
				{
					"default": {
						fillColor: "#FF5500",
						fillOpacity: 0.4,
						fontFamily: "Courier New, monospace",
						fontSize: "12px",
						fontWeight: "bold",
						label: "${label}",
						labelOutlineColor: "white",
						labelOutlineWidth: 3,
						pointRadius: 12,
						strokeColor: "#00FF00",
						strokeOpacity: 0.9,
						strokeWidth: 1,
						title: "${title}"
					},
					select: {
						strokeWidth: 3,
						pointRadius: 14
					}
				}
			)
		});
		oMarkers.events.on({
			featureselected: function(event) {
				var oMarker = event.feature,
					oInfoWindow = gcFiddle.maFa.getInfoWindow(),
					map;

				if (oInfoWindow) {
					oInfoWindow.setContent(gcFiddle.maFa.prepareInfoWindowContent(oMarker));
					map = oMarker.getMap();
					oInfoWindow.open(map, oMarker);
				}
			},
			featureunselected: function() {
				var oInfoWindow = gcFiddle.maFa.getInfoWindow();

				if (oInfoWindow) {
					oInfoWindow.close();
				}
			}
		});

		oLines = new OpenLayers.Layer.Vector("Lines");

		oMap.addLayers([
			new OpenLayers.Layer.OSM("Mapnik"),
			oMarkers,
			oLines
		]);

		oSelect = new OpenLayers.Control.SelectFeature(
			oMarkers, {
				toggle: true,
				toggleKey: "ctrlKey",
				autoActivate: true
			}
		);

		oDrag = new OpenLayers.Control.DragFeature(oMarkers, {
			autoActivate: true,
			onDrag: function(marker /* , pixelPos */) {
				var oPosition = marker.getPosition(), // new (transformed) position
					oPosition2 = oPosition.clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326")), // transform back
					oInfoWindow = gcFiddle.maFa.getInfoWindow();

				marker.setSimplePosition(new LatLng(oPosition2.lat, oPosition2.lon));
				if (oInfoWindow && oInfoWindow.getMap()) {
					oInfoWindow.setContent(gcFiddle.maFa.prepareInfoWindowContent(marker));
					oInfoWindow.setPosition(oPosition);
				}
			}
		});

		oMap.addControls([
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.Zoom(),
			new OpenLayers.Control.LayerSwitcher(),
			oDrag,
			oSelect
		]);

		if (OpenLayers.Control.KeyboardDefaults) {
			oMap.addControl(new OpenLayers.Control.KeyboardDefaults()); // not in OpenLayers.light version
		}
		if (OpenLayers.Control.OverviewMap) {
			oMap.addControl(new OpenLayers.Control.OverviewMap()); // not in OpenLayers.light version
		}
	}
	if (gcFiddle.maFa) {
		gcFiddle.maFa.initMap(gcFiddle.map[sMapType]);
	}
}

function onMapTypeSelectChange() {
	var	aMapCanvas = document.getElementsByClassName("canvas"),
		mapTypeSelect = document.getElementById("mapTypeSelect"),
		oMapSettings = {
			zoom: gcFiddle.config.zoom
		},
		sMapType = mapTypeSelect.value,
		sMapTypeId = "mapCanvas-" + sMapType,
		mapCanvas,
		sProtocol,
		sUrl,
		oItem,
		i;

	gcFiddle.config.mapType = sMapType;
	for (i = 0; i < aMapCanvas.length; i += 1) {
		oItem = aMapCanvas[i];
		if (oItem.id === sMapTypeId) {
			setHidden(oItem.id, !gcFiddle.config.showMap);
			mapCanvas = oItem;
		} else {
			setHidden(oItem.id, true);
		}
	}

	if (!gcFiddle.map[sMapType]) {
		switch (sMapType) {
		case "google":
			sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
			sUrl = sProtocol + "//maps.googleapis.com/maps/api/js" + ((gcFiddle.config.key) ? "?key=" + gcFiddle.config.key : "");
			loadScript(sUrl, function () {
				window.console.log("NOTE: GoogleMaps API loaded");
				onGoogleApiLoaded();
			});
			break;
		case "osm":
			sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
			sUrl = gcFiddle.config.openLayersUrl.replace(/^http(s)?:/, sProtocol);
			loadScript(sUrl, function () {
				window.console.log("NOTE: OpenLayers loaded");
				onOpenLayersLoaded();
			});
			break;
		case "simple":
			gcFiddle.map[sMapType] = new SimpleMap(mapCanvas, oMapSettings);
			mapCanvas.addEventListener("click", function(event) { // TODO
				var x = event.pageX - mapCanvas.offsetLeft,
					y = event.pageY - mapCanvas.offsetTop;

				window.console.log("clicked x=" + x + " y=" + y);
			}, false);
			break;
		default:
			throw new Error("onMapTypeSelectChange: Unknown mapType " + sMapType);
		}
	}
	if (gcFiddle.map[sMapType]) {
		if (gcFiddle.maFa) {
			gcFiddle.maFa.initMap(gcFiddle.map[sMapType]);
		}
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

	myObjectAssign(oConfig, gcFiddleExternalConfig || {});
	gcFiddle.initialConfig = myObjectAssign({}, oConfig);
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
	gcFiddle.maFa = new MarkerFactory({
		draggable: true
	});
	document.getElementById("executeButton").onclick = onExecuteButtonClick;
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
