// API URL detection:
// - localhost / 127.0.0.1 → http://localhost:5000/api
// - file:// protocol (opened directly) → http://localhost:5000/api
// - deployed (Vercel, etc.) → /api (same origin)
const API_URL = (typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
))
    ? "http://localhost:5000/api"
    : "/api";

// Helper to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

// Initialize on DOM Load
window.addEventListener("DOMContentLoaded", () => {
    setupNavbar();
    initPremiumUI();
    initCommandPalette();

    // Check which page we are on and initialize the appropriate functions
    if (document.getElementById("donationList")) {
        loadDonations();
    }
    if (document.getElementById("findFoodList")) {
        loadAvailableFood();
    }
    if (document.getElementById("stats-total-donations")) {
        loadDashboardStats();
    }
    if (document.getElementById("ngoAvailableList")) {
        loadNGOData();
    }
    if (document.getElementById("profileFullName")) {
        loadProfileData();
    }
    
    // Bind forms if present
    const donateForm = document.getElementById("donateForm");
    if (donateForm) {
        donateForm.addEventListener("submit", handleDonateSubmit);
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", handleSignupSubmit);
    }

    const profileEditForm = document.getElementById("profileEditForm");
    if (profileEditForm) {
        profileEditForm.addEventListener("submit", handleProfileUpdate);
    }

    const passwordChangeForm = document.getElementById("passwordChangeForm");
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener("submit", handlePasswordChange);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", handleSearch);
    }

    const ngoSearchInput = document.getElementById("ngoSearchInput");
    if (ngoSearchInput) {
        ngoSearchInput.addEventListener("input", handleNGOSearch);
    }

    const avatarUpload = document.getElementById("avatarUploadInput");
    if (avatarUpload) {
        avatarUpload.addEventListener("change", handleAvatarUpload);
    }

    const foodImageInput = document.getElementById("foodImageInput");
    if (foodImageInput) {
        foodImageInput.addEventListener("change", handleFoodImageUpload);
    }

    // Update AI priority card on form input changes
    const aiFormInputs = ["expiryInput", "quantityInput"];
    aiFormInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", updateAIPriorityCard);
            el.addEventListener("change", updateAIPriorityCard);
        }
    });
});

// Toast notification helper
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `custom-toast border-start border-4 ${type === 'error' ? 'border-danger' : 'border-success'}`;
    
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="fs-5 me-2">${type === 'error' ? '❌' : '🌱'}</span>
            <span class="fw-semibold" style="font-size: 0.95rem;">${message}</span>
        </div>
        <button type="button" class="btn-close" style="font-size: 0.75rem;" onclick="this.parentElement.remove()"></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function renderSkeletonCards(container, count = 3) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="col-md-4">
            <div class="glass-card-premium p-4 h-100">
                <div class="placeholder-glow mb-3">
                    <span class="placeholder col-8"></span>
                </div>
                <div class="placeholder-glow mb-2">
                    <span class="placeholder col-6"></span>
                </div>
                <div class="placeholder-glow mb-2">
                    <span class="placeholder col-7"></span>
                </div>
                <div class="placeholder-glow">
                    <span class="placeholder col-5"></span>
                </div>
            </div>
        </div>
    `).join('');
}

function animateCounter(element) {
    const target = Number(element.dataset.count || element.dataset.counter || 0);
    const prefix = element.dataset.prefix || "";
    const suffix = element.dataset.suffix || "";
    const duration = 1200;
    const startTime = performance.now();

    const update = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);
        element.textContent = `${prefix}${current}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
}

function createRipple(event) {
    const button = event.currentTarget;
    if (!button || button.dataset.rippleBound === 'true') return;
    button.dataset.rippleBound = 'true';

    const ripple = document.createElement('span');
    ripple.className = 'position-absolute top-0 start-0 w-100 h-100 rounded-pill';
    ripple.style.background = 'rgba(255,255,255,0.2)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s ease-out';
    ripple.style.pointerEvents = 'none';
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
}

function initPremiumUI() {
    const revealItems = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealItems.forEach((item) => observer.observe(item));

    document.querySelectorAll('[data-count], [data-counter]').forEach((element) => {
        if (!element.dataset.animated) {
            element.dataset.animated = 'true';
            animateCounter(element);
        }
    });

    document.querySelectorAll('button, .btn').forEach((button) => {
        button.addEventListener('click', createRipple);
    });
}

function initCommandPalette() {
    if (document.getElementById('command-palette')) return;

    const overlay = document.createElement('div');
    overlay.id = 'command-palette';
    overlay.className = 'command-palette';
    overlay.innerHTML = `
        <div class="palette-card">
            <div class="d-flex align-items-center gap-2 mb-3">
                <span class="pill-chip">⌘K</span>
                <span class="fw-semibold text-secondary">Quick navigation</span>
            </div>
            <input class="palette-input" type="text" placeholder="Search pages, views, or actions..." aria-label="Command palette" />
            <div class="mt-3" id="paletteSuggestions"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.palette-input');
    const suggestions = overlay.querySelector('#paletteSuggestions');
    const actions = [
        { label: 'Open home', href: 'index.html' },
        { label: 'Open donor dashboard', href: 'dashboard.html' },
        { label: 'Open NGO workspace', href: 'ngo-dashboard.html' },
        { label: 'Open admin control center', href: 'admin-dashboard.html' },
        { label: 'Open food finder', href: 'findfood.html' },
        { label: 'Open hunger map', href: 'hunger-map.html' },
        { label: 'Open profile', href: 'profile.html' },
        { label: 'Toggle theme', action: 'toggleTheme' }
    ];

    const renderSuggestions = (filter = '') => {
        const normalized = filter.trim().toLowerCase();
        const visible = actions.filter((item) => item.label.toLowerCase().includes(normalized));
        suggestions.innerHTML = visible.map((item) => `
            <button class="btn btn-light w-100 text-start mb-2 rounded-4 border-0 shadow-sm" type="button" onclick="${item.action ? `${item.action}()` : `window.location.href='${item.href}'`}" style="padding: 10px 12px;">
                ${item.label}
            </button>
        `).join('');
    };

    renderSuggestions();

    const openPalette = () => {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 50);
    };

    const closePalette = () => overlay.classList.remove('open');

    input.addEventListener('input', (event) => renderSuggestions(event.target.value));
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closePalette();
        }
    });
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closePalette();
    });
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openPalette();
        } else if (event.key === 'Escape') {
            closePalette();
        }
    });

    const fab = document.createElement('button');
    fab.className = 'floating-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open navigation palette');
    fab.innerHTML = '⌘';
    fab.addEventListener('click', openPalette);
    document.body.appendChild(fab);
}

// Theme Management (Dark/Light Mode)
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
}
initTheme();

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    const iconBtn = document.getElementById("themeToggleIcon");
    if (iconBtn) {
        iconBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
    }
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode 🌓`);
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar-wrapper");
    if (sidebar) {
        sidebar.classList.toggle("collapsed");
        sidebar.classList.toggle("mobile-show");
    }
}

