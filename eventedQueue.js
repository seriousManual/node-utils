var EventQueue = function( queueTriggered ) {
    this.queueTriggered = queueTriggered || false;
    this.triggered      = false;
    this.triggerQueue   = [];
};

//make sure not to trigger events that have been already triggered!

EventQueue.prototype.push = function() {
    var args = Array.prototype.slice.call( arguments );

    if ( args.length > 0 ) {
        if ( 'function' !== typeof args[0] )  {
            throw new Error( 'first parameter should be function' );
        }

        if ( this.triggered && !this.queueTriggered ) {
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

    while( this.triggerQueue.length > 0 ) {
        var item = this.triggerQueue.shift();
        item.f.apply( null, item.args );
    }

};


module.exports = EventQueue;