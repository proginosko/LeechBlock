/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file contains the code for the Lockdown dialog.
 */

// Handles lockdown dialog initialization
//
LeechBlock.lockdownInit = function () {
	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	// Check whether a lockdown is currently active
	let endTime = 0;
	for (let set = 1; set <= 6; set++) {
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		if (timedata.length == 5) {
			endTime = Math.max(endTime, timedata[4]);
		}
	}
	if (endTime > now) {
		// Show alert dialog with end time
		LeechBlock.alertLockdown(new Date(endTime * 1000).toLocaleString());
		// Close lockdown dialog
		window.close();
	}

	// Get preferences
	let duration = LeechBlock.getIntPref("lockdownDuration");
	let sets = LeechBlock.getIntPref("lockdownSets");

	// Set component values
	let hours = Math.floor(duration / 3600);
	let mins = Math.floor(duration / 60) % 60;
	document.getElementById("lb-lockdown-hours").value = hours;
	document.getElementById("lb-lockdown-mins").value = mins;
	for (let set = 1; set <= 6; set++) {
		let lockdown = (sets & (1 << (set - 1))) != 0;
		document.getElementById("lb-lockdown-set" + set).checked = lockdown;
		document.getElementById("lb-lockdown-set" + set).label += " "
				+ LeechBlock.getLockdownBlockSetLabel(set);
	}
}

// Handles lockdown dialog OK button
//
LeechBlock.lockdownOK = function () {
	// Get component values
	let hours = document.getElementById("lb-lockdown-hours").value;
	let mins = document.getElementById("lb-lockdown-mins").value;
	let duration = hours * 3600 + mins * 60;
	let sets = 0;
	for (let set = 1; set <= 6; set++) {
		let lockdown = document.getElementById("lb-lockdown-set" + set).checked;
		if (lockdown) sets |= (1 << (set - 1));
	}

	// Set preferences
	LeechBlock.setIntPref("lockdownDuration", duration);
	LeechBlock.setIntPref("lockdownSets", sets);

	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	// Update time data for selected block sets
	let endTime = now + duration;
	for (let set = 1; set <= 6; set++) {
		let lockdown = document.getElementById("lb-lockdown-set" + set).checked;

		// Update time data for this set
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		if (timedata.length == 5) {
			timedata[4] = lockdown ? endTime : 0;
		} else {
			timedata = [now, 0, 0, 0, lockdown ? endTime : 0];
		}
		LeechBlock.setCharPref("timedata" + set, timedata.join(","));
	}

	// Clear preference for allowed origin/page
	LeechBlock.clearUserPref("ao");
	LeechBlock.clearUserPref("ap");

	return true;
}

// Handles lockdown dialog Cancel button
//
LeechBlock.lockdownCancel = function () {
	return true;
}
