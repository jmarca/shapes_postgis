/* global console JSON exports */
var pg = require('pg'),
    _ = require('lodash'),
    parseUrl = require('url').parse;
var geom_utils = require('geom_utils')


/**
 * shape_service
 *
 * @param: options
 *
 * options.db: the database name.  Required
 * options.host:  the database host.  Default 127.0.0.1
 * options.port:  the database port.  Default 5432
 * options.username: the db user to use.  Required
 * options.password: the db user's password to use.  Required
 * options.table:  the geometry table to access.  Required
 * options.alias:  an alias to give the table.  Optional
 * options.geo_col: the geometry column in the table.  Default 'geom'
 * options.id_col: the column or columns that identify each geometry's
 *                 unique id if more than one column, this is an
 *                 array, and the values will be joined using
 *                 underscores in the final result (for example, 5_N)
 *
 * options.select_properties: Required. hash. additional properties to
 *                            select from table. At a minimum it
 *                            should include something that is unique
 *                            per geometry. For example:
 *  {'dir':'direction'
 *  ,'distinct_id':'freeway'}
 *
 * The keys are used as the column (or procedure) to select, and the
 * value is used to name the column. Often the key and the value can
 * be the same thing
 *
 * These will be converted into a series of strings like
 *
 *     'select dir as direction, distinct_id as freeway ...'
 *
 *
 * options.join_tables: Optional additional tables to join so as to
 *                      get select properties. complicated joins
 *                      should be just a string with all the rules.
 *                      otherwise, expecting an array of objects like
 *
 * [ {'table': 'tablename'
 *   ,'alias': 'alias' // optional
 *   ,'join' : 'join string, such as ON(a.id = b.detector_id)'
 *   } ]
 *
 */
exports.shape_service = function shape_service(options,cb){
    if(! options ) throw new Error ('options object required')
    var required_options = ['db','username','table','select_properties']
    if(_.intersection(_.keys(options),required_options).length !== required_options.length ){
        throw new Error("all of "+required_options.join(', ')+" must be specified")
    }

    var dbname = options.db
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;

    var connectionString = "pg://"+username+"@"+host+":"+port+"/"+dbname;
    if(password !== undefined){
        connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    }

    // console.log(connectionString)
    var table = options.table
    var geom = options.geo_col || 'geom'
    if(options.alias) {
        table += ' as ' + options.alias
        // don't append if options.geom was passed, assume caller knows what is up
        if(options.geo_col === undefined )geom = options.alias + '.'+geom
    }
    var select_properties = options.select_properties
    var join_tables

    var where_clause = options.where_clause
    var with_clause = options.with_clause
    var dynamic_where_clause = options.dynamic_where_clause

    if(options.join_tables !== undefined){
        join_tables = ''
        _.each(options.join_tables
              ,function(j){
                   join_tables += ' JOIN '
                   join_tables += j.table
                   if(j.alias !== undefined) join_tables += ' ' + j.alias
                   join_tables += ' '+j.join + ' '
               })
    }

    var id_col;
    if(options.id_col !== undefined)
        id_col = _.flatten([options.id_col])

    var propcols = _.map(select_properties
                    ,function(v,k){
                         return k +' as '+ v
                     }).join(',')

    var with_opts ={'alias':'bounding_area'
                   ,'area_type_param':options.area_type_param
                   ,'area_param':options.area_param}
    //console.log(with_opts)
    function seg_geom_service(req,res,next,_cb){
        if(_cb === undefined && cb !== undefined) _cb = cb
        // make sure bbox is inthe params
        var bbox = geom_utils.get_bbox_with_format(req,with_opts)
        //console.log({parsed_bbox:bbox})
        // the dynamic where clause is now built from a map specified earlier
        var _w_c = []

        _.each(dynamic_where_clause
              ,function(v,k){
                   if(req.param(k)!==undefined){
                       _w_c.push([v.lhs,req.param(k)].join(v.comp))
                   }
               });

        var _where_clause

        if(_w_c.length > 0){
            _where_clause =  _w_c.join(' AND ')
        }
        if(_w_c.length > 0 && where_clause !== undefined) {
            _where_clause = where_clause + ' AND ' + _where_clause
        }else if(_w_c.length === 0){
            _where_clause = where_clause
        }

        // add the ability to specify a with clause...later
        var _with_clause //= req.param('with_clause')
        if(with_clause !== undefined)
            _with_clause = with_clause

        var geoquery = ''
        if(_with_clause !== undefined){
            geoquery = 'WITH '+_with_clause
        }

        var pn = geom_utils.precision(req.param('zoom')) || 1;
        if( bbox === undefined) pn = 20 // if I want them all, I want accuracy too
        var overlap = 1/Math.pow(10,pn);
        var tolerance = overlap; // this is too simple for my taste: 1/Math.pow(10,pn-1);

        if( bbox === undefined){
            // get them all.  Sometimes useful.
            geoquery += 'SELECT '+propcols
                     + ', st_asgeojson(ST_Simplify('
                     + geom
                     + ','+tolerance+'),'+pn+') as geojson'

        }else{
            geoquery =
                'with '+bbox+' SELECT '+propcols+', st_asgeojson(ST_Simplify((ST_Dump(ST_Intersection(bounding_area.geom,'+geom+'))).geom,'+tolerance+'),'+pn+') as geojson'
        }

        geoquery +=  ' FROM '+table+' '


        if(join_tables !== undefined)
            geoquery += join_tables // add other join tables

        if(bbox !== undefined){

            geoquery += ' JOIN bounding_area ON (st_intersects('+geom+',bounding_area.geom)) '// add the with clause alias


            if(_where_clause){
                geoquery += ' WHERE ' + _where_clause
            }
        }else{
            if(_where_clause){
                geoquery += ' WHERE ' + _where_clause
            }
        }

        //console.log(geoquery)
        var data = {"type":"FeatureCollection",
                    "features":[]};
        //console.log('row_handler: '+(req.param('row_handler') === undefined))
        var rh = (req.param('row_handler') === undefined) ?
            row_handler(select_properties,id_col,data,req,res,next)
            : req.param('row_handler')

        var eh = (_cb === undefined && ! _.isFunction(_cb))
               ? writing_end_handler(data,req,res,next)
               : cb_end_handler(_cb,data,req,res,next)

        pg.connect(connectionString, pg_connect_handler(geoquery,rh,eh,next))


        return null

    }

    seg_geom_service.propcols = function(){return propcols}
    seg_geom_service.connectionString = function(){ return connectionString }

    return seg_geom_service
}

var row_handler = function(select_properties,id_col,data,req,res,next){
    return function(row){
        var val = {"type":"Feature",
                   "geometry":JSON.parse(row.geojson),
                   "properties":{}};
        _.each(select_properties
              ,function(v,k){
                   val.properties[v] = row[v]
               });
        if(id_col !== undefined){
            var id = _.map(id_col
                          ,function(k){
                               return row[k]
                           })
            if(_.isArray(id))
                id = id.join('_')
            val.properties.id = id
        }
        data.features.push(val);
    }
}


var writing_end_handler=function(data,req,res,next){
    return function(){
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
}
var cb_end_handler=function(cb,data,req,res,next){
    return function(){
        cb(data,req,res,next)
    }
}



var pg_connect_handler = function(geoquery,row_handler,end_handler,next){

    return function(err, client, done) {
        if(err){
            console.log('connection error '+JSON.stringify(err));
            return next(err)
        }
        var result = client.query(geoquery);

        result.on('row',row_handler)
        result.on('end',function(){
            end_handler()
            done()
            return null
        })

        return null
    }
}
