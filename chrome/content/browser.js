/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file contains the code for handling browser-based events.
 */

// Create progress listener for detecting location change
LeechBlock.progressListener = {
	QueryInterface: function(aIID) {
		if (aIID.equals(Ci.nsIWebProgressListener) ||
				aIID.equals(Ci.nsISupportsWeakReference) ||
				aIID.equals(Ci.nsISupports)) {
			return this;
		}
		throw Cr.NS_NOINTERFACE;
	},

	onLocationChange: function(aProgress, aRequest, aURI) {
		LeechBlock.onLocationChange(aProgress.DOMWindow);
	},

	onStateChange: function() {},
	onProgressChange: function() {},
	onStatusChange: function() {},
	onSecurityChange: function() {},
	onLinkIconAvailable: function() {}
};

// Handles browser loading
//
LeechBlock.onLoad = function (event) {
	// Clean preferences
	LeechBlock.cleanPreferences();

	// Add progress listener for this browser instance
	gBrowser.addProgressListener(LeechBlock.progressListener);

	// Apply preference for hiding safe-mode menu items
	let hsm = LeechBlock.getBoolPref("hsm");
	let helpSafeMode = document.getElementById("helpSafeMode");
	if (helpSafeMode != null) {
		helpSafeMode.hidden = hsm;
	}
	let appmenu_safeMode = document.getElementById("appmenu_safeMode");
	if (appmenu_safeMode != null) {
		appmenu_safeMode.hidden = hsm;
	}

	// Apply preference for hiding context menu
	let hcm = LeechBlock.getBoolPref("hcm");
	let contextMenu = document.getElementById("leechblock-context-menu");
	if (contextMenu != null) {
		contextMenu.hidden = hcm;
	}

	// Apply preference for hiding "Time Left" toolbar item
	LeechBlock.updateTimeLeft();

	// Get current time in milliseconds
	let time = Date.now();

	// Get current time in seconds
	let now = Math.floor(time / 1000);

	for (let set = 1; set <= 6; set++) {
		// Reset time data if currently invalid
		let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
		if (timedata.length == 4) {
			timedata[5] = 0; // add lockdown end time (null)
		} else if (timedata.length != 5) {
			timedata = [now, 0, 0, 0, 0];
		}
		LeechBlock.setCharPref("timedata" + set, timedata.join(","));

		// Get sites for block set from HTTP source (if specified)
		let sitesURL = LeechBlock.getUniCharPref("sitesURL" + set)
				.replace(/\$S/, set)
				.replace(/\$T/, time);
		if (sitesURL != "") {
			try {
				let req = new XMLHttpRequest();
				req.set = set;
				req.open("GET", sitesURL, true);
				req.overrideMimeType("text/plain");
				req.onreadystatechange = function () {
					LeechBlock.httpRequestCallback(req);
				};
				req.send(null);
			} catch (e) {
				console.warn("[LB] Cannot load sites from URL: " + sitesURL);
			}
		}
	}
}

// Handles browser unloading
//
LeechBlock.onUnload = function (event) {
	// Remove progress listener for this browser instance
	gBrowser.removeProgressListener(LeechBlock.progressListener);
}

// Handles HTTP request callback
//
LeechBlock.httpRequestCallback = function (req) {
	if (req.readyState == 4 && req.status == 200) {
		// Get sites from response text
		let sites = req.responseText;
		sites = sites.replace(/\s+/g, " ").replace(/(^ +)|( +$)|(\w+:\/+)/g, "");
		sites = sites.split(" ").sort().join(" "); // sort alphabetically

		// Get regular expressions to match sites
		let regexps = LeechBlock.getRegExpSites(sites);

		// Update preferences
		LeechBlock.setUniCharPref("sites" + req.set, sites);
		LeechBlock.setUniCharPref("blockRE" + req.set, regexps.block);
		LeechBlock.setUniCharPref("allowRE" + req.set, regexps.allow);
		LeechBlock.setUniCharPref("keywordRE" + req.set, regexps.keyword);
	}
}

// Handles location changing
//
LeechBlock.onLocationChange = function (win) {
	//console.log("[LB] win.location: " + win.location);

	// Stop user bypassing extension by loading browser.xul
	if (win.location.href.startsWith(LeechBlock.BROWSER_URL)) {
		win.location = "about:blank";
		return;
	}

	// Get parsed URL for this page
	let parsedURL = LeechBlock.getParsedURL(win.location.href);
	let pageURL = parsedURL.page;

	// Only check page the first time (i.e. no check when tab re-activated)
	if (win.leechblockPageURL != pageURL) {
		win.leechblockPageURL = pageURL;
		LeechBlock.checkWindow(parsedURL, win, false);
	}

	LeechBlock.updateTimeLeft(win.leechblockSecsLeft);
}

