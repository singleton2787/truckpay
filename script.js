// Global variables
let loads = [];
let totalPay = 0;
let currentWeek = getCurrentSundayWeek();
let tripHistory = JSON.parse(localStorage.getItem('truckingTripHistory') || '{}');

// Pay rates structure with taxable and non-taxable components
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

// Constants
const MIN_PAY_PER_LOAD = 75;
const TARP_PAY = 25;
const TARP_STOP_PAY = 25;
const STOP_PAY = 25;
const BORDER_CROSSING_PAY = 100;
const LAYOVER_PAY = 114;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateWeekOptions();
    updatePayPeriodDisplay();
    loadWeekData();
    updateTripHistoryDisplay();
});

// Toggle section visibility
function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    content.classList.toggle('active');
}

// Get current Sunday week
function getCurrentSundayWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek;
    const thisWeeksSunday = new Date(today);
    thisWeeksSunday.setDate(today.getDate() - daysToSubtract);
    thisWeeksSunday.setHours(0, 0, 0, 0);
    return thisWeeksSunday.toISOString().split('T')[0];
}

// Update pay period display
function updatePayPeriodDisplay() {
    const sunday = new Date(currentWeek + 'T00:00:00');
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    const payPeriodElement = document.getElementById('currentPayPeriod');
    if (payPeriodElement) {
        payPeriodElement.textContent = 
            `${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
}

// Generate week options
function generateWeekOptions() {
    const weekSelector = document.getElementById('weekSelector');
    if (!weekSelector) return;
    
    weekSelector.innerHTML = '';
    const today = new Date();
    
    for (let i = -4; i <= 3; i++) {
        const sunday = new Date();
        const dayOfWeek = today.getDay();
        const daysToSubtract = dayOfWeek;
        
        sunday.setDate(today.getDate() - daysToSubtract + (i * 7));
        sunday.setHours(0, 0, 0, 0);

        const weekId = sunday.toISOString().split('T')[0];
        const isCurrentWeek = weekId === currentWeek;
        
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);

        const weekBtn = document.createElement('div');
        weekBtn.className = `week-btn ${isCurrentWeek ? 'active' : ''}`;
        weekBtn.textContent = `${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        weekBtn.onclick = () => selectWeek(weekId, weekBtn);
        
        weekSelector.appendChild(weekBtn);
    }
}

// Select a week
function selectWeek(weekId, buttonElement) {
    saveWeekData();
    
    document.querySelectorAll('.week-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    currentWeek = weekId;
    loadWeekData();
    updatePayPeriodDisplay();
    updateTripHistoryDisplay();
}

// Save week data to localStorage
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

// Load week data from localStorage
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

// Save trip history
function saveTripHistory() {
    localStorage.setItem('truckingTripHistory', JSON.stringify(tripHistory));
}

// Get pay rate based on experience and miles
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
    
    return payRates[experience]['151-350'];
}

// Quick fill load form
function quickFillLoad(loadType, emptyMiles, loadedMiles, tarped) {
    document.getElementById('loadName').value = loadType;
    document.getElementById('emptyMiles').value = emptyMiles;
    document.getElementById('loadedMiles').value = loadedMiles;
    document.getElementById('tarped').checked = tarped;
    document.getElementById('tarpStops').value = 0;
    document.getElementById('stops').value = 0;
    document.getElementById('borderCrossing').checked = false;
    document.getElementById('layover').checked = false;
    document.getElementById('extraPay').value = 0;
}

// Add a new load
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
    
    let basePay = loadedMiles * payRate.total;
    let basePayTaxable = loadedMiles * payRate.taxable;
    let basePayNonTaxable = loadedMiles * payRate.nonTaxable;
    
    if (basePay < MIN_PAY_PER_LOAD) {
        const ratio = MIN_PAY_PER_LOAD / basePay;
        basePay = MIN_PAY_PER_LOAD;
        basePayTaxable = basePayTaxable * ratio;
        basePayNonTaxable = basePayNonTaxable * ratio;
    }
    
    const tarpPay = tarped ? TARP_PAY : 0;
    const tarpStopsPay = tarpStops * TARP_STOP_PAY;
    const stopsPay = stops * STOP_PAY;
    const borderPay = borderCrossing ? BORDER_CROSSING_PAY : 0;
    const layoverPay = layover ? LAYOVER_PAY : 0;
    
    const totalAccessorialPay = tarpPay + tarpStopsPay + stopsPay + borderPay + layoverPay + extraPay;
    
    const totalLoadPay = basePay + totalAccessorialPay;
    const totalTaxablePay = basePayTaxable + totalAccessorialPay;
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

// Remove a load
function removeLoad(id) {
    loads = loads.filter(load => load.id !== id);
    updateDisplay();
    saveWeekData();
}

// Edit a load
function editLoad(id) {
    const load = loads.find(l => l.id === id);
    if (!load) return;
    
    document.getElementById('loadName').value = load.name;
    document.getElementById('emptyMiles').value = load.emptyMiles;
    document.getElementById('loadedMiles').value = load.loadedMiles;
    document.getElementById('tarped').checked = load.tarped;
    document.getElementById('tarpStops').value = load.tarpStops;
    document.getElementById('stops').value = load.stops;
    document.getElementById('borderCrossing').checked = load.borderCrossing;
    document.getElementById('layover').checked = load.layover;
    document.getElementById('extraPay').value = load.extraPay;
    
    removeLoad(id);
    
    // Scroll to form
    document.getElementById('addLoadForm').scrollIntoView({ behavior: 'smooth' });
}

// Clear the form
function clearForm() {
    document.getElementById('loadName').value = '';
    document.getElementById('emptyMiles').value = '';
    document.getElementById('loadedMiles').value = '';
    document.getElementById('tarped').checked = false;
    document.getElementById('tarpStops').value = 0;
    document.getElementById('stops').value = 0;
    document.getElementById('borderCrossing').checked = false;
    document.getElementById('layover').checked = false;
    document.getElementById('extraPay').value = 0;
}

// Update all displays
function updateDisplay() {
    updatePaySummary();
    updateLoadsList();
    updateWeeklyGoalProgress();
}

// Update pay summary
function updatePaySummary() {
    const totalMiles = loads.reduce((sum, load) => sum + load.totalMiles, 0);
    const emptyMiles = loads.reduce((sum, load) => sum + load.emptyMiles, 0);
    const loadedMiles = loads.reduce((sum, load) => sum + load.loadedMiles, 0);
    const totalBasePay = loads.reduce((sum, load) => sum + load.basePay, 0);
    const totalAccessorialPay = loads.reduce((sum, load) => sum + load.totalAccessorialPay, 0);
    const additionalPay = parseFloat(document.getElementById('additionalPay').value) || 0;
    
    totalPay = totalBasePay + totalAccessorialPay + additionalPay;
    
    const totalTaxablePay = loads.reduce((sum, load) => sum + load.taxablePay, 0) + additionalPay;
    const totalNonTaxablePay = loads.reduce((sum, load) => sum + load.nonTaxablePay, 0);

    document.getElementById('totalMiles').textContent = totalMiles;
    document.getElementById('emptyMiles').textContent = emptyMiles;
    document.getElementById('loadedMiles').textContent = loadedMiles;
    document.getElementById('totalBasePay').textContent = totalBasePay.toFixed(2);
    document.getElementById('totalAccessorialPay').textContent = totalAccessorialPay.toFixed(2);
    document.getElementById('totalPay').textContent = totalPay.toFixed(2);
    document.getElementById('totalTaxablePay').textContent = totalTaxablePay.toFixed(2);
    document.getElementById('totalNonTaxablePay').textContent = totalNonTaxablePay.toFixed(2);
    document.getElementById('numLoads').textContent = loads.length;
    
    if (totalMiles > 0) {
        document.getElementById('avgPayPerMile').textContent = (totalPay / totalMiles).toFixed(3);
    } else {
        document.getElementById('avgPayPerMile').textContent = '0.000';
    }
}

// Update loads list display
function updateLoadsList() {
    const loadsListContainer = document.getElementById('loadsList');
    if (!loadsListContainer) return;
    
    loadsListContainer.innerHTML = '';
    
    if (loads.length === 0) {
        loadsListContainer.innerHTML = '<p class="no-loads">No loads added yet.</p>';
        return;
    }
    
    loads.forEach((load, index) => {
        const loadItem = document.createElement('div');
        loadItem.className = 'load-item';
        loadItem.innerHTML = `
            <div class="load-header">
                <h3>${load.name}</h3>
                <div class="load-actions">
                    <button onclick="editLoad(${load.id})" class="edit-btn">Edit</button>
                    <button onclick="removeLoad(${load.id})" class="remove-btn">Remove</button>
                </div>
            </div>
            <div class="load-details">
                <div class="load-miles">
                    <span><strong>Empty:</strong> ${load.emptyMiles} mi</span>
                    <span><strong>Loaded:</strong> ${load.loadedMiles} mi</span>
                    <span><strong>Total:</strong> ${load.totalMiles} mi</span>
                </div>
                <div class="load-pay-breakdown">
                    <div class="pay-row">
                        <span>Base Pay (${load.loadedMiles} × $${load.payRate.toFixed(3)}):</span>
                        <span>$${load.basePay.toFixed(2)}</span>
                    </div>
                    ${load.tarpPay > 0 ? `<div class="pay-row"><span>Tarp:</span><span>$${load.tarpPay}</span></div>` : ''}
                    ${load.tarpStopsPay > 0 ? `<div class="pay-row"><span>Tarp Stops (${load.tarpStops}):</span><span>$${load.tarpStopsPay}</span></div>` : ''}
                    ${load.stopsPay > 0 ? `<div class="pay-row"><span>Stops (${load.stops}):</span><span>$${load.stopsPay}</span></div>` : ''}
                    ${load.borderPay > 0 ? `<div class="pay-row"><span>Border Crossing:</span><span>$${load.borderPay}</span></div>` : ''}
                    ${load.layoverPay > 0 ? `<div class="pay-row"><span>Layover:</span><span>$${load.layoverPay}</span></div>` : ''}
                    ${load.extraPay > 0 ? `<div class="pay-row"><span>Extra Pay:</span><span>$${load.extraPay.toFixed(2)}</span></div>` : ''}
                    <div class="pay-row total-row">
                        <span><strong>Total Load Pay:</strong></span>
                        <span><strong>$${load.totalPay.toFixed(2)}</strong></span>
                    </div>
                    <div class="pay-breakdown-small">
                        <span>Taxable: $${load.taxablePay.toFixed(2)}</span>
                        <span>Non-Taxable: $${load.nonTaxablePay.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
        
        loadsListContainer.appendChild(loadItem);
    });
}

// Update weekly goal progress
function updateWeeklyGoalProgress() {
    const weeklyGoal = parseFloat(document.getElementById('weeklyGoal').value) || 1200;
    const progressPercentage = Math.min((totalPay / weeklyGoal) * 100, 100);
    const remaining = Math.max(weeklyGoal - totalPay, 0);
    
    const progressBar = document.getElementById('goalProgressBar');
    const progressText = document.getElementById('goalProgressText');
    const remainingText = document.getElementById('remainingAmount');
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.className = `progress-bar ${progressPercentage >= 100 ? 'goal-achieved' : ''}`;
    }
    
    if (progressText) {
        progressText.textContent = `$${totalPay.toFixed(2)} / $${weeklyGoal.toFixed(2)} (${progressPercentage.toFixed(1)}%)`;
    }
    
    if (remainingText) {
        remainingText.textContent = remaining > 0 ? `$${remaining.toFixed(2)} remaining` : 'Goal achieved!';
        remainingText.className = remaining > 0 ? '' : 'goal-achieved';
    }
}

// Update trip history display
function updateTripHistoryDisplay() {
    const historyContainer = document.getElementById('tripHistoryList');
    if (!historyContainer) return;
    
    // Store current week data in history
    if (loads.length > 0) {
        const weekTotals = {
            totalPay: totalPay,
            totalMiles: loads.reduce((sum, load) => sum + load.totalMiles, 0),
            numLoads: loads.length,
            date: currentWeek
        };
        tripHistory[currentWeek] = weekTotals;
        saveTripHistory();
    }
    
    // Display history
    historyContainer.innerHTML = '';
    
    const sortedWeeks = Object.keys(tripHistory)
        .filter(week => tripHistory[week].totalPay > 0)
        .sort((a, b) => new Date(b) - new Date(a))
        .slice(0, 10);
    
    if (sortedWeeks.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">No trip history available.</p>';
        return;
    }
    
    sortedWeeks.forEach(week => {
        const data = tripHistory[week];
        const sunday = new Date(week + 'T00:00:00');
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-date">${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span class="history-pay">$${data.totalPay.toFixed(2)}</span>
            </div>
            <div class="history-details">
                <span>${data.numLoads} loads</span>
                <span>${data.totalMiles} miles</span>
                <span>$${(data.totalPay / data.totalMiles).toFixed(3)}/mi</span>
            </div>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}

// Export data functions
function exportData() {
    const data = {
        currentWeek: currentWeek,
        loads: loads,
        tripHistory: tripHistory,
        settings: {
            experience: document.getElementById('experience').value,
            flatRate: document.getElementById('flatRate').value,
            weeklyGoal: document.getElementById('weeklyGoal').value,
            additionalPay: document.getElementById('additionalPay').value
        }
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `trucking_data_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import data functions
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.loads) loads = data.loads;
            if (data.tripHistory) {
                tripHistory = data.tripHistory;
                saveTripHistory();
            }
            
            if (data.settings) {
                document.getElementById('experience').value = data.settings.experience || '0-6';
                document.getElementById('flatRate').value = data.settings.flatRate || '';
                document.getElementById('weeklyGoal').value = data.settings.weeklyGoal || '1200';
                document.getElementById('additionalPay').value = data.settings.additionalPay || '0';
            }
            
            updateDisplay();
            saveWeekData();
            updateTripHistoryDisplay();
            
            alert('Data imported successfully!');
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        // Clear current loads
        loads = [];
        
        // Clear localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('truckingWeek_')) {
                localStorage.removeItem(key);
            }
        }
        
        // Clear trip history
        tripHistory = {};
        localStorage.removeItem('truckingTripHistory');
        
        updateDisplay();
        updateTripHistoryDisplay();
        alert('All data cleared successfully!');
    }
}
