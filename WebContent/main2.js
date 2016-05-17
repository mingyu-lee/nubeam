var map = {
		width: 610,
		height: 600,
		colors: [
					'rgb(247,251,255)',
					'rgb(222,235,247)',
					'rgb(198,219,239)',
					'rgb(158,202,225)',
					'rgb(107,174,214)',
					'rgb(66,146,198)', 
					'rgb(33,113,181)', 
					'rgb(8,81,156)',
					'rgb(8,48,107)'
				] 
};

map.projection = d3.geo.mercator()
	.center([128, 36])
	.scale(4000)
	.translate([map.width/3, map.height/2]);

map.path = d3.geo.path().projection(map.projection);

map.svgMap = d3.select('#map').append('svg')
	.attr('width', map.width)
	.attr('height', map.height);

function readMap(path) {
	return new Promise(function (fulfill, reject) {
		d3.json(path, function(err, json) {
			var provinces = topojson.feature(json, json.objects['municipalities-geo']).features;
			
			if (err) reject(err);
			fulfill(provinces);
		});
	})
}

function readData(path) {
	return new Promise(function (fulfill, reject) {
		d3.json(path, function(err, json) {
			if (err) reject(err);
			fulfill(json);
		});
	})
}

function popByName(data) {
	var pops = d3.map();
	
	data.forEach(function (r) {
		pops.set(r.local_sub, +r.usage_5min_MWh)
	});
	
	return pops;
}

function setQuantize(data) {
	var data = data.map(function (r) {
		return +r.usage_5min_MWh;
	});
	
	return d3.scale.quantize()
		.domain([Math.min.apply(null, data), Math.max.apply(null, data)])
		//.domain([0, 300])
		.range(map.colors);
        //.range(d3.range(9).map(function(i) { return "p" + i; }));
}

function setProvinces(provinces, pops, quantize) {
	provinces.forEach(function (p) {
		p.properties.usage_5min_MWh = pops.get(p.properties.name);
		p.properties.quantized = quantize(p.properties.usage_5min_MWh);
	});
	
	return new Promise(function (fulfill, reject) {
		fulfill(provinces);
	});
}

function drawProvinces(provinces) {
	var paths = map.svgMap.selectAll('path').data(provinces);
	
	paths.transition().duration(1000)
		.attr('d', map.path)
		.attr('fill', function (p) {return p.properties.quantized; });
		
	paths.enter()
		.append('path')
		.attr('d', map.path)
		.attr("loc_name", function(p) {
                return p.properties.name_eng;
         })
		.attr('class', 'province')
		.attr('fill', function (p) { return p.properties.quantized; });
	
	paths.exit().remove();
	
	map.svgMap.selectAll('text')
		.data(provinces.filter(function(p) { return p.properties.name.endsWith("시"); }))
		.enter()
		.append('text')
		.attr('transform', function(p) { return 'translate(' + map.path.centroid(p) + ')'; })
		.attr('dy', '0.35em')
		.attr('class', 'region-label')
		.attr("id", function(p) {
        	  return p.properties.name_eng;
          })
        .text(function(p) {
              return Math.ceil(p.properties.usage_5min_MWh) + 'MWh';
          }); 
}
	
function drawLegend(scale) {
	var legend = d3.legend.color()
		.labelFormat(d3.format(',.0f'))
		.cells(9)
		.scale(scale);
	
	var div = d3.select('#map').append('div')
		.attr('class', 'legend');
	
	var svg = div.append('svg');
	
	svg.append('g')
		.attr('class', 'legendQuant')
		.attr('transform', 'translate(20,20)');
	
	svg.select('.legendQuant')
		.call(legend);
};

function drawTestMap() {
	Promise.all([readMap("./resources/municipalities-topo-simple.json"), readData('./resources/nabi.json')])
		.done(function (results) {
			var provinces = results[0];
			var data = results[1];
			
			var pops = popByName(data);
			var quantize = setQuantize(data);
			
			drawLegend(quantize);
			
			setProvinces(provinces, pops, quantize)
				.then(drawProvinces)
		});
}

drawTestMap();