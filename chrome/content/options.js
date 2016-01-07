/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file contains the code for the Options dialog.
 */

// Handles options dialog initialization
//
LeechBlock.optionsInit = function () {
	// Get current time/date
	let timedate = new Date();

	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	// Get password
	let password = LeechBlock.retrievePassword();
	if (password == null) {
		// Close options dialog
		window.close();
		return;
	}
	document.getElementById("lb-options-password").value = password;

	// Get access preferences
	let oa = LeechBlock.getIntPref("oa");
	let hpp = LeechBlock.getBoolPref("hpp");
	document.getElementById("lb-options-access").value = oa;
	document.getElementById("lb-options-hpp").checked = hpp;
	LeechBlock.updatePasswordOptions();

	// Ask for password (if required)
	if (oa == 1 && password != "" && password != LeechBlock.requestPassword(hpp)) {
		// Close options dialog
		window.close();
		return;
	}

	// Ask for access code (if required)
	if (oa >= 2 && oa <= 4) {
		// Create random access code
		let code = LeechBlock.createAccessCode(8 << oa);
		// Get active window
		let awin = Cc["@mozilla.org/embedcomp/window-watcher;1"]
				.getService(Ci.nsIWindowWatcher).activeWindow;
		// Open dialog for user to enter code (centred on active window)
		let usercode = { value: null };
		awin.openDialog("chrome://leechblock/content/accesscode.xul",
				"lb-accesscode", "chrome,centerscreen,dialog,modal",
				code, usercode);
		if (code != usercode.value) {
			// Close options dialog
			window.close();
			return;
		}
	}

	// Check whether a lockdown is currently active
	for (let set = 1; set <= 6; set++) {
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		let lockdown = (timedata.length == 5 && timedata[4] > now);
		if (lockdown) {
			// Enable 'Cancel Lockdown' button
			document.getElementById("lb-cancel-lockdown" + set).disabled = false;
			break;
		}
	}

	// Check whether access to options should be prevented
	for (let set = 1; set <= 6; set++) {
		if (LeechBlock.getBitPref("prevOpts", set)) {
			// Get preferences
			let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
			let times = LeechBlock.getCharPref("times" + set);
			let minPeriods = LeechBlock.getMinPeriods(times);
			let limitMins = LeechBlock.getCharPref("limitMins" + set);
			let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
			let periodStart = LeechBlock.getTimePeriodStart(now, limitPeriod);
			let conjMode = LeechBlock.getBitPref("conjMode", set);
			let daySel = LeechBlock.decodeDays(LeechBlock.getIntPref("days" + set));

			// Check day
			let onSelectedDay = daySel[timedate.getDay()];

			// Check time periods
			let withinTimePeriods = false;
			if (onSelectedDay && times != "") {
				// Get number of minutes elapsed since midnight
				let mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (let i in minPeriods) {
					if (mins >= minPeriods[i].start
							&& mins < minPeriods[i].end) {
						withinTimePeriods = true;
					}
				}
			}

			// Check time limit
			let afterTimeLimit = false;
			if (onSelectedDay && limitMins != "" && limitPeriod != "") {
				// Check time data validity, time period, and time limit
				if (timedata.length == 5
						&& timedata[2] == periodStart
						&& timedata[3] >= (limitMins * 60)) {
					afterTimeLimit = true;
				}
			}

			// Check lockdown condition
			let lockdown = (timedata.length == 5 && timedata[4] > now);

			// Disable options if specified block conditions are fulfilled
			if (lockdown
					|| (!conjMode && (withinTimePeriods || afterTimeLimit))
					|| (conjMode && (withinTimePeriods && afterTimeLimit))) {
				// Disable options for this set
				LeechBlock.disableSetOptions(set);
			}
		}
	}

	for (let set = 1; set <= 6; set++) {
		// Get preferences
		let setName = LeechBlock.getUniCharPref("setName" + set);
		let sites = LeechBlock.getUniCharPref("sites" + set);
		sites = sites.replace(/\s+/g, "\n");
		let sitesURL = LeechBlock.getUniCharPref("sitesURL" + set);
		let activeBlock = LeechBlock.getBitPref("activeBlock", set);
		let prevOpts = LeechBlock.getBitPref("prevOpts", set);
		let prevAddons = LeechBlock.getBitPref("prevAddons", set);
		let prevConfig = LeechBlock.getBitPref("prevConfig", set);
		let countFocus = LeechBlock.getBitPref("countFocus", set);
		let delaySecs = LeechBlock.getCharPref("delaySecs" + set);
		let times = LeechBlock.getCharPref("times" + set);
		let limitMins = LeechBlock.getCharPref("limitMins" + set);
		let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
		let conjMode = LeechBlock.getBitPref("conjMode", set);
		let daySel = LeechBlock.decodeDays(LeechBlock.getIntPref("days" + set));
		let blockURL = LeechBlock.getUniCharPref("blockURL" + set);

		// Set component values
		document.getElementById("lb-set-name" + set).value = setName;
		document.getElementById("lb-sites" + set).value = sites;
		document.getElementById("lb-sites-URL" + set).value = sitesURL;
		document.getElementById("lb-active-block" + set).checked = activeBlock;
		document.getElementById("lb-prev-opts" + set).checked = prevOpts;
		document.getElementById("lb-prev-addons" + set).checked = prevAddons;
		document.getElementById("lb-prev-config" + set).checked = prevConfig;
		document.getElementById("lb-count-focus" + set).checked = countFocus;
		document.getElementById("lb-delay-secs" + set).value = delaySecs;
		document.getElementById("lb-times" + set).value = times;
		document.getElementById("lb-limit-mins" + set).value = limitMins;
		document.getElementById("lb-limit-period" + set).value = limitPeriod;
		document.getElementById("lb-mode" + set).selectedIndex = conjMode ? 1 : 0;
		for (let i = 0; i < 7; i++) {
			document.getElementById("lb-day" + i + set).checked = daySel[i];
		}
		document.getElementById("lb-block-page" + set).value = blockURL;

		if (setName != "") {
			// Set custom label
			document.getElementById("lb-tab-set" + set).label = setName;
		}
	}

	// Get other preferences
	let ham = LeechBlock.getBoolPref("ham");
	let hsm = LeechBlock.getBoolPref("hsm");
	let warnSecs = LeechBlock.getCharPref("warnSecs");
	let bep = LeechBlock.getBoolPref("bep");
	let kpb = LeechBlock.getBoolPref("kpb");
	let hcm = LeechBlock.getBoolPref("hcm");
	let htl = LeechBlock.getBoolPref("htl");
	document.getElementById("lb-options-ham").checked = ham;
	document.getElementById("lb-options-hsm").checked = hsm;
	document.getElementById("lb-options-warn-secs").value = warnSecs;
	document.getElementById("lb-options-bep").checked = bep;
	document.getElementById("lb-options-kpb").checked = kpb;
	document.getElementById("lb-options-hcm").checked = hcm;
	document.getElementById("lb-options-htl").checked = htl;
}

