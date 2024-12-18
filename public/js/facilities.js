// public/js/facilities.js

// 사진 URL 캐싱 객체
const photoCache = {};


/**
 * 서버로부터 사진 URL을 가져오는 함수 (캐싱 적용)
 * @param {String} photoReference - 사진 참조 키
 * @returns {Promise<String>} - 사진 URL
 */
async function getPhotoUrl(photoReference) {
  if (photoCache[photoReference]) {
    console.log(`Using cached photo URL for reference: ${photoReference}`);
    return photoCache[photoReference];
  }

  try {
    const response = await fetch(`/routes/facilities/photo?photoReference=${photoReference}`);
    if (!response.ok) {
      throw new Error('사진 URL을 가져오는 데 실패했습니다.');
    }
    const data = await response.json();
    photoCache[photoReference] = data.url; // 캐시에 저장
    console.log(`Fetched and cached photo URL for reference: ${photoReference}`);
    return data.url;
  } catch (error) {
    console.error('Error fetching photo URL:', error);
    return '/images/no-image.png'; // 기본 이미지 경로
  }
}

/**
 * 거리 계산 함수
 * @param {Object} userLoc - 사용자 위치 { lat: Number, lng: Number }
 * @param {Object} facilityLoc - 시설 위치 { lat: Number, lng: Number }
 * @returns {String} - 거리 (킬로미터 단위)
 */
function calculateDistance(userLoc, facilityLoc) {
  const userLatLng = new google.maps.LatLng(userLoc.lat, userLoc.lng);
  const facilityLatLng = new google.maps.LatLng(facilityLoc.lat, facilityLoc.lng);
  const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(userLatLng, facilityLatLng);
  return (distanceInMeters / 1000).toFixed(2); // 킬로미터 단위로 반환
}

let markers = []; // 마커를 저장하는 전역 배열

/**
 * 기존 마커를 지도에서 제거하는 함수
 */
function clearMarkers() {
  markers.forEach(marker => marker.setMap(null)); // 지도에서 마커 제거
  markers = []; // 마커 배열 초기화
}

/**
 * 공공시설 목록 업데이트 함수
 * @param {Array} facilities - 시설 목록
 */
async function updateSortedList(facilities) {
  console.log('updateSortedList called with facilities:', facilities);
  const list = document.getElementById("facility-list");
  list.innerHTML = "";

  // 기존 마커 제거
  clearMarkers();

  if (!Array.isArray(facilities) || facilities.length === 0) {
    console.warn('No facilities found.');
    const noResultItem = document.createElement("li");
    noResultItem.textContent = "검색된 공공시설이 없습니다.";
    list.appendChild(noResultItem);
    return;
  }

  // 모든 시설에 대한 사진 URL과 거리 계산을 비동기로 처리
  const facilitiesWithDetails = await Promise.all(facilities.map(async (facility) => {
    if (!facility.geometry || !facility.geometry.location) {
      console.warn('Invalid geometry or location for facility:', facility.name);
      return null;
    }

    if (!facility.place_id) {
      console.warn(`Facility missing place_id: ${facility.name}`);
      return null;
    }

    const distance = calculateDistance(window.myApp.userLocation, facility.geometry.location);
    facility.distance = distance;

    let thumbnailUrl = "/images/no-image.png";
    if (facility.photos && facility.photos.length > 0) {
      const photoReference = facility.photos[0].photo_reference;
      thumbnailUrl = await getPhotoUrl(photoReference);
    }

    // 마커 생성 및 저장
    const { lat, lng } = facility.geometry.location;
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: window.myApp.map,
      title: facility.name,
    });
    facility.marker = marker;
    markers.push(marker);
    // 마커를 window.myApp.markers에 저장
    if (!window.myApp.markers) {
      window.myApp.markers = {};
    }
    window.myApp.markers[facility.place_id] = marker;

    marker.addListener("click", () => {
      fetchFacilityDetails(facility);
    });

    return { ...facility, thumbnailUrl };
  }));

  const validFacilities = facilitiesWithDetails.filter(Boolean);

  // 시설 목록 렌더링
  validFacilities.forEach((facility) => {
    const listItem = document.createElement("li");
    listItem.className = "facility-item";
    listItem.dataset.placeId = facility.place_id;

    const img = document.createElement("img");
    img.src = facility.thumbnailUrl;
    img.alt = facility.name;
    img.className = "facility-thumbnail";
    img.onerror = () => {
      img.src = "/images/no-image.png";
    };

    const infoDiv = document.createElement("div");
    infoDiv.className = "facility-info";

    const nameP = document.createElement("p");
    nameP.className = "facility-name";
    nameP.textContent = facility.name;

    const distanceP = document.createElement("p");
    distanceP.className = "facility-distance";
    distanceP.textContent = `거리: ${facility.distance} km`;

    infoDiv.appendChild(nameP);
    infoDiv.appendChild(distanceP);
    listItem.appendChild(img);
    listItem.appendChild(infoDiv);

    // 혼잡도 측정 버튼
    const measureButton = document.createElement("button");
    measureButton.textContent = "영업 여부 측정";
    measureButton.className = "measure-button";
    measureButton.addEventListener("click", (event) => {
      event.stopPropagation();
      window.measureFacility(facility.place_id, facility.name, event);
    });
    listItem.appendChild(measureButton);

    // 경로 계산 버튼
    const routeButton = document.createElement("button");
    routeButton.textContent = "경로 계산";
    routeButton.className = "route-button";
    routeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      window.calculateRoute(facility.geometry.location);
    });
    listItem.appendChild(routeButton);

    // 리스트 항목 클릭 시 팝업 표시
    listItem.addEventListener("click", () => {
      fetchFacilityDetails(facility);
    });

    list.appendChild(listItem);
  });

  console.log('Facility list updated.');
}

