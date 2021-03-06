'use-strict';

// IMPORTS
const express = require('express');
const request = require('request');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const sparql = require('sparql');
const util = require('util');
const fs = require('fs');
const soap = require('soap');
var SparqlParser = require('sparqljs').Parser;
var parser = new SparqlParser();

//const jwt = require('jsonwebtoken');
const config = require('./config');
const jsonParser = bodyParser.json()


// var parsedQuery = parser.parse(
//     'PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>' +
//     'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
//     'SELECT DISTINCT ?iri ?description ?name {' +
//     '?iri a dbpedia-owl:Company ;' +
//     'dbpedia-owl:abstract ?description ;' +
//     'rdfs:label ?lbl ;' +
//     'foaf:name ?name .' +
//     '?name bif:contains "\'Amgen Inc\'"@en' +
//     //'?lbl bif:contains "'Amgen'"@en  .'
//     'FILTER( langMatches(lang(?description),"en") )' +
//     '}'
//);

// var qString = 'http://dbpedia.org/sparql?query=' + encodeURIComponent([
//     'PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>',
//     'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
//     'SELECT DISTINCT ?iri ?description ?name {',
//     '?iri a dbpedia-owl:Company ;',
//     'dbpedia-owl:abstract ?description ;',
//     'rdfs:label ?lbl ;' +
//     'foaf:name ?name .' +
//     '?name bif:contains "\'Amgen Inc\'"@en',
//     //'?lbl bif:contains "'Amgen'"@en  .'
//     'FILTER( langMatches(lang(?description),"en") )',
//     '}'
// ].join(' ')) + '&format=json';

// request.get(qString, (error, response, body) => {
//     console.log(JSON.stringify(JSON.parse(body).results.bindings, null, 2));
// });

// PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
// PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>        

// SELECT DISTINCT ?iri ?description {
//   ?iri a dbpedia-owl:Company ;
//        dbpedia-owl:abstract ?description ;
//        rdfs:label ?lbl .
//   ?lbl bif:contains "'Amgen'"@en  .
//   FILTER( langMatches(lang(?description),"en") )
// }



// CONSTANTS
const stockBroker = express();
const APIKEY = "EN5TVUAQ24R3A67K";
const ALPHAVANTAGE = 'https://www.alphavantage.co'
const TRADINGBLOCK = 'http://localhost:8081'

const STOCKCODES = fs.readFileSync('../data/S&P500.csv', 'utf-8').split('\n')
    .map((line) => {
        let parts = line.split(',');
        return {
            'code': parts[0],
            'company': parts[1],
            'sector': parts[2]
        }
    }).slice(1);


stockBroker.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Accept', 'application/json');
    next();
});
stockBroker.use(bodyParser.urlencoded({
    extended: true
}));
stockBroker.use(jsonParser);
stockBroker.get('/', (req, res) => {
    res.send('Hello World');
});

stockBroker.get('/companydetails/:stockID', (req, res) => {
    var stockID = req.param.stockID;
    console.log(stockID);
});

stockBroker.post('/tradingblock/trades', (req, res) => {
    console.log('Trade Request for buying stock up for trade');
    var url = TRADINGBLOCK + '/trades/buy_order'
    var body = req.body;
    let resBody = {
        companyName: body.companyName,
        stockID: body.stockID,
        currency: body.currency,
        value: body.price,
        amountAvailable: body.amountAvailable,
        owner: body.owner
    }

    var results = {};
    let headers = {
        'Content-Length': Buffer.byteLength(JSON.stringify(resBody)),
        'Content-Type': 'application/json'
    }
    console.log(resBody);
    request.post({ url, body: JSON.stringify(resBody), headers: headers }, (error, response, body) => {
        if (error) {
            console.log('ERROR: ' + error);
            results.err = error;
        }
        if (response && response.statusCode) {
            console.log(response.statusCode);
            console.log(response.headers['content-type']);
            results.data = body;
            console.log(util.inspect(results));
        }
        res.send(JSON.stringify(results, null, 2));
    });
});

stockBroker.post('/tradingblock/trades/:stockID', (req, res) => {
    console.log('Trade Request for issuing a new trade request.')
    var stockID = req.params.stockID;
    var url = TRADINGBLOCK + '/trades/';
    var body = req.body;
    let resBody = {
        companyName: '',
        stockID: body.stockID,
        currency: body.currency,
        value: body.price,
        amountAvailable: body.amount,
        owner: 'Stock Broker'
    }
    var results = {};

    let match = STOCKCODES.filter((code => code.code == body.stockID));
    console.log(match);

    if (match.length != 1) {
        results.err = 'Stock Code Not Found.'
        res.send(JSON.stringify(results, null, 2));
        return;
    }
    if (!/^[a-zA-Z]+$/.test(body.currency)) {
        results.err = 'Currency Invalid';
        res.send(JSON.stringify(results, null, 2));
        return;
    }
    resBody.companyName = match[0].company;
    console.log(resBody);

    let headers = {
        'Content-Length': Buffer.byteLength(JSON.stringify(resBody)),
        'Content-Type': 'application/json'
    }

    request.post({ url, body: JSON.stringify(resBody), headers: headers }, (error, response, body) => {
        if (error) {
            console.log('ERROR: ' + error);
            results.err = error;
        }
        if (response && response.statusCode) {
            console.log(response.statusCode);
            console.log(response.headers['content-type']);
            results.data = body;
            console.log(util.inspect(results));
        }
        res.send(JSON.stringify(results, null, 2));
    });
});

