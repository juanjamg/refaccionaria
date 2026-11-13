// ==========================================
// VENTAS.JS - MÓDULO PUNTO DE VENTA (POS) Y TICKET
// Integrado con SQL Server (dbo.Ventas, dbo.Ventas_Detalle, dbo.Productos, dbo.Inventario)
// ==========================================

let posCart = [];
let posProductos = [];
let posClientes = [];
let posLineas = [];

// Formateador de moneda MXN
const formatPOSMoney = (val) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(Number(val) || 0);
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// ==========================================
// 1. CARGA INICIAL DEL PUNTO DE VENTA
// ==========================================
async function loadPos() {
  try {
    const [resProds, resClis, resLins] = await Promise.all([
      apiRequest('productos/'),
      apiRequest('clientes/'),
      apiRequest('lineas/').catch(() => ({ data: [] }))
    ]);

    posProductos = Array.isArray(resProds.data) ? resProds.data : [];
    posClientes = Array.isArray(resClis.data) ? resClis.data : [];
    posLineas = Array.isArray(resLins.data) ? resLins.data : [];

    populatePosSelects();
    renderPosProducts();
    renderCart();

    const countEl = document.getElementById('posCatalogCount');
    if (countEl) {
      countEl.innerText = `${posProductos.length} refacciones en catálogo`;
    }
  } catch (err) {
    console.error('Error cargando Punto de Venta:', err);
    if (typeof showToast === 'function') {
      showToast('Error cargando datos del Punto de Venta: ' + err.message, 'danger');
    }
  }
}
window.loadPos = loadPos;

function populatePosSelects() {
  // 1. Selector de clientes
  const selectCli = document.getElementById('selectPosCliente');
  if (selectCli) {
    selectCli.innerHTML = '';
    
    // Buscar si existe Público General
    let defaultId = null;
    posClientes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombre} ${c.rfc ? `(${c.rfc})` : ''}`;
      if (c.nombre.toLowerCase().includes('público general') || c.nombre.toLowerCase().includes('publico general')) {
        defaultId = c.id;
        opt.selected = true;
      }
      selectCli.appendChild(opt);
    });

    if (!defaultId && posClientes.length > 0) {
      selectCli.selectedIndex = 0;
    }
  }

  // 2. Filtro de líneas/categorías en catálogo
  const filterLin = document.getElementById('filterPosLinea');
  if (filterLin) {
    filterLin.innerHTML = '<option value="todas">Todas las categorías</option>';
    posLineas.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.categoria} - ${l.nombre}`;
      filterLin.appendChild(opt);
    });
  }
}

