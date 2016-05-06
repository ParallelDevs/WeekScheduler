(function ($) {
  'use strict';

  var WeekScheduler = function (el, options) {
    this.$el = $(el);
    this.options = $.extend({}, WeekScheduler.DEFAULTS, options);
    this.render();
    this.attachEvents();
    this.$selectingStart = null;
    this.firstDayWeek = null;
    this.lastDayWeek = null;
  }

  WeekScheduler.DEFAULTS = {
    days: [0, 1, 2, 3, 4, 5, 6],  // Sun - Sat
    blokedDays: [],
    startTime: '08:00',                // HH:mm format
    endTime: '20:00',                // HH:mm format
    interval: 30,                     // minutes
    stringDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    template: '<div class="day-schedule-selector">' +
    '<div class="week-selector"></div>' +
    '<table class="schedule-table">' +
    '<thead class="schedule-header"></thead>' +
    '<tbody class="schedule-rows"></tbody>' +
    '</table>' +
    '<div>'
  };

  //=================================================================================================================
  //                                            Render HTML
  //=================================================================================================================

  /**
   * Render the calendar UI
   * @public
   */
  WeekScheduler.prototype.render = function () {
    this.$el.html(this.options.template);
    this.setActualWeekDays()
    this.renderWeekSelector();
    this.renderHeader();
    this.renderRows();
  };

  /**
   * Render the week selector
   * @public
   */
  WeekScheduler.prototype.renderWeekSelector = function () {
    var firstday = this.firstDayWeek;
    var lastday = this.lastDayWeek;

    var html = '<div class="week-selector-text">' + firstday.getDate() + " " + firstday.getMonthName() + " - "
      + lastday.getDate() + " " + lastday.getMonthName() + '</div>';

    this.$el.find('.week-selector').html('<div class="left-arrow arrow"> < </div> '
      + html + ' <div class="right-arrow arrow"> > </div>');
  };

  /**
   * Render the calendar header
   * @public
   */
  WeekScheduler.prototype.renderHeader = function () {
    var stringDays = this.options.stringDays,
      days = this.options.days,
      html = '';

    $.each(days, function (i, _) {
      html += '<th>' + (stringDays[i] || '') + '</th>';
    });
    this.$el.find('.schedule-header').html('<tr><th></th>' + html + '</tr>');
  };

  /**
   * Render the calendar rows, including the time slots and labels
   * @public
   */
  WeekScheduler.prototype.renderRows = function () {
    var start = this.options.startTime,
      end = this.options.endTime,
      interval = this.options.interval,
      blokedDays = this.options.blokedDays,
      days = this.options.days,
      $el = this.$el.find('.schedule-rows'),
      firstDayWeek = this.firstDayWeek;

    $.each(generateDates(start, end, interval), function (i, d) {
      var daysInARow = $.map(new Array(days.length), function (_, i) {

        var hour = hhmm(d);
        hour = hour.split(":");
        var dateAux = new Date(firstDayWeek.getTime() + i * 24 * 60 * 60 * 1000);
        var date = new Date(dateAux.getFullYear(), dateAux.getMonth(), dateAux.getDate(), hour[0], hour[1], 0, 0);
        var blocked = jQuery.inArray(i, blokedDays) == -1 ? false : true;

        return '<td class="time-slot" data-blocked="' + blocked + '" data-timestamp="' + date.getTime() + '"></td>'
      }).join();

      $el.append('<tr><td class="time-label">' + hmmAmPm(d) + '</td>' + daysInARow + '</tr>');
    });
  };

  //=================================================================================================================
  //                                            Functions
  //=================================================================================================================


  /**
   * Is the day schedule selector in selecting mode?
   * @public
   */
  WeekScheduler.prototype.setActualWeekDays = function () {
    var curr = new Date; // get current date
    var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
    this.firstDayWeek = new Date(curr.setDate(first));
    this.lastDayWeek = new Date(this.firstDayWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  /**
   * Is the day schedule selector in selecting mode?
   * @public
   */
  WeekScheduler.prototype.updateActualWeekDays = function (firstDay, lastDay) {
    this.firstDayWeek = firstDay;
    this.lastDayWeek = lastDay;
  }

  /**
   * Is the day schedule selector in selecting mode?
   * @public
   */
  WeekScheduler.prototype.isSelecting = function () {
    return !!this.$selectingStart;
  }

  /**
   * Remove selected attribute to time slot
   * @public
   */
  WeekScheduler.prototype.deselect = function ($slot) {
    $slot.removeAttr('data-selected');
  }

  function isSlotSelected($slot) {
    return $slot.is('[data-selected]');
  }

  /**
   * Update the timestamp in all timeslot
   * @public
   */
  WeekScheduler.prototype.updateTimeslot = function (arrow) {
    this.$el.find(".time-slot").each(function (index) {

      var timestamp = parseInt($(this).data("timestamp"));

      if (arrow === "left") {
        timestamp -= 7 * 24 * 60 * 60 * 1000
      } else {
        timestamp += 7 * 24 * 60 * 60 * 1000
      }

      $(this).data("timestamp", timestamp);
      $(this).removeAttr('data-selected');

    });
  }


  //=================================================================================================================
  //                                            Manage Events
  //=================================================================================================================

  WeekScheduler.prototype.attachEvents = function () {
    var plugin = this,
      options = this.options,
      firstDayWeek = this.firstDayWeek,
      $slots;

    //  Click on time slot
    //=================================
    this.$el.on('click', '.time-slot', function () {
      if (!$(this).data('blocked')) {
        if (!plugin.isSelecting()) {  // if we are not in selecting mode
          if (isSlotSelected($(this))) {
            plugin.deselect($(this));
            plugin.$el.trigger('select.timeslot.weekScheduler', $(this).data("timestamp"));
          }
          else {  // then start selecting
            plugin.$selectingStart = $(this);
            $(this).attr('data-selected', 'selected');
            plugin.$el.trigger('select.timeslot.weekScheduler', $(this).data("timestamp"));
            plugin.$selectingStart = null;
          }
        }
      }
    });

    //  Click left arrow
    //=================================
    this.$el.on('click', '.left-arrow', function () {
      plugin.firstDayWeek = new Date(firstDayWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      var lastDayWeek = new Date(plugin.firstDayWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

      plugin.$el.find('.week-selector-text').html(plugin.firstDayWeek.getDate()
        + " " + plugin.firstDayWeek.getMonthName() + " - " + lastDayWeek.getDate()
        + " " + lastDayWeek.getMonthName());

      plugin.updateActualWeekDays(plugin.firstDayWeek, lastDayWeek);
      firstDayWeek = plugin.firstDayWeek;
      plugin.updateTimeslot("left");
    });

    //  Click right arrow
    //=================================
    this.$el.on('click', '.right-arrow', function () {

      plugin.firstDayWeek = new Date(firstDayWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      var lastDayWeek = new Date(plugin.firstDayWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

      plugin.$el.find('.week-selector-text').html(plugin.firstDayWeek.getDate()
        + " " + plugin.firstDayWeek.getMonthName() + " - " + lastDayWeek.getDate()
        + " " + lastDayWeek.getMonthName());

      plugin.updateActualWeekDays(plugin.firstDayWeek, lastDayWeek);
      firstDayWeek = plugin.firstDayWeek;
      plugin.updateTimeslot("right");
    });


  };

  //=================================================================================================================
  //                                         WeekScheduler Plugin Definition
  //=================================================================================================================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this),
        data = $this.data('artsy.dayScheduleSelector'),
        options = typeof option == 'object' && option;

      if (!data) {
        $this.data('artsy.dayScheduleSelector', (data = new WeekScheduler(this, options)));
      }
    })
  }

  $.fn.weekScheduler = Plugin;

  //=================================================================================================================
  //                                         Help functions
  //=================================================================================================================

  /**
   * Generate Date objects for each time slot in a day
   * @private
   * @param {String} start Start time in HH:mm format, e.g. "08:00"
   * @param {String} end End time in HH:mm format, e.g. "21:00"
   * @param {Number} interval Interval of each time slot in minutes, e.g. 30 (minutes)
   * @returns {Array} An array of Date objects representing the start time of the time slots
   */
  function generateDates(start, end, interval) {
    var numOfRows = Math.ceil(timeDiff(start, end) / interval);
    return $.map(new Array(numOfRows), function (_, i) {
      // need a dummy date to utilize the Date object
      return new Date(new Date(2000, 0, 1, start.split(':')[0], start.split(':')[1]).getTime() + i * interval * 60000);
    });
  }

  /**
   * Return time difference in minutes
   * @private
   */
  function timeDiff(start, end) {   // time in HH:mm format
    // need a dummy date to utilize the Date object
    return (new Date(2000, 0, 1, end.split(':')[0], end.split(':')[1]).getTime() -
      new Date(2000, 0, 1, start.split(':')[0], start.split(':')[1]).getTime()) / 60000;
  }

  /**
   * Convert a Date object to time in H:mm format with am/pm
   * @private
   * @returns {String} Time in H:mm format with am/pm, e.g. '9:30am'
   */
  function hmmAmPm(date) {
    var hours = date.getHours(),
      minutes = date.getMinutes(),
      ampm = hours >= 12 ? 'pm' : 'am';
    return hours + ':' + ('0' + minutes).slice(-2) + ampm;
  }

  /**
   * Convert a Date object to time in HH:mm format
   * @private
   * @returns {String} Time in HH:mm format, e.g. '09:30'
   */
  function hhmm(date) {
    var hours = date.getHours(),
      minutes = date.getMinutes();
    return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2);
  }

  function hhmmToSecondsSinceMidnight(hhmm) {
    var h = hhmm.split(':')[0],
      m = hhmm.split(':')[1];
    return parseInt(h, 10) * 60 * 60 + parseInt(m, 10) * 60;
  }

  /**
   * Convert seconds since midnight to HH:mm string, and simply
   * ignore the seconds.
   */
  function secondsSinceMidnightToHhmm(seconds) {
    var minutes = Math.floor(seconds / 60);
    return ('0' + Math.floor(minutes / 60)).slice(-2) + ':' +
      ('0' + (minutes % 60)).slice(-2);
  }

  /**
   * List of months name
   */
  Date.prototype.monthNames = [
    "January", "February", "March",
    "April", "May", "June",
    "July", "August", "September",
    "October", "November", "December"
  ];

  /**
   * Get full name of the month
   */
  Date.prototype.getMonthName = function () {
    return this.monthNames[this.getMonth()];
  };

  /**
   * Get short name of the month
   */
  Date.prototype.getShortMonthName = function () {
    return this.getMonthName().substr(0, 3);
  };

})(jQuery);
