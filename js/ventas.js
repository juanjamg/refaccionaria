// ==========================================
// VENTAS.JS - MÓDULO PUNTO DE VENTA (POS)
// ==========================================

const inputDescuento = document.getElementById('inputDescuento');
const inputPagaCon = document.getElementById('inputPagaCon');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotal = document.getElementById('cartTotal');
const cartCambio = document.getElementById('cartCambio');
const btnCobrar = document.getElementById('btnCobrar');
const btnApartado = document.getElementById('btnApartado');

let subtotalValue = 0;

function recalcularTotales() {
  const descuento = parseFloat(inputDescuento ? inputDescuento.value : 0) || 0;
  const total = Math.max(0, subtotalValue - descuento);
  if (cartTotal) cartTotal.innerText = `$${total}`;

  const pagaCon = parseFloat(inputPagaCon ? inputPagaCon.value : 0) || 0;
  if (cartCambio) {
    if (pagaCon >= total && total > 0) {
      cartCambio.innerText = `$${pagaCon - total}`;
    } else if (pagaCon > 0 && total === 0) {
      cartCambio.innerText = `$${pagaCon}`;
    } else {
      cartCambio.innerText = `$0`;
    }
  }
}

if (inputDescuento) inputDescuento.addEventListener('input', recalcularTotales);
if (inputPagaCon) inputPagaCon.addEventListener('input', recalcularTotales);

if (btnCobrar) {
  btnCobrar.addEventListener('click', () => {
    showToast('Cobro procesado con éxito', 'success');
  });
}

if (btnApartado) {
  btnApartado.addEventListener('click', () => {
    showToast('Apartado de refacciones registrado', 'success');
  });
}
