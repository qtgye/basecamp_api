(function (chrome) {

/**
 * ----------------------------------------------------------------------
 * PRIVATE VARS
 * ----------------------------------------------------------------------
 */

var App = window.App = {},
	_methods = {};




/**
 * ----------------------------------------------------------------------
 * PRIVATE FUNCTIONS
 * ----------------------------------------------------------------------
 */


/**
 * Facade for chrome.extension.sendRequest
 */
function request(data,fn) {
	chrome.extension.sendRequest(data, fn && fn.constructor == Function ? fn : _dummy );
}


/**
 * Dummy function
 */
function _dummy(args) {}


/**
 * Updates user config from chrome storage
 */
function updateUserConfig() {
	App.Basecamp.updateUserConfig(App.Basecamp.fetchUser);
};





/**
 * ----------------------------------------------------------------------
 * REGISTER BACKGROUND METHODS
 * ----------------------------------------------------------------------
 */

_methods.backgroundConnect = function () {
	return 'Successfully connected to background.';
};


_methods.updateUserConfig = updateUserConfig;


_methods.getUser = function () {
	if ( App.Basecamp && App.Basecamp.isFetchingUser ) {
		App.Basecamp.onUserFetch(_user);
	} else {
		App.Basecamp.onUserFetch(null);
	}
}


_methods.fetchRecentEntries = function () {
	App.Basecamp.fetchRecentEntries(
		//SUCCESS
		function (_entries) {
			request(['onFetchRecentEntriesSuccess',_entries]);
		},
		// FAIL
		_dummy);
};


_methods.deleteTimeEntry = function (id) {
	App.Basecamp.deleteTimeEntry(id,
		// SUCCESS
		function (xhr) {			
			request(['onTimeEntryDelete',id]);
		},
		// FAIL
		_dummy);
};


_methods.checkPreviousEntries = function () {
	App.Basecamp.checkPreviousEntries();
};




/**
 * ----------------------------------------------------------------------
 * REGISTER BACKGROUND METHODS
 * ----------------------------------------------------------------------
 */

App.onAuthFail = function (data) {
	request(['onAuthFail',data]);
};


App.onAuthSuccess = function (data) {
	request(['onAuthSuccess',data]);
};


App.updateUserConfig = updateUserConfig;




/**
 * ----------------------------------------------------------------------
 * REGISTER BACKGROUND METHODS
 * ----------------------------------------------------------------------
 */





/**
 * ----------------------------------------------------------------------
 * Start our listener
 * ----------------------------------------------------------------------
 */
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if ( request[0] && request[0] in _methods ) {
		var data = _methods[request[0]](request[1]);
		sendResponse(data);
	}
});



/**
 * ----------------------------------------------------------------------
 * Init
 * ----------------------------------------------------------------------
 */



})(chrome);