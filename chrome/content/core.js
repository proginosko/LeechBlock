/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file defines the global namespace object and various utility functions.
 */

// Global namespace object
//
if (typeof LeechBlock == "undefined") {
	var LeechBlock = {
		// Flags to keep track of which block sets have had warnings displayed
		doneWarning: [false, false, false, false, false, false],
		// Lists to keep track of loaded documents
		loadedDocs: [[], [], [], [], [], []]
	};
}

// Various quasi-constants
//
LeechBlock.ID = "{a95d8332-e4b4-6e7f-98ac-20b733364387}";
LeechBlock.ALL_DAY_TIMES = "0000-2400";
LeechBlock.BROWSER_URL = "chrome://browser/content/browser.xul";
LeechBlock.DEFAULT_BLOCK_URL = "chrome://leechblock/content/blocked.xhtml?$S&$U";
LeechBlock.DELAYED_BLOCK_URL = "chrome://leechblock/content/delayed.xhtml?$S&$U";
LeechBlock.DEFAULT_BLOCK_URL_OLD = "chrome://leechblock/locale/blocked.html";
LeechBlock.DELAYED_BLOCK_URL_OLD = "chrome://leechblock/locale/delayed.html";
LeechBlock.PREFS = Cc["@mozilla.org/preferences-service;1"]
		.getService(Ci.nsIPrefService).getBranch("extensions.leechblock.");
LeechBlock.PROMPTS = Cc["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Ci.nsIPromptService);

// Functions to access user preferences
//
LeechBlock.clearUserPref = LeechBlock.PREFS.clearUserPref;
LeechBlock.getBoolPref = LeechBlock.PREFS.getBoolPref;
LeechBlock.setBoolPref = LeechBlock.PREFS.setBoolPref;
LeechBlock.getCharPref = LeechBlock.PREFS.getCharPref;
LeechBlock.setCharPref = LeechBlock.PREFS.setCharPref;
LeechBlock.getIntPref = LeechBlock.PREFS.getIntPref;
LeechBlock.setIntPref = LeechBlock.PREFS.setIntPref;
LeechBlock.getUniCharPref = function (name) {
	return LeechBlock.PREFS.getComplexValue(name, Ci.nsISupportsString).data;
};
LeechBlock.setUniCharPref = function (name, value) {
	let str = Cc["@mozilla.org/supports-string;1"]
			.createInstance(Ci.nsISupportsString);
	str.data = value;
	LeechBlock.PREFS.setComplexValue(name, Ci.nsISupportsString, str);
};
LeechBlock.getBitPref = function (name, bit) {
	return ((LeechBlock.PREFS.getIntPref(name) & (1 << --bit)) != 0);
}
LeechBlock.setBitPref = function (name, bit, value) {
	let bits = LeechBlock.PREFS.getIntPref(name);
	if (value) {
		LeechBlock.PREFS.setIntPref(name, bits | (1 << --bit));
	} else {
		LeechBlock.PREFS.setIntPref(name, bits & ~(1 << --bit));
	}
}

// Adds loaded document to list for specified block set
// (returns true if document added, false if already in list)
//
LeechBlock.addLoadedDoc = function (set, doc) {
	let docs = LeechBlock.loadedDocs[set - 1];
	for (let i = 0; i < docs.length; i++) {
		if (docs[i] == doc) {
			return false;
		}
	}
	docs.unshift(doc);
	return true;
}

// Removes loaded document from list for specified block set
// (returns true if document removed, false if not in list)
//
LeechBlock.removeLoadedDoc = function (set, doc) {
	let docs = LeechBlock.loadedDocs[set - 1];
	for (let i = 0; i < docs.length; i++) {
		if (docs[i] == doc) {
			docs.splice(i, 1);
			return true;
		}
	}
	return false;
}

// Sets active loaded document for specified block set
// (returns true if successful)
//
LeechBlock.setActiveLoadedDoc = function (set, doc) {
	let docs = LeechBlock.loadedDocs[set - 1];
	if (docs.length == 0) {
		return false; // list is empty
	} else if (docs[0] == doc) {
		return true; // already in first place
	} else {
		for (let i = 1; i < docs.length; i++) {
			if (docs[i] == doc) {
				docs.splice(i, 1);
				docs.unshift(doc);
				return true; // moved to first place
			}
		}
		return false; // not in list
	}
}

// Checks for active loaded document for specified block set
//
LeechBlock.isActiveLoadedDoc = function (set, doc) {
	let docs = LeechBlock.loadedDocs[set - 1];
	return (docs.length == 0) ? false : (docs[0] == doc);
}

// Returns number of loaded documents for specified block set
//
LeechBlock.numLoadedDocs = function (set) {
	return LeechBlock.loadedDocs[set - 1].length;
}

// Saves all preferences to file
//
LeechBlock.savePreferences = function () {
	Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService)
			.savePrefFile(null);
}

