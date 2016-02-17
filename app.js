const Slack = require('slack')
  , AlchemyAPI = require('alchemy-api')
  , Twitter = require('twitter');


const slackBot = Slack.rtm.client()
  , slackToken = process.env.SLACK_API_TOKEN || 'xoxb-21292921187-puOUJtLQSmkL5LvsbVLUj2UN'


const alchemyToken = process.env.ALCHEMY_API_KEY || '9b0b3fb49a492c6116b2999d64daee563ed6ab71'
  , alchemy = new AlchemyAPI(alchemyToken)


const twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY || 'lkCUu5dq2uMAFrzDql9rVsWxk'
  , twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET || 'baVRC73aVOZqwmjV8Y4nDZJbfOvP0Yf29FXqjz3aDCQiWuWuSN'
  , twitterAccessTokenKey = process.env.TWITTER_ACCESS_TOKEN_KEY || '4922576115-eWRZ2LK4VMWoVJtGMMDktCLf1rKutypjeeTI0wI'
  , twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || 'jSiicCpLtkD3mh1eZAKC19FyWxMw8ZguwI5Nj3pQK1HzB'
  , twitterClient = new Twitter({
  consumer_key: twitterConsumerKey,
  consumer_secret: twitterConsumerSecret,
  access_token_key: twitterAccessTokenKey,
  access_token_secret: twitterAccessTokenSecret})


var _slackChannels = {}
  , _slackUsers = {}
  , _slackEmojis = {}


//var _alchemyOutput = {}
  //, _tweet = {}
  //, _protoTweetQueue = []


// console.log(Object.keys(slackBot))


slackBot.listen({token: slackToken})


function cacheInfo () {
  Slack.channels.list({token: slackToken}, function (err, data) { _slackChannels = data} )
  Slack.users.list({token: slackToken}, function (err, data) { _slackUsers = data })
  Slack.emoji.list({token: slackToken}, function (err, data) { _slackEmojis = data })
}


slackBot.started(function (payload) {
  cacheInfo();
})


slackBot.user_typing(function (msg) {
  //console.log('several people are coding', msg)
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
    var alchemyOutput = {}
    //console.log('first we log _alchemyOutput: ', _alchemyOutput)
    console.log('stress found in:\n', msg)
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
    if (err) throw err
    // See http://www.alchemyapi.com/api/entity-extraction for format of returned object
    alchemyOutput.entities = response.entities
    //console.log(' entities length: ', alchemyOutput.entities.length)
    // entities is an array, so test array emptiness
    if (alchemyOutput.entities.length > 0) {
      //console.log('entities: ', alchemyOutput.entities)
    }
    // put chain entry points inside callback to force success when reaching the end
    docSentiment(msgTxt, alchemyOutput)
  })
}


function docSentiment (msgTxt, alchemyOutput) {
  // Sentiment Analysis
  alchemy.sentiment(msgTxt, {}, function (err, response) {
    if (err) throw err
    /*
     { mixed: '1', score: '-0.267269', type: 'negative' }
     */
    alchemyOutput.docSentiment = response.docSentiment
    //console.log('docSentiment: ', alchemyOutput.docSentiment)
    concepts(msgTxt, alchemyOutput)
  })
}


function concepts (msgTxt, alchemyOutput) {
  // Concept Tagging, used as end-of-sentence hashtags?
  alchemy.concepts(msgTxt, {}, function (err, response) {
    if (err) throw err
    alchemyOutput.concepts = response.concepts
    //console.log(' concept length: ', alchemyOutput.concepts.length)
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
    if (alchemyOutput.concepts.length > 0) {
      //console.log('concepts: ', alchemyOutput.concepts)
    }
    keywords(msgTxt, alchemyOutput)
  })
}