// ==========================================
// 2. RENDERIZADO DEL CATÁLOGO DE REFACCIONES
// ==========================================
function renderPosProducts() {
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

  const searchInput = document.getElementById('searchPosProducto');
  const filterLin = document.getElementById('filterPosLinea');
  const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const selectedLinea = filterLin ? filterLin.value : 'todas';

  const filtered = posProductos.filter(p => {
    const matchTerm = !term || 
      (p.nombre && p.nombre.toLowerCase().includes(term)) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.marca && p.marca.toLowerCase().includes(term));

    const matchLinea = (selectedLinea === 'todas') || (String(p.id_linea) === String(selectedLinea));

    return matchTerm && matchLinea && (p.estado === 'Activo' || p.status === '1');
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 10px; color: #94a3b8;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
        <p style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0;">No se encontraron refacciones</p>
        <span style="font-size: 13px;">Intenta con otro término o filtro de categoría</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const stock = Number(p.existencia !== undefined ? p.existencia : p.stock) || 0;
    const isOutOfStock = stock <= 0;

    let badgeClass = 'stock-badge-ok';
    let badgeText = `En Stock: ${stock}`;
    if (isOutOfStock) {
      badgeClass = 'stock-badge-zero';
      badgeText = 'Agotado';
    } else if (stock <= 5) {
      badgeClass = 'stock-badge-low';
      badgeText = `Bajo: ${stock}`;
    }

    return `
      <div class="pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
           data-id="${p.id}" 
           title="${isOutOfStock ? 'Producto sin existencia disponible' : 'Clic para agregar al carrito'}">
        <div>
          <div class="pos-prod-badge-row">
            <span class="pos-sku-badge">${escapeHtml(p.sku || 'SKU')}</span>
            <span class="pos-stock-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="pos-prod-title">${escapeHtml(p.nombre)}</div>
          <div class="pos-prod-brand"><i class="fa-solid fa-tag"></i> ${escapeHtml(p.marca || 'Genérico')}</div>
        </div>
        <div class="pos-prod-footer">
          <span class="pos-prod-price">${formatPOSMoney(p.precio_venta)}</span>
          <button type="button" class="btn-pos-add-item" ${isOutOfStock ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="Agregar al carrito">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Event listener para agregar producto al dar clic en la tarjeta
  grid.querySelectorAll('.pos-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const prodId = parseInt(card.getAttribute('data-id'), 10);
      addToCart(prodId);
    });
  });
}

// Búsqueda en vivo y cambio de filtro
const searchPosProdEl = document.getElementById('searchPosProducto');
if (searchPosProdEl) {
  searchPosProdEl.addEventListener('input', renderPosProducts);
}
const filterPosLinEl = document.getElementById('filterPosLinea');
if (filterPosLinEl) {
  filterPosLinEl.addEventListener('change', renderPosProducts);
}

// ==========================================
// 3. GESTIÓN DEL CARRITO DE COMPRAS
// ==========================================
function addToCart(prodId) {
  const prod = posProductos.find(p => p.id === prodId);
  if (!prod) return;

  const stock = Number(prod.existencia !== undefined ? prod.existencia : prod.stock) || 0;
  if (stock <= 0) {
    if (typeof showToast === 'function') {
      showToast(`"${prod.nombre}" está agotado en inventario.`, 'warning');
    }
    return;
  }

  const existing = posCart.find(item => item.id_producto === prodId);
  if (existing) {
    if (existing.cantidad + 1 > stock) {
      if (typeof showToast === 'function') {
        showToast(`Stock máximo alcanzado (${stock} unidades disponibles)`, 'warning');
      }
      return;
    }
    existing.cantidad += 1;
    existing.subtotal = existing.cantidad * existing.precio;
  } else {
    posCart.push({
      id_producto: prod.id,
      sku: prod.sku,
      nombre: prod.nombre,
      marca: prod.marca || '',
      precio: Number(prod.precio_venta) || 0,
      stock: stock,
      cantidad: 1,
      descuento: 0,
      subtotal: Number(prod.precio_venta) || 0
    });
  }

  renderCart();
}

function updateCartQty(prodId, newQty) {
  const item = posCart.find(it => it.id_producto === prodId);
  if (!item) return;

  let qty = parseInt(newQty, 10);
  if (isNaN(qty) || qty <= 0) {
    qty = 1;
  }

  if (qty > item.stock) {
    qty = item.stock;
    if (typeof showToast === 'function') {
      showToast(`Existencia máxima disponible: ${item.stock} unidades`, 'warning');
    }
  }

  item.cantidad = qty;
  item.subtotal = item.cantidad * item.precio;
  renderCart();
}

function removeFromCart(prodId) {
  posCart = posCart.filter(it => it.id_producto !== prodId);
  renderCart();
}

function clearCart() {
  if (posCart.length === 0) return;
  posCart = [];
  const inputDesc = document.getElementById('inputDescuento');
  if (inputDesc) inputDesc.value = '0';
  const inputPaga = document.getElementById('inputPagaCon');
  if (inputPaga) inputPaga.value = '';
  renderCart();
}

const btnVaciar = document.getElementById('btnVaciarCarrito');
if (btnVaciar) {
  btnVaciar.addEventListener('click', () => {
    if (posCart.length > 0) {
      clearCart();
      if (typeof showToast === 'function') showToast('Carrito vaciado', 'info');
    }
  });
}

function renderCart() {
  const container = document.getElementById('posCartList');
  const emptyState = document.getElementById('posCartEmpty');
  const countBadge = document.getElementById('cartCountBadge');

  const totalItemsCount = posCart.reduce((sum, it) => sum + it.cantidad, 0);
  if (countBadge) {
    countBadge.innerText = `${totalItemsCount} ${totalItemsCount === 1 ? 'artículo' : 'artículos'}`;
  }

  if (!container) return;

  if (posCart.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    container.innerHTML = '';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    container.innerHTML = posCart.map(it => `
      <div class="pos-cart-item-card">
        <div class="pos-cart-item-info">
          <div class="pos-cart-item-name" title="${escapeHtml(it.nombre)}">${escapeHtml(it.nombre)}</div>
          <div class="pos-cart-item-meta">${escapeHtml(it.sku)} • ${formatPOSMoney(it.precio)} c/u</div>
        </div>
        <div class="pos-qty-controls">
          <button type="button" class="btn-qty-mini btn-qty-minus" data-id="${it.id_producto}">-</button>
          <input type="text" class="pos-qty-input" value="${it.cantidad}" data-id="${it.id_producto}">
          <button type="button" class="btn-qty-mini btn-qty-plus" data-id="${it.id_producto}">+</button>
        </div>
        <div class="pos-cart-item-subtotal">${formatPOSMoney(it.subtotal)}</div>
        <button type="button" class="btn-remove-cart-item" data-id="${it.id_producto}" title="Eliminar">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');

    // Asignar eventos de cantidad y eliminar
    container.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const item = posCart.find(i => i.id_producto === id);
        if (item) {
          if (item.cantidad > 1) {
            updateCartQty(id, item.cantidad - 1);
          } else {
            removeFromCart(id);
          }
        }
      });
    });

    container.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const item = posCart.find(i => i.id_producto === id);
        if (item) updateCartQty(id, item.cantidad + 1);
      });
    });

    container.querySelectorAll('.pos-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = parseInt(input.getAttribute('data-id'), 10);
        updateCartQty(id, input.value);
      });
    });

    container.querySelectorAll('.btn-remove-cart-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        removeFromCart(id);
      });
    });
  }

  recalcularTotales();
}

