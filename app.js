// CREDENCIALES CONFIGURADAS DE SUPABASE
const supabaseUrl = 'https://cdblyqtxpuxnhwbxykfh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYmx5cXR4cHV4bmh3Ynh5a2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDgxMjksImV4cCI6MjA5OTc4NDEyOX0.XMozUuwLYLz3vB8UokwLNX-E-wJZr4QdVnkcVynvnjk';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedFile = null;
let facturasGlobal = [];
let proveedoresCatalogo = [];
let chartInteractivoInstance = null;

// DICCIONARIO DE IDIOMAS
const i18n = {
  es: {
    tab_dashboard: '📊 Dashboard',
    tab_payments: '💳 Control de Pagos',
    cat_title: 'Catálogo de Proveedores',
    prov_placeholder: 'Nuevo proveedor (Ej: Bimbo)',
    btn_add: 'Agregar',
    chart_title: 'Días de Mayor Gasto',
    opt_current_month: 'Este Mes',
    opt_pick_month: 'Elegir Mes...',
    opt_range: 'Rango de Fechas...',
    opt_year: 'Este Año',
    opt_all: 'Todo el tiempo',
    lbl_select_month: 'Selecciona el Mes:',
    lbl_from: 'Desde:',
    lbl_to: 'Hasta:',
    chart_desc: 'Distribución de compras por día según el periodo seleccionado.',
    analysis_title: 'Análisis por Proveedor',
    opt_select: 'Selecciona...',
    ranking_title: 'Ranking Proveedores',
    register_title: 'Registrar Factura',
    btn_photo: '📸 Foto Factura (OCR)',
    ocr_loading: 'Leyendo datos con OCR...',
    lbl_supplier: 'Proveedor',
    lbl_amount: 'Monto (Q)',
    lbl_date: 'Fecha',
    lbl_status: 'Estado',
    opt_pending: '🔴 Pendiente',
    opt_paid: '🟢 Pagado',
    btn_upload: 'Subir a la nube',
    history_title: 'Historial por Proveedor',
    pending_total_title: 'Total Pendiente de Pago',
    pending_desc: 'Revisa el recibo y presiona el botón verde cuando se haya efectuado la transferencia o pago.',
    unpaid_title: 'Facturas por Liquidar',
    edit_title: 'Editar Factura',
    btn_save_changes: 'Guardar Cambios',
    choose_prov: '-- Elige un Proveedor --',
    btn_pay: '✔ Pagar',
    badge_pending: 'Pendiente',
    badge_paid: 'Pagado',
    no_pending: '🎉 ¡Al día! No hay facturas pendientes de pago.',
    no_data_period: 'Sin datos en este periodo',
    no_records: 'No hay facturas registradas',
    invoices_count: 'Facturas',
    confirm_payment: '¿Confirmas que ya realizaste el pago de Q {amount} a {prov}?',
    security_prompt: 'Seguridad requerida para eliminar factura de {prov} por Q {amount}:\n\nIngresa la contraseña:',
    wrong_pass: 'Contraseña incorrecta. No tienes permisos para borrar esta factura.',
    delete_confirm: '¿Estás 100% seguro de borrar permanentemente esta factura de {prov}?',
    delete_success: 'Factura eliminada con éxito.',
    required_fields: 'Selecciona un proveedor e ingresa monto y fecha',
    uploading: 'Subiendo a la nube...',
    saving: 'Guardando...'
  },
  en: {
    tab_dashboard: '📊 Dashboard',
    tab_payments: '💳 Payments Control',
    cat_title: 'Suppliers Directory',
    prov_placeholder: 'New supplier (e.g. Bimbo)',
    btn_add: 'Add',
    chart_title: 'Highest Spending Days',
    opt_current_month: 'This Month',
    opt_pick_month: 'Pick Month...',
    opt_range: 'Date Range...',
    opt_year: 'This Year',
    opt_all: 'All Time',
    lbl_select_month: 'Select Month:',
    lbl_from: 'From:',
    lbl_to: 'To:',
    chart_desc: 'Daily invoice breakdown for the selected period.',
    analysis_title: 'Supplier Analytics',
    opt_select: 'Select...',
    ranking_title: 'Top Suppliers',
    register_title: 'New Invoice',
    btn_photo: '📸 Invoice Photo (OCR)',
    ocr_loading: 'Scanning invoice with OCR...',
    lbl_supplier: 'Supplier',
    lbl_amount: 'Total (Q)',
    lbl_date: 'Date',
    lbl_status: 'Status',
    opt_pending: '🔴 Unpaid',
    opt_paid: '🟢 Paid',
    btn_upload: 'Upload to Cloud',
    history_title: 'Invoices by Supplier',
    pending_total_title: 'Total Outstanding Balance',
    pending_desc: 'Review receipt details and press the green button once payment is complete.',
    unpaid_title: 'Unpaid Invoices',
    edit_title: 'Edit Invoice',
    btn_save_changes: 'Save Changes',
    choose_prov: '-- Select a Supplier --',
    btn_pay: '✔ Pay',
    badge_pending: 'Unpaid',
    badge_paid: 'Paid',
    no_pending: '🎉 All caught up! No pending invoices.',
    no_data_period: 'No data for this period',
    no_records: 'No invoices recorded',
    invoices_count: 'Invoices',
    confirm_payment: 'Confirm you have paid Q {amount} to {prov}?',
    security_prompt: 'Security clearance required to delete invoice from {prov} for Q {amount}:\n\nEnter password:',
    wrong_pass: 'Incorrect password. Unauthorized action.',
    delete_confirm: 'Are you 100% sure you want to permanently delete this invoice from {prov}?',
    delete_success: 'Invoice deleted successfully.',
    required_fields: 'Please select a supplier and provide amount and date',
    uploading: 'Uploading...',
    saving: 'Saving...'
  }
};

