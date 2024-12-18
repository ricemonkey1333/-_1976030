// events.js
// js/events.js

function fetchEventData() {
  fetch('/routes/events') // 상대 경로 사용
    .then(response => response.json())
    .then(events => displayEvents(events))
    .catch(error => {
      console.error('Error fetching events:', error);
      displayEvents([]);
    });
}


function displayEvents(events) {
  const eventList = document.getElementById('event-list');
  eventList.innerHTML = '';

  if (!events || events.length === 0) {
    document.getElementById('no-events-message').style.display = 'block';
    return;
  }

  document.getElementById('no-events-message').style.display = 'none';
  events.forEach((event) => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <h3>${event.title}</h3>
      <p>${event.description}</p>
      <p>일시: ${event.date}</p>
      <p>장소: ${event.location}</p>
    `;
    eventList.appendChild(listItem);
  });
}
