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
						Utils.console.debug("setSelectOptions: " + sId + ": text changed for index " + i + ": " + oItem.text);
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
			iSelectedIndex = select.selectedIndex,
			sTitle;

		sTitle = (iSelectedIndex >= 0) ? select.options[iSelectedIndex].title : "";
		select.title = sTitle;
		return this;
	},
	getSelectLength: function (sId) {
		var select = document.getElementById(sId);

		return select.length;
	},

	getArea: function (sId) { // normally this should not be used
		var area = document.getElementById(sId);

		return area;
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
			// https://stackoverflow.com/questions/7464282/javascript-scroll-to-selection-after-using-textarea-setselectionrange-in-chrome (AlienKevin)
			fnSetSelectionRange = function (textarea, selectionStart, selectionEnd) {
				var fullText, scrollHeight, scrollTop, textareaHeight;

				// First scroll selection region to view
				fullText = textarea.value;
				textarea.value = fullText.substring(0, selectionEnd);
				// For some unknown reason, you must store the scollHeight to a variable before setting the textarea value. Otherwise it won't work for long strings
				scrollHeight = textarea.scrollHeight;
				textarea.value = fullText;
				scrollTop = scrollHeight;
				textareaHeight = textarea.clientHeight;
				if (scrollTop > textareaHeight) {
					// scroll selection to center of textarea
					scrollTop -= textareaHeight / 2;
				} else {
					scrollTop = 0;
				}
				textarea.scrollTop = scrollTop;

				// Continue to set selection range
				textarea.setSelectionRange(selectionStart, selectionEnd);
			};

		if (area.selectionStart !== undefined) {
			if (area.setSelectionRange) {
				area.focus(); // not needed for scrolling but we want to see the selected text
				fnSetSelectionRange(area, iPos, iEndPos);
			} else {
				area.focus();
				area.selectionStart = iPos;
				area.selectionEnd = iEndPos;
			}
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
	setInputMin: function (sId, sMin) {
		var input = document.getElementById(sId);

		input.min = sMin;
		return this;
	},
	setInputMax: function (sId, sMax) {
		var input = document.getElementById(sId);

		input.max = sMax;
		return this;
	},
	setInputStep: function (sId, sStep) {
		var input = document.getElementById(sId);

		input.step = sStep;
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
	setInputTitle: function (sId, sTitle) {
		var input = document.getElementById(sId);

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

		legend.innerText = sText; // innerText works also on ond IE8, textContent not
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

		span.innerText = sText;
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


	showConfirmPopup: function (message) {
		var confirm = window.confirm;

		return confirm(message);
	},
	attachEventHandler: function (fnEventHandler) {
		var varInput;

		document.addEventListener("click", fnEventHandler, false);
		document.addEventListener("change", fnEventHandler, false);

		varInput = document.getElementById("varInput");
		if (varInput.addEventListener) { // not for IE8
			varInput.addEventListener("input", fnEventHandler, false); // for range slider
		}
		return this;
	},
	detachEventHandler: function (fnEventHandler) {
		var varInput;

		document.removeEventListener("click", fnEventHandler);
		document.removeEventListener("change", fnEventHandler);

		varInput = document.getElementById("varInput");
		varInput.removeEventListener("input", fnEventHandler); // for range slider
		return this;
	}
};

// end
