const toast = document.querySelector("#toast");
const chatButton = document.querySelector("#chatButton");
const route = document.querySelector(".map-route");
const shell = document.querySelector(".app-shell");
const friendStrip = document.querySelector("#friendStrip");
const friendCards = document.querySelector("#friendCards");
const bottomSheet = document.querySelector("#friendBottomSheet");
const shareLocationButton = document.querySelector("#shareLocationButton");
const stopSharingButton = document.querySelector("#stopSharingButton");
const pauseSharing = document.querySelector("#pauseSharing");
const approxOnly = document.querySelector("#approxOnly");
const hideExact = document.querySelector("#hideExact");

let activeTab = "home";
let liveMap;
let selectedFriendName = "KD";
let myLocationMarker;
const friendMarkers = new Map();

const friends = [
  {
    name: "KD",
    avatar: "assets/avatar.png",
    status: "在线",
    statusColor: "#38a761",
    mood: "开心 😊",
    location: "奶茶店",
    energyLabel: "电量",
    energyValue: "72%",
    quote: "今天奶茶第二杯半价耶！",
    address: "Pavilion KL 附近",
    updated: "刚刚",
    lat: 3.1488,
    lng: 101.7133,
    cardStart: "#fffaf1",
    cardEnd: "#f1dfca",
    featured: true,
    locationSharing: true,
  },
  {
    name: "Vivien",
    avatar: "assets/friends/vivien.png",
    status: "开心",
    statusColor: "#38a761",
    mood: "开心 😊",
    location: "Pavilion",
    energyLabel: "奶茶能量",
    energyValue: "+20",
    quote: "今天不想上班...",
    address: "Bukit Bintang 商圈",
    updated: "2 分钟前",
    lat: 3.1466,
    lng: 101.7112,
    cardStart: "#fff7f2",
    cardEnd: "#f0d9cf",
    locationSharing: true,
  },
  {
    name: "Zhen",
    avatar: "assets/friends/zhen.png",
    status: "有点累",
    statusColor: "#f2b43d",
    mood: "废话输出中 😜",
    location: "公司厕所",
    energyLabel: "电量",
    energyValue: "11%",
    quote: "救命... 还要开会...",
    address: "KLCC 办公区附近",
    updated: "4 分钟前",
    lat: 3.1578,
    lng: 101.7114,
    cardStart: "#f8fafb",
    cardEnd: "#dfe5eb",
    locationSharing: true,
  },
];

function initials(name) {
  return name.slice(0, 1).toUpperCase();
}

function imageWithFallback(src, alt, className, name) {
  return `<img class="${className}" src="${src}" alt="${alt}" data-fallback="${initials(name)}" />`;
}

function installImageFallbacks(scope = document) {
  scope.querySelectorAll("img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        const fallback = image.dataset.fallback;

        if (!fallback) {
          console.warn(`Missing image asset: ${image.getAttribute("src")}`);
          image.hidden = true;
          return;
        }

        const replacement = document.createElement("span");
        replacement.className = `${image.className || ""} placeholder`.trim();
        replacement.textContent = fallback;
        image.replaceWith(replacement);
      },
      { once: true },
    );
  });
}

function renderFriends() {
  friendStrip.innerHTML = friends
    .map(
      (friend, index) => `
        <article class="friend-avatar-chip ${friend.featured ? "featured" : ""}" style="--status-color: ${friend.statusColor}; --index: ${index}">
          <div class="friend-avatar-wrap">
            ${imageWithFallback(friend.avatar, `${friend.name} 的头像`, "", friend.name)}
            <span class="friend-status-dot" aria-hidden="true"></span>
          </div>
          <strong>${friend.name}</strong>
          <span>${friend.status}</span>
        </article>
      `,
    )
    .join("");

  friendCards.innerHTML = friends
    .map(
      (friend, index) => `
        <article class="friend-status-card" style="--status-color: ${friend.statusColor}; --card-start: ${friend.cardStart}; --card-end: ${friend.cardEnd}; --index: ${index}">
          <h2>${friend.name}</h2>
          <div class="friend-line status"><i>●</i>${friend.status}</div>
          <div class="friend-line"><i>☺</i>${friend.mood}</div>
          <div class="friend-line"><i>⌖</i>${friend.location}</div>
          <div class="friend-line"><i>▰</i>${friend.energyLabel} ${friend.energyValue}</div>
          ${imageWithFallback(friend.avatar, `${friend.name} 的状态头像`, "friend-card-avatar", friend.name)}
          <div class="quote-pill"><span>“ ${friend.quote}</span><b>···</b></div>
        </article>
      `,
    )
    .join("");

  installImageFallbacks(friendStrip);
  installImageFallbacks(friendCards);
}

function setActiveTab(tabName) {
  activeTab = tabName;

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });

  shell.classList.toggle("is-friends", activeTab === "friends");
  shell.classList.toggle("is-map", activeTab === "map");

  if (activeTab === "map") {
    window.setTimeout(() => {
      initLiveMap();
      liveMap?.invalidateSize();
    }, 420);
  }

  if (activeTab === "home" || activeTab === "friends" || activeTab === "map") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function createFriendIcon(friend) {
  const fallback = initials(friend.name);
  return L.divIcon({
    className: "avatar-marker",
    html: `<div class="avatar-marker-inner" style="--status-color:${friend.statusColor}"><img src="${friend.avatar}" alt="${friend.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" /><span>${fallback}</span></div>`,
    iconSize: [74, 74],
    iconAnchor: [37, 37],
  });
}

