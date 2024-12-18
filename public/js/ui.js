// ui.js
function showFacilityPopup(place, listItem) {
  const popup = document.getElementById('facility-popup');
  const contentDiv = popup.querySelector('.popup-content');

  let html = `<p><strong>${place.name}</strong></p>`;
  if (place.formatted_address) html += `<p>${place.formatted_address}</p>`;
  if (place.formatted_phone_number) html += `<p>전화번호: ${place.formatted_phone_number}</p>`;
  if (place.opening_hours) {
    html += `<p>영업시간:<br>${place.opening_hours.weekday_text.join('<br>')}</p>`;
  }
  if (place.website) {
    html += `<p><a href="${place.website}" target="_blank">웹사이트</a></p>`;
  }

  contentDiv.innerHTML = html;

  const rect = listItem.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  popup.style.position = 'absolute';
  popup.style.top = (rect.top + scrollY) + 'px';
  popup.style.left = (rect.right + 10 + scrollX) + 'px';
  popup.style.display = 'block';
}

function closeFacilityPopup() {
  const popup = document.getElementById('facility-popup');
  popup.style.display = 'none';
}

function toggleDarkMode() {
  const isDarkMode = document.getElementById('dark-mode-toggle').checked;
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
  }
}

function closeModal() {
  document.getElementById('facility-details-modal').style.display = 'none';
}

function updateRouteInfo(route) {
  const routeDetails = document.getElementById("route-details");
  routeDetails.textContent = `출발지: ${route.start_address}, 도착지: ${route.end_address}, 예상 시간: ${route.duration.text}, 거리: ${route.distance.text}`;
}
