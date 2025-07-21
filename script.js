let loads = [];
let totalPay = 0;
let currentWeek = getCurrentTuesdayWeek();
let tripHistory = JSON.parse(localStorage.getItem('truckingTripHistory') || '{}');

// Updated pay rates structure with taxable and non-taxable components
const payRates = {
    '0-6': {
        '151-350': { total: 0.62, taxable: 0.3906, nonTaxable: 0.2294 },
        '351-550': { total: 0.57, taxable: 0.3591, nonTaxable: 0.2109 },
        '551-800': { total: 0.55, taxable: 0.3465, nonTaxable: 0.2035 },
        '801+': { total: 0.52, taxable: 0.3276, nonTaxable: 0.1924 }
    },
    '6-12': {
        '151-350': { total: 0.64, taxable: 0.4032, nonTaxable: 0.2368 },
        '351-550': { total: 0.59, taxable: 0.3717, nonTaxable: 0.2183 },
        '551-800': { total: 0.57, taxable: 0.3591, nonTaxable: 0.2109 },
        '801+': { total: 0.54, taxable: 0.3402, nonTaxable: 0.1998 }
    },
    '1+': {
        '151-350': { total: 0.66, taxable: 0.4158, nonTaxable: 0.2442 },
        '351-550': { total: 0.61, taxable: 0.3843, nonTaxable: 0.2257 },
        '551-800': { total: 0.59, taxable: 0.3717, nonTaxable: 0.2183 },
        '801+': { total: 0.56, taxable: 0.3528, nonTaxable: 0.2072 }
    }
};

const MIN_PAY_PER_LOAD = 75;
const TARP_PAY = 25;
const TARP_STOP_PAY = 25;
const STOP_PAY = 25;
const BORDER_CROSSING_PAY = 100;
const LAYOVER_PAY = 114;

// All accessorial pay is fully taxable
const ACCESSORIAL_TAXABLE_RATIO = 1.0;

function getCurrentTuesdayWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    let daysToSubtract;
    if (dayOfWeek >= 2) {
        daysToSubtract = dayOfWeek - 2;
    } else {
        daysToSubtract = dayOfWeek + 5;
    }

    const thisWeeksTuesday = new Date(today);
    thisWeeksTuesday.setDate(today.getDate() - daysToSubtract);
    thisWeeksTuesday.setHours(0, 0, 0, 0);
    return thisWeeksTuesday.toISOString().split('T')[0];
}

