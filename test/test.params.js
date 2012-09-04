/* global require console process it describe */

// these tests are for a user, but not one with admin privs

var should = require('should')

var request = require('request');
var async = require('async')
var _ = require('underscore');
var sgg = require('../lib/shape_geojson_generation')

describe('shape service options'
        ,function(){
             it('should require an options object'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service()
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })

             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({})
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })
             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({'db':'database'})
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })
             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({'db':'database'
                                                    ,'username':'userdude'})
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })
             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({'db':'database'
                                                    ,'username':'userdude'
                                                    ,'password':'secret message'})
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })
             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({'db':'database'
                                                    ,'username':'userdude'
                                                    ,'password':'secret message'
                                                    ,'table':'segment_geometry'})
                    }catch(err){
                        should.exist(err)
                    }
                    done()
                })
             it('should require a required options'
               ,function(done){
                    var service;
                    try{
                        service = sgg.shape_service({'db':'database'
                                                    ,'username':'userdude'
                                                    ,'password':'secret message'
                                                    ,'table':'segment_geometry'
                                                    ,'select_properties':['vds_id']})
                    }catch(err){
                        should.not.exist(err)
                    }
                    done()
                })

         })

