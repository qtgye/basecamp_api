(function () {
	
var App = window.App = {},
	Background,
	BackgroundApp,
	Basecamp = {},
	_methods = {};



/**
 * ----------------------------------------------------------------------
 * PRIVATE VARIABLES
 * ----------------------------------------------------------------------
 */

var monthNames = [
  "January", "February", "March",
  "April", "May", "June", "July",
  "August", "September", "October",
  "November", "December"
];

var templates = {
	timeEntry : '<time-entry>\
				  <person-id>{person-id}</person-id>\
				  <date>{date}</date>\
				  <hours>{hours}</hours>\
				  <description>{description}</description>\
				</time-entry>'
};





/**
 * ----------------------------------------------------------------------
 * REGISTER POPUP METHODS
 * ----------------------------------------------------------------------
 */


_methods.onAuthSuccess = function () {
	console.info('auth success');
	onUserFetch();
	DOMbinds();	
};


_methods.onAuthFail = function (data) {
	console.warn('fail auth',data);
	onConfigFail();
};


_methods.onFetchRecentEntriesSuccess = onFetchRecentEntriesSuccess;


_methods.onTimeEntryDelete = function (id) {
	request(['fetchRecentEntries']);
};





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
 * Gets the background app page
 */
function BackgroundApp() {
	return chrome.extension.getBackgroundPage().window.App;
}

/**
 * Connect to the background page
 * @return void 
 */
function backgroundConnect() {
	request(['backgroundConnect',App], function(msg) {
		console.info(msg);
		request(['checkPreviousEntries']);
		request(['updateUserConfig']);
	});
}


/**
 * Binds elements
 */
function DOMbinds() {
	$('select').material_select();
	$('.datepicker').pickadate({
	    selectMonths: true, // Creates a dropdown to control month
	    selectYears: 15 // Creates a dropdown of 15 years to control year
	});
}


/**
 * Once user is fetched from background, run this
 */
function onUserFetch() {
	// Bind pages
	bindTaskListPage();
	bindFetchProjectPage();
	bindNewtimePage();

	request(['fetchRecentEntries']);
	BackgroundApp().Basecamp.fetchProjects();
	App.Page.activate('task_list');
}


/**
 * When options fail to get a config
 */
function onConfigFail() {
	bindOptionsLinkPage();
	App.Page.activate('options-link');
}


/**
 * Successfuly fetched recent time entries
 */
function onFetchRecentEntriesSuccess(_entries) {
	if ( !_entries ) return;

	var Basecamp = BackgroundApp().Basecamp,
		$select = $('[name="project"]'),
		$recentList = $('#recent-entries .recent-list'),
		recentProjects = [],
		recentEntriesGroup = {}; // Group recent entries and render to recent-entries page

	Basecamp.recentEntries = [];

	$recentList.empty();

	// Templates for recent-entries page
	var cardTemplate = '<li class="card" data-hours="0">' +
			              '<div class="card-content">' +
			                '<strong>{{date}}</strong>' +
			                '<br><br>' +
			                '<ul class="recent-projects">' +		                  
			                '</ul>' +  
			                '<div class="teal-text right"><strong><em>Total hours: <span class="total-hours"></span></strong></em></div>' +          
			              '</div>' +
			            '</li>',
		projectItemTemplate = '<li class="row">' +
			                    '<strong><a href="{{project-link}}" target="_blank">{{project}}</a></strong>' +
			                    '<ul class="recent-project-entries">' +
			                    '</ul>' +
			                  '</li>',
		entryTemplate = '<li class="row entry-item" data-id="{{id}}">' +
							'<div class="col s3">{{hours}} h</div>'+
							'<div class="col s9">{{description}}' + 
								'<a href="javascript:;" class="red-text item-delete">DELETE</a>' +
								'<span class="red-text item-deleting">Deleting...</span>' +
							'</div>' +
	                    '</li>';

	// SORT BY DATE, DESC
	_entries.sort(function (a,b) {
		return Date.parse(a.date) > Date.parse(b.date) ? -1 : 1;
	});


	// PROCESS EACH ENTRY
	_entries.forEach(function (_entry) {

		var _project = Basecamp.Projects.findById(_entry['project-id']);
		Basecamp.recentEntries.push(_entry);
		if ( _project && ( recentProjects.indexOf(_project) < 0 ) ) {
			recentProjects.push(_project);
		}

		// GROUP EM
		// -- Group by date
		if ( !(_entry.date in recentEntriesGroup) ) { 
			recentEntriesGroup[_entry.date] = {};
			var $card = $(cardTemplate.replace('{{date}}',_entry.date));
			$card.attr('id','card_'+_entry.date);
			$recentList.append($card);
		}
		// -- For each date group, create groups by project
		if ( !(_entry['project-id'] in recentEntriesGroup[_entry.date]) ) {
			recentEntriesGroup[_entry.date][_entry['project-id']] = [];
			var $dateCard = $('#card_'+_entry.date),
				$projectItem = $(projectItemTemplate.replace('{{project}}',_project.name).replace('{{project-link}}',Basecamp.getConfig().basecamp_url+'/projects/'+_project.id+'/time_entries'));
			$dateCard.find('.recent-projects').append($projectItem);
			$projectItem.attr('id',_entry.date+'_project-item_'+_project.id);
		}
		// -- Append to entries list
		recentEntriesGroup[_entry.date][_entry['project-id']].push(_entry);
		var $dateCard = $('#card_'+_entry.date);
		var	$projectItem = $('#'+_entry.date+'_project-item_'+_project.id);
		var	$entry = $(entryTemplate.replace(/{{[a-z]+}}/g,function (match) {
				switch (match) {
					case '{{hours}}': return _entry.hours; console.log('_entry.hours',_entry.hours);break;
					case '{{description}}': return _entry.description; break;
					case '{{id}}': return _entry.id; break;
				}
			}));
		$projectItem.find('.recent-project-entries').append($entry);

		// Bind delete
		$entry.find('.item-delete').on('click',function () {
			request(['deleteTimeEntry',_entry.id]);
			$entry[0].setAttribute('data-deleting',true);
		});

		// Update total hours
		var currentHours = Number($dateCard.attr('data-hours'));
		currentHours += _entry.hours;
		$dateCard
		.attr('data-hours',currentHours)
		.find('.total-hours').text(currentHours);
	});

	// Bind links in recent list
	$('#recent-entries a[target="_blank"]').on('click',function () {
		if ( this.href ) {
			chrome.tabs.create(this.href);
		}
	});


	// Render and bind recent projects list in new time form
	var $recentList = $('.recent_projects_list');
	recentProjects.forEach(function (_project) {		
		var id = _project.id,
			$el = $('<a href="javascript:;" style="text-decoration:underline" data-id="'+id+'"><em>'+_project.name+'</em></a>');
		console.log('_project',_project);
		$recentList.append($el).append($('<span>&nbsp;</span>'));
		$el.on('click',function () {
			if ( !$el[0].hasAttribute('selected') ) {
				var selected = $select.find('[selected]')[0];
				if ( selected ) {
					selected.removeAttribute('selected');
				}  
				$select.find('[value='+id+']')[0].setAttribute('selected',true);
				$select.material_select();
			}			
		});
	});

	// Update total hours logged for today in new time entry form
	var dateToday = new Date(),
		todayFullYear = dateToday.getFullYear(),
		todayMonth = dateToday.getMonth() + 1,
		todayDate = dateToday.getDate(),
		todayCardId = 'card_'+[todayFullYear,(todayMonth < 10 ? '0'+todayMonth : todayMonth),(todayDate < 10 ? '0'+todayDate : todayDate)].join('-'),
		$todayCard = $('#'+todayCardId),
		hoursToday = 0;
	if ( $todayCard.length ) {
		var hoursToday = Number($todayCard.attr('data-hours'));				
	}
	// Put remaining time as default
	$('#hours-logged').text(hoursToday);
	App.getBackgroundApp().Basecamp.today.loggedHours = hoursToday;
}


/**
 * Bind retry
 */


/**
 * Bind task_list page
 */
function bindTaskListPage() {
	App.Page.onActivate('task_list',function (el) {
		$(el).find('#user_name').text(BackgroundApp().Basecamp.currentUser['first-name']);
	});
}


/**
 * Bind fetch_projects page
 */
function bindFetchProjectPage() {
	var Basecamp = BackgroundApp().Basecamp;
	App.Page.onActivate('fetch_projects',function () {
		if ( !Basecamp.Projects ) {
			Basecamp.fetchProjects(function () {
				if ( Basecamp.Projects && Basecamp.Projects.all().length > 0 ) {
					App.Page.activate('new_time');
				} else {
					App.Page.activate('no_project');
				}
			});
		} else {
			App.Page.activate('new_time');
		}
	});
}


/**
 * Bind new_time page
 */
function bindNewtimePage() {

	var $form = $('form#new_time_form'),
		Basecamp = BackgroundApp().Basecamp;

	// Bind new time page
	App.Page.onActivate('new_time',function (pageEl) {

		var $select = $(pageEl).find('select[name="project"]');

		$select
		.append(function () {
			var options = '';
			if ( Basecamp.Projects && Basecamp.Projects.all().length > 0 ) {
				var _projects = Basecamp.Projects.all();
				// Sort projects alphabetically ASC
				_projects.sort(function (a,b) {
					return a.name < b.name ? -1 : 1;
				})
				// Add an option element for each project
				.forEach(function (_project) {
					options += '<option value="'+_project.id+'">'+_project.name+'</option>';
				});
			}
			return options;
		})
		.material_select();

		// Default to most recent project
		if ( Basecamp.recentEntries && Basecamp.recentEntries.length > 0 ) {			
			var mostRecentId = Basecamp.recentEntries[0]['project-id'];
			setTimeout(function () {
				$select.find('[value='+mostRecentId+']')[0].setAttribute('selected',true);
				$select.material_select();
			},100);
		}

		// Default to remaining hours to log
		var hoursRemaining = 8-App.getBackgroundApp().Basecamp.today.loggedHours;
		$('[name="hours"]').val(hoursRemaining)
			.next('label').addClass('active');

		// resets
		$form.find('#error-msg, #info-msg').text('');
		$form.find('[name="description"]').val('');

	});

	// Bind new time form
	$form.each(function () {
		var $form = $(this),
			$dateHelperInputs = $form.find('.helper_dates'),
			$date = $form.find('[name="date"]'),
			$dateLabel = $form.find('label[for="date"]'),
			$errorText = $('#error-msg'),
			$infoText = $('#info-msg');

		// add user id
		$form.find('input[name="person-id"]').val(Basecamp.currentUser.id);

		// Helper dates input
		// -- Today, set to default
		var today = Basecamp.today.timestamp.getDate();
		today += ' '+monthNames[Basecamp.today.timestamp.getMonth()];
		today += ', '+Basecamp.today.timestamp.getFullYear();
		var $today = $('<a href="javascript:;" style="text-decoration:underline">Today</a>').appendTo($dateHelperInputs);
		$dateHelperInputs.append('<span>&nbsp;</span>')
		$today.on('click',function () {
			$date.val(today);
			$dateLabel.addClass('active');
		});
		setTimeout(function () {
			$date.val(today);
			$dateLabel.addClass('active');
		},100);

		// -- Yesterday
		// Get date five days ago
		var yesterday = 1000*60*60*24;
		yesterday = Date.parse(Basecamp.today.timestamp) - yesterday;
		yesterday = new Date(yesterday);

		yesterdayDate = yesterday.getDate();
		yesterdayDate += ' '+monthNames[yesterday.getMonth()];
		yesterdayDate += ', '+yesterday.getFullYear();
		var $yesterday = $('<a href="javascript:;" style="text-decoration:underline">Yesterday</a>').appendTo($dateHelperInputs);
		$yesterday.on('click',function () {
			$date.val(yesterdayDate).focus();
		});

		// on submit
		$form.off().on('submit',function (e) {
			e.preventDefault();
			var formData = new FormData(this),				
				error = '',
				xml = templates.timeEntry;
			// validate data
			$errorText.text('');
			$infoText.text('');
			['person-id','date','hours','description','project'].forEach(function (_key) {
				var value = formData.get(_key);
				if ( !value ) {
					error += '<br />Missing value for '+_key;
				}
				if ( _key == 'date' ) {
					formData.set('date',Basecamp.processDate(value));
				}
				xml = xml.replace('{'+_key+'}',formData.get(_key));
			});
			if ( error ) {
				$errorText.html(error);
				return false;
			}
			// send data
			$infoText.text('Sending data...');
			sendFormData(xml,formData.get('project'));
			return false;
		});
	});
}


function bindOptionsLinkPage() {
	App.Page.onActivate('options-link',function () {
		$('#options-link-text').on('click',function () {
			chrome.tabs.create({ url: "options.html" });
		});
		$('#auth-retry-link').on('click',function (e) {
			console.log('clicked retry');
			e.preventDefault();
			App.Page.activate('auth-retry');
			setTimeout(function () {
				request(['updateUserConfig']);
			},1000);
		});	
	});	
}


/**
 * Sends form data to basecamp api	
 */
function sendFormData(xml,project) {
	BackgroundApp().Basecamp.request({
		url : 'projects/'+project+'/time_entries.xml',
		postData : xml,
		method : 'POST',
		onSuccess : function () {
			App.Page.activate('new-entry-saved');
			request(['fetchRecentEntries']);
		},
		onError : function (err) {
			console.log('error',err);
		}
	});
	return false;
};



/**
 * ----------------------------------------------------------------------
 * PUBLIC METHODS
 * ----------------------------------------------------------------------
 */

App.getBackgroundApp = BackgroundApp;





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

$(document).ready(backgroundConnect);

})();