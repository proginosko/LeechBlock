### Version 1.0.1 (18 Dec 2015)
* Changed code to allow for custom blocking/delaying pages.
* Added tab icon to blocking/delaying pages (thanks to Chris Crowley).
* Added option to comment out entries in site list with # character.
* Added keyword-based blocking (experimental feature).
* Fixed bug in delaying block for sites with embedded pages (i.e., internal frames).
* Fixed bug where time spent is over-counted when multiple pages are open.
* Streamlined localization files (per AMO reviewer recommendation).
* Rewrote code to avoid global namespace pollution (per AMO reviewer recommendation).
* Various other improvements and fixes under the hood.

### Version 0.6.7.3 (25 Sep 2015)
* Fixed issue with "click here" link on blocking page when loaded in pinned tab.

### Version 0.6.7.2 (17 Sep 2015)
* Fixed issue with options dialog failing to open for some users.

### Version 0.6.7.1 (19 Jan 2015)
* Fixed some issues with French HTML files.

### Version 0.6.7 (26 Dec 2014)
* Added French localization (thanks to ioreker).
* Added code to block about:support along with about:config.
* Fixed code to add current site to block set via menu.
* Fixed issue with opening version history page after new version is installed.
* Updated licence to MPL 2.0.

### Version 0.6.6.1 (27 Nov 2013)
* Fixed minor issue with toolbar button orientation.

### Version 0.6.6 (31 Aug 2013)
* Added Taiwanese Chinese localization (thanks to Rex Tsai).

### Version 0.6.5 (01 Jul 2013)
* Added Czech localization (thanks to Michal Stanke).
* Added Simplified Chinese localization (thanks to Wang.H.K).
* Added option to block or allow all local files (use FILE or +FILE respectively).

