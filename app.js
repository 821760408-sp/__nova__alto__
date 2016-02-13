var slack = require('slack-client')
  , RtmClient = slack.RtmClient
  , token = process.env.SLACK_API_TOKEN || ''
  , rtmClient = new RtmClient(token, {logLevel: 'debug'});

// Creating an RTM client
rtmClient.start();

// Listen to messages
//var RTM_EVENTS = slack.RTM_EVENTS;
rtmClient.on('message', function (message) {
  // Listens to all `message` events from the team
  
});

// Send messages
//var RTM_CLIENT_EVENTS = slack.CLIENT_EVENTS.RTM;
// you need to wait for the client to fully connect before you can send messages
rtmClient.on(/*RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED*/'open', function () {
  // This will send the message 'this is a test message' to the channel identified by id 'C0CHZA86Q'
  rtmCliet.sendMessage('this is a test message', 'C0CHZA86Q', function messageSent() {
    // optionally, you can supply a callback to execute once the message has been sent
  });
});