// Handles options dialog OK button
//
LeechBlock.optionsOK = function () {
	// Check format for time periods and time limits
	for (let set = 1; set <= 6; set++) {
		// Get component values
		let times = document.getElementById("lb-times" + set).value;
		let limitMins = document.getElementById("lb-limit-mins" + set).value;
		let delaySecs = document.getElementById("lb-delay-secs" + set).value;

		// Check values
		if (!LeechBlock.checkTimesFormat(times)) {
			LeechBlock.setOuterTab(set - 1);
			LeechBlock.setInnerTab(set, 1);
			LeechBlock.alertBadTimes();
			document.getElementById("lb-times" + set).focus();
			return false;
		}
		if (!LeechBlock.checkPosIntFormat(limitMins)) {
			LeechBlock.setOuterTab(set - 1);
			LeechBlock.setInnerTab(set, 1);
			LeechBlock.alertBadTimeLimit();
			document.getElementById("lb-limit-mins" + set).focus();
			return false;
		}
		if (!LeechBlock.checkPosIntFormat(delaySecs) || delaySecs == "") {
			LeechBlock.setOuterTab(set - 1);
			LeechBlock.setInnerTab(set, 2);
			LeechBlock.alertBadSeconds();
			document.getElementById("lb-delay-secs" + set).focus();
			return false;
		}
	}

	// Check format for seconds before warning message
	let warnSecs = document.getElementById("lb-options-warn-secs").value;
	if (!LeechBlock.checkPosIntFormat(warnSecs)) {
		LeechBlock.setOuterTab(7);
		LeechBlock.alertBadSeconds();
		document.getElementById("lb-options-warn-secs").focus();
		return false;
	}

	// Confirm settings where access to options is prevented all day
	for (let set = 1; set <= 6; set++) {
		// Get component values
		let prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		let times = document.getElementById("lb-times" + set).value;

		if (!document.getElementById("lb-prev-opts" + set).disabled
				&& prevOpts && times == LeechBlock.ALL_DAY_TIMES) {
			LeechBlock.setOuterTab(set - 1);
			LeechBlock.setInnerTab(set, 1);
			if (!LeechBlock.confirmPrevOptsAllDay()) {
				document.getElementById("lb-times" + set).focus();
				return false;
			}
		}
	}

	for (let set = 1; set <= 6; set++) {
		// Get component values
		let setName = document.getElementById("lb-set-name" + set).value;
		let sites = document.getElementById("lb-sites" + set).value;
		sites = sites.replace(/\s+/g, " ").replace(/(^ +)|( +$)|(\w+:\/+)/g, "");
		sites = sites.split(" ").sort().join(" "); // sort alphabetically
		let sitesURL = document.getElementById("lb-sites-URL" + set).value;
		let activeBlock = document.getElementById("lb-active-block" + set).checked;
		let prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		let prevAddons = document.getElementById("lb-prev-addons" + set).checked;
		let prevConfig = document.getElementById("lb-prev-config" + set).checked;
		let countFocus = document.getElementById("lb-count-focus" + set).checked;
		let delaySecs = document.getElementById("lb-delay-secs" + set).value;
		let times = document.getElementById("lb-times" + set).value;
		let limitMins = document.getElementById("lb-limit-mins" + set).value;
		let limitPeriod = document.getElementById("lb-limit-period" + set).value;
		let conjMode = document.getElementById("lb-mode" + set).selectedIndex == 1;
		let daySel = new Array(7);
		for (let i = 0; i < 7; i++) {
			daySel[i] = document.getElementById("lb-day" + i + set).checked;
		}
		let blockURL = document.getElementById("lb-block-page" + set).value;

		// Get regular expressions to match sites
		let regexps = LeechBlock.getRegExpSites(sites);

		// Reset time data if time limit period has been changed
		if (limitPeriod != LeechBlock.getCharPref("limitPeriod" + set)) {
			let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
			if (timedata.length == 5) {
				timedata[2] = 0;
				timedata[3] = 0;
				LeechBlock.setCharPref("timedata" + set, timedata.join(","));
			}
		}

		// Set preferences
		LeechBlock.setUniCharPref("setName" + set, setName);
		LeechBlock.setUniCharPref("sites" + set, sites);
		LeechBlock.setUniCharPref("sitesURL" + set, sitesURL);
		LeechBlock.setBitPref("activeBlock", set, activeBlock);
		LeechBlock.setBitPref("prevOpts", set, prevOpts);
		LeechBlock.setBitPref("prevAddons", set, prevAddons);
		LeechBlock.setBitPref("prevConfig", set, prevConfig);
		LeechBlock.setBitPref("countFocus", set, countFocus);
		LeechBlock.setCharPref("delaySecs" + set, delaySecs);
		LeechBlock.setUniCharPref("blockRE" + set, regexps.block);
		LeechBlock.setUniCharPref("allowRE" + set, regexps.allow);
		LeechBlock.setUniCharPref("keywordRE" + set, regexps.keyword);
		LeechBlock.setCharPref("times" + set, times);
		LeechBlock.setCharPref("limitMins" + set, limitMins);
		LeechBlock.setCharPref("limitPeriod" + set, limitPeriod);
		LeechBlock.setBitPref("conjMode", set, conjMode);
		LeechBlock.setIntPref("days" + set, LeechBlock.encodeDays(daySel));
		LeechBlock.setUniCharPref("blockURL" + set, blockURL);
	}

	// Set other preferences
	let oa = document.getElementById("lb-options-access").value;
	let hpp = document.getElementById("lb-options-hpp").checked;
	let ham = document.getElementById("lb-options-ham").checked;
	let hsm = document.getElementById("lb-options-hsm").checked;
	let bep = document.getElementById("lb-options-bep").checked;
	let kpb = document.getElementById("lb-options-kpb").checked;
	let hcm = document.getElementById("lb-options-hcm").checked;
	let htl = document.getElementById("lb-options-htl").checked;
	LeechBlock.setIntPref("oa", oa);
	LeechBlock.setBoolPref("hpp", hpp);
	LeechBlock.setBoolPref("ham", ham);
	LeechBlock.setBoolPref("hsm", hsm);
	LeechBlock.setCharPref("warnSecs", warnSecs);
	LeechBlock.setBoolPref("bep", bep);
	LeechBlock.setBoolPref("kpb", kpb);
	LeechBlock.setBoolPref("hcm", hcm);
	LeechBlock.setBoolPref("htl", htl);

	// Set password
	let password = document.getElementById("lb-options-password").value;
	LeechBlock.storePassword(password);

	// Save all preferences to file (in case browser not properly closed later on)
	LeechBlock.savePreferences();

	return true;
}

