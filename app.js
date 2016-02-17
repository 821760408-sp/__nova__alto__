const Slack = require('slack')
  , AlchemyAPI = require('alchemy-api')
  , Twitter = require('twitter');


const slackBot = Slack.rtm.client()
  , slackToken = process.env.SLACK_API_TOKEN || ''


const alchemyToken = process.env.ALCHEMY_API_KEY || ''
  , alchemy = new AlchemyAPI(alchemyToken)


const twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY || ''
  , twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET || ''
  , twitterAccessTokenKey = process.env.TWITTER_ACCESS_TOKEN_KEY || ''
  , twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
  , twitterClient = new Twitter({
  consumer_key: twitterConsumerKey,
  consumer_secret: twitterConsumerSecret,
  access_token_key: twitterAccessTokenKey,
  access_token_secret: twitterAccessTokenSecret})


var _slackChannels = {}
  , _slackUsers = {}
  , _slackEmojis = {}


slackBot.listen({token: slackToken})


function cacheInfo () {
  Slack.channels.list({token: slackToken}, function (err, data) { _slackChannels = data} )
  Slack.users.list({token: slackToken}, function (err, data) { _slackUsers = data })
  Slack.emoji.list({token: slackToken}, function (err, data) { _slackEmojis = data })
}


slackBot.started(function (payload) {
  cacheInfo();
})


/**
{ type: 'message',
  channel: 'D0M8J3MA8',
  user: 'U0LCZJ7J5',
  text: 'dda',
  ts: '1455606158.000056',
  team: 'T0LCXAQ3V' }
  */
slackBot.message(function (msg) {
  // ignore messages from bots (self or other) to prevent looping
  if (msg.subtype == 'bot_message') return
  var msgTxt = msg.text
  // if there's mid-sentence question/exclamation mark
  // stackoverflow.com/questions/1789945/how-can-i-check-if-one-string-contains-another-substring
  if (~msgTxt.indexOf('?') || ~msgTxt.indexOf('!')) {
  	console.log('message intercepted:\n', msgTxt)
    var alchemyOutput = {}
    startAlchemyTwitterChain(msgTxt, alchemyOutput)
  }
})


/**
 * AlchemyAPI
 */
function startAlchemyTwitterChain (msgTxt, alchemyOutput) {
  entities(msgTxt, alchemyOutput)
}


function entities (msgTxt, alchemyOutput) {
  // Named Entity Extraction
  alchemy.entities(msgTxt, {}, function (err, response) {
    if (err) console.log(err)
    // See http://www.alchemyapi.com/api/entity-extraction for format of returned object
    alchemyOutput.entities = response.entities
    // put chain entry points inside callback to force success when reaching the end
    docSentiment(msgTxt, alchemyOutput)
  })
}


function docSentiment (msgTxt, alchemyOutput) {
  // Sentiment Analysis
  alchemy.sentiment(msgTxt, {}, function (err, response) {
    if (err) console.log(err)
    /*
     { mixed: '1', score: '-0.267269', type: 'negative' }
     */
    alchemyOutput.docSentiment = response.docSentiment
    concepts(msgTxt, alchemyOutput)
  })
}


function concepts (msgTxt, alchemyOutput) {
  // Concept Tagging, used as end-of-sentence hashtags?
  alchemy.concepts(msgTxt, {}, function (err, response) {
    if (err) console.log(err)
    alchemyOutput.concepts = response.concepts
    /*
     [ { text: 'New York City',
     relevance: '0.86617',
     geo: '40.71666666666667 -74.0',
     website: 'http://www.nyc.gov/',
     dbpedia: 'http://dbpedia.org/resource/New_York_City',
     freebase: 'http://rdf.freebase.com/ns/m.02_286',
     yago: 'http://yago-knowledge.org/resource/New_York_City',
     geonames: 'http://sws.geonames.org/5128581/' },
     { text: 'Passenger vehicles in the United States',
     relevance: '0.855362',
     dbpedia: 'http://dbpedia.org/resource/Passenger_vehicles_in_the_United_States',
     yago: 'http://yago-knowledge.org/resource/Passenger_vehicles_in_the_United_States' } ]
     */
    keywords(msgTxt, alchemyOutput)
  })
}


