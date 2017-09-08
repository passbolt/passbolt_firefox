/**
 * Login page.
 *
 * @copyright (c) 2017 Passbolt SARL
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */

var passbolt = passbolt || {};
passbolt.login = passbolt.login || {};

$(function () {

  var passphraseIframeId = 'passbolt-iframe-login-form';

  /* ==================================================================================
   *  View Events Listeners
   * ================================================================================== */

  /**
   * Starts with server key check.
   */
  passbolt.login.onStep0Start = function () {
    var $renderSpace = $('.login.page .js_main-login-section'),
        browserName = passbolt.html.getBrowserName();
        tplData = {
          serverKeyId: 'fetching...',
          browserName: browserName
        };

    passbolt.html.loadTemplate($renderSpace, 'login/stage0.ejs', 'html', tplData)
      .then(function () {
        // Display information about the state of login
        // e.g. that we're going to check for the server key first
        passbolt.request('passbolt.keyring.server.get')
          .then(function (serverKeyInfo) {
            // Display server key in the box.
            $('#serverkey_id').text(serverKeyInfo.keyId.toUpperCase());

            // Starts checking server key.
            passbolt.login.onStep0CheckServerKey();
          })
          .catch(function () {
            // Display error message.
            $('.plugin-check.gpg').removeClass('notice').addClass('error');
            $('.plugin-check.gpg .message').text('Error: Could not find server key');
            passbolt.html.loadTemplate('.login.form', 'login/feedback-login-oops.ejs');
          });
      });
  };

  /**
   * Server key check.
   */
  passbolt.login.onStep0CheckServerKey = function () {

    passbolt.request('passbolt.auth.verify').then(
      function success(msg) {
        $('.plugin-check.gpg')
          .removeClass('notice')
          .addClass('success');

        passbolt.html.loadTemplate('.plugin-check.gpg', 'login/message.ejs', 'html', {message: msg});

        $('html').addClass('server-verified');
        passbolt.login.onStep1RequestPassphrase();
      },
      function error(msg) {
        $('.plugin-check.gpg')
          .removeClass('notice')
          .addClass('error');

        passbolt.html.loadTemplate('.plugin-check.gpg', 'login/message.ejs', 'html', {message: msg});

        $('html').addClass('server-not-verified');

        // Special case to handle if the user doesn't exist on server.
        if (msg.indexOf('no user associated') != -1) {
          $('html').addClass('server-no-user');
          passbolt.html.loadTemplate('.login.form', 'login/feedbackLoginNoUser.ejs');
        }
        // All other cases.
        else {
          passbolt.html.loadTemplate('.login.form', 'login/feedbackLoginOops.ejs');
        }
      }
    );
  };

  /**
   * Insert the passphrase dialog iframe.
   */
  passbolt.login.onStep1RequestPassphrase = function () {
		// Inject the passphrase dialog iframe into the web page DOM.
		// See passboltAuthPagemod and login-form for the logic inside the iframe
    var iframeId = passphraseIframeId;
		var iframeUrl = chrome.runtime.getURL('data/' + iframeId + '.html') + '?passbolt=' + iframeId;
    var $iframe = $('<iframe/>', {
      id: iframeId,
      src: iframeUrl,
      frameBorder: 0,
      class: 'loading'
    });
    $('.login.form').empty().append($iframe);
  };

  /* ==================================================================================
   *  Add-on Code Events Listeners
   * ================================================================================== */

  // Add a css class to an html element
  passbolt.message.on('passbolt.auth.add-class', function (selector, cssClass) {
    $(selector).addClass(cssClass);
  });

  // Remove a css class to an html element
  passbolt.message.on('passbolt.auth.remove-class', function (selector, cssClass) {
    $(selector).removeClass(cssClass);
  });

  // GPGAuth is completed with success
  passbolt.message.on('passbolt.auth.login-success', function () {
    $('html').addClass('loaded').removeClass('loading');
  });

  // GPGAuth failed
  passbolt.message.on('passbolt.auth.login-failed', function (message) {
    var tplData = {message: message};
    passbolt.html.loadTemplate('.login.form', 'login/feedbackLoginError.ejs', 'html', tplData);
  });

  // Passphrase have been captured and verified
  passbolt.message.on('passbolt.auth.login-processing', function (message) {
    $('html').addClass('loading').removeClass('loaded');
    // remove the iframe and tell the user we're logging in
    var tplData = {message: message};
    passbolt.html.loadTemplate('.login.form', 'login/feedbackPassphraseOk.ejs', 'html', tplData);
  });

  /* ==================================================================================
   *  Content script init
   * ================================================================================== */

  /**
   * Initialize the login.
   */
  passbolt.login.init = function () {
    passbolt.login.onStep0Start();
  };

  passbolt.login.init();

});
