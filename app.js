const supabaseUrl = 'https://cdblyqtxpuxnhwbxykfh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYmx5cXR4cHV4bmh3Ynh5a2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDgxMjksImV4cCI6MjA5OTc4NDEyOX0.XMozUuwLYLz3vB8UokwLNX-E-wJZr4QdVnkcVynvnjk';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedFile = null;
let facturasGlobal = [];
let proveedoresCatalogo = [];
let chartInteractivoInstance = null;

// Elementos DOM
const inputFile = document.getElementById('input-file');
const previewImg = document.getElementById('preview-img');
const loader = document.getElementById('loader');
const provSelect = document.getElementById('prov-select');
const montoInput = document.getElementById('monto-input');
const fechaInput = document.getElementById('fecha-input');
const estadoInput = document.getElementById('estado-input');
const btnGuardar = document.getElementById('btn-guardar');
const selectGraficoProv = document.getElementById('select-grafico-prov');

// Filtros de fecha
const filtroGrafica = document.getElementById('filtro-grafica');
const contFiltroMes = document.getElementById('contenedor-filtro-mes');
const filtroMesInput = document.getElementById('filtro-mes-input');
const contFiltroRango = document.getElementById('contenedor-filtro-rango');
const filtroFechaDesde = document.getElementById('filtro-fecha-desde');
const filtroFechaHasta = document.getElementById('filtro-fecha-hasta');

// Proveedor manual
const nuevoProvNombre = document.getElementById('nuevo-prov-nombre');
const btnCrearProv = document.getElementById('btn-crear-prov');

// Modales
const modalVisor = document.getElementById('modal-visor');
const modalEditar = document.getElementById('modal-editar');
const editId = document.getElementById('edit-id');
const editProv = document.getElementById('edit-prov');
const editMonto = document.getElementById('edit-monto');
const editFecha = document.getElementById('edit-fecha');
const editEstado = document.getElementById('edit-estado');
const btnActualizar = document.getElementById('btn-actualizar');

// Inicializar fechas
const hoyISO = new Date().toISOString().split('T')[0];
fechaInput.value = hoyISO;
filtroMesInput.value = hoyISO.slice(0, 7);
filtroFechaDesde.value = hoyISO;
filtroFechaHasta.value = hoyISO;

// 1. CARGAR Y POBLAR SELECTORES DE PROVEEDORES
async function cargarProveedores() {
  const { data } = await db.from('proveedores').select('nombre').order('nombre');
  if (data) {
    proveedoresCatalogo = data.map(p => p.nombre.toUpperCase());
    poblarSelectoresProveedores();
  }
}

function poblarSelectoresProveedores() {
  const opcionesHTML = ['<option value="">-- Elige un Proveedor --</option>']
    .concat(proveedoresCatalogo.map(nombre => `<option value="${nombre}">${nombre}</option>`))
    .join('');

  provSelect.innerHTML = opcionesHTML;
  editProv.innerHTML = opcionesHTML;

  // Selector del gráfico interactivo
  selectGraficoProv.innerHTML = ['<option value="">Selecciona Proveedor...</option>']
    .concat(proveedoresCatalogo.map(nombre => `<option value="${nombre}">${nombre}</option>`))
    .join('');
}

// 2. CREAR PROVEEDOR MANUAL
btnCrearProv.addEventListener('click', async () => {
  const nombre = nuevoProvNombre.value.trim().toUpperCase();
  if (!nombre) return;

  const { error } = await db.from('proveedores').insert([{ nombre }]);
  if (error) {
    alert('El proveedor ya existe o hubo un error');
  } else {
    nuevoProvNombre.value = '';
    await cargarProveedores();
    provSelect.value = nombre;
  }
});

