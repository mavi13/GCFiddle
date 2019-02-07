// Utils.js - Utils...
//

"use strict";

var Utils = {
	debug: 0,
	consoleText: "",
	console: (typeof console !== "undefined") ? console : { // we must load Utils first to dynamically load Polyfill, but we maybe need a console on old browsers or if the console is closed
		log: function (s) {
			Utils.consoleText += s + "\n";
		},
		debug: function (s) {
			Utils.consoleText += s + "\n";
		},
		info: function (s) {
			Utils.consoleText += s + "\n";
		},
		warn: function (s) {
			Utils.consoleText += s + "\n";
		},
		error: function (s) {
			Utils.consoleText += s + "\n";
		}
	},
	loadScript: function (sUrl, fnSuccess, fnError) {
		// inspired by https://github.com/requirejs/requirejs/blob/master/require.js
		var that = this,
			iIEtimeoutCount = 3,
			script, sFullUrl,
			onScriptLoad = function (event) {
				var node = event.currentTarget || event.srcElement;

				if (Utils.debug > 1) {
					Utils.console.debug("DEBUG: onScriptLoad: " + node.src);
				}
				node.removeEventListener("load", onScriptLoad, false);
				node.removeEventListener("error", that.onScriptError, false);

				if (fnSuccess) {
					fnSuccess(sFullUrl);
				}
			},
			onScriptError = function (event) {
				var node = event.currentTarget || event.srcElement;

				if (Utils.debug > 1) {
					Utils.console.debug("DEBUG: onScriptError: " + node.src);
				}
				node.removeEventListener("load", onScriptLoad, false);
				node.removeEventListener("error", onScriptError, false);

				if (fnError) {
					fnError(sFullUrl);
				}
			},
			onScriptReadyStateChange = function (event) { // for IE
				var node, iTimeout;

				if (event) {
					node = event.currentTarget || event.srcElement;
				} else {
					node = script;
				}
				if (node.detachEvent) {
					node.detachEvent("onreadystatechange", onScriptReadyStateChange);
				}

				if (Utils.debug > 1) {
					Utils.console.debug("DEBUG: onScriptReadyStateChange: " + node.src);
				}
				// check also: https://stackoverflow.com/questions/1929742/can-script-readystate-be-trusted-to-detect-the-end-of-dynamic-script-loading
				if (node.readyState !== "loaded" && node.readyState !== "complete") {
					if (node.readyState === "loading" && iIEtimeoutCount) {
						iIEtimeoutCount -= 1;
						iTimeout = 200; // some delay
						Utils.console.error("onScriptReadyStateChange: Still loading: " + node.src + " Waiting " + iTimeout + "ms (count=" + iIEtimeoutCount + ")");
						setTimeout(function () {
							onScriptReadyStateChange(); // check again
						}, iTimeout);
					} else {
						// iIEtimeoutCount = 3;
						Utils.console.error("onScriptReadyStateChange: Cannot load file " + node.src + " readystate=" + node.readyState);
						if (fnError) {
							fnError(sFullUrl);
						}
					}
				} else if (fnSuccess) {
					fnSuccess(sFullUrl);
				}
			};

		script = document.createElement("script");
		script.type = "text/javascript";
		script.charset = "utf-8";
		// script.defer = "defer"; // only for IE?
		script.async = true;
		if (script.readyState) { // IE
			iIEtimeoutCount = 3;
			script.attachEvent("onreadystatechange", onScriptReadyStateChange);
		} else { // Others
			script.addEventListener("load", onScriptLoad, false);
			script.addEventListener("error", onScriptError, false);
		}
		script.src = sUrl;
		sFullUrl = script.src;
		document.getElementsByTagName("head")[0].appendChild(script);
		return sFullUrl;
	},
	loadStyle: function (sUrl, fnCallback, arg) {
		var link;

		link = document.createElement("link");
		link.rel = "stylesheet";
		link.onload = function () {
			fnCallback(arg);
		};
		link.href = sUrl;
		document.getElementsByTagName("head")[0].appendChild(link);
	},
	strNumFormat: function (s, iLen, sFillChar) {
		var i;

		s = String(s);
		if (sFillChar === null) {
			sFillChar = " ";
		}
		for (i = s.length; i < iLen; i += 1) {
			s = sFillChar + s;
		}
		return s;
	},
	strZeroFormat: function (s, iLen) {
		return Utils.strNumFormat(s, iLen, "0");
	},
	toRadians: function (deg) {
		return deg * Math.PI / 180;
	},
	toDegrees: function (rad) {
		return rad * 180 / Math.PI;
	},
	objectAssign: function (oTarget) { // varargs // Object.assign is ES6, not in IE
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
	stringTrimLeft: function (s) {
		return s.replace(/^[\s\uFEFF\xA0]+/g, "");
	},
	stringTrimRight: function (s) {
		return s.replace(/[\s\uFEFF\xA0]+$/g, "");
	},
	stringStartsWith: function (sStr, sFind, iPos) {
		iPos = iPos || 0;
		return sStr.indexOf(sFind, iPos) === iPos;
	},
	stringEndsWith: function (str, find) {
		return str.indexOf(find, str.length - find.length) !== -1;
	},
	stringCapitalize: function (str) {
		return str.charAt(0).toUpperCase() + str.substring(1);
	},
	getChangedParameters: function (current, initial) {
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
	},
	localStorage: null,
	initLocalStorage: function () {
		try {
			Utils.localStorage = window.localStorage; // due to a bug in Edge this will throw an error when hosting locally (https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8816771/)
		} catch (e) {
			Utils.console.log("initLocalStorage: " + e);
		}
	}
};


if (typeof module !== "undefined" && module.exports) {
	module.exports = Utils;
}
// end