// Handles page loading
//
LeechBlock.onPageLoad = function (event) {
	//console.log("[LB] doc.load: " + event.target.location);

	let doc = event.target;
	let win = doc.defaultView;

	// Get parsed URL for this page
	let parsedURL = LeechBlock.getParsedURL(win.location.href);
	let pageURL = parsedURL.page;

	// Quick exit for system pages
	if (pageURL == LeechBlock.BROWSER_URL
			|| pageURL == "about:blank"
			|| pageURL == "about:newtab") {
		return;
	}

	// Clear preference for allowed origin/page if this is different origin/page
	let ao = LeechBlock.getUniCharPref("ao");
	let ap = LeechBlock.getUniCharPref("ap");
	if (/^http|file|about/.test(parsedURL.protocol) && (win.frameElement == null)) {
		if (parsedURL.origin != ao) {
			LeechBlock.clearUserPref("ao");
		}
		if (parsedURL.page != ap) {
			LeechBlock.clearUserPref("ap");
		}
	}

	// Hide extension in about:addons (if option selected)
	if (pageURL.toLowerCase() == "about:addons" && LeechBlock.getBoolPref("ham")) {
		LeechBlock.hideExtension(doc);
	}

	// Handle blocking/delaying page
	let blockingPage = doc.getElementById("leechblockBlockingPage");
	let delayingPage = doc.getElementById("leechblockDelayingPage");
	if ((blockingPage != null || delayingPage != null)
			&& parsedURL.args != null && parsedURL.args.length >= 2) {
		// Get block set and URL (including hash part) of blocked page
		let blockedSet = parsedURL.args.shift();
		let blockedURL = parsedURL.args.join("&");
		if (parsedURL.hash != null) {
			blockedURL += "#" + parsedURL.hash;
		}

		// Set URL of blocked page
		let blockedURLSpan = doc.getElementById("leechblockBlockedURLSpan");
		if (blockedURLSpan != null) {
			if (blockedURL.length > 60) {
				blockedURLSpan.textContent = blockedURL.substring(0, 57) + "...";
			} else {
				blockedURLSpan.textContent = blockedURL;
			}
		}

		// Set name of block set
		let blockedSetSpan = doc.getElementById("leechblockBlockedSetSpan");
		if (blockedSetSpan != null) try {
			let blockedSetName = LeechBlock.getUniCharPref("setName" + blockedSet);
			if (blockedSetName == "") {
				blockedSetSpan.textContent += " " + blockedSet; // "Block Set N" (localized)
			} else {
				blockedSetSpan.textContent = blockedSetName; // Custom block set name
			}
		} catch (e) {
			// Die gracefully
		}

		// Set unblock time
		let unblockTimeSpan = doc.getElementById("leechblockUnblockTimeSpan");
		if (unblockTimeSpan != null) {
			let unblockTime = LeechBlock.getUnblockTime(blockedSet);
			if (unblockTime != null) {
				if (unblockTime.getDate() == new Date().getDate()) {
					// Same day: show time only
					unblockTimeSpan.textContent = unblockTime.toLocaleTimeString();
				} else {
					// Different day: show date and time
					unblockTimeSpan.textContent = unblockTime.toLocaleString();
				}
			}
		}

		// Set hyperlink to blocked page
		let blockedURLLink = doc.getElementById("leechblockBlockedURLLink");
		if (blockedURLLink != null) {
			blockedURLLink.setAttribute("href", blockedURL);
		}

		// Start countdown if this is a delaying page
		if (delayingPage != null) try {
			// Get delay value in seconds
			let delaySecs = LeechBlock.getCharPref("delaySecs" + blockedSet);

			// Set countdown seconds on page
			let secondsSpan = doc.getElementById("leechblockDelaySecondsSpan");
			if (secondsSpan != null) {
				secondsSpan.textContent = delaySecs;
			}

			// Start countdown timer
			let countdown = {
				win: win,
				blockedURL: blockedURL,
				blockedSet: blockedSet,
				delaySecs: delaySecs
			};
			doc.leechblockCountdownInterval = setInterval(
					LeechBlock.onCountdownTimer,
					1000, countdown);
		} catch (e) {
			// Die gracefully
		}
	}

	for (let set = 1; set <= 6; set++) {
		// Get regular expressions for matching sites to block/allow
		let blockRE = LeechBlock.getUniCharPref("blockRE" + set);
		if (blockRE == "") continue; // no block for this set
		let allowRE = LeechBlock.getUniCharPref("allowRE" + set);

		// Test URL against block/allow regular expressions
		if (LeechBlock.testURL(pageURL, blockRE, allowRE)) {
			// Add document to list for block set
			LeechBlock.addLoadedDoc(set, doc);
		}
	}

	// Start clocking time spent on this page
	LeechBlock.clockPageTime(doc, true, doc.hasFocus());

	// Add event listeners for this window
	if (pageURL != "about:addons") {
		doc.addEventListener("focus", LeechBlock.onPageFocus, false);
		doc.addEventListener("blur", LeechBlock.onPageBlur, false);
	}
	//doc.addEventListener("pagehide", LeechBlock.onPageUnload, false);
	win.addEventListener("pagehide", LeechBlock.onWinUnload, false);

	// Check page (in case of keyword matches)
	LeechBlock.checkWindow(parsedURL, win, false);
}

