// ==========================================
// INVENTARIOS.JS - CONTROL DE ALMACÉN, EXISTENCIAS Y MOVIMIENTOS
// Integrado con SQL Server (dbo.Inventario, dbo.Productos)
// ==========================================

let inventarioData = [];
let inventarioStats = {};

// Cargar inventarios desde la API
async function loadInventarios() {
  try {
    const res = await apiRequest('inventario/');
    const data = res.data || {};
    inventarioData = Array.isArray(data.items) ? data.items : [];
    inventarioStats = data.stats || {};
    populateSelectProductosAjuste();
    renderInventarios();
    renderInventarioStats();
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    }
  }
}
window.loadInventarios = loadInventarios;

// Llenar selector de productos en el modal de ajuste
function populateSelectProductosAjuste() {
  const sel = document.getElementById('ajusteProductoId');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Seleccionar refacción / producto --</option>';

  inventarioData.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id_producto;
    opt.textContent = `[${item.sku}] ${item.nombre} (Stock actual: ${item.existencia})`;
    sel.appendChild(opt);
  });

  if (currentVal) sel.value = currentVal;
}

// Renderizar métricas
function renderInventarioStats() {
  const fmt = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(num) || 0);

  const elUnidades = document.getElementById('statInvUnidades');
  if (elUnidades) elUnidades.innerText = (inventarioStats.unidades_totales ?? 0).toLocaleString('es-MX');

  const elValorCosto = document.getElementById('statInvValorCosto');
  if (elValorCosto) elValorCosto.innerText = fmt(inventarioStats.valor_inventario_costo ?? 0);

  const elAgotados = document.getElementById('statInvAgotados');
  if (elAgotados) elAgotados.innerText = inventarioStats.articulos_agotados ?? 0;

  const elBajos = document.getElementById('statInvBajoStock');
  if (elBajos) elBajos.innerText = inventarioStats.articulos_stock_bajo ?? 0;
}