function keywords (msgTxt, alchemyOutput) {
  // Keyword / Terminology Extraction, used as mid-sentence hashtag?
  alchemy.keywords(msgTxt, {}, function (err, response) {
    if (err) console.log(err)
    alchemyOutput.keywords = response.keywords
    //alchemyOutput.targeted_sentiments = []
    /*
     [ { relevance: '0.968724', text: 'profound question' },
     { relevance: '0.582477', text: 'time' } ]
     */
    //if (_alchemyOutput.keywords.length > 0) {
    //  // Targeted Sentiment Analysis
    //  for (var i = 0, len = _alchemyOutput.keywords.length; i < len; ++i) {
    //    var keyword = _alchemyOutput.keywords[i]
    //    /*
    //     { status: 'OK',
    //     usage: 'By accessing AlchemyAPI or using information generated by AlchemyAPI, you are agreeing to be bound by the AlchemyAPI Terms of Use: http://www.alchemyapi.com/company/terms.html',
    //     totalTransactions: '1',
    //     language: 'english',
    //     docSentiment: { type: 'neutral' } }
    //     */
    //    alchemy.sentiment_targeted(msgTxt, keyword.text, {}, function (err, response) {
    //      if (err) console.log(err)
    //      var sentiment = response
    //      _alchemyOutput.targeted_sentiments.push(sentiment)
    //    })
    //  }
    //}
    taxonomies(msgTxt, alchemyOutput)
  })
}


function taxonomies (msgTxt, alchemyOutput) {
  // Taxonomy
  alchemy.taxonomies(msgTxt, {}, function (err, response) {
    if (err) console.log(err)
    alchemyOutput.taxonomy = response.taxonomy
    /*
     [ { label: '/art and entertainment/theatre', score: '0.681304' },
     { label: '/food and drink/barbecues and grilling',
     score: '0.45756' },
     { confident: 'no',
     label: '/art and entertainment/shows and events/concert',
     score: '0.383687' } ]
     */
    category(msgTxt, alchemyOutput)
  })
}


function category (msgTxt, alchemyOutput) {
  // Topic Categorization, used as retweet search term?
  alchemy.category(msgTxt, {}, function(err, response) {
    if (err) console.log(err)
    alchemyOutput.category = response.category
    // put chain entry points inside callback to force success when reaching the end
    startTwitterPreprocessing(msgTxt, alchemyOutput)
  })
}


/**
 * start twitter preprocessing
 */
function startTwitterPreprocessing (msgTxt, alchemyOutput) {
  // use entities to search for users
  /**
   * [ { type: 'Country',
    relevance: '0.33',
    count: '1',
    text: 'US',
    disambiguated:
     { subType: [Object],
       name: 'United States',
       website: 'http://www.usa.gov/',
       dbpedia: 'http://dbpedia.org/resource/United_States',
       freebase: 'http://rdf.freebase.com/ns/m.09c7w0',
       ciaFactbook: 'http://www4.wiwiss.fu-berlin.de/factbook/resource/United_States',
       opencyc: 'http://sw.opencyc.org/concept/Mx4rvVikKpwpEbGdrcN5Y29ycA',
       yago: 'http://yago-knowledge.org/resource/United_States' } } ]
   */
  var entities = alchemyOutput.entities
  // ------ make sure we have something to search with
  if (entities.length > 0) {
    ///////////magic TODO: use async
    function atUsers (i) {
      if (i == entities.length) {
        appendHashtags(msgTxt, alchemyOutput)
      } else {
        var entityName = entities[i].text
        twitterClient.get('users/search', {q: entityName, page: 1, count: 1}, function (error, tweets, response) {
          if (error) console.log(error)
          if (tweets[0]) {
            var screen_name = tweets[0].screen_name
            var pos = msgTxt.indexOf(entityName)
            msgTxt = [msgTxt.slice(0, pos), '@' + screen_name, msgTxt.slice(pos + entityName.length)].join('')
          }
          // next level
          atUsers(i + 1)
        })
      }
    }
    atUsers(0)
  } else {
    appendHashtags(msgTxt, alchemyOutput)
  }
}