// Checks the URL of a window and applies block if necessary
//
LeechBlock.checkWindow = function (parsedURL, win, isRepeat) {
	//console.log("[LB] checkWindow: " + win.location);

	let doc = win.document;

	// Quick exit for non-http/non-file/non-about URLs
	if (!/^(http|file|about)/.test(parsedURL.protocol)) {
		return;
	}

	// Quick exit for embedded pages (according to preference)
	if (win.frameElement != null && !LeechBlock.getBoolPref("bep")) {
		return;
	}

	// Quick exit for allowed origin/page
	let ao = LeechBlock.getUniCharPref("ao");
	let ap = LeechBlock.getUniCharPref("ap");
	if (parsedURL.origin == ao || parsedURL.page == ap) {
		return;
	}

	// Get URL without hash part (unless it's a hash-bang part)
	let pageURL = parsedURL.page;
	if (parsedURL.hash != null && /^!/.test(parsedURL.hash)) {
		pageURL += "#" + parsedURL.hash;
	}

	// Get current time/date
	let timedate = new Date();

	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	win.leechblockSecsLeft = Infinity;

	for (let set = 1; set <= 6; set++) {
		// Get regular expressions for matching sites to block/allow
		let blockRE = LeechBlock.getUniCharPref("blockRE" + set);
		if (blockRE == "") continue; // no block for this set
		let allowRE = LeechBlock.getUniCharPref("allowRE" + set);
		let keywordRE = LeechBlock.getUniCharPref("keywordRE" + set);

		// Get preferences for preventing access to about:addons and about:config
		let prevAddons = LeechBlock.getBitPref("prevAddons", set);
		let prevConfig = LeechBlock.getBitPref("prevConfig", set);

		// Test URL against block/allow regular expressions
		if (LeechBlock.testURL(pageURL, blockRE, allowRE)
				|| (prevAddons && /^about:addons/i.test(pageURL))
				|| (prevConfig && /^about:(config|support)/i.test(pageURL))) {
			// Get preferences for this set
			let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
			let times = LeechBlock.getCharPref("times" + set);
			let minPeriods = LeechBlock.getMinPeriods(times);
			let limitMins = LeechBlock.getCharPref("limitMins" + set);
			let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
			let periodStart = LeechBlock.getTimePeriodStart(now, limitPeriod);
			let conjMode = LeechBlock.getBitPref("conjMode", set);
			let daySel = LeechBlock.decodeDays(LeechBlock.getIntPref("days" + set));
			let blockURL = LeechBlock.getUniCharPref("blockURL" + set);
			let activeBlock = LeechBlock.getBitPref("activeBlock", set);

			// Start timer for repeat check
			if (doc.leechblockCheckTimeout == undefined) {
				doc.leechblockCheckTimeout = setTimeout(
						LeechBlock.repeatCheckWindow,
						LeechBlock.getIntPref("repeatCheckPeriod"), win);
			}

			// Check day
			let onSelectedDay = daySel[timedate.getDay()];

			// Check time periods
			let secsLeftBeforePeriod = Infinity;
			if (onSelectedDay && times != "") {
				// Get number of minutes elapsed since midnight
				let mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (let mp of minPeriods) {
					if (mins >= mp.start && mins < mp.end) {
						secsLeftBeforePeriod = 0;
					} else if (mins < mp.start) {
						// Compute exact seconds before this time period starts
						let secs = (mp.start - mins) * 60 - timedate.getSeconds();
						if (secs < secsLeftBeforePeriod) {
							secsLeftBeforePeriod = secs;
						}
					}
				}
			}

			// Check time limit
			let secsLeftBeforeLimit = Infinity;
			if (onSelectedDay && limitMins != "" && limitPeriod != "") {
				// Compute exact seconds before this time limit expires
				secsLeftBeforeLimit = limitMins * 60;
				if (timedata.length == 5 && timedata[2] == periodStart) {
					let secs = secsLeftBeforeLimit - timedata[3];
					secsLeftBeforeLimit = Math.max(0, secs);
				}
			}

			let withinTimePeriods = (secsLeftBeforePeriod == 0);
			let afterTimeLimit = (secsLeftBeforeLimit == 0);

			// Check lockdown condition
			let lockdown = (timedata.length == 5 && timedata[4] > now);

			// Check for keywords
			let keywords = (keywordRE == "")
					|| LeechBlock.checkKeywords(doc, keywordRE);

			// Determine whether this page should now be blocked
			let doBlock = lockdown
					|| (!conjMode && (withinTimePeriods || afterTimeLimit) && keywords)
					|| (conjMode && (withinTimePeriods && afterTimeLimit) && keywords);

			// Redirect page if all relevant block conditions are fulfilled
			if (doBlock && (!isRepeat || activeBlock)) {
				// Get final URL for block page
				blockURL = blockURL.replace(/\$S/g, set).replace(/\$U/g, pageURL);

				// Redirect page according to preference
				if (LeechBlock.getBoolPref("kpb")) {
					win.location = blockURL;
				} else {
					win.location.replace(blockURL);
				}

				return; // nothing more to do
			}

			// Update seconds left before block
			let secsLeft = conjMode
					? (secsLeftBeforePeriod + secsLeftBeforeLimit)
					: Math.min(secsLeftBeforePeriod, secsLeftBeforeLimit);
			if (secsLeft < win.leechblockSecsLeft) {
				win.leechblockSecsLeft = secsLeft;
				win.leechblockSecsLeftSet = set;
			}
		}
	}

	// Determine whether to display warning message
	let warnSecs = LeechBlock.getCharPref("warnSecs");
	if (warnSecs != "") {
		let set = win.leechblockSecsLeftSet;
		if (win.leechblockSecsLeft > warnSecs) {
			// Reset flag
			LeechBlock.doneWarning[set - 1] = false;
		} else if (!LeechBlock.doneWarning[set - 1]) {
			// Set flag
			LeechBlock.doneWarning[set - 1] = true;
			// Display warning message
			let setName = LeechBlock.getUniCharPref("setName" + set);
			LeechBlock.alertBlockWarning(set, setName, win.leechblockSecsLeft);
		}
	}
}