let idiomaActual = localStorage.getItem('app_lang') || 'es';

// Elementos DOM
const selectLang = document.getElementById('select-lang');
const inputFile = document.getElementById('input-file');
const previewImg = document.getElementById('preview-img');
const loader = document.getElementById('loader');
const provSelect = document.getElementById('prov-select');
const montoInput = document.getElementById('monto-input');
const fechaInput = document.getElementById('fecha-input');
const estadoInput = document.getElementById('estado-input');
const btnGuardar = document.getElementById('btn-guardar');
const selectGraficoProv = document.getElementById('select-grafico-prov');

const filtroGrafica = document.getElementById('filtro-grafica');
const contFiltroMes = document.getElementById('contenedor-filtro-mes');
const filtroMesInput = document.getElementById('filtro-mes-input');
const contFiltroRango = document.getElementById('contenedor-filtro-rango');
const filtroFechaDesde = document.getElementById('filtro-fecha-desde');
const filtroFechaHasta = document.getElementById('filtro-fecha-hasta');

const nuevoProvNombre = document.getElementById('nuevo-prov-nombre');
const btnCrearProv = document.getElementById('btn-crear-prov');

const modalVisor = document.getElementById('modal-visor');
const modalEditar = document.getElementById('modal-editar');
const editId = document.getElementById('edit-id');
const editProv = document.getElementById('edit-prov');
const editMonto = document.getElementById('edit-monto');
const editFecha = document.getElementById('edit-fecha');
const editEstado = document.getElementById('edit-estado');
const btnActualizar = document.getElementById('btn-actualizar');

const hoyISO = new Date().toISOString().split('T')[0];
fechaInput.value = hoyISO;
filtroMesInput.value = hoyISO.slice(0, 7);
filtroFechaDesde.value = hoyISO;
filtroFechaHasta.value = hoyISO;