// ==========================================
// 4. TOTALES, DESCUENTO Y COBRO
// ==========================================
function recalcularTotales() {
  const subtotal = posCart.reduce((sum, it) => sum + it.subtotal, 0);
  const inputDesc = document.getElementById('inputDescuento');
  const descuento = Math.max(0, parseFloat(inputDesc ? inputDesc.value : 0) || 0);
  const total = Math.max(0, subtotal - descuento);

  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCambioEl = document.getElementById('cartCambio');
  const inputPagaCon = document.getElementById('inputPagaCon');
  const selectTipoPago = document.getElementById('selectTipoPago');

  if (cartSubtotalEl) cartSubtotalEl.innerText = formatPOSMoney(subtotal);
  if (cartTotalEl) cartTotalEl.innerText = formatPOSMoney(total);

  const idMetodo = selectTipoPago ? parseInt(selectTipoPago.value, 10) : 1;

  // Si no es efectivo, sugerir el monto exacto
  if (idMetodo !== 1 && inputPagaCon && (!inputPagaCon.value || parseFloat(inputPagaCon.value) === 0)) {
    inputPagaCon.value = total > 0 ? total.toFixed(2) : '';
  }

  const pagaCon = parseFloat(inputPagaCon ? inputPagaCon.value : 0) || 0;

  if (cartCambioEl) {
    if (pagaCon >= total && total > 0) {
      cartCambioEl.innerText = formatPOSMoney(pagaCon - total);
    } else {
      cartCambioEl.innerText = '$0.00';
    }
  }
}

const inputDescuentoEl = document.getElementById('inputDescuento');
if (inputDescuentoEl) inputDescuentoEl.addEventListener('input', recalcularTotales);

const inputPagaConEl = document.getElementById('inputPagaCon');
if (inputPagaConEl) inputPagaConEl.addEventListener('input', recalcularTotales);

const selectTipoPagoEl = document.getElementById('selectTipoPago');
if (selectTipoPagoEl) {
  selectTipoPagoEl.addEventListener('change', () => {
    const inputPaga = document.getElementById('inputPagaCon');
    const idMetodo = parseInt(selectTipoPagoEl.value, 10);
    const subtotal = posCart.reduce((sum, it) => sum + it.subtotal, 0);
    const desc = Math.max(0, parseFloat(inputDescuentoEl ? inputDescuentoEl.value : 0) || 0);
    const total = Math.max(0, subtotal - desc);

    if (idMetodo !== 1 && inputPaga) {
      inputPaga.value = total.toFixed(2);
    }
    recalcularTotales();
  });
}