function keywords (msgTxt, alchemyOutput) {
  // Keyword / Terminology Extraction, used as mid-sentence hashtag?
  alchemy.keywords(msgTxt, {}, function (err, response) {
    if (err) throw err
    alchemyOutput.keywords = response.keywords
    //alchemyOutput.targeted_sentiments = []
    /*
     [ { relevance: '0.968724', text: 'profound question' },
     { relevance: '0.582477', text: 'time' } ]
     */
    //console.log(' keywords length: ', alchemyOutput.keywords.length)
    //console.log('keywords: ', alchemyOutput.keywords)
    //console.log(' targeted_sentiments length: ', _alchemyOutput.targeted_sentiments.length)
    //if (_alchemyOutput.keywords.length > 0) {
    //  // Targeted Sentiment Analysis
    //  for (var i = 0, len = _alchemyOutput.keywords.length; i < len; ++i) {
    //    var keyword = _alchemyOutput.keywords[i]
    //    console.log('a keyword: ', keyword)
    //    /*
    //     { status: 'OK',
    //     usage: 'By accessing AlchemyAPI or using information generated by AlchemyAPI, you are agreeing to be bound by the AlchemyAPI Terms of Use: http://www.alchemyapi.com/company/terms.html',
    //     totalTransactions: '1',
    //     language: 'english',
    //     docSentiment: { type: 'neutral' } }
    //     */
    //    alchemy.sentiment_targeted(msgTxt, keyword.text, {}, function (err, response) {
    //      if (err) throw err
    //      var sentiment = response
    //      _alchemyOutput.targeted_sentiments.push(sentiment)
    //      console.log('a targeted sentiment: ', sentiment)
    //    })
    //  }
    //}
    taxonomies(msgTxt, alchemyOutput)
  })
}


function taxonomies (msgTxt, alchemyOutput) {
  // Taxonomy
  alchemy.taxonomies(msgTxt, {}, function (err, response) {
    if (err) throw err
    alchemyOutput.taxonomy = response.taxonomy
    //console.log(' taxonomy length: ', alchemyOutput.taxonomies.length)
    /*
     [ { label: '/art and entertainment/theatre', score: '0.681304' },
     { label: '/food and drink/barbecues and grilling',
     score: '0.45756' },
     { confident: 'no',
     label: '/art and entertainment/shows and events/concert',
     score: '0.383687' } ]
     */
    if (alchemyOutput.taxonomy.length > 0) {
      //console.log('taxonomy: ', alchemyOutput.taxonomies)
    }
    category(msgTxt, alchemyOutput)
  })
}


function category (msgTxt, alchemyOutput) {
  // Topic Categorization, used as retweet search term?
  alchemy.category(msgTxt, {}, function(err, response) {
    if (err) throw err
    alchemyOutput.category = response.category
    if (alchemyOutput.category) {
      //console.log('category: ', alchemyOutput.category)
    }
    // put chain entry points inside callback to force success when reaching the end
    console.log('we log _alchemyOutput again before we move on to Twitter:\n', alchemyOutput)
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
  //console.log(' entities length: ', entities.length)
  // ------ make sure we have something to search with
  if (entities.length > 0) {
    ///////////magic TODO: use async
    function atUsers (i) {
      if (i == entities.length) {
        appendHashtags(msgTxt, alchemyOutput)
      } else {
        var entityName = entities[i].text
        twitterClient.get('users/search', {q: entityName, page: 1, count: 1}, function (error, tweets, response) {
          if (error) throw error
          // console.log(tweets)
          if (tweets[0]) {
            var screen_name = tweets[0].screen_name
            var pos = msgTxt.indexOf(entityName)
            msgTxt = [msgTxt.slice(0, pos), '@' + screen_name, msgTxt.slice(pos + entityName.length)].join('')
            console.log(msgTxt)
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
      console.log(msgTxt)
    }
  }
  insertHashtags(msgTxt, alchemyOutput)
}


function insertHashtags (msgTxt, alchemyOutput) {
  var keywords = alchemyOutput.keywords
  if (keywords.length > 0) {
    for (var i = 0, len = keywords.length; i < len; ++i) {
      var keyword = keywords[i].text
      //console.log(keyword)
      var pos = msgTxt.indexOf(keyword)
      //console.log(pos)
      var tmp = ~keyword.indexOf(' ') ? helpMakeHashtag(keyword) : keyword
      msgTxt = [msgTxt.slice(0, pos), '#' + tmp, msgTxt.slice(pos + keyword.length)].join('')
      //console.log(msgTxt)
    }
  }
  console.log(msgTxt)
  retweet(msgTxt, alchemyOutput)
}


function retweet (msgTxt, alchemyOutput) {
  var taxonomy = alchemyOutput.taxonomy
  if (taxonomy.length > 0) {
    var label = taxonomy[0].label
    twitterClient.get('search/tweets', {q: label, count: 1, }, function (err, tweets, response) {
      if (error) throw error
      console.log(tweets)
      var tweetID = tweets.statuses[0].id
      twitterClient.post('statuses/retweet/'+tweetID, function(error, tweet, response) {
      })
    })
  }
}