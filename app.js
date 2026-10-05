

    window.calculateRoute = function(lat, lon, resultId) {

        const result = document.getElementById(resultId);

        if (!navigator.geolocation) {
            result.innerHTML = "❌ تحديد الموقع غير مدعوم في هذا الجهاز.";
            return;
        }

        result.innerHTML = "⏳ جارٍ تحديد موقعك وحساب الطريق...";

        navigator.geolocation.getCurrentPosition(

            function(position) {

                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                const url =
                    "https://router.project-osrm.org/route/v1/driving/" +
                    userLon + "," + userLat + ";" +
                    lon + "," + lat +
                    "?overview=false";

                fetch(url)

                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error("Routing HTTP " + response.status);
                        }
                        return response.json();
                    })

                    .then(function(data) {

                        if (!data.routes || data.routes.length === 0) {
                            throw new Error("لم يتم العثور على طريق.");
                        }

                        const route = data.routes[0];

                        const distanceKm =
                            (route.distance / 1000).toFixed(1);

                        const durationMin =
                            Math.round(route.duration / 60);

                        result.innerHTML =
                            "📏 المسافة: <b>" +
                            distanceKm +
                            " كم</b><br>" +
                            "🚗 زمن الوصول بالسيارة: <b>" +
                            durationMin +
                            " دقيقة</b>";

                    })

                    .catch(function(error) {

                        console.error("Routing Error:", error);

                        result.innerHTML =
                            "❌ تعذر حساب الطريق. حاول مرة أخرى.";

                    });

            },

            function(error) {

                result.innerHTML =
                    "❌ يرجى السماح للتطبيق باستخدام موقعك الحالي.";

                console.error("Geolocation Error:", error);

            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };


document.addEventListener("DOMContentLoaded", function () {

        function getSiteImages(properties) {

            const images = [
                "museum rosetta.jpg",
                "tabyia al-abd.jpg",
                "port thonis, heracleion1.jpg",
                "port thonis, heracleion2.jpg",
                "port thonis, heracleion3.jpg",
                "port thonis, heracleion.jpg",
                "Antique Tahona.jpg",
                "Citadle Qitbai.jpg"
            ];

            function normalize(text) {
                 return String(text || "")
                     .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
                     .replace(/\s+/g, " ")
                     .trim();
            }

            const values = Object.values(properties)
                .filter(v => typeof v === "string")
                .map(v => normalize(v));

            return images.filter(function(image) {

                const imageName = normalize(
                    image.replace(/\.[^/.]+$/, "")
                );

                return values.some(function(value) {
                    return value.includes(imageName) ||
                           imageName.includes(value);
                });

            });
        }


    // =====================================================
    // إنشاء الخريطة
    // =====================================================

    const map = L.map("map").setView(
        [26.8206, 30.8025],
        6
    );



// =====================================================
// 🔎 البحث عن موقع تراثي
// =====================================================

const searchControl = L.control({
    position: "topleft"
});

searchControl.onAdd = function(map) {

    const container = L.DomUtil.create(
        "div",
        "leaflet-control"
    );

    container.style.background = "white";
    container.style.padding = "8px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 1px 5px rgba(0,0,0,0.4)";
    container.style.direction = "rtl";
    container.style.width = "220px";

    container.innerHTML = `
        <div style="
            font-weight:bold;
            margin-bottom:6px;
        ">
            🔎 ابحث عن موقع
        </div>

        <input
            id="heritageSearchInput"
            type="text"
            placeholder="اكتب اسم الموقع..."
            style="
                width:100%;
                box-sizing:border-box;
                padding:8px;
                border:1px solid #aaa;
                border-radius:5px;
                font-size:14px;
            "
        >

        <button
            id="heritageSearchButton"
            style="
                width:100%;
                margin-top:6px;
                padding:7px;
                border:1px solid #888;
                border-radius:5px;
                background:#f5f5f5;
                cursor:pointer;
                font-size:14px;
            "
        >
            🔍 بحث
        </button>

        <div
            id="heritageSearchResult"
            style="
                margin-top:6px;
                font-size:13px;
            "
        ></div>
    `;

    L.DomEvent.disableClickPropagation(container);

    const input =
        container.querySelector("#heritageSearchInput");

    const button =
        container.querySelector("#heritageSearchButton");

    const result =
        container.querySelector("#heritageSearchResult");


    function searchSite() {

        const searchText =
            input.value.trim().toLowerCase();

        if (!searchText) {

            result.innerHTML =
                "⚠️ اكتبي اسم الموقع أولاً.";

            return;
        }


        // التأكد من وجود طبقة المواقع
        if (
            typeof sitesLayer === "undefined" ||
            !sitesLayer.getLayers
        ) {

            result.innerHTML =
                "⏳ بيانات المواقع لم يتم تحميلها بعد.";

            return;
        }


        const layers =
            sitesLayer.getLayers();

        let foundLayer = null;


        // البحث داخل خصائص المواقع
        for (let i = 0; i < layers.length; i++) {

            const layer = layers[i];

            const properties =
                layer.feature &&
                layer.feature.properties
                    ? layer.feature.properties
                    : {};

            const values =
                Object.values(properties)
                    .filter(function(value) {
                        return value !== null &&
                               value !== undefined;
                    })
                    .map(function(value) {
                        return String(value).toLowerCase();
                    });


            const matched =
                values.some(function(value) {
                    return value.includes(searchText);
                });


            if (matched) {

                foundLayer = layer;
                break;
            }
        }


        // =================================================
        // إذا تم العثور على الموقع
        // =================================================

        if (foundLayer) {

            const bounds =
                foundLayer.getBounds
                    ? foundLayer.getBounds()
                    : null;


            if (bounds && bounds.isValid()) {

                map.fitBounds(
                    bounds,
                    {
                        padding: [50, 50],
                        maxZoom: 16
                    }
                );

            } else if (foundLayer.getLatLng) {

                map.setView(
                    foundLayer.getLatLng(),
                    16
                );
            }


            // فتح Popup الموقع
            if (foundLayer.openPopup) {
                foundLayer.openPopup();
            }


            result.innerHTML =
                "✅ تم العثور على الموقع.";

        } else {

            result.innerHTML =
                "❌ لم يتم العثور على موقع بهذا الاسم.";
        }
    }


    button.onclick = searchSite;


    input.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {
                searchSite();
            }

        }
    );


    return container;
};