// Handles options dialog Cancel button
//
LeechBlock.optionsCancel = function () {
	return true;
}

// Disables options for block set
//
LeechBlock.disableSetOptions = function (set) {
	let items = [
		"sites", "sites-URL",
		"active-block", "count-focus", "delay-secs",
		"times", "all-day",
		"limit-mins", "limit-period", "mode",
		"day0", "day1", "day2", "day3", "day4", "day5", "day6", "every-day",
		"block-page", "default-page", "delaying-page", "blank-page", "home-page",
		"set-name", "clear-set-name",
		"prev-opts", "prev-addons", "prev-config", "cancel-lockdown",
	];
	for (let item of items) {
		document.getElementById("lb-" + item + set).disabled = true;
	}
}

// Updates options for password
//
LeechBlock.updatePasswordOptions = function () {
	let disabled = document.getElementById("lb-options-access").value != 1;
	document.getElementById("lb-options-password").disabled = disabled;
	document.getElementById("lb-clear-password").disabled = disabled;
	document.getElementById("lb-options-hpp").disabled = disabled;
}

// Sets outer tab for options
//
LeechBlock.setOuterTab = function (index) {
	document.getElementById("lb-options-tabbox").selectedIndex = index;
}

// Sets inner tab for block set
//
LeechBlock.setInnerTab = function (set, index) {
	document.getElementById("lb-tabbox-set" + set).selectedIndex = index;
}

