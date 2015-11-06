var passbolt = passbolt || {};

$(function() {

    // shortcut for selectors
    var $saveMyKey = $('#saveKey'),
        $saveServerKey = $('#saveServerKey'),
        $saveSettings = $('#js_save_conf'),
        $myKeyAscii = $('#myKeyAscii'),
        $serverKeyAscii = $('#serverKeyAscii'),
        $myKeyFilepicker = $('#myKeyFilepicker'),
        $serverKeyFilepicker = $('#serverKeyFilepicker'),
        $domain = $('#baseUrl'),
        $firstname = $('#ProfileFirstName'),
        $lastname = $('#ProfileLastName'),
        $username = $('#UserUsername'),
        $userid = $('#UserId'),
        $securityTokenCode = $('#securityTokenCode'),
        $securityTokenColor = $('#securityTokenColor'),
        $securityTokenTextColor = $('#securityTokenTextColor'),
        $privateKeyInfo = $('#privkeyinfo'),
        $serverKeyInfo = $('#pubkeyinfo-server');

    /* ==================================================================================
     *  View Helpers
     * ================================================================================== */

    /**
     * Display the key information
     * @param keyInfo
     * @param keyId
     * @param keyType
     */
    var displayKeyInfo = function (keyInfo, container, keyType) {

        var info = {
            'uid' : (keyType == 'server' ? keyInfo.uid.replace('<', '&lt;').replace('>', '&gt;') : keyInfo.userIds[0].name + ' &lt;' + keyInfo.userIds[0].email + '&gt;'),
            'fingerprint' : keyInfo.fingerprint,
            'algorithm' : keyType == 'server' ? keyInfo.type : keyInfo.algorithm,
            'created' : keyType == 'server' ? keyInfo.key_created : keyInfo.created,
            'expires' : keyInfo.expires
        };
        if (keyInfo) {
            if (keyType == 'client') {
                var uids = '';
                for (var i in keyInfo.userIds) {
                    var uid = keyInfo.userIds[i].name + ' &lt;' + keyInfo.userIds[i].email + '&gt;';
                    uids += uid;
                }
                info.uid = uids;
            }
            $('.uid', container).html(info.uid);
            $('.fingerprint', container).html(info.fingerprint);
            $('.algorithm', container).html(info.algorithm);
            $('.created', container).html(info.created);
            $('.expires', container).html(info.expires);

        }
        else {
            $('.feedback', container).html(feedbackHtml('There is no private key available please upload one.', 'error'));
        }
    };

    var displayUserInfo = function (user) {
        $firstname.val(user.firstname);
        $lastname.val(user.lastname);
        $username.val(user.username);
        $userid.val(user.id);
        $domain.val(user.settings.domain);
        $securityTokenColor.val(user.settings.securityToken.color);
        $securityTokenTextColor.val(user.settings.securityToken.textcolor);
        $securityTokenCode.val(user.settings.securityToken.code);
    };

    /**
     * Uppercase the first letter
     * @returns {string}
     */
    String.prototype.ucfirst = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    /**
     * Helper to build feedback message
     * @param message
     * @param messageType
     * @returns {string}
     */
    var feedbackHtml = function (message, messageType) {
        return '<div class="message ' + messageType + '"><strong>' + messageType.ucfirst() + ':</strong> ' + message + '</div>';
    };

    /* ==================================================================================
     *  View init
     * ================================================================================== */

    /**
     * Get the information about the current user from the server if any
     * @TODO Fix this & add back html display
     */
    //var updatePublic = function() {
    //    passbolt.request('passbolt.user.get.remote')
    //        .then(function(user) {
    //            console.log('passbolt.user.get.remote success');
    //            displayKeyInfo(user.Gpgkey, 'pubkeyinfo-plugin', 'server');
    //
    //            passbolt.request('passbolt.keyring.public.get', user.id)
    //                .then(function(publicKeyArmored) {
    //                    if (publicKeyArmored) {
    //                        passbolt.request('passbolt.keyring.public.info', publicKeyArmored.key)
    //                            .then(function (info) {
    //                                //displayKeyInfo(info, 'pubkeyinfo-plugin', 'client');
    //                                console.log('passbolt.keyring.public.info :');
    //                                console.log(info);
    //                            });
    //                    }
    //                }).fail(function(){
    //                    console.log('passbolt.keyring.public.info fail');
    //                });
    //        }).fail(function(){
    //            console.log('passbolt.user.get.remote fail: no current user');
    //        });
    //};

    /**
     * Display key information
     * Triggered when the page is opened or when a new key is set
     */
    var getKeys = function() {
        passbolt.request('passbolt.keyring.private.get')
            .then(function(info) {
                displayKeyInfo(info, $privateKeyInfo, 'client');
                $myKeyAscii.val(info.key);
            })
            .fail(function(){
                console.log('passbolt.keyring.private.get fail: no private key set');
            });

        passbolt.request('passbolt.keyring.server.get')
            .then(function(info) {
                displayKeyInfo(info, $serverKeyInfo, 'client');
                $serverKeyAscii.val(info.key);
            })
            .fail(function(){
                console.log('passbolt.keyring.server.get fail: no private key set');
            });
    };

    /**
     * Get the user settings
     */
    var getUser = function () {
        passbolt.request('passbolt.user.get')
            .then(function(user) {
                displayUserInfo(user);
            })
            .fail(function(e){
                console.log('passbolt.user.get fail: no user set');
                console.log(e);
            });
    };

    /**
     * At startup read configuration and load baseurl
     */
    var init = function () {
        getUser();
        getKeys();
    };
    init();


    /* ==================================================================================
     *  View Events Listeners
     * ================================================================================== */

    /**
     * Event: When user press plugin configuration save button
     * Save the baseurl, user info, etc.
     */
    $saveSettings.click(function() {
        // Get the data from the input fields
        var user = {};
        user.firstname = $firstname.val();
        user.lastname = $lastname.val();
        user.username = $username.val();
        user.id = $userid.val();
        user.settings = {};
        user.settings.securityToken = {
            code : $securityTokenCode.val(),
            color : $securityTokenColor.val(),
            textcolor : $securityTokenTextColor.val()
        };
        user.settings.domain = $domain.val();

        // try to save the username
        passbolt.request('passbolt.user.set', user).then(
            function success() {
                $('.user.feedback').html(feedbackHtml('User and settings have been saved!', 'success'));
            },
            function error(msg) {
                $('.user.feedback').html(feedbackHtml(msg, 'error'));
            }
        );

    });

    /**
     * Event: When user press browse button for the personal key selection
     * Place the content of the file in the textarea
     */
    $myKeyFilepicker.click(function(){
        passbolt.request('passbolt.file.prompt')
            .then(function(data) {
                $myKeyAscii.val(data);
            });
    });

    /**
     * Event: When user press browse button for the server key selection
     * Place the content of the file in the textarea
     */
    $serverKeyFilepicker.click(function(){
        passbolt.request('passbolt.file.prompt')
            .then(function(data) {
                $serverKeyAscii.val(data);
            });
    });

    /**
     * Event: When the user press the save my key settings button
     * Save the private key and deduce public key from it
     */
    $saveMyKey.click(function() {
        var key = $myKeyAscii.val();

        passbolt.request('passbolt.keyring.private.import', key)
            .then(function() {
                // Display info.
                passbolt.request('passbolt.keyring.private.get').then(function(info) {
                    displayKeyInfo(info, $privateKeyInfo, 'client');
                });

                $('.my.key-import.feedback').html(feedbackHtml('The key has been imported succesfully.', 'success'));
            })
            .fail(function(params) {
                $('.my.key-import.feedback').html(feedbackHtml('something went wrong during the import: ' + params, 'error'));
            });
    });

    /**
     * Event: When the user press the save private key settings button
     * Save the public server key and update the info on the page
     */
    $saveServerKey.click(function() {
        var serverKey = $serverKeyAscii.val();
        passbolt.request('passbolt.keyring.server.import', serverKey)
            .then(function() {
                passbolt.request('passbolt.keyring.public.info', serverKey)
                    .then(function(info) {
                        displayKeyInfo(info, $serverKeyInfo, 'client');
                        $('.server.key-import.feedback').html(feedbackHtml('The key has been imported successfully.', 'success'));
                    })
                    .fail(function(){
                        $('.server.key-import.feedback').html(feedbackHtml('something went south when trying to display the key info','error'));
                    });
            })
            .fail(function(params) {
                $('.server.key-import.feedback').html(feedbackHtml('something went wrong during the import: ' + params, 'error'));
            });
    });
});