// GESTIÓN DE IDIOMAS
selectLang.value = idiomaActual;
selectLang.addEventListener('change', (e) => {
  idiomaActual = e.target.value;
  localStorage.setItem('app_lang', idiomaActual);
  aplicarTraducciones();
});

function t(key, vars = {}) {
  let str = (i18n[idiomaActual] && i18n[idiomaActual][key]) || i18n['es'][key] || key;
  Object.keys(vars).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
  });
  return str;
}

function aplicarTraducciones() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerText = t(key);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    el.setAttribute('placeholder', t(key));
  });

  document.getElementById('tab-btn-dashboard').innerText = t('tab_dashboard');
  document.getElementById('tab-btn-pagos').innerText = t('tab_payments');

  poblarSelectoresProveedores();
  actualizarGraficas();
  renderHistorialPorProveedor();
  renderControlPagos();
}

// 1. NAVEGACIÓN ENTRE PESTAÑAS
window.cambiarPestana = function(pestana) {
  const vistaDashboard = document.getElementById('vista-dashboard');
  const vistaPagos = document.getElementById('vista-pagos');
  const tabBtnDashboard = document.getElementById('tab-btn-dashboard');
  const tabBtnPagos = document.getElementById('tab-btn-pagos');

  if (pestana === 'dashboard') {
    vistaDashboard.style.display = 'block';
    vistaPagos.style.display = 'none';
    tabBtnDashboard.classList.add('active');
    tabBtnPagos.classList.remove('active');
  } else {
    vistaDashboard.style.display = 'none';
    vistaPagos.style.display = 'block';
    tabBtnDashboard.classList.remove('active');
    tabBtnPagos.classList.add('active');
    renderControlPagos();
  }
};

// 2. CARGAR SELECTORES DE PROVEEDORES
async function cargarProveedores() {
  const { data } = await db.from('proveedores').select('nombre').order('nombre');
  if (data) {
    proveedoresCatalogo = data.map(p => p.nombre.toUpperCase());
    poblarSelectoresProveedores();
  }
}

function poblarSelectoresProveedores() {
  const valActualProv = provSelect.value;
  const valActualEdit = editProv.value;
  const valActualChart = selectGraficoProv.value;

  const placeholder = `<option value="">${t('choose_prov')}</option>`;
  const opciones = proveedoresCatalogo.map(nombre => `<option value="${nombre}">${nombre}</option>`).join('');

  provSelect.innerHTML = placeholder + opciones;
  editProv.innerHTML = placeholder + opciones;
  selectGraficoProv.innerHTML = `<option value="">${t('opt_select')}</option>` + opciones;

  if (valActualProv) provSelect.value = valActualProv;
  if (valActualEdit) editProv.value = valActualEdit;
  if (valActualChart) selectGraficoProv.value = valActualChart;
}

// 3. CREAR PROVEEDOR MANUAL
btnCrearProv.addEventListener('click', async () => {
  const nombre = nuevoProvNombre.value.trim().toUpperCase();
  if (!nombre) return;

  const { error } = await db.from('proveedores').insert([{ nombre }]);
  if (error) {
    alert('Error / Supplier exists');
  } else {
    nuevoProvNombre.value = '';
    await cargarProveedores();
    provSelect.value = nombre;
  }
});

// 4. OCR TESSERACT
inputFile.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;

  const reader = new FileReader();
  reader.onload = async () => {
    previewImg.src = reader.result;
    previewImg.style.display = 'block';

    loader.style.display = 'block';
    try {
      const res = await Tesseract.recognize(reader.result, 'spa');
      const lines = res.data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      const provMatch = proveedoresCatalogo.find(p =>
        lines.some(l => l.toUpperCase().includes(p))
      );

      if (provMatch) provSelect.value = provMatch;

      const montos = [];
      const regex = /(\d+[\.,]\d{2})/;
      lines.forEach(l => {
        const low = l.toLowerCase();
        if (low.includes('total') || low.includes('monto') || low.includes('pagar') || low.includes('amount')) {
          const m = l.match(regex);
          if (m) montos.push(parseFloat(m[0].replace(',', '.')));
        }
      });
      if (montos.length > 0) montoInput.value = Math.max(...montos);
    } catch (_) {
    } finally {
      loader.style.display = 'none';
    }
  };
  reader.readAsDataURL(selectedFile);
});