// Setup dynamic Navbar based on authentication state
function setupNavbar() {
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
    const navMenu = document.getElementById("menu");
    if (!navMenu) return;

    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const themeIcon = currentTheme === "dark" ? "☀️" : "🌙";

    let dashboardPage = "index.html";
    if (user) {
        if (user.role === "NGO") dashboardPage = "ngo-dashboard.html";
        else if (user.role === "Admin") dashboardPage = "admin-dashboard.html";
        else dashboardPage = "dashboard.html";
    }

    let navbarHtml = `
    <ul class="navbar-nav ms-auto align-items-center">

        <li class="nav-item">
            <a class="nav-link" href="index.html">Home</a>
        </li>

        ${user ? `
        <li class="nav-item">
            <a class="nav-link" href="${dashboardPage}">Dashboard</a>
        </li>
        ` : ''}

        <li class="nav-item">
            <a class="nav-link" href="donate.html">Donate</a>
        </li>

        <li class="nav-item">
            <a class="nav-link" href="findfood.html">Find Food</a>
        </li>

        <li class="nav-item">
            <a class="nav-link" href="hunger-map.html">🗺️ Hunger Map</a>
        </li>

        <li class="nav-item ms-lg-2 my-2 my-lg-0">
            <button
                class="theme-toggle-btn"
                onclick="toggleTheme()"
                title="Toggle Dark/Light Mode">
                <span id="themeToggleIcon">${themeIcon}</span>
            </button>
        </li>
    `;

    if (user) {
        navbarHtml += `
            <li class="nav-item ms-lg-3 my-2 my-lg-0">
                <a href="profile.html" class="navbar-text fw-bold text-success text-decoration-none me-2">👤 ${user.fullName}</a>
            </li>
            <li class="nav-item ms-lg-2">
                <button class="btn btn-outline-danger btn-sm px-3 rounded-pill" onclick="logout()">Logout</button>
            </li>
        `;
    } else {
        navbarHtml += `
            <li class="nav-item ms-lg-3 my-2 my-lg-0"><a class="btn btn-nav-login btn-sm me-2 px-4 rounded-pill" href="login.html">Login</a></li>
            <li class="nav-item"><a class="btn btn-nav-signup btn-sm px-4 rounded-pill" href="signup.html">Sign Up</a></li>
        `;
    }
    navbarHtml += `</ul>`;
    navMenu.innerHTML = navbarHtml;

    // Update Brand Name in all navbars
    const brands = document.querySelectorAll('.navbar-brand');
    brands.forEach(b => {
        b.innerHTML = `
            <img src="images/foodbridge.logo.png" alt="FOODBRIDGE AI Logo" class="fb-logo-img">
            <span class="fb-brand-text" style="display:flex;flex-direction:column;line-height:1;margin-left:10px;">
                <span class="fb-wordmark" style="display:flex;align-items:center;gap:6px;font-family:'Inter',system-ui,-apple-system,sans-serif;font-weight:800;font-size:17px;letter-spacing:0.4px;color:#F8FAFC;">
                    <span class="fb-g" style="color:#22C55E;">FOOD</span><span class="fb-b" style="color:#14B8A6;">BRIDGE</span><span class="fb-ai-badge" style="font-size:9px;font-weight:800;letter-spacing:0.5px;color:#052e16;background:linear-gradient(135deg,#22C55E,#16A34A);padding:2px 6px;border-radius:6px;">AI</span>
                </span>
                <span class="fb-tagline" style="display:block;margin-top:2px;font-size:9px;font-weight:700;letter-spacing:1.2px;color:#cbd5e1;text-shadow:0 1px 3px rgba(0,0,0,0.55);line-height:1.2;">REDUCE WASTE. FEED HOPE. CREATE IMPACT.</span>
            </span>
        `;
    });
}


function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    showToast("Logged out successfully.");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 800);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ----------------- HOME PAGE / INDEX -----------------
async function loadDonations() {
    try {
        console.log("loadDonations called");
        const container = document.getElementById("donationList");
        if (!container) return;

        renderSkeletonCards(container, 3);

        const response = await fetch(`${API_URL}/donations`);
        const data = await response.json();

        container.innerHTML = "";
        const available = data.filter(item => item.status === "available");

        if (available.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-4">
                    <p class="fs-5">No food donations available right now. Be the first to donate!</p>
                </div>
            `;
            return;
        }

        available.forEach(item => {
            const card = document.createElement("div");
            card.className = "col-md-4 mb-4";
            card.innerHTML = `
                <div class="card glass-card p-4 h-100">
                    <h5 class="text-success fw-bold">🍱 ${item.foodName}</h5>
                    <div class="mt-3">
                        <p class="mb-2"><strong>Quantity:</strong> ${item.quantity}</p>
                        <p class="mb-2"><strong>Location:</strong> ${item.location}</p>
                        <p class="mb-0 text-muted"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading donations:", error);
    }
}

async function submitDonation() {
    const foodNameVal = document.getElementById("foodName");
    const quantityVal = document.getElementById("quantity");
    const locationVal = document.getElementById("location");

    if (!foodNameVal || !quantityVal || !locationVal) return;

    const foodName = foodNameVal.value.trim();
    const quantity = quantityVal.value.trim();
    const location = locationVal.value.trim();

    if (!foodName || !quantity || !location) {
        showToast("Please fill in all donation fields.", "error");
        return;
    }

    const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
        showToast("You must be logged in to list food.", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 1000);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/donations`, {
            method: "POST",
            headers,
            body: JSON.stringify({ foodName, quantity, location })
        });

        if (response.ok) {
            showToast("Donation submitted successfully! 🎉");
            foodNameVal.value = "";
            quantityVal.value = "";
            locationVal.value = "";
            loadDonations();
        } else {
            const err = await response.json();
            showToast("Failed to submit: " + (err.error || "Unknown error"), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Network error submitting donation", "error");
    }
}

// ----------------- DONATE PAGE -----------------
async function handleDonateSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
        showToast("You must be logged in to donate food.", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 1000);
        return;
    }

    const foodName = document.getElementById("foodNameInput").value.trim();
    const quantity = document.getElementById("quantityInput").value.trim();
    const location = document.getElementById("locationInput").value.trim();
    const expiryVal = document.getElementById("expiryInput").value;
    const category = document.getElementById("categoryInput") ? document.getElementById("categoryInput").value : "Other";
    const donorName = document.getElementById("donorNameInput") ? document.getElementById("donorNameInput").value.trim() : "";
    const donorPhone = document.getElementById("donorPhoneInput") ? document.getElementById("donorPhoneInput").value.trim() : "";
    const donorEmail = document.getElementById("donorEmailInput") ? document.getElementById("donorEmailInput").value.trim() : "";
    const city = document.getElementById("cityInput") ? document.getElementById("cityInput").value.trim() : "";
    const district = document.getElementById("districtInput") ? document.getElementById("districtInput").value.trim() : "";
    const state = document.getElementById("stateInput") ? document.getElementById("stateInput").value : "";
    const pincode = document.getElementById("pincodeInput") ? document.getElementById("pincodeInput").value.trim() : "";
    const rawLat = document.getElementById("latitudeInput") ? document.getElementById("latitudeInput").value : "";
    const rawLng = document.getElementById("longitudeInput") ? document.getElementById("longitudeInput").value : "";
    const imageUrl = document.getElementById("foodImagePreview") && document.getElementById("foodImagePreview").src ? document.getElementById("foodImagePreview").src : "";

    const latitude = rawLat && rawLat.trim() ? parseFloat(rawLat) : null;
    const longitude = rawLng && rawLng.trim() ? parseFloat(rawLng) : null;

    let expiry = "Not specified";
    let expiryDate = null;
    if (expiryVal) {
        expiryDate = new Date(expiryVal).toISOString();
        expiry = new Date(expiryVal).toLocaleString();
    }

    // Show loading state
    const submitBtn = document.getElementById("donateSubmitBtn");
    if (submitBtn) {
        submitBtn.classList.add("submit-loading");
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Dispatching to AI...';
    }

    try {
        const response = await fetch(`${API_URL}/donations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
                foodName, quantity, location, expiry, expiryDate,
                category, donorName, donorPhone, donorEmail,
                address: location, city, district, state, pincode,
                latitude, longitude, imageUrl
            })
        });

        if (response.ok) {
            showToast("Donation posted successfully! 🌱");
            setTimeout(() => {
                const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
                if (user && user.role === "NGO") window.location.href = "ngo-dashboard.html";
                else window.location.href = "findfood.html";
            }, 1000);
        } else {
            const err = await response.json().catch(() => ({ error: "Server returned error status " + response.status }));
            showToast("Error: " + (err.error || "Failed to post donation"), "error");
            if (submitBtn) {
                submitBtn.classList.remove("submit-loading");
                submitBtn.innerHTML = 'Post Surplus Food Listing 🌱';
            }
        }
    } catch (error) {
        console.error("Donation submit error:", error);
        showToast("Network error: Unable to reach server. Please check your connection.", "error");
        if (submitBtn) {
            submitBtn.classList.remove("submit-loading");
            submitBtn.innerHTML = 'Post Surplus Food Listing 🌱';
        }
    }
}

