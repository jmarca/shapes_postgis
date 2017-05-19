# Shapes PostGIS

[![Greenkeeper badge](https://badges.greenkeeper.io/jmarca/shapes_postgis.svg)](https://greenkeeper.io/)

This library is an attempt to combine the many different services I've
written over the past two years or so that customize access to a
particular PostGIS table.

The basic idea is to point the service at a PostGIS table, and it will
in turn spit back GeoJSON data in response to the usual
zoom/column/row type queries from map clients like Polymaps,
OpenLayers, and so on.

This library is not yet ready for anyone else to use.

# Dynamic where clause

When you are selecting a geometry, sometimes you want to limit it
somehow, but perhaps you don't know at the get go.  The usual limiter
is bounding box, which is defined by zoom, row, and column.  But
suppose you want to limit by year as well, or by a variable, or both?

My old solution was to pass through arbitrary where clause, but that
was stupid and short term.

The current solution is to define up front a hash that contains what
you are looking for.  For example:

```javascript
var app = express()

var vds_options={'db':'osm'
                ,'table':'newtbmap.tvd'
                ,'alias':'tvd'
                ,'host':phost
                ,'username':puser
                ,'password':ppass
                ,'port':pport
                ,'select_properties':{'tvd.freeway_id' : 'freeway'
                                     ,'tvd.freeway_dir': 'direction'
                                     ,"'vdsid_' || id"   : 'detector_id'
                                     ,'vdstype'        : 'type'
                                     }
                ,'id_col':'detector_id'
                ,'dynamic_where_clause':{'vdstype':{'lhs':'vdstype',
                                                    'comp':'~*'
                                                   }
                                         'year':{'lhs':'year',
                                                ,'comp':'='}}
                }

var vdsservice = shape_service(vds_options)

app.get('/points/:year/:vdstype/:zoom/:column/:row.:format'
       ,function(req,res,next){
          // for some reason, express no longer allows me to
          // simply write
          // vdsservice
          // as the handler, but requires explicit call
          vdsservice(req,res,next)
       )
server=http
       .createServer(app)
       .listen(_testport,done)

```

Now with each request, the query engine will insert the year and the
vdstype into the query in order to limit the results.

You can further improve security by using Express features to require
that the parameters fit a certain type, as described [in the Express docs](http://expressjs.com/api.html#app.param).


# Tests

As of February 2016, the tests are now using my config_okay module.
So that means you need to set up a file called `test.config.json` in
the root directory, make sure it is chmod 0600, and have it contain
your database details.  For example, on my local laptop, I have

```
{
    "postgresql":{
        "host":"127.0.0.1",
        "port":5432,
        "auth":{
            "username":"mydbusername"
        },
        "db":"osm2"
    }
}
```

Change the details to match your situation.  However, note that most
of the tests will fail unless your db matches exactly mine.  In that
case, the fails will be slightly different numbers of rows, for
example, 11 rows of off-ramp detectors rather than the desired 9.
