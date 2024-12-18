// favorites.js
function addToFavorites(facility) {
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  if (!favorites.some((fav) => fav.place_id === facility.place_id)) {
    favorites.push(facility);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert(`${facility.name}이(가) 즐겨찾기에 추가되었습니다.`);
  } else {
    alert('이미 즐겨찾기에 추가된 시설입니다.');
  }
}

function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  if (favorites.length === 0) {
    alert('즐겨찾기한 시설이 없습니다.');
    return;
  }

  // 즐겨찾기 목록을 표시하기 위해 facilitiesWithDistance 대체
  facilitiesWithDistance = favorites;
  updateSortedList();
}