// Detect donor location using browser geolocation
function detectDonorLocation() {
    const btn = document.getElementById("detectLocationBtn");
    const statusEl = document.getElementById("geoStatus");
    if (!btn || !statusEl) return;

    if (!navigator.geolocation) {
        statusEl.textContent = "⚠️ Geolocation not supported";
        statusEl.className = "geo-status pending";
        return;
    }

    btn.classList.add("loading");
    statusEl.textContent = "⏳ Detecting location...";
    statusEl.className = "geo-status pending";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            document.getElementById("latitudeInput").value = lat;
            document.getElementById("longitudeInput").value = lng;
            statusEl.textContent = `✅ GPS: ${lat}, ${lng}`;
            statusEl.className = "geo-status success";
            btn.classList.remove("loading");
            showToast("Location detected! GPS coordinates saved. 📍");
            updateAIPriorityCard();
            reverseGeocodeCoordinates(lat, lng);
        },
        (error) => {
            statusEl.textContent = "⚠️ Location denied — address will be geocoded";
            statusEl.className = "geo-status pending";
            btn.classList.remove("loading");
            showToast("Could not detect location. Address will be auto-geocoded.", "error");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Reverse geocode lat/lng to populate address fields if empty
async function reverseGeocodeCoordinates(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'ZERO-WASTE-AI/1.0' } });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.address) {
            const addr = data.address;
            const cityInput = document.getElementById("cityInput");
            const districtInput = document.getElementById("districtInput");
            const stateInput = document.getElementById("stateInput");
            const pincodeInput = document.getElementById("pincodeInput");

            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || "";
            const detectedDistrict = addr.state_district || addr.county || addr.district || "";
            const detectedState = addr.state || "";
            const detectedPincode = addr.postcode || "";

            if (cityInput && !cityInput.value && detectedCity) cityInput.value = detectedCity;
            if (districtInput && !districtInput.value && detectedDistrict) districtInput.value = detectedDistrict;
            if (pincodeInput && !pincodeInput.value && detectedPincode) pincodeInput.value = detectedPincode;
            
            if (stateInput && (!stateInput.value || stateInput.value === "")) {
                for (let opt of stateInput.options) {
                    if (opt.value.toLowerCase() === detectedState.toLowerCase()) {
                        stateInput.value = opt.value;
                        break;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Reverse geocode warning:", e.message);
    }
}

// Update AI priority card based on form inputs
function updateAIPriorityCard() {
    const scoreEl = document.getElementById("aiPriorityScore");
    const textEl = document.getElementById("aiPriorityText");
    if (!scoreEl || !textEl) return;

    const expiryVal = document.getElementById("expiryInput") ? document.getElementById("expiryInput").value : "";
    const quantityVal = document.getElementById("quantityInput") ? document.getElementById("quantityInput").value : "";
    const latVal = document.getElementById("latitudeInput") ? document.getElementById("latitudeInput").value : "";

    let score = 50;
    let reasons = [];

    if (expiryVal) {
        const hoursLeft = (new Date(expiryVal) - new Date()) / 3600000;
        if (hoursLeft <= 4) {
            score += 30;
            reasons.push("⏰ Critical expiry (<4 hrs)");
        } else if (hoursLeft <= 12) {
            score += 20;
            reasons.push("⏰ Urgent expiry (<12 hrs)");
        } else if (hoursLeft <= 24) {
            score += 10;
            reasons.push("⏰ Same-day expiry");
        }
    }

    if (quantityVal) {
        const qtyMatch = quantityVal.match(/(\d+)/);
        if (qtyMatch && parseInt(qtyMatch[1]) >= 30) {
            score += 15;
            reasons.push("📦 Large quantity");
        }
    }

    if (latVal) {
        score += 10;
        reasons.push("📍 GPS coordinates ready");
    }

    score = Math.min(99, Math.max(10, score));
    scoreEl.textContent = score + "%";
    scoreEl.style.background = score >= 80
        ? "linear-gradient(135deg, #ef4444, #f59e0b)"
        : score >= 60
            ? "linear-gradient(135deg, #f59e0b, #10b981)"
            : "linear-gradient(135deg, #10b981, #3b82f6)";

    textEl.textContent = reasons.length > 0
        ? "AI predicts " + (score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "STANDARD") + " rescue priority. " + reasons.join(". ") + "."
        : "Fill in the form with expiry date & quantity to see AI-predicted rescue priority.";
}

// Food image upload preview
function handleFoodImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = document.getElementById("foodImagePreview");
        const container = document.getElementById("imagePreviewContainer");
        const placeholder = document.getElementById("imagePlaceholder");
        if (img && container && placeholder) {
            img.src = event.target.result;
            container.classList.add("has-image");
            placeholder.style.display = "none";
        }
    };
    reader.readAsDataURL(file);
}

// ----------------- FIND FOOD PAGE -----------------
let allDonations = [];
async function loadAvailableFood() {
    try {
        const container = document.getElementById("findFoodList");
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        const response = await fetch(`${API_URL}/donations`);
        allDonations = await response.json();
        renderFoodList(allDonations);
    } catch (error) {
        console.error(error);
    }
}