// Renderizar tabla de inventario
function renderInventarios() {
  const tbody = document.getElementById('tbodyInventarios');
  const searchInput = document.getElementById('searchInventarios');
  const filterStock = document.getElementById('filterInventarioNivel');

  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedNivel = filterStock ? filterStock.value : 'todos';

  const fmt = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(num) || 0);

  const filtered = inventarioData.filter(item => {
    const sku = String(item.sku || '').toLowerCase();
    const nombre = String(item.nombre || '').toLowerCase();
    const marca = String(item.marca || '').toLowerCase();
    const linea = String(item.linea || '').toLowerCase();
    const categoria = String(item.categoria || '').toLowerCase();

    const matchesSearch = !search ||
      sku.includes(search) ||
      nombre.includes(search) ||
      marca.includes(search) ||
      linea.includes(search) ||
      categoria.includes(search);

    const matchesNivel = (selectedNivel === 'todos') || (item.nivel_stock === selectedNivel);

    return matchesSearch && matchesNivel;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No se encontraron artículos en almacén con los filtros seleccionados.</td></tr>`;
  } else {
    filtered.forEach(item => {
      let badgeClass = 'badge-active';
      let icon = 'fa-check';
      let label = `${item.existencia} unidades`;

      if (item.nivel_stock === 'Agotado') {
        badgeClass = 'badge-inactive';
        icon = 'fa-triangle-exclamation';
        label = 'Sin Existencia (0)';
      } else if (item.nivel_stock === 'Bajo') {
        badgeClass = 'badge-pending';
        icon = 'fa-circle-exclamation';
        label = `Stock Bajo (${item.existencia})`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="sku-code-tag">${item.sku}</span>
        </td>
        <td>
          <div class="item-main-title">${item.nombre}</div>
          <div class="item-sub-title">
            <i class="fa-solid fa-copyright"></i> ${item.marca} | ${item.linea}
          </div>
        </td>
        <td>
          <span class="badge-tag ${badgeClass}">
            <i class="fa-solid ${icon}"></i> ${label}
          </span>
        </td>
        <td>
          <span class="table-price-cost">${fmt(item.precio_compra_prom)}</span>
        </td>
        <td>
          <span class="table-price-sale">${fmt(item.precio_venta_prom)}</span>
        </td>
        <td>
          <span class="table-value-cost">${fmt(item.valor_total_costo)}</span>
        </td>
        <td>
          <span class="table-value-sale">${fmt(item.valor_total_venta)}</span>
        </td>
        <td>
          <div class="action-buttons-group" style="justify-content: center;">
            <button type="button" class="btn-table-action-green" title="Ajustar o Recibir Mercancía" onclick="abrirModalAjuste('${item.id_producto}')">
              <i class="fa-solid fa-arrow-right-arrow-left"></i> Mover Stock
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const countInfo = document.getElementById('countInventariosInfo');
  if (countInfo) {
    countInfo.innerText = `Mostrando ${filtered.length} de ${inventarioData.length} artículos en almacén`;
  }
}

// Búsqueda y Filtros de Inventario
const searchInputInv = document.getElementById('searchInventarios');
if (searchInputInv) searchInputInv.addEventListener('input', renderInventarios);

const filterNivelInv = document.getElementById('filterInventarioNivel');
if (filterNivelInv) filterNivelInv.addEventListener('change', renderInventarios);

// Modal de Ajuste de Inventario
const modalAjuste = document.getElementById('modalAjusteInventario');
const formAjuste = document.getElementById('formAjusteInventario');
const btnOpenAjusteModal = document.getElementById('btnOpenAjusteModal');
const selTipoAjuste = document.getElementById('ajusteTipoMovimiento');
const groupCostoAjuste = document.getElementById('groupAjusteCosto');

function actualizarCamposSegunTipo() {
  const tipo = selTipoAjuste ? selTipoAjuste.value : 'entrada';
  const labelCantidad = document.getElementById('labelAjusteCantidad');
  const inputCantidad = document.getElementById('ajusteCantidad');

  if (tipo === 'entrada') {
    if (groupCostoAjuste) groupCostoAjuste.style.display = 'block';
    if (labelCantidad) labelCantidad.innerText = 'Cantidad a Ingresar *';
    if (inputCantidad) inputCantidad.placeholder = 'Ej. 10';
  } else if (tipo === 'salida') {
    if (groupCostoAjuste) groupCostoAjuste.style.display = 'none';
    if (labelCantidad) labelCantidad.innerText = 'Cantidad a Retirar *';
    if (inputCantidad) inputCantidad.placeholder = 'Ej. 3';
  } else { // ajuste físico
    if (groupCostoAjuste) groupCostoAjuste.style.display = 'block';
    if (labelCantidad) labelCantidad.innerText = 'Conteo Físico Real en Almacén *';
    if (inputCantidad) inputCantidad.placeholder = 'Ej. 15';
  }
}

if (selTipoAjuste) {
  selTipoAjuste.addEventListener('change', actualizarCamposSegunTipo);
}

if (btnOpenAjusteModal && modalAjuste) {
  btnOpenAjusteModal.addEventListener('click', () => {
    if (formAjuste) formAjuste.reset();
    actualizarCamposSegunTipo();
    openModal('modalAjusteInventario');
  });
}

window.abrirModalAjuste = function(idProducto) {
  if (formAjuste) formAjuste.reset();
  const selProd = document.getElementById('ajusteProductoId');
  if (selProd && idProducto) {
    selProd.value = idProducto;
  }
  actualizarCamposSegunTipo();
  openModal('modalAjusteInventario');
};

// Guardar Ajuste / Movimiento
if (formAjuste) {
  formAjuste.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idProducto = document.getElementById('ajusteProductoId').value;
    const tipo = document.getElementById('ajusteTipoMovimiento').value;
    const cantidad = parseInt(document.getElementById('ajusteCantidad').value, 10);
    const costoUnitario = parseFloat(document.getElementById('ajusteCosto').value) || 0;
    const motivo = document.getElementById('ajusteMotivo').value.trim();

    if (!idProducto) {
      if (typeof showToast === 'function') {
        showToast('Debe seleccionar una refacción o producto', 'danger');
      }
      return;
    }

    const payload = {
      id_producto: parseInt(idProducto, 10),
      tipo_movimiento: tipo,
      cantidad,
      costo_unitario: costoUnitario,
      motivo
    };

    try {
      const res = await apiRequest('inventario/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (typeof showToast === 'function') {
        showToast(res.message || 'Movimiento de stock registrado con éxito', 'success');
      }

      closeModal('modalAjusteInventario');
      loadInventarios();
      if (typeof window.loadProductos === 'function') {
        window.loadProductos();
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message, 'danger');
      }
    }
  });
}
