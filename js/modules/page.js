(function (App) {
	
var Page = App.Page = {};


/**
 * -------------------------------------------------------
 * PRIVATE VARS
 * -------------------------------------------------------
 */

var pages = {},
	_activePage = '';



/**
 * -------------------------------------------------------
 * FUNCTION CLASSES
 * -------------------------------------------------------
 */

function PageClass (el) {
	
	var self = this;

	self.id = el.id;
	self.$element = $(el);

	self.activate = function () {
		if ( _activePage ) {
			_activePage.deactivate();
		}
		self.isActive = true;
		self.$element.attr('aria-active-page',true);
		_activePage = self;
		if ( self.onActivate ) {
			self.onActivate(el);
		}
	};

	self.deactivate = function () {
		self.isActive = false;
		self.$element[0].removeAttribute('aria-active-page');
		_activePage = null;
	};

}





/**
 * -------------------------------------------------------
 * PRIVATE FUNCTIONS
 * -------------------------------------------------------
 */


/**
 * Binds pages
 */
function bindPages() {
	
	// Get list of pages
	$('.page').each(function () {		
		var _page = new PageClass(this);
		pages[_page.id] = _page;
	});

}


/**
 * Binds links to pages
 */
function bindLinks() {
	$('a:not([target])').each(function () {
		var $el = $(this),
			pageLink = $el.attr('href');

		$el.on('click',function (e) {
			e.preventDefault();
			e.stopPropagation();

			if ( pageLink in pages ) {
				pages[pageLink].activate();
			}
		});
	});
}




/**
 * -------------------------------------------------------
 * PUBLIC METHODS
 * -------------------------------------------------------
 */

Page.activate = function (link) {
	if ( link in pages ) {
		pages[link].activate();
	}
};


Page.onActivate = function (link,callback) {
	if ( link in pages ) {
		pages[link].onActivate = callback;
	}
};


Page.get = function (link) {
	return link in pages ? pages[link] : null;
}






/**
 * -------------------------------------------------------
 * INIT
 * -------------------------------------------------------
 */

bindPages();
bindLinks();

if ( 'home' in pages ) {
	pages.home.activate();
}


})(window.App);