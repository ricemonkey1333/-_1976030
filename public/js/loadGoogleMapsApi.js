// public/js/loadGoogleMapsApi.js

async function loadGoogleMapsApi() {
  try {
    const response = await fetch('/apiKey');
    const data = await response.json();
    const apiKey = data.apiKey;

    if (!apiKey) {
      throw new Error('Google Maps API 키를 가져올 수 없습니다.');
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } catch (error) {
    console.error('Google Maps API 로드 실패:', error);
    alert('Google Maps API를 로드하는 중 오류가 발생했습니다.');
  }
}

// 문서가 로드되면 Google Maps API 로드 시작
document.addEventListener('DOMContentLoaded', loadGoogleMapsApi);