function renderFoodList(items) {
    const container = document.getElementById("findFoodList");
    if (!container) return;

    container.innerHTML = "";
    const activeItems = items.filter(d => d.status === "available");

    if (activeItems.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-muted fs-5">No available food donations found.</p>
            </div>
        `;
        return;
    }

    activeItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "card glass-card p-4 mb-4 animate-fade-in";
        const donorName = item.donor ? item.donor.fullName : 'Anonymous';
        
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap">
                <div class="mb-3 mb-sm-0">
                    <h4 class="text-success fw-bold mb-2">🍱 ${item.foodName}</h4>
                    <p class="mb-1"><strong>Quantity:</strong> ${item.quantity}</p>
                    <p class="mb-1"><strong>Location:</strong> ${item.location}</p>
                    <p class="mb-1"><strong>Donor:</strong> ${donorName}</p>
                    <p class="mb-0 text-muted"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>
                </div>
                <div>
                    <button class="btn btn-success px-4" onclick="claimFoodDirect(${item._id ? `'${item._id}'` : `'${item.id}'`})">Request Food</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allDonations.filter(item => 
        item.foodName.toLowerCase().includes(query) || 
        item.location.toLowerCase().includes(query)
    );
    renderFoodList(filtered);
}

async function claimFoodDirect(id) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
        showToast("You must be logged in to request food.", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 1000);
        return;
    }

    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
    if (user && user.role !== "NGO" && user.role !== "Admin") {
        showToast("Only NGOs can request surplus food.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/donations/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            showToast("Food requested successfully! NGO has been alerted. 🤝");
            loadAvailableFood();
        } else {
            const err = await response.json();
            showToast(err.error || "Could not request food.", "error");
        }
    } catch (error) {
        showToast("Network error claiming food", "error");
    }
}

// ----------------- DONOR DASHBOARD PAGE -----------------
// ----------------- DONOR DASHBOARD PAGE -----------------
async function loadDashboardStats() {
    try {
        const statsRes = await fetch(`${API_URL}/stats`);
        const stats = await statsRes.json();

        document.getElementById("stats-total-donations").innerText = stats.totalDonations;
        document.getElementById("stats-people-fed").innerText = stats.peopleFed;
        document.getElementById("stats-ngos-connected").innerText = stats.ngosConnected;
        document.getElementById("stats-food-saved").innerText = stats.foodSaved;

        // Always set hero donations from /api/stats (independent of analytics endpoint)
        const heroDonationsEl = document.getElementById('hero-donations');
        if (heroDonationsEl) heroDonationsEl.textContent = (stats.totalDonations || 0).toLocaleString();

        // Populate hero analytics card with real data from analytics endpoint
        try {
            const analyticsRes = await fetch(`${API_URL}/stats/analytics`);
            const analytics = await analyticsRes.json();

            if (analytics && analytics.environmental) {
                const env = analytics.environmental;
                const co2El = document.getElementById('hero-co2');
                const mealsEl = document.getElementById('hero-meals');
                const metricEl = document.getElementById('hero-main-metric');
                const metricLabel = document.getElementById('hero-metric-label');

                if (co2El) co2El.textContent = (env.co2SavedKg || 0).toLocaleString();
                if (mealsEl) mealsEl.textContent = (env.mealsProvided || 0).toLocaleString();
                if (metricEl) metricEl.textContent = (env.foodSavedKg || 0).toLocaleString() + ' kg';
                if (metricLabel) metricLabel.textContent = 'Food saved from landfills';
            }
        } catch (analyticsErr) {
            console.warn('Hero analytics load failed:', analyticsErr.message);
        }

        // Calculate pickup readiness from public donations endpoint
        try {
            const allDonationsRes = await fetch(`${API_URL}/donations`);
            const allDonations = await allDonationsRes.json();
            const availableCount = allDonations.filter(d => d.status === 'available').length;
            const totalCount = allDonations.length || 1;
            const pickupPct = Math.round((availableCount / totalCount) * 100);

            const pickupEl = document.getElementById('hero-pickup-readiness');
            const pickupBar = document.getElementById('hero-pickup-bar');
            if (pickupEl) pickupEl.textContent = pickupPct + '%';
            if (pickupBar) {
                pickupBar.style.width = pickupPct + '%';
                pickupBar.className = 'progress-bar';
            }

            // NGO response rate (simulated from ngosConnected vs total donations)
            const responsePct = stats.ngosConnected ? Math.min(100, 85 + Math.floor((stats.ngosConnected / 50) * 5)) : 87;
            const responseEl = document.getElementById('hero-ngo-response');
            const responseBar = document.getElementById('hero-ngo-bar');
            if (responseEl) responseEl.textContent = responsePct + '%';
            if (responseBar) {
                responseBar.style.width = responsePct + '%';
                responseBar.className = 'progress-bar';
            }
        } catch (donationsErr) {
            console.warn('Pickup readiness load failed:', donationsErr.message);
        }

        const donationsRes = await fetch(`${API_URL}/donations/history`, { headers: getAuthHeaders() });
        if (!donationsRes.ok) return;

        const donations = await donationsRes.json();
        const tableBody = document.getElementById("recentDonationsTableBody");
        if (tableBody) {
            tableBody.innerHTML = "";
            
            if (donations.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">You haven\'t posted any donations yet.</td></tr>';
                return;
            }

            const recent = donations.slice(0, 5);
            recent.forEach(item => {
                const tr = document.createElement("tr");
                const isClaimed = item.status === "claimed" || item.status === "accepted" || item.status === "picked up" || item.status === "delivered";
                
                tr.innerHTML = `
                    <td class="fw-bold text-success">${item.foodName}</td>
                    <td>${item.quantity}</td>
                    <td>${item.location}</td>
                    <td>
                        <span class="status-badge ${isClaimed ? 'badge-claimed' : 'badge-available'}">
                            ${item.status}
                        </span>
                    </td>
                    <td>
                        ${!isClaimed 
                            ? `<button class="btn btn-success btn-sm px-3" onclick="viewAIRecommendations('${item._id || item.id}', '${item.foodName.replace(/'/g, "\\'")}')">🤖 AI Match</button>`
                            : `<button class="btn btn-secondary btn-sm px-3" disabled>Assigned</button>`
                        }
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

async function viewAIRecommendations(donationId, donationName) {
    document.getElementById("aiMatchingListingName").innerText = "Surplus Listing: " + donationName;
    
    const bestCard = document.getElementById("aiBestNgoCard");
    const listBody = document.getElementById("aiRecommendationsTableBody");

    bestCard.innerHTML = `
        <div class="text-center py-3 text-muted">
            <div class="spinner-border text-success spinner-border-sm me-2" role="status"></div>
            Analyzing NGOs compatibility...
        </div>
    `;
    listBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-3 text-muted">Loading recommendations...</td>
        </tr>
    `;

    // Show modal
    const matchingModal = new bootstrap.Modal(document.getElementById('aiMatchingModal'));
    matchingModal.show();

    try {
        const response = await fetch(`${API_URL}/matching/donations/${donationId}`, { headers: getAuthHeaders() });
        if (!response.ok) {
            bestCard.innerHTML = `<div class="alert alert-danger mb-0">Error calculating recommendations.</div>`;
            return;
        }

        const data = await response.json();
        const recs = data.recommendations;

        if (!recs || recs.length === 0) {
            bestCard.innerHTML = `<div class="alert alert-warning mb-0">No active NGOs found in system.</div>`;
            listBody.innerHTML = '<tr><td colspan="6" class="text-center">No matches calculated.</td></tr>';
            return;
        }

        // 1. Render Best NGO Match with Circular SVG Progress Meter
        const best = recs[0];
        const circumference = 226.19;
        const strokeDashoffset = circumference - (circumference * best.score / 100);
        
        bestCard.innerHTML = `
            <div class="recommendation-card-premium top-match p-4">
                <div class="circle-progress-wrapper">
                    <svg class="circle-progress-svg" width="90" height="90" viewBox="0 0 90 90">
                        <circle class="circle-progress-bg" cx="45" cy="45" r="36"></circle>
                        <circle class="circle-progress-bar" cx="45" cy="45" r="36" 
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"></circle>
                    </svg>
                    <div class="circle-progress-text">${best.score}%</div>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <h4 class="fw-bold text-success m-0">🏆 ${best.ngo.fullName}</h4>
                        <span class="badge ${best.priority === 'High' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill">${best.priority} Priority</span>
                    </div>
                    <p class="mb-2 text-muted small">📍 Base Location: ${best.ngo.location || 'N/A'} | 📞 Contact: ${best.ngo.mobileNumber}</p>
                    <div class="d-flex align-items-center gap-3 text-muted small">
                        <span>🕒 Pickup ETA: <strong>${best.estimatedPickup}</strong></span>
                        <span>📏 Distance: <strong>${best.distance} km</strong></span>
                        <span>⚡ Match Confidence: <strong>${best.score}%</strong></span>
                    </div>
                </div>
                <div>
                    <button class="btn btn-success px-4 py-2 rounded-pill fw-bold shadow-sm" onclick="assignNGO('${donationId}', '${best.ngo.id}', ${best.score}, ${best.distance}, '${best.priority}')">
                        Assign Listing 🤝
                    </button>
                </div>
            </div>
        `;

        // 2. Render Top Recommendations Table
        listBody.innerHTML = "";
        recs.forEach((rec, idx) => {
            const tr = document.createElement("tr");
            const cOffset = circumference - (circumference * rec.score / 100);
            tr.innerHTML = `
                <td class="fw-bold text-success">
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-light text-dark rounded-circle border" style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">${idx + 1}</span>
                        ${rec.ngo.fullName}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress w-100" style="height: 8px; min-width: 70px;">
                            <div class="progress-bar bg-success rounded" style="width: ${rec.score}%;"></div>
                        </div>
                        <span class="fw-bold small">${rec.score}%</span>
                    </div>
                </td>
                <td>${rec.distance} km</td>
                <td>${rec.estimatedPickup}</td>
                <td>
                    <span class="badge ${rec.priority === 'High' ? 'bg-danger' : rec.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-secondary'} rounded-pill">
                        ${rec.priority}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline-success btn-sm px-3 rounded-pill" onclick="assignNGO('${donationId}', '${rec.ngo.id}', ${rec.score}, ${rec.distance}, '${rec.priority}')">Assign</button>
                </td>
            `;
            listBody.appendChild(tr);
        });


    } catch (e) {
        console.error(e);
        bestCard.innerHTML = `<div class="alert alert-danger mb-0">Network error fetching AI stats.</div>`;
    }
}

async function assignNGO(donationId, ngoId, score, distance, priority) {
    try {
        const response = await fetch(`${API_URL}/matching/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ donationId, ngoId, score, distance, priority })
        });

        if (response.ok) {
            showToast("Surplus food assigned to NGO successfully! 🤝");
            // Hide modal
            const matchingModal = bootstrap.Modal.getInstance(document.getElementById('aiMatchingModal'));
            if (matchingModal) matchingModal.hide();
            // Refresh table
            loadDashboardStats();
        } else {
            const err = await response.json();
            showToast(err.error || "Failed to assign donation", "error");
        }
    } catch (error) {
        showToast("Network error assigning donation", "error");
    }
}