/**
 * 시설 상세 정보를 가져와 팝업에 표시하는 함수
 * @param {Object} facility - 시설 객체
 */
async function fetchFacilityDetails(facility) {
  try {
    const response = await fetch(`/routes/facilities/details?placeId=${facility.place_id}`);
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }
    const details = await response.json();

    const phoneNumber = details.formatted_phone_number || "전화번호 정보 없음";
    const address = details.formatted_address || "주소 정보 없음";
    const openingHours = details.opening_hours?.weekday_text?.join('<br>') || "운영 시간 정보 없음";
    const rating = details.rating || "평점 없음";
    const website = details.website ? `<a href="${details.website}" target="_blank">${details.website}</a>` : "웹사이트 없음";
    const photo = details.photos?.[0]?.photo_reference
      ? await getPhotoUrl(details.photos[0].photo_reference)
      : "/images/no-image.png";

    if (window.myApp.currentInfoWindow) {
      window.myApp.currentInfoWindow.close();
    }

    const infoWindowContent = `
      <div style="max-width: 300px;">
        <h3>${details.name}</h3>
        <img src="${photo}" alt="${details.name}" style="width: 100%; height: auto; margin-bottom: 10px;" />
        <p><strong>주소:</strong> ${address}</p>
        <p><strong>전화번호:</strong> ${phoneNumber}</p>
        <p><strong>운영 시간:</strong><br>${openingHours}</p>
        <p><strong>평점:</strong> ${rating}</p>
        <p><strong>웹사이트:</strong> ${website}</p>
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });
    infoWindow.open(window.myApp.map, facility.marker);
    window.myApp.currentInfoWindow = infoWindow;
  } catch (error) {
    console.error("Error fetching facility details:", error);
    alert("상세 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * 시설 상세 정보를 가져와서 팝업에 표시하는 함수
 * @param {Object} facility - 선택된 시설 객체
 */
async function fetchFacilityDetails(facility) {
  try {
    const response = await fetch(`/routes/facilities/details?placeId=${facility.place_id}`);
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    const details = await response.json();

    console.log('Place details:', details);

    const phoneNumber = details.formatted_phone_number || '전화번호 정보 없음';
    const address = details.formatted_address || '주소 정보 없음';
    const openingHours = details.opening_hours && details.opening_hours.weekday_text
      ? details.opening_hours.weekday_text.join('<br>')
      : '운영 시간 정보 없음';
    const rating = details.rating ? details.rating : '평점 없음';
    const website = details.website ? `<a href="${details.website}" target="_blank">${details.website}</a>` : '웹사이트 없음';
    const photo = details.photos && details.photos.length > 0
      ? await getPhotoUrl(details.photos[0].photo_reference)
      : '/images/no-image.png'; // 기본 이미지 설정

    const infoWindowContent = `
      <div style="max-width: 300px;">
          <h3>${details.name || '이름 정보 없음'}</h3>
          <img src="${photo}" alt="${details.name}" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 0.5rem;" />
          <p><strong>주소:</strong> ${address}</p>
          <p><strong>전화번호:</strong> ${phoneNumber}</p>
          <p><strong>운영 시간:</strong><br>${openingHours}</p>
          <p><strong>평점:</strong> ${rating}</p>
          <p><strong>웹사이트:</strong> ${website}</p>
      </div>
    `;

    if (window.myApp.currentInfoWindow) {
      window.myApp.currentInfoWindow.close();
    }

    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent,
    });

    infoWindow.open(window.myApp.map, facility.marker);
    window.myApp.currentInfoWindow = infoWindow;

  } catch (error) {
    console.error('Error fetching place details:', error);
    alert('시설의 상세 정보를 불러오는 중 오류가 발생했습니다.');
  }
}


/**
 * 영업 여부 및 상태 측정 함수
 * @param {String} facilityId - 시설 ID
 * @param {String} facilityName - 시설 이름
 * @param {Event} event - 이벤트 객체
 * @param {Boolean} skipConfirmation - 사용자 확인 생략 여부
 */
async function measureFacility(facilityId, facilityName, event, skipConfirmation = false) {
  console.log(`측정 시작: 시설 ID=${facilityId}, 이름=${facilityName}`);

  if (!skipConfirmation) {
    const confirmMeasure = confirm(`${facilityName}의 영업 상태를 확인하시겠습니까?`);
    if (!confirmMeasure) return;
  }

  const measureButton = event?.target;
  if (measureButton) {
    measureButton.disabled = true;
    const originalText = measureButton.textContent;
    measureButton.textContent = "확인 중...";
  }

  try {
    // Google Places API를 사용하여 시설의 상세 정보를 가져옴
    const response = await fetch(`/routes/facilities/details?placeId=${facilityId}`);
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const details = await response.json();
    const isOpen = details.opening_hours?.open_now || false;

    console.log(`${facilityName}의 현재 영업 상태: ${isOpen ? "영업 중" : "영업 종료"}`);

    // 마커 색상 업데이트
    const marker = window.myApp.markers?.[facilityId];
    if (marker) {
      const color = isOpen ? "green" : "gray";
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: color,
        fillOpacity: 0.8,
        strokeWeight: 1,
        strokeColor: "black",
      });
      console.log(`${facilityName}의 마커 색상 업데이트: ${color}`);
    } else {
      console.warn(`마커를 찾을 수 없습니다: ${facilityId}`);
    }

    // 데이터베이스에 영업 상태 저장
    const saveResponse = await fetch(`/routes/metrics/facilities/${facilityId}/measure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityName,
        isOpen, // 영업 여부 전송
      }),
    });

    if (!saveResponse.ok) {
      throw new Error(`데이터 저장 실패: ${saveResponse.status}`);
    }

    console.log(`${facilityName}의 영업 상태가 데이터베이스에 저장되었습니다.`);

    if (!skipConfirmation) {
      alert(`${facilityName}의 현재 영업 상태는 ${isOpen ? "영업 중" : "영업 종료"}입니다.`);
    }

    if (measureButton) {
      measureButton.disabled = false;
      measureButton.textContent = originalText;
    }

    return { isOpen }; // 영업 상태 반환
  } catch (error) {
  }
}





