Some Node.JS Utilities
===

### benchmark.js:

Module that helps benchmarking individual (asynchrounus | synchrounus ) functions.

Usage:

    var bench = require( 'benchmark' );

    //function definition
    var myFunctionAsync = function( callback ) {
        setTimeout( function() { callback( null, 'async' ); }, parseInt( 1500 * Math.random(), 10 ) );
    };

    var myFunctionSync = function() {
        for(var i = 0; i < 100; i++ ) {}
        return 'sync';
    };

    //just plugin the benachmarking call featured by a name to reidentify
    myFunctionAsync = bench.benchmark( myFunctionAsync, 'myFunctionAsync' );
    myFunctionSync = bench.benchmark( myFunctionSync, 'myFunctionSync' );

    //invoke:
    myFunctionAsync( function() {
        console.log( 'async returned' );
    } );
    myFunctionSync();

    //benchmark is a event emitter, listen to 'drain' to get notfied when the last async function as finished
    bench.on( 'drain', function( result ) {
        console.log( result );
    } );

    //get the individual running times for every run:
    console.log( bench.results );// { 'myFunctionAsync': [100,200,200,...], 'myFunctionSync':[100,200,...] }

    //get the average running time for specific functions:
    console.log( bench.average( 'myFunctionAsync' ) );

Asynchronicity is inferred by the fact that a callback is always the last argument, according to node coding conventions.

### persisteneFileDB

Key/Value Storage that writes back to a given file and holds everything in storage.

    var filedb = require( 'node-utils/persistentFileDB' );
    var tmpdb = filedb.request( 'data.json' );

    tmpdb.on( 'error', function( error ) {
        console.log( 'error: ' + error );
    } );

    //read record by row id
    tmpdb.getRecord( 0, function( err, id ) {
        console.log( 'content 0: ' + id );
    } );

    //id=null indicates insert
    tmpdb.setRecord( { a:1 }, null, function( err, id ) {
        console.log( 'result of setRecord: ' + id );
    } );

    //submitting id indicates update
    //every value will be overwritten
    tmpdb.setRecord( { a:1 }, 2, function( err, id ) {
        console.log( 'result of setRecord: ' + id );
    } );