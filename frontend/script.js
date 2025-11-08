// API Configuration - Easy to change for deployment
// Auto-detect API base URL with optional overrides for static hosting (e.g., Vercel)
// Priority:
// 1) window.__API_BASE_URL__ (set via inline script or env-injected)
// 2) <meta name="api-base-url" content="https://your-backend"> in index.html
// 3) localhost:8000 when developing locally
// 4) same-origin (useful when reverse-proxied)
let detectedBaseURL = '';
try {
    const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base-url"]') : null;
    const metaContent = meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
    if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
        detectedBaseURL = String(window.__API_BASE_URL__).trim();
    } else if (metaContent) {
        detectedBaseURL = metaContent;
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        detectedBaseURL = 'http://localhost:8000';
    } else if (typeof window !== 'undefined') {
        detectedBaseURL = window.location.origin;
    }
} catch (e) {
    // Fallback to localhost in case of any error
    detectedBaseURL = 'http://localhost:8000';
}
if (typeof console !== 'undefined') {
    try { console.log('Using API base URL:', detectedBaseURL); } catch (_) {}
}

const API_CONFIG = {
    baseURL: detectedBaseURL,
    endpoints: {
        patients: '/patients',
        patient: (id) => `/patients/${id}`,
        match: '/match',
        emergency: '/patients/emergency/active'
    }
};

