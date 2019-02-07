// Polyfills.js - Some Polyfills for old browsers, e.g. IE8
//
/* globals Utils */

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

if (!window.console.debug) { // IE8
	window.console.debug = window.console.log;
}

if (!String.prototype.trim) {
	String.prototype.trim = function () { // eslint-disable-line no-extend-native
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
	};
}

if (!document.getElementsByClassName) {
	document.getElementsByClassName = function (sMatch) {
		var aResult = [],
			aElements = document.getElementsByTagName("*"), // >= IE 5.5 or IE 6
			i, oElem;

		sMatch = " " + sMatch + " ";
		for (i = 0; i < aElements.length; i += 1) {
			oElem = aElements[i];
			if ((" " + (oElem.className || oElem.getAttribute("class")) + " ").indexOf(sMatch) > -1) {
				aResult.push(oElem);
			}
		}
		return aResult;
	};
}


/*
if (!Function.prototype.bind) { // for old IE8
	// https://gist.github.com/dsingleton/1312328#file-function-bind-js (or: https://gist.github.com/Daniel-Hug/5682738)
	Function.prototype.bind = function (b) { // eslint-disable-line no-extend-native
		var a = Array.prototype.slice,
			f = a.call(arguments, 1),
			e = this,
			MyClass = function () { },
			d = function () {
				return e.apply(this instanceof MyClass ? this : b || window, f.concat(a.call(arguments)));
			};

		if (typeof this !== "function") {
			throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
		}
		MyClass.prototype = this.prototype;
		d.prototype = new MyClass();
		return d;
	};
}
*/

if (!Function.prototype.bind) {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
	// Does not work with `new funcA.bind(thisArg, args)`
	(function () {
		var ArrayPrototypeSlice = Array.prototype.slice;

		Function.prototype.bind = function (/* otherThis */) { // eslint-disable-line no-extend-native
			var that = this,
				thatArg = arguments[0],
				args = ArrayPrototypeSlice.call(arguments, 1),
				argLen = args.length;

			if (typeof that !== "function") {
				// closest thing possible to the ECMAScript 5
				// internal IsCallable function
				throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
			}
			return function () {
				args.length = argLen;
				args.push.apply(args, arguments);
				return that.apply(thatArg, args);
			};
		};
	}());
}


if (!document.addEventListener) {
	if (document.attachEvent) {
		(function () {
			var eventListeners = [];

			document.addEventListener = function (sEvent, fnHandler) {
				var fnFindCaret = function (event) {
						var oRange, oRange2;

						if (document.selection) {
							event.target.focus();
							oRange = document.selection.createRange();
							oRange2 = oRange.duplicate();
							oRange2.moveToElementText(event.target);
							oRange2.setEndPoint("EndToEnd", oRange);
							event.target.selectionStart = oRange2.text.length - oRange.text.length;
							event.target.selectionEnd = event.target.selectionStart + oRange.text.length;
						}
					},
					fnOnEvent = function (event) {
						event = event || window.event;
						event.target = event.target || event.srcElement;
						if (event.type === "click" && event.target && event.target.tagName === "TEXTAREA") {
							fnFindCaret(event);
						}
						fnHandler(event);
						return false;
					},
					aElements, i;

				// The change event is not bubbled and fired on document for old IE8. So attach it to every select tag
				if (sEvent === "change") {
					aElements = document.getElementsByTagName("select");
					for (i = 0; i < aElements.length; i += 1) {
						aElements[i].attachEvent("on" + sEvent, fnOnEvent);
						eventListeners.push({ //TTT does this work?
							object: this,
							sEvent: sEvent,
							fnHandler: fnHandler,
							fnOnEvent: fnOnEvent
						});
					}
				} else { // e.g. "Click"
					document.attachEvent("on" + sEvent, fnOnEvent);
					eventListeners.push({
						object: this,
						sEvent: sEvent,
						fnHandler: fnHandler,
						fnOnEvent: fnOnEvent
					});
				}
			};

			document.removeEventListener = function (sEvent, fnHandler) {
				var counter = 0,
					eventListener;

				while (counter < eventListeners.length) {
					eventListener = eventListeners[counter];
					if (eventListener.object === this && eventListener.sEvent === sEvent && eventListener.fnHandler === fnHandler) {
						this.detachEvent("on" + sEvent, eventListener.fnOnEvent);
						eventListeners.splice(counter, 1);
						break;
					}
					counter += 1;
				}
			};
		}());
	} else {
		Utils.console.log("No document.attachEvent found."); // will be ignored
		// debug: trying to fix
		if (document.__proto__.addEventListener) { // eslint-disable-line no-proto
			document.addEventListener = document.__proto__.addEventListener; // eslint-disable-line no-proto
		}
	}
}

// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
if (!Array.prototype.forEach) { // currently not used
	Array.prototype.forEach = function (callback, thisArg) { // eslint-disable-line no-extend-native
		var T, k, O, len, kValue;

		if (this === null) {
			throw new TypeError(" this is null or not defined");
		}

		O = Object(this);
		len = O.length >>> 0; // eslint-disable-line no-bitwise

		if (typeof callback !== "function") {
			throw new TypeError(callback + " is not a function");
		}

		if (arguments.length > 1) {
			T = thisArg;
		}

		k = 0;

		while (k < len) {
			if (k in O) {
				kValue = O[k];
				callback.call(T, kValue, k, O);
			}
			k += 1;
		}
	};
}

// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function indexOf(member, startFrom) { // eslint-disable-line no-extend-native,func-names
		var index = isFinite(startFrom) ? Math.floor(startFrom) : 0,
			that = this instanceof Object ? this : new Object(this), // eslint-disable-line consistent-this,no-new-object
			length = isFinite(that.length) ? Math.floor(that.length) : 0;

		if (index >= length) {
			return -1;
		}

		if (index < 0) {
			index = Math.max(length + index, 0);
		}

		if (member === undefined) {
			// Since `member` is undefined, keys that don't exist will have the same value as `member`, and thus do need to be checked.
			do {
				if (index in that && that[index] === undefined) {
					return index;
				}
				index += 1;
			} while (index < length);
		} else {
			do {
				if (that[index] === member) {
					return index;
				}
				index += 1;
			} while (index < length);
		}
		return -1;
	};
}

// based on: https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map) {
	Array.prototype.map = function (callback, thisArg) { // eslint-disable-line no-extend-native,func-names
		var aValues = [],
			oObject = Object(this),
			len = oObject.length,
			T, i, kValue, mappedValue;

		if (arguments.length > 1) {
			T = thisArg;
		}

		for (i = 0; i < len; i += 1) {
			if (i in oObject) {
				kValue = oObject[i];
				mappedValue = callback.call(T, kValue, i, oObject);
				aValues[i] = mappedValue;
			}
		}
		return aValues;
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

if (!Object.keys) {
	// https://tokenposts.blogspot.com/2012/04/javascript-objectkeys-browser.html
	Object.keys = function (o) {
		var k = [],
			p;

		if (o !== Object(o)) {
			throw new TypeError("Object.keys called on a non-object");
		}
		for (p in o) {
			if (Object.prototype.hasOwnProperty.call(o, p)) {
				k.push(p);
			}
		}
		return k;
	};
}

if (!Utils.localStorage) { // for IE8 it is only available if page is hosted on web server, so we simulate it...
	// idea from: https://gist.github.com/remy/350433
	(function () {
		var oData = {},
			Storage = function () {
				this.clear();
			};

		Storage.prototype = {
			clear: function () {
				oData = {};
				this.length = 0;
			},
			key: function (index) {
				var i = 0,
					item;

				for (item in oData) {
					if (oData.hasOwnProperty(item)) {
						if (i === index) {
							return item;
						}
						i += 1;
					}
				}
				return null;
			},
			getItem: function (key) {
				return (oData[key] === undefined) ? null : oData[key];
			},
			setItem: function (key, value) {
				if (oData[key] === undefined) {
					this.length += 1;
				}
				oData[key] = String(value);
			},
			removeItem: function (key) {
				if (oData[key] !== undefined) {
					delete oData[key];
					this.length -= 1;
				}
			}
		};
		Utils.localStorage = new Storage();
	}());
}

// for old IE8
(function () { // adaptHiddenProperties
	var aElements = document.getElementsByTagName("*"), // >= IE 5.5 or IE 6
		i, oElem;

	for (i = 0; i < aElements.length; i += 1) {
		oElem = aElements[i];
		if (oElem.hidden === "") {
			oElem.hidden = true;
		}
	}
}());

// end
