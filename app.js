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
  //noinspection JSUnresolvedFunction
  //var channelGroupOrDM = slack.getChannelGroupOrDMByID(message.channel);
  //if (channelGroupOrDM.is_im) { // https://api.slack.com/types/im
  var text = message.text;
  var parsedText = text.split(' ');
  if (parsedText[0] === '<@U0M8LT35H>:') {
    rtmClient.sendMessage('test succeeded!', message.channel);
  }
});

