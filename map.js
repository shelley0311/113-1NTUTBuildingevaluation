
var chart;
var option;


function init(centerCoord) {
    //設定Mapbox的取用Token。
    mapboxgl.accessToken = 'pk.eyJ1IjoiYmlhYm9ibyIsImEiOiJjamVvejdlNXQxZnBuMndtdWhiZHRuaTNpIn0.PIS9wtUxm_rz_IzF2WFD1g';
    chart = echarts.init(document.getElementById('map'));

    //設定echarts載入mapbox的參數值
    option = {
        mapbox3D: {
            style: 'mapbox://styles/mapbox/light-v11', //調顏色
            center: [centerCoord[1], centerCoord[0]],
            zoom: 17.5,
            pitch: 40, //傾斜角度
            altitudeScale: 1,
            shading: 'color',
            postEffect: {
                enable: true,
                SSAO: {
                    enable: true,
                    radius: 2
                }
            },
            light: {
                main: {
                    intensity: 1,
                    shadow: true,
                    shadowQuality: 'high'
                },
                ambient: {
                    intensity: 0.
                }
            }
        },
        //建立視覺對應顏色規則
        visualMap: {
            type: 'piecewise',
            pieces: [
                { gte: 80, label: '擁擠 >= 80', color: '#4B4376' },
                { gt: 50, lt: 80, label: '中度擁擠 50-79', color: '#AE445A' },
                { gt: 20, lt: 50, label: '稍擁擠 20-49', color: '#E07B39' },
                { gt: 0, lte: 20, label: '空曠 <= 20', color: '#859F3D' },
                { lt: 0, label: '暫無資料', color: '#B59F78' } // 預設範圍
            ],
            dimension: 3,
            seriesIndex: [0, 1],
            itemWidth: 36,
            itemHeight: 26,
            itemGap: 16,
            hoverLink: false,
            left: 20,
            bottom: 50,
            fontSize: 16,
            textStyle: {
                'color': 'black',
                'fontSize': 16
            }
        }
    };
}

//載入每個數據點
let allSeries = []; // 全局數據存儲

function loadScatterFlightPlanPath(data, routeName) {
    // 複製數據以防止修改原始數據
    const newData = JSON.parse(JSON.stringify(data));

    // 將起點標記為箭頭或其他符號，並更改顏色
    if (newData.length > 0) {
        newData[0].symbol = 'triangle'; // 設置起點為箭頭樣式
        newData[0].symbolSize = 15;      // 調整起點符號大小
        newData[0].itemStyle = {
            color: '#405D72', // 新增顏色設置
            opacity: 1.0
        };
    }

    // 創建新的路徑數據
    const newSeries = {
        name: routeName, // 每條路徑名稱
        type: 'scatter3D',
        coordinateSystem: 'mapbox3D',
        symbol: 'circle',
        symbolSize: 8,
        animation: false,
        data: newData,
        label: {
            show: false
        },
        emphasis: {
            itemStyle: {
                borderWidth: 0.3,
                borderColor: 'white'
            }
        }
    };

    // 將新路徑數據追加到全局數據中
    allSeries.push(newSeries);

    // 更新圖表配置
    chart.setOption({ series: allSeries });
}


//建立要餵入echarts的3D資料格式
function create3dFlightPointData(datas) {
    var processDatas = {}
    for (var i = 0; i < datas.length; i++) {
        var height = datas[i][2];
        var lDatas = [];
        if (height.toString() in processDatas) {
            lDatas = processDatas[height.toString()];
        }
        lDatas.push([datas[i][0], datas[i][1]]);
        processDatas[height.toString()] = lDatas;
    }
    var threeDNoiseData = generate3dNoiseData();
    var count = 0;
    var new_all_datas = []
    for (var key in processDatas) {
        var pDatas = processDatas[key];
        var pDatasLengh = pDatas.length / 4;
        for (var i = 0; i < pDatasLengh; i++) {
            j = i * 4;
            coords_data = [pDatas[j], pDatas[j + 1], pDatas[j + 2], pDatas[j + 3], pDatas[j]];
            var pPointDatas = getPointsFromLineByStaticDistance(coords_data);
            for (var j = 0; j < pPointDatas.length; j++) {
                new_all_datas.push([pPointDatas[j][0], pPointDatas[j][1], parseInt(key), threeDNoiseData[count]]);
                count += 1;
            }
        }
    }
    return new_all_datas;
}

//建立3D自然噪聲點數據(For demo)
function generate3dNoiseData() {
    var noise = new SimplexNoise(Math.random);
    var data = [];
    for (var i = 0; i < 100; i++) {
        for (var j = 0; j < 100; j++) {
            for (var k = 0; k < 100; k++) {
                var value = noise.noise3D(i / 20, j / 20, k / 20) * 60 + 10;
                data.push(value);
            }
        }
    }
    return data;
}

