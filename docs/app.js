
var start = document.getElementById("start");
var end = document.getElementById("end");
var submit = document.getElementById("submit");

submit.addEventListener("click", function() {
  origin = start.value;
  destination = end.value;
  findLatLong(origin, destination);
})

//Variables used in locating Bixi stations
var stationLat;
var stationLng;

//Coordinates from origin and destination addresses, used in Haversine formula
var originCoords = {
  la: "",
  lo: ""
}

var destinationCoords = {
  la: "",
  lo: ""
}

//Coordinates for the origin and destination Citi Bike stations
var originStation = {
  la: undefined,
  lo: undefined,
  fullCoords: undefined
}

var destinationStation = {
  la: undefined,
  lo: undefined,
  fullCoords: undefined
}

//turns origin and destination addresses into coordinates for Haversine formula
var findLatLong = function(origin, destination) {
  $.ajax({
    url: "https://maps.googleapis.com/maps/api/geocode/json?address=" + origin + "&bounds=45.414940, -73.752011|45.435525, -73.378053",
    dataType: "json",
    success: function(data) {
      originCoords.la = data["results"][0]["geometry"]["location"]["la"];
      originCoords.lo = data["results"][0]["geometry"]["location"]["lo"];
    }
  })

  $.ajax({
    url: "https://maps.googleapis.com/maps/api/geocode/json?address=" + destination + "&bounds=45.414940, -73.752011|45.435525, -73.378053",
    callback: JSON,
    success: function(data) {
      destinationCoords.lat = data["results"][0]["geometry"]["location"]["la"];
      destinationCoords.lng = data["results"][0]["geometry"]["location"]["lo"];
    }
  }).done(function() {
    findBixiBike();
  })
}

//Queries Bixi Bike data, calls findClosestStation
var findBixiBike = function() {
  $.ajax({
    url: "https://secure.bixi.com/data/stations.json",
    dataType: "jsonp",
    jsonpCallback: 'callback',
  }).done(function(data) {
    findClosestStation(data);
  });
}

//Loops through Bixi Bike data, finds closest stations to origin and destination addresses
var findClosestStation = function(data) {

  //Variables for storing distance between stations and origin/destination addresses
  originHaversineResult = undefined;
  destinationHaversineResult = undefined;

  originStation.la = undefined;
  originStation.lo = undefined;
  shortestOriginDistance = 10000;

  destinationStation.la = undefined;
  destinationStation.lo = undefined;
  shortestDestinationDistance = 10000;

  for (var i = 0; i < data.length; i++) {
    //loops through Bixi Bike station data and formats coordinates for Haversine formula
    var citiLat = (data[i]["la"]).toString()
    var citiLng = (data[i]["lo"]).toString()
    formatCitiCoords(citiLat);
    formatCitiCoords(citiLng);

    //Haversine formula compares station coordinates to origin and destination coordinates
    haversine(originCoords.la, originCoords.lo, stationLat, stationLng, "origin");
    haversine(destinationCoords.la, destinationCoords.lo, stationLat, stationLng, "destination")

    // Finds closest origin station with at least two bikes
    if (originHaversineResult < shortestOriginDistance) {
      if (data[i]["ba"] > 2) {
        shortestOriginDistance = originHaversineResult;
        originStation.la = stationLat;
        originStation.lo = stationLng;
        stationData.originName = data[i]["s"]
        stationData.numBikes = data[i]["ba"]
      }
    }

    // Finds closest destination station with at least five docking slots availble
    if (destinationHaversineResult < shortestDestinationDistance) {
      if (data[i]["da"] >= 5) {
        shortestDestinationDistance = destinationHaversineResult;
        destinationStation.la = stationLat;
        destinationStation.lo = stationLng;
        stationData.destinationName = data[i]["s"]
        stationData.numSlots = data[i]["da"]
      }
    }
  }

  fillHandlebars(stationData)
  originStation.fullCoords = originStation.la + ", " + originStation.lo;
  destinationStation.fullCoords = destinationStation.la + ", " + destinationStation.lo;

  // Resets Haversine variables for subsequent directions searches
  originHaversineResult = undefined;
  destinationHaversineResult = undefined;
};

//Formats Citi Bike coordinates so they can be passed into haversine formula
var formatCitiCoords = function(coord) {
  if (coord[0] == "-") {
    var formattedCoord = [coord.slice(0, 3), ".", coord.slice(3)].join('');
    stationLng = parseFloat(formattedCoord);
  } else {
    var formattedCoord = [coord.slice(0, 2), ".", coord.slice(2)].join('');
    stationLat = parseFloat(formattedCoord);
  }
}

