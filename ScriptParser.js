// ScriptParser.js - Parse calculation scripts
//
/* globals window, Utils, LatLng, gDebug */

"use strict";

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
			advanceWhile = function (fn) {
				var sToken2 = "";

				do {
					sToken2 += sChar;
					sChar = advance();
				} while (fn(sChar));
				return sToken2;
			},
			advanceWhileEscape = function (fn) {
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
	// Manipulates tokens to its left (e.g: +)? => left denotative function led(), otherwise null denotative function nud()), (e.g. unary -)
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
			mOperators = {
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

			mFunctions = {
				// concat(s1, s2, ...) concatenate strings (called by operator [..] )
				concat: function () { // varargs
					var	s = "",
						i;

					for (i = 0; i < arguments.length; i += 1) {
						s += String(arguments[i]);
					}
					return s;
				},

				// sin(d) sine of d (d in degrees)
				sin: function (degrees) {
					return Math.sin(Utils.toRadians(degrees));
				},

				// cos(d) cosine of d (d in degrees)
				cos: function (degrees) {
					return Math.cos(Utils.toRadians(degrees));
				},

				// tan(d) tangent of d (d in degrees)
				tan: function (degrees) {
					return Math.tan(Utils.toRadians(degrees));
				},

				// asin(x) arcsine of x (returns degrees)
				asin: function (x) {
					return Utils.toDegrees(Math.asin(x));
				},

				// acos(x) arccosine of x (returns degrees)
				acos: function (x) {
					return Utils.toDegrees(Math.acos(x));
				},

				// atan(x) arctangent of x (returns degrees)
				atan: function (x) {
					return Utils.toDegrees(Math.atan(x));
				},
				abs: Math.abs,

				// round(x) round to the nearest integer
				round: Math.round,

				// ceil(x) round upwards to the nearest integer
				ceil: Math.ceil,

				// floor(x) round downwards to the nearest integer
				floor: Math.floor,
				"int": function (x) { return (x > 0) ? Math.floor(x) : Math.ceil(x); }, // ES6: Math.trunc
				// mod: or should it be... https://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
				mod: function (a, b) { return a % b; },
				log: Math.log,
				exp: Math.exp,
				sqrt: Math.sqrt,

				// max(x, y, ...)
				max: Math.max,

				// min(x, y, ...)
				min: Math.min,

				// random() random number between [0,1)
				random: Math.random,

				// gcd(a, b) greatest common divisor of a and b (Euclid)
				gcd: function (a, b) {
					var h;

					while (b !== 0) {
						h = a % b;
						a = b;
						b = h;
					}
					return a;
				},

				// fib(x) xth Fibonacci number
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

				// deg() switch do degrees mode (default, ignored, we always use degrees)
				deg: function () {
					window.console.log("deg() ignored.");
				},

				// rad() switch do radians mode (not supported, we always use degrees)
				/*
				rad: function () {
					window.console.warn("rad() not supported.");
				},
				*/

				// r2d(x) (rad2deg)
				r2d: function (radians) {
					return Utils.toDegrees(radians);
				},
				// d2r(d) (deg2rad)
				d2r: function (degrees) {
					return Utils.toRadians(degrees);
				},

				// bearing(w1, w2) bearing between w1 and w2 in degrees
				bearing: function (w1, w2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2);

					return oPosition1.bearingTo(oPosition2);
				},

				// cb(w1, angle1, w2, angle2) crossbearing
				cb: function (w1, angle1, w2, angle2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2),
						oPosition3,	sValue;

					oPosition3 = LatLng.prototype.intersection(oPosition1, angle1, oPosition2, angle2);
					sValue = oPosition3.toString();
					return sValue;
				},

				// distance(w1, w2) distance between w1 and w2 in meters
				distance: function (w1, w2) {
					var oPosition1 = new LatLng().parse(w1),
						oPosition2 = new LatLng().parse(w2),
						nValue;

					nValue = oPosition1.distanceTo(oPosition2);
					return nValue;
				},

				// project(w1, bearing, distance) project from w1 bearing degrees and distance meters
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

				// format(w1, fmt): format waypoint w1 with format "dmm", "dms", or "dd"
				format: function (w1, format) {
					var oPosition = new LatLng().parse(w1),
						sValue;

					sValue = oPosition.toString(format, true);
					if (sValue === undefined) { // format not "dmm", "dms", "dd"
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
						x = mFunctions.ct(x);
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

				// sval (separate value) for A-Z, a-z: 01 02 03 ...
				sval: function (s) {
					var iCodeBeforeA = "a".charCodeAt(0) - 1,
						sOut = "",
						i;

					s = s.toString().toLowerCase().replace(/[^a-z]/g, "");
					for (i = 0; i < s.length; i += 1) {
						sOut += ((i > 0) ? " " : "") + mFunctions.zformat(s.charCodeAt(i) - iCodeBeforeA, 2);
					}
					return sOut;
				},

				// vstr (value(s) to string, optiomnal iShift) (new)
				vstr: function (s, iShift) {
					var iCodeBeforeA = "a".charCodeAt(0) - 1,
						sOut = "",
						aNum, iCode;

					iShift = iShift || 0;
					iShift = Number(iShift);
					s = s.toString().toLowerCase().replace(/[^0-9]/g, " ");
					aNum = s.split(" ");
					if (aNum) {
						sOut = aNum.reduce(function (sList, iNum) {
							iCode = ((Number(iNum) - 1) + iShift) % 26;
							if (iCode < 0) {
								iCode += 26;
							}
							iCode += 1;
							return sList + String.fromCharCode(iCode + iCodeBeforeA);
						}, sOut);
					}
					return sOut;
				},

				// encode(s, m1, m2) encode s with character mapping m1 to m2
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

				// ic(n) Ignore variable case (not implemented, we are always case sensitive)
				ic: function (mode) {
					if (typeof mode === "undefined") { // no parameter, return status
						return false;
					}
					window.console.warn("ic(mode) not implemented.");
					return "";
				},

				// instr (indexOf with positions starting with 1), 'start' is optional
				instr: function (s, search, start) {
					return s.toString().indexOf(search, (start) ? (start - 1) : 0) + 1;
				},

				// countstr(s, c) Count number of occurrences of substring s2 in s
				// https://stackoverflow.com/questions/881085/count-the-number-of-occurrences-of-a-character-in-a-string-in-javascript
				countstr: function (s, s2) {
					return (s.toString().match(new RegExp(s2, "g")) || []).length;
				},

				// count(s, s2) count individual characters from s2 in string s
				count: function (s, s2) {
					var sOut = "",
						aSearch;

					s = s.toString();
					s2 = s2.toString();
					if (s2.length === 1) {
						return mFunctions.countstr(s, s2);
					}
					aSearch = s2.toString().split("");
					sOut = aSearch.reduce(function (sSum, sStr) {
						return sSum + " " + sStr + "=" + mFunctions.countstr(s, sStr);
					}, sOut);
					return sOut.trim();
					// CacheWolf appends a space, we don't do that.
				},

				// len(s) length of string
				len: function (s) {
					return s.toString().length;
				},

				// mid(s, index, len) substr with positions starting with 1
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

				// replace(s, s1, r1): replace all occurrences of s1 in s by r1
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
						s = mFunctions.zformat(s, format.length);
					} else { // assume 000.00
						aFormat = format.split(".", 2);
						s = Number(s).toFixed(aFormat[1].length);
						s = mFunctions.zformat(s, format.length);
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
						oOut, oErr, iEndPos;

					oOut = new ScriptParser().calculate(input, oVars);
					if (oOut.error) {
						oErr = oOut.error;
						iEndPos = oErr.pos + oErr.value.toString().length;
						oOut.text = oErr.message + ": '" + oErr.value + "' (pos " + oErr.pos + "-" + iEndPos + ")";
					}
					return oOut.text;
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

			checkArgs = function (name, aArgs) {
				var oFunction = mFunctions[name];

				if (oFunction.length !== aArgs.length) {
					if (gDebug && gDebug.level >= 1) {
						gDebug.log("DEBUG: function " + name + " expects " + oFunction.length + " parameters but called with " + aArgs.length);
					}
				}
			},

			parseNode = function (node) {
				var i, sValue, aNodeArgs;

				if (gDebug && gDebug.level > 2) {
					gDebug.log("DEBUG: parseNode node=%o type=" + node.type + " name=" + node.name + " value=" + node.value + " left=%o right=%o args=%o", node, node.left, node.right, node.args);
				}
				if (node.type === "number" || node.type === "string") {
					sValue = node.value;
				} else if (mOperators[node.type]) {
					if (node.left) {
						sValue = mOperators[node.type](parseNode(node.left), parseNode(node.right));
					} else {
						sValue = mOperators[node.type](parseNode(node.right));
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
					aNodeArgs = []; // do not modify node.args here (could be a parameter of defined function)
					for (i = 0; i < node.args.length; i += 1) {
						aNodeArgs[i] = parseNode(node.args[i]);
					}
					if (mFunctions[node.name] === undefined) {
						throw new ScriptParser.ErrorObject("Function is undefined", node.name, node.pos);
					}
					checkArgs(node.name, aNodeArgs);
					sValue = mFunctions[node.name].apply(node, aNodeArgs);
				} else if (node.type === "function") {
					mFunctions[node.name] = function () {
						for (i = 0; i < node.args.length; i += 1) {
							oArgs[node.args[i].value] = arguments[i];
						}
						sValue = parseNode(node.value);
						// oArgs = {}; //do not reset here!
						return sValue;
					};
				} else if (node.type === "formatter") {
					sValue = parseNode(node.left);
					sValue = mFunctions.nformat(sValue, node.value);
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
		var oOut = {
				text: ""
			},
			aTokens, aParseTree, sOutput;

		try {
			aTokens = this.lex(input);
			aParseTree = this.parse(aTokens);
			sOutput = this.evaluate(aParseTree, variables);
			oOut.text = sOutput;
		} catch (e) {
			oOut.error = e;
		}
		return oOut;
	}
};


ScriptParser.ErrorObject = function (message, value, pos) {
	this.message = message;
	this.value = value;
	this.pos = pos;
};
// end
