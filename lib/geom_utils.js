/* global exports require process JSON */


// [1, 10, 509.456, 0.022163, 38.111, 2504.064, 668.937, 205.656, 29.895, 1992.135, 256.027, 64.206, 496188.029, 6936.57]
var variable_order = {'count':0
                     ,'imputations':1
                     ,'n':2
                     ,'o':3
                     ,'heavyheavy':4
                     ,'hh_speed'  :5
                     ,'hh_weight' :6
                     ,'hh_axles':7
                     ,'not_heavyheavy':8
                     ,'nhh_speed':9
                     ,'nhh_weight':10
                     ,'nhh_axles':11
                     ,'wgt_spd_all_veh_speed':12
                     ,'count_all_veh_speed':13};


var n_weighted_variables = ['o'
                           ,'avg_veh_spd'];
var hh_weighted_variables = ['avg_hh_weight'
                            ,'avg_hh_axles'
                            ,'avg_hh_spd'];
var nh_weighted_variables = ['avg_nh_weight'
                            ,'avg_nh_axles'
                            ,'avg_nh_spd'
                            ];


var aggregation = {
    'monthly':function(ts,endts){
                  if(!ts) ts = 'ts';
                  return {'startagg':  "to_char("+ts+", 'YYYY-MM-01')"
                         ,'groupagg':  "to_char("+ts+", 'YYYY-MM-01')"
                         };
              }
    ,'weekly':function(ts,endts){
                  if(!ts) ts = 'ts';
                  // weeks are complicated.  Using ISO week
                  var dateweek = "to_char("+ts+",'IYYY-IW-01')";
                  var weekdate = "to_date("+dateweek+", 'IYYY-IW-ID')";

                  return {'startagg':  "to_char("+weekdate+", 'YYYY-MM-DD')"
                         ,'groupagg': "to_char("+weekdate+", 'YYYY-MM-DD')"
                         };
              }
    ,'daily':function(ts,endts){
                 if(!ts) ts = 'ts';
                 return {'startagg':  "to_char("+ts+", 'YYYY-MM-DD')"
                        ,'groupagg':  "to_char("+ts+", 'YYYY-MM-DD')"
                        };
             }
    ,'hourly':function(ts,endts){
                  if(!ts) ts = 'ts';
                  return {'startagg':  "to_char("+ts+", 'YYYY-MM-DD\"T\"HH24:00:00')"
                         ,'groupagg':  "to_char("+ts+", 'YYYY-MM-DD\"T\"HH24:00:00')"
                         };
              }
    ,'yearly':function(ts,endts){
        if(!ts) ts = 'ts';
        if(!ts) endts = 'endts';
        return {'startagg':  "to_char("+ts+", 'YYYY-01-01')"
                ,'groupagg':  "to_char("+ts+", 'YYYY-01-01')"
               };
    }
};

function pad(n){return n<10 ? '0'+n : n}

function match_district (did){
    if(/wim/.test(did)){
        // WIM data is in the wim district!
        return 'wim';
    }
    var district_regex = /^(\d{1,2})\d{5}$/;
    var match = district_regex.exec(did);
    if (match && match[1] !== undefined){
        return ['d',pad(match[1])].join('');
    }
    return null;
}



var group_level=5; // hourly aggregation in couchdb.  daily is 4, monthly is 3, yearly is 2

var group = function(set){
        if(set !== undefined) {
            group_level=set;
        }
        return group_level;
    };


