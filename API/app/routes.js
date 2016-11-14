'use strict';

// Requires
var express     = require('express');
var router      = express.Router();
var secretKey   = require('../config/config').secret;
var moment		= require('moment');
var Promise		= require('bluebird');
var Info 		= require('./models/Info');
var User		= require('./models/User');
var Controller  = require('./controller.js');
var bcrypt      = require('bcrypt');
var jwt         = require('jsonwebtoken'); // used to create, sign, and verify tokens

//hash setup
const saltRounds = 10;

// Export the router
module.exports  = router;

// API Routes
router


// Allow CORS
//==============================================

.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})


// POST register
//==============================================

.post('/user/register', function(req, res) {
    
    //Checking inputs

    if( Controller.isUsernameValid(req.body.username) && 
        Controller.isUserMailValid(req.body.mail) && 
        Controller.isUserPasswordValid(req.body.password)) {

        var tempUsername   = Controller.sanitizeString(req.body.username);
        var tempUserMail   = Controller.sanitizeString(req.body.mail);
        var isEmailVisible = Controller.checkBoolean(req.body.isEmailVisible);

        // Checking database for email or username
        
        Promise.props({
           username: User.findOne({username: tempUsername}, 'username').execAsync(),
           mail: User.findOne({mail: tempUserMail}, 'mail').execAsync()
        })
        .then(function(results) {
            if(results.username != null)
                res.status(400).json({success: false, message: 'Username already exists'});
            else if(results.mail != null)
                res.status(400).json({success: false, message: 'Mail already exists'});
            else {
                var user = new User({
                    username:   tempUsername,
                    password:   req.body.password,
                    mail:       tempUserMail
                });
                if(isEmailVisible)
                    user.isEmailVisible = true;
                //Hash password and save
                bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
                    user.password = hash;
                    user.save(function(err, resp) {
                        if(err) {
                            console.log('Error when trying to register an user: '+err);
                            res.status(500).send(err);
                        }
                        res.status(200).json({
                            success: true,
                            message: 'Successfully registered !'
                        });
                    });  
                });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.sendStatus(500); // oops - we're even handling errors!
        });
    }
    else {
        res.status(400).json({success: false, message: 'Bad request :  invalid inputs'});
    }
})


// LOGIN
//==============================================

.post('/user/login', function(req, res) {

    //Checking inputs

    if( Controller.isUsernameValid(req.body.username) && 
        Controller.isUserPasswordValid(req.body.password)) {

        Promise.props({
            user: User.findOne({username: req.body.username}).execAsync()
        })
        .then(function(results) {
            if(results.user != null) {
                // Load hash from your password DB.
                bcrypt.compare(req.body.password, results.user.password, function(err, resp) {
                    if(err) {
                        console.log('Error when checking password: '+ err);
                        res.status(500).json({success: false, message: 'Error when checking password'});
                    }
                    if(resp === true) {
                        var userData = {
                            userID: results.user._id,
                            username: results.user.username,
                            mail: results.user.mail,
                            isEmailVisible: results.user.isEmailVisible
                        };
                        var token = jwt.sign(userData, secretKey, {
                            expiresIn: '24h',
                            issuer: 'API-auth',
                            audience: 'web-frontend'
                        });
                        res.status(200).json({
                            success: true,
                            message: 'User connected',
                            token: token
                        });
                    }
                    else {
                        res.status(400).json({success: false, message: 'wrong password'})
                    }
                });
            }
            else {
                res.status(400).json({success: false, message: 'User not found'});
            }
        });
    }
})


// Getting informations by type
//===========================================

.get('/infos/', function(req, res) {
    Info.find().sort({voteCount: -1}).exec(function(err, infos) {
        if(err) {
            console.log('Error when trying to get all infos');
            res.status(500).send(err);
        }
    res.status(200).json(infos);
    });
})

// Checking token
//===========================================

