
var FB = require('fb');

var {FB, FacebookApiException} = require('fb');


var express = require('express');
var router = express.Router()
var models = require('./models/models.js');
var request = require('request');
// IMPORTING ALL MODELS
var User = models.User;
var Token = models.Token;
var Message = models.Message;


// ROUTES:
router.get('/', function(req,res){
  res.redirect('/api/login');
})

// GET: LOGIN
router.get('/login', function(req,res){
  console.log();
})

// POST: LOGIN SCREEN-->
router.post('/login', function(req,res) {
  // store the passed in user input
  var token = req.body.token;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);
  console.log(token);
  FB.api('/me', { fields: ['id', 'first_name', 'last_name', 'friends', 'picture'] }, function (response) {
    if(!response || response.error) {
      console.log(!response ? 'error occurred' : response.error);
      res.json({failure: response.error});
    }else{
      var userId = response.id;
      var fname = response.first_name;
      var lname = response.last_name;
      var friendList = response.friends;
      var prof = response.picture;
      // create new user
      var newUser = new User({
        fname: fname,
        lname: lname,
        friends: friendList,
        prof: prof,
        userId: userId,
        flags: [],
        age: null,
        messages: []
      })
    // save the user on our DB with completed user data
      newUser.save(function(err, savedUser){
        if(err){
          res.json({failure: 'failed to save new user'})
        }else{
          res.json({success: true})
          // res.redirect('/api/registration')
          console.log('saved the new user!!')
        }
      })
    }
  });
})


// GET: REGISTRATION VIEW:
router.get('/registration', function(req,res) {
  res.send('The registration view!')
})
// POST: REGISTRATION VIEW
router.post('/registration', function(req,res) {
  var token = req.body.token;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);

  FB.api('/me', { fields: ['id'] }, function (response) {
    if(!response || response.error) {
      console.log(!response ? 'error occurred' : response.error);
      return;
    }else{
      var userResponses = req.body.flags;
      var DOB = req.body.DOB;
      // var age = Date.now() - DOB;
      var userId = response.id
      // create new user
      User.findOneAndUpdate({userId: userId},{age:DOB, flags:userResponses}, function(err, foundUser){
        if(err){
          res.json({failure: 'Could not find user'})
        }else{
          res.json({success: true})
          console.log(foundUser);
          console.log('saved the updated user with flags and DOB!!')
        }
      })
    }
  })
})

// GET: FEED VIEW
router.post('/feed', function(req,res) {
  var token = req.body.token;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);
  FB.api('/me', { fields: ['id','friends'] }, function (response) {
    if(!response || response.error) {
      console.log(!response ? 'error occurred' : response.error);
      return;
    }else{
      // Find the user based on the id
      // grab all the flags that are toggled on
      // search all users with those same flags and sort them according to same friends
      var userId = response.id
      var userFriends = response.friends
      User.findOne({userId: userId}, function(err, foundUser){
        if(err){
          res.json({failure: "Could not find users"})
        }else{
          // -----FILTER USERS BY MUTUAL FRIENDS/DISTANCE HERE----
          console.log('saved the FEEED!')
          res.json({success: true, response: foundUser.friends[0].data})
          console.log(foundUser);
        }
      })
    }
  })
})
// POST: FEED VIEW
router.get('/feed', function(req,res) {
    res.send('The FEED view!')
})

// GET: SETTINGS VIEW:
router.get('/settings', function(req,res) {
  res.send('The settings view!')
})


// MESSAGES VIEW: INBOX VIEW
router.post('/messages', function(req,res) {
  var token = req.body.token;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);
  FB.api('/me', { fields: ['id'] }, function (response) {
    if(!response || response.error) {
      console.log(!response ? 'error occurred' : response.error);
      return;
    }else{
      // Find the user based on the id
      var userId = response.id;
      console.log(userId);
        Message.find({to:userId}, function(err, messages){
        if(err){
          console.log(err);
          res.json({failure: "Could not find messages"})
        }else{
          console.log(messages);
          res.json({
            success: true,
            response: messages
          })
        }
      })
    }
  })
})

// GET --- MESSAGES VIEW:DIRECT MESSAGE VIEW
router.get('/messages/:user_id', function(req,res) {
  var token = req.body.token;
  var otherUser = req.params.user_id;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);
  FB.api('/me', { fields: ['id'] }, function (res) {
    if(!res || res.error) {
      console.log(!res ? 'error occurred' : res.error);
      return;
    }else{
      // Find the user based on the id
      var userId = res.id;
      User.findById({userId:userId}, function(err, foundUser){
        var myMessages = foundUser.messages;
        var messagesToRender = [];
        myMessages.forEach(function(message){
          if(message.to===otherUser || message.from===otherUser){
            messagesToRender.push(message);
          }
        })
        if(err){
          res.json({failure: "Could not find messages"})
        }else{
          res.json({success:true, response: messagesToRender})
        }
      })
    }
  })
})
// POST --- MESSAGES VIEW:DIRECT MESSAGE VIEW
router.post('/messages/:user_id', function(req,res) {
  var token = req.body.token;
  var otherUserId = req.params.user_id;
  var userId = res.id;

  var messageContent = req.body.content;
  var messageSender = req.body.from;
  var messageReceiver = req.body.to;

  // access facebook to get relevant info to create a new user
  FB.setAccessToken(token);

  FB.api('/me', { fields: ['id'] }, function (response) {
    if(!response || response.error) {
      console.log(!response ? 'error occurred' : response.error);
      return;
    }else{
      User.findById({userId:userId}, function(err, foundUser){
        if(err){
          res.json({failure: 'Could not find our user'})
        }else{

          var myMessages = foundUser.messages;
          var fromName = foundUser.fname;

          User.findById({userId:otherUserId}, function(err, otherUser){
            if(err){
              res.json({failure: 'Could not find the other user'})
            }else{
              var toName = otherUser.fname;

              var newMessage = new Message({
                from: messageSender,
                to: messageReceiver,
                content: messageContent,
                fromName: fromName,
                toName:toName
              });
              newMessage.save(function(err, savedMessage) {
                if(err){
                  res.json({failure: "Could not make new message"})
                }else{
                  myMessages.push(savedMessage);
                  foundUser.save(function(err, updatedUser){
                    if(err){
                      res.json({failure: 'Could not POST DM message'})
                    }else{
                      res.json({success: 'Saved POST DM message!', response: foundUser})
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  })
})
//
//



module.exports = router;
