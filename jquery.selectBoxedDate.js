/***************************************************************
 *  Copyright notice
 *
 *  (c) 2013 Taras Zakus <Taras.Zakus@pixabit-interactive.de>, Pixabit Interactive GmbH
 *
 *  License: MIT (http://www.opensource.org/licenses/mit-license.php)
 ***************************************************************/

(function($, itemsSelector, pluginDataKey) {
	"use strict";

	/**
	 * Constructor
	 * @param element
	 * @param options
	 * @constructor
	 */
	var SelectBoxedDate = function(element, options) {
		this.$element = $(element);
		this.options = options;

		if (!this.$element.is("input")) {
			throw "The element must be of type input!";
		}

		if (!this.$element.is(":hidden")) {
			this.$element.hide();
		}

		this.date = (element.value.length > 0
			? this.parseDate(element.value)
			: null);

		this.rangeFrom = this.getDateObject(this.options.rangeFrom);
		this.rangeTo = this.getDateObject(this.options.rangeTo);
		if (this.options.rangeRound) {
			// Set month range.
			this.rangeFrom.setMonth(0);
			this.rangeTo.setMonth(11);
			// Set date range.
			this.rangeFrom.setDate(1);
			this.rangeTo.setDate(31);
		}

		this.selectBoxes = [];
		var mapping = this.options.mapping.split("|"),
			wrapper = $('<div/>'),
			i, type, selectBox;
		for (i = 0; type = mapping[i]; i++) {
			selectBox = createSelectBox(
				this.options["label" + firstLetterUpperCase(type)],
				type,
				this.rangeFrom,
				this.rangeTo,
				((this.date instanceof Date)
					? this.date["get" + firstLetterUpperCase(fitToDateObjectType(type))]()
					: null),
				this.options.onSelectBoxOptionsChanged
			);
			selectBox.appendTo(wrapper);
			this.selectBoxes.push(selectBox);
		}
		wrapper.insertAfter(this.$element);
		if (typeof this.options.onSelectBoxesCreated === "function") {
			this.options.onSelectBoxesCreated.call(this);
		}

		var that = this,
			selectBoxes = [],
			month_selectBox,
			year_selectBox;
		for (i = 0; selectBox = this.selectBoxes[i]; i++) {
			type = selectBox.data("type");
			if (type === "month") {
				month_selectBox = selectBox;
			} else if (type === "year") {
				year_selectBox = selectBox;
			}
			selectBoxes.push(selectBox[0]);
		}
		$(selectBoxes)
			.on("change", function() {
				var $this = $(this),
					type = $this.data("type");
				if ((type === "month") ||
				    (type === "year")) {
					that.getSelectBox("day")
						.updateDays(getNumberOfDaysIn(
							month_selectBox.val(),
							year_selectBox.val()
						));
				}
				// Update element value
				that.updateElementValue();
			});
	};

	// --------------------------------------------------------------------
	// Public methods/properties
	// --------------------------------------------------------------------

	// TODO: handle date of different formats
	SelectBoxedDate.prototype.parseDate = function(value) {
		var chunks = value.split("-");
		if (chunks.length !== 3) {
			return null;
		}
		return new Date(chunks[2], (chunks[0] - 1), chunks[1]);
	};

	SelectBoxedDate.prototype.getDateObject = function(date) {
		var dateObject = new Date();

		var incDec_regExp = /([+-])([0-9]+)(y)/;
		if (incDec_regExp.test(date)) {
			var matches = incDec_regExp.exec(date);
			dateObject.setFullYear(dateObject.getFullYear() + (matches[1] + 1) * matches[2]);
		} else {
			throw "At this moment another formats are not available!";
		}

		return dateObject;
	};

	SelectBoxedDate.prototype.getSelectBox = function(type) {
		for (var i = 0, selectBox; selectBox = this.selectBoxes[i]; i++) {
			if (selectBox.data("type") === type) {
				return selectBox;
			}
		}
		throw "No such selectBox type: " + type;
	};

	SelectBoxedDate.prototype.updateElementValue = function() {
		for (var value = "", i = 0, char;
			char = this.options.format[i];
			i++) {
			switch (char) {
				case "m":
					value += withLeadingZeros(this.getSelectBox("month").val());
					break;
				case "d":
					value += withLeadingZeros(this.getSelectBox("day").val());
					break;
				case "Y":
					value += withLeadingZeros(this.getSelectBox("year").val());
					break;
				default:
					value += char;
					break;
			}
		}
		this.$element
			.val(value);
	};

	// --------------------------------------------------------------------
	// Private static methods/properties
	// --------------------------------------------------------------------

	function isLeapYear(year) {
		return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
	}

	function getNumberOfDaysIn(month, year) {
		var numberOfDays;
		if (parseInt(month) === 2) {
			numberOfDays = (isLeapYear(year)
				? 29
				: 28);
		} else if (",4,6,9,11,".indexOf("," + month + ",") !== -1) {
			numberOfDays = 30;
		} else if (",1,3,5,7,8,10,12,".indexOf("," + month + ",") !== -1) {
			numberOfDays = 31;
		} else {
			throw "Invalid month number";
		}
		return numberOfDays;
	}

	function withLeadingZeros(int_number, segments) {
		int_number = parseInt(int_number);
		if (isNaN(int_number)) {
			int_number = 0;
		}
		if (typeof segments === "undefined") {
			segments = 2;
		}
		var zerosNumber = (segments - int_number.toString().length + 1);
		if (zerosNumber > 0) {
			return (new Array(zerosNumber).join("0") + int_number);
		} else {
			return int_number;
		}
	}

	function createSelectBox(label, type, dateRangeFrom, dateRangeTo, selectedValue, onSelectBoxOptionsChanged) {
		var originalType = type;
		type = fitToDateObjectType(type);

		var selectBox = $('<select/>'),
			getTypeValue = ("get" + firstLetterUpperCase(type)),
			from = dateRangeFrom[getTypeValue](),
			to = dateRangeTo[getTypeValue](),
			i, n;

		// Append placeholder-option.
		getOption(0, label, true, true)
			.appendTo(selectBox);

		if (type === "fullYear") { // Make the list upside down.
			for (i = to; i >= from; i--) {
				getOption(i, i, (i === selectedValue))
					.appendTo(selectBox);
			}
		} else {
			for (i = from; i <= to; i++) {
				n = ((type === "month") ? (i + 1) : i); // Since in the Date object month starts from 0.
				getOption(n, withLeadingZeros(n), (i === selectedValue))
					.appendTo(selectBox);
			}
		}

		// Set additional properties and methods
		selectBox.data("type", originalType);
		if (type === "date") {
			selectBox.updateDays = function(numberOfDays) {
				var that = this,
					needReset = (this.val() > numberOfDays),
					optionsChanged = false;
				this.children("option").each(function(index) {
					var $this = $(this);
					if ((this.value <= numberOfDays)) {
						if ($this.is(":disabled") &&
						    (this.value != 0)) {
							$this.attr("disabled", false);
							$this.show();
							optionsChanged = true;
						}
						if (needReset) {
							$this.attr("selected", true);
							that.selectedIndex = index;
							that.trigger("change");
							needReset = false;
						}
					} else if (!$this.is(":disabled")) {
						$this.attr("disabled", true);
						$this.hide();
						optionsChanged = true;
					}
				});
				if (optionsChanged &&
				    (typeof onSelectBoxOptionsChanged === "function")) {
					onSelectBoxOptionsChanged(this);
				}
			};
		}

		return selectBox;
	}

	function getOption(value, title, selected, disabled) {
		var option = '<option value="' + value + '"';
		if (selected) {
			option += ' selected="selected"'
		}
		if (disabled) {
			option += ' disabled="disabled"'
		}
		option += '>' + title + '</option>';
		return $(option);
	}

	function firstLetterUpperCase(string) {
		return (string.slice(0, 1).toUpperCase() + string.slice(1));
	}

	function fitToDateObjectType(type) {
		if (type === "day") {
			type = "date";
		} else if (type === "year") {
			type = "fullYear";
		}
		return type;
	}

	// --------------------------------------------------------------------
	// Bootstrap
	// --------------------------------------------------------------------

	SelectBoxedDate.DEFAULTS = {
		rangeFrom: "-200y",
		rangeTo: "-12y",
		rangeRound: true,
		labelDay: "Day",
		labelMonth: "Month",
		labelYear: "Year",
		format: "m-d-Y",
		mapping: "day|month|year",
		onSelectBoxesCreated: function() {/* Apply some styling or anything else. */},
		onSelectBoxOptionsChanged: function(selectBox) {}
	};

	$.fn.selectBoxedDate = function(option) {
		return this.each(function() {
			var $this = $(this),
				data = $this.data(pluginDataKey),
				options = $.extend({}, SelectBoxedDate.DEFAULTS, $this.data(), (typeof option === "object") && option);
			if (!data) $this.data(pluginDataKey, (data = new SelectBoxedDate(this, options)));
			if (typeof option == "string") data[option].call($this);
		});
	};
	$(window).on("load", function() {
		$(itemsSelector).each(function() {
			var $this = $(this);
			$this.selectBoxedDate($this.data());
		});
	});
})(window.jQuery, ".select-boxed-date", "sbd");
