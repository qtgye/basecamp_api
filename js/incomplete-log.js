(function (onDOMLoaded) {
	
	document.addEventListener('DOMContentLoaded',onDOMLoaded);

})(function () {

var _w = window,
	_d = document;

var urlParams = {};


// process url params
location.search.match(/([^\?&=]+=[^\?&=]+)/g).forEach(function (_item) {
	var _item = _item.split('=');
	urlParams[_item[0]] = _item[1];
});




/**
 * ----------------------------------------------------------------
 * SIMPLE TEMPLATING ENGINE
 * ----------------------------------------------------------------
 */

// Process DOM
var container = _d.getElementById('container'),
	html = container.innerHTML;

container.innerHTML = html.replace(/{{[A-Za-z0-9-_]+}}/g,function (match) {
	var _variable = match.replace(/[\{\{\}\}]/g,'');
	return '<span data-model="'+_variable+'"></span>';
});

// Replace template data
var ModelViews = {
	elements : document.querySelectorAll('[data-model]'),
	renderModel : function (modelName,data) {
		[].filter.call(this.elements,function (_element) {
			return _element.getAttribute('data-model') == modelName;
		}).forEach(function (_element) {
			_element.textContent = data;
		});
	}
};


// Render data
ModelViews.renderModel('date',urlParams.date);
ModelViews.renderModel('hours',urlParams.hours);

// Show container
container.className = container.className.replace(/\s?hide\s?/,'');

});