/**
 * 경로 계산 함수 정의
 * @param {Object} destination - 목적지 위치 { lat: Number, lng: Number }
 */
function calculateRoute(destination) {
  if (typeof window.calculateAndDisplayRoute === 'function') {
    // 이동 수단 선택
    const travelModeSelect = document.getElementById('travel-mode-select');
    const selectedMode = travelModeSelect ? travelModeSelect.value : 'DRIVING';
    window.calculateAndDisplayRoute(destination, selectedMode);
  } else {
    console.error('calculateAndDisplayRoute 함수가 정의되어 있지 않습니다.');
  }
}

// 전역 함수로 필요한 함수 할당
window.measureFacility = measureFacility;
window.calculateRoute = calculateRoute;
/**
 * 시설 데이터 초기화 함수
 * @param {Object[]} facilities - 시설 목록
 */
function initializeFacilities(facilities) {
  facilities.forEach(facility => {
    if (!facility.geometry || !facility.geometry.location) {
      console.warn(`Invalid geometry for facility: ${facility.name}`);
      return;
    }

    const { lat, lng } = facility.geometry.location;

    // 지도에 마커 추가
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: window.myApp.map,
      title: facility.name,
    });

    // 마커 클릭 이벤트 설정
    marker.addListener('click', () => {
      console.log(`Marker clicked: ${facility.name}`);
      if (window.myApp.currentInfoWindow) {
        window.myApp.currentInfoWindow.close();
      }

      const infoWindow = new google.maps.InfoWindow({
        content: `<h3>${facility.name}</h3><p>${facility.vicinity || '주소 정보 없음'}</p>`,
      });
      infoWindow.open(window.myApp.map, marker);
      window.myApp.currentInfoWindow = infoWindow;
    });

    // 시설에 마커 연결
    facility.marker = marker;
  });

  console.log('Facilities initialized.');
}