// Checks document for keywords
//
LeechBlock.checkKeywords = function (doc, keywordRE) {
	//console.log("[LB] checkKeywords: " + doc.location);

	// Create regular expression (case insensitive)
	let regexp = new RegExp(keywordRE, "i");

	// Get all text nodes in document
	let textNodes = doc.evaluate(
			"//text()",
			doc,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null);

	//console.log("[LB] Checking " + textNodes.snapshotLength + " text node(s) for keywords...");

	for (let i = 0; i < textNodes.snapshotLength; i++) {
		if (regexp.test(textNodes.snapshotItem(i).data)) {
			return true; // keyword found
		}
	}

	return false; // no keyword found
}

// Handles callback for repeat check
//
LeechBlock.repeatCheckWindow = function (win) {
	//console.log("[LB] repeatCheckWindow: " + win.location);

	try {
		let doc = win.document;

		doc.leechblockCheckTimeout = undefined;

		// Get parsed URL for this page
		let parsedURL = LeechBlock.getParsedURL(win.location.href);

		// Force update of time spent on this page
		if (doc.hasFocus()) {
			// Page is open and has focus
			LeechBlock.clockPageTime(doc, false, false);
			LeechBlock.clockPageTime(doc, true, true);
		} else {
			// Page is open but does not have focus
			LeechBlock.clockPageTime(doc, false, false);
			LeechBlock.clockPageTime(doc, true, false);
		}

		LeechBlock.checkWindow(parsedURL, win, true);

		// If page is active document, update time left
		if (doc == gBrowser.contentDocument) {
			LeechBlock.updateTimeLeft(win.leechblockSecsLeft);
		}
	} catch (e) {
		// Die gracefully
	}
}

// Handles page gaining focus
//
LeechBlock.onPageFocus = function (event) {
	//console.log("[LB] doc.focus: " + event.target.location);

	let doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	for (let set = 1; set <= 6; set++) {
		// Set active document in list for block set
		LeechBlock.setActiveLoadedDoc(set, doc);
	}

	LeechBlock.clockPageTime(doc, true, true);
}

