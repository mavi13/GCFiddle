// Polyfills.js - Some Polyfills for old Browsers
//

"use strict";

if (!window.console) {
	window.console = {
		sText: "",
		log: function (s) {
			window.console.sText += s + "\n";
		},
		debug: function (s) {
			window.console.log(s);
		},
		info: function (s) {
			window.console.log(s);
		},
		warn: function (s) {
			window.console.log(s);
		},
		error: function (s) {
			window.console.log(s);
		}
	};
}

if (!String.prototype.trim) {
	String.prototype.trim = function () { // eslint-disable-line no-extend-native
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
	};
}

if (!document.getElementsByClassName) {
	document.getElementsByClassName = function (sMatch) {
		var aResult = [],
			oElements = document.getElementsByTagName("*"), // >= IE 5.5 or IE 6
			i, oElem;

		sMatch = " " + sMatch + " ";
		for (i = 0; i < oElements.length; i += 1) {
			oElem = oElements[i];
			if ((" " + (oElem.className || oElem.getAttribute("class")) + " ").indexOf(sMatch) > -1) {
				aResult.push(oElem);
			}
		}
		return aResult;
	};
}

if (!document.addEventListener) {
	if (document.attachEvent) {
		document.addEventListener = function (sEvent, fnHandler) {
			document.attachEvent("on" + sEvent, function (event) {
				event = event || window.event;
				event.target = event.target || event.srcElement;
				fnHandler(event);
				return false; //event.preventDefault(); //?
			});
		};
	} else {
		window.console.log("No document.attachEvent found."); // will be ignored
		// debug: trying to fix
		if (document.__proto__.addEventListener) { // eslint-disable-line no-proto
			document.addEventListener = document.__proto__.addEventListener; // eslint-disable-line no-proto
		}
	}
}


// see: https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {
	Array.prototype.forEach = function (callback, thisArg) { // eslint-disable-line no-extend-native
		var T, k, O, len, kValue;

		if (this === null) {
			throw new TypeError(" this is null or not defined");
		}

		// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
		O = Object(this);

		// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
		// 3. Let len be ToUint32(lenValue).
		len = O.length >>> 0; // eslint-disable-line no-bitwise

		// 4. If IsCallable(callback) is false, throw a TypeError exception.
		// See: http://es5.github.com/#x9.11
		if (typeof callback !== "function") {
			throw new TypeError(callback + " is not a function");
		}

		// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
		if (arguments.length > 1) {
			T = thisArg;
		}

		// 6. Let k be 0
		k = 0;

		// 7. Repeat, while k < len
		while (k < len) {
			// a. Let Pk be ToString(k).
			//   This is implicit for LHS operands of the in operator
			// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
			//   This step can be combined with c
			// c. If kPresent is true, then
			if (k in O) {
			// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
				kValue = O[k];

				// ii. Call the Call internal method of callback with T as the this value and
				// argument list containing kValue, k, and O.
				callback.call(T, kValue, k, O);
			}
			// d. Increase k by 1.
			k += 1;
		}
		// 8. return undefined
	};
}


// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/create
if (typeof Object.create !== "function") {
	Object.create = (function (undefined) { // eslint-disable-line no-shadow-restricted-names
		var Temp = function () {
				// empty
			},
			result;

		return function (prototype, propertiesObject) {
			if (prototype !== Object(prototype) && prototype !== null) {
				throw new TypeError("Argument must be an object, or null");
			}
			Temp.prototype = prototype || {};
			if (propertiesObject !== undefined) {
				Object.defineProperties(Temp.prototype, propertiesObject);
			}
			result = new Temp();
			Temp.prototype = null;
			// to imitate the case of Object.create(null)
			if (prototype === null) {
				result.__proto__ = null; // eslint-disable-line no-proto
			}
			return result;
		};
	}());
}

// end
