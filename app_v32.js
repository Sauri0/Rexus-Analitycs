/**
 * Rexus Intelligence v3.5.1 | Advanced Strategic Engine
 * Unified Logical System for Multi-Brand Reporting & Historical Archiving
 */

// Global State
const state = {
    filesLoaded: 0,
    totalSlots: 4,
    rawData: { aires: [], nodor: [], praga: [], crm: [] },
    metrics: {
        aires: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        nodor: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        praga: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        global: { spend: 0, earnings: 0, leads: 0, roas: 0, sales: 0 }
    },
    sellers: {},
    brandVolume: {},
    brandProducts: {},
    history: {},
    currentPeriod: '',
    currentModule: 'hub' // v6.0
};

// Local Module State (Showroom focus)
const localState = {
    crm: [],
    activeSegment: 'totales', // v6.9: totales | norcenter | nordelta
    metrics: { 
        totales: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} },
        norcenter: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} },
        nordelta: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} }
    },
    history: {}, // v6.2
    filesLoaded: 0 // v6.2
};

/** 
 * Security & Auth Layer (v8.0)
 */
function checkLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error');
    
    // Admin Credentials
    if (user === 'AdminPraga' && pass === 'Praga@2026') {
        localStorage.setItem('rexus_session', 'active'); // v8.2: Save session
        document.getElementById('view-login').style.display = 'none';
        exitToHub(); // v8.1: Unified navigation Fix
        // Initialize icons for the hub
        if (window.lucide) lucide.createIcons();
    } else {
        errorEl.style.display = 'flex';
        // Shake animation is handled by CSS
        setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }
}

/**
 * Logout & Security Helpers (v8.2)
 */
window.logout = function() {
    localStorage.removeItem('rexus_session');
    location.reload(); 
};

window.togglePassword = function() {
    const input = document.getElementById('login-pass');
    const icon = document.getElementById('eye-icon');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) lucide.createIcons();
};


// Enter Key Listener
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('view-login') && document.getElementById('view-login').style.display !== 'none') {
        checkLogin();
    }
});


// GLOBAL DELETE ENGINE - Moved to top for immediate availability
window.deleteReport = function(key) {
    if (!key) {
        console.warn("Delete aborted: No key provided");
        return;
    }
    
    // Explicit confirmation requested by user
    const mensaje = `¿Estás seguro de que quieres eliminar el reporte de ${key}?\n\nEsta acción borrará la información tanto de la web como del guardado permanente para que no figure más en la app.`;
    
    if (window.confirm(mensaje)) {
        console.log("Nexus Archive Purge: Executing for", key);
        
        if (state.history[key]) {
            delete state.history[key];
            const dataStr = JSON.stringify(state.history);
            
            // Hard Sync across all potential keys
            localStorage.setItem('rexus_history', dataStr);
            localStorage.setItem('nexus_history', dataStr);
            
            console.log("Physical storage updated. Keys: rexus_history, nexus_history");
            
            // Re-render UI
            if (typeof renderArchivesList === 'function') renderArchivesList();
            if (typeof renderComparisonView === 'function') renderComparisonView();
            
            setTimeout(() => {
                alert(`El reporte de ${key} ha sido removido de la base de datos galáctica.`);
            }, 100);
        } else {
            console.warn("Key not found in state, trying storage refresh...");
            const saved = localStorage.getItem('rexus_history') || localStorage.getItem('nexus_history');
            if (saved) {
                state.history = JSON.parse(saved);
                if (state.history[key]) {
                    window.deleteReport(key); // Recursive retry with fresh state
                    return;
                }
            }
            alert("No se encontró el reporte especificado en el almacenamiento.");
        }
    }
};

// UI Elements
const charts = {
    channels: null,
    brands: null,
    brandsVolume: null,
    localBrands: null, // v6.1
    localProducts: null, // v6.1
    comercialesBrands: null // v7.0
};

// Comerciales Module State (External Leads Focus)
const comercialesState = {
    crm: [],
    activeSegment: 'totales', // totales | propio | referido | clima
    metrics: { 
        totales: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} },
        propio: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} },
        referido: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} },
        clima: { leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} }
    },
    history: {},
    filesLoaded: 0
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Session Check v8.2
    if (localStorage.getItem('rexus_session') === 'active') {
        document.getElementById('view-login').style.display = 'none';
        exitToHub();
    }

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
    if (btnDemo) btnDemo.addEventListener('click', loadDemoData);

    // Initial Date Selection
    const now = new Date();
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    
    const selM = document.getElementById('select-month');
    const selY = document.getElementById('select-year');
    const selLocalM = document.getElementById('local-select-month');
    const selLocalY = document.getElementById('local-select-year');
    
    if (selM) selM.value = months[now.getMonth()];
    if (selY) selY.value = now.getFullYear().toString();
    if (selLocalM) selLocalM.value = months[now.getMonth()];
    if (selLocalY) selLocalY.value = now.getFullYear().toString();
    
    // Comerciales Date Initialization
    const selComM = document.getElementById('comerciales-select-month');
    const selComY = document.getElementById('comerciales-select-year');
    if (selComM) selComM.value = months[now.getMonth()];
    if (selComY) selComY.value = now.getFullYear().toString();
    
    // Dropdown listeners
    if (selM) selM.addEventListener('change', syncPeriod);
    if (selY) selY.addEventListener('change', syncPeriod);

    // Save Button Trigger
    const btnSave = document.querySelector('.period-control .save-btn');
    if (btnSave) btnSave.addEventListener('click', saveCurrentReport);
    
    loadStoredHistory();
    loadLocalHistory(); // v6.2
    loadComercialesHistory(); // v7.0
    syncPeriod();

    // Setup Global Delegated Listeners
    setupDelegatedListeners();
}

function setupDelegatedListeners() {
    // Archives Deletion - Relying on robust inline onclick in renderArchivesList

    // Comparison Selection
    const comparisonGrid = document.getElementById('comparison-selector-grid');
    if (comparisonGrid) {
        comparisonGrid.addEventListener('change', (e) => {
            if (e.target.name === 'comp-period') {
                const label = e.target.closest('.comp-checkbox-item');
                if (label) label.classList.toggle('selected', e.target.checked);
            }
        });
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');
    
    // Simplified Highlight correct tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        const onclick = btn.getAttribute('onclick') || "";
        if (onclick.includes(`'${viewId}'`)) {
            btn.classList.add('active');
        }
    });

    if (viewId === 'guardados') {
        renderArchivesList();
        showGuardadosSubView('history');
    }
    if (viewId === 'brands') renderBrandsView();
    if (viewId === 'matrix') renderMatrix();
    if (viewId === 'sellers') renderSellers();
    
    if (window.lucide) lucide.createIcons();
}

/**
 * Suite Navigation (v6.0)
 */
function enterModule(module) {
    state.currentModule = module;
    document.getElementById('view-hub').style.display = 'none';
    
    // Reset all modules first
    document.getElementById('module-meta').style.display = 'none';
    document.getElementById('module-local').style.display = 'none';
    document.getElementById('module-comerciales').style.display = 'none';

    const targetModule = document.getElementById(`module-${module}`);
    if (targetModule) {
        targetModule.style.display = 'block';
        if (module === 'meta') {
            showView('dashboard');
        } else if (module === 'local') {
            // Local doesn't need re-render on enter unless file changed
            if (localState.crm.length > 0) renderLocalDashboard();
            showLocalView('dashboard');
        } else if (module === 'comerciales') {
            if (comercialesState.crm.length > 0) renderComercialesDashboard();
            showComercialesView('dashboard');
        }
    }
    
    if (window.lucide) lucide.createIcons();
}


function exitToHub() {
    state.currentModule = 'hub';
    document.getElementById('module-meta').style.display = 'none';
    document.getElementById('module-local').style.display = 'none';
    document.getElementById('module-comerciales').style.display = 'none';
    document.getElementById('view-hub').style.display = 'block';
    document.getElementById('view-hub').classList.add('animate-fade-in');
    
    if (window.lucide) lucide.createIcons();
}

/**
 * Toggle Module Switcher Widget (v7.0)
 */
window.toggleSwitcher = function() {
    const switcher = document.getElementById('module-switcher');
    const trigger = document.querySelector('.switcher-trigger');
    if (switcher) {
        switcher.classList.toggle('active');
        if (trigger) trigger.classList.toggle('active');
    }
}

/**
 * Local Analytics (Showroom) - v6.0
 */