// Handles page losing focus
//
LeechBlock.onPageBlur = function (event) {
	//console.log("[LB] doc.blur: " + event.target.location);

	let doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	LeechBlock.clockPageTime(doc, true, false);

	if (doc.leechblockCountdownInterval != undefined) {
		// Clear countdown timer
		clearInterval(doc.leechblockCountdownInterval);
		doc.leechblockCountdownInterval = undefined;

		// Strike line through countdown text (if this is delaying page)
		let countdownText = doc.getElementById("leechblockCountdownText");
		if (countdownText != null) {
			countdownText.style.textDecoration = "line-through";
		}
	}
}

// Handles page unloading
//
LeechBlock.onPageUnload = function (event) {
	//console.log("[LB] doc.unload: " + event.target.location);

	let doc = event.target.ownerDocument != null
			? event.target.ownerDocument
			: event.target;

	LeechBlock.clockPageTime(doc, false, false);
}

// Handles window gaining focus
//
LeechBlock.onWinFocus = function (event) {
	//console.log("[LB] win.focus: " + event.target.location);

	let win = event.currentTarget;
	let doc = win.document;
}

// Handles window losing focus
//
LeechBlock.onWinBlur = function (event) {
	//console.log("[LB] win.blur: " + event.target.location);

	let win = event.currentTarget;
	let doc = win.document;
}

// Handles window unloading
//
LeechBlock.onWinUnload = function (event) {
	//console.log("[LB] win.unload: " + event.target.location);

	let win = event.currentTarget;
	let doc = win.document;

	LeechBlock.clockPageTime(doc, false, false);

	if (doc.leechblockCheckTimeout != undefined) {
		// Clear timer for repeat check
		clearTimeout(doc.leechblockCheckTimeout);
		doc.leechblockCheckTimeout = undefined;
	}

	if (doc.leechblockAddonsTimeout != undefined) {
		// Clear timer for hiding extension
		clearTimeout(doc.leechblockAddonsTimeout);
		doc.leechblockAddonsTimeout = undefined;
	}

	if (doc.leechblockCountdownInterval != undefined) {
		// Clear countdown timer
		clearInterval(doc.leechblockCountdownInterval);
		doc.leechblockCountdownInterval = undefined;
	}

	for (let set = 1; set <= 6; set++) {
		// Remove document from list for block set
		LeechBlock.removeLoadedDoc(set, doc);
	}
}

// Clocks time spent on page
//
LeechBlock.clockPageTime = function (doc, open, focus) {
	// Get current time in milliseconds
	let time = Date.now();

	// Clock time during which page has been open
	let secsOpen = 0;
	if (open) {
		if (doc.leechblockOpenTime == undefined) {
			// Set start time for this page
			doc.leechblockOpenTime = time;
		}
	} else {
		if (doc.leechblockOpenTime != undefined) {
			if (doc.location != null && /^(http|file)/.test(doc.location.href)) {
				// Calculate seconds spent on this page (while open)
				secsOpen = Math.round((time - doc.leechblockOpenTime) / 1000);
			}

			doc.leechblockOpenTime = undefined;
		}
	}

	// Clock time during which page has been focused
	let secsFocus = 0;
	if (focus) {
		if (doc.leechblockFocusTime == undefined) {
			// Set focus time for this page
			doc.leechblockFocusTime = time;
		}
	} else {
		if (doc.leechblockFocusTime != undefined) {
			if (doc.location != null && /^(http|file)/.test(doc.location.href)) {
				// Calculate seconds spent on this page (while focused)
				secsFocus = Math.round((time - doc.leechblockFocusTime) / 1000);
			}

			doc.leechblockFocusTime = undefined;
		}
	}

	// Update time data if necessary
	if (secsOpen > 0 || secsFocus > 0) {
		LeechBlock.updateTimeData(doc, secsOpen, secsFocus);
	}
}

