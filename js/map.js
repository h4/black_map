ymaps.ready(init);
var myMap;
var mapContainer = document.getElementsByClassName("map")[0];

function init(){
    myMap = new ymaps.Map(mapContainer, {
        center: [55.76, 37.64],
        zoom: 7
    });
}