function helpMakeHashtag (str) {
  var strArr = str.split(' ')
  for (var i = 0, len = strArr.length; i < len; ++i) {
    strArr[i] = strArr[i].slice(1) ? strArr[i].charAt(0).toUpperCase() + strArr[i].slice(1) : strArr[i].charAt(0).toUpperCase()
  }
  return str = strArr.join('')
}


function appendHashtags (msgTxt, alchemyOutput) {
  var concepts = alchemyOutput.concepts
  if (concepts.length > 0) {
    for (var i = 0, len = concepts.length; i < len; ++i) {
      var hashtag = concepts[i].text
      msgTxt += ' #' + helpMakeHashtag(hashtag)
    }
  }
  insertHashtags(msgTxt, alchemyOutput)
}


function insertHashtags (msgTxt, alchemyOutput) {
  var keywords = alchemyOutput.keywords
  if (keywords.length > 0) {
    for (var i = 0, len = keywords.length; i < len; ++i) {
      var keyword = keywords[i].text
      var pos = msgTxt.indexOf(keyword)
      var tmp = ~keyword.indexOf(' ') ? helpMakeHashtag(keyword) : keyword
      msgTxt = [msgTxt.slice(0, pos), '#' + tmp, msgTxt.slice(pos + keyword.length)].join('')
    }
  }
  retweet(msgTxt, alchemyOutput)
}


function retweet (msgTxt, alchemyOutput) {
  var taxonomy = alchemyOutput.taxonomy
  if (taxonomy.length > 0) {
    // 'label' seperated by '/'
    var label = taxonomy[0].label.split('/')[1]
    // search for tweets based on the first label returned by AlchemyAPI
    // retrieve the first tweet from the returned results
    twitterClient.get('search/tweets', {q: label, count: 1, }, function (error, tweets, response) {
      if (error) console.log(error)
      // it is 'id_str', instead of 'id', the field we want
      if (tweets.statuses[0]) {
        var tweetID = tweets.statuses[0].id_str
        // get an 'oembed' link to the tweet
        twitterClient.get('statuses/oembed', {id: tweetID}, function (error, tweets, response) {
          var link = tweets.url
          // use msgTxt and this link to post a new tweet
          msgTxt += ' ' + link
          if (msgTxt.length >= 140) {msgTxt = msgTxt.substring(0, 140)}
          console.log('message--before being tweeted: ', msgTxt)
          twitterClient.post('statuses/update', {status: msgTxt}, function(error, tweet, response){
            if (error) console.log(error)
          })
        })
      } else {
        if (msgTxt.length >= 140) {msgTxt = msgTxt.substring(0, 140)}
    	console.log('message--before being tweeted: ', msgTxt)
        twitterClient.post('statuses/update', {status: msgTxt}, function(error, tweet, response){
          if (error) console.log(error)
        })
      }
    })
  } else {
    if (msgTxt.length >= 140) {msgTxt = msgTxt.substring(0, 140)}
    console.log('message--before being tweeted: ', msgTxt)
    twitterClient.post('statuses/update', {status: msgTxt}, function(error, tweet, response){
      //if (error) console.log(error)
      if (error) console.log(error)
    })
  }
}


const http = require("http")
const PORT = process.env.PORT || 3000


function handleRequest (request, response) {
  response.end('Zzžźż')
}


const server = http.createServer(handleRequest)
server.listen(PORT, function(){
  console.log('Server listening on: http://localhost:%s', PORT)
})


// prevent Heroku app from sleeping
// every 5 minutes (300000)
setInterval(function () {
  http.get("http://nova--alto.herokuapp.com")
}, 300000)