function showLocalView(viewId) {
    document.querySelectorAll('#module-local .view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#module-local .tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`local-view-${viewId}`);
    if (target) target.classList.add('active');
    
    // Highlight correct tab
    document.querySelectorAll('#module-local .tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${viewId}'`)) btn.classList.add('active');
    });

    if (viewId === 'dashboard') renderLocalDashboard();
    if (viewId === 'vendedores') renderLocalSellers();
    if (viewId === 'productos') renderLocalProducts();
    if (viewId === 'guardados') {
        renderLocalArchivesList();
        showLocalGuardadosSubView('history');
    }

    if (window.lucide) lucide.createIcons();
}

function showLocalGuardadosSubView(subId) {
    document.querySelectorAll('#module-local .local-subview').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#module-local .sub-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(`local-subview-${subId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('#module-local .sub-tab').forEach(t => {
        if (t.getAttribute('onclick').includes(`'${subId}'`)) t.classList.add('active');
    });

    if (subId === 'history') renderLocalArchivesList();
    if (subId === 'comparison') renderLocalComparisonView();
    
    if (window.lucide) lucide.createIcons();
}

async function handleLocalFile(file) {
    if (!file) return;
    const statusEl = document.getElementById('st-local-crm');
    statusEl.innerText = "Procesando Salón...";
    
    try {
        const data = await parseXLSX(file);
        
        // Filter Salon Only (Resilient to accents and case)
        localState.crm = data.filter(row => {
            const canal = String(row['Canal'] || '').toLowerCase();
            return canal.includes('salon') || canal.includes('salón');
        });

        processLocalData();
        statusEl.innerHTML = `<i data-lucide="check-circle"></i> ${localState.crm.length} registros filtrados`;
        statusEl.style.color = 'var(--success)';
        
        renderLocalDashboard();
        localState.filesLoaded = 1; // v6.2
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error("Local Module Error:", e);
        statusEl.innerHTML = `<i data-lucide="alert-circle"></i> Error en Estructura`;
    }
}

function parseMoney(val) {
    if (!val) return 0;
    // Standard Rexus Money Logic: remove symbols, dots as thousands, commas as decimals
    let m = parseFloat(String(val).replace(/[$,]/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0;
    // USD conversion (v3.4)
    if (m > 0 && m < 35000) m = m * 1420;
    return m;
}

function processLocalData() {
    const initObj = () => ({ leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} });
    
    localState.metrics = {
        totales: initObj(),
        norcenter: initObj(),
        nordelta: initObj()
    };
    
    localState.crm.forEach(row => {
        const canal = String(row['Canal'] || '').toLowerCase();
        const segments = ['totales'];
        if (canal.includes('norcenter')) segments.push('norcenter');
        if (canal.includes('nordelta')) segments.push('nordelta');

        const status = row['Estado'] || '';
        const isSale = (status === 'Vendido' || status === 'Finalizado');
        const monto = parseMoney(row['Monto_Total']);
        const seller = row['Comercial'] || 'Sin Asignar';
        const brand = String(row['Marca'] || 'S/M');
        const product = String(row['Tipo_Producto'] || 'Otros');
        const loss_reason = row['Motivo de perdida'] || row['Motivo de pérdida'] || '';

        segments.forEach(seg => {
            const m = localState.metrics[seg];
            m.leads++;
            
            if (isSale) {
                m.sales++;
                m.earnings += monto;
                m.brands[brand] = (m.brands[brand] || 0) + monto;
                m.products[product] = (m.products[product] || 0) + 1;
            } else if (loss_reason) {
                m.loss_reasons[loss_reason] = (m.loss_reasons[loss_reason] || 0) + 1;
            }

            if (!m.sellers[seller]) {
                m.sellers[seller] = { leads: 0, sales: 0, amount: 0, loss_reasons: {}, detailed_sales: [], location: segments.length > 2 ? 'Ambos' : (segments[1] === 'norcenter' ? 'Norcenter' : 'Nordelta') };
            }
            m.sellers[seller].leads++;
            if (isSale) {
                m.sellers[seller].sales++;
                m.sellers[seller].amount += monto;
                m.sellers[seller].detailed_sales.push({ brand, product, amount: monto });
            } else if (loss_reason) {
                m.sellers[seller].loss_reasons[loss_reason] = (m.sellers[seller].loss_reasons[loss_reason] || 0) + 1;
            }
        });
    });
}

window.switchLocalSegment = function(seg) {
    localState.activeSegment = seg;
    const activeTab = document.querySelector('#module-local .tab-btn.active');
    const onclick = activeTab ? activeTab.getAttribute('onclick') : '';
    
    if (onclick.includes('dashboard')) renderLocalDashboard();
    if (onclick.includes('vendedores')) renderLocalSellers();
    if (onclick.includes('productos')) renderLocalProducts();
    
    if (window.lucide) lucide.createIcons();
};

function getLocalSegmentSwitcher() {
    return `
        <div class="segment-switcher glass" style="margin-bottom: 2rem;">
            <button class="seg-btn ${localState.activeSegment === 'totales' ? 'active' : ''}" onclick="switchLocalSegment('totales')">Totales</button>
            <button class="seg-btn ${localState.activeSegment === 'norcenter' ? 'active' : ''}" onclick="switchLocalSegment('norcenter')">Norcenter</button>
            <button class="seg-btn ${localState.activeSegment === 'nordelta' ? 'active' : ''}" onclick="switchLocalSegment('nordelta')">Nordelta</button>
        </div>
    `;
}

function renderLocalDashboard() {
    const container = document.querySelector('#local-view-dashboard .dashboard-grid');
    const insightContainer = document.getElementById('local-strategic-insight');
    if (!container) return;

    const m = localState.metrics[localState.activeSegment];
    const cr = ((m.sales / (m.leads || 1)) * 100).toFixed(1);
    const avgTicket = m.sales > 0 ? m.earnings / m.sales : 0;

    // Segment Switcher HTML
    const switcherHTML = getLocalSegmentSwitcher();

    // 1. Strategic Insight Hero (Local v6.1)
    let stratStatus = "neutral", stratTitle = `Análisis ${localState.activeSegment.toUpperCase()} Iniciado`, stratDesc = "Esperando volumen de datos para generar proyecciones estratégicas.";
    
    if (m.leads > 0) {
        if (parseFloat(cr) > 15) { stratStatus = "positive"; stratTitle = "Alta Calidad de Tráfico"; stratDesc = `La tasa de cierre en ${localState.activeSegment} es excepcional. El equipo está capitalizando leads con gran eficiencia.`; }
        else if (parseFloat(cr) < 5 && m.leads > 50) { stratStatus = "danger"; stratTitle = "Fuga de Leads detectada"; stratDesc = `Baja conversión en ${localState.activeSegment}. Revisar protocolos de atención o stock local.`; }
        else { stratStatus = "warning"; stratTitle = "Operación Estable"; stratDesc = `El flujo de ${localState.activeSegment} se mantiene equilibrado. Oportunidad de aumentar el ticket promedio.`; }
    }

    insightContainer.innerHTML = `
        ${switcherHTML}
        <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
            <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
            <div class="s-content">
                <h4>${stratTitle}</h4>
                <p>${stratDesc}</p>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="metric-card glass animate-slide-up">
            <label>Leads (${localState.activeSegment})</label>
            <h3>${m.leads}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.1s">
            <label>Ventas (${localState.activeSegment})</label>
            <h3>${m.sales}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.2s">
            <label>Facturación</label>
            <h3>${formatCurrency(m.earnings)}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.3s">
            <label>Ticket Promedio</label>
            <h3>${formatCurrency(avgTicket)}</h3>
        </div>
    `;

    renderLocalBrands();
    renderLocalLossReasons(); // v6.1
}

/**
 * Local Persistence (v6.2)
 */
function loadLocalHistory() {
    const saved = localStorage.getItem('rexus_local_history');
    if (saved) {
        localState.history = JSON.parse(saved);
    }
}

function saveLocalReport() {
    const mSel = document.getElementById('local-select-month');
    const ySel = document.getElementById('local-select-year');
    const period = `${mSel.value} ${ySel.value}`;
    
    if (localState.filesLoaded === 0) {
        alert("No hay datos de salón cargados para guardar.");
        return;
    }

    localState.history[period] = {
        metrics: JSON.parse(JSON.stringify(localState.metrics)),
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('rexus_local_history', JSON.stringify(localState.history));
    
    // Feedback visual
    const btn = document.querySelector('#module-local .save-btn');
    if (btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" color="#fff"></i>`;
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            if (window.lucide) lucide.createIcons();
        }, 2000);
    }
    
    alert(`Reporte de Salón (${period}) guardado correctamente.`);
    if (document.getElementById('local-view-guardados').classList.contains('active')) renderLocalArchivesList();
}

function switchLocalPeriod(period) {
    if (localState.history[period]) {
        const h = localState.history[period];
        localState.metrics = JSON.parse(JSON.stringify(h.metrics));
        localState.filesLoaded = 1;
        
        // Render current view
        const activeTab = document.querySelector('#module-local .tab-btn.active');
        const onclick = activeTab ? activeTab.getAttribute('onclick') : '';
        if (onclick.includes('dashboard')) renderLocalDashboard();
        if (onclick.includes('vendedores')) renderLocalSellers();
        if (onclick.includes('productos')) renderLocalProducts();

        // Update UI dropdowns
        const [m, y] = period.split(' ');
        const selM = document.getElementById('local-select-month');
        const selY = document.getElementById('local-select-year');
        if (selM) selM.value = m;
        if (selY) selY.value = y;
        
        alert(`Cargando reporte histórico de Salón: ${period}`);
    }
}

function renderLocalArchivesList() {
    const list = document.getElementById('local-archives-list');
    if (!list) return;
    
    const keys = Object.keys(localState.history).sort((a, b) => b.localeCompare(a));

    if (keys.length === 0) {
        list.className = "dashboard-grid";
        list.innerHTML = `
            <div class="glass" style="padding: 4rem; text-align: center; grid-column: 1/-1;">
                <i data-lucide="archive-x" size="48" style="color:var(--text-muted)"></i>
                <h3 style="margin-top:1.5rem; color:#fff">No hay reportes de salón archivados</h3>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    list.className = "archives-grid";
    list.innerHTML = keys.map(key => {
        const h = localState.history[key];
        return `
            <div class="metric-card glass arch-card animate-slide-up" id="local-arch-${key.replace(/\s+/g, '-')}">
                <div class="arch-card-header">
                    <div class="arch-card-title">
                        <h3>${key}</h3>
                        <p><i data-lucide="calendar" size="12" style="vertical-align:middle; margin-right:6px; opacity:0.6"></i> ${new Date(h.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center">
                        <button class="info-toggle-btn" onclick="toggleLocalArchInfo('${key.replace(/\s+/g, '-')}')" title="Ver Detalles">
                            <i data-lucide="chevron-down" size="18"></i>
                        </button>
                    </div>
                </div>

                <div class="arch-card-quick-info" id="local-info-${key.replace(/\s+/g, '-')}">
                    <div class="arch-stats-grid">
                        <div class="mini-stat"><span>Leads Totales</span><strong>${h.metrics.totales.leads}</strong></div>
                        <div class="mini-stat"><span>Ventas Salón</span><strong>${h.metrics.totales.sales}</strong></div>
                        <div class="mini-stat"><span>Facturación</span><strong>${formatCurrency(h.metrics.totales.earnings)}</strong></div>
                        <div class="mini-stat"><span>Ticket Prom.</span><strong>${h.metrics.totales.sales > 0 ? formatCurrency(h.metrics.totales.earnings / h.metrics.totales.sales) : formatCurrency(0)}</strong></div>
                    </div>
                </div>

                <div class="arch-actions">
                    <button class="restore-btn" onclick="switchLocalPeriod('${key}'); showLocalView('dashboard')">
                        <i data-lucide="refresh-cw" size="14"></i> Restaurar este reporte
                    </button>
                    <button class="delete-btn-arch" onclick="window.deleteLocalReport('${key}')" title="Eliminar Permanente">
                        <i data-lucide="trash-2" size="18"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

window.toggleLocalArchInfo = function(id) {
    const infoSec = document.getElementById(`local-info-${id}`);
    const btn = document.querySelector(`#local-arch-${id} .info-toggle-btn`);
    if (infoSec) {
        infoSec.classList.toggle('active');
        if (btn) btn.classList.toggle('active');
    }
}

window.deleteLocalReport = function(key) {
    if (window.confirm(`¿Eliminar reporte de Salón de ${key}?`)) {
        if (localState.history[key]) {
            delete localState.history[key];
            localStorage.setItem('rexus_local_history', JSON.stringify(localState.history));
            renderLocalArchivesList();
        }
    }
};

function renderLocalComparisonView() {
    const grid = document.getElementById('local-comparison-selector-grid');
    if (!grid) return;
    
    const keys = Object.keys(localState.history).sort((a, b) => b.localeCompare(a));
    
    if (keys.length < 1) {
        grid.innerHTML = `<div class="glass" style="grid-column: 1/-1; padding: 2rem; color:var(--text-muted)">Guarda al menos un reporte para comparar.</div>`;
        return;
    }

    grid.innerHTML = keys.map(key => `
        <label class="comp-checkbox-item glass">
            <input type="checkbox" name="comp-local-period" value="${key}" onchange="this.closest('.comp-checkbox-item').classList.toggle('selected', this.checked)">
            <span>${key}</span>
        </label>
    `).join('');
}

function runLocalComparison() {
    const btn = document.querySelector('#local-subview-comparison .save-btn');
    const selected = Array.from(document.querySelectorAll('input[name="comp-local-period"]:checked')).map(cb => cb.value);
    const dashboard = document.getElementById('local-comparison-dashboard');
    const placeholder = document.getElementById('local-comparison-results-placeholder');
    const financialResults = document.getElementById('local-comp-results-financial');
    const efficiencyResults = document.getElementById('local-comp-results-efficiency');
    const insightContainer = document.getElementById('local-comparison-strategic-insight');

    if (selected.length < 2) {
        alert("Selecciona al menos 2 meses para comparar.");
        return;
    }

    const originalBtn = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Generando Inteligencia Showroom...`;
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        try {
            placeholder.style.display = 'none';
            dashboard.style.display = 'grid';
            
            const latest = localState.history[selected[0]];
            const previous = localState.history[selected[1]];

            // 1. Strategic Insight
            const revDelta = latest.metrics.totales.earnings - previous.metrics.totales.earnings;
            const salesDelta = latest.metrics.totales.sales - previous.metrics.totales.sales;
            let stratStatus = "neutral", stratTitle = "Performance de Salón", stratDesc = "Balance operativo estable en la gestión del showroom.";
            if (revDelta > 0 && salesDelta >= 0) { stratStatus = "positive"; stratTitle = "Crecimiento en Showroom"; stratDesc = "Aumento de facturación con flujo de ventas saludable. Excelente gestión física."; }
            else if (revDelta < 0) { stratStatus = "danger"; stratTitle = "Contracción de Ventas"; stratDesc = "Caída en el volumen de salón. Revisar afluencia de leads y stock en exhibición."; }

            insightContainer.innerHTML = `
                <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
                    <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
                    <div class="s-content">
                        <h4>${stratTitle}</h4>
                        <p>${stratDesc}</p>
                    </div>
                </div>
            `;

            const financialMetrics = [
                { label: 'Leads Salón', p: 'metrics.totales.leads', type: 'number', icon: 'users' },
                { label: 'Ventas Salón', p: 'metrics.totales.sales', type: 'number', icon: 'shopping-bag' },
                { label: 'Facturación Salon', p: 'metrics.totales.earnings', type: 'currency', icon: 'dollar-sign' }
            ];

            const efficiencyMetrics = [
                { label: 'Tasa de Cierre', custom: (h) => (h.metrics.totales.sales / (h.metrics.totales.leads || 1)) * 100, type: 'number', suffix: '%', icon: 'target' },
                { label: 'Ticket Promedio', custom: (h) => h.metrics.totales.earnings / (h.metrics.totales.sales || 1), type: 'currency', icon: 'ticket' }
            ];

            const getHVal = (h, p) => p.split('.').reduce((acc, part) => acc && acc[part], h) || 0;

            financialResults.innerHTML = financialMetrics.map(m => {
                const val = getHVal(latest, m.p);
                const prevVal = getHVal(previous, m.p);
                const delta = prevVal === 0 ? (val > 0 ? 100 : 0) : ((val - prevVal) / prevVal) * 100;
                return `
                    <div class="comp-metric-group glass animate-slide-up">
                        <div class="group-header"><i data-lucide="${m.icon}" size="16"></i> <span>${m.label}</span></div>
                        <div class="group-values">
                            <div class="val-pill"><span class="pill-label">${selected[1]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(prevVal) : prevVal}</span></div>
                            <div class="val-pill"><span class="pill-label">${selected[0]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(val) : val}</span><div class="mini-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div></div>
                        </div>
                    </div>
                `;
            }).join('');

            efficiencyResults.innerHTML = efficiencyMetrics.map(m => {
                const val = m.custom(latest);
                const prevVal = m.custom(previous);
                const delta = prevVal === 0 ? (val > 0 ? 100 : 0) : ((val - prevVal) / prevVal) * 100;
                return `
                    <div class="comp-metric-group glass animate-slide-up">
                        <div class="group-header"><i data-lucide="${m.icon}" size="16"></i> <span>${m.label}</span></div>
                        <div class="group-values">
                            <div class="val-pill"><span class="pill-label">${selected[1]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(prevVal) : (prevVal.toFixed(1) + '%')}</span></div>
                            <div class="val-pill"><span class="pill-label">${selected[0]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(val) : (val.toFixed(1) + '%')}</span><div class="mini-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div></div>
                        </div>
                    </div>
                `;
            }).join('');

            // 3. Visualizations
            const chartLabels = [...selected].reverse();
            const ctxT = document.getElementById('chart-local-comparison-trends').getContext('2d');
            if (charts.localCompTrend) charts.localCompTrend.destroy();
            charts.localCompTrend = new Chart(ctxT, {
                type: 'line',
                data: { labels: chartLabels, datasets: [{ label: 'Facturación Salón', data: chartLabels.map(k => localState.history[k].metrics.totales.earnings), borderColor: '#8B5CF6', borderWidth: 4, pointRadius: 6, tension: 0.4, fill: true, backgroundColor: 'rgba(139, 92, 246, 0.1)' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8', callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#fff' } } } }
            });

            const ctxB = document.getElementById('chart-local-comparison-bars').getContext('2d');
            if (charts.localCompBars) charts.localCompBars.destroy();
            charts.localCompBars = new Chart(ctxB, {
                type: 'bar',
                data: { labels: ['Leads', 'Ventas'], datasets: selected.map((k, idx) => ({ label: k, data: [localState.history[k].metrics.totales.leads, localState.history[k].metrics.totales.sales], backgroundColor: idx === 0 ? '#8B5CF6' : 'rgba(255,255,255,0.1)', borderRadius: 8 })) },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { y: { display: false }, x: { ticks: { color: '#fff' } } } }
            });

            const ctxR = document.getElementById('chart-local-comparison-balance').getContext('2d');
            if (charts.localCompRadar) charts.localCompRadar.destroy();
            const getNorm = (k, t) => {
                const h = localState.history[k];
                if (t === 'cr') return Math.min(((h.metrics.totales.sales / (h.metrics.totales.leads || 1)) / 0.15) * 100, 100);
                if (t === 'ticket') return Math.min((h.metrics.totales.earnings / (h.metrics.totales.sales || 1) / 2000000) * 100, 100);
                if (t === 'leads') return Math.min((h.metrics.totales.leads / 500) * 100, 100);
                return 50;
            };
            charts.localCompRadar = new Chart(ctxR, {
                type: 'radar',
                data: { labels: ['Conversión', 'Ticket Promedio', 'Volumen Leads', 'Ventas Totales', 'Eficiencia'], datasets: selected.map((k, idx) => ({ label: k, data: [getNorm(k, 'cr'), getNorm(k, 'ticket'), getNorm(k, 'leads'), Math.min(localState.history[k].metrics.totales.sales / 50 * 100, 100), 70], borderColor: idx === 0 ? '#10b981' : '#f59e0b', backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', borderWidth: 3 })) },
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#fff' }, ticks: { display: false }, suggestedMax: 100 } } }
            });

            if (window.lucide) lucide.createIcons();
            dashboard.scrollIntoView({ behavior: 'smooth' });
        } catch(e) { console.error(e); } finally { btn.innerHTML = originalBtn; btn.disabled = false; if (window.lucide) lucide.createIcons(); }
    }, 800);
}

function renderLocalLossReasons() {
    // Add loss reasons to dashboard if available
    const container = document.querySelector('#local-view-dashboard');
    let lossArea = document.getElementById('local-loss-area');
    
    if (!lossArea) {
        lossArea = document.createElement('div');
        lossArea.id = 'local-loss-area';
        lossArea.style.marginTop = '4rem';
        container.appendChild(lossArea);
    }

    const m = localState.metrics[localState.activeSegment];
    const sorted = Object.entries(m.loss_reasons).sort((a,b) => b[1] - a[1]);
    if (sorted.length === 0) return;

    lossArea.innerHTML = `
        <h2 class="section-title">Fugas de Venta (Salón)</h2>
        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
            ${sorted.slice(0,4).map(([reason, count]) => `
                <div class="glass animate-slide-up" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--danger);">
                    <span style="font-weight:600; color: rgba(255,255,255,0.8)">${reason}</span>
                    <strong style="color:var(--danger); font-size: 1.2rem;">${count}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLocalBrands() {
    const list = document.getElementById('local-brands-ranking-list');
    const ctx = document.getElementById('chart-local-brands').getContext('2d');
    if (!list || !ctx) return;
    
    const m = localState.metrics[localState.activeSegment];
    const sorted = Object.entries(m.brands).sort((a,b) => b[1] - a[1]);
    
    // Sidebar list
    list.innerHTML = sorted.map(([name, val], idx) => `
        <div class="brand-rank-item animate-slide-up" style="animation-delay: ${idx * 0.1}s">
            <span class="rank-name">${name}</span>
            <span class="rank-val">${formatCurrency(val)}</span>
        </div>
    `).join('');

    // Chart
    if (charts.localBrands) charts.localBrands.destroy();
    const top6 = sorted.slice(0, 8);
    charts.localBrands = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top6.map(b => b[0]),
            datasets: [{
                label: 'Volumen en Salón ($)',
                data: top6.map(b => b[1]),
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderColor: '#818cf8',
                borderWidth: 2,
                borderRadius: 12
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                y: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderLocalSellers() {
    const list = document.getElementById('local-sellers-grid');
    if (!list) return;

    const m = localState.metrics[localState.activeSegment];
    const sorted = Object.entries(m.sellers).sort((a,b) => b[1].amount - a[1].amount);
    
    const switcherHTML = getLocalSegmentSwitcher();

    if (sorted.length === 0) {
        list.parentElement.innerHTML = `
            ${switcherHTML}
            <h2 class="section-title">Ranking de Vendedores (Salón)</h2>
            <div id="local-sellers-grid" class="dashboard-grid">
                <div class="glass" style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">Sin datos de vendedores de salón.</div>
            </div>
        `;
        return;
    }

    list.parentElement.innerHTML = `
        ${switcherHTML}
        <h2 class="section-title"><i data-lucide="users"></i> Ranking de Vendedores</h2>
        <div id="local-sellers-grid" class="dashboard-grid">
            ${sorted.map(([name, s], idx) => {
                const conv = ((s.sales / (s.leads || 1)) * 100).toFixed(1);
                return `
                    <div class="seller-card glass animate-slide-up" style="animation-delay: ${idx * 0.1}s" 
                         onclick="showSellerDetail('${name.replace(/'/g, "\\")}', 'local')">
                        <div class="seller-header">
                            <div class="avatar-glow">${name.charAt(0)}</div>
                            <div class="seller-info">
                                <strong>${name}</strong>
                                <span class="hub-badge" style="background: rgba(255,255,255,0.05); color: var(--module-color); font-size: 0.7rem; padding: 2px 8px; margin-top: 4px;">${s.location || 'Showroom'}</span>
                            </div>
                        </div>
                        <div class="seller-stats-grid" style="margin-top:1.5rem">
                            <div class="s-stat"><label>Leads</label><strong>${s.leads}</strong></div>
                            <div class="s-stat"><label>Ventas</label><strong>${s.sales}</strong></div>
                            <div class="s-stat"><label>Cierre</label><strong>${conv}%</strong></div>
                        </div>
                        <div class="card-footer-cta">
                            Ver Inteligencia <i data-lucide="chevron-right" size="14"></i>
                        </div>
                        <div style="margin-top: 1rem; text-align: right;">
                            <strong style="color:var(--success); font-size: 1.1rem;">${formatCurrency(s.amount)}</strong>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
}

function renderLocalProducts() {
    const target = document.getElementById('local-products-grid');
    const chartContainerId = 'chart-local-products-container';
    if (!target) return;

    const m = localState.metrics[localState.activeSegment];
    const sorted = Object.entries(m.products).sort((a,b) => b[1] - a[1]);
    
    const switcherHTML = getLocalSegmentSwitcher();

    if (sorted.length === 0) {
        target.parentElement.innerHTML = `
            ${switcherHTML}
            <h2 class="section-title">Análisis de Productos (Salón)</h2>
            <div id="local-products-grid" class="dashboard-grid">
                <div class="glass" style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">Sin datos de productos vendidos.</div>
            </div>
        `;
        return;
    }

    target.parentElement.innerHTML = `
        ${switcherHTML}
        <h2 class="section-title">Análisis de Productos (Salón)</h2>
        <div id="local-products-grid" class="dashboard-grid">
            <div class="glass chart-container" style="grid-column: 1 / -1; height: 400px; padding: 2rem;">
                <canvas id="chart-local-products"></canvas>
            </div>
            <div class="dashboard-grid" style="grid-column: 1 / -1; margin-top: 2rem; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
                ${sorted.map(([name, units], idx) => `
                    <div class="glass brand-rank-item animate-slide-up" style="animation-delay: ${idx * 0.05}s; background: rgba(255,255,255,0.03); justify-content: space-between;">
                        <span class="rank-name" style="font-size: 0.9rem;">${name}</span>
                        <strong class="rank-val" style="color:var(--secondary); font-size: 1.1rem;">${units}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Chart
    const ctx = document.getElementById('chart-local-products').getContext('2d');
    if (charts.localProducts) charts.localProducts.destroy();
    
    const top6 = sorted.slice(0, 10);
    charts.localProducts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top6.map(p => p[0]),
            datasets: [{
                label: 'Unidades Vendidas (Salón)',
                data: top6.map(p => p[1]),
                backgroundColor: 'rgba(16, 185, 129, 0.4)',
                borderColor: '#10b981',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function showGuardadosSubView(subId) {
    document.querySelectorAll('.subview').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(`subview-${subId}`);
    if (target) target.classList.add('active');
    
    // Highlight sub-tab
    document.querySelectorAll('.sub-tab').forEach(t => {
        if (t.getAttribute('onclick').includes(`'${subId}'`)) t.classList.add('active');
    });

    if (subId === 'history') renderArchivesList();
    if (subId === 'comparison') renderComparisonView();
    
    if (window.lucide) lucide.createIcons();
}

/**
 * Sync logic for dropdowns
 */
function syncPeriod() {
    const m = document.getElementById('select-month').value;
    const y = document.getElementById('select-year').value;
    state.currentPeriod = `${m} ${y}`;
    
    // We update the internal state period but we DON'T load history automatically.
    // The user wants the dashboard to be ready for NEW data for that selected period.
    console.log("Periodo sincronizado para nueva carga:", state.currentPeriod);
}

function loadStoredHistory() {
    const saved = localStorage.getItem('rexus_history') || localStorage.getItem('nexus_history');
    if (saved) {
        state.history = JSON.parse(saved);
    }
}

function saveCurrentReport() {
    const period = `${document.getElementById('select-month').value} ${document.getElementById('select-year').value}`;
    
    if (state.filesLoaded === 0) {
        alert("No hay datos cargados para guardar.");
        return;
    }

    state.history[period] = {
        metrics: JSON.parse(JSON.stringify(state.metrics)),
        sellers: JSON.parse(JSON.stringify(state.sellers)),
        brandVolume: JSON.parse(JSON.stringify(state.brandVolume)),
        brandProducts: JSON.parse(JSON.stringify(state.brandProducts)),
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('rexus_history', JSON.stringify(state.history));
    
    // Feedback visual
    const btn = document.querySelector('.period-control .save-btn');
    if (btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" color="#fff"></i>`;
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            if (window.lucide) lucide.createIcons();
        }, 2000);
    }
    
    alert(`Reporte de ${period} guardado correctamente.`);
    if (document.getElementById('view-archives').classList.contains('active')) renderArchivesList();
}

function switchPeriod(period) {
    if (state.history[period]) {
        const h = state.history[period];
        state.metrics = JSON.parse(JSON.stringify(h.metrics));
        state.sellers = JSON.parse(JSON.stringify(h.sellers));
        state.brandVolume = JSON.parse(JSON.stringify(h.brandVolume));
        state.brandProducts = JSON.parse(JSON.stringify(h.brandProducts || {}));
        state.filesLoaded = 4;
        updateSystem();
        
        // Update UI dropdowns
        const [m, y] = period.split(' ');
        const selM = document.getElementById('select-month');
        const selY = document.getElementById('select-year');
        if (selM) selM.value = m;
        if (selY) selY.value = y;
        
        alert(`Cargando reporte histórico: ${period}`);
    } else {
        initMetrics();
        updateSystem();
    }
}

function initMetrics() {
    state.metrics = {
        aires: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        nodor: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        praga: { spend: 0, earnings: 0, leads: 0, roas: 0 },
        global: { spend: 0, earnings: 0, leads: 0, roas: 0, total_prospects: 0 }
    };
    state.sellers = {};
    state.brandVolume = {};
    state.brandProducts = {};
    state.filesLoaded = 0;
}

/**
 * Universal File Handler (CSV & XLSX)
 */
async function handleFileSelect(slot, file) {
    if (!file) return;

    const statusEl = document.getElementById(`st-${slot}`);
    const cardEl = document.getElementById(`card-${slot}`);
    
    if (statusEl) {
        statusEl.innerText = "Procesando...";
        statusEl.style.color = "var(--primary-light)";
    }
    
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
        lucide.createIcons();
        
        state.filesLoaded = Object.values(state.rawData).filter(d => d.length > 0).length;
        const countEl = document.getElementById('file-count');
        if (countEl) countEl.innerText = `${state.filesLoaded}/${state.totalSlots}`;
        
        try {
            updateSystem();
        } catch (sysError) {
            console.warn("UI Update Warning (Non-critical):", sysError);
        }

    } catch (error) {
        console.error("Critical Processing Error:", error);
        statusEl.innerHTML = `<i data-lucide="alert-circle"></i> Error de Formato`;
        statusEl.style.color = 'var(--danger)';
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
    state.brandVolume = {}; 
    state.brandProducts = {}; // v3.5

    data.forEach(row => {
        let monto = parseMoney(row['Monto_Total']);

        const rawBrand = String(row['Marca'] || 'S/M');
        const seller = row['Comercial'] || 'Sin Asignar';
        const status = row['Estado'] || '';
        const canal = String(row['Canal'] || '').toLowerCase();
        const negocio = String(row['Negocio'] || '').toLowerCase();

        // Attribution Logic
        let brandKey = null;
        if (canal.includes('clima')) brandKey = 'aires';
        else if (canal.includes('nodor')) brandKey = 'nodor';
        else if (canal.includes('electro')) brandKey = 'praga';
        else if (canal.includes('sitio web') || canal.includes('web')) {
            if (negocio.includes('aire')) brandKey = 'aires';
            else if (negocio.includes('calefaccion') || negocio.includes('electro')) brandKey = 'praga';
        }

        const isAttributable = !!brandKey;
        const isSale = (status === 'Vendido' || status === 'Finalizado');

        if (isSale && isAttributable) {
            state.metrics[brandKey].earnings += monto;
            
            // Track Brand Volume ($)
            state.brandVolume[rawBrand] = (state.brandVolume[rawBrand] || 0) + monto;

            // Track Brand Products (Units) - v3.5
            const productType = String(row['Tipo_Producto'] || 'Otros').trim();
            if (!state.brandProducts[rawBrand]) state.brandProducts[rawBrand] = {};
            state.brandProducts[rawBrand][productType] = (state.brandProducts[rawBrand][productType] || 0) + 1;
            
            // Track detail for modal (v4.6 parity)
            if (!state.sellers[seller]) state.sellers[seller] = { leads: 0, sales: 0, amount: 0, lost_leads: [], comments: [], detailed_sales: [], loss_reasons: {} };
            state.sellers[seller].detailed_sales.push({ brand: rawBrand, product: productType, amount: monto });
        }

        // Seller Data (Always tracked if attributable)
        if (isAttributable) {
            if (!state.sellers[seller]) {
                state.sellers[seller] = { 
                    leads: 0, 
                    sales: 0, 
                    amount: 0, 
                    lost_leads: [], 
                    comments: [],
                    detailed_sales: [], // v4.6
                    loss_reasons: {} 
                };
            }
            
            state.sellers[seller].leads++;
            
            if (isSale) {
                state.sellers[seller].sales++;
                state.sellers[seller].amount += monto;
                
                // Track Detailed Sales for Modal (v4.6)
                state.sellers[seller].detailed_sales.push({
                    brand: rawBrand,
                    product: row['Tipo_Producto'] || 'Producto',
                    amount: monto
                });
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
    // renderRawTable(); // Removed: Undefined in v32
    if (window.lucide) lucide.createIcons();
}

function calculateGlobals() {
    const brands = ['aires', 'nodor', 'praga'];
    state.metrics.global = { spend: 0, earnings: 0, leads: 0, roas: 0, total_prospects: 0, sales: 0 };

    brands.forEach(b => {
        const m = state.metrics[b];
        m.roas = m.spend > 0 ? (m.earnings / m.spend).toFixed(2) : 0;
        
        state.metrics.global.spend += m.spend;
        state.metrics.global.earnings += m.earnings;
        state.metrics.global.leads += m.leads;
    });

    // Sum global sales from sellers
    state.metrics.global.sales = Object.values(state.sellers).reduce((acc, s) => acc + s.sales, 0);

    // Count all leads from raw data if loaded
    if (state.rawData.crm) {
        state.metrics.global.total_prospects = state.rawData.crm.length;
    }

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
    document.getElementById('kpi-total-roas').innerText = `${g.roas}x`;
    
    // Use total_prospects for the total leads KPI
    animateValue('kpi-total-leads', g.total_prospects || g.leads, false);
}

function renderInsights() {
    const insightText = document.getElementById('insight-text');
    if (state.filesLoaded === 0) return;

    const g = state.metrics.global;
    let html = `El ecosistema Nexus ha procesado la data del mes. `;
    
    if (g.roas > 10) {
        html = `<span style="color:var(--success); font-weight:700">Rendimiento excepcional con un ROAS de ${g.roas}x.</span> `;
    } else if (g.roas > 5) {
        html = `<span style="font-weight:600">Rendimiento saludable con un ROAS de ${g.roas}x.</span> `;
    } else {
        html = `<span style="color:var(--warning)">Se observa una oportunidad de optimización en la conversión.</span> `;
    }

    // Top Brand
    const brands = ['aires', 'nodor', 'praga'];
    const top = brands.reduce((prev, current) => (state.metrics[prev].earnings > state.metrics[current].earnings) ? prev : current);
    html += `<br><br>La marca líder en ingresos es <strong>${top.toUpperCase()}</strong> con <span style="color:var(--primary-light); font-weight:800">${formatCurrency(state.metrics[top].earnings)}</span>.`;

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
    
    const topLoss = getTopLossReason();

    let html = `
        <div class="analyst-report">
            <p><span class="insight-tag tag-pos">Estrategia</span> 
            El canal más eficiente en costo por lead es <strong>${bestCPL.name}</strong> 
            ($${Math.floor(bestCPL.cpl)}/lead). Se recomienda escalar presupuesto en esta vertical.</p>
            
            <p><span class="insight-tag tag-neu">Ventas</span> 
            Basado en atribución 100% Digital (Ads/Web), 
            <strong>${bestROAS.name}</strong> domina el retorno final con <strong>${bestROAS.roas}x</strong>.</p>
            
            <p><span class="insight-tag tag-neg">Alerta Leads</span> 
            Se detectaron <strong>${getTotalLostLeads()} prospectos perdidos</strong>. 
            La causa principal digital es <strong>"${topLoss}"</strong>.</p>
        </div>
    `;

    content.innerHTML = html;
}

function getTopLossReason() {
    const aggregated = {};
    Object.values(state.sellers).forEach(s => {
        Object.entries(s.loss_reasons).forEach(([reason, count]) => {
            aggregated[reason] = (aggregated[reason] || 0) + count;
        });
    });
    
    const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "Sin datos";
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
        const roi = m.spend > 0 ? (((m.earnings - m.spend) / m.spend) * 100).toFixed(1) : 0;
        
        return `
            <tr>
                <td><div class="brand-cell"><div class="dot ${b.class}"></div> ${b.name}</div></td>
                <td>$${m.spend.toLocaleString()}</td>
                <td>$${m.earnings.toLocaleString()}</td>
                <td>${m.leads}</td>
                <td class="roas-cell"><strong>${m.roas}x</strong></td>
                <td style="color:var(--success); font-weight:700">${roi}%</td>
            </tr>
        `;
    }).join('');
}

function renderSellers() {
    const list = document.getElementById('seller-list');
    if (!list) return;
    
    const sorted = Object.entries(state.sellers).sort((a, b) => b[1].amount - a[1].amount);
    
    if (sorted.length === 0) {
        list.className = "dashboard-grid";
        list.innerHTML = `<div class="glass" style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">Sin datos de vendedores disponibles</div>`;
        return;
    }

    list.className = "dashboard-grid";
    list.innerHTML = sorted.map(([name, data], idx) => {
        const conv = data.leads > 0 ? ((data.sales / data.leads) * 100).toFixed(1) : 0;
        const delay = idx * 0.1;
        
        return `
            <div class="seller-card glass animate-slide-up" 
                 style="animation-delay: ${delay}s"
                 onclick="showSellerDetail('${name.replace(/'/g, "\\'")}')">
                <div class="seller-header">
                    <div class="avatar-glow">${name.charAt(0)}</div>
                    <div class="seller-info">
                        <strong>${name}</strong>
                        <span>${data.sales} Ventas Cerradas</span>
                    </div>
                </div>
                <div class="seller-stats-grid">
                    <div class="s-stat">
                        <label>Prospectos</label>
                        <strong>${data.leads}</strong>
                    </div>
                    <div class="s-stat">
                        <label>Ventas</label>
                        <strong>${data.sales}</strong>
                    </div>
                    <div class="s-stat">
                        <label>Facturación</label>
                        <strong>${formatCurrency(data.amount)}</strong>
                    </div>
                </div>
                <div class="card-footer-cta">
                    Ver Inteligencia <i data-lucide="chevron-right" size="14"></i>
                </div>
            </div>
        `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
}

/**
 * Seller Deep-Dive
 */
function showSellerDetail(name, module = 'meta') {
    let source;
    if (module === 'local') {
        source = localState.metrics[localState.activeSegment].sellers;
    } else if (module === 'comerciales') {
        source = comercialesState.metrics[comercialesState.activeSegment].sellers;
    } else {
        source = state.sellers;
    }
    
    const seller = source[name];
    if (!seller) return;

    // v8.3 Robustness: Ensure missing fields don't crash the modal
    if (!seller.loss_reasons) seller.loss_reasons = {};
    if (!seller.detailed_sales) seller.detailed_sales = [];
    if (!seller.leads) seller.leads = 0;
    if (!seller.sales) seller.sales = 0;
    if (!seller.amount) seller.amount = 0;

    state.currentSeller = name; 
    state.currentSellerModule = module;

    document.getElementById('modal-seller-name').innerText = name;
    document.getElementById('modal-avatar').innerText = name.charAt(0);
    
    // Updated Header Stats (4 Horizontal Cards)
    const lostCount = Object.values(seller.loss_reasons).reduce((a, b) => a + b, 0);
    const avgTicket = seller.sales > 0 ? (seller.amount / seller.sales) : 0;
    const effectiveness = seller.leads > 0 ? ((seller.sales / seller.leads) * 100).toFixed(1) : 0;

    document.getElementById('modal-seller-stats-horizontal').innerHTML = `
        <div class="m-card-h glass animate-slide-up">
            <label>Prospectos</label>
            <strong>${seller.leads}</strong>
        </div>
        <div class="m-card-h glass animate-slide-up" style="animation-delay:0.1s">
            <label>Ventas</label>
            <strong style="color:var(--success)">${seller.sales}</strong>
        </div>
        <div class="m-card-h glass animate-slide-up" style="animation-delay:0.2s">
            <label>Pérdida</label>
            <strong style="color:var(--danger)">${lostCount}</strong>
        </div>
        <div class="m-card-h glass animate-slide-up" style="animation-delay:0.3s">
            <label>Ticket Prom.</label>
            <strong style="color:var(--primary-light)">${formatCurrency(avgTicket)}</strong>
        </div>
    `;

    // Internal Efficiency Analytics
    const effContainer = document.getElementById('modal-efficiency-grid');
    if (effContainer) {
        effContainer.innerHTML = `
            <div class="eff-stat-box">
                <span class="eff-label">Conversión Final</span>
                <span class="eff-value">${effectiveness}%</span>
                <div class="eff-bar"><div class="eff-fill" style="width:${effectiveness}%"></div></div>
            </div>
            <div class="eff-stat-box">
                <span class="eff-label">Volumen Facturado</span>
                <span class="eff-value">${formatCurrency(seller.amount)}</span>
                <div class="eff-bar"><div class="eff-fill" style="width:100%; background:var(--primary-light)"></div></div>
            </div>
        `;
    }

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
    
    // Store current for tab switching
    state.currentSeller = name;


    document.getElementById('seller-modal').classList.add('active');
    lucide.createIcons();
}

function closeModal() {
    document.getElementById('seller-modal').classList.remove('active');
}

function switchModalTab(tabId) {
    document.querySelectorAll('.modal-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.mod-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(`mod-view-${tabId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.mod-tab').forEach(t => {
        const onclick = t.getAttribute('onclick') || "";
        if (onclick.includes(`'${tabId}'`)) {
            t.classList.add('active');
        }
    });

    if (tabId === 'sales') renderSellerVentas();
    if (tabId === 'mix') renderSellerMix();
}

/**
 * Seller Detail Tab Renderers (v4.6)
 */
function renderSellerVentas() {
    let source;
    if (state.currentSellerModule === 'local') {
        source = localState.metrics[localState.activeSegment].sellers;
    } else if (state.currentSellerModule === 'comerciales') {
        source = comercialesState.metrics[comercialesState.activeSegment].sellers;
    } else {
        source = state.sellers;
    }
    const seller = source[state.currentSeller];
    const list = document.getElementById('modal-sales-list');
    if (!seller || !list) return;

    if (!seller.detailed_sales || seller.detailed_sales.length === 0) {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted)">Sin ventas registradas en este periodo.</td></tr>';
        return;
    }

    list.innerHTML = (seller.detailed_sales || []).map(s => {
        const bLabel = s.brand || 'S/M';
        const pLabel = s.product || 'Otros';
        const amt = s.amount || 0;
        const bLower = bLabel.toLowerCase();
        const brandColor = bLower.includes('aires') ? 'var(--primary)' : 
                          bLower.includes('nodor') ? 'var(--warning)' : 
                          bLower.includes('praga') ? 'var(--success)' : 'var(--text-muted)';
        
        return `
            <tr>
                <td><div class="brand-cell"><span class="dot" style="background:${brandColor}"></span> ${bLabel}</div></td>
                <td>${pLabel}</td>
                <td style="font-weight:700; color:#fff">${formatCurrency(amt)}</td>
            </tr>
        `;
    }).join('');
}

function renderSellerMix() {
    let source;
    if (state.currentSellerModule === 'local') {
        source = localState.metrics[localState.activeSegment].sellers;
    } else if (state.currentSellerModule === 'comerciales') {
        source = comercialesState.metrics[comercialesState.activeSegment].sellers;
    } else {
        source = state.sellers;
    }
    const seller = source[state.currentSeller];
    const canvas = document.getElementById('seller-mix-chart');
    if (!seller || !canvas) return;

    if (charts.sellerMix) charts.sellerMix.destroy();

    const brandData = {};
    if (seller.detailed_sales) {
        seller.detailed_sales.forEach(s => {
            brandData[s.brand] = (brandData[s.brand] || 0) + s.amount;
        });
    }

    const labels = Object.keys(brandData);
    const amounts = Object.values(brandData);

    if (labels.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0, canvas.width, canvas.height);
        return;
    }

    charts.sellerMix = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { color: 'rgba(255,255,255,0.7)', padding: 15, font: { size: 12 } } 
                }
            },
            cutout: '65%'
        }
    });
}

/**
 * Historical Archives Rendering
 */
function renderArchivesList() {
    const list = document.getElementById('archives-list');
    if (!list) return;
    
    const keys = Object.keys(state.history).sort((a, b) => b.localeCompare(a));

    if (keys.length === 0) {
        list.className = "dashboard-grid";
        list.innerHTML = `
            <div class="glass" style="padding: 4rem; text-align: center; grid-column: 1/-1;">
                <i data-lucide="archive-x" size="48" style="color:var(--text-muted)"></i>
                <h3 style="margin-top:1.5rem; color:#fff">No hay reportes archivados</h3>
                <p style="color:var(--text-muted); margin-top:0.5rem">Guarda reportes para verlos aquí históricamente.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    list.className = "archives-grid";
    list.innerHTML = keys.map(key => {
        const h = state.history[key];
        const totalSales = Object.values(h.sellers).reduce((acc, s) => acc + s.sales, 0);
        const avgRoas = h.metrics.global.roas || 0;
        const totalLeads = h.metrics.global.leads || 0;
        const totalSpend = h.metrics.global.spend || 0;
        
        return `
            <div class="metric-card glass arch-card animate-slide-up" id="arch-${key.replace(/\s+/g, '-')}">
                <div class="arch-card-header">
                    <div class="arch-card-title">
                        <h3>${key}</h3>
                        <p><i data-lucide="calendar" size="12" style="vertical-align:middle; margin-right:6px; opacity:0.6"></i> ${new Date(h.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center">
                        <button class="info-toggle-btn" onclick="toggleArchInfo('${key.replace(/\s+/g, '-')}')" title="Ver Detalles">
                            <i data-lucide="chevron-down" size="18"></i>
                        </button>
                    </div>
                </div>

                <div class="arch-card-quick-info" id="info-${key.replace(/\s+/g, '-')}">
                    <div class="arch-stats-grid">
                        <div class="mini-stat">
                            <span>Ventas Totales</span>
                            <strong>${totalSales}</strong>
                        </div>
                        <div class="mini-stat">
                            <span>ROAS Global</span>
                            <strong>${avgRoas}x</strong>
                        </div>
                        <div class="mini-stat">
                            <span>Leads Generados</span>
                            <strong>${totalLeads}</strong>
                        </div>
                        <div class="mini-stat">
                            <span>Inversión Total</span>
                            <strong>${formatCurrency(totalSpend)}</strong>
                        </div>
                    </div>
                </div>

                <div class="arch-actions">
                    <button class="restore-btn" onclick="switchPeriod('${key}'); showView('dashboard')">
                        <i data-lucide="refresh-cw" size="14"></i> Restaurar este reporte
                    </button>
                    <button class="delete-btn-arch" onclick="window.deleteReport('${key}')" title="Eliminar Permanente">
                        <i data-lucide="trash-2" size="18"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

/**
 * Toggle Archive Detail Info (v6.6)
 */
window.toggleArchInfo = function(id) {
    const infoSec = document.getElementById(`info-${id}`);
    const btn = document.querySelector(`#arch-${id} .info-toggle-btn`);
    
    if (infoSec) {
        infoSec.classList.toggle('active');
        if (btn) btn.classList.toggle('active');
    }
}

// Deletion logic moved to top of file

/**
 * Charts and Helper UI
 */
function renderCharts() {
    const ctxChannels = document.getElementById('chart-channels').getContext('2d');
    const ctxBrands = document.getElementById('chart-brands').getContext('2d');
    const insightContainer = document.getElementById('meta-strategic-insight');

    // Strategic Insight Hero (Meta Parity)
    if (insightContainer) {
        const roas = state.metrics.global.roas;
        let stratStatus = "neutral", stratTitle = "Análisis Publicitario", stratDesc = "Balance estable en el rendimiento de los canales analizados.";
        if (roas > 10) { stratStatus = "positive"; stratTitle = "Rendimiento de Alta Eficiencia"; stratDesc = "El ROAS global es excepcional. Se recomienda mantener la estrategia actual de inversión."; }
        else if (roas < 3 && state.filesLoaded > 0) { stratStatus = "danger"; stratTitle = "Alerta de Rentabilidad"; stratDesc = "Bajo retorno de inversión detectado. Se recomienda auditar los canales con menor desempeño."; }

        insightContainer.innerHTML = `
            <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
                <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
                <div class="s-content">
                    <h4>${stratTitle}</h4>
                    <p>${stratDesc}</p>
                </div>
            </div>
        `;
    }

    if (charts.channels) charts.channels.destroy();
    if (charts.brands) charts.brands.destroy();
    if (charts.brandsVolume) charts.brandsVolume.destroy();

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

    renderBrandsView();
}

/**
 * Brands Explorer Rendering
 */
function renderBrandsView() {
    const list = document.getElementById('brands-ranking-list');
    const ctx = document.getElementById('chart-brands-volume').getContext('2d');
    
    if (!state.brandVolume || Object.keys(state.brandVolume).length === 0) return;

    // Sort brands by volume
    const sorted = Object.entries(state.brandVolume)
        .sort((a, b) => b[1] - a[1]);

    // Update List
    list.innerHTML = sorted.map(([brand, volume]) => {
        const percentage = ((volume / (state.metrics.global.earnings || 1)) * 100).toFixed(1);
        return `
            <div class="brand-rank-item">
                <span class="rank-name">${brand}</span>
                <span class="rank-pct">${percentage}%</span>
                <span class="rank-val">${formatCurrency(volume)}</span>
            </div>
        `;
    }).join('');

    // renderProductRanking removed as per user request

    // Update Chart
    const top6 = sorted.slice(0, 6);
    const labels = top6.map(x => x[0]);
    const data = top6.map(x => x[1]);

    charts.brandsVolume = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', padding: 20, font: { size: 11 } } }
            },
            cutout: '75%'
        }
    });

    renderBrandsUnits();
}

/**
 * Brands Units Rendering (v3.5)
 */
function renderBrandsUnits() {
    const ctx = document.getElementById('chart-brands-units').getContext('2d');
    if (charts.brandsUnits) charts.brandsUnits.destroy();

    const aggregated = {};
    Object.values(state.brandProducts).forEach(products => {
        Object.entries(products).forEach(([prod, count]) => {
            aggregated[prod] = (aggregated[prod] || 0) + count;
        });
    });

    const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]).slice(0, 8);
    
    charts.brandsUnits = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'Unidades Vendidas',
                data: sorted.map(x => x[1]),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                y: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
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

// Consolidated showView already exists at line 83, removing duplication

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
                leads: 145, sales: 22, amount: 30800000, 
                lost_leads: [],
                loss_reasons: { "Precio o cuotas": 12, "Falta de stock": 5, "Competencia": 3 },
                comments: [{ text: "Venta Mayorista (USD)", date: "05/02/2026" }],
                detailed_sales: [
                    { brand: "Samsung", product: "Split Inverter 3000", amount: 1200000 },
                    { brand: "LG", product: "Dual Inverter 4500", amount: 1800000 },
                    { brand: "BGH", product: "Silent Air 2300", amount: 900000 }
                ]
            },
            "Germán Ariel Polito": { 
                leads: 230, sales: 18, amount: 8200000,
                lost_leads: [],
                loss_reasons: { "Precio o cuotas": 8, "No responde": 15 },
                comments: [{ text: "Cerró obra VRF en Rosario", date: "02/02/2026" }],
                detailed_sales: [
                    { brand: "Midea", product: "VRF Core", amount: 4500000 },
                    { brand: "Whirlpool", product: "Heladera No Frost", amount: 2200000 }
                ]
            }
        };

        state.metrics = {
            aires: { spend: 1200000, earnings: 8500000, leads: 450, roas: 7.08 },
            nodor: { spend: 550000, earnings: 30800000, leads: 360, roas: 56 },
            praga: { spend: 280000, earnings: 13460000, leads: 28, roas: 48.07 },
            global: { spend: 2030000, earnings: 52760000, leads: 838, roas: 25.99 }
        };

        state.brandVolume = {
            "Samsung": 15000000,
            "LG": 12000000,
            "Whirlpool": 8000000,
            "Midea": 7000000,
            "Nodor": 6000000,
            "BGH": 4760000
        };

        state.filesLoaded = 4;
        document.getElementById('file-count').innerText = "4/4";
        ['aires', 'nodor', 'praga', 'crm'].forEach((s, i) => {
            const card = document.getElementById(`card-${s}`);
            document.getElementById(`st-${s}`).innerHTML = `<i data-lucide="check-circle"></i> Demo OK`;
            card.classList.add('ready', 'animate-slide-up');
            card.style.animationDelay = `${i * 0.1}s`;
        });

        btn.innerHTML = `Demo Activo`;
        btn.disabled = true;
        updateSystem();
        lucide.createIcons();
    }, 1500);
}

/**
 * Export System
 */
/**
 * Comparative Intelligence v4.2
 */
function renderComparisonView() {
    const selectorGrid = document.getElementById('comparison-selector-grid');
    const results = document.getElementById('comparison-results');
    
    if (!selectorGrid) return;

    const keys = Object.keys(state.history).sort((a, b) => b.localeCompare(a));

    if (keys.length < 1) {
        results.innerHTML = `
            <div class="glass" style="grid-column: 1/-1; padding: 4rem; text-align: center;">
                <i data-lucide="info" size="48" style="color:var(--text-muted)"></i>
                <h3 style="margin-top:1.5rem; color:#fff">No hay reportes para comparar</h3>
                <p class="placeholder-text" style="color:var(--text-muted); margin-top:1rem; border:none; background:none">Guarda al menos un reporte primero para iniciar el análisis inteligente.</p>
            </div>
        `;
        selectorGrid.innerHTML = "";
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Render checkbox list with explicit interaction classes
    selectorGrid.innerHTML = keys.map(k => `
        <label class="comp-checkbox-item glass">
            <input type="checkbox" name="comp-period" value="${k}" onchange="this.closest('.comp-checkbox-item').classList.toggle('selected', this.checked)">
            <span>${k}</span>
        </label>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

function runComparison() {
    const btn = document.querySelector('button[onclick="runComparison()"]');
    const selected = Array.from(document.querySelectorAll('input[name="comp-period"]:checked')).map(cb => cb.value);
    const dashboard = document.getElementById('comparison-dashboard');
    const placeholder = document.getElementById('comparison-results-placeholder');
    const financialResults = document.getElementById('comp-results-financial');
    const efficiencyResults = document.getElementById('comp-results-efficiency');
    const insightContainer = document.getElementById('comparison-strategic-insight');

    if (selected.length < 2) {
        alert("Selecciona al menos 2 meses para comparar.");
        return;
    }

    const originalBtn = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Generando Inteligencia Pro...`;
    btn.disabled = true;
    lucide.createIcons();

    setTimeout(() => {
        try {
            placeholder.style.display = 'none';
            dashboard.style.display = 'grid';
            const latest = state.history[selected[0]];
            const previous = state.history[selected[1]];
            const getVal = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj) || 0;

            // 1. Strategic Insight Hero
            const roasDelta = latest.metrics.global.roas - previous.metrics.global.roas;
            const revDelta = latest.metrics.global.earnings - previous.metrics.global.earnings;
            let stratStatus = "neutral", stratTitle = "Eficiencia Operativa", stratDesc = "Balance estable entre inversión y retorno en los periodos analizados.";
            
            if (revDelta > 0 && roasDelta > 0) { stratStatus = "positive"; stratTitle = "Crecimiento de Alta Calidad"; stratDesc = "Aumento simultáneo de ingresos y eficiencia publicitaria. Escalamiento virtuoso detectado."; }
            else if (revDelta > 0 && roasDelta < 0) { stratStatus = "warning"; stratTitle = "Expansión por Volumen"; stratDesc = "Crecimiento de ingresos a costa de menor rentabilidad unitaria. Vigilar márgenes."; }
            else if (revDelta < 0) { stratStatus = "danger"; stratTitle = "Contracción Crítica"; stratDesc = "Pérdida de volumen comercial detectada. Se recomienda auditoría inmediata de ROAS por marca."; }

            insightContainer.innerHTML = `
                <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
                    <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
                    <div class="s-content">
                        <h4>${stratTitle}</h4>
                        <p>${stratDesc}</p>
                    </div>
                </div>
            `;

            // 2. Metrics Definition Expansion (V5.0 Deep Intelligence)
            const financialMetrics = [
                { label: 'Facturación Total', p: 'metrics.global.earnings', type: 'currency', icon: 'dollar-sign' },
                { label: 'Inversión Publicitaria', p: 'metrics.global.spend', type: 'currency', icon: 'credit-card' },
                { label: 'Captura de Leads', p: 'metrics.global.leads', type: 'number', icon: 'users' },
                { label: 'Ventas Cerradas', p: 'metrics.global.sales', type: 'number', icon: 'shopping-bag' }
            ];

            const efficiencyMetrics = [
                { label: 'ROAS General', p: 'metrics.global.roas', type: 'number', suffix: 'x', icon: 'zap' },
                { label: 'Tasa de Cierre (CR)', custom: (h) => (h.metrics.global.sales / (h.metrics.global.leads || 1)) * 100, type: 'number', suffix: '%', icon: 'target' },
                { label: 'Ticket Promedio', custom: (h) => h.metrics.global.earnings / (h.metrics.global.sales || 1), type: 'currency', icon: 'ticket' },
                { label: 'Costo por Venta (CPS)', custom: (h) => h.metrics.global.spend / (h.metrics.global.sales || 1), type: 'currency', icon: 'calculator' },
                { label: 'Efficiency Ratio', custom: (h) => h.metrics.global.earnings / (h.metrics.global.spend || 1), type: 'number', suffix: 'x', icon: 'activity' },
                { label: 'ROI Estimado', custom: (h) => ((h.metrics.global.earnings - h.metrics.global.spend) / (h.metrics.global.spend || 1)) * 100, type: 'number', suffix: '%', icon: 'trending-up' }
            ];

            const renderMetricGroup = (target, defs) => {
                target.innerHTML = defs.map(m => `
                    <div class="comp-metric-group glass animate-slide-up">
                        <div class="group-header">
                            <i data-lucide="${m.icon}" size="16"></i>
                            <span>${m.label}</span>
                        </div>
                        <div class="group-values">
                            ${selected.map((k, idx) => {
                                const h = state.history[k];
                                const val = m.custom ? m.custom(h) : getVal(h, m.p);
                                const disp = m.type === 'currency' ? formatCurrency(val) : `${Number(val).toFixed(val % 1 === 0 ? 0 : (val > 100 ? 0 : 2))}${m.suffix || ''}`;
                                
                                let deltaHtml = '';
                                if (idx === 0 && selected.length > 1) {
                                    const prevVal = m.custom ? m.custom(previous) : getVal(previous, m.p);
                                    const delta = prevVal === 0 ? (val > 0 ? 100 : 0) : ((val - prevVal) / prevVal) * 100;
                                    const isPos = delta >= 0;
                                    deltaHtml = `<div class="mini-delta ${isPos ? 'up' : 'down'}">${isPos ? '+' : ''}${delta.toFixed(1)}%</div>`;
                                }

                                return `
                                    <div class="val-pill">
                                        <span class="pill-label">${k}</span>
                                        <span class="pill-val">${disp}</span>
                                        ${deltaHtml}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('');
            };

            renderMetricGroup(financialResults, financialMetrics);
            renderMetricGroup(efficiencyResults, efficiencyMetrics);

            // 3. Visualization Suite (3 Charts)

            // A. Trend Chart (Line)
            const ctxTrend = document.getElementById('chart-comparison-trends').getContext('2d');
            if (charts.comparison) charts.comparison.destroy();
            const chartLabels = [...selected].reverse();
            charts.comparison = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Ingresos Mensuales',
                        data: chartLabels.map(k => state.history[k].metrics.global.earnings),
                        borderColor: '#6366f1', borderWidth: 4, pointRadius: 6, tension: 0.4, fill: true,
                        backgroundColor: 'rgba(99, 102, 241, 0.1)'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: '#94a3b8', callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#fff' } }
                    }
                }
            });

            // B. Performance Chart (Bar)
            const ctxBars = document.getElementById('chart-comparison-bars').getContext('2d');
            if (charts.compBars) charts.compBars.destroy();
            charts.compBars = new Chart(ctxBars, {
                type: 'bar',
                data: {
                    labels: ['Leads', 'Ventas', 'ROAS (x10)'],
                    datasets: selected.map((k, idx) => ({
                        label: k,
                        data: [
                            state.history[k].metrics.global.leads,
                            state.history[k].metrics.global.sales,
                            state.history[k].metrics.global.roas * 10 
                        ],
                        backgroundColor: idx === 0 ? '#818cf8' : 'rgba(255,255,255,0.1)',
                        borderRadius: 8
                    }))
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#fff' } } },
                    scales: {
                        y: { display: false },
                        x: { ticks: { color: '#fff' } }
                    }
                }
            });

            // C. Balance Chart (Radar)
            const ctxRadar = document.getElementById('chart-comparison-balance').getContext('2d');
            if (charts.compBalance) charts.compBalance.destroy();
            
            const getNormalized = (k, type) => {
                const h = state.history[k];
                if (type === 'roas') return Math.min((h.metrics.global.roas / 20) * 100, 100);
                if (type === 'cr') return Math.min(((h.metrics.global.sales / (h.metrics.global.leads || 1)) / 0.1) * 100, 100);
                if (type === 'ticket') return Math.min(((h.metrics.global.earnings / (h.metrics.global.sales || 1)) / 1000) * 100, 100);
                if (type === 'leads') return Math.min((h.metrics.global.leads / 2000) * 100, 100);
                if (type === 'roi') return Math.min((((h.metrics.global.earnings - h.metrics.global.spend) / (h.metrics.global.spend || 1)) / 10) * 100, 100);
            };

            charts.compBalance = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['ROAS', 'Conversión', 'Ticket Prom', 'Volumen Leads', 'ROI Est'],
                    datasets: selected.map((k, idx) => ({
                        label: k,
                        data: [
                            getNormalized(k, 'roas'), getNormalized(k, 'cr'), getNormalized(k, 'ticket'),
                            getNormalized(k, 'leads'), getNormalized(k, 'roi')
                        ],
                        borderColor: idx === 0 ? '#10b981' : '#f59e0b',
                        backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        borderWidth: 3, pointRadius: 4
                    }))
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { color: '#fff', font: { size: 10 } },
                            ticks: { display: false },
                            suggestedMin: 0, suggestedMax: 100
                        }
                    },
                    plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } }
                }
            });

            if (window.lucide) lucide.createIcons();
        } catch (e) {
            console.error("Comparison Error:", e);
        } finally {
            btn.innerHTML = originalBtn;
            btn.disabled = false;
            lucide.createIcons();
        }
    }, 800);
}