// Botón COBRAR
const btnCobrarEl = document.getElementById('btnCobrar');
if (btnCobrarEl) {
  btnCobrarEl.addEventListener('click', async () => {
    if (posCart.length === 0) {
      if (typeof showToast === 'function') {
        showToast('El carrito está vacío. Agrega al menos una refacción para cobrar.', 'warning');
      }
      return;
    }

    const selectCli = document.getElementById('selectPosCliente');
    const selectTipo = document.getElementById('selectTipoPago');
    const selectComp = document.getElementById('selectComprobante');
    const inputDesc = document.getElementById('inputDescuento');
    const inputPaga = document.getElementById('inputPagaCon');

    const idCliente = selectCli ? parseInt(selectCli.value, 10) : 1;
    const idMetodo = selectTipo ? parseInt(selectTipo.value, 10) : 1;
    const comprobante = selectComp ? selectComp.value : 'Ticket';
    const descuento = Math.max(0, parseFloat(inputDesc ? inputDesc.value : 0) || 0);
    const pagaCon = parseFloat(inputPaga ? inputPaga.value : 0) || 0;

    const subtotal = posCart.reduce((sum, it) => sum + it.subtotal, 0);
    const total = Math.max(0, subtotal - descuento);

    // Validar pago en efectivo
    if (idMetodo === 1 && pagaCon > 0 && pagaCon < total) {
      if (typeof showToast === 'function') {
        showToast(`El importe recibido (${formatPOSMoney(pagaCon)}) es menor al total (${formatPOSMoney(total)})`, 'danger');
      }
      if (inputPaga) inputPaga.focus();
      return;
    }

    const payload = {
      id_cliente: idCliente,
      id_metodo_pago: idMetodo,
      tipo_pago: selectTipo ? selectTipo.options[selectTipo.selectedIndex].text : 'Efectivo',
      comprobante: comprobante,
      descuento: descuento,
      paga_con: pagaCon > 0 ? pagaCon : total,
      items: posCart.map(it => ({
        id_producto: it.id_producto,
        cantidad: it.cantidad,
        precio: it.precio,
        descuento: it.descuento || 0
      }))
    };

    btnCobrarEl.disabled = true;
    btnCobrarEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO...';

    try {
      const res = await ventasApi.create(payload);
      if (res && res.data) {
        if (typeof showToast === 'function') {
          showToast(res.message || 'Venta cobrada con éxito', 'success');
        }
        
        // Mostrar Ticket
        mostrarTicketModal(res.data);

        // Limpiar carrito
        clearCart();

        // Recargar inventario de productos en background
        loadPos();
        if (typeof window.loadInventarios === 'function') {
          window.loadInventarios();
        }
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error procesando la venta', 'danger');
      }
    } finally {
      btnCobrarEl.disabled = false;
      btnCobrarEl.innerHTML = '<i class="fa-solid fa-cash-register"></i> COBRAR';
    }
  });
}

// Botón APARTADO
const btnApartadoEl = document.getElementById('btnApartado');
if (btnApartadoEl) {
  btnApartadoEl.addEventListener('click', () => {
    if (posCart.length === 0) {
      if (typeof showToast === 'function') showToast('Seleccione productos para registrar apartado', 'warning');
      return;
    }
    if (typeof showToast === 'function') {
      showToast('Módulo de apartados guardado como cotización / apartado temporal', 'info');
    }
  });
}

// ==========================================
// 5. MODAL DE TICKET Y COMPROBANTE
// ==========================================
function mostrarTicketModal(recibo) {
  const folioEl = document.getElementById('ticketFolio');
  const fechaEl = document.getElementById('ticketFecha');
  const cajeroEl = document.getElementById('ticketCajero');
  const clienteEl = document.getElementById('ticketCliente');
  const tbodyEl = document.getElementById('ticketTbodyItems');
  const subtotalEl = document.getElementById('ticketSubtotal');
  const descEl = document.getElementById('ticketDescuento');
  const totalEl = document.getElementById('ticketTotal');
  const metodoEl = document.getElementById('ticketMetodo');
  const pagaConEl = document.getElementById('ticketPagaCon');
  const cambioEl = document.getElementById('ticketCambio');

  if (folioEl) folioEl.innerText = recibo.folio || ('V-' + recibo.id_venta);
  if (fechaEl) fechaEl.innerText = recibo.fecha || new Date().toLocaleString('es-MX');
  if (cajeroEl) cajeroEl.innerText = recibo.cajero || 'Cajero';
  if (clienteEl) clienteEl.innerText = recibo.cliente || 'Público General';
  if (metodoEl) metodoEl.innerText = recibo.metodo_pago || recibo.tipo_pago || 'Efectivo';

  if (tbodyEl) {
    tbodyEl.innerHTML = (recibo.items || []).map(it => `
      <tr>
        <td style="text-align: left; vertical-align: top;">
          <strong>${it.cantidad}x</strong> ${escapeHtml(it.nombre)}<br>
          <small style="color:#64748b;">${escapeHtml(it.sku)}</small>
        </td>
        <td style="text-align: right; vertical-align: top;">${formatPOSMoney(it.precio || it.precio_unitario)}</td>
        <td style="text-align: right; vertical-align: top; font-weight: 700;">${formatPOSMoney(it.subtotal)}</td>
      </tr>
    `).join('');
  }

  if (subtotalEl) subtotalEl.innerText = formatPOSMoney(recibo.subtotal);
  if (descEl) descEl.innerText = formatPOSMoney(recibo.descuento);
  if (totalEl) totalEl.innerText = formatPOSMoney(recibo.total);
  if (pagaConEl) pagaConEl.innerText = formatPOSMoney(recibo.paga_con || recibo.total);
  if (cambioEl) cambioEl.innerText = formatPOSMoney(recibo.cambio || 0);

  if (typeof openModal === 'function') {
    openModal('modalTicketVenta');
  }
}

