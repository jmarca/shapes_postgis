/* global console JSON exports */
var sys = require('sys'),
    http = require('http'),
    pg = require('pg'),
    _ = require('underscore'),
    parseUrl = require('url').parse;
var geom_utils = require('./geom_utils')




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
 * options.id_col: the column or columns that identify each geometry's unique id
 *                 if more than one column, this is an array, and the values will be
 *                 joined using underscores in the final result (for example, 5_N)
 *
 * options.select_properties: Required.  hash. additional properties to select from
 *                            table.  At a minimum it should include
 *                            something that is unique per
 *                            geometry. For example:
 *  {'dir':'direction'
 *  ,'distinct_id':'freeway'}
 *
 * The keys are used as the column (or procedure) to select, and the value
 * is used to name the column.  Often the key and the value can be the same thing
 *
 * These will be converted into a series of strings like
 *
 *     'select dir as direction, distinct_id as freeway ...'
 *
 *
 * options.join_tables: Optional additional tables to join so as to get select
 *                      properties.  complicated joins should be just
 *                      a string with all the rules.  otherwise,
 *                      expecting an array of objects like
 *
 * [ {'table': 'tablename'
 *   ,'alias': 'alias' // optional
 *   ,'join' : 'join string, such as ON(a.id = b.detector_id)'
 *   } ]
 *
 */
exports.shape_service = function shape_service(options){
    if(! options ) throw new Error ('options object required')
    var required_options = ['db','username','password','table','select_properties']
    if(_.intersection(_.keys(options),required_options).length !== required_options.length ){
        throw new Error("all of "+required_options.join(', ')+" must be specified")
    }
    var dbname = options.db
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    var table = options.table
    if(options.alias) table += ' as ' + options.alias
    var select_properties = options.select_properties
    var geom = options.geo_col || 'geom';
    var join_tables

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

    var row_handler = function(data,req,res,next){
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
    var end_handler=function(data,req,res,next){
        return function(){
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        }
    }


    var pg_connect_handler = function(geoquery,req,res,next){
        return function(err, client) {
            if(err){
                console.log('connection error '+JSON.stringify(err));
                return next(err)
            }
            var result = client.query(geoquery);

            var data = {"type":"FeatureCollection",
                        "features":[]};
            result.on('row',row_handler(data,req,res,next))
            result.on('end',end_handler(data,req,res,next))

            return null
        }
    }

    function seg_geom_service(req,res,next){
        // make sure bbox is inthe params
        var bbox = geom_utils.get_bbox(req)
        var geoquery
        var pn = geom_utils.precision(req.param('zoom')) || 1;
        var overlap = 1/Math.pow(10,pn);
        var tolerance = overlap; // this is too simple for my taste: 1/Math.pow(10,pn-1);

        if( bbox === undefined){
            // get them all.  Sometimes useful.
            geoquery = 'SELECT '+propcols
                     + ', st_asgeojson(ST_Simplify('
                     + geom
                     + ','+tolerance+'),'+pn+') as geojson'

        }else{
            geoquery =
                'SELECT '+propcols+', st_asgeojson(ST_Simplify((ST_Dump(ST_Intersection('+bbox+','+geom+'))).geom,'+tolerance+'),'+pn+') as geojson'
        }

        geoquery +=  ' FROM '+table+' '

        if(join_tables !== undefined)
            geoquery += join_tables

        if(bbox !== undefined)
            geoquery += ' WHERE st_intersects('+geom+','+bbox +')'


        //console.log(geoquery)

        pg.connect(connectionString, pg_connect_handler(geoquery,req,res,next))


        return null

    }

    seg_geom_service.propcols = function(){return propcols}
    seg_geom_service.connectionString = function(){ return connectionString }

    return seg_geom_service
}