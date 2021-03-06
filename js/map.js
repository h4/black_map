"use strict";

(function (window, document, undefined) {
    ymaps.ready(init);
    var map;
    var mapContainer = document.getElementsByClassName("map")[0];

    function init(){
        var blackMapType;
        var placemarks = $(mapContainer).data('placemarks');

        ymaps.layer.storage.add('bm#common', getLayer);
        blackMapType = new ymaps.MapType('BM', ['bm#common']);
        ymaps.mapType.storage.add('bm#common', blackMapType);

        map = new ymaps.Map(mapContainer, {
            center: [37, 20],
            zoom: 1,
            controls: ['zoomControl']
        });

        map.setType("bm#common");

        observeEvents(map);
        addPlacemarks(map, placemarks);
    }

    function getLayer() {
        var tileUrl = $(mapContainer).data('tileurl');
        var layer = new ymaps.Layer(tileUrl);
        layer.getZoomRange = function() {
            return ymaps.vow.resolve([0, 2]);
        };

        return layer;
    }

    function addPlacemarks(map, placemarks) {
        var BalloonLayout = ymaps.templateLayoutFactory.createClass(
            '<div class="map-popup">' +
                '<div class="map-popup__arrow"></div>' +
                '<div class="map-popup__closer">&times;</div>' +
                '<div class="map-popup__content"></div>' +
            '</div>',

            {
                build: function () {

                    this.constructor.superclass.build.call(this);

                    var _parent = this.getParentElement();

                    this.$element = $('.map-popup', _parent);
                    this.$closer = $('.map-popup__closer', this.$element);
                    this.$mainContent = $('.map-popup__content', this.$element);

                    this._loadMainContent();
                    this._applyElementOffset();
                    this._attachListeners();
                },

                clear: function () {
                    this._detachListeners();
                    this.constructor.superclass.clear.call(this);
                },

                _applyElementOffset: function () {
                    this.$element.css({
                        left: -(this.$element[0].offsetWidth / 2),
                        top: -(this.$element[0].offsetHeight + this.$element.find('.map-popup__arrow')[0].offsetHeight)
                    });
                },

                _attachListeners: function () {
                    this.$closer
                        .on('click', $.proxy(this._onCloseButtonClick, this));
                },

                _detachListeners: function () {
                    this.$closer.off('click');
                },

                _onCloseButtonClick: function (e) {
                    e.preventDefault();

                    // Правильный способ закрыть балун.
                    this.events.fire('userclose');
                },

                _loadMainContent: function () {
                    var props = this.getData().properties;
                    var self = this;

                    $.get(props.get('host') + props.get('itemId'), function(data) {
                        self.$mainContent.html(data);
                    });
                }
            }
        );


        var placemarkOptions = {
            iconLayout: 'default#image',
            iconImageHref: $(mapContainer).data('placemarkurl'),
            iconImageSize: [20, 26],
            iconImageOffset: [-10, -26],
            iconShape: {
                type: 'Circle',
                coordinates: [0, 0],
                radius: 20
            },
            balloonLayout: BalloonLayout,
            ballooncloseButton: false
        };

        for (var i=0, l=placemarks.length; i<l; i++) {
            var item = placemarks[i];
            var placemark = new ymaps.Placemark(item.coords, {
                itemId: item.itemId,
                host: $(mapContainer).data('popupcontenturl')
            }, placemarkOptions);


            map.geoObjects.add(placemark);
        }
    }

    function observeEvents (map) {
        var mapEventsGroup,
            mapBalloonEventsGroup = map.balloon.events
                // При открытии балуна начинаем слушать изменение центра карты.
                .add('open', function (e1) {
                    var placemark = e1.get('target');

                    // Вызываем функцию в двух случаях:
                    mapEventsGroup = map.events.group()
                        // 1) в начале движения (если балун во внешнем контейнере);
                        .add('actiontick', function (e2) {
                            if (placemark.options.get('balloonPane') == 'outerBalloon') {
                                setBalloonPane(placemark, e2.get('tick'));
                            }
                        })
                        // 2) в конце движения (если балун во внутреннем контейнере).
                        .add('actiontickcomplete', function (e2) {
                            if (placemark.options.get('balloonPane') != 'outerBalloon') {
                                setBalloonPane(placemark, e2.get('tick'));
                            }
                        });

                    // Вызываем функцию сразу после открытия.
                    setBalloonPane(placemark);
                })
                // При закрытии балуна удаляем слушатели.
                .add('close', function () {
                    mapEventsGroup.removeAll();
                });
    }

    function setBalloonPane (placemark, mapData) {
        mapData = mapData || {
            globalPixelCenter: map.getGlobalPixelCenter(),
            zoom: map.getZoom()
        };

        var mapSize = map.container.getSize(),
            mapBounds = [
                [mapData.globalPixelCenter[0] - mapSize[0] / 2, mapData.globalPixelCenter[1] - mapSize[1] / 2],
                [mapData.globalPixelCenter[0] + mapSize[0] / 2, mapData.globalPixelCenter[1] + mapSize[1] / 2]
            ],
            balloonPosition = placemark.balloon.getPosition(),
        // Используется при изменении зума.
            zoomFactor = Math.pow(2, mapData.zoom - map.getZoom()),
        // Определяем, попадает ли точка привязки балуна в видимую область карты.
            pointInBounds = ymaps.util.bounds.contains(mapBounds, [
                    balloonPosition[0] * zoomFactor,
                    balloonPosition[1] * zoomFactor
            ]),
            isInOutersPane = placemark.options.get('balloonPane') == 'outerBalloon';

        // Если точка привязки не попадает в видимую область карты, переносим балун во внутренний контейнер
        if (!pointInBounds && isInOutersPane) {
            placemark.options.set({
                balloonPane: 'balloon',
                balloonShadowPane: 'shadows'
            });
            // и наоборот.
        } else if (pointInBounds && !isInOutersPane) {
            placemark.options.set({
                balloonPane: 'outerBalloon',
                balloonShadowPane: 'outerBalloon'
            });
        }
    }

})(window, document, undefined);