function renderBottomSheet(friend) {
  selectedFriendName = friend.name;
  const privacyNote = hideExact.checked ? "已隐藏精确位置" : approxOnly.checked ? "显示约略位置" : "显示当前模拟位置";
  bottomSheet.classList.add("show");
  bottomSheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-person">
      ${imageWithFallback(friend.avatar, `${friend.name} 的头像`, "sheet-avatar", friend.name)}
      <div>
        <h2>${friend.name}</h2>
        <p><span style="background:${friend.statusColor}"></span>${friend.status}</p>
      </div>
    </div>
    <div class="sheet-grid">
      <div><small>Mood</small><strong>${friend.mood}</strong></div>
      <div><small>Energy</small><strong>${friend.energyLabel} ${friend.energyValue}</strong></div>
      <div><small>Updated</small><strong>${friend.updated}</strong></div>
      <div><small>Address</small><strong>${friend.address}</strong></div>
    </div>
    <p class="privacy-note">${privacyNote}. Location sharing is permission-based.</p>
  `;
  installImageFallbacks(bottomSheet);
}

function initLiveMap() {
  if (!window.L) {
    toast.textContent = "Leaflet 没有加载成功，请确认网络可访问 Leaflet 地图资源。";
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2400);
    return;
  }

  if (liveMap) return;

  liveMap = L.map("liveMap", {
    zoomControl: false,
    attributionControl: false,
  }).setView([3.1516, 101.7122], 15);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(liveMap);

  L.control.zoom({ position: "topright" }).addTo(liveMap);
  L.control.attribution({ position: "bottomright", prefix: false }).addAttribution("&copy; OpenStreetMap contributors &copy; CARTO").addTo(liveMap);

  friends
    .filter((friend) => friend.locationSharing)
    .forEach((friend) => {
      const marker = L.marker([friend.lat, friend.lng], { icon: createFriendIcon(friend), riseOnHover: true }).addTo(liveMap);
      marker.on("click", () => renderBottomSheet(friend));
      friendMarkers.set(friend.name, marker);
    });

  renderBottomSheet(friends[0]);
}

function moveMarkerSmooth(marker, nextLatLng) {
  const startLatLng = marker.getLatLng();
  const start = performance.now();
  const duration = 1200;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const lat = startLatLng.lat + (nextLatLng.lat - startLatLng.lat) * eased;
    const lng = startLatLng.lng + (nextLatLng.lng - startLatLng.lng) * eased;
    marker.setLatLng([lat, lng]);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function updateSimulatedLocations() {
  if (!liveMap) return;

  friends.forEach((friend) => {
    if (!friend.locationSharing) return;
    const marker = friendMarkers.get(friend.name);
    if (!marker) return;

    const jitter = approxOnly.checked ? 0.0012 : 0.00055;
    friend.lat += (Math.random() - 0.5) * jitter;
    friend.lng += (Math.random() - 0.5) * jitter;
    friend.updated = "刚刚";
    moveMarkerSmooth(marker, { lat: friend.lat, lng: friend.lng });
  });

  const selected = friends.find((friend) => friend.name === selectedFriendName);
  if (selected) renderBottomSheet(selected);
}

function requestMyLocation() {
  if (!navigator.geolocation) {
    toast.textContent = "这个浏览器不支持定位。";
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 1800);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      initLiveMap();
      const { latitude, longitude } = position.coords;
      const shownLat = approxOnly.checked ? Number(latitude.toFixed(3)) : latitude;
      const shownLng = approxOnly.checked ? Number(longitude.toFixed(3)) : longitude;
      const icon = L.divIcon({
        className: "my-location-marker",
        html: "<span>我</span>",
        iconSize: [58, 58],
        iconAnchor: [29, 29],
      });

      if (myLocationMarker) {
        myLocationMarker.setLatLng([shownLat, shownLng]);
      } else {
        myLocationMarker = L.marker([shownLat, shownLng], { icon }).addTo(liveMap);
      }

      liveMap.setView([shownLat, shownLng], 15);
      toast.textContent = "已开始分享你的模拟位置，隐私设置可随时调整。";
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2200);
    },
    () => {
      toast.textContent = "没有获得定位权限，位置不会被分享。";
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2200);
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 },
  );
}

chatButton?.addEventListener("click", () => {
  toast.textContent = "KD 现在很适合聊天，快发一句 hello";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
});

shareLocationButton?.addEventListener("click", requestMyLocation);

stopSharingButton?.addEventListener("click", () => {
  if (myLocationMarker && liveMap) {
    liveMap.removeLayer(myLocationMarker);
    myLocationMarker = null;
  }
  toast.textContent = "已停止分享你的位置。";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
});

[pauseSharing, approxOnly, hideExact].forEach((control) => {
  control?.addEventListener("change", () => {
    const selected = friends.find((friend) => friend.name === selectedFriendName);
    if (selected) renderBottomSheet(selected);
  });
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

if (route) {
  route.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -56 }], {
    duration: 2600,
    iterations: Infinity,
    easing: "linear",
  });
}

renderFriends();
installImageFallbacks(document);
setActiveTab("home");
window.setInterval(() => {
  if (!pauseSharing.checked) updateSimulatedLocations();
}, 10000);

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