function updatePayPeriodDisplay() {
    const tuesday = new Date(currentWeek + 'T00:00:00');
    const monday = new Date(tuesday);
    monday.setDate(tuesday.getDate() + 6);
    
    const payPeriodElement = document.getElementById('currentPayPeriod');
    if (payPeriodElement) {
        payPeriodElement.textContent = 
            `${tuesday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
}

function generateWeekOptions() {
    const weekSelector = document.getElementById('weekSelector');
    if (!weekSelector) return;
    
    weekSelector.innerHTML = '';
    const today = new Date();
    
    for (let i = -4; i <= 3; i++) {
        const tuesday = new Date();
        const dayOfWeek = today.getDay();
        let daysToSubtract;
        
        if (dayOfWeek >= 2) {
            daysToSubtract = dayOfWeek - 2;
        } else {
            daysToSubtract = dayOfWeek + 5;
        }
        
        tuesday.setDate(today.getDate() - daysToSubtract + (i * 7));
        tuesday.setHours(0, 0, 0, 0);

        const weekId = tuesday.toISOString().split('T')[0];
        const isCurrentWeek = weekId === currentWeek;
        
        const weekEnd = new Date(tuesday);
        weekEnd.setDate(tuesday.getDate() + 6);

        const weekBtn = document.createElement('div');
        weekBtn.className = `week-btn ${isCurrentWeek ? 'active' : ''}`;
        weekBtn.textContent = `${tuesday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        weekBtn.onclick = () => selectWeek(weekId, weekBtn);
        
        weekSelector.appendChild(weekBtn);
    }
}

function selectWeek(weekId, buttonElement) {
    saveWeekData();
    
    document.querySelectorAll('.week-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    currentWeek = weekId;
    loadWeekData();
    updatePayPeriodDisplay();
    updateTripHistoryDisplay();
}

function saveWeekData() {
    const weekData = {
        loads: loads,
        settings: {
            experience: document.getElementById('experience').value,
            flatRate: document.getElementById('flatRate').value,
            weeklyGoal: document.getElementById('weeklyGoal').value,
            additionalPay: document.getElementById('additionalPay').value
        }
    };
    
    localStorage.setItem(`truckingWeek_${currentWeek}`, JSON.stringify(weekData));
}

function loadWeekData() {
    const weekData = JSON.parse(localStorage.getItem(`truckingWeek_${currentWeek}`) || '{}');
    
    loads = weekData.loads || [];
    
    if (weekData.settings) {
        document.getElementById('experience').value = weekData.settings.experience || '0-6';
        document.getElementById('flatRate').value = weekData.settings.flatRate || '';
        document.getElementById('weeklyGoal').value = weekData.settings.weeklyGoal || '1200';
        document.getElementById('additionalPay').value = weekData.settings.additionalPay || '0';
    } else {
        document.getElementById('experience').value = '0-6';
        document.getElementById('flatRate').value = '';
        document.getElementById('weeklyGoal').value = '1200';
        document.getElementById('additionalPay').value = '0';
    }
    
    updateDisplay();
}

function saveTripHistory() {
    localStorage.setItem('truckingTripHistory', JSON.stringify(tripHistory));
}

function getPayRate(experience, totalMiles) {
    const flatRateInput = document.getElementById('flatRate').value;
    if (flatRateInput && !isNaN(parseFloat(flatRateInput)) && parseFloat(flatRateInput) > 0) {
        const flatRate = parseFloat(flatRateInput);
        return {
            total: flatRate,
            taxable: flatRate * 0.63,
            nonTaxable: flatRate * 0.37
        };
    }

    if (totalMiles >= 151 && totalMiles <= 350) return payRates[experience]['151-350'];
    if (totalMiles >= 351 && totalMiles <= 550) return payRates[experience]['351-550'];
    if (totalMiles >= 551 && totalMiles <= 800) return payRates[experience]['551-800'];
    if (totalMiles >= 801) return payRates[experience]['801+'];
    
    return payRates[experience]['151-350']; // Default to shortest range if miles are below 151
}

function addLoad() {
    const loadName = document.getElementById('loadName').value.trim() || `Load ${loads.length + 1}`;
    const emptyMiles = parseInt(document.getElementById('emptyMiles').value) || 0;
    const loadedMiles = parseInt(document.getElementById('loadedMiles').value) || 0;
    const tarped = document.getElementById('tarped').checked;
    const tarpStops = parseInt(document.getElementById('tarpStops').value) || 0;
    const stops = parseInt(document.getElementById('stops').value) || 0;
    const borderCrossing = document.getElementById('borderCrossing').checked;
    const layover = document.getElementById('layover').checked;
    const extraPay = parseFloat(document.getElementById('extraPay').value) || 0;
    const experience = document.getElementById('experience').value;

    if (loadedMiles <= 0) {
        alert('Please enter loaded miles');
        return;
    }

    const totalMiles = emptyMiles + loadedMiles;
    const payRate = getPayRate(experience, totalMiles);
    
    // Calculate base pay with taxable and non-taxable components
    let basePay = loadedMiles * payRate.total;
    let basePayTaxable = loadedMiles * payRate.taxable;
    let basePayNonTaxable = loadedMiles * payRate.nonTaxable;
    
    // Apply minimum pay if needed
    if (basePay < MIN_PAY_PER_LOAD) {
        const ratio = MIN_PAY_PER_LOAD / basePay;
        basePay = MIN_PAY_PER_LOAD;
        basePayTaxable = basePayTaxable * ratio;
        basePayNonTaxable = basePayNonTaxable * ratio;
    }
    
    // Calculate accessorial pay (all taxable)
    const tarpPay = tarped ? TARP_PAY : 0;
    const tarpStopsPay = tarpStops * TARP_STOP_PAY;
    const stopsPay = stops * STOP_PAY;
    const borderPay = borderCrossing ? BORDER_CROSSING_PAY : 0;
    const layoverPay = layover ? LAYOVER_PAY : 0;
    
    const totalAccessorialPay = tarpPay + tarpStopsPay + stopsPay + borderPay + layoverPay + extraPay;
    
    // Total pay with taxable and non-taxable breakdown
    const totalLoadPay = basePay + totalAccessorialPay;
    const totalTaxablePay = basePayTaxable + totalAccessorialPay; // Accessorial pay is fully taxable
    const totalNonTaxablePay = basePayNonTaxable;

    const load = {
        id: Date.now(),
        name: loadName,
        emptyMiles,
        loadedMiles,
        totalMiles,
        tarped,
        tarpStops,
        stops,
        borderCrossing,
        layover,
        extraPay,
        payRate: payRate.total,
        payRateTaxable: payRate.taxable,
        payRateNonTaxable: payRate.nonTaxable,
        basePay,
        basePayTaxable,
        basePayNonTaxable,
        tarpPay,
        tarpStopsPay,
        stopsPay,
        borderPay,
        layoverPay,
        totalAccessorialPay,
        totalPay: totalLoadPay,
        taxablePay: totalTaxablePay,
        nonTaxablePay: totalNonTaxablePay
    };

    loads.push(load);
    updateDisplay();
    clearForm();
    saveWeekData();
}

function removeLoad(id) {
    loads = loads.filter(load => load.id !== id);
    updateDisplay();
    saveWeekData();
}

function clearForm() {
    document.getElementById('loadName').value = '';
    document.getElementById('emptyMiles').value = '0';
    document.getElementById('loadedMiles').value = '';
    document.getElementById('tarped').checked = false;
    document.getElementById('tarpStops').value = '0';
    document.getElementById('stops').value = '0';
    document.getElementById('borderCrossing').checked = false;
    document.getElementById('layover').checked = false;
    document.getElementById('extraPay').value = '0';
}

function quickFillLoad(name, emptyMiles, loadedMiles, tarped) {
    document.getElementById('loadName').value = name;
    document.getElementById('emptyMiles').value = emptyMiles;
    document.getElementById('loadedMiles').value = loadedMiles;
    document.getElementById('tarped').checked = tarped;
}

function updateDisplay() {
    updateLoadsList();
    updateTotalPay();
    updateGoalTracker();
}

function updateLoadsList() {
    const loadsList = document.getElementById('loadsList');
    if (!loadsList) return;

    if (loads.length === 0) {
        loadsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No loads added yet. Add your first load above!</p>';
        return;
    }

    loadsList.innerHTML = loads.map(load => `
        <div class="load-item">
            <button class="remove-load-btn" onclick="removeLoad(${load.id})">×</button>
            <h4>${load.name}</h4>
            <div class="load-summary">
                <div class="summary-item">
                    <h5>Empty Miles</h5>
                    <p>${load.emptyMiles}</p>
                </div>
                <div class="summary-item">
                    <h5>Loaded Miles</h5>
                    <p>${load.loadedMiles}</p>
                </div>
                <div class="summary-item">
                    <h5>Total Miles</h5>
                    <p>${load.totalMiles}</p>
                </div>
                <div class="summary-item">
                    <h5>Pay Rate</h5>
                    <p>$${load.payRate.toFixed(3)}</p>
                </div>
                <div class="summary-item">
                    <h5>Base Pay</h5>
                    <p>$${load.basePay.toFixed(2)}</p>
                </div>
                ${load.totalAccessorialPay > 0 ? `
                <div class="summary-item">
                    <h5>Accessorial Pay</h5>
                    <p>$${load.totalAccessorialPay.toFixed(2)}</p>
                </div>
                ` : ''}
                <div class="summary-item">
                    <h5>Total Pay</h5>
                    <p style="color: #e67e22; font-weight: bold;">$${load.totalPay.toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h5>Taxable Pay</h5>
                    <p>$${load.taxablePay.toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h5>Non-Taxable</h5>
                    <p>$${load.nonTaxablePay.toFixed(2)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function updateTotalPay() {
    const additionalPay = parseFloat(document.getElementById('additionalPay').value) || 0;
    
    const totalLoadPay = loads.reduce((sum, load) => sum + load.totalPay, 0);
    const totalTaxablePay = loads.reduce((sum, load) => sum + load.taxablePay, 0) + additionalPay; // Additional pay is taxable
    const totalNonTaxablePay = loads.reduce((sum, load) => sum + load.nonTaxablePay, 0);
    
    totalPay = totalLoadPay + additionalPay;
    
    const totalPayElement = document.getElementById('totalPay');
    if (totalPayElement) {
        totalPayElement.innerHTML = `
            <div>Total Pay: $${totalPay.toFixed(2)}</div>
            <div style="font-size: 0.8em; margin-top: 5px;">
                Taxable: $${totalTaxablePay.toFixed(2)} | Non-Taxable: $${totalNonTaxablePay.toFixed(2)}
            </div>
        `;
    }
}

function updateGoalTracker() {
    const weeklyGoal = parseFloat(document.getElementById('weeklyGoal').value) || 0;
    const goalTracker = document.getElementById('goalTracker');
    const progressFill = document.getElementById('progressFill');
    const goalText = document.getElementById('goalText');
    
    if (!goalTracker || !progressFill || !goalText) return;

    if (weeklyGoal > 0) {
        goalTracker.style.display = 'block';
        const progress = Math.min((totalPay / weeklyGoal) * 100, 100);
        const remaining = Math.max(weeklyGoal - totalPay, 0);
        
        progressFill.style.width = `${progress}%`;
        
        if (totalPay >= weeklyGoal) {
            goalText.innerHTML = `🎉 Goal Achieved! You've earned $${(totalPay - weeklyGoal).toFixed(2)} over your goal!`;
        } else {
            goalText.innerHTML = `$${remaining.toFixed(2)} remaining to reach your goal<br>${progress.toFixed(1)}% complete`;
        }
    } else {
        goalTracker.style.display = 'none';
    }
}

function clearAllLoads() {
    if (confirm('Are you sure you want to clear all loads for this week?')) {
        loads = [];
        updateDisplay();
        saveWeekData();
    }
}

function saveTrips() {
    if (loads.length === 0) {
        alert('No loads to save!');
        return;
    }
    
    const weekData = {
        week: currentWeek,
        loads: loads,
        totalPay: totalPay,
        totalMiles: loads.reduce((sum, load) => sum + load.totalMiles, 0),
        loadCount: loads.length,
        savedDate: new Date().toISOString()
    };
    
    tripHistory[currentWeek] = weekData;
    saveTripHistory();
    updateTripHistoryDisplay();
    alert('Week saved to trip history!');
}

function loadTrips() {
    const savedData = localStorage.getItem(`truckingWeek_${currentWeek}`);
    if (savedData) {
        loadWeekData();
        alert('Data loaded successfully!');
    } else {
        alert('No saved data found for this week.');
    }
}

function updateTripHistoryDisplay() {
    const tripHistoryList = document.getElementById('tripHistoryList');
    if (!tripHistoryList) return;

    const historyEntries = Object.values(tripHistory).sort((a, b) => new Date(b.week) - new Date(a.week));
    
    if (historyEntries.length === 0) {
        tripHistoryList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No trip history yet. Complete some weeks and save them!</p>';
        return;
    }

    tripHistoryList.innerHTML = historyEntries.map(entry => {
        const tuesday = new Date(entry.week + 'T00:00:00');
        const monday = new Date(tuesday);
        monday.setDate(tuesday.getDate() + 6);
        
        return `
            <div class="trip-history-item">
                <h4>Week of ${tuesday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                <div class="load-summary">
                    <div class="summary-item">
                        <h5>Total Pay</h5>
                        <p style="color: #e67e22; font-weight: bold;">$${entry.totalPay.toFixed(2)}</p>
                    </div>
                    <div class="summary-item">
                        <h5>Total Miles</h5>
                        <p>${entry.totalMiles}</p>
                    </div>
                    <div class="summary-item">
                        <h5>Load Count</h5>
                        <p>${entry.loadCount}</p>
                    </div>
                    <div class="summary-item">
                        <h5>Avg Per Mile</h5>
                        <p>$${(entry.totalPay / entry.totalMiles).toFixed(3)}</p>
                    </div>
                </div>
                <button class="btn btn-danger" onclick="deleteHistoryEntry('${entry.week}')" style="max-width: 150px; margin-top: 10px;">Delete Week</button>
            </div>
        `;
    }).join('');
}

function deleteHistoryEntry(weekId) {
    if (confirm('Are you sure you want to delete this week from history?')) {
        delete tripHistory[weekId];
        saveTripHistory();
        updateTripHistoryDisplay();
    }
}

function clearTripHistory() {
    if (confirm('Are you sure you want to clear ALL trip history? This cannot be undone!')) {
        tripHistory = {};
        saveTripHistory();
        updateTripHistoryDisplay();
    }
}

function exportTripHistory() {
    if (Object.keys(tripHistory).length === 0) {
        alert('No trip history to export!');
        return;
    }

    let csvContent = 'Week Start,Week End,Total Pay,Taxable Pay,Non-Taxable Pay,Total Miles,Load Count,Average Per Mile,Saved Date\n';
    
    Object.values(tripHistory).sort((a, b) => new Date(a.week) - new Date(b.week)).forEach(entry => {
        const tuesday = new Date(entry.week + 'T00:00:00');
        const monday = new Date(tuesday);
        monday.setDate(tuesday.getDate() + 6);
        
        // Calculate taxable and non-taxable totals for the week
        let taxablePay = 0;
        let nonTaxablePay = 0;
        
        if (entry.loads) {
            taxablePay = entry.loads.reduce((sum, load) => sum + (load.taxablePay || 0), 0);
            nonTaxablePay = entry.loads.reduce((sum, load) => sum + (load.nonTaxablePay || 0), 0);
        }
        
        csvContent += `${tuesday.toLocaleDateString()},${monday.toLocaleDateString()},${entry.totalPay.toFixed(2)},${taxablePay.toFixed(2)},${nonTaxablePay.toFixed(2)},${entry.totalMiles},${entry.loadCount},${(entry.totalPay / entry.totalMiles).toFixed(3)},${new Date(entry.savedDate).toLocaleDateString()}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trucking_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    if (!content) return;
    
    content.classList.toggle('active');
}

function calculateDistance() {
    const fromCity = document.getElementById('fromCity').value.trim();
    const toCity = document.getElementById('toCity').value.trim();
    const resultDiv = document.getElementById('distanceResult');
    
    if (!fromCity || !toCity) {
        resultDiv.innerHTML = '<span style="color: #e74c3c;">Please enter both cities</span>';
        return;
    }
    
    resultDiv.innerHTML = '<span style="color: #3498db;">Calculating distance...</span>';
    
    // Note: This is a placeholder for Google Maps API integration
    // You would need to implement actual API calls here
    setTimeout(() => {
        const estimatedDistance = Math.floor(Math.random() * 800) + 200; // Random for demo
        resultDiv.innerHTML = `
            <div style="background: #e8f5e8; padding: 10px; border-radius: 5px;">
                <strong>Estimated Distance:</strong> ${estimatedDistance} miles<br>
                <small style="color: #666;">Note: This is a demo calculation. Integrate with Google Maps API for real distances.</small>
            </div>
        `;
    }, 1000);
}

function calculateOptimalRuns() {
    const targetEarnings = parseFloat(document.getElementById('targetEarnings').value) || 0;
    const daysAvailable = parseInt(document.getElementById('daysAvailable').value) || 5;
    const experience = document.getElementById('experience').value;
    const resultDiv = document.getElementById('optimalResult');
    
    if (targetEarnings <= 0) {
        resultDiv.innerHTML = '<span style="color: #e74c3c;">Please enter target earnings</span>';
        return;
    }
    
    // Calculate optimal scenarios
    const avgRate = payRates[experience]['351-550'].total; // Use medium rate as average
    const milesNeeded = Math.ceil(targetEarnings / avgRate);
    const milesPerDay = Math.ceil(milesNeeded / daysAvailable);
    
    resultDiv.innerHTML = `
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px;">
            <h4 style="margin-bottom: 10px; color: #2c3e50;">Optimal Run Analysis</h4>
            <p><strong>Miles needed:</strong> ~${milesNeeded} miles</p>
            <p><strong>Miles per day:</strong> ~${milesPerDay} miles</p>
            <p><strong>Suggested strategy:</strong> ${milesPerDay > 400 ? 'Focus on longer hauls (500+ miles)' : 'Mix of medium hauls (350-550 miles)'}</p>
            <small style="color: #666;">Based on average rate of $${avgRate}/mile</small>
        </div>
    `;
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    generateWeekOptions();
    loadWeekData();
    updatePayPeriodDisplay();
    updateTripHistoryDisplay();
    
    // Auto-save when settings change
    ['experience', 'flatRate', 'weeklyGoal', 'additionalPay'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                updateDisplay();
                saveWeekData();
            });
        }
    });
    
    // Auto-update goal tracker when additional pay changes
    const additionalPayInput = document.getElementById('additionalPay');
    if (additionalPayInput) {
        additionalPayInput.addEventListener('input', updateDisplay);
    }
});

// Auto-save every 30 seconds
setInterval(() => {
    if (loads.length > 0) {
        saveWeekData();
    }
}, 30000);