function exportToExcel() {
    if (state.filesLoaded === 0) {
        alert("Primero carga los datos para exportar.");
        return;
    }

    const brands = [
        { key: 'aires', name: 'Aires Acondicionados' },
        { key: 'nodor', name: 'Nodor Argentina' },
        { key: 'praga', name: 'Praga Inmuebles' }
    ];

    const matrixData = brands.map(b => {
        const m = state.metrics[b.key];
        return {
            "Identidad de Marca": b.name,
            "Inversión Real": m.spend,
            "Ventas Atribuidas": m.earnings,
            "Conversiones Meta (Leads)": m.leads,
            "ROAS Final": `${m.roas}x`
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, ws, "Matriz de Eficiencia");
    
    XLSX.writeFile(wb, `Nexus_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportLocalToExcel() {
    if (localState.crm.length === 0) { alert("No hay datos de salón para exportar."); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(localState.crm.slice(0, 5000));
    XLSX.utils.book_append_sheet(wb, ws, "CRM Salón");
    XLSX.writeFile(wb, `Rexus_Local_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportComercialesToExcel() {
    if (comercialesState.crm.length === 0) { alert("No hay datos comerciales para exportar."); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(comercialesState.crm.slice(0, 5000));
    XLSX.utils.book_append_sheet(wb, ws, "CRM Comerciales");
    XLSX.writeFile(wb, `Rexus_Comerciales_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Comerciales Analytics (v7.0)
 */
function showComercialesView(viewId) {
    document.querySelectorAll('#module-comerciales .view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#module-comerciales .tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`comerciales-view-${viewId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('#module-comerciales .tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${viewId}'`)) btn.classList.add('active');
    });

    if (viewId === 'dashboard') renderComercialesDashboard();
    if (viewId === 'vendedores') renderComercialesSellers();
    if (viewId === 'productos') renderComercialesProducts();
    if (viewId === 'guardados') renderComercialesArchivesList();

    if (window.lucide) lucide.createIcons();
}

async function handleComercialesFile(file) {
    if (!file) return;
    const statusEl = document.getElementById('st-comerciales-crm');
    statusEl.innerText = "Filtrando Prospectos...";
    
    try {
        const data = await parseXLSX(file);
        
        // Dynamic Filter: unicamente Cliente propio, Clima Norte, Referido
        comercialesState.crm = data.filter(row => {
            const canal = String(row['Canal'] || '').toLowerCase();
            return canal.includes('cliente propio') || canal.includes('clima norte') || canal.includes('referido');
        });

        processComercialesData();
        statusEl.innerHTML = `<i data-lucide="check-circle"></i> ${comercialesState.crm.length} registros comerciales`;
        statusEl.style.color = 'var(--success)';
        
        renderComercialesDashboard();
        comercialesState.filesLoaded = 1;
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error("Comerciales Module Error:", e);
        statusEl.innerHTML = `<i data-lucide="alert-circle"></i> Error en Datos`;
    }
}

function processComercialesData() {
    const initObj = () => ({ leads: 0, sales: 0, earnings: 0, sellers: {}, brands: {}, products: {}, loss_reasons: {} });
    
    comercialesState.metrics = {
        totales: initObj(),
        propio: initObj(),
        referido: initObj(),
        clima: initObj()
    };
    
    comercialesState.crm.forEach(row => {
        const canal = String(row['Canal'] || '').toLowerCase();
        const segments = ['totales'];
        if (canal.includes('propio')) segments.push('propio');
        if (canal.includes('referido')) segments.push('referido');
        if (canal.includes('clima')) segments.push('clima');

        const status = row['Estado'] || '';
        const isSale = (status === 'Vendido' || status === 'Finalizado');
        const monto = parseMoney(row['Monto_Total']);
        const seller = row['Comercial'] || 'Sin Asignar';
        const brand = String(row['Marca'] || 'S/M');
        const product = String(row['Tipo_Producto'] || 'Otros');
        const loss_reason = row['Motivo de perdida'] || row['Motivo de pérdida'] || '';

        segments.forEach(seg => {
            const m = comercialesState.metrics[seg];
            if (!m) return;
            m.leads++;
            if (isSale) {
                m.sales++;
                m.earnings += monto;
                m.brands[brand] = (m.brands[brand] || 0) + monto;
                m.products[product] = (m.products[product] || 0) + 1;
            } else if (loss_reason) {
                m.loss_reasons[loss_reason] = (m.loss_reasons[loss_reason] || 0) + 1;
            }

            if (!m.sellers[seller]) {
                m.sellers[seller] = { leads: 0, sales: 0, amount: 0, lost_leads: [], comments: [], detailed_sales: [], loss_reasons: {} };
            }
            m.sellers[seller].leads++;
            if (isSale) {
                m.sellers[seller].sales++;
                m.sellers[seller].amount += monto;
                m.sellers[seller].detailed_sales.push({ brand, product, amount: monto });
            } else if (loss_reason) {
                m.sellers[seller].loss_reasons[loss_reason] = (m.sellers[seller].loss_reasons[loss_reason] || 0) + 1;
            }
        });
    });
}

window.switchComercialesSegment = function(seg) {
    comercialesState.activeSegment = seg;
    const activeTab = document.querySelector('#module-comerciales .tab-btn.active');
    const onclick = activeTab ? activeTab.getAttribute('onclick') : '';
    
    if (onclick.includes('dashboard')) renderComercialesDashboard();
    if (onclick.includes('vendedores')) renderComercialesSellers();
    if (onclick.includes('productos')) renderComercialesProducts();
    
    if (window.lucide) lucide.createIcons();
};

function getComercialesSegmentSwitcher() {
    return `
        <div class="segment-switcher glass" style="margin-bottom: 2rem;">
            <button class="seg-btn ${comercialesState.activeSegment === 'totales' ? 'active' : ''}" onclick="switchComercialesSegment('totales')">Totales</button>
            <button class="seg-btn ${comercialesState.activeSegment === 'propio' ? 'active' : ''}" onclick="switchComercialesSegment('propio')">Cliente Propio</button>
            <button class="seg-btn ${comercialesState.activeSegment === 'referido' ? 'active' : ''}" onclick="switchComercialesSegment('referido')">Referidos</button>
            <button class="seg-btn ${comercialesState.activeSegment === 'clima' ? 'active' : ''}" onclick="switchComercialesSegment('clima')">Clima Norte</button>
        </div>
    `;
}

function renderComercialesDashboard() {
    const kpiContainer = document.getElementById('comerciales-kpi-grid');
    const insightContainer = document.getElementById('comerciales-strategic-insight');
    const insightText = document.getElementById('comerciales-insight-text');
    const analystContent = document.getElementById('comerciales-analyst-content');
    
    if (!kpiContainer) return;

    const m = comercialesState.metrics[comercialesState.activeSegment];
    const cr = ((m.sales / (m.leads || 1)) * 100).toFixed(1);

    // 1. Hero & Switcher update
    let stratStatus = "neutral", stratTitle = "Inteligencia Comercial Iniciada", stratDesc = `Analizando gestión para el segmento ${comercialesState.activeSegment.toUpperCase()}.`;
    
    if (m.leads > 0) {
        if (parseFloat(cr) > 10) { stratStatus = "positive"; stratTitle = "Gestión Altamente Efectiva"; stratDesc = "Los prospectos externos están convirtiendo por encima del promedio regional."; }
        else if (parseFloat(cr) < 3 && m.leads > 30) { stratStatus = "danger"; stratTitle = "Alerta de Conversión"; stratDesc = "Se detecta un volumen alto de leads con bajo cierre. Revisar seguimiento comercial."; }
    }

    insightContainer.innerHTML = `
        ${getComercialesSegmentSwitcher()}
        <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
            <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
            <div class="s-content">
                <h4>${stratTitle}</h4>
                <p>${stratDesc}</p>
            </div>
        </div>
    `;

    // 2. Executive Insight & AI Situation Room
    if (m.leads > 0) {
        insightText.innerHTML = `El segmento <strong>${comercialesState.activeSegment.toUpperCase()}</strong> presenta una facturación acumulada de ${formatCurrency(m.earnings)}. El ratio de conversión actual es del <strong>${cr}%</strong>.`;
        
        analystContent.innerHTML = `
            <div class="analyst-bubble">
                <i data-lucide="cpu"></i>
                <p>Se recomienda priorizar los canales de <strong>${comercialesState.activeSegment === 'totales' ? 'Referidos' : comercialesState.activeSegment}</strong> para maximizar el retorno sobre gestión comercial.</p>
            </div>
        `;
    }

    // 3. KPI Grid
    kpiContainer.innerHTML = `
        <div class="metric-card glass animate-slide-up" style="border-left: 4px solid var(--module-color)">
            <label>Prospectos (${comercialesState.activeSegment})</label>
            <h3>${m.leads}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.1s; border-left: 4px solid var(--success)">
            <label>Ventas Cerradas</label>
            <h3>${m.sales}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.2s; border-left: 4px solid var(--module-color)">
            <label>Facturación Externa</label>
            <h3>${formatCurrency(m.earnings)}</h3>
        </div>
        <div class="metric-card glass animate-slide-up" style="animation-delay: 0.3s; border-left: 4px solid var(--warning)">
            <label>Ratio de Cierre</label>
            <h3>${cr}%</h3>
        </div>
    `;

    renderComercialesBrands();
    if (window.lucide) lucide.createIcons();
}

function renderComercialesBrands() {
    const list = document.getElementById('comerciales-brands-ranking-list');
    const ctx = document.getElementById('chart-comerciales-brands').getContext('2d');
    if (!list || !ctx) return;
    
    const m = comercialesState.metrics[comercialesState.activeSegment];
    const sorted = Object.entries(m.brands).sort((a,b) => b[1] - a[1]);
    
    list.innerHTML = sorted.map(([name, val], idx) => `
        <div class="brand-rank-item animate-slide-up" style="animation-delay: ${idx * 0.1}s">
            <span class="rank-name">${name}</span><span class="rank-val">${formatCurrency(val)}</span>
        </div>
    `).join('');

    if (charts.comercialesBrands) charts.comercialesBrands.destroy();
    const top6 = sorted.slice(0, 8);
    charts.comercialesBrands = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top6.map(b => b[0]),
            datasets: [{
                label: 'Volumen Externo ($)',
                data: top6.map(b => b[1]),
                backgroundColor: 'rgba(245, 158, 11, 0.4)',
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderRadius: 12
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                y: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderComercialesSellers() {
    const container = document.getElementById('comerciales-sellers-container');
    if (!container) return;

    const m = comercialesState.metrics[comercialesState.activeSegment];
    const sorted = Object.entries(m.sellers).sort((a,b) => b[1].amount - a[1].amount);
    
    container.innerHTML = `
        ${getComercialesSegmentSwitcher()}
        <h2 class="section-title"><i data-lucide="users"></i> Ranking de Vendedores</h2>
        <div class="dashboard-grid">
            ${sorted.map(([name, s], idx) => `
                <div class="seller-card glass animate-slide-up" style="animation-delay: ${idx * 0.1}s; cursor: pointer;"
                     onclick="showSellerDetail('${name.replace(/'/g, "\\'")}', 'comerciales')">
                    <div class="seller-header">
                        <div class="avatar-glow">${name.charAt(0)}</div>
                        <div class="seller-info"><strong>${name}</strong><span>Comercial Externo</span></div>
                    </div>
                    <div class="seller-stats-grid" style="margin-top:1.5rem">
                        <div class="s-stat"><label>Leads</label><strong>${s.leads}</strong></div>
                        <div class="s-stat"><label>Ventas</label><strong>${s.sales}</strong></div>
                        <div class="s-stat"><label>Total</label><strong style="color:var(--success)">${formatCurrency(s.amount)}</strong></div>
                    </div>
                    <div class="card-footer-cta">
                        Ver Inteligencia <i data-lucide="chevron-right" size="14"></i>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderComercialesProducts() {
    const container = document.getElementById('comerciales-products-container');
    if (!container) return;

    const m = comercialesState.metrics[comercialesState.activeSegment];
    const sorted = Object.entries(m.products).sort((a,b) => b[1] - a[1]);
    
    container.innerHTML = `
        ${getComercialesSegmentSwitcher()}
        <h2 class="section-title"><i data-lucide="package"></i> Mix de Productos Comerciales</h2>
        <div class="dashboard-grid">
            ${sorted.map(([name, count], idx) => `
                <div class="metric-card glass animate-slide-up" style="animation-delay: ${idx * 0.05}s">
                    <label>${name}</label>
                    <h3 style="color:var(--accent)">${count} u.</h3>
                </div>
            `).join('')}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function loadComercialesHistory() {
    const saved = localStorage.getItem('rexus_comerciales_history');
    if (saved) comercialesState.history = JSON.parse(saved);
}

function saveComercialesReport() {
    const period = `${document.getElementById('comerciales-select-month').value} ${document.getElementById('comerciales-select-year').value}`;
    if (comercialesState.filesLoaded === 0) { alert("No hay datos comerciales para guardar."); return; }

    comercialesState.history[period] = { metrics: JSON.parse(JSON.stringify(comercialesState.metrics)), timestamp: new Date().toISOString() };
    localStorage.setItem('rexus_comerciales_history', JSON.stringify(comercialesState.history));
    
    alert(`Reporte Comercial (${period}) guardado.`);
    if (document.getElementById('comerciales-view-guardados').classList.contains('active')) renderComercialesArchivesList();
}

function showComercialesView(viewId) {
    document.querySelectorAll('#module-comerciales .view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#module-comerciales .tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`comerciales-view-${viewId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('#module-comerciales .tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${viewId}'`)) btn.classList.add('active');
    });

    if (viewId === 'dashboard') renderComercialesDashboard();
    if (viewId === 'vendedores') renderComercialesSellers();
    if (viewId === 'productos') renderComercialesProducts();
    if (viewId === 'guardados') {
        renderComercialesArchivesList();
        showComercialesGuardadosSubView('history');
    }

    if (window.lucide) lucide.createIcons();
}

function showComercialesGuardadosSubView(subId) {
    document.querySelectorAll('#module-comerciales .comerciales-subview').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#module-comerciales .sub-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(`comerciales-subview-${subId}`);
    if (target) {
        target.classList.add('active');
        document.querySelectorAll('#module-comerciales .sub-tab').forEach(t => {
            if (t.getAttribute('onclick').includes(`'${subId}'`)) t.classList.add('active');
        });
    }

    if (subId === 'history') renderComercialesArchivesList();
    if (subId === 'comparison') renderComercialesComparisonView();
    
    if (window.lucide) lucide.createIcons();
}

function renderComercialesArchivesList() {
    const list = document.getElementById('comerciales-archives-list');
    if (!list) return;
    const keys = Object.keys(comercialesState.history).sort((a, b) => b.localeCompare(a));

    if (keys.length === 0) {
        list.className = "dashboard-grid";
        list.innerHTML = `
            <div class="glass" style="padding: 4rem; text-align: center; grid-column: 1/-1;">
                <i data-lucide="archive-x" size="48" style="color:var(--text-muted)"></i>
                <h3 style="margin-top:1.5rem; color:#fff">No hay reportes comerciales archivados</h3>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    list.className = "archives-grid";
    list.innerHTML = keys.map(key => {
        const h = comercialesState.history[key];
        return `
            <div class="metric-card glass arch-card animate-slide-up" id="com-arch-${key.replace(/\s+/g, '-')}">
                <div class="arch-card-header">
                    <div class="arch-card-title">
                        <h3>${key}</h3>
                        <p><i data-lucide="calendar" size="12" style="vertical-align:middle; margin-right:6px; opacity:0.6"></i> ${new Date(h.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center">
                        <button class="info-toggle-btn" onclick="toggleComercialesArchInfo('${key.replace(/\s+/g, '-')}')" title="Ver Detalles">
                            <i data-lucide="chevron-down" size="18"></i>
                        </button>
                    </div>
                </div>

                <div class="arch-card-quick-info" id="com-info-${key.replace(/\s+/g, '-')}">
                    <div class="arch-stats-grid">
                        <div class="mini-stat"><span>Leads Externos</span><strong>${h.metrics.totales.leads}</strong></div>
                        <div class="mini-stat"><span>Ventas Totales</span><strong>${h.metrics.totales.sales}</strong></div>
                        <div class="mini-stat"><span>Facturación</span><strong>${formatCurrency(h.metrics.totales.earnings)}</strong></div>
                        <div class="mini-stat"><span>Ratio Cierre</span><strong>${((h.metrics.totales.sales / (h.metrics.totales.leads || 1)) * 100).toFixed(1)}%</strong></div>
                    </div>
                </div>

                <div class="arch-actions">
                    <button class="restore-btn" onclick="switchComercialesPeriod('${key}'); showComercialesView('dashboard')">
                        <i data-lucide="refresh-cw" size="14"></i> Restaurar este reporte
                    </button>
                    <button class="delete-btn-arch" onclick="window.deleteComercialesReport('${key}')" title="Eliminar Permanente">
                        <i data-lucide="trash-2" size="18"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

window.toggleComercialesArchInfo = function(id) {
    const infoSec = document.getElementById(`com-info-${id}`);
    const btn = document.querySelector(`#com-arch-${id} .info-toggle-btn`);
    if (infoSec) {
        infoSec.classList.toggle('active');
        if (btn) btn.classList.toggle('active');
    }
}

window.switchComercialesPeriod = function(period) {
    if (comercialesState.history[period]) {
        comercialesState.metrics = JSON.parse(JSON.stringify(comercialesState.history[period].metrics));
        comercialesState.filesLoaded = 1;
        
        // Refresh active view (v8.3)
        const activeTab = document.querySelector('#module-comerciales .tab-btn.active');
        const onclick = activeTab ? activeTab.getAttribute('onclick') : '';
        if (onclick.includes('dashboard')) renderComercialesDashboard();
        if (onclick.includes('vendedores')) renderComercialesSellers();
        if (onclick.includes('productos')) renderComercialesProducts();

        const [m, y] = period.split(' ');
        const selM = document.getElementById('comerciales-select-month');
        const selY = document.getElementById('comerciales-select-year');
        if (selM) selM.value = m;
        if (selY) selY.value = y;
        renderComercialesDashboard();
        alert(`Cargando reporte histórico Comercial: ${period}`);
    }
}

window.deleteComercialesReport = function(key) {
    if (window.confirm(`¿Eliminar reporte Comercial de ${key}?`)) {
        if (comercialesState.history[key]) {
            delete comercialesState.history[key];
            localStorage.setItem('rexus_comerciales_history', JSON.stringify(comercialesState.history));
            renderComercialesArchivesList();
        }
    }
}
function renderComercialesComparisonView() {
    const grid = document.getElementById('comerciales-comparison-selector-grid');
    if (!grid) return;
    const keys = Object.keys(comercialesState.history).sort((a, b) => b.localeCompare(a));
    if (keys.length < 1) {
        grid.innerHTML = `<div class="glass" style="grid-column: 1/-1; padding: 2rem; color:var(--text-muted)">Guarda al menos un reporte para comparar.</div>`;
        return;
    }
    grid.innerHTML = keys.map(key => `
        <label class="comp-checkbox-item glass">
            <input type="checkbox" name="comp-comerciales-period" value="${key}" onchange="this.closest('.comp-checkbox-item').classList.toggle('selected', this.checked)">
            <span>${key}</span>
        </label>
    `).join('');
}

function runComercialesComparison() {
    const btn = document.querySelector('#comerciales-subview-comparison .save-btn');
    const selected = Array.from(document.querySelectorAll('input[name="comp-comerciales-period"]:checked')).map(cb => cb.value);
    const dashboard = document.getElementById('comerciales-comparison-dashboard');
    const placeholder = document.getElementById('comerciales-comparison-results-placeholder');
    const financialResults = document.getElementById('comerciales-comp-results-financial');
    const efficiencyResults = document.getElementById('comerciales-comp-results-efficiency');
    const insightContainer = document.getElementById('comerciales-comparison-strategic-insight');

    if (selected.length < 2) { alert("Selecciona al menos 2 meses."); return; }

    const originalBtn = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Generando Inteligencia Comercial...`;
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        try {
            placeholder.style.display = 'none';
            dashboard.style.display = 'grid';
            const latest = comercialesState.history[selected[0]];
            const previous = comercialesState.history[selected[1]];

            const revDelta = latest.metrics.totales.earnings - previous.metrics.totales.earnings;
            const salesDelta = latest.metrics.totales.sales - previous.metrics.totales.sales;
            let stratStatus = "neutral", stratTitle = "Análisis Comercial Externo", stratDesc = "Balance operativo estable en la gestión comercial externa.";
            if (revDelta > 0 && salesDelta >= 0) { stratStatus = "positive"; stratTitle = "Crecimiento Comercial"; stratDesc = "Aumento de facturación con flujo de ventas saludable. Excelente prospección."; }
            else if (revDelta < 0) { stratStatus = "danger"; stratTitle = "Caída en Conversión"; stratDesc = "Se detecta una contracción en el mercado externo. Revisar ratio de cierre y leads."; }

            insightContainer.innerHTML = `
                <div class="strategic-insight-hero glass status-${stratStatus} animate-slide-up">
                    <div class="s-icon"><i data-lucide="${stratStatus === 'positive' ? 'trending-up' : (stratStatus === 'danger' ? 'alert-triangle' : 'activity')}"></i></div>
                    <div class="s-content">
                        <h4>${stratTitle}</h4>
                        <p>${stratDesc}</p>
                    </div>
                </div>
            `;

            const getHVal = (h, p) => p.split('.').reduce((acc, part) => acc && acc[part], h) || 0;
            const financialMetrics = [
                { label: 'Leads Externos', p: 'metrics.totales.leads', type: 'number', icon: 'users' },
                { label: 'Ventas Comerciales', p: 'metrics.totales.sales', type: 'number', icon: 'shopping-bag' },
                { label: 'Facturación', p: 'metrics.totales.earnings', type: 'currency', icon: 'dollar-sign' }
            ];

            financialResults.innerHTML = financialMetrics.map(m => {
                const val = getHVal(latest, m.p);
                const prevVal = getHVal(previous, m.p);
                const delta = prevVal === 0 ? (val > 0 ? 100 : 0) : ((val - prevVal) / prevVal) * 100;
                return `
                    <div class="comp-metric-group glass animate-slide-up">
                        <div class="group-header"><i data-lucide="${m.icon}" size="16"></i> <span>${m.label}</span></div>
                        <div class="group-values">
                            <div class="val-pill"><span class="pill-label">${selected[1]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(prevVal) : prevVal}</span></div>
                            <div class="val-pill"><span class="pill-label">${selected[0]}</span><span class="pill-val">${m.type === 'currency' ? formatCurrency(val) : val}</span><div class="mini-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div></div>
                        </div>
                    </div>
                `;
            }).join('');

            efficiencyResults.innerHTML = `
                <div class="comp-metric-group glass animate-slide-up">
                    <div class="group-header"><i data-lucide="target" size="16"></i> <span>Tasa de Conversión</span></div>
                    <div class="group-values">
                        <div class="val-pill">
                            <span class="pill-label">${selected[1]}</span>
                            <span class="pill-val">${((previous.metrics.totales.sales / (previous.metrics.totales.leads || 1)) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="val-pill">
                            <span class="pill-label">${selected[0]}</span>
                            <span class="pill-val">${((latest.metrics.totales.sales / (latest.metrics.totales.leads || 1)) * 100).toFixed(1)}%</span>
                            <div class="mini-delta ${(((latest.metrics.totales.sales / (latest.metrics.totales.leads || 1)) - (previous.metrics.totales.sales / (previous.metrics.totales.leads || 1))) >= 0) ? 'up' : 'down'}">
                                ${((latest.metrics.totales.sales / (latest.metrics.totales.leads || 1)) * 100 - (previous.metrics.totales.sales / (previous.metrics.totales.leads || 1)) * 100).toFixed(1)} pp
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const chartLabels = [...selected].reverse();
            const ctxT = document.getElementById('chart-comerciales-comparison-trends').getContext('2d');
            if (charts.comCompTrend) charts.comCompTrend.destroy();
            charts.comCompTrend = new Chart(ctxT, {
                type: 'line',
                data: { labels: chartLabels, datasets: [{ label: 'Facturación Comercial', data: chartLabels.map(k => comercialesState.history[k].metrics.totales.earnings), borderColor: '#f59e0b', borderWidth: 4, tension: 0.4, fill: true, backgroundColor: 'rgba(245, 158, 11, 0.1)' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#fff' } } } }
            });

            const ctxB = document.getElementById('chart-comerciales-comparison-bars').getContext('2d');
            if (charts.comCompBars) charts.comCompBars.destroy();
            charts.comCompBars = new Chart(ctxB, {
                type: 'bar',
                data: { labels: ['Ventas', 'Leads (x0.1)'], datasets: selected.map((k, idx) => ({ label: k, data: [comercialesState.history[k].metrics.totales.sales, comercialesState.history[k].metrics.totales.leads * 0.1], backgroundColor: idx === 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)', borderRadius: 8 })) },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } }
            });

            const ctxR = document.getElementById('chart-comerciales-comparison-balance').getContext('2d');
            if (charts.comCompRadar) charts.comCompRadar.destroy();
            charts.comCompRadar = new Chart(ctxR, {
                type: 'radar',
                data: { labels: ['Propio', 'Referido', 'Clima', 'Ventas', 'Leads'], datasets: selected.map((k, idx) => ({ label: k, data: [comercialesState.history[k].metrics.propio.leads, comercialesState.history[k].metrics.referido.leads, comercialesState.history[k].metrics.clima.leads, comercialesState.history[k].metrics.totales.sales, comercialesState.history[k].metrics.totales.leads / 10], borderColor: idx === 0 ? '#10b981' : '#f59e0b', borderWidth: 3 })) },
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#fff' }, ticks: { display: false } } } }
            });

            if (window.lucide) lucide.createIcons();
            dashboard.scrollIntoView({ behavior: 'smooth' });
        } catch(e) { console.error(e); } finally { btn.innerHTML = originalBtn; btn.disabled = false; if (window.lucide) lucide.createIcons(); }
    }, 800);
}