### Version 0.6.4 (27 May 2013)
* Added Brazilian Portuguese localization (thanks to [Gutierrez PS](http://about.me/gutierrezps)).
* Preferences now saved to file whenever options are changed (in case browser not closed properly later on).
* Improved code to hide extension in Add-ons Manager (no longer appears under Search or Recent Updates).
* Tweaked some of the English localization.

### Version 0.6.3 (30 Apr 2012)
* Added quarter-hour and half-hour options for time limit period.
* Added support for Firefox Sync.
* Reduced number of preferences (boolean prefs now stored in bit format).

### Version 0.6.2 (04 Apr 2012)
* Added support for Unicode characters in preferences.
* Added option for 128-character access code.
* Added "Support LeechBlock" links to options window and blocking pages.
* Fixed bug in "Delaying Page" (countdown timer starting when new tab is opened in background).

### Version 0.6.1 (09 Mar 2012)
* Updated maxVersion to 11.*.
* Added option to hide "Time Left" toolbar widget when inactive.
* Fixed minor issues raised by AMO reviewer.

### Version 0.6 (25 Feb 2012)
* Updated maxVersion to 10.* and minVersion to 4.0 (i.e., no more support for 3.0).
* Added "Delaying Page" (temporary block with countdown timer) as alternative to "Default Page".
* Added toolbar button/menu with same functionality as context menu.
* Added toolbar widget to show time left before site is blocked (replaces status bar indicator).
* Added option to hide extension in Add-ons Manager.
* Added option to hide "Restart with Add-ons Disabled" menu item (in Help menu).
* Changed "Add This Site to Block Set" menu items to show actual domain name.
* Changed options to allow per-set canceling of lockdown.
* URLs with hash-bang syntax now blocked correctly (e.g., Twitter pages).
* Improved layout of options window.

### Version 0.5.2 (12 Mar 2011)
* Fixed issue retrieving options password when master password is set.
* Fixed bug in retrieving preference for "Keep blocked page in browser's 'Back' history".
* Fixed loophole in blocking about:addons and about:config.

### Version 0.5.1 (08 Jan 2011)
* Updated maxVersion to 4.0.* and minVersion to 3.0 (i.e., no more support for 2.0).
* Added options to prevent access to about:addons (Firefox 4).
* Added option for blocking embedded pages (e.g., Facebook internal frames).
* Changed URL test to be case-insensitive.
* List of sites now automatically sorted alphabetically.
* Options password now stored in Firefox's Login Manager (see Tools > Options > Security > Passwords).
* Fixed issue with options not disabled during lockdown.
* Fixed bug in calculation of time periods.

### Version 0.5 (25 Mar 2010)
* Added option to pass URL of blocked page in URL of block page (use $U).
* Added option to keep blocked page in browser's 'Back' history.
* Added option to display warning message before site is blocked.
* Added option to count time spent on pages when not focused (workaround for some sites with Flash/Java).
* Added hyperlinks to examples (online) from options dialog.
* Redesigned options dialog to use less screen real estate.
* Removed localizations (translators unavailable).

### Version 0.4.4 (22 Jan 2010)
* Added Polish localization (thanks to Michał Otroszczenko).
* Updated maxVersion to 3.6.*.

### Version 0.4.3 (26 Jun 2009)
* Added hyperlink to blocked page on default block page.
* Added hyperlink to FAQ (online) from options dialog.
* Removed Italian localization (translator no longer available).
* Minor cosmetic interface changes.
* Updated maxVersion to 3.5.*.

### Version 0.4.2.2 (29 Jul 2008)
* Added preference to set height (in rows) of sites field in options dialog (and reduced default height).
* Block page now replaces blocked page in browser history (so back button returns directly to page viewed before blocked page).

### Version 0.4.2.1 (15 Jul 2008)
* Fixed issue with random access code (text could be copied and pasted in Firefox 3).

### Version 0.4.2 (22 May 2008)
* Added Brazilian Portuguese localization (thanks to [Cláudio Bastos](http://emreflexao.blog.br/produtividade)).
* Updated maxVersion to 3.0.*.

### Version 0.4.1.1 (16 May 2008)
* Fixed confirmation when "Actively block ..." and "All Day" selected.

### Version 0.4.1 (08 Apr 2008)
* Fixed bug in 'lockdown' feature.
* Updated maxVersion to 3.0pre.

### Version 0.4 (27 Mar 2008)
* Added options to actively block pages when time period is entered or time limit expires.
* Added option to show time left before site is blocked in status bar.
* Added 'lockdown' feature (immediately block sites for a specified duration).
* Added items in tools menu to context menu.
* Updated maxVersion to 3.0b4 and fixed compatibility problems.
* Updated minVersion to 2.0 (i.e., no more support for 1.5).
* Released code under MPL/GPL/LGPL triple licence.

### Version 0.3.5.1 (23 Jan 2008)
* Fixed localization of description and added translator credit.

### Version 0.3.5 (09 Jan 2008)
* Updated maxVersion to 3.0b2 and fixed compatibility problem.
* Fixed problem with multiple home pages (now only the first one is used).

### Version 0.3.4 (02 Nov 2007)
* Added Italian localization (thanks to Andrea Diamante).
* Potentially ambiguous characters (0, O, I, l) now omitted from random access codes.
* Added more options for time periods.
* Fixed method for counting time spent on pages in specified time periods (now time spent is only counted on selected days -* and only within specified time periods when "within time periods AND after time limit" option is selected).
* Added options to prevent access to about:config.

### Version 0.3.3 (21 Sep 2007)
* Added option to enter random access code for access to options.
* Fixed loopholes in options to disable 'Disable' and 'Uninstall' buttons in Extension Manager.

### Version 0.3.2 (07 Sep 2007)
* Improved code to measure time spent on page.
* URLs with file protocol are now checked as well.
* Added support for super-wildcard (**) to match any character (including forward slash, unlike normal wildcard).
* Fixed bug in options dialog.

### Version 0.3.1 (15 Aug 2007)
* Fixed formatting of times in statistics dialog.
* URL of blocked page is now displayed on default block page.

### Version 0.3 (10 Aug 2007)
* Added time statistics dialog (shows time spent on sites for each block set).
* Added option to block sites based on time limits as well as fixed time periods.
* Improved option to prevent access to options at times when sites are blocked (now operates on a per-set basis).
* Added prompt to confirm settings where access to options is prevented all day.
* Added hyperlink to version history (online) from options dialog.
* Changed predefined URLs for block page (closed window removed, home page added).
* Added option to show/hide password characters when entered at prompt.
* Added option to show/hide context menu.

### Version 0.2.3 (25 Jul 2007)
* Added option to prevent access to options at times when sites are blocked.

### Version 0.2.2 (02 Jul 2007)
* Added context menu items to add current site to block sets.
* Added buttons to export/import options to a text file.
* Fixed some problems with the 'Load from URL' option.

### Version 0.2.1 (11 Jun 2007)
* Sites are now blocked immediately rather than after the page loads (which can take several seconds).
* Changed the format for time periods to be less strict (any sequence of commas and spaces allowed as separators).
* Only URLs with http or https protocol are now checked.
* Added hyperlink to home page from options dialog.

### Version 0.2 (30 May 2007)
* Added two more block sets.
* Added option to load domain names from URL (useful for automatic update).
* Added another predefined URL for block page (closed window).
* Added option to set custom name for block set.
* Added options to disable 'Disable' and 'Uninstall' buttons in Extension Manager (Firefox 2 only).

### Version 0.1.3 (20 Apr 2007)
* WWW prefix on domain names is now treated as implicit as well as optional (e.g., either somesite.com or www.somesite.com will block both sites).
* Also made the pattern checking a bit more efficient and fixed a problem where the blocking wasn't working for some users.

### Version 0.1.2 (24 Feb 2007)
* Added support for site exceptions (use + to prefix sites to allow, e.g., *.org +www.w3.org will block all .org sites except www.w3.org and w3.org).
* Also added some convenience buttons to options dialog. 

### Version 0.1.1 (12 Feb 2007)
* WWW prefix on domain names is now treated as optional (e.g., www.somesite.com will also block somesite.com).

### Version 0.1 (07 Feb 2007)
* Initial version.
