// public/js/map.js

// 전역 네임스페이스 생성 (이미 존재하면 유지)
window.myApp = window.myApp || {};

// 전역 변수 선언
window.myApp.facilityMarkers = window.myApp.facilityMarkers || [];
window.myApp.mapInitialized = window.myApp.mapInitialized || false;
window.myApp.currentInfoWindow = window.myApp.currentInfoWindow || null;
window.myApp.routeMarkers = window.myApp.routeMarkers || [];
window.myApp.userLocation = window.myApp.userLocation || null;
window.myApp.directionsService = window.myApp.directionsService || null;
window.myApp.directionsRenderer = window.myApp.directionsRenderer || null;
window.myApp.userMarker = window.myApp.userMarker || null;

// initMap 함수 정의
function initMap() {
  console.log('initMap called.');

  if (window.myApp.mapInitialized) {
    console.log('Map has already been initialized.');
    return;
  }
  window.myApp.mapInitialized = true;

  console.log('Initializing map...');

  getUserLocation()
    .then((location) => {
      window.myApp.userLocation = location;
      console.log('User location retrieved:', window.myApp.userLocation);

      window.myApp.map = new google.maps.Map(document.getElementById('map'), {
        center: window.myApp.userLocation,
        zoom: 14,
      });
      console.log('Map initialized with user location.');

      window.myApp.directionsService = new google.maps.DirectionsService();
      window.myApp.directionsRenderer = new google.maps.DirectionsRenderer({
        map: window.myApp.map,
        suppressMarkers: true,
      });

      if (!window.myApp.userMarker) {
        window.myApp.userMarker = new google.maps.Marker({
          position: window.myApp.userLocation,
          map: window.myApp.map,
          title: '내 위치',
          icon: {
            url: '/images/user-location.png',
            scaledSize: new google.maps.Size(40, 40),
          },
        });
        console.log('User location marker added with custom icon.');
      }

      console.log('Map initialized without searching facilities on load.');
    })
    .catch((error) => {
      console.error('Error during map initialization:', error);
      alert(error.message || '사용자 위치를 가져올 수 없습니다.');
    });
}

/**
 * 사용자 위치 가져오기 함수
 * @returns {Promise<Object>} - 사용자 위치 { lat: Number, lng: Number }
 */
function getUserLocation() {
  console.log('Requesting user location...');
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('User location retrieved successfully:', position);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error retrieving user location:', error);
          let errorMessage = '';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '사용자가 위치 접근을 거부했습니다.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보가 이용 불가능합니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 요청이 시간 초과되었습니다.';
              break;
            default:
              errorMessage = '알 수 없는 오류가 발생했습니다.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const errorMsg = 'Geolocation이 이 브라우저에서 지원되지 않습니다.';
      console.error(errorMsg);
      reject(new Error(errorMsg));
    }
  });
}

/**
 * 내 위치로 이동하는 함수
 */
function goToMyLocation() {
  if (!window.myApp.userLocation) {
    alert('사용자 위치를 가져올 수 없습니다.');
    return;
  }

  if (window.myApp.map) {
    window.myApp.map.setCenter(window.myApp.userLocation);
    window.myApp.map.setZoom(14);
    console.log('Map center moved to user location.');

    if (window.myApp.userMarker) {
      window.myApp.userMarker.setPosition(window.myApp.userLocation);
    } else {
      window.myApp.userMarker = new google.maps.Marker({
        position: window.myApp.userLocation,
        map: window.myApp.map,
        title: '내 위치',
        icon: {
          url: '/images/user-location.png',
          scaledSize: new google.maps.Size(40, 40),
        },
      });
      console.log('User location marker added.');
    }
  } else {
    console.error('Map 객체가 초기화되지 않았습니다.');
  }
}

/**
 * 기존 시설 마커 모두 제거 함수
 */
function clearFacilityMarkers() {
  window.myApp.facilityMarkers.forEach(marker => marker.setMap(null));
  window.myApp.facilityMarkers = [];
  console.log('Previous facility markers cleared.');
}

/**
 * 지도에 마커를 업데이트하는 함수
 * @param {Array} facilities - 시설 목록
 */
