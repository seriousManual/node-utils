
var  util                      = require( 'util' )
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

    var  messages       = []
        ,messages2      = []
        ,logFile        = ''
        ,myStream       = null;

    this.log = function( level, text ) {
        messages.push( { level: level, text: text, time: Date.now() } );
    };

    var init = function( fileName ) {
        if ( !fileName ) {
            fileName = 'data.json';
        }

        fileName = path.normalize( fileName );

        var filePath = path.normalize( process.cwd() + '/' + fileName );

        path.exists( filePath, function( exists ) {
            if ( !exists ) {
                
                fs.open( fileName, 'a', function( err, fd ) {
                    if ( !err ) {
                        fs.close( fd );
                    } else {
                        throw new Error( 'couldnt create logfile: ' + filePath + ' because of: ' + err );
                    }
                } );

            } else {
                logFile = filePath;
                myStream = fs.createWriteStream( logFile, { flags: "a", encoding: "utf8", mode: 0666 } );

                if ( !myStream ) {
                    throw new Error( 'could not create write stream' );
                }
            }
        } );

        setInterval( writeAway, 600000 ); //10 Min
    };

    var writeAway = function() {
        if ( messages.length == 0 ) {
            return;
        }

        var tmp       = messages;
            messages  = messages2;
            messages2 = tmp;

        var c = 0;

        messages2.forEach( function( value ) {
            c++;
            myStream.write( JSON.stringify( value ) + '\n' );
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