// 5. SUBIR FACTURA
btnGuardar.addEventListener('click', async () => {
  const prov = provSelect.value;
  const monto = parseFloat(montoInput.value);
  const fecha = fechaInput.value;
  const estado = estadoInput.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert(t('required_fields'));
    return;
  }

  btnGuardar.innerText = t('uploading');
  btnGuardar.disabled = true;

  try {
    let imagenUrl = '';
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop();
      const filePath = `${Date.now()}_factura.${extension}`;

      const { error: uploadError } = await db.storage
        .from('facturas-fotos')
        .upload(filePath, selectedFile);

      if (!uploadError) {
        const { data: publicUrlData } = db.storage
          .from('facturas-fotos')
          .getPublicUrl(filePath);
        imagenUrl = publicUrlData.publicUrl;
      }
    }

    const { error: insertError } = await db.from('facturas').insert([{
      proveedor: prov,
      monto: monto,
      fecha: fecha,
      imagen_url: imagenUrl,
      estado: estado
    }]);

    if (insertError) throw insertError;

    provSelect.value = '';
    montoInput.value = '';
    previewImg.style.display = 'none';
    selectedFile = null;
    cargarFacturas();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btnGuardar.innerText = t('btn_upload');
    btnGuardar.disabled = false;
  }
});

// 6. CARGAR FACTURAS DESDE SUPABASE
async function cargarFacturas() {
  const { data, error } = await db
    .from('facturas')
    .select('*')
    .order('fecha', { ascending: false });

  if (error || !data) return;
  facturasGlobal = data;

  actualizarGraficas();
  renderHistorialPorProveedor();
  renderControlPagos();

  if (selectGraficoProv.value) {
    actualizarGraficoInteractivo(selectGraficoProv.value);
  } else if (proveedoresCatalogo.length > 0) {
    selectGraficoProv.value = proveedoresCatalogo[0];
    actualizarGraficoInteractivo(proveedoresCatalogo[0]);
  }
}

// 7. BANDEJA DE PAGOS
function renderControlPagos() {
  const listaCont = document.getElementById('lista-cobros-pendientes');
  if (!listaCont) return;
  listaCont.innerHTML = '';

  const pendientes = facturasGlobal.filter(f => (f.estado || 'PENDIENTE') === 'PENDIENTE');
  const totalDinero = pendientes.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

  document.getElementById('total-pendiente-dinero').innerText = `Q ${totalDinero.toFixed(2)}`;
  document.getElementById('badge-contador-pendientes').innerText = `${pendientes.length} ${t('invoices_count')}`;

  if (pendientes.length === 0) {
    listaCont.innerHTML = `
      <div style="text-align: center; padding: 24px 10px;">
        <span style="font-size: 32px;">🎉</span>
        <p style="color: #4ade80; font-weight: 700; margin-top: 8px;">${t('no_pending')}</p>
      </div>
    `;
    return;
  }

  pendientes.forEach(f => {
    const item = document.createElement('div');
    item.className = 'factura-subitem';
    item.style.padding = '12px 0';

    const imgHtml = f.imagen_url 
      ? `<img src="${f.imagen_url}" class="thumb-img" onclick="verDetalleFoto('${f.imagen_url}', '${f.proveedor}', '${f.monto}', '${f.fecha}')">`
      : `<div class="thumb-img" style="display:grid;place-items:center;color:var(--text-muted);">🧾</div>`;

    item.innerHTML = `
      ${imgHtml}
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 800; color: #fff;">${f.proveedor}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${f.fecha}</div>
      </div>
      <div style="font-size: 14px; font-weight: 800; color: #f87171; margin-right: 8px;">Q ${parseFloat(f.monto).toFixed(2)}</div>
      <button class="btn-marcar-pagado" onclick="marcarComoPagadoDesdePanel(${f.id}, '${f.proveedor}', ${f.monto})">${t('btn_pay')}</button>
    `;
    listaCont.appendChild(item);
  });
}

