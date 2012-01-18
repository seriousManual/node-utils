
var util = require( 'util' );

util.compatSeperator = function() {
    return  process.platform === 'win32' ? '\\' : '/';
};


module.exports = util;


