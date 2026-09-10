// CREDENCIALES CONFIGURADAS DE SUPABASE
const supabaseUrl = 'https://cdblyqtxpuxnhwbxykfh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYmx5cXR4cHV4bmh3Ynh5a2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDgxMjksImV4cCI6MjA5OTc4NDEyOX0.XMozUuwLYLz3vB8UokwLNX-E-wJZr4QdVnkcVynvnjk';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedFile = null;

// Referencias al DOM
const inputFile = document.getElementById('input-file');
const previewImg = document.getElementById('preview-img');
const loader = document.getElementById('loader');
const provInput = document.getElementById('prov-input');
const montoInput = document.getElementById('monto-input');
const fechaInput = document.getElementById('fecha-input');
const btnGuardar = document.getElementById('btn-guardar');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// Fecha actual por defecto
fechaInput.value = new Date().toISOString().split('T')[0];

// OCR CON TESSERACT.JS
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

// SUBIR FACTURA Y FOTO A SUPABASE
btnGuardar.addEventListener('click', async () => {
  const prov = provInput.value.trim().toUpperCase();
  const monto = parseFloat(montoInput.value);
  const fecha = fechaInput.value;

  if (!prov || isNaN(monto) || !fecha) {
    alert('Por favor completa los campos de proveedor, monto y fecha');
    return;
  }

  btnGuardar.innerText = 'Subiendo a la nube...';
  btnGuardar.disabled = true;

  try {
    let imagenUrl = '';

    // Subir imagen a Supabase Storage (Bucket: facturas-fotos)
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop();
      const filePath = `${Date.now()}_factura.${extension}`;

      const { data: uploadData, error: uploadError } = await db.storage
        .from('facturas-fotos')
        .upload(filePath, selectedFile);

      if (!uploadError) {
        const { data: publicUrlData } = db.storage
          .from('facturas-fotos')
          .getPublicUrl(filePath);
        imagenUrl = publicUrlData.publicUrl;
      }
    }

    // Insertar registro en tabla facturas
    const { error: insertError } = await db.from('facturas').insert([{
      proveedor: prov,
      monto: monto,
      fecha: fecha,
      imagen_url: imagenUrl
    }]);

    if (insertError) throw insertError;

    // Limpiar formulario
    provInput.value = '';
    montoInput.value = '';
    previewImg.style.display = 'none';
    selectedFile = null;
    cargarDashboard();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btnGuardar.innerText = 'Subir a la nube';
    btnGuardar.disabled = false;
  }
});

// CARGAR DATOS Y ACTUALIZAR GRÁFICAS
async function cargarDashboard() {
  const { data: facturas, error } = await db
    .from('facturas')
    .select('*')
    .order('fecha', { ascending: false });

  if (error || !facturas) return;

  const diasNom = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gastoDias = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
  const gastoProv = {};
  let total = 0;

  facturas.forEach(f => {
    const d = new Date(f.fecha + 'T00:00:00');
    const diaClave = diasNom[d.getDay()];
    const montoVal = parseFloat(f.monto);
    gastoDias[diaClave] = (gastoDias[diaClave] || 0) + montoVal;
    gastoProv[f.proveedor] = (gastoProv[f.proveedor] || 0) + montoVal;
    total += montoVal;
  });

  document.getElementById('total-acumulado').innerText = `Q ${total.toFixed(2)}`;

  // Gráfica de barras por día
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

  // Ranking proveedores top
  const listaProvCont = document.getElementById('lista-proveedores-top');
  listaProvCont.innerHTML = '';
  const provOrdenados = Object.entries(gastoProv).sort((a, b) => b[1] - a[1]);

  provOrdenados.slice(0, 5).forEach(([nombre, monto]) => {
    listaProvCont.innerHTML += `
      <div class="bar-row" style="margin-bottom: 8px;">
        <span style="flex: 1; font-weight: 700; font-size: 14px;">${nombre}</span>
        <span style="font-weight: 800; font-size: 14px;">Q ${monto.toFixed(0)}</span>
      </div>
    `;
  });

  // Historial de compras con miniatura
  const historialCont = document.getElementById('historial-facturas');
  historialCont.innerHTML = '';

  facturas.forEach(f => {
    const item = document.createElement('div');
    item.className = 'row-item';
    item.onclick = () => verDetalleFoto(f.imagen_url, f.proveedor, f.monto, f.fecha);

    const imgHtml = f.imagen_url 
      ? `<img src="${f.imagen_url}" class="thumb-img">`
      : `<div class="thumb-img" style="display:grid;place-items:center;color:var(--text-muted);">🧾</div>`;

    item.innerHTML = `
      ${imgHtml}
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 700;">${f.proveedor}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${f.fecha}</div>
      </div>
      <div style="font-size: 15px; font-weight: 800; color: var(--accent);">Q ${parseFloat(f.monto).toFixed(2)}</div>
    `;
    historialCont.appendChild(item);
  });
}

// VISOR MODAL
function verDetalleFoto(url, prov, monto, fecha) {
  if (!url) {
    alert(`Factura de ${prov} no tiene foto.`);
    return;
  }
  document.getElementById('modal-img').src = url;
  document.getElementById('modal-text').innerText = `${prov} — Q ${parseFloat(monto).toFixed(2)} (${fecha})`;
  document.getElementById('modal-visor').style.display = 'flex';
}

btnCerrarModal.addEventListener('click', () => {
  document.getElementById('modal-visor').style.display = 'none';
  document.getElementById('modal-img').src = '';
});

// Cargar dashboard al iniciar
cargarDashboard();