// Updates old preferences
//
LeechBlock.updatePreferences = function () {
	for (let set = 1; set <= 6; set++) {
		let blockURL = LeechBlock.getUniCharPref("blockURL" + set);
		if (blockURL == LeechBlock.DEFAULT_BLOCK_URL_OLD)
			LeechBlock.setUniCharPref("blockURL" + set, LeechBlock.DEFAULT_BLOCK_URL);
		if (blockURL == LeechBlock.DELAYED_BLOCK_URL_OLD)
			LeechBlock.setUniCharPref("blockURL" + set, LeechBlock.DELAYED_BLOCK_URL);
	}
}

// Returns parsed URL (page address, arguments, and hash)
//
LeechBlock.getParsedURL = function (url) {
	const PARSE_URL = /^(((\w+):\/*(\w+(?::\w+)?@)?([\w-\.]+)(?::(\d*))?)([^\?#]*))(\?[^#]*)?(#.*)?$/;

	let results = PARSE_URL.exec(url);
	if (results != null) {
		let page = results[1];
		let origin = results[2];
		let protocol = results[3];
		let userinfo = results[4];
		let host = results[5];
		let port = results[6];
		let path = results[7];
		let query = results[8];
		let fragment = results[9];
		return {
			pageNoArgs: page,
			page: (query == null) ? page : (page + query),
			origin: origin,
			protocol: protocol,
			host: host,
			path: path,
			args: (query == null) ? null : query.substring(1).split(/[;&]/),
			hash: (fragment == null) ? null : fragment.substring(1)
		};
	} else {
		console.warn("[LB] Cannot parse URL: " + url);
		return {
			pageNoArgs: null,
			page: null,
			origin: null,
			protocol: null,
			host: null,
			path: null,
			args: null,
			hash: null
		};
	}
}

// Returns browser version
//
LeechBlock.getBrowserVersion = function () {
	return Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService)
			.getCharPref("extensions.lastAppVersion");
}

// Creates regular expressions for matching sites to block/allow
//
LeechBlock.getRegExpSites = function (sites) {
	if (sites == "") {
		return {
			block: "",
			allow: "",
			keyword: ""
		};
	}

	let blockFiles = false;
	let allowFiles = false;

	let patterns = sites.split(/\s+/);
	let blocks = [];
	let allows = [];
	let keywords = [];
	for (let pattern of patterns) {
		if (pattern == "FILE") {
			blockFiles = true;
		} else if (pattern == "+FILE") {
			allowFiles = true;
		} else if (pattern.charAt(0) == "~") {
			// Add a keyword
			keywords.push(LeechBlock.keywordToRegExp(pattern.substr(1)));
		} else if (pattern.charAt(0) == "+") {
			// Add a regexp to allow site(s) as exception(s)
			allows.push(LeechBlock.patternToRegExp(pattern.substr(1)));
		} else if (pattern.charAt(0) != "#") {
			// Add a regexp to block site(s)
			blocks.push(LeechBlock.patternToRegExp(pattern));
		}
	}
	return {
		block: (blocks.length > 0)
				? "^" + (blockFiles ? "file:|" : "") + "(https?|file):\\/+(" + blocks.join("|") + ")"
				: (blockFiles ? "^file:" : ""),
		allow: (allows.length > 0)
				? "^" + (allowFiles ? "file:|" : "") + "(https?|file):\\/+(" + allows.join("|") + ")"
				: (allowFiles ? "^file:" : ""),
		keyword: (keywords.length > 0) ? keywords.join("|") : ""
	};
}

// Converts site pattern to regular expression
//
LeechBlock.patternToRegExp = function (pattern) {
	let special = /[\.\|\?\:\+\-\^\$\(\)\[\]\{\}\\]/g;
	return "(www\\.)?" + pattern				// assume optional www prefix
			.replace(special, "\\$&")			// fix special chars
			.replace(/^www\\\./, "")			// remove existing www prefix
			.replace(/\*{2,}/g, ".{STAR}")		// convert super-wildcards
			.replace(/\*/g, "[^\\/]{STAR}")		// convert wildcards
			.replace(/{STAR}/g, "*");			// convert stars
}

// Converts keyword to regular expression
//
LeechBlock.keywordToRegExp = function (keyword) {
	let special = /[\.\|\?\:\+\-\^\$\(\)\[\]\{\}\\]/g;
	return "\\b" + keyword
			.replace(special, "\\$&")			// fix special chars
			.replace(/_+/g, "\\s+")				// convert underscores
			.replace(/\*+/, "\\S*")				// convert wildcards
			+ "\\b";
}

// Tests URL against block/allow regular expressions
//
LeechBlock.testURL = function (pageURL, blockRE, allowRE) {
	return (blockRE != "" && (new RegExp(blockRE, "i")).test(pageURL)
			&& !(allowRE != "" && (new RegExp(allowRE, "i")).test(pageURL)));
}

// Checks times format
//
LeechBlock.checkTimesFormat = function (times) {
	return (times == "") || /^\d\d\d\d-\d\d\d\d([, ]+\d\d\d\d-\d\d\d\d)*$/.test(times);
}

// Checks positive integer format
//
LeechBlock.checkPosIntFormat = function (value) {
	return (value == "") || /^[1-9][0-9]*$/.test(value);
}

// Extracts times as minute periods
//
LeechBlock.getMinPeriods = function (times) {
	let minPeriods = [];
	if (times != "") {
		let regexp = /^(\d\d)(\d\d)-(\d\d)(\d\d)$/;
		let periods = times.split(/[, ]+/);
		for (let i in periods) {
			let results = regexp.exec(periods[i]);
			if (results != null) {
				let minPeriod = {
					start: (parseInt(results[1], 10) * 60 + parseInt(results[2], 10)),
					end: (parseInt(results[3], 10) * 60 + parseInt(results[4], 10))
				};
				minPeriods.push(minPeriod);
			}
		}
	}
	return minPeriods;
}

// Encodes day selection
//
LeechBlock.encodeDays = function (daySel) {
	let days = 0;
	for (let i = 0; i < 7; i++) {
		if (daySel[i]) days |= (1 << i);
	}
	return days;
}

// Decodes day selection
//
LeechBlock.decodeDays = function (days) {
	let daySel = new Array(7);
	for (let i = 0; i < 7; i++) {
		daySel[i] = ((days & (1 << i)) != 0);
	}
	return daySel;
}

// Calculates start of time period from current time and time limit period
//
LeechBlock.getTimePeriodStart = function (now, limitPeriod) {
	limitPeriod = +limitPeriod; // force value to number

	if (limitPeriod > 0) {
		let periodStart = now - (now % limitPeriod);

		// Adjust start time for timezone, DST, and Sunday as first day of week
		if (limitPeriod > 3600) {
			let offsetMins = new Date(now * 1000).getTimezoneOffset();
			periodStart += offsetMins * 60; // add time difference
			if (limitPeriod > 86400) {
				periodStart -= 345600; // subtract four days (Thu back to Sun)
			}

			// Correct any boundary errors
			while (periodStart > now) {
				periodStart -= limitPeriod;
			}
			while (periodStart <= now - limitPeriod) {
				periodStart += limitPeriod;
			}
		}

		return periodStart;
	}

	return 0;
}

// Formats a time in seconds to HH:MM:SS format
//
LeechBlock.formatTime = function (time) {
	let neg = (time < 0);
	time = Math.abs(time);
	let h = Math.floor(time / 3600);
	let m = Math.floor(time / 60) % 60;
	let s = Math.floor(time) % 60;
	return (neg ? "-" : "") + ((h < 10) ? "0" + h : h)
			+ ":" + ((m < 10) ? "0" + m : m)
			+ ":" + ((s < 10) ? "0" + s : s);
}

// Reads UTF-8 text file
//
LeechBlock.readTextFile = function (file) {
	const charSet = "UTF-8";
	const bufferSize = 4096;
	const replaceChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;

	// Create UTF-8 file input stream
	let fis = Cc["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Ci.nsIFileInputStream);
	fis.init(file, 0x01, 0664, 0);
	let cis = Cc["@mozilla.org/intl/converter-input-stream;1"]
			.createInstance(Ci.nsIConverterInputStream);
	cis.init(fis, charSet, bufferSize, replaceChar);

	// Read all text from stream
	let text = "";
	let str = {};
	while (cis.readString(bufferSize, str) != 0) {
		text += str.value;
	}

	// Close input stream
	cis.close();
	fis.close();

	return text;
}

// Writes UTF-8 text file
//
LeechBlock.writeTextFile = function (file, text) {
	const charSet = "UTF-8";
	const bufferSize = 4096;
	const replaceChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;

	// Create UTF-8 file output stream
	let fos = Cc["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Ci.nsIFileOutputStream);
	fos.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	let cos = Cc["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Ci.nsIConverterOutputStream);
	cos.init(fos, charSet, bufferSize, replaceChar);

	// Write text to stream
	cos.writeString(text);

	// Close output stream
	cos.close();
	fos.close();
}

// Creates a random access code of a specified length
//
LeechBlock.createAccessCode = function (len) {
	// Omit O, 0, I, l to avoid ambiguity with some fonts
	const codeChars = "!@#$%^&*()[]{}/\<>?+-=ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
	let code = "";
	for (let i = 0; i < len; i++) {
		code += codeChars.charAt(Math.random() * codeChars.length);
	}
	return code;
}

// Retrieves options password from Login Manager
//
LeechBlock.retrievePassword = function () {
	try {
		const loginManager = Cc["@mozilla.org/login-manager;1"]
				.getService(Ci.nsILoginManager);

		const hostname = "chrome://leechblock";
		const httprealm = "Options";
		const username = "";

		// Search for password
		let logins = loginManager.findLogins({}, hostname, null, httprealm);
		for (let i = 0; i < logins.length; i++) {
			if (logins[i].username == username) {
				return logins[i].password;
			}
		}
	} catch (e) {
		console.warn("[LB] Cannot retrieve password: " + e.toString());
		if (e.result == Cr.NS_ERROR_ABORT) {
			return null; // user canceled master password entry
		}
	}

	return ""; // no password found
}

// Stores options password in Login Manager
//
LeechBlock.storePassword = function (password) {
	try {
		const loginManager = Cc["@mozilla.org/login-manager;1"]
				.getService(Ci.nsILoginManager);

		const hostname = "chrome://leechblock";
		const httprealm = "Options";
		const username = "";

		// Remove any existing password
		let logins = loginManager.findLogins({}, hostname, null, httprealm);
		for (let i = 0; i < logins.length; i++) {
			loginManager.removeLogin(logins[i]);
		}

		// Add new password
		if (password != null && password != "") {
			let login = Cc["@mozilla.org/login-manager/loginInfo;1"]
					.createInstance(Ci.nsILoginInfo);
			login.init(hostname, null, httprealm, username, password, "", "");
			loginManager.addLogin(login);
		}
	} catch (e) {
		console.warn("[LB] Cannot store password: " + e.toString());
	}
}
