var  globalDumpTimer            = null
    ,globalFileDBObjectCache    = {}
    ,utils                      = require( './utils' )
    ,eventedQueue               = require( './eventedQueue')
    ,fs                         = require( 'fs' )
    ,path                       = require( 'path' )
    ,events                     = require( 'events' );


var FileDB = function ( fileName ) {

    var initialized         = false
        ,updated            = false
        ,that               = this
        ,globalRecord       = {}
        ,myQueue            = new eventedQueue();

    this.initialize = function() {

        if ( initialized ) {
            this.emit( 'error', 'already initialized' );
            return;
        }

        try {
            path.exists( fileName, function( exists ) {

                if ( exists ) {
                    fs.readFile( fileName, 'utf8', function( error, data ) {
                        if ( error ) {
                            that.emit( 'error', error );
                            return;
                        }
                        try {
                            if ( data ) {
                                globalRecord = JSON.parse( data );
                            } else {
                                globalRecord = [];
                            }
                            initialized = true;

                            that.emit( 'initialize' );
                        } catch( e ) {
                            that.emit( 'error', 'JSON parsing error: ' + e );
                            return;
                        }

                        myQueue.trigger();
                    } );
                } else {
                    fs.open( fileName, 'a', function( err, fd ) {
                        if ( !err ) {
                            globalRecord    = [];
                            initialized     = true;
                            updated         = true;

                            fs.close( fd );

                            that.dumpData();

                            that.emit( 'initialize' );
                            myQueue.trigger();
                        } else {
                            that.emit( 'error', err );
                        }
                    } );
                }

            } );
        } catch( e ) {
            that.emit( 'error', e );
        }

    };

    var extractRecordData = function( id, record ) {
        if ( !record.deleted ) {
            var recordData      = record.data;
            recordData.erfda    = record.erfda;
            recordData.updda    = record.updda;
            recordData.id       = id;

            return recordData;
        } else {
            return false;
        }
    };

    this.dumpData = function() {
        if ( !updated ) {
            return;
        }

        updated = false; //concurrency is a bitch, when some writes to db while dumping (async ftw) we cant reset updated to false afterwards, doing it before

        fs.writeFile( fileName, JSON.stringify( globalRecord ), 'utf8', function( err ) {
            if ( err ) {
                //retrying next time
                updated = true;
            }
        } );
    };

    var external = function( wrap ) {
        return function() {
            var args = Array.prototype.slice.call( arguments );
            args.unshift( wrap );

            myQueue.push.apply( myQueue, args );
        };
    };

    var list = function( callback ) {
        var tmp = [];
        for( var i = 0, len = globalRecord.length; i < len; i++ ) {
            var recordData = false;
            if ( recordData = extractRecordData( i, globalRecord[ i ] ) ) {
                tmp.push( recordData );
            }
        }

        return callback( null, tmp );
    };

    this.list = external( list );

    var getRecord = function( id, callback ) {
        var recordData = false;
        if ( globalRecord[ id ] && ( recordData = extractRecordData( id, globalRecord[ id ] ) ) ) {
            return callback( null, recordData );
        } else {
            return callback( 'not found!', null );
        }
    };

    this.getRecord = external( getRecord );

    var setRecord = function( data, id, callback ) {
        if ( !data || 'object' !== typeof data || Array.isArray( data ) ) {
            return callback( 'invalid data supplied', null );
        }

        if ( data.id ) {
            delete data.id;
        }
        if ( data.erfda ) {
            delete data.erfda;
        }
        if ( data.updda ) {
            delete data.updda;
        }

        if ( id === null ) {
            var newId = globalRecord.length;
            globalRecord[ newId ] = { deleted: false, erfda: Date.now(), updda:null, data:data };
            updated = true;

            return callback( null, newId );
        } else if ( globalRecord[ id ] ) {
            globalRecord[ id ].data = data;
            globalRecord[ id ].updda = Date.now();

            updated = true;
            return callback( null, id );
        } else {
            return callback( 'not found!', null );
        }

    };

    this.setRecord = external( setRecord );

    var deleteRecord = function( id, callback ) {
        if ( globalRecord[ id ] ) {
            globalRecord[ id ].deleted = true;
            updated = true;

            return callback( false );
        } else {
            return callback( 'not found' );
        }
    };

    this.deleteRecord = external( deleteRecord );

    this.disconnect = function() {
        initialized = false;

        this.dumpData();
        removeFromFileObjectCache( fileName );
    };

    this.initialize();

};

utils.inherits( FileDB, events.EventEmitter );



var removeFromFileObjectCache = function( key ) {
    globalFileDBObjectCache[ key ] && delete globalFileDBObjectCache[ key ];
};

exports.request = function( fileName ) {

    if ( !fileName ) {
        fileName = 'data.json';
    } else {
        fileName = fileName.replace( /^(\/|\\)/g, '' ).replace( /(\/|\\)/g, utils.compatSeperator() );
    }

    var myKey = process.cwd() + utils.compatSeperator() + fileName;
    if ( !globalFileDBObjectCache[ myKey ] ) {
        globalFileDBObjectCache[ myKey ] = new FileDB( myKey );
    }

    if ( globalDumpTimer == null ) {
        globalDumpTimer = setInterval( function() {
            for( var key in globalFileDBObjectCache ) {
                setTimeout( function() { globalFileDBObjectCache[ key ].dumpData(); }, 0 );
            }
        }, 5000 );
    }

    return globalFileDBObjectCache[ myKey ];

};