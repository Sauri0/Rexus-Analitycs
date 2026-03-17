/**
 * Nexus Intelligence v3.1 | Advanced Core Engine
 * Unified Logical System for Multi-Brand Reporting
 */

// Global State
const state = {
    filesLoaded: 0,
    totalSlots: 4,
    rawData: {
        aires: [],
        nodor: [],
        praga: [],
        crm: []
    },
    metrics: {
        aires: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        nodor: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        praga: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        global: { spend: 0, earnings: 0, leads: 0, roas: 0 }
    },
    sellers: {} // Seller performance mapping
};

// UI Elements
const charts = {
    channels: null,
    brands: null
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // File inputs mapping
    const inputs = {
        'input-aires': 'aires',
        'input-nodor': 'nodor',
        'input-praga': 'praga',
        'input-crm': 'crm'
    };

    Object.entries(inputs).forEach(([id, slot]) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => handleFileSelect(slot, e.target.files[0]));
        }
    });

    // Demo Mode Trigger
    const btnDemo = document.getElementById('btn-demo');
    if (btnDemo) {
        btnDemo.addEventListener('click', loadDemoData);
    }
}

/**
 * Universal File Handler (CSV & XLSX)
 */
async function handleFileSelect(slot, file) {
    if (!file) return;

    const statusEl = document.getElementById(`st-${slot}`);
    const cardEl = document.getElementById(`card-${slot}`);
    
    // UI Loading state
    statusEl.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Analizando...`;
    lucide.createIcons();

    try {
        const fileExt = file.name.split('.').pop().toLowerCase();
        let data = [];

        if (fileExt === 'xlsx') {
            data = await parseXLSX(file);
        } else {
            data = await parseCSV(file);
        }

        // Store and process
        state.rawData[slot] = data;
        processSlot(slot, data);
        
        // Update UI Status
        statusEl.innerHTML = `<i data-lucide="check-circle"></i> Listo`;
        statusEl.style.color = 'var(--success)';
        cardEl.classList.add('ready');
        
        state.filesLoaded = Object.values(state.rawData).filter(d => d.length > 0).length;
        document.getElementById('file-count').innerText = `${state.filesLoaded}/${state.totalSlots} Archivos Cargados`;
        
        updateSystem();

    } catch (error) {
        console.error("Error processing file:", error);
        statusEl.innerHTML = `<i data-lucide="alert-circle"></i> Error`;
        statusEl.style.color = 'var(--error)';
    }
}

/**
 * Parsers
 */
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        });
    });
}

function parseXLSX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Data Processing Logic
 */
function processSlot(slot, data) {
    if (slot === 'crm') {
        processCRM(data);
    } else {
        processMeta(slot, data);
    }
}

function processMeta(brand, data) {
    let spend = 0;
    let leads = 0;

    data.forEach(row => {
        // Robust Column Mapping for Meta
        const rowSpend = row['Importe gastado (ARS)'] || row['Amount Spent'] || row['Spend'] || 0;
        const rowLeads = row['Resultados'] || row['Results'] || row['Leads'] || 0;
        
        spend += parseFloat(String(rowSpend).replace(/[$,]/g, '')) || 0;
        leads += parseInt(rowLeads) || 0;
        
        // FINANCIAL TRUTH: We ignore row['Valor de conversión de compras'] 
        // to comply with requirement of only taking sales from CRM.
    });

    state.metrics[brand].spend = spend;
    state.metrics[brand].leads = leads;
}

function processCRM(data) {
    // Reset specific CRM metrics to avoid double counting on reload
    state.metrics.aires.earnings = 0;
    state.metrics.nodor.earnings = 0;
    state.metrics.praga.earnings = 0;
    state.sellers = {};

    data.forEach(row => {
        let monto = parseFloat(String(row['Monto_Total'] || 0).replace(/[$,]/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0;
        
        // USD to ARS Logic: Any amount < 40,000 is considered USD (1 USD = 1400 ARS)
        if (monto > 0 && monto < 40000) {
            monto = monto * 1400;
        }

        const brandRaw = String(row['Marca'] || '').toLowerCase();
        const seller = row['Comercial'] || 'Sin Asignar';
        const status = row['Estado'] || '';

        // Attribution Logic
        let brandKey = null;
        if (brandRaw.includes('aire')) brandKey = 'aires';
        else if (brandRaw.includes('nodor')) brandKey = 'nodor';
        else if (brandRaw.includes('praga')) brandKey = 'praga';

        if (status === 'Vendido') {
            if (brandKey) state.metrics[brandKey].earnings += monto;
        }

        // Seller Deep-Dive Data
        if (!state.sellers[seller]) {
            state.sellers[seller] = { 
                leads: 0, 
                sales: 0, 
                amount: 0, 
                lost_leads: [], 
                comments: [],
                loss_reasons: {} // Aggregated reasons
            };
        }
        
        state.sellers[seller].leads++;
        
        if (status === 'Vendido') {
            state.sellers[seller].sales++;
            state.sellers[seller].amount += monto;
            if (row['Comentario']) {
                state.sellers[seller].comments.push({
                    text: row['Comentario'],
                    date: row['Modificado_Fecha'] || row['Fecha_Alta']
                });
            }
        } else if (status === 'Perdido') {
            const reason = row['Motivo_Perdida'] || 'Sin motivo';
            state.sellers[seller].loss_reasons[reason] = (state.sellers[seller].loss_reasons[reason] || 0) + 1;
            
            state.sellers[seller].lost_leads.push({
                client: row['Cliente'] || 'Anónimo',
                reason: reason,
                comment: row['Comentario'] || ''
            });
        }
    });
}

/**
 * System Orchestration
 */
function updateSystem() {
    calculateGlobals();
    updateKPIs();
    renderInsights();
    renderAnalystReport();
    renderMatrix();
    renderSellers();
    renderCharts();
    renderRawTable();
}

function calculateGlobals() {
    const brands = ['aires', 'nodor', 'praga'];
    state.metrics.global = { spend: 0, earnings: 0, leads: 0, roas: 0 };

    brands.forEach(b => {
        const m = state.metrics[b];
        m.roas = m.spend > 0 ? (m.earnings / m.spend).toFixed(2) : 0;
        
        state.metrics.global.spend += m.spend;
        state.metrics.global.earnings += m.earnings;
        state.metrics.global.leads += m.leads;
    });

    const g = state.metrics.global;
    g.roas = g.spend > 0 ? (g.earnings / g.spend).toFixed(2) : 0;
}

/**
 * UI Rendering
 */
function updateKPIs() {
    const g = state.metrics.global;
    animateValue('kpi-total-spend', g.spend, true);
    animateValue('kpi-total-sales', g.earnings, true);
    animateValue('kpi-total-leads', g.leads, false);
    document.getElementById('kpi-total-roas').innerText = `${g.roas}x`;
}

function renderInsights() {
    const insightText = document.getElementById('insight-text');
    if (state.filesLoaded === 0) return;

    const g = state.metrics.global;
    let html = `El ecosistema Nexus ha procesado la data del mes. `;
    
    if (g.roas > 10) {
        html += `<span style="color:var(--success)">Rendimiento excepcional con un ROAS de ${g.roas}x.</span> `;
    } else if (g.roas > 5) {
        html += `Rendimiento saludable con un ROAS de ${g.roas}x. `;
    } else {
        html += `Se observa una oportunidad de optimización en la conversión. `;
    }

    // Top Brand
    const brands = ['aires', 'nodor', 'praga'];
    const top = brands.reduce((prev, current) => (state.metrics[prev].earnings > state.metrics[current].earnings) ? prev : current);
    html += `La marca líder en ingresos es <strong>${top.toUpperCase()}</strong> con ${formatCurrency(state.metrics[top].earnings)}.`;

    insightText.innerHTML = html;
}

function renderAnalystReport() {
    const content = document.getElementById('analyst-content');
    if (state.filesLoaded === 0) return;

    const g = state.metrics.global;
    const brands = ['aires', 'nodor', 'praga'];
    
    // Efficiency calculation
    const efficiency = brands.map(b => ({
        name: b.charAt(0).toUpperCase() + b.slice(1),
        cpl: state.metrics[b].spend / (state.metrics[b].leads || 1),
        roas: state.metrics[b].roas
    }));

    const bestCPL = [...efficiency].sort((a, b) => a.cpl - b.cpl)[0];
    const bestROAS = [...efficiency].sort((a, b) => b.roas - a.roas)[0];

    let html = `
        <div class="analyst-report">
            <p><span class="insight-tag tag-pos">Estrategia</span> 
            El canal más eficiente en costo por lead es <strong>${bestCPL.name}</strong> 
            ($${Math.floor(bestCPL.cpl)}/lead). Se recomienda escalar presupuesto en esta vertical.</p>
            
            <p><span class="insight-tag tag-neu">Ventas</span> 
            A pesar del volumen de leads, la tasa de cierre global se mantiene estable. 
            <strong>${bestROAS.name}</strong> domina el retorno final con <strong>${bestROAS.roas}x</strong>.</p>
            
            <p><span class="insight-tag tag-neg">Alerta</span> 
            Se detectaron <strong>${getTotalLostLeads()} prospectos perdidos</strong> este periodo. 
            La causa principal reportada es "Precio o cuotas".</p>
        </div>
    `;

    content.innerHTML = html;
}

function getTotalLostLeads() {
    return Object.values(state.sellers).reduce((acc, s) => acc + s.lost_leads.length, 0);
}

function renderMatrix() {
    const body = document.getElementById('matrix-body');
    const brands = [
        { key: 'aires', name: 'Aires Acondicionados', class: 'aires' },
        { key: 'nodor', name: 'Nodor Argentina', class: 'nodor' },
        { key: 'praga', name: 'Praga Inmuebles', class: 'praga' }
    ];

    body.innerHTML = brands.map(b => {
        const m = state.metrics[b.key];
        return `
            <tr>
                <td><div class="brand-cell"><div class="dot ${b.class}"></div> ${b.name}</div></td>
                <td>${formatCurrency(m.spend)}</td>
                <td>${formatCurrency(m.earnings)}</td>
                <td>${m.leads}</td>
                <td class="roas-cell"><strong>${m.roas}x</strong></td>
            </tr>
        `;
    }).join('');
}

function renderSellers() {
    const list = document.getElementById('seller-list');
    const sorted = Object.entries(state.sellers).sort((a, b) => b[1].amount - a[1].amount);

    list.innerHTML = sorted.map(([name, data]) => {
        const conv = ((data.sales / data.leads) * 100).toFixed(1);
        return `
            <div class="seller-card glass" onclick="showSellerDetail('${name.replace(/'/g, "\\'")}')">
                <div class="seller-header">
                    <div class="avatar">${name.charAt(0)}</div>
                    <div class="info">
                        <strong>${name}</strong>
                        <span>${data.sales} ventas cerradas</span>
                    </div>
                </div>
                <div class="seller-stats">
                    <div class="s-stat"><label>Income</label><strong>${formatCurrency(data.amount)}</strong></div>
                    <div class="s-stat"><label>Conv%</label><strong>${conv}%</strong></div>
                    <div class="s-stat"><label>Leads</label><strong>${data.leads}</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Seller Deep-Dive
 */