searchControl.addTo(map);




// =====================================================
// زر فلترة المواقع
// =====================================================

const filterControl = L.control({
    position: "topright"
});

filterControl.onAdd = function(map) {

    const container = L.DomUtil.create(
        "div",
        "leaflet-bar filter-control"
    );

    container.style.background = "white";
    container.style.padding = "8px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 1px 5px rgba(0,0,0,0.4)";
    container.style.direction = "rtl";
    container.style.minWidth = "170px";

    container.innerHTML = `
        <button id="filterButton"
            style="
                width:100%;
                padding:8px;
                border:1px solid #999;
                border-radius:6px;
                background:white;
                cursor:pointer;
                font-size:14px;
            ">
            🔎 فلترة المواقع
        </button>

        <div id="filterMenu"
            style="
                display:none;
                margin-top:8px;
            ">

            <label style="display:block; margin:6px 0;">
                <input type="checkbox"
                       id="showSites"
                       checked>
                🏛️ المواقع الأثرية
            </label>

            <label style="display:block; margin:6px 0;">
                <input type="checkbox"
                       id="showAreas"
                       checked>
                🗺️ المناطق التراثية
            </label>

            <button id="showAll"
                style="
                    width:100%;
                    margin-top:6px;
                    padding:6px;
                    border:1px solid #999;
                    border-radius:5px;
                    background:#f5f5f5;
                    cursor:pointer;
                ">
                إظهار الكل
            </button>

        </div>
    `;

    L.DomEvent.disableClickPropagation(container);

    // فتح وإغلاق قائمة الفلترة
    const filterButton =
        container.querySelector("#filterButton");

    const filterMenu =
        container.querySelector("#filterMenu");

    filterButton.onclick = function() {

        if (filterMenu.style.display === "none") {
            filterMenu.style.display = "block";
        } else {
            filterMenu.style.display = "none";
        }

    };


    // المواقع الأثرية
    const showSites =
        container.querySelector("#showSites");

    showSites.onchange = function() {

        if (typeof heritageSitesLayer !== "undefined") {

            if (this.checked) {
                heritageSitesLayer.addTo(map);
            } else {
                map.removeLayer(heritageSitesLayer);
            }

        }

    };


    // المناطق التراثية
    const showAreas =
        container.querySelector("#showAreas");

    showAreas.onchange = function() {

        if (typeof heritageAreasLayer !== "undefined") {

            if (this.checked) {
                heritageAreasLayer.addTo(map);
            } else {
                map.removeLayer(heritageAreasLayer);
            }

        }

    };


    // إظهار الكل
    const showAll =
        container.querySelector("#showAll");

    showAll.onclick = function() {

        showSites.checked = true;
        showAreas.checked = true;

        if (typeof heritageSitesLayer !== "undefined") {
            heritageSitesLayer.addTo(map);
        }

        if (typeof heritageAreasLayer !== "undefined") {
            heritageAreasLayer.addTo(map);
        }

    };

    return container;
};