// Sets time periods to all day
//
LeechBlock.setAllDay = function (set) {
	document.getElementById("lb-times" + set).value = LeechBlock.ALL_DAY_TIMES;
}

// Sets days to every day
//
LeechBlock.setEveryDay = function (set) {
	for (let i = 0; i < 7; i++) {
		document.getElementById(("lb-day" + i) + set).checked = true;
	}
}

// Sets URL to default page
//
LeechBlock.setDefaultPage = function (set) {
	document.getElementById("lb-block-page" + set).value = LeechBlock.DEFAULT_BLOCK_URL;
}

// Sets URL to delaying page
//
LeechBlock.setDelayingPage = function (set) {
	document.getElementById("lb-block-page" + set).value = LeechBlock.DELAYED_BLOCK_URL;
}

// Sets URL to blank page
//
LeechBlock.setBlankPage = function (set) {
	document.getElementById("lb-block-page" + set).value = "about:blank";
}

// Sets URL to home page
//
LeechBlock.setHomePage = function (set) {
	let prefs = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService)
			.getBranch("browser.startup.");
	// Get all home pages but use only the first
	let homepages = prefs.getCharPref("homepage").split("|");
	document.getElementById("lb-block-page" + set).value = homepages[0];
}

// Clears custom set name
//
LeechBlock.clearSetName = function (set) {
	document.getElementById("lb-set-name" + set).value = "";
}