function showSellerDetail(name) {
    const seller = state.sellers[name];
    if (!seller) return;

    document.getElementById('modal-seller-name').innerText = name;
    document.getElementById('modal-avatar').innerText = name.charAt(0);
    
    // Improved Stats Header (Cards)
    const lostCount = Object.values(seller.loss_reasons).reduce((a, b) => a + b, 0);
    document.getElementById('modal-seller-stats').innerHTML = `
        <div class="modal-stats-row">
            <span><label>Total Prospectos</label><strong>${seller.leads}</strong></span>
            <span><label>Ventas Cerradas</label><strong>${seller.sales}</strong></span>
            <span><label>Leads Perdidos</label><strong>${lostCount}</strong></span>
            <span><label>Total Ingresos</label><strong>${formatCurrency(seller.amount)}</strong></span>
        </div>
    `;

    // Render Loss Reasons Histogram
    const lostContainer = document.getElementById('modal-lost');
    let lossHtml = '<h4><i data-lucide="pie-chart"></i> Análisis de Pérdida</h4>';
    
    if (Object.keys(seller.loss_reasons).length > 0) {
        lossHtml += '<ul class="loss-reason-list">';
        Object.entries(seller.loss_reasons)
            .sort((a, b) => b[1] - a[1])
            .forEach(([reason, count]) => {
                lossHtml += `<li><span class="reason-label">${reason}</span> <span class="reason-count">${count}</span></li>`;
            });
        lossHtml += '</ul>';
    } else {
        lossHtml += '<p class="placeholder-text" style="margin-top:1.5rem">Sin datos de pérdida registrados.</p>';
    }
    lostContainer.innerHTML = lossHtml;

    // Render Comments
    const commentContainer = document.getElementById('modal-comments');
    commentContainer.innerHTML = '<h4><i data-lucide="message-square"></i> Comentarios de Producción</h4>';
    if (seller.comments.length > 0) {
        commentContainer.innerHTML += '<div class="comment-list">' + seller.comments.map(c => `
            <div class="comment-item">
                <p>${c.text}</p>
                <span>${c.date}</span>
            </div>
        `).join('') + '</div>';
    } else {
        commentContainer.innerHTML += '<p class="placeholder-text" style="margin-top:1.5rem">Sin notas de CRM registradas.</p>';
    }

    document.getElementById('seller-modal').classList.add('active');
    lucide.createIcons();
}