.use(function(req, res, next) {

    //check header or url params or post params for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    //decode token
    if(token) {

        //verifies secret and checks exp
        jwt.verify(token, secretKey, function(err, decoded) {
            if(err) {
                return res.status(500).json({ success: false, message: 'Failed to authenticate token'});
            }
            else {
                //if everything good save to request for use in other Routes
                req.decoded = decoded;
                next();
            }
        });
    }
    else {

        //if there is no token : return error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
})


// POST new informations
//=============================================

.post('/infos', function(req, res) {

    // User ID checking

    if( !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else{
        
        // DATE CHECKING
        var tempExpiryDate = moment(req.body.expirydate, moment.ISO_8601);
        var tempBirthDate = moment();
        if(req.body.birthdate != '' && req.body.birthdate != undefined) {
            tempBirthDate = moment(req.body.birthdate, moment.ISO_8601);
        }
        var timeFromNow = tempBirthDate.diff(moment());
        var timeFromBirth = tempExpiryDate.diff(tempBirthDate);
        if( timeFromNow < 0 || timeFromNow > 86400000) {                    // 24h in ms
            res.status(400).send({success: false, message: 'Invalid birthdate'});
        }
        else if( timeFromBirth < 0 || timeFromBirth > 86400000) {           // 24 in ms
            res.status(400).send({success: false, message: 'Invalid expirydate'});
        }
        else {
        	
    		var info = new Info({

                title: 			Controller.sanitizeString(req.body.title),
                description: 	Controller.sanitizeString(req.body.description),
                birthdate: 		tempBirthDate,
                expirydate: 	tempExpiryDate,
                category: 		Controller.sanitizeString(req.body.category),
                location: 		Controller.sanitizeString(req.body.location),
                addInfo: 		Controller.sanitizeString(req.body.addInfo),
                userID: 		req.decoded.userID
            });
            if(info.category === 'Event') {
                info.userLimit = req.body.userLimit;
                info.acceptOverload = req.body.acceptOverload;
                info.userList.push(req.decoded.userID);
            }
        	info.save(function(err, resp) {
                if(err) {
                    console.log('Error when adding info');
                    res.status(500).send(err);
        	    }
                else {
                    res.status(200).json({success: true, message: 'Successfully added'});
                }
        	});
        }
    }
})

.get('/infos/user/:id', function(req, res) {

    // Checking userID
    if( !(Controller.isObjectIDValid(req.params.id)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else {
            Info.find({userID: req.params.id}, function(err, infos) {
                if(err) {
                    console.log('Error when trying to get infos for User ID: '+req.params.id);
                    res.status(500).send(err);
                }
                else {
                    res.status(200).json(infos);
                }
            });
    }
})


// UPDATE informations
//==============================================

.post('/infos/update/:id', function(req, res) {
    
    // IDs Cheking

    if( !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else {
        var userID = req.decoded.userID;

    // DATE Checking

        var tempBirthDate = moment(req.body.birthdate);
        var tempExpiryDate = moment(req.body.expirydate);
        var timeFromNow = tempBirthDate.diff(moment());
        var timeFromBirth = tempExpiryDate.diff(tempBirthDate);
        if( timeFromNow < 0 || timeFromNow > 86400000) {                    // 24h in ms
            res.status(400).send({success: false, message: 'Invalid birthdate'});
        }
        else if( timeFromBirth < 0 || timeFromBirth > 86400000) {           // 24h in ms
            res.status(400).send({success: false, message: 'Invalid expirydate'});
            console.log(timeFromBirth);
        }

    // POST Handling

        else {
            if( !(Controller.isObjectIDValid(req.params.id)) ) {
                res.status(400).send({success: false, message: 'Invalid Info ID'});
            }
            else {
                var infoID = req.params.id;
                Info.findOne({_id: infoID, userID: userID}, function(err, info) {
                    if(err) {
                        console.log('Error when trying to get the info to update: '+err);
                        res.status(500).send({success: false, message: 'Error when trying to get the info'});
                    }
                    if(info) {
                        if(info.userID === userID) {
                           info.updateInfos(req.body);
                            Info.update({_id: info._id}, info, function(err) {
                            if(err) {
                                console.log('Error when updating info: '+err);
                                res.status(500).send({success: false, message: 'Error when updating info'});
                            }
                            res.status(200).send({success: true, message: 'Info updated'});
                        }); 
                        }
                        else {
                            res.status(403).send({success: false, message: 'You are not authorized to update this info'});
                        }
                        
                    }
                    else {
                        res.status(404).send({success: false, message: 'No info found'});
                    }
                });
            }
        }
    }
})


// DELETE informations // todo Security
//==============================================

.delete('/infos/delete/:id', function(req, res) {
    
    // Cheking userID
    if( !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else {
            if (!(Controller.isObjectIDValid(req.params.id)) )
                res.status(400).send({success: false, message: 'Info ID is invalid'});
            else {
                Info.findOneAndRemove({_id: req.params.id, userID: req.decoded.userID}, function(err, info) {
                    if(err) {
                        console.log('Error when trying to delete the info');
                        res.status(500).send(err);
                    }
                    if(info) {
                        console.log('Info removed');
                        res.status(200).json({success: true, message: 'Info removed'});
                    }
                    else {
                        res.status(404).send({success: false, message: 'There is no info with this ID or you are to authorized to delete it'});
                    }
                });
            }
    }
})


// JOIN Event
//==============================================

.post('/infos/:id/join', function(req, res) {

    // ID Checking

    if( !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else if ( !(Controller.isObjectIDValid(req.params.id)) ) {
        res.status(400).send({success: false, message: 'Invalid Event ID'});
    }
    else {
        var userID  = req.decoded.userID;
        var eventID = req.params.id;
        User.findOne({_id: userID}, function(err, user) {
            if(err) {
                console.log('Error when checking user identity');
                res.status(500).send({success: false, message: 'Error when checking user identity'});
            }
            if(!user) {
                res.status(404).send({success: false, message: 'Bad request : Unknown user id'});
            }
            else {
                Info.findOne({_id: eventID}, function(err, event) {
                    if(err) {
                    console.log('Error when trying to find event to join: '+err);
                    res.status(500).send(err);
                    }
                    if(event) {
                        if(event.category === 'Event') {
                          if(event.isFull()) {
                                res.status(409).send({success: false, message: 'Event is full'});
                            }
                            else {
                                var isUserAlreadyIn = false;
                                for (var i = event.userList.length - 1; i >= 0; i--) {
                                    if(event.userList[i] === userID) {
                                        isUserAlreadyIn = true;
                                        res.status(409).send({success: false, message: 'User already in the event'});
                                    }
                                }
                                if(!isUserAlreadyIn) {
                                    event.userList.push(userID);
                                    Info.update({_id: eventID}, event, function(err) {
                                        if(err) {
                                            console.log('Error when updating the event after user joined: '+err);
                                            res.status(500).send({success: false, message: 'Error when updating the event'});
                                        }
                                        res.status(200).send({success: true, message: 'Event joined'});
                                    });
                                }
                            }  
                        } 
                        else {
                            res.status(404).send({success: false, message: 'No event found'});
                        }
                    }
                    else {
                        res.status(404).send({success: false, message: 'No event found'});
                    }
                });
            }
        });
    }
})


// LEAVE Event
//=============================================

.post('/infos/:id/leave', function(req, res) {

    // ID Checking

    if( !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid userID'});
    }
    else if ( !(Controller.isObjectIDValid(req.params.id)) ) {
        res.status(400).send({success: false, message: 'Invalid Event ID'});
    }
    else {
        var eventID = req.params.id;
        var userID  = req.decoded.userID;
        Info.findOne({_id: eventID}, function(err, event) {
            if(err) {
                console.log('Error when trying to find the event to leave: '+err);
                res.status(500).send(err);
            }
            if(event) {
                if(event.category === 'Event') {
                    var isUserIn = false;
                    for (var i = event.userList.length - 1; i >= 0; i--) {
                        if(event.userList[i] === userID) {
                            isUserIn = true;
                            event.userList.pull(userID);
                            Info.update({_id: eventID}, event, function(err) {
                                if(err) {
                                    console.log('Error when updating event after user leaving: '+err);
                                    res.status(500).send(err);
                                }
                                res.status(200).send({success: true, message: 'user removed from event'});
                            });
                        }
                    }
                    if(!isUserIn) {
                        res.status(404).send({success: false, message: 'user not found in the event'});
                    }
                }
                else {
                    res.status(404).send({success: false, message: 'Event not found'});
                }
            }
            else {
                res.status(404).send({success: false, message: 'Event not found'});
            }
        });
    }
}) 


// POST add upvote/downvote
//==============================================

.post('/infos/:id/:votetype', function(req, res) {
    if( !(Controller.isObjectIDValid(req.params.id)) ||
        !(Controller.isObjectIDValid(req.decoded.userID)) ) {
        
        res.status(400).send({success: false, message: 'Invalid ID'});
    }
    else if ( !(Controller.isVoteTypeValid(req.params.votetype)) ) {
        res.status(400).send({success: false, message: 'Bad request'});
    }
    else {
        var userID      = req.decoded.userID;
        var infoID      = req.params.id;
        var votetype    = req.params.votetype === 'upvote'?(1):(-1);
        
            Info.findOne({_id: infoID}, function(err, info) {
                if(err) {
                    console.log('Error when updating votes');
                    res.status(500).send(err);
                }
                if(info) {
                    var vote;
                    var isVoteExist = false;
                    // We search if the user already added a vote
                    for (var i = 0; i < info.votes.length; i++) {
                        vote = info.votes[i];
                        if(vote.userID === userID) {
                            isVoteExist = true;
                            vote.value = votetype;
                            info.updateVoteCount();
                            Info.update({_id: infoID}, info, function(err) {
                                if(err) {
                                    console.log('Error when updating the info: '+err);
                                    res.status(500).send({success: false, message: 'Error when updating the info'});
                                }
                                res.status(200).send({success: true, message: 'Vote updated !'});
                            }); 
                        }
                        if(isVoteExist) break;
                    } // END FOR
                    // If no vote found, we add a new one
                    if(!isVoteExist) {
                        info.votes.push({userID: userID, value: votetype});
                        info.updateVoteCount();
                        Info.update({_id: infoID}, info, function(err) {
                        if(err) {
                            console.log('Error when updating the info: '+err);
                            res.status(500).send({success: true, message: 'Error when updating the info'});
                        }
                        res.status(200).send({success: true, message: 'Vote sent !'});
                        });
                    } 
                }
                else {
                    res.status(404).send({success: true, message: 'No info found'});
                }
            });
    }
})



// GET all users
//==============================================

.get('/users', function(req, res) {
    User.find({}, '-password', function(err, users) {
        if(err) {
            console.log('Error when trying to get all users');
            res.status(500).send(err);
        }
        if(users) {
            users.forEach(function(user){
            if(user.isEmailVisible === false)
                user.mail = '';
            });
            res.status(200).json(users);
        }
        else {
            res.status(404).json({success: false, message: 'No users found'});
        }
    });
})


// GET user by ID
//==============================================

.get('/user/id/:id', function(req, res) {
    if(Controller.isObjectIDValid(req.params.id)) {
        var id = req.params.id;
        User.findOne({_id: id}, '-password', function(err, user) {
            if(err) {
                console.log('error when trying to get the user by id');
                res.status(500).send(err);
            }
            if(user) {
                if(user.isEmailVisible === false) {
                    user.mail = '';
                }
            }
            res.status(200).json(user);
        });
    }
    else {
        res.status(400).json({success: false, message: 'Bad request'});
    }
})


// GET user by name
//==============================================

.get('/user/name/:name', function(req, res) {
    if(Controller.isUsernameValid(req.params.name)) {
        var name = Controller.sanitizeString(req.params.name);

        User.findOne({username: name}, '-password', function(err, user) {
        if(err) {
            console.log('error when trying to get the user by name');
            res.status(500).send(err);
        }
        if(user) {
            if(user.isEmailVisible === false) {
                user.mail = '';
            }
        }
        res.status(200).json(user);
        });    
    }
    else {
        res.status(400).json({success: false, message: 'Bad request'});
    }    
})


// POST update user
//=============================================

.post('/user/update', function(req, res) {
    
    var checkPwd    = false;
    var checkEmail  = false;
    if(Controller.checkBoolean(req.body.isNewPwd) && Controller.isUserPasswordValid(req.decoded.password)) {
        checkPwd = true;
    }
    if( Controller.checkBoolean(req.body.isNewEmail) && Controller.isUserMailValid(req.decoded.mail)) {
        checkEmail = true;
    }
    
    if(checkPwd === false && checkEmail === false) {
        res.status(400).send({success: false, message: 'Bad request: nothing to change'});
    }
    else {
        var username            = Controller.sanitizeString(req.decoded.username);
        var newPassword         = req.body.newPassword;
        var newEmail            = Controller.sanitizeString(req.body.newEmail);
        var newIsEmailVisible   = Controller.checkBoolean(req.body.isEmailVisible);

        Promise.props({
            user: User.findOne({username: username}).execAsync()
        })
        .then(function(results) {
            if(results.user != null) {
                if(results.user.mail != null)
                    res.status(409).send({success: false, message: 'Email already exists'});
                else {
                    if(newIsEmailVisible != null)
                        results.user.isEmailVisible = newIsEmailVisible; 
                    if(checkEmail)
                        results.user.mail = newEmail;
                    if(checkPwd) {
                        bcrypt.hash(newPassword, saltRounds, function(err, hash) {
                            results.user.password = hash;
                            results.user.save(function(err, resp) {
                                if(err) {
                                    console.log('Error when trying to update the user: '+user.username);
                                    res.status(500).send(err);
                                }
                                res.status(200).send({success: true, message: 'Successfully updated'});
                            });  
                        });
                    }
                    else {
                        results.user.save(function(err, resp) {
                            if(err) {
                                console.log('Error when trying to update the user: '+user.username);
                                res.status(500).send(err);
                            }
                            res.status(200).send({success: true, message: 'Successfully updated'});
                        });
                    }
                }

            }
            else 
                res.status(404).send({success: false, message: 'User doesn\'t exist'});
        });  
    }
})


// DELETE user
//=============================================

.delete('/user/delete/', function(req, res) {
    if(! (Controller.isObjectIDValid(req.decoded.userID)) ) {
        res.status(400).send({success: false, message: 'Invalid ID'});
    }
    else {

        var userID = req.decoded.userID;
        User.findOneAndRemove({_id: userID}, function(err, user) {
            if(err) {
                console.log('Error when deleting user');
                res.status(500).send(err);
            }
            if(user){
                res.status(200).send({success: true, message: 'User Deleted'});
            }
            else {
                res.status(404).send({success: false, message: 'User not found'});
            }
        });
    }
})


// ERRORS
//=============================================   
.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Error 404 : Request not found');
});