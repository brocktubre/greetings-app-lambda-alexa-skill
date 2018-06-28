/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
const request = require('request-promise');
const https = require('https');
const Speech = require('ssml-builder');
const dynamodb = new AWS.DynamoDB.DocumentClient();


const SKILL_NAME = 'Greetings App';
const GET_GREETING_MESSAGE = 'Good day. ';
const HELP_MESSAGE = 'You can say greet me, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

const JOKE_URL = 'https://08ad1pao69.execute-api.us-east-1.amazonaws.com/dev/random_joke';
const RANDOM_FACT_URL = 'http://randomuselessfact.appspot.com/random.json?language=en';

const GetNewGreetingHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'GetNewGreetingIntent');
  },
  handle(handlerInput) {
  
    return getGreetingConfigFromDynamo(handlerInput)
      .then(function(todaysGreeting){
        return todaysGreeting;
    });
  }
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .getResponse();
  },
};

const WeatherOnThisDayHandler = {
  canHandle(handlerInput) {
       const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest';
  },
  handle(handlerInput, error) {

    return handlerInput.responseBuilder
      .speak('Here is the weather.')
      .getResponse();
  },
};

const ComplimentHandler = {
  canHandle(handlerInput) {
       const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest';
  },
  handle(handlerInput, error) {

    return handlerInput.responseBuilder
      .speak('Here is a compliment.')
      .getResponse();
  },
};

const TodaysNewsHandler = {
  canHandle(handlerInput) {
       const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest';
  },
  handle(handlerInput, error) {

    return handlerInput.responseBuilder
      .speak('Here is todays news.')
      .getResponse();
  },
};

const RandomFactHandler = {
  canHandle(handlerInput) {
       const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest';
  },
  handle(handlerInput, error) {

    const url = RANDOM_FACT_URL;
    const randomFactRequest = request(url, { json: true });

    return randomFactRequest.then((body) => {
      return handlerInput.responseBuilder
          .speak(body.text)
          .getResponse();
    }); 
  },
};


const TellAJokeHandler = {
  canHandle(handlerInput) {
       const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest';
  },
  handle(handlerInput, error) {
    // Hit the joke API and build out the response
    const url = JOKE_URL;
    const jokeRequest = request(url, { json: true });

    return jokeRequest.then((body) => {
      const speech = new Speech();
      speech.say(body.setup).pause('200ms').say(body.punchline);  
      const speechOutput = speech.ssml(true);  
      return handlerInput.responseBuilder
          .speak(speechOutput)
          .getResponse();
    }); 
  },
};
  
function getResponseHelperFromDynamo(configItem){
  const params = {
    TableName: 'greetings-config-response-types',
    ExpressionAttributeValues: {
      ':r': configItem.response_type
    },
    FilterExpression: 'response_name = :r'
  };
  
  return dynamodb.scan(params).promise();
}
function getGreetingConfigFromDynamo(handlerInput){
    const d = new Date();
    d.setHours(d.getHours() - 5);
    const todaysDateId = d.getDay();

    const params = {
      TableName: 'greetings-config',
      ExpressionAttributeValues: {
        ':d': todaysDateId
       },
       FilterExpression: 'greetings_config_id = :d'
    };

    const getGreetingConfig =  dynamodb.scan(params).promise();
    
    let helperResponse;
    let configItem;

    return getGreetingConfig
      .then(function(data){
        configItem = data.Items[0];

        const getResponseHelper = getResponseHelperFromDynamo(configItem)
        
        return getResponseHelper
          .then(function(helperResponseData){
            helperResponse = helperResponseData.Items[0].response_helper;
          })
          .then(function() {
              return getFullResponse(
                configItem, 
                helperResponse,
                handlerInput,
              );
            
            });
    });
}
function getFullResponse(configItem, helperResponse, handlerInput){

    let todaysGreeting;
    // let isJoke = false;
    if(configItem.enabled){
      // todaysGreeting = 'Today\'s greeting is ' + helperResponse + ' ' +  configItem.response_type.toLowerCase() + '.';
      if(configItem.response_type === 'WEATHER'){
       return WeatherOnThisDayHandler.handle(handlerInput);
      }
      
      if(configItem.response_type === 'JOKE'){
        return TellAJokeHandler.handle(handlerInput);
      }
      
      if(configItem.response_type === 'RANDOM FACT'){
        return RandomFactHandler.handle(handlerInput);
      }
      
      if(configItem.response_type === 'COMPLIMENT'){
        return ComplimentHandler.handle(handlerInput);
      }
      
      if(configItem.response_type === 'NEWS'){
        return TodaysNewsHandler.handle(handlerInput);
      }
    } else {
      todaysGreeting = 'Today\'s greeting is disabled.';
    }
    
    let speechOutput = GET_GREETING_MESSAGE + todaysGreeting;
    let response = handlerInput.responseBuilder
                    .speak(speechOutput)
                    .withSimpleCard(SKILL_NAME, todaysGreeting)
                    .getResponse();
    return response;
   
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetNewGreetingHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    WeatherOnThisDayHandler,
    TellAJokeHandler,
    TodaysNewsHandler,
    ComplimentHandler,
    RandomFactHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
