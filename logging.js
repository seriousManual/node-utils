var  utils                     = require( './utils' )
    ,path                      = require( 'path' )
    ,fs                        = require( 'fs' );

var loggerCache = {};

 var predefined = {
    global: 'global'
};

var pathConfig = {
    global: 'logs/logging.json'
};

var Logger = function( fileName ) {

    var  initialized    = false
        ,messages       = []
        ,messages2      = []
        ,logFile        = '';

    this.log = function( level, text ) {
        messages.push( { level: level, text: text, time: Date.now() } );
    };

    var init = function( fileName ) {
        if ( !fileName ) {
            fileName = 'data.json';
        } else {
            fileName = fileName.replace( /^(\/|\\)/g, '' ).replace( /(\/|\\)/g, utils.compatSeperator() );
        }

        var filePath = process.cwd() + utils.compatSeperator() + fileName;

        path.exists( filePath, function( exists ) {
            if ( !exists ) {
                throw new Error( 'Logger: ' + filePath + ' doesnt exist.' );
            } else {
                logFile = filePath;
            }
        } );

        setInterval( writeAway, 15000 );
    };

    var writeAway = function() {
        if ( messages.length == 0 ) {
            return;
        }

        var tmp       = messages;
            messages  = messages2;
            messages2 = tmp;

        var stream = fs.createWriteStream( logFile, {
            flags: "a",
            encoding: "encoding",
            mode: 0666
        } );

        var c = 0;

        messages2.forEach( function( value ) {
            c++;
            stream.write( JSON.stringify( value ) + '\n' );
        } );

        messages2 = [];
    };

    init( fileName );
};

Logger.prototype.level = {
    Info:      'Info',
    Warning:   'Warning',
    Error:     'Error'
};

module.exports.Logger = Logger;

module.exports.predefined = predefined;

module.exports.request = function( pKey, pPath ) {

    if ( !loggerCache[ pKey ] ) {
        var path = '';

        if ( predefined[ pKey ]  ) {
            path = pathConfig[ pKey ];
        } else if ( pPath ) {
            path = pPath;
        } else {
            throw new Error( 'unknown request for logger, no path specified' );
        }

        loggerCache[ pKey ] = new Logger( path );
    }

    return loggerCache[ pKey ];
};