// Updates data for time spent on page
//
LeechBlock.updateTimeData = function (doc, secsOpen, secsFocus) {
	//console.log("[LB] updateTimeData: doc = " + doc.location);
	//console.log("[LB] updateTimeData: secsOpen = " + secsOpen);
	//console.log("[LB] updateTimeData: secsFocus = " + secsFocus);

	// Get parsed URL for this page
	let parsedURL = LeechBlock.getParsedURL(doc.location.href);
	let pageURL = parsedURL.page;

	// Get current time/date
	let timedate = new Date();

	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	for (let set = 1; set <= 6; set++) {
		// Get regular expressions for matching sites to block/allow
		let blockRE = LeechBlock.getUniCharPref("blockRE" + set);
		if (blockRE == "") continue; // no block for this set
		let allowRE = LeechBlock.getUniCharPref("allowRE" + set);

		// Test URL against block/allow regular expressions
		if (LeechBlock.testURL(pageURL, blockRE, allowRE)) {
			// Get preferences for this set
			let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
			let countFocus = LeechBlock.getBitPref("countFocus", set);
			let times = LeechBlock.getCharPref("times" + set);
			let minPeriods = LeechBlock.getMinPeriods(times);
			let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
			let conjMode = LeechBlock.getBitPref("conjMode", set);
			let daySel = LeechBlock.decodeDays(LeechBlock.getIntPref("days" + set));

			// Avoid over-counting time when multiple documents loaded
			if (!countFocus && !LeechBlock.isActiveLoadedDoc(set, doc)) continue;

			// Get start of this time period
			let periodStart = LeechBlock.getTimePeriodStart(now, limitPeriod);

			// Reset time data if currently invalid
			if (timedata.length != 5) {
				timedata = [now, 0, 0, 0, 0];
			}

			// Get number of seconds spent on page (focused or open)
			let seconds = countFocus ? secsFocus : secsOpen;

			// Update data for total time spent
			timedata[1] = +timedata[1] + seconds;

			// Determine whether we should count time spent on page in
			// specified time period (we should only count time on selected
			// days -- and in conjunction mode, only within time periods)
			let countTimeSpentInPeriod = daySel[timedate.getDay()];
			if (countTimeSpentInPeriod && conjMode) {
				countTimeSpentInPeriod = false;

				// Get number of minutes elapsed since midnight
				let mins = timedate.getHours() * 60 + timedate.getMinutes();

				// Check each time period in turn
				for (let mp of minPeriods) {
					if (mins >= mp.start && mins < mp.end) {
						countTimeSpentInPeriod = true;
					}
				}
			}

			// Update data for time spent in specified time period
			if (countTimeSpentInPeriod && periodStart > 0 && timedata[2] >= 0) {
				if (timedata[2] != periodStart) {
					// We've entered a new time period, so start new count
					timedata[2] = periodStart;
					timedata[3] = seconds;
				} else {
					// We haven't entered a new time period, so keep counting
					timedata[3] = +timedata[3] + seconds;
				}
				//console.log("[LB] Set " + set + ": " + timedata[3] + "s since " + new Date(timedata[2] * 1000).toLocaleString());
			}

			// Update preferences
			LeechBlock.setCharPref("timedata" + set, timedata.join(","));
		}
	}
}

// Updates "Time Left" toolbar item
//
LeechBlock.updateTimeLeft = function (secsLeft) {
	let timeLeft = document.getElementById("leechblock-time-left");
	if (timeLeft == null) {
		return;
	}

	if (secsLeft == undefined || secsLeft == Infinity) {
		timeLeft.value = "--:--:--";
		timeLeft.style.backgroundColor = "#BBB";
		timeLeft.style.color = "#444";
		timeLeft.hidden = LeechBlock.getBoolPref("htl");
	} else {
		timeLeft.value = LeechBlock.formatTime(secsLeft);
		timeLeft.style.backgroundColor = "#FFF";
		timeLeft.style.color = "#000";
		timeLeft.hidden = false;
	}
}

// Handles countdown on delayed block page
//
LeechBlock.onCountdownTimer = function (countdown) {
	let win = countdown.win;
	let doc = win.document;

	// Advance countdown if window has focus
	if (doc.hasFocus()) {
		countdown.delaySecs--;
	}

	// Update countdown seconds on page
	let secondsSpan = doc.getElementById("leechblockDelaySecondsSpan");
	if (secondsSpan != null) {
		secondsSpan.textContent = countdown.delaySecs;
	}

	if (countdown.delaySecs == 0) {
		// Clear countdown timer
		clearInterval(doc.leechblockCountdownInterval);
		doc.leechblockCountdownInterval = undefined;

		// Get parsed URL for blocked page
		let parsedURL = LeechBlock.getParsedURL(countdown.blockedURL);

		// Set preference for allowed origin/page
		if (LeechBlock.getBitPref("delayFirst", countdown.blockedSet)) {
			LeechBlock.setUniCharPref("ao", parsedURL.origin);
			LeechBlock.clearUserPref("ap");
		} else {
			LeechBlock.setUniCharPref("ap", parsedURL.page);
			LeechBlock.clearUserPref("ao");
		}

		// Continue to blocked page
		win.location = countdown.blockedURL;
	}
}

// Opens options dialog
//
LeechBlock.openOptionsDialog = function () {
	window.openDialog("chrome://leechblock/content/options.xul",
			"leechblock-options", "chrome,centerscreen");
}