filterControl.addTo(map);



    // =====================================================
    // زر تحديد موقع المستخدم
    // =====================================================

    let userLocationMarker = null;
    let userLocationCircle = null;

    const locateControl = L.control({
        position: "topleft"
    });

    locateControl.onAdd = function(map) {

        const button = L.DomUtil.create(
            "button",
            "user-location-button"
        );

        button.innerHTML = "📍 موقعي الحالي";
        button.title = "تحديد موقعي الحالي";

        button.style.background = "white";
        button.style.padding = "8px 12px";
        button.style.border = "1px solid #999";
        button.style.borderRadius = "6px";
        button.style.cursor = "pointer";
        button.style.fontSize = "14px";

        L.DomEvent.disableClickPropagation(button);

        button.onclick = function() {

            if (!navigator.geolocation) {
                alert("❌ تحديد الموقع غير مدعوم في هذا الجهاز.");
                return;
            }

            button.innerHTML = "⏳ جاري تحديد الموقع...";

            navigator.geolocation.getCurrentPosition(

                function(position) {

                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    // حذف العلامة السابقة
                    if (userLocationMarker) {
                        map.removeLayer(userLocationMarker);
                    }

                    if (userLocationCircle) {
                        map.removeLayer(userLocationCircle);
                    }

                    // إضافة علامة موقع المستخدم
                    userLocationMarker = L.marker([lat, lon])
                        .addTo(map)
                        .bindPopup(
                            "📍 <b>موقعك الحالي</b><br>" +
                            "خط العرض: " + lat.toFixed(6) + "<br>" +
                            "خط الطول: " + lon.toFixed(6)
                        )
                        .openPopup();

                    // دائرة الدقة
                    userLocationCircle = L.circle(
                        [lat, lon],
                        {
                            radius: accuracy,
                            color: "blue",
                            fillOpacity: 0.15
                        }
                    ).addTo(map);

                    // الانتقال إلى موقع المستخدم
                    map.setView(
                        [lat, lon],
                        14
                    );

                    button.innerHTML = "📍 موقعي الحالي";
                },

                function(error) {

                    console.error(
                        "Geolocation Error:",
                        error
                    );

                    button.innerHTML = "📍 موقعي الحالي";

                    if (error.code === 1) {
                        alert(
                            "❌ تم رفض إذن الوصول إلى الموقع.\n" +
                            "يرجى السماح للمتصفح باستخدام موقعك."
                        );
                    }
                    else if (error.code === 2) {
                        alert(
                            "❌ تعذر تحديد موقعك الحالي."
                        );
                    }
                    else if (error.code === 3) {
                        alert(
                            "❌ انتهت مهلة تحديد الموقع."
                        );
                    }
                },

                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
        };

        return button;
    };

    locateControl.addTo(map);


    // =====================================================
    // OpenStreetMap
    // =====================================================

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    // =====================================================
    // Heritage Sites
    // =====================================================

    const sitesLayer = L.geoJSON(null, {

        pointToLayer: function (feature, latlng) {

            return L.circleMarker(latlng, {
                radius: 7,
                weight: 2,
                fillOpacity: 0.8
            });

        },

        onEachFeature: function (feature, layer) {

            const properties = feature.properties || {};

            const matchedImages = getSiteImages(properties);

            let popup = `
                <div style="
                    direction: rtl;
                    text-align: right;
                    max-height: 400px;
                    overflow-y: auto;
                ">

                    <h3>📍 موقع تراثي</h3>
            `;

            // =================================================
            // الصور
            // =================================================

            matchedImages.forEach(function(image) {

                popup += `
                    <img
                        src="./assets/images/${encodeURIComponent(image)}"
                        style="
                            width:100%;
                            max-height:220px;
                            object-fit:cover;
                            margin:8px 0;
                            border-radius:8px;
                        "
                    >
                `;

            });


            // =================================================
            // بيانات الموقع
            // =================================================

            Object.keys(properties).forEach(function(key) {

                const value = properties[key];

                if (
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                ) {

                    popup += `
                        <p>
                            <b>${key}:</b> ${value}
                        </p>
                    `;

                }

            });


            // =================================================
            // إحداثيات الموقع
            // =================================================

            const siteLatLng = layer.getLatLng();


            // =================================================
            // المسافة + زمن الوصول
            // =================================================

            const routeId =
                "route-result-" +
                Math.random().toString(36).substring(2, 10);


            popup += `

                <hr>

                <button
                    onclick="calculateRoute(
                        ${siteLatLng.lat},
                        ${siteLatLng.lng},
                        '${routeId}'
                    )"
                    style="
                        width:100%;
                        padding:10px;
                        border:none;
                        border-radius:8px;
                        cursor:pointer;
                        font-size:15px;
                    "
                >
                    📏 المسافة وزمن الوصول
                </button>

                <div
                    id="${routeId}"
                    style="
                        margin-top:10px;
                        padding:8px;
                        line-height:1.8;
                    "
                ></div>

            `;


            // =================================================
            // حالة الطقس
            // =================================================

            const weatherId =
                "weather-result-" +
                Math.random().toString(36).substring(2, 10);


            popup += `

                <button
                    onclick="getWeather(
                        ${siteLatLng.lat},
                        ${siteLatLng.lng},
                        '${weatherId}'
                    )"
                    style="
                        width:100%;
                        padding:10px;
                        margin-top:8px;
                        border:none;
                        border-radius:8px;
                        cursor:pointer;
                        font-size:15px;
                    "
                >
                    🌤️ حالة الطقس
                </button>

                <div
                    id="${weatherId}"
                    style="
                        margin-top:10px;
                        padding:8px;
                        line-height:1.8;
                    "
                ></div>

            `;


            popup += "</div>";

            layer.bindPopup(popup);

        }

    });


    // =====================================================
    // Heritage Areas
    // =====================================================

    const areasLayer = L.geoJSON(null, {

        style: function () {

            return {
                weight: 3,
                fillOpacity: 0.25
            };

        },

        onEachFeature: function (feature, layer) {

            const properties = feature.properties || {};

            const matchedImages = getSiteImages(properties);

            let popup = `
                <div style="
                    direction: rtl;
                    text-align: right;
                    max-height: 400px;
                    overflow-y: auto;
                ">
                    <h3>▰ منطقة تراثية</h3>
            `;

            matchedImages.forEach(function(image) {
                popup += `
                    <img
                        src="./assets/images/${encodeURIComponent(image)}"
                        style="
                            width:100%;
                            max-height:220px;
                            object-fit:cover;
                            margin:8px 0;
                            border-radius:8px;
                        "
                    >
                `;
            });

            Object.keys(properties).forEach(function (key) {

                const value = properties[key];

                if (
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                ) {

                    popup += `
                        <p>
                            <b>${key}:</b> ${value}
                        </p>
                    `;

                }

            });

            popup += "</div>";

            layer.bindPopup(popup);

        }

    });


    // =====================================================
    // قراءة Heritage Sites
    // =====================================================

    fetch("./heritagesites_converted.geojson")

        .then(function (response) {

            if (!response.ok) {
                throw new Error(
                    "HeritageSites HTTP " + response.status
                );
            }

            return response.json();

        })

        .then(function (data) {

            sitesLayer.addData(data);

            sitesLayer.addTo(map);

            console.log(
                "✅ Heritage Sites:",
                sitesLayer.getLayers().length
            );

        })

        .catch(function (error) {

            console.error(
                "HeritageSites Error:",
                error
            );

        });


    // =====================================================
    // قراءة Heritage Areas
    // =====================================================

    fetch("./heritageareas_converted.geojson")

        .then(function (response) {

            if (!response.ok) {
                throw new Error(
                    "HeritageAreas HTTP " + response.status
                );
            }

            return response.json();

        })

        .then(function (data) {

            areasLayer.addData(data);

            areasLayer.addTo(map);

            console.log(
                "✅ Heritage Areas:",
                areasLayer.getLayers().length
            );

        })

        .catch(function (error) {

            console.error(
                "HeritageAreas Error:",
                error
            );

        });


    // =====================================================
    // التحكم في الطبقات
    // =====================================================

    L.control.layers(

        null,

        {
            "📍 المواقع التراثية": sitesLayer,
            "▰ المناطق التراثية": areasLayer
        },

        {
            collapsed: false
        }

    ).addTo(map);


});



// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

// =====================================================
// حالة الطقس - Open-Meteo
// =====================================================

window.getWeather = async function(lat, lon, resultId) {

    const result = document.getElementById(resultId);

    if (!result) {
        console.error("Weather result element not found:", resultId);
        return;
    }

    // رسالة أثناء التحميل
    result.innerHTML = `
        <div style="
            background:#f5f5f5;
            padding:10px;
            border-radius:8px;
            text-align:center;
        ">
            ⏳ جاري تحميل حالة الطقس...
        </div>
    `;

    try {

        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}` +
            `&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
            `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
            `&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather request failed");
        }

        const data = await response.json();

        const current = data.current;
        const daily = data.daily;

        // =================================================
        // وصف حالة الطقس
        // =================================================

        const weatherText = {

            0: "☀️ سماء صافية",

            1: "🌤️ غائم جزئيًا",
            2: "⛅ غائم جزئيًا",
            3: "☁️ غائم",

            45: "🌫️ ضباب",
            48: "🌫️ ضباب",

            51: "🌦️ رذاذ خفيف",
            53: "🌦️ رذاذ",
            55: "🌧️ رذاذ كثيف",

            61: "🌧️ أمطار خفيفة",
            63: "🌧️ أمطار متوسطة",
            65: "🌧️ أمطار غزيرة",

            71: "🌨️ ثلوج خفيفة",
            73: "🌨️ ثلوج",
            75: "❄️ ثلوج غزيرة",

            80: "🌦️ زخات مطر",
            81: "🌦️ زخات مطر",
            82: "🌧️ زخات مطر غزيرة",

            95: "⛈️ عاصفة رعدية",
            96: "⛈️ عاصفة رعدية مع برد",
            99: "⛈️ عاصفة رعدية قوية"

        };

        const description =
            weatherText[current.weather_code] ||
            "🌤️ حالة الطقس غير محددة";


        // =================================================
        // عرض حالة الطقس
        // =================================================

        result.innerHTML = `

            <div style="
                background:#f7f7f7;
                border-radius:10px;
                padding:12px;
                margin-top:8px;
                line-height:1.9;
            ">

                <h4 style="
                    margin:0 0 10px 0;
                    text-align:center;
                ">
                    🌤️ حالة الطقس الحالية
                </h4>

                <p>
                    🌡️ <b>درجة الحرارة:</b>
                    ${current.temperature_2m} °C
                </p>

                <p>
                    🌡️ <b>درجة الحرارة المحسوسة:</b>
                    ${current.apparent_temperature} °C
                </p>

                <p>
                    💧 <b>الرطوبة:</b>
                    ${current.relative_humidity_2m}%
                </p>

                <p>
                    💨 <b>سرعة الرياح:</b>
                    ${current.wind_speed_10m} كم/س
                </p>

                <p>
                    <b>${description}</b>
                </p>

                <hr>

                <p>
                    🔺 <b>العظمى اليوم:</b>
                    ${daily.temperature_2m_max[0]} °C
                </p>

                <p>
                    🔻 <b>الصغرى اليوم:</b>
                    ${daily.temperature_2m_min[0]} °C
                </p>

            </div>

        `;

    }

    catch (error) {

        console.error("Weather Error:", error);

        result.innerHTML = `
            <div style="
                background:#ffecec;
                color:#b00000;
                padding:10px;
                border-radius:8px;
                text-align:center;
            ">
                ❌ تعذر تحميل حالة الطقس
            </div>
        `;

    }

};