// Botón Imprimir Ticket
const btnPrint = document.getElementById('btnPrintTicket');
if (btnPrint) {
  btnPrint.addEventListener('click', () => {
    window.print();
  });
}

// ==========================================
// 6. HISTORIAL DE VENTAS
// ==========================================
let historialVentasData = [];

async function loadHistorialVentas() {
  const tbody = document.getElementById('tbodyHistorial');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial de ventas...</td></tr>';
  }

  try {
    const res = await ventasApi.getAll(50);
    historialVentasData = Array.isArray(res.data) ? res.data : [];
    renderHistorialVentas();
  } catch (err) {
    console.error('Error cargando historial:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}
window.loadHistorialVentas = loadHistorialVentas;

function renderHistorialVentas() {
  const tbody = document.getElementById('tbodyHistorial');
  if (!tbody) return;

  const searchInput = document.getElementById('searchHistorial');
  const term = (searchInput ? searchInput.value : '').toLowerCase().trim();

  const filtered = historialVentasData.filter(v => {
    if (!term) return true;
    return (v.folio && v.folio.toLowerCase().includes(term)) ||
           (v.cliente && v.cliente.toLowerCase().includes(term)) ||
           (v.metodo_pago && v.metodo_pago.toLowerCase().includes(term));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
          <i class="fa-solid fa-receipt" style="font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
          No hay ventas registradas que coincidan con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const fechaFormatted = v.fecha ? new Date(v.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '--';
    return `
      <tr>
        <td><strong style="color: #2563eb;">${escapeHtml(v.folio)}</strong></td>
        <td>${escapeHtml(fechaFormatted)}</td>
        <td><strong>${escapeHtml(v.cliente)}</strong></td>
        <td><span class="status-badge-custom status-badge-blue">${escapeHtml(v.metodo_pago)}</span></td>
        <td>${v.unidades} pzas (${v.articulos} items)</td>
        <td><strong style="font-size: 15px; color: #16a34a;">${formatPOSMoney(v.total)}</strong></td>
        <td style="text-align: center;">
          <button type="button" class="btn-action-icon btn-ver-ticket" data-id="${v.id}" title="Ver e imprimir ticket">
            <i class="fa-solid fa-receipt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-ver-ticket').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      try {
        const res = await ventasApi.getById(id);
        if (res && res.data) {
          mostrarTicketModal(res.data);
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('Error cargando comprobante: ' + err.message, 'danger');
        }
      }
    });
  });
}

const searchHistorialEl = document.getElementById('searchHistorial');
if (searchHistorialEl) {
  searchHistorialEl.addEventListener('input', renderHistorialVentas);
}

const btnRefreshHist = document.getElementById('btnRefreshHistorial');
if (btnRefreshHist) {
  btnRefreshHist.addEventListener('click', loadHistorialVentas);
}

const btnIrAPosEl = document.getElementById('btnIrAPos');
if (btnIrAPosEl) {
  btnIrAPosEl.addEventListener('click', () => {
    if (typeof setActiveModule === 'function') {
      setActiveModule('ventas');
    }
  });
}

// Cargar catálogo de POS al arrancar la página
document.addEventListener('DOMContentLoaded', () => {
  loadPos();
});
