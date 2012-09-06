/* global require console process it describe after before */

// these tests are for a user, but not one with admin privs

var should = require('should')

var request = require('request');
var async = require('async')
var _ = require('underscore');
var sgg = require('../lib/shape_geojson_generation')
var shape_service = sgg.shape_service;
var http = require('http')
var express = require('express')
var RedisStore = require('connect-redis')(express);


var env = process.env;
var puser = process.env.PSQL_USER ;
var ppass = process.env.PSQL_PASS ;
var phost = process.env.PSQL_HOST ;
var pport = process.env.PSQL_PORT || 5432;


var testhost = env.SHAPES_TEST_HOST || '127.0.0.1'
var testport = env.SHAPES_TEST_PORT || 3000


describe ('shape_service', function(){

    describe('points db table', function(){
        var app,server;

        before(
            function(done){
                app = express()
                      .use(express.cookieParser('barley Waterloo Napoleon Mareschal Foch bravest'))
                      .use(express.session({ store: new RedisStore }))

                app.get('/points/:zoom/:column/:row.:format'
                       ,shape_service({'db':'osm'
                                      ,'table':'newtbmap.tvd'
                                      ,'alias':'tvd'
                                      ,'host':phost
                                      ,'username':puser
                                      ,'password':ppass
                                      ,'select_properties':{'tvd.freeway_id' : 'freeway'
                                                           ,'tvd.freeway_dir': 'direction'
                                                           ,"'vdsid_' || id"   : 'detector_id'
                                                           ,'vdstype'        : 'type'
                                                           }
                                      ,'id_col':'detector_id'
                                      })
                       )
                server=http
                       .createServer(app)
                       .listen(testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should produce vds points in a box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+testport+'/points/11/354/820.json'
                   url:'http://'+ testhost +':'+testport+'/points/15/5653/13125.json'
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
                           console.log(c.features[0])
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

        before(
            function(done){
                app = express()
                      .use(express.cookieParser('barley Waterloo Napoleon Mareschal Foch bravest'))
                      .use(express.session({ store: new RedisStore }))

                app.get('/lines/:zoom/:column/:row.:format'
                       ,shape_service({'db':'spatialvds'
                                      ,'table':'tempseg.mostusedroadbits'
                                      ,'alias':'murb'
                                      ,'host':phost
                                      ,'username':puser
                                      ,'password':ppass
                                      ,'select_properties':{'murb.refnum' : 'freeway'
                                                           ,'murb.direction': 'direction'
                                                           ,"detector_id"   : 'detector_id'
                                                           ,'components'    : 'components'
                                                           ,'year'          : 'year'
                                                           }
                                      ,'id_col':['detector_id','direction','year']
                                      ,'geo_col':'seggeom'
                                      })
                       )
                server=http
                       .createServer(app)
                       .listen(testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should get lines for freeways in a box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+testport+'/lines/11/354/820.json'
                   url:'http://'+ testhost +':'+testport+'/lines/15/5653/13125.json'
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
                           console.log(c.features[0])
                           var m = c.features[0]
                           console.log('line features: '+JSON.stringify(m))
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

        before(
            function(done){
                app = express()
                      .use(express.cookieParser('barley Waterloo Napoleon Mareschal Foch bravest'))
                      .use(express.session({ store: new RedisStore }))
                var shape_handler = shape_service({'db':'spatialvds'
                                      ,'table':'public.carb_counties_aligned_03'
                                      ,'alias':'counties'
                                      ,'host':phost
                                      ,'username':puser
                                      ,'password':ppass
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
                       ,shape_handler
                       )
                app.get('/areas.:format'
                       ,shape_handler)
                
                server=http
                       .createServer(app)
                       .listen(testport,done)

            })
        after(function(done){
            server.close(done)
        })

        it('should get polygons for counties in a box'
          ,function(done){
               // load the service for vds shape data
               request({//url:'http://'+ testhost +':'+testport+'/areas/11/354/820.json'
                   url:'http://'+ testhost +':'+testport+'/areas/11/353/820.json'
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
                           console.log(c.features[0])
                           var m = c.features[0]
                           console.log('area features: '+JSON.stringify(m))
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
               request({//url:'http://'+ testhost +':'+testport+'/areas/11/354/820.json'
                   url:'http://'+ testhost +':'+testport+'/areas.json'
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
                           console.log(c.features[0])
                           var m = c.features[0]
                           console.log('area features: '+JSON.stringify(m))
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
})
