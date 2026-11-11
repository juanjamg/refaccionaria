// ==========================================
// PRODUCTOS.JS - MÓDULO DE PRODUCTOS (CRUD & CATÁLOGO)
// Integrado con SQL Server (dbo.Productos, dbo.Inventario, dbo.Lineas)
// ==========================================

let productosData = [];
let lineasCatalogo = [];

// Formateador de moneda MXN
const formatDinero = (num) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(num) || 0);
};

// Cargar catálogo de líneas y categorías para los selects
async function loadLineas() {
  if (lineasCatalogo.length > 0) return;
  try {
    const res = await apiRequest('lineas/');
    lineasCatalogo = Array.isArray(res.data) ? res.data : [];
    populateLineasSelects();
  } catch (err) {
    console.error('Error cargando líneas:', err);
  }
}

function populateLineasSelects() {
  const filterSelect = document.getElementById('filterProductoLinea');
  const modalSelect = document.getElementById('productoLinea');

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="todas">Todas las líneas / categorías</option>';
    lineasCatalogo.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.categoria} - ${l.nombre}`;
      filterSelect.appendChild(opt);
    });
  }

  if (modalSelect) {
    modalSelect.innerHTML = '<option value="">-- Seleccionar línea / categoría --</option>';
    lineasCatalogo.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.categoria} → ${l.nombre}`;
      modalSelect.appendChild(opt);
    });
  }
}

// Cargar productos desde la API
async function loadProductos() {
  try {
    await loadLineas();
    const json = await apiRequest('productos/');
    productosData = Array.isArray(json.data) ? json.data : [];
    renderProductos();
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    }
  }
}
window.loadProductos = loadProductos;

