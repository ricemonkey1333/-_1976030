// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired.');

  // 검색 버튼 이벤트 리스너 등록
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      console.log('Search button clicked.');
      window.performSearch(); // 전역 함수 호출
    });
  } else {
    console.warn('검색 버튼 (search-button)을 찾을 수 없습니다.');
  }

  // "내 위치로 돌아가기" 버튼 이벤트 리스너 등록
  const myLocationButton = document.getElementById('my-location-button');
  if (myLocationButton) {
    myLocationButton.addEventListener('click', () => {
      console.log('"내 위치로 돌아가기" 버튼 클릭됨.');
      window.goToMyLocation(); // 전역 함수 호출
    });
  } else {
    console.warn('"내 위치로 돌아가기" 버튼 (my-location-button)을 찾을 수 없습니다.');
  }

  // 데이터 보기 버튼 이벤트 리스너 등록
  const viewDataButton = document.getElementById('view-data-button');
  if (viewDataButton) {
    viewDataButton.addEventListener('click', () => {
      console.log('View Data button clicked.');
      window.fetchData(); // 전역 함수 호출
    });
  } else {
    console.warn('View Data button (view-data-button)을 찾을 수 없습니다.');
  }

  // Dark Mode 토글 이벤트 리스너 등록
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      console.log('Dark mode toggled.');
      window.toggleDarkMode(); // 전역 함수 호출
    });

    // 초기 상태 설정
    const darkMode = localStorage.getItem('darkMode') === 'enabled';
    darkModeToggle.checked = darkMode;
    if (darkMode) {
      document.body.classList.add('dark-mode');
    }
  } else {
    console.warn('Dark Mode toggle (dark-mode-toggle)을 찾을 수 없습니다.');
  }

  // 데이터 뷰어 닫기 버튼 이벤트 리스너 등록
  const closeDataViewerButton = document.getElementById('close-data-viewer');
  if (closeDataViewerButton) {
    closeDataViewerButton.addEventListener('click', () => {
      console.log('Close Data Viewer button clicked.');
      window.closeDataViewer(); // 전역 함수 호출
    });
  } else {
    console.warn('Close Data Viewer button (close-data-viewer)을 찾을 수 없습니다.');
  }

  // '이름순 정렬' 버튼 이벤트 리스너 등록
  const sortNameButton = document.getElementById('sort-name-button');
  if (sortNameButton) {
    sortNameButton.addEventListener('click', () => {
      console.log('Sort by name button clicked.');
      window.sortFacilitiesByName(); // 전역 함수 호출
    });
  } else {
    console.warn("'이름순 정렬' 버튼을 찾을 수 없습니다.");
  }

  // '거리순 정렬' 버튼 이벤트 리스너 등록
  const sortDistanceButton = document.getElementById('sort-distance-button');
  if (sortDistanceButton) {
    sortDistanceButton.addEventListener('click', () => {
      console.log('Sort by distance button clicked.');
      window.sortFacilitiesByDistance(); // 전역 함수 호출
    });
  } else {
    console.warn("'거리순 정렬' 버튼을 찾을 수 없습니다.");
  }

  console.log('UI 및 이벤트 리스너 초기화 완료');
});

/**
 * 시설 검색 함수
 */
function performSearch() {
  console.log('performSearch called.');

  // 사용자 위치 확인 (네임스페이스 사용)
  if (!window.myApp.userLocation) {
    alert('사용자 위치를 가져올 수 없습니다.');
    console.warn('User location is not available.');
    return;
  }

  // 필터 입력값 가져오기
  const radiusInput = document.getElementById('radius-filter');
  const facilityFilter = document.getElementById('facility-filter');
  const openNowFilter = document.getElementById('open-now-filter');
  const ratingFilter = document.getElementById('rating-filter');

  const radius = radiusInput ? radiusInput.value : null;
  const type = facilityFilter ? facilityFilter.value : null;
  const opennow = openNowFilter ? openNowFilter.checked : false;
  const minrating = ratingFilter ? ratingFilter.value : null;

  if (!radius) {
    alert('검색 반경을 입력하세요.');
    console.warn('Radius input is missing.');
    return;
  }

  // 검색 URL 구성
  let searchUrl = `/routes/facilities/nearby?lat=${window.myApp.userLocation.lat}&lng=${window.myApp.userLocation.lng}&radius=${radius}`;

  if (type) {
    searchUrl += `&type=${type}`;
  }

  if (opennow) {
    searchUrl += `&opennow=true`;
  }

  if (minrating && parseFloat(minrating) > 0) {
    searchUrl += `&minrating=${minrating}`;
  }

  console.log('Performing search with URL:', searchUrl);

  // 검색 요청
  fetch(searchUrl)
    .then(response => response.json())
    .then(data => {
      console.log('Search response data:', data);
      if (data.status === 'ZERO_RESULTS') {
        alert('검색 결과가 없습니다.');
        window.updateSortedList([]); // 전역 함수 호출
        window.updateMapMarkers([]);  // 전역 함수 호출
        return;
      }
      if (data.status !== 'OK') {
        throw new Error(`시설 검색 오류: ${data.status}`);
      }

      const facilities = data.results.map(facility => ({
        place_id: facility.place_id,
        name: facility.name,
        vicinity: facility.vicinity,
        geometry: facility.geometry,
        opening_hours: facility.opening_hours,
        rating: facility.rating,
        website: facility.website,
        photos: facility.photos,
      }));

      // 시설 목록과 지도 마커 업데이트
      window.updateSortedList(facilities);
      window.updateMapMarkers(facilities);
    })
    .catch(error => {
      console.error('시설 검색 오류:', error);
      alert('시설을 검색하는 중 오류가 발생했습니다.');
    });
}