//建立自然噪聲點數據(For demo)
function createNoiseData(point_count) {
    var noise = new SimplexNoise(Math.random);
    var noise_data = [];
    var c = Math.ceil(Math.sqrt(point_count));
    for (var i = 0; i < c + 1; i++) {
        for (var j = 0; j < c + 1; j++) {
            var value = noise.noise2D(i / 20, j / 20) * 40 + 40;
            noise_data.push(value);
        }
    }
    return noise_data;
}

//建立要餵入echarts的格式
function createFlightPointsData(gpsList, height) {
    //建立自然噪聲點數據(For demo)
    let noiseData = createNoiseData(gpsList.length);
    var coord_data = [];
    for (var k = 0; k < gpsList.length; k++) {
        var gps = gpsList[k];
        coord_data.push({
            name: '',
            value: [gps[0], gps[1], height, noiseData[k]],
            itemStyle: {
                'color': '#758694', //條線的顏色
                'opacity': 0.8
            }
        });
    }
    return coord_data;
}

//建立要餵入echarts的格式
function createFlightPointsDataByHeightRange(gpsList, circle_count, min_height, max_height) {
    //計算每點上升高度
    var eachHeight = (max_height - min_height) / circle_count;
    var stepHeight = eachHeight / 360.0;
    var currentHeight = min_height;
    //建立自然噪聲點數據(For demo)
    let noiseData = createNoiseData(gpsList.length);
    var coord_data = [];
    for (var k = 0; k < gpsList.length; k++) {
        var gps = gpsList[k];
        coord_data.push({
            name: '',
            value: [gps[0], gps[1], currentHeight += stepHeight, noiseData[k]],
            itemStyle: {
                'color': 'white',
                'opacity': 0.8
            }
        });
    }
    return coord_data;
}

function setScatterToMap(data) {
    chart.setOption({
        series: [{
            name: 'Flight Path Point',
            type: 'scatter3D',
            coordinateSystem: 'mapbox3D',
            symbol: 'circle',
            symbolSize: 8,
            animation: false,
            data: data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    borderWidth: 0.3,
                    borderColor: 'white'
                }
            }
        }]
    });
}




function createRoute(line) {
    // 檢查是否有提供經緯度數據
    if (!line || line.length < 2) {
        console.error("需要至少兩個經緯度點來繪製路徑");
        return [];
    }

    // 將經緯度數據轉換為 ECharts 支援的格式
    return createFlightPointsData(getPointsFromLineByStaticDistance(line), 10); // 高度設為 0
}





//Tools
//獲得地理線段上每隔特定距離的每點座標
function getPointsFromLineByStaticDistance(line) {
    //lineString: 2個或以上的點組成的線
    var lineString = turf.lineString(line);
    //lineChunk: （lineString, 分割距離(預設單位:公里), 可選參數）
    var chunk = turf.lineChunk(lineString, 0.01, {});
    var new_data = [];
    for (var i = 0; i < chunk.features.length; i++) {
        new_data.push(chunk.features[i].geometry.coordinates[0]);
    }
    return new_data;
}

//角度轉弧度
function degrees_to_radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

//載入地圖
function loadMap() {
    //進行echarts設定，餵入之前定義好的常數-option
    chart.setOption(option, true);
    //從echarts取得mapbox的實體
    var map = chart.getModel().getComponent("mapbox3D")._mapbox;
    //地圖圖資載入完畢後，顯示在Mapbox上的3D建築物圖層。
    map.on('load', function () {
        var layers = map.getStyle().layers;
        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }
        map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#f0f0f0',
                'fill-extrusion-height': [
                    "interpolate", ["linear"],
                    ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"],
                    ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
        addStartPointLabel(map);
    });
}

function addStartPointLabel(map) {
    // 添加 "起點" 的 Source
    map.addSource('start-points', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [121.5330177757502, 25.04262384712401] // 起點 1
                    },
                    'properties': {
                        'title': '起點 1'
                    }
                },
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [121.5354472591137, 25.043422929042833] // 起點 2
                    },
                    'properties': {
                        'title': '起點 2'
                    }
                },
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [121.53527833346531, 25.042596049647827] // 起點 3
                    },
                    'properties': {
                        'title': '起點 3'
                    }
                }
            ]
        }
    });

    // 添加顯示 "起點" 的 Layer
    map.addLayer({
        'id': 'start-point-labels',
        'type': 'symbol',
        'source': 'start-points',
        'layout': {
            'text-field': ['get', 'title'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.5],  // 偏移量，將文字顯示在點上方
            'text-anchor': 'top',
            'text-size': 14  // 字體大小
        },
        'paint': {
            'text-color': '#FFB300' // 字體顏色，這裡設置為紅色
        }
    });
}