// Renderizar tabla y métricas
function renderProductos() {
  const tbody = document.getElementById('tbodyProductos');
  const searchInput = document.getElementById('searchProductos');
  const filterLinea = document.getElementById('filterProductoLinea');
  const filterEstado = document.getElementById('filterProductoEstado');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedLinea = filterLinea ? filterLinea.value : 'todas';
  const selectedEstado = filterEstado ? filterEstado.value : 'todos';

  const filtered = productosData.filter(p => {
    const sku = String(p.sku || '').toLowerCase();
    const nombre = String(p.nombre || '').toLowerCase();
    const marca = String(p.marca || '').toLowerCase();
    const linea = String(p.linea || '').toLowerCase();
    const categoria = String(p.categoria || '').toLowerCase();

    const matchesSearch = !search ||
      sku.includes(search) ||
      nombre.includes(search) ||
      marca.includes(search) ||
      linea.includes(search) ||
      categoria.includes(search);

    const matchesLinea = (selectedLinea === 'todas') || (String(p.id_linea) === String(selectedLinea));
    const matchesEstado = (selectedEstado === 'todos') || (p.estado === selectedEstado);

    return matchesSearch && matchesLinea && matchesEstado;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron refacciones o productos con los criterios de búsqueda actuales.</td></tr>`;
  } else {
    filtered.forEach(p => {
      const stock = Number(p.stock) || 0;
      let stockBadgeClass = 'badge-active';
      let stockIcon = 'fa-check';
      let stockLabel = `${stock} pzas`;

      if (stock <= 0) {
        stockBadgeClass = 'badge-inactive';
        stockIcon = 'fa-triangle-exclamation';
        stockLabel = 'Agotado (0)';
      } else if (stock <= 5) {
        stockBadgeClass = 'badge-pending';
        stockIcon = 'fa-circle-exclamation';
        stockLabel = `Bajo (${stock})`;
      }

      const estadoBadgeClass = (p.estado === 'Activo') ? 'badge-active' : 'badge-inactive';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="sku-code-tag">${p.sku}</span>
        </td>
        <td>
          <div class="item-main-title">${p.nombre}</div>
          <div class="item-sub-title">
            <i class="fa-solid fa-tag"></i> ID: #${p.id}
          </div>
        </td>
        <td>
          <span class="product-brand-text">
            <i class="fa-solid fa-copyright"></i> ${p.marca || 'Genérica'}
          </span>
        </td>
        <td>
          <div class="product-line-text">${p.linea}</div>
          <div class="product-category-subtext">${p.categoria}</div>
        </td>
        <td>
          <div class="table-price-sale">${formatDinero(p.precio_venta)}</div>
          ${p.precio_compra > 0 ? `<div class="table-cost-subtext">Costo: ${formatDinero(p.precio_compra)}</div>` : ''}
        </td>
        <td>
          <span class="badge-tag ${stockBadgeClass}">
            <i class="fa-solid ${stockIcon}"></i> ${stockLabel}
          </span>
        </td>
        <td>
          <span class="badge-tag ${estadoBadgeClass}">
            ${p.estado}
          </span>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-icon-action btn-action-edit" title="Editar Producto" onclick="editarProducto('${p.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-stock" title="Ajuste Rápido de Stock" onclick="abrirAjusteRapidoStock('${p.id}')">
              <i class="fa-solid fa-boxes-stacked"></i>
            </button>
            <button type="button" class="btn-icon-action btn-action-delete" title="Eliminar Producto" onclick="eliminarProducto('${p.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Actualizar contadores y métricas
  const countInfo = document.getElementById('countProductosInfo');
  if (countInfo) {
    countInfo.innerText = `Mostrando ${filtered.length} de ${productosData.length} productos`;
  }

  const statTotal = document.getElementById('statTotalProductos');
  if (statTotal) statTotal.innerText = productosData.length;

  const statActivos = document.getElementById('statProductosActivos');
  if (statActivos) {
    statActivos.innerText = productosData.filter(p => p.estado === 'Activo').length;
  }

  const statBajoStock = document.getElementById('statProductosStockBajo');
  if (statBajoStock) {
    statBajoStock.innerText = productosData.filter(p => Number(p.stock) <= 5).length;
  }

  const statValor = document.getElementById('statValorCatalogo');
  if (statValor) {
    const totalVal = productosData.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.precio_venta) || 0)), 0);
    statValor.innerText = formatDinero(totalVal);
  }
}

// Búsqueda y Filtros en tiempo real
const searchInputProd = document.getElementById('searchProductos');
if (searchInputProd) searchInputProd.addEventListener('input', renderProductos);

const filterLineaProd = document.getElementById('filterProductoLinea');
if (filterLineaProd) filterLineaProd.addEventListener('change', renderProductos);

const filterEstadoProd = document.getElementById('filterProductoEstado');
if (filterEstadoProd) filterEstadoProd.addEventListener('change', renderProductos);

// Apertura y Cierre de Modal Producto
const btnOpenProductoModal = document.getElementById('btnOpenProductoModal');
const modalProducto = document.getElementById('modalProducto');
const formProducto = document.getElementById('formProducto');
const modalProductoTitle = document.getElementById('modalProductoTitle');

if (btnOpenProductoModal && modalProducto) {
  btnOpenProductoModal.addEventListener('click', () => {
    if (formProducto) formProducto.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('productoStatus').value = '1';
    if (modalProductoTitle) {
      modalProductoTitle.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i> Registrar Nueva Refacción';
    }
    openModal('modalProducto');
  });
}

// Enviar formulario (Crear o Editar)
if (formProducto) {
  formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value.trim();
    const isEdit = Boolean(id);

    const payload = {
      sku: document.getElementById('productoSku').value.trim(),
      nombre: document.getElementById('productoNombre').value.trim(),
      marca: document.getElementById('productoMarca').value.trim(),
      id_linea: document.getElementById('productoLinea').value || null,
      precio_venta: parseFloat(document.getElementById('productoVenta').value) || 0,
      stock: parseInt(document.getElementById('productoStock').value, 10) || 0,
      precio_compra: parseFloat(document.getElementById('productoCompra').value) || 0,
      status: document.getElementById('productoStatus').value
    };

    try {
      const endpoint = isEdit ? `productos/?id=${id}` : 'productos/';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (typeof showToast === 'function') {
        showToast(res.message || 'Operación realizada correctamente', 'success');
      }

      closeModal('modalProducto');
      loadProductos();
      if (typeof window.loadInventarios === 'function') {
        window.loadInventarios();
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message, 'danger');
      }
    }
  });
}

// Editar Producto
window.editarProducto = function(id) {
  const prod = productosData.find(p => String(p.id) === String(id));
  if (!prod) return;

  document.getElementById('productoId').value = prod.id;
  document.getElementById('productoSku').value = prod.sku;
  document.getElementById('productoNombre').value = prod.nombre;
  document.getElementById('productoMarca').value = prod.marca || '';
  document.getElementById('productoLinea').value = prod.id_linea || '';
  document.getElementById('productoVenta').value = prod.precio_venta;
  document.getElementById('productoStock').value = prod.stock;
  document.getElementById('productoCompra').value = prod.precio_compra || 0;
  document.getElementById('productoStatus').value = (prod.estado === 'Activo') ? '1' : '0';

  if (modalProductoTitle) {
    modalProductoTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Refacción: ${prod.sku}`;
  }

  openModal('modalProducto');
};

// Eliminar Producto
window.eliminarProducto = async function(id) {
  const prod = productosData.find(p => String(p.id) === String(id));
  const desc = prod ? `"${prod.nombre}" (${prod.sku})` : 'este producto';

  if (!confirm(`¿Está seguro de eliminar ${desc}? Esta acción retirará el artículo del catálogo y del almacén.`)) {
    return;
  }

  try {
    const res = await apiRequest(`productos/?id=${id}`, { method: 'DELETE' });
    if (typeof showToast === 'function') {
      showToast(res.message || 'Producto eliminado correctamente', 'success');
    }
    loadProductos();
    if (typeof window.loadInventarios === 'function') {
      window.loadInventarios();
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    }
  }
};

// Acceso directo a ajuste de stock desde el catálogo de productos
window.abrirAjusteRapidoStock = function(id) {
  if (typeof window.abrirModalAjuste === 'function') {
    window.abrirModalAjuste(id);
  }
};
