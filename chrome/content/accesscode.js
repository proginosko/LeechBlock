/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file contains the code for the access code dialog.  It was necessary
 * to create this dialog (rather than use nsIPromptService.confirmEx) because
 * since Firefox 3 the text in the common dialog can be copied and pasted!
 */

// Handles access code dialog initialization
//
LeechBlock.accesscodeInit = function () {
	let code = window.arguments[0]; // input argument (pass by value)
	document.getElementById("lb-accesscode-code").value = code;
}

// Handles access code dialog OK button
//
LeechBlock.accesscodeOK = function () {
	let usercode = window.arguments[1]; // output argument (pass by object)
	usercode.value = document.getElementById("lb-accesscode-text").value;
	return true;
}

// Handles access code dialog Cancel button
//
LeechBlock.accesscodeCancel = function () {
	return true;
}