function updateMapMarkers(facilities) {
  clearFacilityMarkers();

  if (facilities && Array.isArray(facilities) && facilities.length > 0) {
    facilities.forEach((facility) => {
      if (facility.geometry && facility.geometry.location) {
        const lat = parseFloat(facility.geometry.location.lat);
        const lng = parseFloat(facility.geometry.location.lng);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid location data for facility:', facility.name);
          return;
        }

        console.log('Adding marker for facility:', facility.name, { lat, lng });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: window.myApp.map,
          title: facility.name,
          icon: {
            url: '/images/facility-location.png',
            scaledSize: new google.maps.Size(30, 30),
          },
        });

        marker.addListener('click', () => {
          console.log('Marker clicked:', facility.name);

          if (window.myApp.currentInfoWindow) {
            window.myApp.currentInfoWindow.close();
          }

          fetch(`/routes/facilities/details?placeId=${facility.place_id}`)
            .then(response => response.json())
            .then(details => {
              console.log('Place details:', details);

              fetch(`/routes/facilities/congestion/average?placeId=${facility.place_id}`)
                .then(response => response.json())
                .then(async congestionData => {
                  const averageCongestion = congestionData.averageCongestion !== null ? congestionData.averageCongestion.toFixed(1) : '데이터 없음';

                  const phoneNumber = details.formatted_phone_number || '전화번호 정보 없음';
                  const address = details.formatted_address || '주소 정보 없음';
                  const openingHours = details.opening_hours && details.opening_hours.weekday_text ? details.opening_hours.weekday_text.join('<br>') : '운영 시간 정보 없음';
                  const rating = details.rating ? details.rating : '평점 없음';
                  const website = details.website ? `<a href="${details.website}" target="_blank">${details.website}</a>` : '웹사이트 없음';
                  const photo = details.photos && details.photos.length > 0 ? await getPhotoUrl(details.photos[0].photo_reference) : '/images/no-image.png';

                  const infoWindowContent = `
                    <div style="max-width: 300px;">
                        <h3>${details.name || '이름 정보 없음'}</h3>
                        <img src="${photo}" alt="${details.name}" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 0.5rem;" />
                        <p><strong>주소:</strong> ${address}</p>
                        <p><strong>전화번호:</strong> ${phoneNumber}</p>
                        <p><strong>운영 시간:</strong><br>${openingHours}</p>
                        <p><strong>평점:</strong> ${rating}</p>
                        <p><strong>웹사이트:</strong> ${website}</p>
                        <p><strong>평균 혼잡도:</strong> ${averageCongestion}</p>
                    </div>
                  `;

                  const infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent,
                  });
                  infoWindow.open(window.myApp.map, marker);

                  window.myApp.currentInfoWindow = infoWindow;
                  window.myApp.lastClickedFacility = facility;
                })
                .catch(error => {
                  console.error('Error fetching average congestion:', error);
                  const infoWindowContent = `
                    <div style="max-width: 300px;">
                        <h3>${details.name || '이름 정보 없음'}</h3>
                        <img src="${photo}" alt="${details.name}" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 0.5rem;" />
                        <p><strong>주소:</strong> ${address}</p>
                        <p><strong>전화번호:</strong> ${phoneNumber}</p>
                        <p><strong>운영 시간:</strong><br>${openingHours}</p>
                        <p><strong>평점:</strong> ${rating}</p>
                        <p><strong>웹사이트:</strong> ${website}</p>
                        <p><strong>평균 혼잡도:</strong> 데이터를 가져오는 중 오류가 발생했습니다.</p>
                    </div>
                  `;
                  const infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent,
                  });
                  infoWindow.open(window.myApp.map, marker);
                  window.myApp.currentInfoWindow = infoWindow;

                  window.myApp.lastClickedFacility = facility;
                });
            })
            .catch(error => {
              console.error('Error fetching place details:', error);
              const infoWindowContent = `
                <h3>${facility.name || '이름 정보 없음'}</h3>
                <p>상세 정보를 불러오는 중 오류가 발생했습니다.</p>
              `;
              const infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent,
              });
              infoWindow.open(window.myApp.map, marker);
              window.myApp.currentInfoWindow = infoWindow;
            });
        });

        // 마커 할당
        facility.marker = marker;
        window.myApp.facilityMarkers.push(marker);
      } else {
        console.warn('Facility geometry/location이 정의되지 않았습니다:', facility);
      }
    });
    console.log('All facility markers updated.');
  } else {
    console.warn('No facilities found or facilities data is not an array.');
  }
}

/**
 * 경로 계산 및 표시 함수
 * @param {Object} destination - 목적지 위치 { lat: Number, lng: Number }
 * @param {String} travelMode - 이동 수단 (DRIVING, WALKING, BICYCLING, TRANSIT)
 */
function calculateAndDisplayRoute(destination, travelMode = 'DRIVING') {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({ map: window.myApp.map });
  const origin = window.myApp.userLocation; // 현재 사용자 위치
  const destinationLatLng = destination;   // 목적지 위치

  directionsService.route(
    {
      origin: origin, // 출발지
      destination: destinationLatLng, // 목적지
      travelMode: travelMode, // 이동 수단 (DRIVING, WALKING, BICYCLING, TRANSIT)
    },
    (result, status) => {
      if (status === 'OK') {
        console.log("Route result:", result);
        directionsRenderer.setDirections(result); // 경로 지도에 표시

        // 예상 소요 시간 추출
        const route = result.routes[0].legs[0];
        const duration = route.duration.text; // 예: "20 mins"
        const distance = route.distance.text; // 예: "5.5 km"

        // 지도에 예상 시간 표시
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <p><strong>소요 시간:</strong> ${duration}</p>
              <p><strong>거리:</strong> ${distance}</p>
            </div>
          `,
          position: destinationLatLng, // 목적지 위치에 표시
        });
        infoWindow.open(window.myApp.map);

      } else if (status === 'ZERO_RESULTS') {
        alert('경로를 찾을 수 없습니다. 출발지와 목적지를 다시 확인해주세요.');
      } else {
        console.error(`Directions request failed due to ${status}`);
        alert('경로 계산 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  );
}


/**
 * 경로 시작점과 끝점에 커스텀 마커 추가
 * @param {google.maps.LatLng} origin - 시작점
 * @param {google.maps.LatLng} destination - 끝점
 */
function addCustomMarkers(origin, destination) {
  // 기존 경로 마커 제거
  if (window.myApp.routeMarkers) {
    window.myApp.routeMarkers.forEach(marker => marker.setMap(null));
  }
  window.myApp.routeMarkers = [];

  // 시작점 마커 (내 위치)
  const originMarker = new google.maps.Marker({
    position: origin,
    map: window.myApp.map,
    title: '내 위치',
    icon: {
      url: '/images/user-location.png',
      scaledSize: new google.maps.Size(40, 40),
    },
  });
  window.myApp.routeMarkers.push(originMarker);

  // 끝점 마커 (시설 위치)
  const destinationMarker = new google.maps.Marker({
    position: destination,
    map: window.myApp.map,
    title: '목적지',
    icon: {
      url: '/images/facility-location.png',
      scaledSize: new google.maps.Size(30, 30),
    },
  });
  window.myApp.routeMarkers.push(destinationMarker);
}

