/* global require console process it describe after before JSON */

// these tests are for a user, but not one with admin privs

var should = require('should')

var request = require('request');
var _ = require('lodash');
var sgg = require('../lib/shape_geojson_generation')
var shape_service = sgg.shape_service;
var http = require('http')
var express = require('express')
var async = require('async')

var env = process.env;
var puser = process.env.PSQL_USER ;
var ppass = process.env.PSQL_PASS ;
var phost = process.env.PSQL_HOST ;
var pport = process.env.PSQL_PORT || 5432;


var testhost = env.SHAPES_TEST_HOST || '127.0.0.1'
var testport = env.SHAPES_TEST_PORT || 3000

var geom_utils = require('geom_utils')

describe ('shape_service', function(){

    describe('points db table', function(){
        var app,server;

        var _testport = testport
        testport++
        before(
            function(done){
                app = express()
               var ss = shape_service({'db':'osm'
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
                                      })
                app.get('/points/:zoom/:column/:row.:format'
                       ,function(req,res,next){
                            ss(req,res,next)
                        })
                server=http
                       .createServer(app)
                       .listen(_testport,testhost,function(){
                           done()
                       })

            })
        after(function(done){
            server.close(done)
        })

        it('should produce vds points in a box'
          ,function(done){
               var url = 'http://'+ testhost +':'+_testport+'/points/15/5653/13125.json'
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+_testport+'/points/11/354/820.json'
                   url: url
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(16)
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                  })
                           return done()
                       })
           })
    })
    describe('lines db table',function(){
        var app,server;
        var _testport = testport
        testport++
        before(
            function(done){
                app = express()
                var ss=shape_service({'db':'spatialvds'
                                      ,'table':'tempseg.mostusedroadbits'
                                      ,'alias':'murb'
                                      ,'host':phost
                                      ,'username':puser
                                      ,'password':ppass
                                      ,'port':pport
                                      ,'select_properties':{'murb.refnum' : 'freeway'
                                                           ,'murb.direction': 'direction'
                                                           ,"detector_id"   : 'detector_id'
                                                           ,'components'    : 'components'
                                                           ,'year'          : 'year'
                                                           }
                                      ,'id_col':['detector_id','direction','year']
                                      ,'geo_col':'seggeom'
                                      })
                app.get('/lines/:zoom/:column/:row.:format'
                       ,function(req,res,next){ss(req,res,next)}
                       )

                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should get lines for freeways in a box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+_testport+'/lines/11/354/820.json'
                   url:'http://'+ testhost +':'+_testport+'/lines/15/5653/13125.json'
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(33)
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                  })
                           return done()
                       })
           })
    })
    describe('areas db table',function(){
        var app,server;

        var _testport = testport
        testport++
        before(
            function(done){
                app = express()

                var shape_handler = shape_service({'db':'spatialvds'
                                      ,'table':'public.carb_counties_aligned_03'
                                      ,'alias':'counties'
                                      ,'host':phost
                                      ,'username':puser
                                      ,'password':ppass
                                      ,'port':pport
                                      ,'select_properties':{'gid'           : 'gid'
                                                           ,'a.fips'         :'fips'
                                                           ,'cacoa_'       : 'cacoa_'
                                                           ,'cacoa_id'     : 'id'
                                                           ,'coname'       : 'coname'
                                                           ,'a.name'         : 'name'
                                                           ,'conum'        : 'conum'
                                                           ,'display'      : 'display'
                                                           ,'symbol'       : 'symbol'
                                                           ,'islandname'   : 'islandname'
                                                           ,'baysplinte'   : 'baysplinte'
                                                           ,'cntyi_area'   : 'cntyi_area'
                                                           ,'island_id'    : 'island_id'
                                                           ,'bay_id'       : 'bay_id'
                                                           }
                                      ,'id_col':['fips','gid']
                                      ,'geo_col':'geom4326'
                                      ,'join_tables':[{'table':'counties_fips'
                                                      ,'alias':'a'
                                                      ,'join' :'on (counties.name ~* a.name)'}
                                                     ]
                                      })
                app.get('/areas/:zoom/:column/:row.:format'
                       ,function(req,res,next){shape_handler(req,res,next)}
                       )
                app.get('/areas.:format'
                       ,function(req,res,next){shape_handler(req,res,next)}
                       )

                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should get polygons for counties in a box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+_testport+'/areas/11/354/820.json'
                   url:'http://'+ testhost +':'+_testport+'/areas/11/353/820.json'
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(1)
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                  })
                           return done()
                       })
           })
        it('should get all the counties when there is no box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+_testport+'/areas/11/354/820.json'
                   url:'http://'+ testhost +':'+_testport+'/areas.json'
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           // use greater than, because of islands and such
                           c.features.should.have.length(95)
                           var fipscheck  = geom_utils.fips_lookup()
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                      member.properties.should.have.property('fips')
                                      if(fipscheck[member.properties.fips]){
                                          delete fipscheck[member.properties.fips];
                                      }
                                  });
                           _.keys(fipscheck).should.be.empty
                           return done()
                       })
           })
    })
    describe('two points tables', function(){
        var app,server;

        var _testport = testport
        testport++
        before(
            function(done){
                app = express()

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
                                }
                var wim_options={'db':'osm'
                                ,'table':'osm_upgraded_2010.twim'
                                ,'alias':'twim'
                                ,'host':phost
                                ,'username':puser
                                ,'password':ppass
                                ,'port':pport
                                ,'select_properties':{'twim.freeway_id' : 'freeway'
                                                     ,'twim.direction': 'direction'
                                                     ,"'wimid_' || site_no"   : 'detector_id'
                                                     ,'wim_type'        : 'type'
                                                     }
                                ,'id_col':['detector_id','direction']
                                }

                // now chain the services with callbacks

                var chained_service = function(req,res,next){
                    async.parallel([function(cb){
                                        shape_service(vds_options
                                                     ,function(data,req,res,next){
                                                          cb(null,data)
                                                      })(req,res,next)
                                    }
                                   ,function(cb){
                                        shape_service(wim_options
                                                     ,function(data,req,res,next){
                                                          cb(null,data)
                                                      })(req,res,next)
                                    }]
                                  ,function(err,results){

                                       var data = results[0]
                                       var wim = results[1]
                                       if(data && data.features === undefined){
                                           data = wim
                                       }else{
                                           if(wim
                                            && wim.features !== undefined
                                            && wim.features.length){
                                               data.features.push(wim.features)
                                               data.features = _.flatten(data.features)
                                           }
                                       }
                                       res.writeHead(200, { 'Content-Type': 'application/json' });
                                       res.end(JSON.stringify(data));
                                   })
                    return null
                }

                app.get('/points/:zoom/:column/:row.:format'
                       ,chained_service
                       )
                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should produce vds points in a box'
          ,function(done){
               // load the service for vds shape data
               request({url:'http://'+ testhost +':'+_testport+'/points/14/2821/6558.json'
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(15)
                           var vds_match=false
                           var wim_match = false;
                           var vds_regex = /vdsid_\d{6,7}/;
                           var wim_regex = /wimid_\d+_[NSEW]/;
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                      if(vds_regex.test(member.properties.id))
                                          vds_match = true
                                      if(wim_regex.test(member.properties.id))
                                          wim_match = true
                                  });
                           vds_match.should.be.true
                           wim_match.should.be.true
                           return done()
                       })
           })
    })

    describe('two points tables with extra where clause', function(){
        var app,server;

        var _testport = testport
        testport++
        before(
            function(done){
                app = express()

                app.use(express.bodyParser())
                //app.use(express.logger())
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
                                }
                var wim_options={'db':'osm'
                                ,'table':'osm_upgraded_2010.twim'
                                ,'alias':'twim'
                                ,'host':phost
                                ,'username':puser
                                ,'password':ppass
                                ,'port':pport
                                ,'select_properties':{'twim.freeway_id' : 'freeway'
                                                     ,'twim.direction': 'direction'
                                                     ,"'wimid_' || site_no"   : 'detector_id'
                                                     ,'wim_type'        : 'type'
                                                     }
                                ,'where_clause':"wim_type~*'prepass'"
                                ,'id_col':['detector_id','direction']
                                }

                // now chain the services with callbacks

                var chained_service = function(req,res,next){
                    async.parallel([function(cb){
                                        shape_service(vds_options
                                                     ,function(data,req,res,next){
                                                          cb(null,data)
                                                      })(req,res,next)
                                    }
                                   ,function(cb){
                                        shape_service(wim_options
                                                     ,function(data,req,res,next){
                                                          cb(null,data)
                                                      })(req,res,next)
                                    }]
                                  ,function(err,results){

                                       var data = results[0]
                                       var wim = results[1]
                                       if(data && data.features === undefined){
                                           data = wim
                                       }else{
                                           if(wim
                                            && wim.features !== undefined
                                            && wim.features.length){
                                               data.features.push(wim.features)
                                               data.features = _.flatten(data.features)
                                           }
                                       }
                                       res.writeHead(200, { 'Content-Type': 'application/json' });
                                       res.end(JSON.stringify(data));
                                   })
                    return null
                }

                app.get('/points/:zoom/:column/:row.:format'
                       ,chained_service
                       )
                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should produce vds and wim points in a box, but only prepass wim sites'
          ,function(done){
               // load the service for vds shape data
               request({url:'http://'+ testhost +':'+_testport+'/points/10/174/407.json'
                       ,'headers':{'accept':'application/json'}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(112)
                           var vds_match=false
                           var wim_match = false;
                           var vds_regex = /vdsid_\d{6,7}/;
                           var wim_regex = /wimid_\d+_[NSEW]/;
                           var prepass_regex = /prepass/i;
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                      if(vds_regex.test(member.properties.id)){
                                          vds_match = true
                                      }
                                      if(wim_regex.test(member.properties.id)){
                                          wim_match = true
                                          var is_prepass = prepass_regex.test(member.properties.type)
                                          is_prepass.should.be.true
                                      }
                                  });
                           vds_match.should.be.true
                           wim_match.should.be.true
                           return done()
                       })
           })

    })

    describe('where clause in query', function(){
        var app,server;

        var _testport = testport
        testport++
        before(
            function(done){
                app = express()

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
                                                                   }}
                                }

                var vdsservice = shape_service(vds_options)

                app.get('/points/:zoom/:column/:row.:format'
                       ,function(req,res,next){vdsservice(req,res,next)}
                       )
                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })


        it('should accept where_clause in the request object as well'
          ,function(done){
               // load the service for vds shape data
               request({url:'http://'+ testhost +':'+_testport+'/points/10/174/407.json?vdstype=\'ff\''
                       ,'headers':{'accept':'application/json'}
                       ,qs: {}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.have.property('type','FeatureCollection')
                           c.should.have.property('features')
                           c.features.should.have.length(6)
                           var ff_regex = /ff/i;
                           _.each(c.features
                                 ,function(member){
                                      member.should.have.property('geometry')
                                      member.should.have.property('properties')
                                      member.properties.should.have.property('id')
                                      var is_ff = ff_regex.test(member.properties.type)
                                      is_ff.should.be.true
                                  });
                           return done()
                       })
           })
    })
    describe('custom row handler', function(){
        var app,server;
        var collector
        var _testport = testport
        testport++
        before(
            function(done){
                app = express()
                collector=[]
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
                                ,'id_col':['detector_id']
                                ,'dynamic_where_clause':{'vdstype':{'lhs':'vdstype',
                                                                    'comp':'~*'
                                                                   }}

                                }
                var vdsservice = shape_service(vds_options)
                app.get('/points/:zoom/:column/:row.:format'
                       ,function(req,res,next){
                            var callback = function(){
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(collector));
                            }
                            req.params['row_handler']= function(row){
                                var val = {}
                                _.each(vds_options.select_properties
                                      ,function(v,k){
                                           val[v] = row[v]
                                       });
                                if(vds_options.id_col !== undefined){
                                    var id = _.map(vds_options.id_col
                                                  ,function(k){
                                                       return row[k]
                                                   })
                                    if(_.isArray(id))
                                        id = id.join('_')
                                    val.id = id
                                }
                                collector.push(val)
                            }

                            return vdsservice(req,res,next,callback)
                        }
                       )
                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })


        it('should be okay with custom row handler'
          ,function(done){
               // load the service for vds shape data
               request({url:'http://'+ testhost +':'+_testport+'/points/10/174/407.json?vdstype=\'ff\''
                       ,'headers':{'accept':'application/json'}
                       ,qs: {}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.not.have.property('type')
                           c.should.not.have.property('features')
                           c.should.have.length(6)
                           var ff_regex = /ff/i;
                           _.each(c
                                 ,function(member){
                                      member.should.not.have.property('geometry')
                                      member.should.not.have.property('properties')
                                      member.should.have.property('id')
                                      member.should.have.property('type')
                                      var is_ff = ff_regex.test(member.type)
                                      is_ff.should.be.true
                                  });
                           return done()
                       })
           })
    })
    describe('points in an externally defined area', function(){
        var app,server;
        var collector
        var _testport = testport
        testport++
        before(
            function(done){
                app = express()
                collector=[]
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
                                ,'id_col':['detector_id']
                                ,'dynamic_where_clause':{'vdstype':{'lhs':'vdstype',
                                                                    'comp':'~*'
                                                                   }}

                                }
                var vdsservice = shape_service(vds_options)
                app.get('/points/:zoom/:column/:row.:format'
                       ,function(req,res,next){
                            var callback = function(){
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(collector));
                            }
                            req.params['row_handler']= function(row){
                                var val = {}
                                _.each(vds_options.select_properties
                                      ,function(v,k){
                                           val[v] = row[v]
                                       });
                                if(vds_options.id_col !== undefined){
                                    var id = _.map(vds_options.id_col
                                                  ,function(k){
                                                       return row[k]
                                                   })
                                    if(_.isArray(id))
                                        id = id.join('_')
                                    val.id = id
                                }
                                collector.push(val)
                            }

                            return vdsservice(req,res,next,callback)
                        }
                       )
                server=http
                       .createServer(app)
                       .listen(_testport,done)

            })
        after(function(done){
            server.close(done)
        })


        it('should be okay with custom row handler'
          ,function(done){
               // load the service for vds shape data
               request({url:'http://'+ testhost +':'+_testport+'/points/10/174/407.json?vdstype=\'ff\''
                       ,'headers':{'accept':'application/json'}
                       ,qs: {}
                       ,followRedirect:true}
                      ,function(e,r,b){
                           if(e) return done(e)
                           r.statusCode.should.equal(200)
                           should.exist(b)
                           var c = JSON.parse(b)
                           c.should.not.have.property('type')
                           c.should.not.have.property('features')
                           c.should.have.length(6)
                           var ff_regex = /ff/i;
                           _.each(c
                                 ,function(member){
                                      member.should.not.have.property('geometry')
                                      member.should.not.have.property('properties')
                                      member.should.have.property('id')
                                      member.should.have.property('type')
                                      var is_ff = ff_regex.test(member.type)
                                      is_ff.should.be.true
                                  });
                           return done()
                       })
           })
    })
})
