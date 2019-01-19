// Utils.js - Utils...
//

"use strict";

var Utils = {
	loadScript: function (url, callback, arg) {
		var script = document.createElement("script"),
			sFullUrl;

		script.type = "text/javascript";
		script.defer = "defer"; // only for IE
		script.async = true;
		if (script.readyState) { // IE
			script.onreadystatechange = function () {
				if (script.readyState === "loaded" || script.readyState === "complete") {
					script.onreadystatechange = null;
					return callback(sFullUrl, arg);
				}
				return null;
			};
		} else { // Others
			script.onload = function () {
				callback(sFullUrl, arg);
			};
		}
		script.src = url;
		sFullUrl = script.src;
		document.getElementsByTagName("head")[0].appendChild(script);
		return sFullUrl;
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
	getHidden: function (id) {
		return document.getElementById(id).hidden;
	},
	setElementProperty: function (id, propertyName, propertyValue) {
		var element = document.getElementById(id),
			bOldValue = element[propertyName];

		element[propertyName] = propertyValue;

		if (propertyName === "hidden") { // for old browsers
			element.style.display = (propertyValue) ? "none" : "block";
		}
		return Boolean(bOldValue); // Boolean for old browsers
	},
	setHidden: function (id, hidden) {
		return Utils.setElementProperty(id, "hidden", hidden);
	},
	toogleHidden: function (id) {
		return this.setHidden(id, !this.getHidden(id));
	},
	setDisabled: function (id, disabled) {
		return Utils.setElementProperty(id, "disabled", disabled);
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
			window.console.warn("initLocalStorage: " + e);
		}
	}
};

Utils.initLocalStorage();

// end
