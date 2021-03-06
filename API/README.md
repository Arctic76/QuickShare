<center>[![License](https://img.shields.io/badge/License-GPL3.0-blue.svg)](https://github.com/Arctic76/Sharing-System/blob/master/LICENSE) [ ![Node](https://img.shields.io/badge/Node-7.4.0-blue.svg)](https://nodejs.org/en/) [ ![Express](https://img.shields.io/badge/Express.js-4.13.4-blue.svg)](http://expressjs.com/) [ ![JWT] (https://img.shields.io/badge/JWT-7.1.9-blue.svg)](https://jwt.io/)[ ![Web Push](https://img.shields.io/badge/Web%20Push%20Notification-OneSignal-blue.svg)](https://onesignal.com/) <br/><br/>![build](https://img.shields.io/badge/build-passing-brightgreen.svg)</center>

**QuickShare**
=============

(Node.js / Express.js / Vue.js / MongoDB)
-----------------------------------------

**API:**


**Installation:**

To install the application, you have to follow these instructions :

 Go to the API folder.
 Open a terminal and tape:

    npm install

If you have errors during installation, make sure that python and node are installed and that PATH environment values are set.
Then, you have to create a config folder and a config file inside with the following code:

**config/config.js:**

    'use strict';
    
    module.exports = {
            database : <your_database_url>,
            secret: <your_JWT_secretKey>,
            googleSecret: <your_G-recaptcha_secretKey>,
            googlePublic: <your_G-recaptcha_publicKey>,
            cookieSecret: <your_cookieParser_secretKey>,
            domain: <your_domain_for_setCookie>,
            whitelist: [<Array of authorized domains],
            infoTTL: <value>,                            // in days
            notifAPIKey: <OneSignal Key>,
            notifAppID: <OneSignal APPID>,
            //Only for HTTPS server
            ca: 'PATH/example_com.ca-bundle',
            key: 'PATH/example_com.key',
            cert: 'PATH/example_com.crt'
    };

then you can serve an HTTP or HTTPS server with:

    npm run HTTP
    npm run HTTPS



> Written with [StackEdit](https://stackedit.io/).