//Converts lat and lng to radians for Haversine formula
toRadians = function(num) {
  return num * Math.PI / 180;
}

//Haversine Formula, determines distance between two sets of lat/lng points
var haversine = function(lat1, lng1, lat2, lng2, location) {
  var R = 6371;
  var φ1 = toRadians(lat1);
  var φ2 = toRadians(lat2);
  var deltaLat = lat2 - lat1;
  var deltaLng = lng1 - lng2;
  var Δφ = toRadians(deltaLat);
  var Δλ = toRadians(deltaLng);
  var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;

  // Returns different value depending on if we're looking for the origin or destination station
  if (location == "origin") {
    originHaversineResult = d;
  } else if (location == "destination") {
    destinationHaversineResult = d
  }
}

//Draws map on page after origin/destination information is filled in and stations have been located.
function initMap() {
  var gmaps = google.maps
  var map = new gmaps.Map(document.getElementById('map-canvas'), {
      center: new gmaps.LatLng(45.5, -73.5),
      zoom: 13
    })

    // Search box/autocomplete functinality
    var startSearchBox = new google.maps.places.SearchBox(start);
    var endSearchBox = new google.maps.places.SearchBox(end);

    // Bias the searchbox autocomplete results to current map's viewport
    map.addListener('bounds_changed', function() {
      startSearchBox.setBounds(map.getBounds());
    });

    var App = {
      map: map,
      bounds: new gmaps.LatLngBounds(),
      directionsService: new gmaps.DirectionsService(),
      directionsDisplay1: new gmaps.DirectionsRenderer({
        map: map,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: 'yellow'
        }
      }),
      directionsDisplay2: new gmaps.DirectionsRenderer({
        map: map,
        preserveViewport: true,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: 'blue'
        }
      }),
      directionsDisplay3: new gmaps.DirectionsRenderer({
        map: map,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: 'yellow'
        },
      })
    },
    startLeg = {
      origin: origin,
      destination: originStation.fullCoords,
      travelMode: gmaps.TravelMode.WALKING
    },
    middleLeg = {
      origin: originStation.fullCoords,
      destination: destinationStation.fullCoords,
      travelMode: gmaps.TravelMode.BICYCLING
    },
    endLeg = {
      origin: destinationStation.fullCoords,
      destination: destination,
      travelMode: gmaps.TravelMode.WALKING
    };

  App.directionsService.route(startLeg, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      App.directionsDisplay1.setDirections(result);
      document.getElementById("one").innerHTML = "";
      App.directionsDisplay1.setPanel(document.getElementById("one"));
      App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
    }
  });

  App.directionsService.route(middleLeg, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      App.directionsDisplay2.setDirections(result);
      document.getElementById("two").innerHTML = "";
      App.directionsDisplay2.setPanel(document.getElementById("two"));
      App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
    }
  });

  App.directionsService.route(endLeg, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      App.directionsDisplay3.setDirections(result);
      document.getElementById("three").innerHTML = "";
      App.directionsDisplay3.setPanel(document.getElementById("three"));
      App.map.fitBounds(App.bounds.union(result.routes[0].bounds));
    }
  });
}

// Handlebars template containers
var directionsOne = document.getElementById("directions-one")
var directionsTwo = document.getElementById("directions-two")

//Handlebars source data
var stationData = {
  originName: undefined,
  numBikes: undefined,
  destinationName: undefined,
  numSlots: undefined
}

//Fills handlebars template
var fillHandlebars = function(object) {
  directionsOne.innerHTML = "";
  directionsTwo.innerHTML = "";
  var templateSourceOne = document.getElementById('directions-template-one').innerHTML;
  var templateSourceTwo = document.getElementById('directions-template-two').innerHTML;
  var templateOne = Handlebars.compile(templateSourceOne);
  var templateTwo = Handlebars.compile(templateSourceTwo);
  var containerOne = document.getElementById('directions-one');
  var containerTwo = document.getElementById('directions-two');
  var computedHtmlOne = templateOne(object);
  var computedHtmlTwo = templateTwo(object);
  var filledTemplateOne = document.createElement("span");
  var filledTemplateTwo = document.createElement("span");
  filledTemplateOne.innerHTML = computedHtmlOne;
  filledTemplateTwo.innerHTML = computedHtmlTwo;
  directionsOne.appendChild(filledTemplateOne);
  directionsTwo.appendChild(filledTemplateTwo);
}

//Initializes map after all ajax requests are done.
$(document).ajaxStop(function() {
  initMap();
})
