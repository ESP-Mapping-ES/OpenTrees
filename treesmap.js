function toSpeciesCase(str) {
  str = str.replace(/\s+Sp./i, '');
  str = str.replace(/\s+Cultivar/i, '');
  str = str.replace(/\s+'.*$/g, '');
  return str.toLowerCase().replace(/^w\w/, function (txt) { return txt.toUpperCase(); });
}

function bookmark(bm) {
  bookmarks={ 
    "adelaide": { x: 138.6217, y: -34.9491, z: 13 },
    "melbourne": { x: 144.95, y: -37.8, z: 11 },
    "manningham": { x: 145.15, y: -37.77, z: 13},
    "geelong": { x: 144.5, y: -38.15, z: 11},
    "ballarat": { x: 143.83, y: -37.56, z: 12},
    "colac-otways": { x: 143.61, y: -38.4, z: 10},
    "corangamite": { x: 143.1, y: -38.3, z: 10},
    "waite": { x: 138.63, y: -34.97, z: 16 },
    "wyndham": { x: 144.62, y: -37.92, z: 12 },
    "burnside": { x: 138.6, y: -34.94, z: 14 }
  };
  if (b = bookmarks[bm]) {
    map.setView(L.latLng(b.y,b.x), b.z);
  }
}

function doBookmarks() {
    var matches = window.location.href.match(/#([a-z_-]+-[0-9]+)/);
    if (matches) {
      $.getJSON('http://www.opentrees.org:3000/trees?uniqueref=eq.' + matches[1], function(j) {
        // sometimes unique references aren't unique (eg, manningham-20171)
        j.forEach(function(tree) {
          var text = '<h2>' + tree.uniqueref + '</h2>' + 
          tree.genus + ' ' + tree.species

          map.setView(L.latLng(tree.lat,tree.lon), 16);
          L.marker([tree.lat, tree.lon]).addTo(map)
          .bindPopup(text)
          .openPopup();
          clickGrid({data: tree});
        });
      });
      return;
    }


    matches = window.location.href.match(/#([a-zA-Z0-9_-]+)/);
    if (matches) {
      bookmark(matches[1]);
    }
  
}

function clickGrid(e) {
  var d = e.data;
  if (d.source && d.ref) {
    window.location.hash = d.source + '-' + d.ref;
  } 
  if (!e.data || !e.data.genus)
    return;
  var wikiapi = 'http://en.wikipedia.org/w/api.php?action=query&format=json';
  var textapi = wikiapi + '&prop=extracts&redirects&titles=';
  var imageapi = wikiapi + '&prop=pageimages&redirects&titles=';
  var species = toSpeciesCase(e.data.genus + (e.data.species ? " " + e.data.species : ""));

  console.log('Searching Wikipedia for: ' + species);
  $.ajax(imageapi + encodeURIComponent(species), { dataType: 'jsonp', success: function(wikijson) {
    pages = wikijson.query.pages;
    page = pages[Object.keys(pages)[0]];
    if (page && page.thumbnail && page.thumbnail.source) {
      // TODO: if there is no high res image available, then the call to thumb/600px- fails. Not easy to handle
      // without making the failing call and then trying again.
      thumb = page.thumbnail.source.replace(/\/\d\dpx-/, L.Browser.retina ? '/600px-' : '/300px-');
      $("#wikiimg").html('<img src="' + thumb + '"/>');
      $("#wikiimg").append('<p><small><a href="https://en.wikipedia.org/wiki/File:' +page.pageimage + '">Source: Wikipedia. Click for attribution and licence.</a></small></p>');
    }
  }});
  $.ajax(textapi + encodeURIComponent(species), { dataType: 'jsonp', success: function(wikijson) {
    pages = wikijson.query.pages;
    page = pages[Object.keys(pages)[0]];
    if (page && page.extract) {
      $("#wikitext").html(page.extract +
        '<p><small>Source: <a href="http://en.wikipedia.org/wiki/' + encodeURIComponent(page.title) + '">Wikipedia</a></small></p>');
      $("#wikitext").show();
    } else {
      // not found
      $("#wikiimg").html('');
      $("#wikitext").html('Nothing on Wikipedia.');
    }
  }});
}

if (window.location.href.match("embed")) {
  // cut down some chrome for embedding
  $("#header").hide();
  $("#logo").hide();
  $("#map").css("height","100%");
}


var base = "http://guru.cycletour.org/tilelive/",
    mapName = "supertrees_f59571";
    
var map;    
$.getJSON(base + mapName + ".json", {}, function(tilejson) {
  //tilejson.grids[0] = "http://guru.cycletour.org/tile/supertrees/{z}/{x}/{y}.grid.json";
  tilejson.grids[0] = 'http://guru.cycletour.org/treetiles/{z}/{x}/{y}.grid.json?updated=8';
  tilejson.tiles[0] = 'http://guru.cycletour.org/treetiles/{z}/{x}/{y}.png?updated=8';
  tilejson.maxzoom = 22;
  tilejson.minzoom = 8;
  delete tilejson.bounds;

  var treegrid = L.mapbox.gridLayer(tilejson);
  map = L.mapbox.map ('map', tilejson, {
    zoom: 12,
    tileLayer: { detectRetina: true }
  });

  var osmtrees = L.tileLayer("http://guru.cycletour.org/tile/osmtrees/{z}/{x}/{y}.png" );
  var interestingtrees = L.tileLayer("http://guru.cycletour.org/interesting/{z}/{x}/{y}.png?updated=7", {
    detectRetina:true} );

  L.control.layers(
    [], { "OpenStreetMap trees": osmtrees, "Interesting trees": interestingtrees},
    { "collapsed": false, position: "bottomright" }
    ).addTo(map);
  map.setView(L.latLng(-38, 144), 9);
  doBookmarks();

  map.gridLayer.on('click', clickGrid);
});