// Clears password for access to options
//
LeechBlock.clearPassword = function () {
	document.getElementById("lb-options-password").value = "";
}

// Cancels the currently active lockdown
//
LeechBlock.cancelLockdown = function (set) {
	// Get confirmation from user
	if (!LeechBlock.confirmCancelLockdown()) {
		return;
	}

	// Reset lockdown component of time data
	let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
	if (timedata.length == 5) {
		timedata[4] = 0;
	}
	LeechBlock.setCharPref("timedata" + set, timedata.join(","));

	// Disable 'Cancel Lockdown' button
	document.getElementById("lb-cancel-lockdown" + set).disabled = true;
}

// Exports options to a text file
//
LeechBlock.exportOptions = function () {
	const nsIFilePicker = Ci.nsIFilePicker;

	// Get user to choose file
	let filePicker = Cc["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
	filePicker.init(window, "Export LeechBlock Options", nsIFilePicker.modeSave);
	filePicker.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
	filePicker.filterIndex = 1;
	let ret = filePicker.show();
	if (ret != nsIFilePicker.returnOK && ret != nsIFilePicker.returnReplace) {
		return;
	}

	let text = "";

	// Add option values for each set
	for (let set = 1; set <= 6; set++) {
		// Get component values
		let setName = document.getElementById("lb-set-name" + set).value;
		let sites = document.getElementById("lb-sites" + set).value;
		sites = sites.replace(/\s+/g, " ").replace(/(^ +)|( +$)|(\w+:\/+)/g, "");
		let sitesURL = document.getElementById("lb-sites-URL" + set).value;
		let activeBlock = document.getElementById("lb-active-block" + set).checked;
		let prevOpts = document.getElementById("lb-prev-opts" + set).checked;
		let prevAddons = document.getElementById("lb-prev-addons" + set).checked;
		let prevConfig = document.getElementById("lb-prev-config" + set).checked;
		let countFocus = document.getElementById("lb-count-focus" + set).checked;
		let delaySecs = document.getElementById("lb-delay-secs" + set).value;
		let times = document.getElementById("lb-times" + set).value;
		let limitMins = document.getElementById("lb-limit-mins" + set).value;
		let limitPeriod = document.getElementById("lb-limit-period" + set).value;
		let conjMode = document.getElementById("lb-mode" + set).selectedIndex == 1;
		let daySel = new Array(7);
		for (let i = 0; i < 7; i++) {
			daySel[i] = document.getElementById("lb-day" + i + set).checked;
		}
		let blockURL = document.getElementById("lb-block-page" + set).value;

		// Add values to text
		text += "setName" + set + "=" + setName + "\n";
		text += "sites" + set + "=" + sites + "\n";
		text += "sitesURL" + set + "=" + sitesURL + "\n";
		text += "activeBlock" + set + "=" + activeBlock + "\n";
		text += "prevOpts" + set + "=" + prevOpts + "\n";
		text += "prevAddons" + set + "=" + prevAddons+ "\n";
		text += "prevConfig" + set + "=" + prevConfig + "\n";
		text += "countFocus" + set + "=" + countFocus + "\n";
		text += "delaySecs" + set + "=" + delaySecs + "\n";
		text += "times" + set + "=" + times + "\n";
		text += "limitMins" + set + "=" + limitMins + "\n";
		text += "limitPeriod" + set + "=" + limitPeriod + "\n";
		text += "conjMode" + set + "=" + conjMode + "\n";
		text += "days" + set + "=" + LeechBlock.encodeDays(daySel) + "\n";
		text += "blockURL" + set + "=" + blockURL + "\n";
	}

	// Add other option values
	let oa = document.getElementById("lb-options-access").value;
	let password = document.getElementById("lb-options-password").value;
	let hpp = document.getElementById("lb-options-hpp").checked;
	let ham = document.getElementById("lb-options-ham").checked;
	let hsm = document.getElementById("lb-options-hsm").checked;
	let warnSecs = document.getElementById("lb-options-warn-secs").value;
	let bep = document.getElementById("lb-options-bep").checked;
	let kpb = document.getElementById("lb-options-kpb").checked;
	let hcm = document.getElementById("lb-options-hcm").checked;
	let htl = document.getElementById("lb-options-htl").checked;
	text += "oa=" + oa + "\n";
	text += "password=" + password + "\n";
	text += "hpp=" + hpp + "\n";
	text += "ham=" + ham + "\n";
	text += "hsm=" + hsm + "\n";
	text += "warnSecs=" + warnSecs + "\n";
	text += "bep=" + bep + "\n";
	text += "kpb=" + kpb + "\n";
	text += "hcm=" + hcm + "\n";
	text += "htl=" + htl + "\n";

	// Write text to file
	try {
		LeechBlock.writeTextFile(filePicker.file, text);
	} catch (e) {
		console.warn("[LB] Cannot export options to file."
				+ " [" + filePicker.file.path + "]");
		return;
	}
}

// Imports options from a text file
//
LeechBlock.importOptions = function () {
	const nsIFilePicker = Ci.nsIFilePicker;
	const replaceChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;

	let isTrue = function (str) { return /^true$/i.test(str); }

	// Get user to choose file
	let filePicker = Cc["@mozilla.org/filepicker;1"]
			.createInstance(nsIFilePicker);
	filePicker.init(window, "Import LeechBlock Options", nsIFilePicker.modeOpen);
	filePicker.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
	filePicker.filterIndex = 1;
	let ret = filePicker.show();
	if (ret != nsIFilePicker.returnOK) {
		return;
	}

	let text = "";

	// Read text from file
	try {
		text = LeechBlock.readTextFile(filePicker.file);
	} catch (e) {
		console.warn("[LB] Cannot import options from file."
				+ " [" + filePicker.file.path + "]");
	}

	// Get options from text
	let regexp = /^(\w+)=(.*)$/;
	let lines = text.split(/\n/);
	let opts = {};
	for (let i in lines) {
		let results = regexp.exec(lines[i]);
		if (results != null) {
			opts[results[1]] = results[2];
		}
	}

	// Process option values for each set
	for (let set = 1; set <= 6; set++) {
		// Get values from options
		let setName = opts["setName" + set];
		let sites = opts["sites" + set];
		let sitesURL = opts["sitesURL" + set];
		let activeBlock = opts["activeBlock" + set];
		let prevOpts = opts["prevOpts" + set];
		let prevAddons = opts["prevAddons" + set];
		let prevConfig = opts["prevConfig" + set];
		let countFocus = opts["countFocus" + set];
		let delaySecs = opts["delaySecs" + set];
		let times = opts["times" + set];
		let limitMins = opts["limitMins" + set]
		let limitPeriod = opts["limitPeriod" + set]
		let conjMode = opts["conjMode" + set];
		let days = opts["days" + set];
		let blockURL = opts["blockURL" + set];

		// Set component values
		if (setName != undefined) {
			let element = document.getElementById("lb-set-name" + set);
			if (!element.disabled) {
				element.value = setName;
			}
		}
		if (sites != undefined) {
			sites = sites.replace(/\s+/g, "\n");
			let element = document.getElementById("lb-sites" + set);
			if (!element.disabled) {
				element.value = sites;
			}
		}
		if (sitesURL != undefined) {
			let element = document.getElementById("lb-sites-URL" + set);
			if (!element.disabled) {
				element.value = sitesURL;
			}
		}
		if (activeBlock != undefined) {
			let element = document.getElementById("lb-active-block" + set);
			if (!element.disabled) {
				element.checked = isTrue(activeBlock);
			}
		}
		if (prevOpts != undefined) {
			let element = document.getElementById("lb-prev-opts" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevOpts);
			}
		}
		if (prevAddons != undefined) {
			let element = document.getElementById("lb-prev-addons" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevAddons);
			}
		}
		if (prevConfig != undefined) {
			let element = document.getElementById("lb-prev-config" + set);
			if (!element.disabled) {
				element.checked = isTrue(prevConfig);
			}
		}
		if (countFocus != undefined) {
			let element = document.getElementById("lb-count-focus" + set);
			if (!element.disabled) {
				element.checked = isTrue(countFocus);
			}
		}
		if (delaySecs != undefined) {
			let element = document.getElementById("lb-delay-secs" + set);
			if (!element.disabled) {
				element.value = delaySecs;
			}
		}
		if (times != undefined) {
			let element = document.getElementById("lb-times" + set);
			if (!element.disabled) {
				element.value = times;
			}
		}
		if (limitMins != undefined) {
			let element = document.getElementById("lb-limit-mins" + set);
			if (!element.disabled) {
				element.value = limitMins;
			}
		}
		if (limitPeriod != undefined) {
			let element = document.getElementById("lb-limit-period" + set);
			if (!element.disabled) {
				element.value = limitPeriod;
			}
		}
		if (conjMode != undefined) {
			let element = document.getElementById("lb-mode" + set);
			if (!element.disabled) {
				element.selectedIndex = isTrue(conjMode) ? 1 : 0;
			}
		}
		if (days != undefined) {
			let daySel = LeechBlock.decodeDays(days);
			for (let i = 0; i < 7; i++) {
				let element = document.getElementById("lb-day" + i + set);
				if (!element.disabled) {
					element.checked = daySel[i];
				}
			}
		}
		if (blockURL != undefined) {
			let element = document.getElementById("lb-block-page" + set);
			if (!element.disabled) {
				element.value = blockURL;
			}
		}
	}

	// Process other option values
	let oa = opts["oa"];
	let password = opts["password"];
	let hpp = opts["hpp"];
	let ham = opts["ham"];
	let hsm = opts["hsm"];
	let warnSecs = opts["warnSecs"];
	let bep = opts["bep"];
	let kpb = opts["kpb"];
	let hcm = opts["hcm"];
	let htl = opts["htl"];
	if (oa != undefined) {
		document.getElementById("lb-options-access").value = oa;
	}
	if (password != undefined) {
		document.getElementById("lb-options-password").value = password;
	}
	if (hpp != undefined) {
		document.getElementById("lb-options-hpp").checked = isTrue(hpp);
	}
	if (ham != undefined) {
		document.getElementById("lb-options-ham").checked = isTrue(ham);
	}
	if (hsm != undefined) {
		document.getElementById("lb-options-hsm").checked = isTrue(hsm);
	}
	if (warnSecs != undefined) {
		document.getElementById("lb-options-warn-secs").value = warnSecs;
	}
	if (bep != undefined) {
		document.getElementById("lb-options-bep").checked = isTrue(bep);
	}
	if (kpb != undefined) {
		document.getElementById("lb-options-kpb").checked = isTrue(kpb);
	}
	if (hcm != undefined) {
		document.getElementById("lb-options-hcm").checked = isTrue(hcm);
	}
	if (htl != undefined) {
		document.getElementById("lb-options-htl").checked = isTrue(htl);
	}
	LeechBlock.updatePasswordOptions();
}
