/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file contains the code for the Statistics dialog.
 */

// Refreshes values in statistics dialog
//
LeechBlock.statsRefresh = function () {
	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	for (let set = 1; set <= 6; set++) {
		// Get preferences for this set
		let setName = LeechBlock.getUniCharPref("setName" + set);
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		let limitMins = LeechBlock.getCharPref("limitMins" + set);
		let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
		let periodStart = LeechBlock.getTimePeriodStart(now, limitPeriod);

		// Update block set name
		if (setName == "") {
			setName = LeechBlock.getDefaultSetName(set);
		}
		document.getElementById("lb-set-name" + set).value = setName;

		// Update time values
		if (timedata.length == 5) {
			let fs = LeechBlock.getFormattedStats(timedata);
			document.getElementById("lb-start-time" + set).value = fs.startTime;
			document.getElementById("lb-total-time" + set).value = fs.totalTime;
			document.getElementById("lb-per-day-time" + set).value = fs.perDayTime;

			if (limitMins != "" && limitPeriod != "") {
				// Calculate total seconds left in this time period
				let secsLeft = timedata[2] == periodStart
						? Math.max(0, (limitMins * 60) - timedata[3])
						: (limitMins * 60);
				let timeLeft = LeechBlock.formatTime(secsLeft);
				document.getElementById("lb-time-left" + set).value = timeLeft;
			}
		}
	}
}

// Restarts data gathering for block set
//
LeechBlock.statsRestart = function (set) {
	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	// Update time data for this set
	let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
	if (timedata.length == 5) {
		timedata[0] = now;
		timedata[1] = 0;
	} else {
		timedata = [now, 0, 0, 0, 0];
	}
	LeechBlock.setCharPref("timedata" + set, timedata.join(","));

	// Update display for this set
	let fs = LeechBlock.getFormattedStats(timedata);
	document.getElementById("lb-start-time" + set).value = fs.startTime;
	document.getElementById("lb-total-time" + set).value = fs.totalTime;
	document.getElementById("lb-per-day-time" + set).value = fs.perDayTime;
}

// Restarts data gathering for all block sets
//
LeechBlock.statsRestartAll = function () {
	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	for (let set = 1; set <= 6; set++) {
		// Update time data for this set
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		if (timedata.length == 5) {
			timedata[0] = now;
			timedata[1] = 0;
		} else {
			timedata = [now, 0, 0, 0, 0];
		}
		LeechBlock.setCharPref("timedata" + set, timedata.join(","));

		// Update display for this set
		let fs = LeechBlock.getFormattedStats(timedata);
		document.getElementById("lb-start-time" + set).value = fs.startTime;
		document.getElementById("lb-total-time" + set).value = fs.totalTime;
		document.getElementById("lb-per-day-time" + set).value = fs.perDayTime;
	}
}

// Returns formatted times based on time data
//
LeechBlock.getFormattedStats = function (timedata) {
	let days = 1
			+ Math.floor(Date.now() / 86400000)
			- Math.floor(timedata[0] / 86400);
	return {
		startTime: new Date(timedata[0] * 1000).toLocaleString(),
		totalTime: LeechBlock.formatTime(timedata[1]),
		perDayTime: LeechBlock.formatTime(timedata[1] / days)
	};
}