stockBroker.get('/tradingblock/trades/:stockID?', (req, res) => {
    var stockID = req.params.stockID;
    var url = TRADINGBLOCK + '/trades';
    var results = {}

    if (stockID) {
        url += '/' + stockID
    }

    console.log(stockID + ' trades requested');
    console.log('URL: ' + url);

    request(url, (error, response, body) => {
        if (error) {
            console.log(error);
            results.err = error;
        }
        if (response && response.statusCode) {
            console.log(response.statusCode);
            console.log(response.headers['content-type']);
            results.data = JSON.parse(body);
        }
        res.send(JSON.stringify(results, null, 2));
    });
});

stockBroker.get('/stockbroker/stockdata/:granularity/:stockID', (req, res) => {
    var stockID = req.params.stockID;
    var granularity = req.params.granularity;
    var url = ALPHAVANTAGE + '/query?function=' + granularity + '&symbol=' + stockID + '&apikey=' + APIKEY + '&datatype=json';

    console.log('Request for Stock data: ' + stockID)

    var results = {
        'stockID': stockID,
        'granularity': granularity,
        'url': url,
        'data': [],
        'err': ''
    }

    request(url, (error, response, body) => {
        console.log('Alpha Vantage Queried for stock data: ' + stockID)
        if (error) {
            console.log('Error Querying Alpha Vantage: ' + stockID)
            results.err = error;
        }
        if (response && response.statusCode) {
            console.log('Processing Response from Alpha Vantage: ' + stockID)
            results.data = JSON.parse(body);
        }
        console.log('Length of Parsed result data: ' + results.data.length);
        res.send(JSON.stringify(results, null, 2));
    });

});

stockBroker.get('/semantic/:companyName', (req, res) => {
    var companyName = req.params.companyName;
    console.log('Information Request for: ' + companyName);

    var qString = 'http://dbpedia.org/sparql?query=' + encodeURIComponent([
        'PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>',
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
        'SELECT DISTINCT ?iri ?description ?name {',
        '?iri a dbpedia-owl:Company ;',
        'dbpedia-owl:abstract ?description ;',
        'rdfs:label ?lbl ;' +
        'foaf:name ?name .' +
        '?name bif:contains "\'' + companyName + '\'"@en',
        //'?lbl bif:contains "'Amgen'"@en  .'
        'FILTER( langMatches(lang(?description),"en") )',
        '}'
    ].join(' ')) + '&format=json';

    request.get(qString, (error, response, body) => {
        console.log('Query Issued for: ' + companyName);
        let results = {};
        try {
            results = JSON.parse(body).results.bindings;
        }
        catch(err) {
            results = {'err': 'Error Parsing Semantic Results'};
        }

        console.log('Query Results parsed for: ' + companyName)
        if (results.length == 0 && companyName == '') {
            console.log('Problem occured for: ' + companyName)
            res.send(error);
        }
        console.log('Sending Query Results to client: ' + companyName)
        res.send(JSON.stringify(results, null, 2));

    });
});

stockBroker.get('/currencyconverter/:from/:to/:amount', (req, res) => {
    var from = req.params.from;
    var to = req.params.to;
    var amount = req.params.amount;
    console.log('Currency Conversion');

    var wsdl = 'http://localhost:8082/CurrencyConverter?wsdl';
    var args = { from: from, to: to, amount: amount };

    let results = {};

    soap.createClient(wsdl, function(err, client) {
        //var description = client.describe();
        //console.log(util.inspect(description));
        console.log('Soap Client created.');
        client.convertCurrency(args, function(err, result) {
            console.log(result);
            if (result.return < 0) {
                results.err = 'Unable to covert between currencies.'
            } else {
                results = {
                    original: {
                        currency: from,
                        amount: amount
                    },
                    converted: {
                        currency: to,
                        amount: result.return
                    }
                }
            }
            res.send(JSON.stringify(results, null, 2))
        });
    });
})

stockBroker.get('/stockbroker/stockcodes/:stockID?', (req, res) => {
    console.log('Request for possible Stock Codes')
    var stockID = req.params.stockID;
    if (!stockID) {
        stockID = '';
    }
    console.log(STOCKCODES[0]);
    matches = STOCKCODES.filter((deets) => deets.code.toLowerCase().startsWith(stockID.toLowerCase()));
    res.send(JSON.stringify(matches, null, 2));
});

stockBroker.listen(8080);
console.log('Running on: localhost:8080');
