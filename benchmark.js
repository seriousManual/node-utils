var  events                     = require( 'events' )
    ,utils                      = require( './utils' );

var Benchmark = function() {

    this.results = {};

    this.running = 0;

    this.average = function( name ) {

        var result = this.results[ name ];
        if ( result && result.length ) {
            var sum = 0;
            result.forEach( function( value ) {
                sum += value;
            } );

            return parseInt( sum / result.length, 10 );
        }

        return 0;

    };

    this.benchmark = function( benchFunction, name ) {

        var self = this;

        return function() {
            var  args        = Array.prototype.slice.apply( arguments )
                ,isAsync     = args.length == 0 ?   //inferring asynchronity from the fact that a callback according to node convention is always the last argument
                               false :
                               typeof args[ args.length-1 ] === 'function'
                ,startTime = Date.now();

            var cleanUp = function() {
                var endTime = Date.now();

                if ( !self.results[ name ] ) {
                    self.results[ name ] = [];
                }
                self.results[ name ].push( endTime - startTime );
                self.running--;

                if ( self.running == 0 ) {
                    self.emit( 'drain', self.results );
                }
            };

            if ( isAsync ) {
                var prevCallback = args.pop();
                args.push( function() {
                    prevCallback.apply( null, Array.prototype.slice.apply( arguments ) );
                    cleanUp();
                } );
            }

            self.running++;
            var retResult = benchFunction.apply( null, args );

            if ( !isAsync ) {
                cleanUp();
                return retResult;
            }

        };

    };

};

utils.inherits( Benchmark, events.EventEmitter );

module.exports = new Benchmark();