// View.js - View
//
/* globals Utils */

"use strict";

function View(options) {
	this.init(options);
}

View.prototype = {
	init: function (/* options */) {
		// empty
	},

	getHidden: function (sId) {
		return document.getElementById(sId).hidden;
	},
	setHidden: function (sId, bHidden) {
		var element = document.getElementById(sId);

		element.hidden = bHidden;
		element.style.display = (bHidden) ? "none" : "block"; // for old browsers
		return this;
	},
	toogleHidden: function (sId) {
		return this.setHidden(sId, !this.getHidden(sId));
	},

	setDisabled: function (sId, bDisabled) {
		var element = document.getElementById(sId);

		element.disabled = bDisabled;
		return this;
	},

	getAllSelectOptionValues: function (sId) {
		var aItems = [],
			select, i, options;

		select = document.getElementById(sId);
		options = select.options;

		for (i = 0; i < options.length; i += 1) {
			aItems.push(options[i].value);
		}
		return aItems;
	},

	setSelectOptions: function (sId, aOptions) {
		var select, i, oItem, option;

		select = document.getElementById(sId);
		for (i = 0; i < aOptions.length; i += 1) {
			oItem = aOptions[i];
			if (i >= select.length) {
				option = document.createElement("option");
				option.value = oItem.value;
				option.text = oItem.text;
				option.title = oItem.title;
				select.add(option);
			} else {
				option = select.options[i];
				if (option.value !== oItem.value) {
					option.value = oItem.value;
				}
				if (option.text !== oItem.text) {
					if (Utils.debug > 1) {
						Utils.console.debug("DEBUG: setSelectOptions: " + sId + ": text changed for index " + i + ": " + oItem.text);
					}
					option.text = oItem.text;
					option.title = oItem.title;
				}
			}
			if (oItem.selected) { // multi-select
				option.selected = oItem.selected;
			}
		}
		// remove additional select options
		select.options.length = aOptions.length;
		return this;
	},
	getSelectValue: function (sId) {
		var select = document.getElementById(sId);

		return select.value;
	},
	getMultiSelectValues: function (sId) {
		var select = document.getElementById(sId),
			aValues = [],
			i;

		// fast but not universally supported
		if (select.selectedOptions !== undefined) {
			for (i = 0; i < select.selectedOptions.length; i += 1) {
				aValues.push(select.selectedOptions[i].value);
			}

		// compatible, but can be painfully slow
		} else {
			for (i = 0; i < select.options.length; i += 1) {
				if (select.options[i].selected) {
					aValues.push(select.options[i].value);
				}
			}
		}
		return aValues;
	},
	setSelectValue: function (sId, sValue) {
		var select = document.getElementById(sId);

		if (sValue) {
			select.value = sValue;
		}
		return this;
	},
	setSelectedIndex: function (sId, iIndex) {
		var select = document.getElementById(sId);

		select.selectedIndex = iIndex;
		return this;
	},
	setSelectTitleFromSelectedOption: function (sId) {
		var select = document.getElementById(sId),
			iSelectedIndex = select.selectedIndex;

		select.title = (iSelectedIndex >= 0) ? select.options[iSelectedIndex].title : "";
		return this;
	},
	getSelectLength: function (sId) {
		var select = document.getElementById(sId);

		return select.length;
	},

	getAreaValue: function (sId) {
		var area = document.getElementById(sId);

		return area.value;
	},
	setAreaValue: function (sId, sValue) {
		var area = document.getElementById(sId);

		area.value = sValue;
		return this;
	},

	getAreaSelection: function (sId) {
		var area = document.getElementById(sId),
			oSelection = {
				value: area.value,
				selectionStart: area.selectionStart,
				selectionEnd: area.selectionEnd
			};

		return oSelection;
	},
	setAreaSelection: function (sId, iPos, iEndPos) {
		var area = document.getElementById(sId),
			fnScrollToSelection = function (textArea) {
				// scrolling needed for Chrome (https://stackoverflow.com/questions/7464282/javascript-scroll-to-selection-after-using-textarea-setselectionrange-in-chrome)
				var charsPerRow = textArea.cols,
					selectionRow = (textArea.selectionStart - (textArea.selectionStart % charsPerRow)) / charsPerRow,
					lineHeight = textArea.clientHeight / textArea.rows;

				textArea.scrollTop = lineHeight * selectionRow;
			};

		if (area.selectionStart !== undefined) {
			area.focus();
			area.selectionStart = iPos;
			area.selectionEnd = iEndPos;
			fnScrollToSelection(area);
		}
		return this;
	},

	setInputType: function (sId, sType) { // set type before value!
		var input = document.getElementById(sId);

		// old IE throws error when changing input type
		try {
			input.type = sType;
		} catch (e) {
			Utils.console.warn("Browser does not allow to set input.type=" + sType + ": " + e.message);
		}
		return this;
	},
	getInputValue: function (sId) {
		var input = document.getElementById(sId);

		return input.value;
	},
	setInputValue: function (sId, sValue) {
		var input = document.getElementById(sId);

		input.value = sValue;
		return this;
	},
	setInputValueTitle: function (sId, sValue, sTitle) {
		var input = document.getElementById(sId);

		input.value = sValue;
		input.title = sTitle;
		return this;
	},
	setInputInvalid: function (sId, bInvalid) {
		var input = document.getElementById(sId),
			fnAddClass = function (element, sClassName) {
				var aClasses = element.className.split(" ");

				if (aClasses.indexOf(sClassName) === -1) {
					element.className += " " + sClassName;
				}
			},
			fnRemoveClass = function (element, sClassName) {
				var regExp = new RegExp("\\b" + sClassName + "\\b", "g");

				element.className = element.className.replace(regExp, "");
			};

		if (bInvalid) {
			fnAddClass(input, "invalid");
		} else {
			fnRemoveClass(input, "invalid");
		}
		return this;
	},

	setLegendText: function (sId, sText) {
		var legend = document.getElementById(sId);

		legend.textContent = sText;
		return this;
	},
	getLabelText: function (sId) {
		var label = document.getElementById(sId);

		return label.innerText;
	},
	setLabelText: function (sId, sText) {
		var label = document.getElementById(sId);

		label.innerText = sText;
		return this;
	},
	setLabelTitle: function (sId, sTitle) {
		var label = document.getElementById(sId);

		label.title = sTitle;
		return this;
	},
	setSpanText: function (sId, sText) {
		var span = document.getElementById(sId);

		span.textContent = sText;
		return this;
	},

	activateCanvasById: function (sId, bHidden) {
		var aMapCanvas = document.getElementsByClassName("canvas"),
			i, oItem;

		// activate one canvas and deactivate others
		for (i = 0; i < aMapCanvas.length; i += 1) {
			oItem = aMapCanvas[i];
			this.setHidden(oItem.id, (oItem.id === sId) ? bHidden : true); // set selected canvas to bHidden, others to true
		}
		return this;
	},

	// https://stackoverflow.com/questions/6604192/showing-console-errors-and-alerts-in-a-div-inside-the-page
	redirectConsole: function () {
		var aVerbs = [
				"log",
				"debug",
				"info",
				"warn",
				"error"
			],
			consoleLogArea = document.getElementById("consoleLogArea"),
			sVerb, i,
			fnConsoleGenerator = function (fnMethod, sVerb2, oLog) {
				return function () { // varargs
					var aArgs;

					if (fnMethod) {
						if (fnMethod.apply) {
							fnMethod.apply(console, arguments);
						} else { // we do our best without apply
							aArgs = [];
							for (i = 0; i < arguments.length; i += 1) {
								aArgs.push(arguments[i]);
							}
							fnMethod(aArgs.join(" ")); // combine arguments for IE8
						}
					}
					oLog.value += sVerb2 + ": " + Array.prototype.slice.call(arguments).join(" ") + "\n";
				};
			};

		for (i = 0; i < aVerbs.length; i += 1) {
			sVerb = aVerbs[i];
			window.console[sVerb] = fnConsoleGenerator(window.console[sVerb], sVerb, consoleLogArea);
		}
	},
	showConfirmPopup: function (message) {
		var confirm = window.confirm;

		return confirm(message);
	},
	attachEventHandler: function (fnEventHandler) {
		document.addEventListener("click", fnEventHandler, false);
		document.addEventListener("change", fnEventHandler, false);
		return this;
	},
	detachEventHandler: function (fnEventHandler) {
		document.removeEventListener("click", fnEventHandler);
		document.removeEventListener("change", fnEventHandler);
		return this;
	}
};

// end
