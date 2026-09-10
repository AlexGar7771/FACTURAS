// TUS CREDENCIALES CONFIGURADAS DE SUPABASE
const supabaseUrl = 'https://cdblyqtxpuxnhwbxykfh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYmx5cXR4cHV4bmh3Ynh5a2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDgxMjksImV4cCI6MjA5OTc4NDEyOX0.XMozUuwLYLz3vB8UokwLNX-E-wJZr4QdVnkcVynvnjk';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedFile = null;
let facturasGlobal = [];

// Elementos
const inputFile = document.getElementById('input-file');
const previewImg = document.getElementById('preview-img');
const loader = document.getElementById('loader');
const provInput = document.getElementById('prov-input');
const montoInput = document.getElementById('monto-input');
const fechaInput = document.getElementById('fecha-input');
const btnGuardar = document.getElementById('btn-guardar');
const filtroGrafica = document.getElementById('filtro-grafica');

// Modales
const modalVisor = document.getElementById('modal-visor');
const modalEditar = document.getElementById('modal-editar');
const editId = document.getElementById('edit-id');
const editProv = document.getElementById('edit-prov');
const editMonto = document.getElementById('edit-monto');
const editFecha = document.getElementById('edit-fecha');
const btnActualizar = document.getElementById('btn-actualizar');

fechaInput.value = new Date().toISOString().split('T')[0];

// OCR TESSERACT
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

      const provFound = lines.find(l => l.length > 3 && !/\d/.test(l));
      if (provFound && !provInput.value) provInput.value = provFound;

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

// SUBIR NUEVA FACTURA
btnGuardar.addEventListener('click', async () => {
  const prov = provInput.value.trim().toUpperCase();
  const monto = parseFloat(montoInput.value);
  const fecha = fechaInput.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert('Completa proveedor, monto y fecha');
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
      imagen_url: imagenUrl
    }]);

    if (insertError) throw insertError;

    provInput.value = '';
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

// CONSULTAR BASE DE DATOS
async function cargarFacturas() {
  const { data, error } = await db
    .from('facturas')
    .select('*')
    .order('fecha', { ascending: false });

  if (error || !data) return;
  facturasGlobal = data;

  actualizarGraficas();
  renderHistorialPorProveedor();
}

// ACTUALIZAR GRÁFICAS SEGÚN FILTRO DE TIEMPO (MES / AÑO / TODO)
function actualizarGraficas() {
  const periodo = filtroGrafica.value;
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const filtradas = facturasGlobal.filter(f => {
    const d = new Date(f.fecha + 'T00:00:00');
    if (periodo === 'mes') {
      return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }
    if (periodo === 'anio') {
      return d.getFullYear() === anioActual;
    }
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

  // Barras amarillas
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

  // Ranking proveedores
  const listaProvCont = document.getElementById('lista-proveedores-top');
  listaProvCont.innerHTML = '';
  const provOrdenados = Object.entries(gastoProv).sort((a, b) => b[1] - a[1]);

  if (provOrdenados.length === 0) {
    listaProvCont.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Sin datos en este periodo</p>';
  } else {
    provOrdenados.slice(0, 5).forEach(([nombre, monto]) => {
      listaProvCont.innerHTML += `
        <div class="bar-row" style="margin-bottom: 8px;">
          <span style="flex: 1; font-weight: 700; font-size: 14px;">${nombre}</span>
          <span style="font-weight: 800; font-size: 14px;">Q ${monto.toFixed(0)}</span>
        </div>
      `;
    });
  }
}

// HISTORIAL AGRUPADO POR PROVEEDOR Y ORDENADO POR FECHA
function renderHistorialPorProveedor() {
  const container = document.getElementById('historial-grupos');
  container.innerHTML = '';

  if (facturasGlobal.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No hay facturas registradas</p>';
    return;
  }

  // Agrupar facturas por proveedor
  const grupos = {};
  facturasGlobal.forEach(f => {
    if (!grupos[f.proveedor]) grupos[f.proveedor] = [];
    grupos[f.proveedor].push(f);
  });

  // Renderizar cada acordeón
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

      subItem.innerHTML = `
        ${imgHtml}
        <div style="flex:1;">
          <div style="font-size: 13px; font-weight: 700;">Q ${parseFloat(f.monto).toFixed(2)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${f.fecha}</div>
        </div>
        <button class="btn-edit" onclick="abrirEditar(${f.id}, '${f.proveedor}', ${f.monto}, '${f.fecha}')">✏️</button>
      `;
      content.appendChild(subItem);
    });

    header.onclick = () => {
      const isVisible = content.style.display === 'block';
      content.style.display = isVisible ? 'none' : 'block';
      header.querySelector('span:last-child').innerHTML = `Q ${totalProv.toFixed(2)} ${isVisible ? '▾' : '▴'}`;
    };

    groupDiv.appendChild(header);
    groupDiv.appendChild(content);
    container.appendChild(groupDiv);
  });
}

// LOGICA DE EDICIÓN
function abrirEditar(id, prov, monto, fecha) {
  editId.value = id;
  editProv.value = prov;
  editMonto.value = monto;
  editFecha.value = fecha;
  modalEditar.style.display = 'flex';
}

btnActualizar.addEventListener('click', async () => {
  const id = editId.value;
  const prov = editProv.value.trim().toUpperCase();
  const monto = parseFloat(editMonto.value);
  const fecha = editFecha.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert('Todos los campos son obligatorios');
    return;
  }

  btnActualizar.innerText = 'Guardando...';
  btnActualizar.disabled = true;

  try {
    const { error } = await db
      .from('facturas')
      .update({ proveedor: prov, monto: monto, fecha: fecha })
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

// CONTROL DE MODALES
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

filtroGrafica.addEventListener('change', actualizarGraficas);

// Inicio
cargarFacturas();