// 3. OCR TESSERACT CON ASIGNACIÓN DIRECTA AL DESPLEGABLE
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

      // Comparar contra los proveedores existentes en el catálogo
      const provMatch = proveedoresCatalogo.find(p =>
        lines.some(l => l.toUpperCase().includes(p))
      );

      if (provMatch) {
        provSelect.value = provMatch;
      }

      // Extraer monto
      const montos = [];
      const regex = /(\d+[\.,]\d{2})/;
      lines.forEach(l => {
        const low = l.toLowerCase();
        if (low.includes('total') || low.includes('monto') || low.includes('pagar')) {
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

// 4. SUBIR FACTURA
btnGuardar.addEventListener('click', async () => {
  const prov = provSelect.value;
  const monto = parseFloat(montoInput.value);
  const fecha = fechaInput.value;
  const estado = estadoInput.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert('Selecciona un proveedor e ingresa monto y fecha');
    return;
  }

  btnGuardar.innerText = 'Subiendo a la nube...';
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
    alert('Error al guardar: ' + err.message);
  } finally {
    btnGuardar.innerText = 'Subir a la nube';
    btnGuardar.disabled = false;
  }
});

// 5. CARGAR FACTURAS Y ACTUALIZAR COMPONENTES
async function cargarFacturas() {
  const { data, error } = await db
    .from('facturas')
    .select('*')
    .order('fecha', { ascending: false });

  if (error || !data) return;
  facturasGlobal = data;

  actualizarGraficas();
  renderHistorialPorProveedor();

  // Si hay un proveedor en el gráfico interactivo, recargarlo
  if (selectGraficoProv.value) {
    actualizarGraficoInteractivo(selectGraficoProv.value);
  } else if (proveedoresCatalogo.length > 0) {
    selectGraficoProv.value = proveedoresCatalogo[0];
    actualizarGraficoInteractivo(proveedoresCatalogo[0]);
  }
}

// 6. CAMBIO DE ESTADO
async function cambiarEstadoRapido(id, estadoActual) {
  const nuevoEstado = estadoActual === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';
  const { error } = await db.from('facturas').update({ estado: nuevoEstado }).eq('id', id);
  if (!error) cargarFacturas();
}

// 7. GRÁFICA DE BARRAS GENERAL (DIAS DE MAYOR GASTO)
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

  // Ranking
  const listaProvCont = document.getElementById('lista-proveedores-top');
  listaProvCont.innerHTML = '';
  const provOrdenados = Object.entries(gastoProv).sort((a, b) => b[1] - a[1]);

  if (provOrdenados.length === 0) {
    listaProvCont.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Sin datos en este periodo</p>';
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

// 8. GRÁFICO INTERACTIVO ANIMADO (CHART.JS)
function actualizarGraficoInteractivo(nombreProveedor) {
  if (!nombreProveedor) return;

  const facturasProv = facturasGlobal
    .filter(f => f.proveedor === nombreProveedor)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Agrupar compras por fecha
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

  if (chartInteractivoInstance) {
    chartInteractivoInstance.destroy();
  }

  chartInteractivoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas.length > 0 ? etiquetas : ['Sin registros'],
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
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Q ${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ba4b0', font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#9ba4b0', font: { size: 10 } },
          grid: { color: '#2a313a' }
        }
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

// 9. HISTORIAL AGRUPADO
function renderHistorialPorProveedor() {
  const container = document.getElementById('historial-grupos');
  container.innerHTML = '';

  if (facturasGlobal.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No hay facturas registradas</p>';
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
      const textoEstado = estadoActual === 'PAGADO' ? 'Pagado' : 'Pendiente';

      subItem.innerHTML = `
        ${imgHtml}
        <div style="flex:1;">
          <div style="font-size: 13px; font-weight: 700;">Q ${parseFloat(f.monto).toFixed(2)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${f.fecha}</div>
        </div>
        <span class="badge-status ${claseEstado}" onclick="cambiarEstadoRapido(${f.id}, '${estadoActual}')">${textoEstado}</span>
        <button class="btn-edit" onclick="abrirEditar(${f.id}, '${f.proveedor}', ${f.monto}, '${f.fecha}', '${estadoActual}')">✏️</button>
      `;
      content.appendChild(subItem);
    });

    header.onclick = (e) => {
      if (e.target.closest('.badge-status') || e.target.closest('.btn-edit')) return;
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

// 10. MODAL EDITAR
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
    alert('Todos los campos son obligatorios');
    return;
  }

  btnActualizar.innerText = 'Guardando...';
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
    alert('Error al actualizar: ' + err.message);
  } finally {
    btnActualizar.innerText = 'Guardar Cambios';
    btnActualizar.disabled = false;
  }
});

// MODALES
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
cargarProveedores().then(() => cargarFacturas());