var request = require('request');
var _ = require('lodash');
var lanehash = {};
function getLanes(options){
    var env = process.env;
    var cuser = options.user || process.env.COUCHDB_USER ;
    var cpass = options.pass || process.env.COUCHDB_PASS ;
    var chost = options.host || env.COUCHDB_HOST ;
    var cport = options.port || env.COUCHDB_PORT || 5984;
    var trackerdbname = options.trackerdbname || env.COUCHDB_TRACKINGDB || 'vdsdata%2ftracking';

    var couch = 'http://'+chost+':'+cport;
    var tracker = couch +'/'+trackerdbname;
    return function(error,cb){
        if(error){
            cb(error);
            return null;
        }
        var did = options.detector_id;
        var year = options.year;
        var tracker_source = tracker + '/'+did;
        if(lanehash[did] && lanehash[did][year]){
            cb(null,_.extend(options,{'lanes':lanehash[did][year]}));
        }else{
            if(lanehash[did]===undefined){
                lanehash[did]={};
            }
            request(tracker_source
            ,function(error,response,body){
                // pick off the lanes, send to callback, also store in
                // a local hash
                var doc = JSON.parse(body);
                 if(doc[year] !== undefined
                  && doc[year].properties !== undefined
                  && doc[year].properties.length > 0
                  && doc[year].properties[0].lanes !== undefined)
                {
                    lanehash[did][year]=doc[year].properties[0].lanes;
                }else{
                    // okay, there are a few cases (as demonstrated by site 400793) where I have data but no metadata on the site for that year
                    // so just run a grep over the body and extract the lanes value
                    var match = /"lanes":(\d+)/.exec(body);
                    if(match && match[1]){
                        lanehash[did][year]=match[1];
                    }else{
                        // sometimes we just have no information.
                        // guessing here
                        lanehash[did][year]=2
                        //throw new Error('getLanes, doc is '+body+'\nmatch is '+JSON.stringify(match))
                    }
                }
                cb(null,_.extend(options,{'lanes':lanehash[did][year]}));
            });
        }
        return null;
    };
}


function convertDetectorIdForCouchDB(did,features){
    did = String(did)
    var numericpart = did.match(/\d+/);
    // assume vds, then test for wim
    var detector_id = numericpart[0];
    // special handling for WIM
    if(/wim/.test(did)){
        // WIM data has a direction
        var dir = features[key][0].properties.direction;
        detector_id = ['wim',numericpart[0],dir.charAt(0).toUpperCase()].join('.');
    }
    return detector_id
}
// direction lookup

var direction_lookup ={'N':'north'
                      ,'S':'south'
                      ,'W':'west'
                      ,'E':'east'
                      };
function convertDetectorIdForSQLwhere(did){
    did = String(did)
    var numericpart = did.match(/\d+/);
    // assume vds, then test for wim
    var detector_id = numericpart[0];
    var whereclause = ['detector_id=vdsid_'+detector_id];
    // special handling for WIM
    if(/wim/.test(did)){
        // WIM data has a direction
        var directionpart = did.match(/\.(.)$/);
        var dir = direction_lookup[directionpart[1]];
        whereclause = ['detector_id=wimid_'+detector_id
                      ,'direction='+dir
                      ];
    }
    return whereclause;
}
function convertDetectorIdForSQL(did){
    did = String(did)
    var numericpart = did.match(/\d+/);
    // assume vds, then test for wim
    var detector_id = numericpart[0];
    var sqlid = 'vdsid_'+detector_id;
    // special handling for WIM
    if(/wim/.test(did)){
        // WIM data has a direction
        var directionpart = did.match(/\.(.)$/);
        var dir = direction_lookup[directionpart[1]];
        sqlid = 'wimid_'+detector_id
    }
    return sqlid;
}

exports.aggregation=aggregation;
exports.convertDetectorIdForCouchDB=convertDetectorIdForCouchDB;
exports.convertDetectorIdForSQL=convertDetectorIdForSQL;
exports.convertDetectorIdForSQLwhere=convertDetectorIdForSQLwhere;
exports.district_from_detector = match_district;
exports.getLanes=getLanes;
exports.group = group;
exports.hh_weighted_variables = hh_weighted_variables;
exports.n_weighted_variables  = n_weighted_variables;
exports.nh_weighted_variables = nh_weighted_variables;
exports.variable_order         = variable_order;