// Opens statistics dialog
//
LeechBlock.openStatsDialog = function () {
	window.openDialog("chrome://leechblock/content/stats.xul",
			"leechblock-stats", "chrome,centerscreen");
}

// Opens lockdown dialog
//
LeechBlock.openLockdownDialog = function () {
	window.openDialog("chrome://leechblock/content/lockdown.xul",
			"leechblock-lockdown", "chrome,centerscreen");
}

// Shows alert dialog with block warning
//
LeechBlock.alertBlockWarning = function (set, setName, secsLeft) {
	if (setName == "") {
		setName = LeechBlock.locale_blockSet + " " + set;
	}
	LeechBlock.PROMPTS.alert(null,
			LeechBlock.locale_warning_title,
			LeechBlock.locale_warning_alertBlock
					.replace(/\$B/, setName)
					.replace(/\$S/, secsLeft));
}

// Returns label for item for add site menu
//
LeechBlock.getAddSiteMenuItemLabel = function (site, set, setName) {
	if (setName != "") {
		return LeechBlock.locale_menu_addThisSiteLabel
				.replace(/\$S/, site)
				.replace(/\$B/, setName);
	} else {
		return LeechBlock.locale_menu_addThisSiteLabel
				.replace(/\$S/, site)
				.replace(/\$B/, LeechBlock.locale_blockSet + " " + set);
	}
}

// Prepares menu (either context menu or toolbar menu)
//
LeechBlock.prepareMenu = function (menu, win) {
	// Remove all menu items except last three
	while (menu.children.length > 3) {
		menu.removeChild(menu.firstChild);
	}

	// Get parsed URL for current page
	let parsedURL = LeechBlock.getParsedURL(win.location.href);

	// Quick exit for non-http URLs
	if (!/^http/.test(parsedURL.protocol)) {
		return;
	}

	// Get site name from URL
	let site = parsedURL.host.replace(/^www\./, "");

	// Add separator element
	let menuseparator = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"menuseparator");
	menu.insertBefore(menuseparator, menu.firstChild);

	// Add menu item for each block set
	for (let set = 1; set <= 6; set++) {
		// Get custom block set name (if specified)
		let setName = LeechBlock.getUniCharPref("setName" + set);

		// Create new menu item
		let menuitem = document.createElementNS(
				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
				"menuitem");
		menuitem.setAttribute("id", "leechblock-context-menuitem-addsite" + set);
		menuitem.setAttribute("label",
				LeechBlock.getAddSiteMenuItemLabel(site, set, setName));
		menuitem.site = site;
		menuitem.set = set;

		// Add menu item before separator
		menu.insertBefore(menuitem, menuseparator);
	}
}

// Adds site to block set
//
LeechBlock.addSiteToSet = function (menu, win) {
	// Get site name and set number from menu item
	let site = menu.site;
	let set = menu.set;

	if (site == undefined || set == undefined) {
		return;
	}

	// Get parsed URL for current page
	let parsedURL = LeechBlock.getParsedURL(win.location.href);

	// Get sites for this set
	let sites = LeechBlock.getUniCharPref("sites" + set);

	// Add site if not already included
	let patterns = sites.split(/\s+/);
	if (patterns.indexOf(site) < 0) {
		if (sites == "") {
			sites = site;
		} else {
			sites += " " + site;
		}

		// Get regular expressions to match sites
		let regexps = LeechBlock.getRegExpSites(sites);

		// Update preferences
		LeechBlock.setUniCharPref("sites" + set, sites);
		LeechBlock.setUniCharPref("blockRE" + set, regexps.block);
		LeechBlock.setUniCharPref("allowRE" + set, regexps.allow);
		LeechBlock.setUniCharPref("keywordRE" + set, regexps.keyword);

		LeechBlock.checkWindow(parsedURL, win, false);

		LeechBlock.updateTimeLeft(win.leechblockSecsLeft);
	}
}

// Hides extension in about:addons
//
LeechBlock.hideExtension = function (doc) {
	let lists = [
		"search-list",		// Search
		"addon-list",		// Extensions
		"updates-list",		// Recent Updates
	];

	for (let list of lists) {
		let richlistbox = doc.getElementById(list);
		if (richlistbox != null) {
			let elements = richlistbox.getElementsByAttribute("value", LeechBlock.ID);
			for (let i = 0; i < elements.length; i++) {
				elements[i].hidden = true;
			}
		}
	}

	// Repeat after short interval (list is repopulated whenever category selection is changed)
	doc.leechblockAddonsTimeout = setTimeout(
			LeechBlock.hideExtension,
			200, doc);
}

