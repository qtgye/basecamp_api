(function (App) {
	
var Basecamp = App.Basecamp = {};



/**
 * -------------------------------------------------------
 * INITIAL PROPERTIES
 * -------------------------------------------------------
 */

Basecamp.isFetchingUser = true;
Basecamp.currentUser = null;




/**
 * -------------------------------------------------------
 * PRIVATE VARS
 * -------------------------------------------------------
 */

var _config = {
		basecamp_url : 'https://gobeyondstudios.basecamphq.com/'
	};



/**
 * -------------------------------------------------------
 * FUNCTION CLASSES
 * -------------------------------------------------------
 */


/**
 * The Basecamp Projects object
 * Manages the Projects list
 */
Basecamp.Projects = (function () {
	
	var Projects = {},
		list = {};

	/*
	 * Returns a project based on the given id
	 */
	Projects.findById = function (id) {
		if ( id in list ) {
			return list[id];
		}
		return null;
	};
	/**
	 * Replaces the Projects list 
	 */
	Projects.update = function (projectsList) {
		Projects.list = [];
		Projects.map = {};
		if ( projectsList.constructor == Array && projectsList.length > 0 ) {
			projectsList.forEach(function (_project) {
				list[_project.id] = _project;
			});
			return true;
		}
		return false;
	};
	/**
	 * Returns all projects
	 */
	Projects.all = function () {
		var listArray = [];
		for (id in list) {
			listArray.push(list[id]);
		}
		return listArray;
	};

	return Projects;
})();






/**
 * -------------------------------------------------------
 * PRIVATE FUNCTIONS
 * -------------------------------------------------------
 */


// Changes XML to JSON
function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	// do children
	if (xml.hasChildNodes()) {

		// If single child and it's a text
		if ( xml.childNodes.length == 1 && xml.childNodes.item(0).nodeName.match(/^#?text$/) ) {
			obj = xml.textContent.match(/^[0-9]*([.][0-9]+)?$/) ? Number(xml.textContent) : xml.textContent;

		// Otherwise loop through
		} else {
			for(var i = 0; i < xml.childNodes.length; i++) {
				var item = xml.childNodes.item(i);
				var nodeName = item.nodeName;
				if ( nodeName.match(/^#?text$/) ) {
					continue;
				}
				if (typeof(obj[nodeName]) == "undefined") {
					obj[nodeName] = xmlToJson(item);
				} else {
					if (typeof(obj[nodeName].push) == "undefined") {
						var old = obj[nodeName];
						obj[nodeName] = [];
						obj[nodeName].push(old);
					}
					obj[nodeName].push(xmlToJson(item));
				}
			}
		}		
	} else {
		obj = xml.nodeValue;
	}
	return obj;
};


/**
 * Fetches chrome storage sync data
 */
function fetchSyncData (onValid,onFail) {
	chrome.storage.sync.get('config',function (_data) {
		if ( _data && _data.config && _data.config.username && _data.config.password ) {
			chrome.storage.local.set({
				'config':_data.config
			},function () {
				Basecamp.validateConfig(onValid,onFail);
			});			
		} else {
			Basecamp.isFetchingUser = false;
			App.onConfigFail();
		}
	});	
}





/**
 * -------------------------------------------------------
 * PUBLIC PROPS
 * -------------------------------------------------------
 */








/**
 * -------------------------------------------------------
 * PUBLIC METHODS
 * -------------------------------------------------------
 */


Basecamp.getConfig = function () {
	return _config;
}


Basecamp.request = function (_opts) {

	var _defaults = {
			url : '',
			postData : null,
			method : 'GET',
			onSuccess : function(){},
			onError : function(){},
			auth : true, // will include credentials
		},
		_options = $.extend(true,{},_defaults,_opts),
		xhr = new XMLHttpRequest;

	_options.url = _config.basecamp_url + _options.url;

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 ) {
			if ( xhr.status == 200 && _options.method == 'GET' ) {
				try {
					var parser = new DOMParser(),
				    	xml = parser.parseFromString(xhr.responseText, "text/xml"),
				    	json = JSON.parse(JSON.stringify(xmlToJson(xml)));
				    if ( _options.onSuccess ) {
				    	_options.onSuccess(json,xhr);
				    }					
					return;
				} catch (err) {
					console.log('there was an error',err);
					_options.onError(xhr);
				}
			} else if ( 
					xhr.status == 201 && xhr.statusText == 'Created'
				|| 	xhr.status == 200 && _options.method == 'DELETE' ){
				_options.onSuccess(xhr);
			} else {
				_options.onError(xhr);
			}			
		}
	}

	// If there is a custom method
	xhr.open(_options.method, _options.url, true);

	// Check if needs auth
	if ( _options.auth ) {
		xhr.setRequestHeader("Authorization", "Basic " + btoa(_config.username + ":" + _config.password));
	}

	// Check if there is post data to send
	if ( _options.postData ) {
		xhr.setRequestHeader('Content-Type','application/xml');		
	}

	xhr.send( _options.postData ? _options.postData : '' );
};


Basecamp.updateUserConfig = function (callback) {
	// reset
	_config.username = null;
	_config.password = null;
	// update
	chrome.storage.local.get('config',function (_data) {
		// Fetch user on success
		if ( _data && _data.config && _data.config.username && _data.config.password ) {
			var config = _data.config;
			_config.username = config.username;
			_config.password = config.password;
		}
		callback();
	});
};


Basecamp.fetchUser = function () {
	console.log('fetching user Basecamp.fetchUser...');
	// Get user data
	Basecamp.request({
		url : 'me.xml',
		onSuccess : function (data,xhr) {
			if ( data.person ) {
				Basecamp.currentUser = data.person;		
				Basecamp.isFetchingUser = false;

				// Today		
				var today = Date.now();
				Basecamp.today = {
					basecampFormat : Basecamp.processDate(today),
					timestamp : new Date(today)
				};

				App.onAuthSuccess(Basecamp.currentUser,xhr);
				return;				
			}	
			console.log('error on success');
			Basecamp.isFetchingUser = false;
			App.onAuthFail(xhr);
		},
		onError : function (xhr) {
			Basecamp.isFetchingUser = false;
			App.onAuthFail(xhr);
		}
	});
};


Basecamp.fetchRecentEntries = function ( onSuccess,onError ) {
	// Get date five days ago
	var FiveDaysAgo = 1000*60*60*24*5;
	FiveDaysAgo = Date.parse(Basecamp.today.timestamp) - FiveDaysAgo;
	FiveDaysAgo = new Date(FiveDaysAgo);
	// Convert to basecamp format
	var from = FiveDaysAgo.getFullYear();
	from += FiveDaysAgo.getMonth() < 9 ? '0'+(FiveDaysAgo.getMonth()+1) : FiveDaysAgo.getMonth()+1;
	from += FiveDaysAgo.getDate();

	Basecamp.request({
		url : 'time_entries/report.xml?subject_id='+Basecamp.currentUser.id+'&from='+from+'&to='+Basecamp.today.basecampFormat,
		onSuccess : function (data) {
			if ( data && data['time-entries'] ) {
				console.log('success fetchRecentEntries',data['time-entries']['time-entry']);
				onSuccess(data['time-entries']['time-entry']);
			}
			onError(data);
		},
		onError : function (xhr) {
			if ( onError ) {
				onError(xhr);
			}
		}
	});
};


Basecamp.fetchProjects = function (onSuccess,onError) {
	Basecamp.request({
		url : 'projects.xml?limit=999',
		onSuccess : function (data) {
			Basecamp.Projects.update(data.projects.project);
			onSuccess(Basecamp.Projects.all());
		},
		onError : function (xhr) {
			if ( onError ) {
				onError(xhr);
			}
		}
	});
};


Basecamp.deleteTimeEntry = function (id,onSuccess,onFail) {
	Basecamp.request({
		url : 'time_entries/{{id}}.xml'.replace('{{id}}',id),
		method : 'DELETE',
		onSuccess : function (xhr) {
			console.info('Successfuly deleted time entry '+id,xhr);
			onSuccess(xhr);
		},
		onError : function (xhr) {
			console.log('delete error',xhr);
			onFail(xhr);
		}
	});
}


/**
 * Converts date to Basecamp acceptable date format
 * @param  {[type]} date [description]
 * @return {[type]} [description]
 */
Basecamp.processDate = function (date) {
	var _d = new Date(date),
		processedDate = '';

	processedDate += _d.getFullYear();

	var month = _d.getMonth()+1,
		date = _d.getDate();

	processedDate += month < 10 ? '0'+month : month;
	processedDate += date < 10 ? '0'+date : date;

	console.log('processedDate',processedDate);

	return processedDate;
}






/**
 * -------------------------------------------------------
 * INIT
 * -------------------------------------------------------
 */


})(window.App);