let isOpenStatusMapActive = false; // 영업 여부 지도 활성화 상태
let openStatusUpdateInterval = null; // 영업 여부 갱신 타이머

/**
 * 영업 상태에 따른 색상 반환
 */
function getColorByOpenStatus(isOpen) {
  return isOpen ? 'green' : 'gray';
}

/**
 * 기존 마커 색상 복원
 */
function restoreDefaultMarkers() {
  if (!window.myApp.markers || Object.keys(window.myApp.markers).length === 0) {
    console.warn('No markers to restore.');
    return;
  }

  Object.values(window.myApp.markers).forEach((marker) => {
    if (marker) {
      marker.setIcon(null); // 기본 아이콘으로 복원
    }
  });
}

/**
 * 영업 여부 데이터 갱신 및 마커 색상 업데이트 함수
 */
async function updateOpenStatusMap() {
  console.log('영업 여부 지도 갱신 시작');

  const facilityList = document.querySelectorAll('.facility-item');
  const placeIds = Array.from(facilityList)
    .map(item => item.dataset.placeId)
    .filter(Boolean);

  if (!placeIds.length) {
    console.warn('현재 공공시설 목록이 비어 있습니다.');
    return;
  }

  try {
    await Promise.all(placeIds.map(async (placeId) => {
      const facilityItem = document.querySelector(`.facility-item[data-place-id="${placeId}"]`);
      const facilityName = facilityItem?.querySelector('.facility-name')?.textContent || "Unknown";

      // 영업 여부 확인 (확인 생략)
      const data = await measureFacility(placeId, facilityName, null, true);
      console.log(`Fetched data for ${facilityName}:`, data); // 영업 여부 데이터 확인

      if (data) {
        const { isOpen } = data; // 영업 상태 확인
        console.log(`Open Status for ${facilityName}: ${isOpen ? 'Open' : 'Closed'}`);

        const marker = window.myApp.markers[placeId];
        if (marker) {
          const color = getColorByOpenStatus(isOpen);
          console.log(`Marker color for ${placeId}: ${color}`); // 색상 결정 확인

          marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 0.8,
            strokeWeight: 1,
            strokeColor: "black",
          });
        } else {
          console.warn(`마커를 찾을 수 없습니다: ${placeId}`);
        }
      }
    }));

    console.log('영업 여부 지도 갱신 완료');
  } catch (error) {
    console.error('영업 여부 데이터를 가져오는 중 오류 발생:', error);
  }
}

function toggleOpenStatusMap() {
  console.log('toggleOpenStatusMap called');
  isOpenStatusMapActive = !isOpenStatusMapActive;

  const button = document.getElementById('toggle-congestion-map');
  button.classList.toggle('active', isOpenStatusMapActive);
  button.textContent = isOpenStatusMapActive ? '영업 여부 지도 취소' : '영업 여부 지도';

  if (isOpenStatusMapActive) {
    console.log('영업 여부 지도 활성화');
    updateOpenStatusMap(); // 즉시 갱신
    openStatusUpdateInterval = setInterval(updateOpenStatusMap, 10000); // 10초마다 갱신
  } else {
    console.log('영업 여부 지도 비활성화');
    clearInterval(openStatusUpdateInterval);
    openStatusUpdateInterval = null;
    restoreDefaultMarkers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggle-congestion-map');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleOpenStatusMap);
    console.log('영업 여부 지도 버튼 이벤트 리스너가 추가되었습니다.');
  } else {
    console.error('영업 여부 지도 버튼을 찾을 수 없습니다.');
  }
});


