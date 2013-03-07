# Shapes PostGIS

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
       ,vdsservice
       )
server=http
       .createServer(app)
       .listen(_testport,done)

```

Now with each request, the query engine will insert the year and the
vdstype into the query in order to limit the results.

You can further improve security by using Express features to require
that the parameters fit a certain type, as described [in the Express docs](http://expressjs.com/api.html#app.param).
