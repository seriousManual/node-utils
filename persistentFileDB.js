var  globalDumpTimer            = null
    ,globalFileDBObjectCache    = {}
    ,async                      = require( 'async' )
    ,utils                      = require( './utils' )
    ,fs                         = require( 'fs' )
    ,path                       = require( 'path' )
    ,events                     = require( 'events' );


var FileDB = function ( fileName ) {

    var initialized     = false
        ,updated        = false
        ,that           = this
        ,globalRecord   = {};

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
                        }
                        try {
                            globalRecord = JSON.parse( data );
                            initialized = true;

                            that.emit( 'initialize' );
                        } catch( e ) {
                            that.emit( 'error', 'JSON parsing error: ' + e );
                        }

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

    this.list = function( callback ) {
        callback = callback || function() {};

        if ( !initialized ) {
            callback( 'Database is not initialized yet.', null );
            return;
        }

        var tmp = [];
        for( var i = 0, len = globalRecord.length; i < len; i++ ) {
            var recordData = false;
            if ( recordData = extractRecordData( i, globalRecord[ i ] ) ) {
                tmp.push( recordData );
            }
        }

        callback( null, tmp );
    };

    this.getRecord = function( id, callback ) {
        callback = callback || function() {};

        if ( !initialized ) {
            callback( 'not initialized yet', null );
            return;
        }

        var recordData = false;
        if ( globalRecord[ id ] && ( recordData = extractRecordData( id, globalRecord[ id ] ) ) ) {
            callback( null, recordData );
        } else {
            callback( 'not found!', null );
        }
    };

    this.setRecord = function( data, id, callback ) {
        callback = callback || function() {};

        if ( !initialized ) {
            callback( 'not initialized yet', null );
            return;
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

            callback( null, newId );
        } else if ( globalRecord[ id ] ) {
            globalRecord[ id ].data = data;
            globalRecord[ id ].updda = Date.now();

            updated = true;
            callback( null, id );
        } else {
            callback( 'not found!', null );
        }

    };

    this.deleteRecord = function( id, callback ) {
        callback = callback || function() {};

        if ( !initialized ) {
            callback( 'not initialized yet' );
            return;
        }

        if ( globalRecord[ id ] ) {
            globalRecord[ id ].deleted = true;
            updated = true;

            callback( false );
        } else {
            callback( 'not found' );
        }

    };

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
                globalFileDBObjectCache[ key ].dumpData();
            }
        }, 5000 );
    }

    return globalFileDBObjectCache[ myKey ];

};