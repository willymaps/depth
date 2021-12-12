let bufferShown = false;
let hoveredPointId =  null;

function queryMap() {

    const dataName = ["OGF_ID"];

    // array to hold rendered features
    const featureArray = [];

    // path data within map view on load
    const features = map.queryRenderedFeatures({layers:['pathsLayer']});

    for (var i=0;i<features.length;i++) {

        const path = features[i].geometry.coordinates;

	    // array to hold attribute names for popup
	    let featureNameArray = {};

	    for (var p=0;p<dataName.length;p++) {

			pushToAry(dataName[p]);

        	function pushToAry(name) {
			    featureNameArray[name] = features[i].properties[name];
			}

		}

        let multiTrue = determineMulti(path);
        let bufferPath;
        if (multiTrue) {
            bufferPath = turf.multiLineString(path, featureNameArray);
        } else {
            bufferPath = turf.lineString(path, featureNameArray);
        }
        featureArray.push(bufferPath);

        if (i==features.length-1) {
            generateBuffers(featureArray);
        }
    };
};

function determineMulti(data) {
    let multi = false;
    for (let p=0;p<=data.length;p++) {
        if (Array.isArray(data[p][0])) {
            multi = true;
            return multi;
        }
        if (p === data.length-1) {
            return multi;
        }
    }
}

function generateBuffers(data) {

    const collection = turf.featureCollection(data);
    const bufferCollection = turf.featureCollection([]);
    const features = bufferCollection.features;

    let bufferSize = getBufferSize();

    turf.featureEach(collection, function (currentFeature, featureIndex) {
        const bufferPolygons = turf.buffer(currentFeature, bufferSize, {units: 'meters'});
        features.push(bufferPolygons);
    });

    addBufferLayer(bufferCollection);

}

function addBufferLayer(data) {

    if (initLoad) {

        initLoad = false;
        map.addSource('bufferData', {
            type: 'geojson',
            data: data
        });

        map.addLayer({
            'id': 'bufferLayer',
            'type': 'fill',
            'source': 'bufferData',
            'layout': {},
            'paint': {
                'fill-color': 'rgb(255,255,255)',
                "fill-opacity": 0,
                'fill-outline-color': 'coral'
            }
        }, 'pathsLayer');

        map.on('click', 'pointsLayer', (e) => {
            e.originalEvent.preventDefault();
            // e.preventDefault();
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['pointsLayer']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('points').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;
    
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        })
        .on('click', 'bufferLayer', (e) => {
            if(!e.originalEvent.defaultPrevented) {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['bufferLayer']
                });
            
                map.on('click', trailBack);
            
                document.getElementById('closeBtn').style.display = 'block';
                // map.off('click', 'bufferLayer', clickState);
                map.off('mousemove', 'bufferLayer', hoverState);
                map.off('mouseleave', 'bufferLayer', hoverStateOff);
            
                const bbox = turf.bbox(features[0]);
                map.fitBounds(bbox, {padding:30});
            }
        })
        .on('mousemove', 'bufferLayer', hoverState)
        .on('mouseleave', 'bufferLayer', hoverStateOff);

        // map.on('click', 'bufferLayer', clickState);
        // map.on('mousemove', 'bufferLayer', hoverState);
        // map.on('mouseleave', 'bufferLayer', hoverStateOff);

    } else {
        map.getSource('bufferData').setData(data);
    }

}

// function clickState(e) {
//     const features = map.queryRenderedFeatures(e.point, {
//         layers: ['bufferLayer']
//     });

//     map.on('click', trailBack);

//     document.getElementById('closeBtn').style.display = 'block';
//     map.off('click', 'bufferLayer', clickState);
//     map.off('mousemove', 'bufferLayer', hoverState);
//     map.off('mouseleave', 'bufferLayer', hoverStateOff);

//     const bbox = turf.bbox(features[0]);
//     map.fitBounds(bbox, {padding:30});
// }

function hoverState(e) {
    map.getCanvas().style.cursor = 'pointer';

    if (e.features.length > 0) {
        if (hoveredPointId !== null) {
            map.setFeatureState(
                { source: 'paths', id: hoveredPointId },
                { hover: false }
            );

            map.setFeatureState(
                { source: 'points', id: hoveredPointId },
                { hover: false }
            );
        }
        hoveredPointId = e.features[0].properties.OGF_ID;
        
        map.setFeatureState(
            { source: 'paths', id: hoveredPointId },
            { hover: true }
        );

        map.setFeatureState(
            { source: 'points', id: hoveredPointId },
            { hover: true }
        );

        const feature = map.querySourceFeatures("paths", { sourceLayer: ['pathsLayer'], filter: ['==', 'OGF_ID', hoveredPointId] });
        const attributes = {
            'OGF_ID': feature[0].properties.OGF_ID,
            'TRAIL_NAME': feature[0].properties.TRAIL_NAME,
            'ASSOC': feature[0].properties.ASSOC
        };

        const attributesArray = [];

        Object.keys(attributes).forEach(function(key) {
            attributesArray.push('<b>' + key + '</b>: ' + attributes[key] + '<br>');
        });

        const attributesClean = attributesArray.join('');
        document.getElementById('trailPopup').innerHTML = attributesClean;
    }
}

function hoverStateOff() {
    if (hoveredPointId !== null) {
        map.setFeatureState(
            { source: 'paths', id: hoveredPointId },
            { hover: false }
        );
        map.setFeatureState(
            { source: 'points', id: hoveredPointId },
            { hover: false }
        );
    }
    hoveredStateId = null;
}

function trailBack() {
    // let currentZoom = map.getZoom();
    // // map.setZoom(parseInt(currentZoom-2));

    // map.flyTo({
    //     zoom: currentZoom-1
    // })
    document.getElementById('closeBtn').style.display = 'none';
    hoverStateOff();
    map.off('click', trailBack)
    // map.on('click', 'bufferLayer', clickState);
    .on('mousemove', 'bufferLayer', hoverState)
    .on('mouseleave', 'bufferLayer', hoverStateOff);
}

function getBufferSize() {
    let currentZoom = map.getZoom();
    if (currentZoom > 8 &&  currentZoom <= 9) {
        return 500;
    } else if (currentZoom > 9 && currentZoom <= 10) {
        return 450;
    } else if (currentZoom > 10 && currentZoom <= 11) {
        return 400;
    } else if (currentZoom > 11 && currentZoom <= 12) {
        return 200;
    } else if (currentZoom > 12 && currentZoom <= 13) {
        return 100;
    } else if (currentZoom > 13 && currentZoom <= 14) {
        return 50;
    } else if (currentZoom > 14 && currentZoom <= 15) {
        return 30;
    } else if (currentZoom > 15 && currentZoom <= 16) {
        return 20;
    } else if (currentZoom > 16 && currentZoom <= 17) {
        return 15;
    }
}