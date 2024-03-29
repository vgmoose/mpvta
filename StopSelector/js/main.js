// Javascript for parsing and displaying departure information
var url = "http://bustracker.pvta.com/InfoPoint/rest/";

$(function() {
  // Load the BusInfoBoard with the selected stops
  $( '.go-button').on('click', function() {
    // Buttons are the row after the stop selector
    var stops = $(this).parents('.row').prev().find('.stops').val();
    document.location.href = busBoardURL(stops);
  });

  // List of all PVTA routes
  var routes = $('.routes');
  var routeStops = $('.route-stops');

  // Use the Chosen jQuery plugin for our multiple select boxes
  routes.chosen();
  routeStops.chosen();
  $('.nearby-stops').chosen();

  // When a route is added or removed from the list, reload the list of stops
  // accessible by those routes
  routes.on("change", function() {
    var routes = $('.routes').val() || [];
    var remainingRoutes = routes.length;
    var stops = [];
    // For each route selected, we get a list of stops
    for (var i = 0; i < routes.length; i++) {
      $.ajax({
        url: url + "routedetails/get/" + routes[i],
        success: function(route_details) {
          stops.push(route_details.Stops);
          remainingRoutes--;
          if (remainingRoutes == 0) {
            // Put all of the stops into a single array and sort them
            stops = _.uniq(_.union(_.flatten(stops)), _.iteratee('StopId'));
            stops.sort(function(a,b) {
              if (a.Name > b.Name) {
                return 1;
              }
              if (a.Name < b.Name) {
                return -1;
              }
              return 0
            });
            stopList(routeStops, stops);
          }
        }
      });
    }
  });

  // Ask the user for their location
  get_location();

  // Load all of the routes from the InfoPoint API
  $.ajax({
    url: url + "routes/getvisibleroutes",
    success: function(route_data) {
      // Sort routes by Route name
      route_data.sort(function(a,b) {
        if (a.RouteAbbreviation > b.RouteAbbreviation) {
          return 1;
        }
        if (a.RouteAbbreviation < b.RouteAbbreviation) {
          return -1;
        }
        return 0
      });

      for (var i = 0; i < route_data.length; i++) {
        routes.append('<option value="' + route_data[i].RouteId + '">' +
            route_data[i].RouteAbbreviation + " " + route_data[i].LongName +
            '</option>');
      }
      // Refresh our list
      routes.trigger('chosen:updated');
    }
  });
});

function get_location() {
  if (Modernizr.geolocation) {
    return navigator.geolocation.getCurrentPosition(populate_list_geo, populate_list_no_geo);
  } else {
    // Fallback to no_geo option
    populate_list_no_geo();
  }
}

function populate_list_no_geo() {
  // Hide the nearby stops option
  $('.nearby-holder').hide();
  removeFade();
  
  // Then we'll populate the stop list once they select routes
}

function stopList(select, stops) {
  fadeBlack(function() {
    select.empty();
    for(var i = 0; i < stops.length; i++) {
      select.append('<option value="' + stops[i].StopId + '">' + stops[i].Name + '</option>');
    }
    select.trigger('chosen:updated');
    removeFade();
  });
}

function populate_list_geo(pos) {
  var select = $('.nearby-stops');
  var lat = pos.coords.latitude;
  var lon = pos.coords.longitude;

  $.ajax({
    url: url + "stops/getallstops",
    success: function(stop_data) {
      // Sort the stops by distance
      stop_data.sort(function(a,b) {
        return distance(lat, lon, a.Latitude, a.Longitude) - distance(lat, lon, b.Latitude, b.Longitude);
      });
      // Make sure we don't try to find more stops than exist.
      var stop_count = Math.min(10, stop_data.length);
      // Get the nearest few stops, removing duplicates that appear for some reason
      stop_data = _.uniq(stop_data.slice(0, stop_count), _.iteratee('StopId'));
      stopList(select, stop_data);
    }
  });
}

// Distance in miles
function distance(lat1, lon1, lat2, lon2) {
	var radlat1 = Math.PI * lat1/180
	var radlat2 = Math.PI * lat2/180
	var radlon1 = Math.PI * lon1/180
	var radlon2 = Math.PI * lon2/180
	var theta = lon1-lon2
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	return dist
}                                                                           

// Show our loader
function fadeBlack(callback) {
  if (typeof callback === "undefined") {
    callback = function(){};
  }

  var holder = $('.load-holder');
  holder.css({'z-index': 10});
  // If it's not black yet
  if (holder.hasClass('fade')) {
    holder.removeClass('fade');
    holder.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', callback);
  } else {
    callback();
  }
}

// Hide our loader
function removeFade(callback) {
  if (typeof callback === "undefined") {
    callback = function(){};
  }

  var holder = $('.load-holder');
  // If it's already gone
  if (holder.hasClass('fade')) {
    callback();
  } else {
    holder.addClass('fade');
    holder.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(e) {
      $(this).css({'z-index': -1});
      callback();
    });
  }
}

function busBoardURL(stops) {
  var url = window.location.href;
  
  // Remove trailing slash if it exists
  if (url.charAt(url.length-1) == "/") {
    url = url.slice(0,-1);
  }
  
  // Remove the last section of the URL, because the repo is structured with
  // the BusInfoBoard one directory up
  return url.split("/").slice(0,-1).join("/") + "?stops=" + stops.join("+");
}