// Cache for patients data
let patientsData = {};
let patientsList = [];
let currentMatchingDonors = [];  // Store current matching donors for contact functionality

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
            console.log('API Request:', method, endpoint, body);
        }
        const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, options);
        
        if (!response.ok) {
            // Try to get error details from response
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
                console.error('API Error Details:', errorData);
            } catch (e) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();
        console.log('API Response:', endpoint, data);
        return data;
    } catch (error) {
        console.error('API Call Error:', {
            endpoint,
            method,
            body,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Load patients from API
async function loadPatients() {
    try {
        const response = await apiCall(API_CONFIG.endpoints.patients);
        patientsList = response.patients || [];
        
        // Convert array to object for easier lookup
        patientsData = {};
        patientsList.forEach(patient => {
            patientsData[patient.patient_id] = patient;
        });
        
        // Update patient dropdown
        updatePatientDropdown();
        return patientsList;
    } catch (error) {
        console.error('Error loading patients:', error);
        // Show error message to user
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load patients from API. Please check if the backend server is running.</p>
                    <p class="text-sm mt-2">API URL: ${API_CONFIG.baseURL}</p>
                </div>
            `;
        }
        return [];
    }
}

// Three.js 3D Background
let scene, camera, renderer, particles;

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    document.getElementById('bg-container').appendChild(renderer.domElement);
    
    // Create particle system
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20; 
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        
        // Red-orange gradient colors
        colors[i * 3] = 0.9 + Math.random() * 0.1;     // Red
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // Green
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.1; // Blue
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 5;
    
    animate3D();
}

function animate3D() {
    requestAnimationFrame(animate3D);
    
    particles.rotation.x += 0.001;
    particles.rotation.y += 0.002;
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Counter animation
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.floor(current);
                setTimeout(updateCounter, 20);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    });
}

// Initialize Leaflet Map
let map;
let donorMarkers = [];
let patientMarker = null;

function initMap() {
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add custom CSS for map markers
    const style = document.createElement('style');
    style.textContent = `
        .donor-marker {
            background: linear-gradient(45deg, #ef4444, #f97316);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
            animation: markerPulse 2s infinite;
        }
        
        .patient-marker {
            background: linear-gradient(45deg, #dc2626, #991b1b);
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 0 30px rgba(220, 38, 38, 0.8);
            animation: patientPulse 1.5s infinite;
        }
        
        @keyframes markerPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        
        @keyframes patientPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(220, 38, 38, 0.8); }
            50% { transform: scale(1.3); box-shadow: 0 0 40px rgba(220, 38, 38, 1); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize Network Graph
function initNetworkGraph() {
    const data = [{
        x: [0],
        y: [0], 
        mode: 'markers',
        marker: {
            size: 20,
            color: '#ef4444'
        },
        text: ['Patient'],
        textposition: 'middle center',
        showlegend: false
    }];
    
    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: 'white' },
        xaxis: { visible: false },
        yaxis: { visible: false },
        margin: { t: 0, r: 0, b: 0, l: 0 }
    };
    
    Plotly.newPlot('networkGraph', data, layout, {displayModeBar: false});
}

// Update patient dropdown with data from API
function updatePatientDropdown() {
    const patientSelect = document.getElementById('patientSelect');
    if (!patientSelect) return;
    
    // Clear existing options except the first one
    patientSelect.innerHTML = '<option value="">Select Patient</option>';
    
    // Add patients from API
    patientsList.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.patient_id;
        const bloodType = patient.need || 'Unknown';
        const urgency = patient.urgency || 'Unknown';
        option.textContent = `${patient.patient_id}: ${bloodType} - ${urgency} urgency`;
        patientSelect.appendChild(option);
    });
}

// Patient selection handler
document.getElementById('patientSelect').addEventListener('change', function() {
    const patientId = this.value;
    if (patientId && patientsData[patientId]) {
        const patient = patientsData[patientId];
        document.getElementById('bloodType').value = patient.need || 'Unknown';
        document.getElementById('urgencyLevel').value = (patient.urgency || 'Unknown').toUpperCase();
        document.getElementById('findDonorsBtn').disabled = false;
    } else {
        document.getElementById('bloodType').value = '';
        document.getElementById('urgencyLevel').value = '';
        document.getElementById('findDonorsBtn').disabled = true;
    }
});

// Find donors functionality
document.getElementById('findDonorsBtn').addEventListener('click', async function() {
    const patientId = document.getElementById('patientSelect').value;
    if (!patientId) return;
    
    const patient = patientsData[patientId];
    if (!patient) {
        alert('Patient not found. Please refresh the page.');
        return;
    }
    
    const button = this;
    const btnText = document.getElementById('btnText');
    
    // Show loading state
    button.disabled = true;
    btnText.innerHTML = 'AI Searching<span class="loading-dots"></span>';
    
    try {
        // Call the match API endpoint
        const matchRequest = {
            patient_id: patientId,
            need: patient.need || 'Bombay(Oh)',  // Blood type needed
            location: patient.region || patient.location || 'Unknown',  // Location field is required
            lat: parseFloat(patient.lat) || 19.0760,  // Default to Mumbai
            lon: parseFloat(patient.lon) || 72.8777,
            top_k: 10  // Get top 10 matches
        };
        
        console.log('Sending match request:', matchRequest);
        const matchResponse = await apiCall(API_CONFIG.endpoints.match, 'POST', matchRequest);
        console.log('Match response received:', matchResponse);
        
        // Check if we have matches
        if (!matchResponse || !matchResponse.matches || matchResponse.matches.length === 0) {
            console.warn('No matches found in response:', matchResponse);
            throw new Error('No matching donors found');
        }
        
        // Transform API response to frontend format
        const matchingDonors = matchResponse.matches
            .filter(match => {
                // Filter out donors without coordinates
                const hasCoords = match.lat != null && match.lon != null;
                if (!hasCoords) {
                    console.warn('Donor without coordinates:', match.donor_id);
                }
                return hasCoords;
            })
            .map(match => {
                const lat = parseFloat(match.lat);
                const lon = parseFloat(match.lon);
                return {
                    id: match.donor_id,
                    name: `Donor ${match.donor_id}`,  // You can enhance this with actual donor data
                    bloodType: match.blood_type || 'Unknown',
                    location: match.location || 'Unknown',
                    coordinates: [lat || 19.0760, lon || 72.8777],  // Ensure coordinates are numbers
                    phone: "+91 XXXXX XXXXX",  // Placeholder - can be enhanced with actual donor data
                    availability: "Available",
                    confidence: Math.round((match.score || 0) * 100),  // Convert score (0-1) to percentage
                    lastDonation: "Recently",
                    distance_km: match.distance_km || 0,
                    score: match.score || 0
                };
            });
        
        console.log('Processed matching donors:', matchingDonors);
        
        // Store matching donors globally for contact functionality
        currentMatchingDonors = matchingDonors;
        console.log('Stored matching donors:', currentMatchingDonors.length);
    
    // Update search results
        console.log('Updating search results...');
    updateSearchResults(matchingDonors, patient);
    
        // Update map with donor locations and patient location
        console.log('Updating map with', matchingDonors.length, 'donors');
        updateMap(matchingDonors, matchResponse.patient_info || patient);
    
    // Update network graph
        console.log('Updating network graph...');
    updateNetworkGraph(matchingDonors, patient);
    
    // Reset button
    btnText.textContent = 'Search Complete ✓';
    setTimeout(() => {
        btnText.textContent = 'Find Compatible Donors';
        button.disabled = false;
    }, 2000);
    } catch (error) {
        console.error('Error finding donors:', error);
        console.error('Error stack:', error.stack);
        btnText.textContent = 'Error - Try Again';
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            const errorDetails = error.message || 'Unknown error occurred';
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p class="font-semibold mb-2">Failed to find donors</p>
                    <p class="text-sm">${errorDetails}</p>
                    <p class="text-xs mt-2 text-gray-500">Check browser console (F12) for more details</p>
                </div>
            `;
        }
        setTimeout(() => {
            btnText.textContent = 'Find Compatible Donors';
            button.disabled = false;
        }, 2000);
    }
});

// Update search results
function updateSearchResults(donors, patient) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (donors.length === 0) {
        const bloodType = patient?.need || patient?.bloodType || 'Unknown';
        resultsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-500"></i>
                <p>No compatible donors found for ${bloodType}</p>
                <p class="text-sm mt-2">Please try a different patient or check back later.</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = donors.map(donor => `
        <div class="slide-in bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500 transition-colors">
            <div class="flex items-center justify-between mb-2">
                <h5 class="font-semibold text-lg">${donor.name}</h5>
                <span class="px-3 py-1 bg-green-500 text-xs rounded-full">Available</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
                <div><i class="fas fa-map-marker-alt text-red-500 mr-1"></i>${donor.location}</div>
                <div><i class="fas fa-phone text-green-500 mr-1"></i>${donor.phone}</div>
                <div><i class="fas fa-tint text-red-500 mr-1"></i>${donor.bloodType}</div>
                <div><i class="fas fa-ruler text-blue-500 mr-1"></i>${donor.distance_km ? donor.distance_km.toFixed(1) + ' km' : 'N/A'}</div>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="text-xs text-gray-400 mr-2">AI Match:</span>
                    <div class="w-16 bg-gray-700 rounded-full h-2">
                        <div class="h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" style="width: ${donor.confidence}%"></div>
                    </div>
                    <span class="text-xs text-green-500 ml-2">${donor.confidence}%</span>
                </div>
                <button onclick="contactDonor('${donor.id}')" class="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded text-sm transition-colors">
                    <i class="fas fa-phone mr-1"></i>Contact
                </button>
            </div>
        </div>
    `).join('');
    
    // Trigger slide-in animation
    setTimeout(() => {
        resultsContainer.querySelectorAll('.slide-in').forEach((el, index) => {
            setTimeout(() => el.classList.add('active'), index * 100);
        });
    }, 100);
}

// Update map with donor markers and patient location
function updateMap(donors, patient = null) {
    // Check if map is initialized
    if (!map) {
        console.error('Map not initialized! Cannot update markers.');
        return;
    }
    
    console.log('updateMap called with', donors?.length || 0, 'donors and patient:', patient?.patient_id);
    
    // Clear existing markers
    donorMarkers.forEach(marker => {
        try {
            map.removeLayer(marker);
        } catch (e) {
            console.warn('Error removing donor marker:', e);
        }
    });
    donorMarkers = [];
    
    if (patientMarker) {
        try {
            map.removeLayer(patientMarker);
        } catch (e) {
            console.warn('Error removing patient marker:', e);
        }
        patientMarker = null;
    }
    
    const allMarkers = [];
    
    // Add patient marker if patient data is available
    if (patient && patient.lat && patient.lon) {
        const patientLat = parseFloat(patient.lat);
        const patientLon = parseFloat(patient.lon);
        
        if (!isNaN(patientLat) && !isNaN(patientLon)) {
            // Create custom patient icon
            const patientIcon = L.divIcon({
                className: 'patient-marker',
                html: '<div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(45deg, #dc2626, #991b1b); border: 4px solid white;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            patientMarker = L.marker([patientLat, patientLon], { icon: patientIcon })
                .bindPopup(`
                    <div class="p-2">
                        <h6 class="font-bold text-red-600">Patient: ${patient.patient_id || 'Unknown'}</h6>
                        <p class="text-sm">Blood Type: ${patient.need || 'Unknown'}</p>
                        <p class="text-sm">Hospital: ${patient.hospital || 'Unknown'}</p>
                        <p class="text-sm">Urgency: ${patient.urgency || 'Unknown'}</p>
                    </div>
                `);
            
            patientMarker.addTo(map);
            allMarkers.push(patientMarker);
        }
    }
    
    // Add donor markers
    if (!donors || donors.length === 0) {
        console.warn('No donors to display on map');
    } else {
        console.log('Adding', donors.length, 'donor markers to map');
    }
    
    donors.forEach((donor, index) => {
        // Check if coordinates are valid
        if (!donor.coordinates || !Array.isArray(donor.coordinates) || donor.coordinates.length < 2) {
            console.warn('Invalid coordinates for donor:', donor.id, donor.coordinates);
            return;
        }
        
        const [lat, lon] = donor.coordinates;
        
        // Validate coordinates
        if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
            console.warn('Invalid lat/lon for donor:', donor.id, lat, lon);
            return;
        }
        
        console.log(`Adding marker ${index + 1}/${donors.length} for donor ${donor.id} at [${lat}, ${lon}]`);
        
        // Create custom donor icon
        const donorIcon = L.divIcon({
            className: 'donor-marker',
            html: '<div style="width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(45deg, #ef4444, #f97316); border: 3px solid white;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const marker = L.marker([lat, lon], { icon: donorIcon })
            .bindPopup(`
                <div class="p-2">
                    <h6 class="font-bold">${donor.name}</h6>
                    <p class="text-sm">${donor.location}</p>
                    <p class="text-sm">Blood Type: ${donor.bloodType}</p>
                    <p class="text-sm">Distance: ${donor.distance_km ? donor.distance_km.toFixed(1) + ' km' : 'N/A'}</p>
                    <p class="text-sm text-green-600">Match: ${donor.confidence}%</p>
                </div>
            `);
        
        try {
        marker.addTo(map);
        donorMarkers.push(marker);
            allMarkers.push(marker);
            console.log(`Successfully added marker for donor ${donor.id}`);
        } catch (e) {
            console.error('Error adding marker to map:', e, donor);
        }
    });
    
    console.log(`Total markers added: ${allMarkers.length} (${donorMarkers.length} donors + ${patientMarker ? 1 : 0} patient)`);
    
    // Fit map to show all markers (patient + donors)
    if (allMarkers.length > 0) {
        try {
            const group = new L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds().pad(0.2));
            console.log('Map bounds adjusted to show all markers');
        } catch (e) {
            console.error('Error fitting map bounds:', e);
            // Fallback: center on patient if available
            if (patient && patient.lat && patient.lon) {
                const patientLat = parseFloat(patient.lat);
                const patientLon = parseFloat(patient.lon);
                if (!isNaN(patientLat) && !isNaN(patientLon)) {
                    map.setView([patientLat, patientLon], 10);
                }
            }
        }
    } else if (patient && patient.lat && patient.lon) {
        // If no donors but patient exists, center on patient
        const patientLat = parseFloat(patient.lat);
        const patientLon = parseFloat(patient.lon);
        if (!isNaN(patientLat) && !isNaN(patientLon)) {
            map.setView([patientLat, patientLon], 10);
            console.log('Centered map on patient location');
        }
    } else {
        console.warn('No markers to display and no patient location available');
    }
}

// Update network graph
function updateNetworkGraph(donors, patient) {
    const centerX = 0;
    const centerY = 0;
    const radius = 2;
    
    const traces = [
        // Patient node
        {
            x: [centerX],
            y: [centerY],
            mode: 'markers+text',
            marker: {
                size: 30,
                color: '#ef4444',
                line: { width: 3, color: 'white' }
            },
            text: ['PATIENT'],
            textposition: 'middle center',
            textfont: { size: 10, color: 'white' },
            showlegend: false
        }
    ];
    
    // Donor nodes and connections
    if (donors && donors.length > 0) {
    donors.forEach((donor, index) => {
        const angle = (2 * Math.PI * index) / donors.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Connection line
        traces.push({
            x: [centerX, x],
            y: [centerY, y],
            mode: 'lines',
            line: {
                    color: `rgba(34, 197, 94, ${Math.max(0.3, donor.confidence / 100)})`,
                width: 3
            },
            showlegend: false
        });
        
        // Donor node
        traces.push({
            x: [x],
            y: [y],
            mode: 'markers+text',
            marker: {
                size: 20,
                color: '#22c55e',
                line: { width: 2, color: 'white' }
            },
            text: [`${donor.confidence}%`],
            textposition: 'middle center',
            textfont: { size: 8, color: 'white' },
            showlegend: false
        });
    });
    }
    
    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)', 
        font: { color: 'white' },
        xaxis: { visible: false, range: [-3, 3] },
        yaxis: { visible: false, range: [-3, 3] },
        margin: { t: 20, r: 20, b: 20, l: 20 },
        showlegend: false
    };
    
    Plotly.react('networkGraph', traces, layout, {displayModeBar: false});
}

// Chat functionality
let currentDonor = null;
const chatResponses = [
    "Hello! I received your emergency request. I'm available to donate.",
    "Yes, I can come to the hospital within 30 minutes.",
    "My last donation was {lastDonation}. I'm healthy and ready to help.",
    "Please share the hospital address and I'll head there immediately.",
    "Is the patient stable? I'm praying for them.",
    "I've donated before. I understand the urgency of rare blood types.",
    "On my way to the hospital now. ETA 25 minutes."
];

function contactDonor(donorId) {
    // Find donor from current matching results (stored in a global variable)
    const donor = currentMatchingDonors?.find(d => d.id === donorId);
    if (!donor) {
        console.warn('Donor not found:', donorId);
        return;
    }
    
    currentDonor = donor;
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    
    // Enable chat
    chatInput.disabled = false;
    sendBtn.disabled = false;
    
    // Clear previous messages and add initial message
    chatMessages.innerHTML = `
        <div class="chat-message bg-blue-600 text-white rounded-lg p-3 max-w-xs">
            <div class="font-semibold text-sm mb-1">${donor.name}</div>
            <div>Hello! I received your emergency request. I'm available to donate.</div>
            <div class="text-xs opacity-75 mt-1">Just now</div>
        </div>
    `;
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
document.getElementById('sendChatBtn').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (!message || !currentDonor) return;
    
    const chatMessages = document.getElementById('chatMessages');
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message bg-gray-700 text-white rounded-lg p-3 max-w-xs ml-auto';
    userMessage.innerHTML = `
        <div>${message}</div>
        <div class="text-xs opacity-75 mt-1">Just now</div>
    `;
    chatMessages.appendChild(userMessage);
    
    chatInput.value = '';
    
    // Add donor response after delay
    setTimeout(() => {
        const response = chatResponses[Math.floor(Math.random() * chatResponses.length)]
            .replace('{lastDonation}', currentDonor.lastDonation);
            
        const donorMessage = document.createElement('div');
        donorMessage.className = 'chat-message bg-blue-600 text-white rounded-lg p-3 max-w-xs';
        donorMessage.innerHTML = `
            <div class="font-semibold text-sm mb-1">${currentDonor.name}</div>
            <div>${response}</div>
            <div class="text-xs opacity-75 mt-1">Just now</div>
        `;
        chatMessages.appendChild(donorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Show success modal after a few messages
        if (chatMessages.children.length >= 4) {
            setTimeout(() => {
                document.getElementById('successModal').classList.remove('hidden');
            }, 2000);
        }
    }, 1000 + Math.random() * 2000);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Close success modal
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('successModal').classList.add('hidden');
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
        }
    });
}, observerOptions);

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Three.js background
    initThreeJS();
    
    // Initialize map
    setTimeout(initMap, 500);
    
    // Initialize network graph
    setTimeout(initNetworkGraph, 1000);
    
    // Animate counters
    setTimeout(animateCounters, 1500);
    
    // Load patients from API
    await loadPatients();
    
    // Observe elements for scroll animations
    document.querySelectorAll('.card-hover').forEach(el => {
        observer.observe(el);
    });
    
    // Add some initial visual flair
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Add CSS for fade-in animation
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    .animate-fade-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(fadeInStyle);

// Add some extra visual polish
setInterval(() => {
    // Random glow effect on buttons
    const buttons = document.querySelectorAll('button');
    const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
    if (randomButton) {
        randomButton.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.5)';
        setTimeout(() => {
            randomButton.style.boxShadow = '';
        }, 2000);
    }
}, 10000);