// Returns time when blocked sites will be unblocked (as localized string)
//
LeechBlock.getUnblockTime = function (set) {
	// Get current time/date
	let timedate = new Date();
	
	// Get current time in seconds
	let now = Math.floor(Date.now() / 1000);

	// Get preferences for this set
	let timedata = LeechBlock.getCharPref("timedata" + set).split(",");
	let times = LeechBlock.getCharPref("times" + set);
	let minPeriods = LeechBlock.getMinPeriods(times);
	let limitMins = LeechBlock.getCharPref("limitMins" + set);
	let limitPeriod = LeechBlock.getCharPref("limitPeriod" + set);
	let periodStart = LeechBlock.getTimePeriodStart(now, limitPeriod);
	let conjMode = LeechBlock.getBitPref("conjMode", set);
	let days = LeechBlock.getIntPref("days" + set);
	let daySel = LeechBlock.decodeDays(days);

	// Check for valid time data
	if (timedata.length < 5) {
		return null;
	}

	// Check for 24/7 block
	if (times == LeechBlock.ALL_DAY_TIMES && days == 127 && !conjMode) {
		return null;
	}

	// Check for lockdown
	if (now < timedata[4]) {
		// Return end time for lockdown
		return new Date(timedata[4] * 1000);
	}
	
	// Get number of minutes elapsed since midnight
	let mins = timedate.getHours() * 60 + timedate.getMinutes();

	// Create list of time periods for today and following seven days
	let day = timedate.getDay();
	let allMinPeriods = [];
	for (let i = 0; i <= 7; i++) {
		if (daySel[(day + i) % 7]) {
			let offset = (i * 1440);
			for (let mp of minPeriods) {
				// Create new time period with offset
				let mp1 = {
					start: (mp.start + offset),
					end: (mp.end + offset)
				};
				if (allMinPeriods.length == 0) {
					// Add new time period
					allMinPeriods.push(mp1);
				} else {
					mp0 = allMinPeriods[allMinPeriods.length - 1];
					if (mp1.start <= mp0.end) {
						// Merge time period into previous one
						mp0.end = mp1.end;
					} else {
						// Add new time period
						allMinPeriods.push(mp1);
					}
				}
			}
		}
	}

	let timePeriods = (times != "");
	let timeLimit = (limitMins != "" && limitPeriod != "");

	if (timePeriods && !timeLimit) {
		// Case 1: within time periods (no time limit)
		
		// Find relevant time period
		for (let mp of allMinPeriods) {
			if (mins >= mp.start && mins < mp.end) {
				// Return end time for time period
				return new Date(
						timedate.getFullYear(),
						timedate.getMonth(),
						timedate.getDate(),
						0, mp.end);
			}
		}
	} else if (!timePeriods && timeLimit) {
		// Case 2: after time limit (no time periods)

		// Return end time for current time limit period
		return new Date(timedata[2] * 1000 + limitPeriod * 1000);
	} else if (timePeriods && timeLimit) {
		if (conjMode) {
			// Case 3: within time periods AND after time limit

			// Find relevant time period
			for (let mp of allMinPeriods) {
				if (mins >= mp.start && mins < mp.end) {
					// Return the earlier of the two end times
					let td1 = new Date(
							timedate.getFullYear(),
							timedate.getMonth(),
							timedate.getDate(),
							0, mp.end);
					let td2 = new Date(timedata[2] * 1000 + limitPeriod * 1000);
					return (td1 < td2) ? td1 : td2;
				}
			}
		} else {
			// Case 4: within time periods OR after time limit

			// Determine whether time limit was exceeded
			let afterTimeLimit = (timedata[2] == periodStart)
					&& (timedata[3] >= (limitMins * 60));

			if (afterTimeLimit) {
				// Check against end time for current time limit period instead
				let td = new Date(timedata[2] * 1000 + limitPeriod * 1000);
				mins = td.getHours() * 60 + td.getMinutes();
			}

			// Find relevant time period
			for (let mp of allMinPeriods) {
				if (mins >= mp.start && mins < mp.end) {
					// Return end time for time period
					return new Date(
							timedate.getFullYear(),
							timedate.getMonth(),
							timedate.getDate(),
							0, mp.end);
				}
			}
		}
	}

	return null;
}

// Add listeners for browser loading/unloading and page loading
window.addEventListener("load", LeechBlock.onLoad, false);
window.addEventListener("unload", LeechBlock.onUnload, false);
window.addEventListener("DOMContentLoaded", LeechBlock.onPageLoad, false);
