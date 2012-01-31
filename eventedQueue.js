var EventQueue = function() {
    this.triggered = false;
    this.triggerQueue = [];
};

EventQueue.prototype.push = function() {
    var args = Array.prototype.slice.call( arguments );

    if ( args.length > 0 ) {
        if ( 'function' !== typeof args[0] )  {
            throw new Error( 'first parameter should be function' );
        }

        if ( this.triggered ) {
            process.nextTick( function() {
                args.shift().apply( null, args.length > 0 ? args : [] );
            } );
        } else {
            this.triggerQueue.push( { f: args.shift(), args: ( args.length > 0 ? args : [] ) } );
        }
    } else {
        throw new Error( 'not function argument supplied!' );
    }
};

EventQueue.prototype.trigger = function() {
    this.triggered = true;

    this.triggerQueue.map( function( value, key, all ) {
        value.f.apply( null, value.args );
    } );

};


module.exports = EventQueue;