function closeModal() {
    document.getElementById('seller-modal').classList.remove('active');
}

/**
 * Charts and Helper UI
 */
function renderCharts() {
    const ctxChannels = document.getElementById('chart-channels').getContext('2d');
    const ctxBrands = document.getElementById('chart-brands').getContext('2d');

    if (charts.channels) charts.channels.destroy();
    if (charts.brands) charts.brands.destroy();

    const brands = ['Aires', 'Nodor', 'Praga'];
    const earnings = [state.metrics.aires.earnings, state.metrics.nodor.earnings, state.metrics.praga.earnings];
    const spend = [state.metrics.aires.spend, state.metrics.nodor.spend, state.metrics.praga.spend];

    charts.channels = new Chart(ctxChannels, {
        type: 'bar',
        data: {
            labels: brands,
            datasets: [
                { label: 'Ingresos', data: earnings, backgroundColor: '#8b5cf6', borderRadius: 8 },
                { label: 'Inversión', data: spend, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#fff', font: { family: 'Inter' } } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
            }
        }
    });

    charts.brands = new Chart(ctxBrands, {
        type: 'doughnut',
        data: {
            labels: brands,
            datasets: [{
                data: earnings,
                backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981'],
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: { 
                legend: { position: 'bottom', labels: { color: '#fff', padding: 20 } }
            }
        }
    });
}

function renderRawTable() {
    const target = document.getElementById('explorer-target').value;
    const data = state.rawData[target];
    const head = document.getElementById('head-raw');
    const body = document.getElementById('body-raw');

    if (!data || data.length === 0) {
        head.innerHTML = '';
        body.innerHTML = '<tr><td colspan="5">Sin datos disponibles</td></tr>';
        return;
    }

    const headers = Object.keys(data[0]).slice(0, 10);
    head.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    body.innerHTML = data.slice(0, 50).map(row => {
        return `<tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`;
    }).join('');
}

function animateValue(id, value, isCurrency) {
    const el = document.getElementById(id);
    let start = 0;
    const end = value;
    const duration = 1000;
    const range = end - start;
    let current = start;
    const increment = end > start ? Math.max(range / (duration / 10), 1) : Math.min(range / (duration / 10), -1);
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            el.innerText = isCurrency ? formatCurrency(end) : end;
            clearInterval(timer);
        } else {
            el.innerText = isCurrency ? formatCurrency(current) : Math.floor(current);
        }
    }, 10);
}