// ----------------- LOGIN / SIGNUP -----------------
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const rememberMe = document.getElementById("rememberMe")?.checked;

    if (!validateEmail(email)) {
        showToast("Please enter a valid email address.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", data.token);
            storage.setItem("user", JSON.stringify(data.user));
            showToast("Login successful! Redirecting... 🚀");
            
            setTimeout(() => {
                if (data.user.role === "NGO") window.location.href = "ngo-dashboard.html";
                else if (data.user.role === "Admin") window.location.href = "admin-dashboard.html";
                else window.location.href = "dashboard.html";
            }, 1000);
        } else {
            showToast(data.error || "Login failed.", "error");
        }
    } catch (error) {
        showToast("Network error during login", "error");
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const mobileNumber = document.getElementById("signupMobile").value.trim();
    const role = document.getElementById("signupRole").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    // ─── Inline Validation ────────────────────────────────────────────────
    const showFieldError = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    };

    let isValid = true;
    if (!fullName) {
        showFieldError("signupNameError", true);
        isValid = false;
    } else {
        showFieldError("signupNameError", false);
    }

    if (!validateEmail(email)) {
        showFieldError("signupEmailError", true);
        isValid = false;
    } else {
        showFieldError("signupEmailError", false);
    }

    if (!mobileNumber || mobileNumber.replace(/[^0-9]/g, '').length < 10) {
        showFieldError("signupMobileError", true);
        isValid = false;
    } else {
        showFieldError("signupMobileError", false);
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters long.", "error");
        isValid = false;
    }

    if (password !== confirmPassword) {
        showFieldError("signupConfirmError", true);
        isValid = false;
    } else {
        showFieldError("signupConfirmError", false);
    }

    if (!isValid) return;

    // ─── NGO-Specific Fields ──────────────────────────────────────────────
    const body = { fullName, email, mobileNumber, role, password };
    if (role === "NGO") {
        const city = document.getElementById("signupNgoCity") ? document.getElementById("signupNgoCity").value.trim() : "";
        const state = document.getElementById("signupNgoState") ? document.getElementById("signupNgoState").value.trim() : "";
        const location = document.getElementById("signupNgoLocation") ? document.getElementById("signupNgoLocation").value.trim() : "";
        const capacity = document.getElementById("signupNgoCapacity") ? document.getElementById("signupNgoCapacity").value : "";
        const preferences = document.getElementById("signupNgoPreferences") ? document.getElementById("signupNgoPreferences").value.trim() : "";
        if (city) body.city = city;
        if (state) body.state = state;
        if (location) body.location = location;
        if (capacity) body.capacity = parseInt(capacity) || 100;
        if (preferences) body.preferences = preferences;
    }

    // ─── Submit ───────────────────────────────────────────────────────────
    const submitBtn = document.getElementById("signupSubmitBtn");
    if (submitBtn) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Creating account...';
        submitBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Registration successful! Please login. 🎉");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        } else {
            showToast(data.error || "Signup failed.", "error");
            if (submitBtn) {
                submitBtn.innerHTML = 'Create Account 🌱';
                submitBtn.disabled = false;
            }
        }
    } catch (error) {
        showToast("Network error during registration", "error");
        if (submitBtn) {
            submitBtn.innerHTML = 'Create Account 🌱';
            submitBtn.disabled = false;
        }
    }
}