/**
 * 현재 선택된 시설을 가져오는 함수
 * @returns {Object|null} - 선택된 시설 객체 또는 null
 */
function getSelectedFacility() {
  console.log('getSelectedFacility called.');
  return window.myApp.lastClickedFacility || null;
}

/**
 * IOT 데이터 가져오기 함수
 */
async function fetchData() {
  try {
    const response = await fetch('/routes/metrics/facilities/view'); // 백엔드 API 호출
    const data = await response.json();
    console.log('Fetched Data:', data);

    // 데이터를 표시하는 함수 호출
    displayData(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    alert('데이터를 불러오는 중 오류가 발생했습니다.');
  }
}


/**
 * 데이터 표시 함수
 * @param {Object} data - 데이터 객체
 */
function displayData(data) {
  const dataViewer = document.getElementById('data-viewer');
  const dataContent = document.getElementById('data-content');

  if (!dataViewer || !dataContent) {
    console.warn('Data Viewer elements not found.');
    return;
  }

  // 테이블 초기화
  let html = '<table border="1" style="width:100%; border-collapse: collapse;">';
  html += `
    <thead>
      <tr>
        <th>시설 이름</th>
        <th>Place ID</th>
        <th>영업 상태</th>
        <th>타임스탬프</th>
      </tr>
    </thead>
    <tbody>
  `;

  // 데이터를 테이블에 삽입
  data.forEach(item => {
    html += `
      <tr>
        <td>${item.facilityName || "이름 없음"}</td>
        <td>${item.placeId}</td>
        <td>${item.openStatus || "N/A"}</td>
        <td>${item.timestamp}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  // 데이터 표시
  dataContent.innerHTML = html;

  // 데이터 뷰어 표시
  dataViewer.classList.remove('hidden');
}


/**
 * 데이터 뷰어 닫기 함수
 */
function closeDataViewer() {
  const dataViewer = document.getElementById('data-viewer');
  if (dataViewer) {
    dataViewer.classList.add('hidden');
  }
}



/**
 * 즐겨찾기 목록 표시 함수
 */
function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  if (favorites.length === 0) {
    alert('즐겨찾기한 시설이 없습니다.');
    return;
  }

  // 즐겨찾기 목록을 표시하기 위해 updateSortedList와 updateMapMarkers 호출
  window.updateSortedList(favorites);
  window.updateMapMarkers(favorites);
}

/**
 * 다크 모드 토글 함수
 */
function toggleDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const isDarkMode = darkModeToggle ? darkModeToggle.checked : false;
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
  }
}

/**
 * 이름순 정렬 함수
 */
function sortFacilitiesByName() {
  console.log('Sorting facilities by name.');
  const list = document.getElementById("facility-list");
  const items = Array.from(list.children);

  items.sort((a, b) => {
    const nameA = a.querySelector('.facility-name').textContent.toLowerCase();
    const nameB = b.querySelector('.facility-name').textContent.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  // 정렬된 순서대로 다시 추가
  list.innerHTML = "";
  items.forEach(item => list.appendChild(item));

  console.log('Facilities sorted by name.');
}

/**
 * 거리순 정렬 함수
 */
function sortFacilitiesByDistance() {
  console.log('Sorting facilities by distance.');
  const list = document.getElementById("facility-list");
  const items = Array.from(list.children);

  items.sort((a, b) => {
    const distanceA = parseFloat(a.querySelector('.facility-distance').textContent.replace('거리: ', '').replace(' km', ''));
    const distanceB = parseFloat(b.querySelector('.facility-distance').textContent.replace('거리: ', '').replace(' km', ''));
    return distanceA - distanceB;
  });

  // '알 수 없음'을 최하위로 배치
  items.sort((a, b) => {
    const distanceA = a.querySelector('.facility-distance').textContent;
    const distanceB = b.querySelector('.facility-distance').textContent;
    if (distanceA === '거리: 알 수 없음 km') return 1;
    if (distanceB === '거리: 알 수 없음 km') return -1;
    return 0;
  });

  // 정렬된 순서대로 다시 추가
  list.innerHTML = "";
  items.forEach(item => list.appendChild(item));

  console.log('Facilities sorted by distance.');
}

// 전역 함수으로 정렬 함수 할당
window.sortFacilitiesByName = sortFacilitiesByName;
window.sortFacilitiesByDistance = sortFacilitiesByDistance;
