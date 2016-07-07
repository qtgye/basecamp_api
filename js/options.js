(function (Factory) {
	$(document).ready(Factory);
})(function () {
	

var $form = $('#options-form'),
	$username = $form.find('[name="username"]'),
	$password = $form.find('[name="password"]'),
	$alert = $('.config-alert');

// get data
chrome.storage.sync.get('config',function (_data) {
	if ( _data && _data.config && _data.config.username && _data.config.password ) {
		var config = _data.config;
		$username.val(config.username).next('label').addClass('active');
		$password.val(config.password).next('label').addClass('active');
	} else {
		$alert.removeClass('hide');
	}
});

$form.off().on('submit',function (e) {
	e.preventDefault();
	var _config = {
		username : $username.val(), 
		password : $password.val()
	};

	if ( _config.username && _config.password ) {
		$alert.addClass('hide');
		chrome.storage.sync.set({
			config : _config
		},function (a) {
			$('#options-saved').removeClass('hide');
			chrome.storage.local.set({
				config : _config
			});
		});
	} else {
		$alert.removeClass('hide');
	}
});



});