// ----------------- PROFILE PAGE -----------------
async function loadProfileData() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, { headers: getAuthHeaders() });
        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }

        const user = await response.json();
        
        // Populate profile form fields
        document.getElementById("profileFullName").value = user.fullName;
        document.getElementById("profileEmail").value = user.email;
        document.getElementById("profileMobile").value = user.mobileNumber;

        // Summary details
        document.getElementById("profileSummaryName").innerText = user.fullName;
        document.getElementById("profileSummaryRole").innerText = `${user.role} Member`;
        document.getElementById("profileSummaryEmail").innerText = user.email;

        if (user.avatar) {
            document.getElementById("profileAvatarDisplay").src = user.avatar;
        }

        // Load History logs
        const historyRes = await fetch(`${API_URL}/donations/history`, { headers: getAuthHeaders() });
        const history = await historyRes.json();
        
        // ─── Impact Metrics Calculation ──────────────────────────────────
        let totalMeals = 0;
        let totalKg = 0;

        history.forEach(item => {
            const match = (item.quantity || '').match(/(\d+)/);
            const qty = match ? parseInt(match[1]) : 0;
            if (!qty) return;
            
            if ((item.quantity || '').toLowerCase().includes('kg')) {
                totalKg += qty;
            } else if ((item.quantity || '').toLowerCase().includes('plate') || 
                       (item.quantity || '').toLowerCase().includes('meal') ||
                       (item.quantity || '').toLowerCase().includes('pack')) {
                totalMeals += qty;
            } else {
                totalMeals += qty;
            }
        });

        const mealsSavedEl = document.getElementById("profileMealsSaved");
        if (mealsSavedEl) mealsSavedEl.textContent = (totalMeals + totalKg * 2).toLocaleString();

        const carbonSavedEl = document.getElementById("profileCarbonSaved");
        if (carbonSavedEl) carbonSavedEl.textContent = Math.round((totalKg + totalMeals * 0.4) * 2.5).toLocaleString() + ' kg';

        const achievementsEl = document.getElementById("profileAchievements");
        if (achievementsEl) {
            let achievements = 0;
            if (history.length >= 1) achievements++;
            if (history.length >= 5) achievements++;
            if (history.length >= 10) achievements++;
            if (totalMeals + totalKg * 2 >= 100) achievements++;
            if (totalMeals + totalKg * 2 >= 500) achievements++;
            achievementsEl.textContent = achievements;
        }

        const rankEl = document.getElementById("profileRank");
        if (rankEl) {
            rankEl.textContent = '#' + Math.max(1, 100 - history.length * 1.5).toFixed(0);
        }

        const tableBody = document.getElementById("profileHistoryTableBody");
        tableBody.innerHTML = "";
        
        document.getElementById("historyTitle").innerText = user.role === "NGO" ? "Claimed Distributions" : "My Surplus Listings";

        if (history.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">No activity history logged.</td></tr>';
            return;
        }

        history.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-success">${item.foodName}</td>
                <td>${item.quantity}</td>
                <td>${item.location}</td>
                <td>
                    <span class="status-badge ${item.status === 'delivered' ? 'status-delivered' : item.status === 'picked up' ? 'status-pickup' : 'status-accepted'}">
                        ${item.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const fullName = document.getElementById("profileFullName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    const mobileNumber = document.getElementById("profileMobile").value.trim();

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ fullName, email, mobileNumber })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Profile details updated! 🌱");
            // Update local user details cache
            localStorage.setItem("user", JSON.stringify(data.user));
            loadProfileData();
        } else {
            showToast(data.error || "Update failed.", "error");
        }
    } catch (error) {
        showToast("Network error updating profile", "error");
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;

    if (newPassword.length < 6) {
        showToast("New password must be at least 6 characters.", "error");
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showToast("Confirm passwords do not match.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Password updated successfully! 🔐");
            document.getElementById("passwordChangeForm").reset();
        } else {
            showToast(data.error || "Failed to change password.", "error");
        }
    } catch (error) {
        showToast("Network error changing password", "error");
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        const base64Data = reader.result;
        try {
            const response = await fetch(`${API_URL}/auth/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ avatar: base64Data })
            });

            if (response.ok) {
                showToast("Avatar image uploaded successfully!");
                document.getElementById("profileAvatarDisplay").src = base64Data;
            }
        } catch (error) {
            showToast("Failed to upload avatar", "error");
        }
    };
    reader.readAsDataURL(file);
}

// ----------------- NGO DASHBOARD CONTROLLER -----------------
let ngoAllDonations = [];
async function loadNGOData() {
    try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        // Available items from main public endpoint
        const response = await fetch(`${API_URL}/donations`);
        ngoAllDonations = await response.json();

        // Claims history for this NGO
        const historyRes = await fetch(`${API_URL}/donations/history`, { headers: getAuthHeaders() });
        const claimedList = await historyRes.json();

        renderNGOLists(ngoAllDonations, claimedList);
        calculateNGOMetrics(claimedList);

        // Update mini-map and route optimizer (defined in ngo-dashboard.html)
        if (typeof updateMiniMap === 'function') {
            updateMiniMap(ngoAllDonations);
        }
        if (typeof updateRouteOptimizer === 'function') {
            updateRouteOptimizer(claimedList);
        }

    } catch (error) {
        console.error(error);
    }
}

// Haversine distance calculation (km) between two GPS points
const haversineDistanceClient = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Extract coordinates from a donation or NGO object (supports lat/lng or latitude/longitude)
const extractCoords = (obj) => {
    if (!obj) return null;
    const lat = obj.latitude || obj.lat;
    const lng = obj.longitude || obj.lng;
    return lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
};

const calculateDistance = (donation, ngo) => {
    const donCoords = extractCoords(donation);
    const ngoCoords = extractCoords(ngo);
    
    if (donCoords && ngoCoords) {
        const d = haversineDistanceClient(donCoords.lat, donCoords.lng, ngoCoords.lat, ngoCoords.lng);
        if (d !== null) return d;
    }
    
    // Fallback: same city by name match → 3.4 km, otherwise 15 km default
    const l1 = ((donation && (donation.city || donation.location)) || '').toLowerCase().trim();
    const l2 = ((ngo && (ngo.city || ngo.location)) || '').toLowerCase().trim();
    if (l1 && l2 && l1 === l2) return 3.4;
    return 15.0;
};

const calculateClientMatchScore = (donation, ngo) => {
    let score = 0;

    // 1. Distance (max 40 pts) — GPS-based, All-India
    const distance = calculateDistance(donation, ngo);
    if (distance <= 5) score += 40;
    else if (distance <= 15) score += 30;
    else if (distance <= 30) score += 20;
    else if (distance <= 60) score += 10;
    else score += 4;

    // 2. Food Category Preference Match (max 20 pts)
    const foodName = (donation.foodName || '').toLowerCase();
    const category = (donation.category || '').toLowerCase();
    const prefs = ((ngo && ngo.preferences) || 'Meals, Vegetables, Snacks, Bread').toLowerCase();

    let isPrefMatch = false;
    if (category.includes('cooked') || foodName.includes('rice') || foodName.includes('meal') || foodName.includes('curry') || foodName.includes('biryani')) {
        if (prefs.includes('meal')) isPrefMatch = true;
    }
    if (category.includes('bakery') || foodName.includes('bread') || foodName.includes('snack') || foodName.includes('pack')) {
        if (prefs.includes('bread') || prefs.includes('snack')) isPrefMatch = true;
    }
    if (category.includes('produce') || foodName.includes('vegetable') || foodName.includes('fruit') || foodName.includes('veg')) {
        if (prefs.includes('vegetables') || prefs.includes('veg') || prefs.includes('fruit')) isPrefMatch = true;
    }
    if (category.includes('dairy') || foodName.includes('milk') || foodName.includes('curd') || foodName.includes('paneer')) {
        if (prefs.includes('dairy') || prefs.includes('milk')) isPrefMatch = true;
    }

    if (isPrefMatch) score += 20;

    // 3. Expiry / Urgency (max 20 pts)
    const expiry = (donation.expiry || donation.expiryDate || '').toLowerCase();
    const isUrgent = expiry.includes('today') || expiry.includes('pm') || expiry.includes('hr') || expiry.includes('hour');
    
    if (isUrgent) {
        score += 15;
        if (distance <= 15) score += 5;
    } else {
        score += 10;
    }

    // 4. Quantity vs NGO capacity (max 20 pts)
    const match = (donation.quantity || '').match(/(\d+)/);
    const qtyNum = match ? parseInt(match[1]) : 10;
    const capacity = (ngo && ngo.capacity) || 120;
    
    if (qtyNum <= capacity) {
        score += 20;
    } else if (qtyNum <= capacity * 1.5) {
        score += 12;
    } else {
        score += 5;
    }

    // 5. NGO Availability modifier
    const availability = ((ngo && ngo.availability) || 'Active').toLowerCase();
    if (availability === 'inactive') score -= 15;
    else if (availability === 'busy') score -= 8;
    else score += 5;

    const finalScore = Math.max(10, Math.min(100, Math.round(score)));
    
    let priority = 'Medium';
    if (finalScore >= 80) priority = 'High';
    else if (finalScore < 50) priority = 'Low';

    const baseMinutes = Math.round(distance * 2.2 + 12);
    const estimatedPickup = isUrgent ? Math.round(baseMinutes * 0.7) : baseMinutes;

    return {
        score: finalScore,
        distance: Math.round(distance * 10) / 10,
        priority,
        estimatedPickup: `${estimatedPickup} mins`
    };
};

function renderNGOLists(allDonations, claimedList) {

    const availableContainer = document.getElementById("ngoAvailableList");
    const claimsContainer = document.getElementById("ngoClaimsList");

    // Kanban containers
    const kanbanAvailable = document.getElementById("kanbanAvailable");
    const kanbanAccepted = document.getElementById("kanbanAccepted");
    const kanbanPickedUp = document.getElementById("kanbanPickedUp");
    const kanbanDelivered = document.getElementById("kanbanDelivered");

    const loggedInNGO = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
    const availableItems = allDonations.filter(d => d.status === "available");

    // ----------------- KANBAN BOARD RENDERING -----------------
    if (kanbanAvailable || kanbanAccepted || kanbanPickedUp || kanbanDelivered) {
        // 1. Available Column
        if (kanbanAvailable) {
            kanbanAvailable.innerHTML = availableItems.length === 0 
                ? `<div class="text-center py-4 text-muted small">No available food listings.</div>`
                : "";
            
            availableItems.forEach(item => {
                const donorStr = JSON.stringify(item.donor || null).replace(/"/g, '&quot;');
                const metrics = calculateClientMatchScore(item, loggedInNGO);
                const badgeBg = metrics.priority === 'High' ? 'bg-danger' : (metrics.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-secondary');

                const card = document.createElement("div");
                card.className = "kanban-card animate-fade-in";
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-success m-0">🍱 ${item.foodName}</h6>
                        <span class="badge ${badgeBg} rounded-pill">${metrics.priority}</span>
                    </div>
                    <p class="mb-1 small"><strong>Qty:</strong> ${item.quantity}</p>
                    <p class="mb-1 small"><strong>Location:</strong> ${item.location}</p>
                    <p class="mb-2 text-muted small"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>
                    
                    <div class="border-top pt-2 mt-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-success fw-bold small">🤖 AI Score: ${metrics.score}%</span>
                            <span class="text-muted small">${metrics.distance} km</span>
                        </div>
                        <div class="progress mb-2" style="height: 5px;">
                            <div class="progress-bar bg-success rounded" style="width: ${metrics.score}%;"></div>
                        </div>
                    </div>

                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-outline-success btn-sm flex-fill" onclick="showDonorDetailsModal(${donorStr})">📞 Donor</button>
                        <button class="btn btn-success btn-sm flex-fill fw-bold" onclick="updateNGOClaim('${item._id || item.id}', 'accepted')">Accept 🤝</button>
                    </div>
                `;
                kanbanAvailable.appendChild(card);
            });
        }

        // 2. Accepted Column
        const acceptedItems = claimedList.filter(d => d.status === "accepted");
        if (kanbanAccepted) {
            kanbanAccepted.innerHTML = acceptedItems.length === 0
                ? `<div class="text-center py-4 text-muted small">No accepted claims.</div>`
                : "";
            
            acceptedItems.forEach(item => {
                const donorStr = JSON.stringify(item.donor || null).replace(/"/g, '&quot;');
                const card = document.createElement("div");
                card.className = "kanban-card animate-fade-in";
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-warning m-0">🤝 ${item.foodName}</h6>
                        <span class="badge bg-warning text-dark rounded-pill">Accepted</span>
                    </div>
                    <p class="mb-1 small"><strong>Qty:</strong> ${item.quantity}</p>
                    <p class="mb-1 small"><strong>Pickup:</strong> ${item.location}</p>
                    <p class="mb-2 text-muted small"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>

                    <div class="d-flex gap-2 mt-2 border-top pt-2">
                        <button class="btn btn-outline-success btn-sm flex-fill" onclick="showDonorDetailsModal(${donorStr})">📞 Contact</button>
                        <button class="btn btn-warning btn-sm text-dark flex-fill fw-bold" onclick="updateNGOClaim('${item._id || item.id}', 'picked up')">Pickup 🚚</button>
                    </div>
                `;
                kanbanAccepted.appendChild(card);
            });
        }

        // 3. Picked Up Column
        const pickedUpItems = claimedList.filter(d => d.status === "picked up");
        if (kanbanPickedUp) {
            kanbanPickedUp.innerHTML = pickedUpItems.length === 0
                ? `<div class="text-center py-4 text-muted small">No pickups in transit.</div>`
                : "";
            
            pickedUpItems.forEach(item => {
                const donorStr = JSON.stringify(item.donor || null).replace(/"/g, '&quot;');
                const card = document.createElement("div");
                card.className = "kanban-card animate-fade-in";
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-info m-0">🚚 ${item.foodName}</h6>
                        <span class="badge bg-info text-dark rounded-pill">In Transit</span>
                    </div>
                    <p class="mb-1 small"><strong>Qty:</strong> ${item.quantity}</p>
                    <p class="mb-1 small"><strong>Location:</strong> ${item.location}</p>

                    <div class="d-flex gap-2 mt-2 border-top pt-2">
                        <button class="btn btn-outline-success btn-sm flex-fill" onclick="showDonorDetailsModal(${donorStr})">📞 Contact</button>
                        <button class="btn btn-success btn-sm flex-fill fw-bold" onclick="updateNGOClaim('${item._id || item.id}', 'delivered')">Deliver ✅</button>
                    </div>
                `;
                kanbanPickedUp.appendChild(card);
            });
        }

        // 4. Delivered Column
        const deliveredItems = claimedList.filter(d => d.status === "delivered");
        if (kanbanDelivered) {
            kanbanDelivered.innerHTML = deliveredItems.length === 0
                ? `<div class="text-center py-4 text-muted small">No completed deliveries yet.</div>`
                : "";
            
            deliveredItems.forEach(item => {
                const card = document.createElement("div");
                card.className = "kanban-card animate-fade-in";
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-success m-0">✅ ${item.foodName}</h6>
                        <span class="badge bg-success rounded-pill">Completed</span>
                    </div>
                    <p class="mb-1 small"><strong>Qty:</strong> ${item.quantity}</p>
                    <p class="mb-0 small text-muted"><strong>Area:</strong> ${item.location}</p>
                `;
                kanbanDelivered.appendChild(card);
            });
        }

        // Update Kanban Counters
        if (document.getElementById("cntAvailable")) document.getElementById("cntAvailable").textContent = availableItems.length;
        if (document.getElementById("cntAccepted")) document.getElementById("cntAccepted").textContent = acceptedItems.length;
        if (document.getElementById("cntPickedUp")) document.getElementById("cntPickedUp").textContent = pickedUpItems.length;
        if (document.getElementById("cntDelivered")) document.getElementById("cntDelivered").textContent = deliveredItems.length;
    }

    // ----------------- LEGACY CONTAINER FALLBACK -----------------
    if (availableContainer && claimsContainer) {
        availableContainer.innerHTML = "";
        if (availableItems.length === 0) {
            availableContainer.innerHTML = `<div class="card glass-card p-4 text-center text-muted"><p class="mb-0 fs-5">No available surplus listings found in your area.</p></div>`;
        } else {
            availableItems.forEach(item => {
                const card = document.createElement("div");
                card.className = "card glass-card p-4 mb-3 animate-fade-in";
                const donorStr = JSON.stringify(item.donor || null).replace(/"/g, '&quot;');
                const matchMetrics = calculateClientMatchScore(item, loggedInNGO);
                const badgeBg = matchMetrics.priority === 'High' ? 'bg-danger' : (matchMetrics.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-secondary');
                
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                        <div>
                            <h5 class="text-success fw-bold mb-2">🍱 ${item.foodName}</h5>
                            <p class="mb-1"><strong>Quantity:</strong> ${item.quantity}</p>
                            <p class="mb-1"><strong>Pickup Location:</strong> ${item.location}</p>
                            <p class="mb-0 text-muted"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>
                        </div>
                        <div class="mt-3 mt-sm-0">
                            <button class="btn btn-outline-success btn-sm me-2" onclick="showDonorDetailsModal(${donorStr})">📞 Donor Contact</button>
                            <button class="btn btn-success btn-sm" onclick="updateNGOClaim('${item._id || item.id}', 'accepted')">Accept</button>
                        </div>
                    </div>
                    <div class="mt-3 border-top pt-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-success fw-semibold"><small>🤖 AI Match Score: ${matchMetrics.score}%</small></span>
                            <span class="badge ${badgeBg}">${matchMetrics.priority} Emergency</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-success rounded" style="width: ${matchMetrics.score}%;"></div>
                        </div>
                    </div>
                `;
                availableContainer.appendChild(card);
            });
        }

        claimsContainer.innerHTML = "";
        if (claimedList.length === 0) {
            claimsContainer.innerHTML = `<div class="card glass-card p-4 text-center text-muted"><p class="mb-0 fs-5">You have no active claims or pickups scheduled.</p></div>`;
        } else {
            claimedList.forEach(item => {
                const card = document.createElement("div");
                card.className = "card glass-card p-4 mb-3 animate-fade-in";
                let badgeClass = "status-accepted";
                if (item.status === "picked up") badgeClass = "status-pickup";
                else if (item.status === "delivered") badgeClass = "status-delivered";

                let actionButtons = "";
                if (item.status === "accepted") {
                    actionButtons = `
                        <button class="btn btn-success btn-sm me-2" onclick="updateNGOClaim('${item._id || item.id}', 'picked up')">Picked Up</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="updateNGOClaim('${item._id || item.id}', 'available')">Release / Reject</button>
                    `;
                } else if (item.status === "picked up") {
                    actionButtons = `
                        <button class="btn btn-success btn-sm" onclick="updateNGOClaim('${item._id || item.id}', 'delivered')">Mark Delivered</button>
                    `;
                }
                const donorStr = JSON.stringify(item.donor || null).replace(/"/g, '&quot;');
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <h5 class="text-success fw-bold m-0">🍱 ${item.foodName}</h5>
                                <span class="status-badge ${badgeClass}">${item.status}</span>
                            </div>
                            <p class="mb-1"><strong>Quantity:</strong> ${item.quantity}</p>
                            <p class="mb-1"><strong>Location:</strong> ${item.location}</p>
                            <p class="mb-0 text-muted"><small>🕒 Expiry: ${item.expiry || "Not specified"}</small></p>
                        </div>
                        <div class="mt-3 mt-sm-0">
                            <button class="btn btn-outline-success btn-sm me-2" onclick="showDonorDetailsModal(${donorStr})">📞 Donor Contact</button>
                            <div class="d-inline-block mt-2 mt-sm-0">${actionButtons}</div>
                        </div>
                    </div>
                `;
                claimsContainer.appendChild(card);
            });
        }
    }
}

function handleNGOSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = ngoAllDonations.filter(item => 
        item.foodName.toLowerCase().includes(query) || 
        item.location.toLowerCase().includes(query)
    );
    // Reload claims from history
    fetch(`${API_URL}/donations/history`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(claims => {
            renderNGOLists(filtered, claims);
        });
}

function showDonorDetailsModal(donor) {
    const content = document.getElementById("donorModalContent");
    
    if (!donor) {
        content.innerHTML = `<p class="text-danger mb-0">Donor details unavailable.</p>`;
        return;
    }

    content.innerHTML = `
        <div class="donor-info-box">
            <h6 class="fw-bold mb-2">👤 Full Name</h6>
            <p class="mb-3 text-dark fw-semibold">${donor.fullName || 'Not provided'}</p>
            
            <h6 class="fw-bold mb-2">📧 Email Address</h6>
            <p class="mb-3 text-dark fw-semibold">${donor.email || 'Not provided'}</p>
            
            <h6 class="fw-bold mb-2">📞 Mobile Number</h6>
            <p class="mb-0 text-success fw-bold" style="font-size: 1.1rem;">${donor.mobileNumber || 'Not provided'}</p>
        </div>
    `;

    const myModal = new bootstrap.Modal(document.getElementById('donorDetailsModal'));
    myModal.show();
}

async function updateNGOClaim(id, status) {
    try {
        const response = await fetch(`${API_URL}/donations/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (response.ok) {
            showToast(data.message || `Listing status updated to ${status}!`);
            loadNGOData();
        } else {
            showToast(data.error || "Failed to update listing status", "error");
        }
    } catch (error) {
        showToast("Network error updating status", "error");
    }
}

function calculateNGOMetrics(claimedList) {
    const totalClaims = claimedList.length;
    const pendingPickups = claimedList.filter(d => d.status === "accepted" || d.status === "picked up").length;
    const completedDeliveries = claimedList.filter(d => d.status === "delivered").length;

    document.getElementById("ngo-stats-total").innerText = totalClaims;
    document.getElementById("ngo-stats-pending").innerText = pendingPickups;
    document.getElementById("ngo-stats-delivered").innerText = completedDeliveries;
}
