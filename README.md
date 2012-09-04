# Shapes PostGIS

This library is an attempt to combine the many different services I've
written over the past two years or so that customize access to a
particular PostGIS table.

The basic idea is to point the service at a PostGIS table, and it will
in turn spit back GeoJSON data in response to the usual
zoom/column/row type queries from map clients like Polymaps,
OpenLayers, and so on.