function formatCurrency(v) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

/**
 * Demo Data Engine (Updated for v3.1)
 */
function loadDemoData() {
    const btn = document.getElementById('btn-demo');
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Generando Inteligencia...`;
    lucide.createIcons();

    setTimeout(() => {
        state.sellers = {
            "Ricardo Laviano": { 
                leads: 145, sales: 22, amount: 30800000, // 22000 USD * 1400
                lost_leads: [],
                loss_reasons: { "Precio o cuotas": 12, "Falta de stock": 5, "Competencia": 3 },
                comments: [{ text: "Venta Mayorista (USD)", date: "05/02/2026" }]
            },
            "Germán Ariel Polito": { 
                leads: 230, sales: 18, amount: 8200000,
                lost_leads: [],
                loss_reasons: { "Precio o cuotas": 8, "No responde": 15 },
                comments: [{ text: "Cerró obra VRF en Rosario", date: "02/02/2026" }]
            }
        };

        state.metrics = {
            aires: { spend: 1200000, earnings: 8500000, leads: 450, roas: 7.08 },
            nodor: { spend: 550000, earnings: 30800000, leads: 360, roas: 56 },
            praga: { spend: 280000, earnings: 13460000, leads: 28, roas: 48.07 },
            global: { spend: 2030000, earnings: 52760000, leads: 838, roas: 25.99 }
        };

        state.filesLoaded = 4;
        document.getElementById('file-count').innerText = "4/4 Archivos Cargados (DEMO)";
        ['aires', 'nodor', 'praga', 'crm'].forEach(s => {
            document.getElementById(`st-${s}`).innerHTML = `<i data-lucide="check-circle"></i> Demo OK`;
            document.getElementById(`card-${s}`).classList.add('ready');
        });

        btn.innerHTML = `Demo Activo`;
        btn.disabled = true;
        updateSystem();
        lucide.createIcons();
    }, 1500);
}