window.marcarComoPagadoDesdePanel = async function(id, prov, monto) {
  const confirmar = confirm(t('confirm_payment', { amount: parseFloat(monto).toFixed(2), prov: prov }));
  if (!confirmar) return;

  const { error } = await db.from('facturas').update({ estado: 'PAGADO' }).eq('id', id);
  if (!error) {
    cargarFacturas();
  }
};

// 8. ALTERNAR ESTADO RÁPIDO
async function cambiarEstadoRapido(id, estadoActual) {
  const nuevoEstado = estadoActual === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';
  const { error } = await db.from('facturas').update({ estado: nuevoEstado }).eq('id', id);
  if (!error) cargarFacturas();
}

// 9. GRÁFICAS DE GASTO POR DÍA
function actualizarGraficas() {
  const tipoFiltro = filtroGrafica.value;
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  contFiltroMes.style.display = tipoFiltro === 'elegir_mes' ? 'block' : 'none';
  contFiltroRango.style.display = tipoFiltro === 'rango' ? 'block' : 'none';

  const filtradas = facturasGlobal.filter(f => {
    const fFechaStr = f.fecha;
    const d = new Date(fFechaStr + 'T00:00:00');

    if (tipoFiltro === 'mes_actual') return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    if (tipoFiltro === 'elegir_mes') return fFechaStr.startsWith(filtroMesInput.value);
    if (tipoFiltro === 'rango') {
      const desde = filtroFechaDesde.value;
      const hasta = filtroFechaHasta.value;
      return desde && hasta ? fFechaStr >= desde && fFechaStr <= hasta : true;
    }
    if (tipoFiltro === 'anio') return d.getFullYear() === anioActual;
    return true;
  });

  const diasNom = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gastoDias = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
  const gastoProv = {};
  let total = 0;

  filtradas.forEach(f => {
    const d = new Date(f.fecha + 'T00:00:00');
    const diaClave = diasNom[d.getDay()];
    const montoVal = parseFloat(f.monto);
    gastoDias[diaClave] = (gastoDias[diaClave] || 0) + montoVal;
    gastoProv[f.proveedor] = (gastoProv[f.proveedor] || 0) + montoVal;
    total += montoVal;
  });

  document.getElementById('total-acumulado').innerText = `Q ${total.toFixed(2)}`;

  const maxGasto = Math.max(...Object.values(gastoDias), 1);
  const ordenDias = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartDiasCont = document.getElementById('chart-dias');
  chartDiasCont.innerHTML = '';

  ordenDias.forEach(dia => {
    const monto = gastoDias[dia];
    const pct = (monto / maxGasto) * 100;
    chartDiasCont.innerHTML += `
      <div class="bar-row">
        <span class="bar-label">${dia}</span>
        <div class="bar-container"><div class="bar-fill" style="width: ${pct}%"></div></div>
        <span class="bar-amount">${monto > 0 ? monto.toFixed(0) : '0'}</span>
      </div>
    `;
  });

  const listaProvCont = document.getElementById('lista-proveedores-top');
  listaProvCont.innerHTML = '';
  const provOrdenados = Object.entries(gastoProv).sort((a, b) => b[1] - a[1]);

  if (provOrdenados.length === 0) {
    listaProvCont.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${t('no_data_period')}</p>`;
  } else {
    provOrdenados.slice(0, 5).forEach(([nombre, monto]) => {
      listaProvCont.innerHTML += `
        <div class="bar-row" style="margin-bottom: 8px; cursor: pointer;" onclick="seleccionarProveedorYGraficar('${nombre}')">
          <span style="flex: 1; font-weight: 700; font-size: 14px;">${nombre}</span>
          <span style="font-weight: 800; font-size: 14px;">Q ${monto.toFixed(0)}</span>
        </div>
      `;
    });
  }
}

// 10. GRÁFICO ANIMADO POR PROVEEDOR
function actualizarGraficoInteractivo(nombreProveedor) {
  if (!nombreProveedor) return;

  const facturasProv = facturasGlobal
    .filter(f => f.proveedor === nombreProveedor)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const gastoPorDia = {};
  let acumulado = 0;

  facturasProv.forEach(f => {
    gastoPorDia[f.fecha] = (gastoPorDia[f.fecha] || 0) + parseFloat(f.monto);
    acumulado += parseFloat(f.monto);
  });

  document.getElementById('total-proveedor-grafico').innerText = `Total ${nombreProveedor}: Q ${acumulado.toFixed(2)}`;

  const etiquetas = Object.keys(gastoPorDia);
  const montos = Object.values(gastoPorDia);

  const ctx = document.getElementById('chartProveedorInteractivo').getContext('2d');

  if (chartInteractivoInstance) chartInteractivoInstance.destroy();

  chartInteractivoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas.length > 0 ? etiquetas : ['-'],
      datasets: [{
        label: 'Gasto (Q)',
        data: montos.length > 0 ? montos : [0],
        backgroundColor: '#f7b731',
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => `Q ${c.parsed.y.toFixed(2)}` }
        }
      },
      scales: {
        x: { ticks: { color: '#9ba4b0', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#9ba4b0', font: { size: 10 } }, grid: { color: '#2a313a' } }
      }
    }
  });
}

function seleccionarProveedorYGraficar(nombre) {
  selectGraficoProv.value = nombre;
  actualizarGraficoInteractivo(nombre);
}

selectGraficoProv.addEventListener('change', (e) => {
  actualizarGraficoInteractivo(e.target.value);
});

// 11. HISTORIAL AGRUPADO
function renderHistorialPorProveedor() {
  const container = document.getElementById('historial-grupos');
  container.innerHTML = '';

  if (facturasGlobal.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${t('no_records')}</p>`;
    return;
  }

  const grupos = {};
  facturasGlobal.forEach(f => {
    if (!grupos[f.proveedor]) grupos[f.proveedor] = [];
    grupos[f.proveedor].push(f);
  });

  Object.keys(grupos).sort().forEach((prov, idx) => {
    const facturasDelProv = grupos[prov];
    const totalProv = facturasDelProv.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'prov-group';

    const header = document.createElement('div');
    header.className = 'prov-header';
    header.innerHTML = `
      <div>
        <span>${prov}</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:6px;">(${facturasDelProv.length})</span>
      </div>
      <span style="color:var(--accent);">Q ${totalProv.toFixed(2)} ▾</span>
    `;

    const content = document.createElement('div');
    content.className = 'prov-content';
    content.id = `prov-content-${idx}`;

    facturasDelProv.forEach(f => {
      const subItem = document.createElement('div');
      subItem.className = 'factura-subitem';

      const imgHtml = f.imagen_url 
        ? `<img src="${f.imagen_url}" class="thumb-img" onclick="verDetalleFoto('${f.imagen_url}', '${f.proveedor}', '${f.monto}', '${f.fecha}')">`
        : `<div class="thumb-img" style="display:grid;place-items:center;color:var(--text-muted);">🧾</div>`;

      const estadoActual = f.estado || 'PENDIENTE';
      const claseEstado = estadoActual === 'PAGADO' ? 'status-pagado' : 'status-pendiente';
      const textoEstado = estadoActual === 'PAGADO' ? t('badge_paid') : t('badge_pending');

      subItem.innerHTML = `
        ${imgHtml}
        <div style="flex:1;">
          <div style="font-size: 13px; font-weight: 700;">Q ${parseFloat(f.monto).toFixed(2)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${f.fecha}</div>
        </div>
        <span class="badge-status ${claseEstado}" onclick="cambiarEstadoRapido(${f.id}, '${estadoActual}')">${textoEstado}</span>
        <button class="btn-edit" onclick="abrirEditar(${f.id}, '${f.proveedor}', ${f.monto}, '${f.fecha}', '${estadoActual}')">✏️</button>
        <button class="btn-delete" onclick="eliminarFacturaSegura(${f.id}, '${f.proveedor}', ${f.monto})">🗑️</button>
      `;
      content.appendChild(subItem);
    });

    header.onclick = (e) => {
      if (e.target.closest('.badge-status') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete')) return;
      const isVisible = content.style.display === 'block';
      content.style.display = isVisible ? 'none' : 'block';
      header.querySelector('span:last-child').innerHTML = `Q ${totalProv.toFixed(2)} ${isVisible ? '▾' : '▴'}`;
      seleccionarProveedorYGraficar(prov);
    };

    groupDiv.appendChild(header);
    groupDiv.appendChild(content);
    container.appendChild(groupDiv);
  });
}

// 12. BORRADO CON CLAVE
async function eliminarFacturaSegura(id, prov, monto) {
  const claveIngresada = prompt(t('security_prompt', { prov: prov, amount: parseFloat(monto).toFixed(2) }));
  if (claveIngresada === null) return;

  if (claveIngresada !== 'Lura2026.') {
    alert(t('wrong_pass'));
    return;
  }

  const confirmar = confirm(t('delete_confirm', { prov: prov }));
  if (!confirmar) return;

  try {
    const { error } = await db.from('facturas').delete().eq('id', id);
    if (error) throw error;

    alert(t('delete_success'));
    cargarFacturas();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// 13. MODAL EDITAR
function abrirEditar(id, prov, monto, fecha, estado) {
  editId.value = id;
  editProv.value = prov;
  editMonto.value = monto;
  editFecha.value = fecha;
  editEstado.value = estado || 'PENDIENTE';
  modalEditar.style.display = 'flex';
}

btnActualizar.addEventListener('click', async () => {
  const id = editId.value;
  const prov = editProv.value;
  const monto = parseFloat(editMonto.value);
  const fecha = editFecha.value;
  const estado = editEstado.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert(t('required_fields'));
    return;
  }

  btnActualizar.innerText = t('saving');
  btnActualizar.disabled = true;

  try {
    const { error } = await db
      .from('facturas')
      .update({ proveedor: prov, monto: monto, fecha: fecha, estado: estado })
      .eq('id', id);

    if (error) throw error;

    modalEditar.style.display = 'none';
    cargarFacturas();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btnActualizar.innerText = t('btn_save_changes');
    btnActualizar.disabled = false;
  }
});

// MODAL FOTO
function verDetalleFoto(url, prov, monto, fecha) {
  document.getElementById('modal-img').src = url;
  document.getElementById('modal-text').innerText = `${prov} — Q ${parseFloat(monto).toFixed(2)} (${fecha})`;
  modalVisor.style.display = 'flex';
}

document.getElementById('btn-cerrar-modal').onclick = () => {
  modalVisor.style.display = 'none';
  document.getElementById('modal-img').src = '';
};

document.getElementById('btn-cerrar-editar').onclick = () => {
  modalEditar.style.display = 'none';
};

// Eventos de filtros
filtroGrafica.addEventListener('change', actualizarGraficas);
filtroMesInput.addEventListener('change', actualizarGraficas);
filtroFechaDesde.addEventListener('change', actualizarGraficas);
filtroFechaHasta.addEventListener('change', actualizarGraficas);

// Inicializar
cargarProveedores().then(() => {
  aplicarTraducciones();
  cargarFacturas();
});