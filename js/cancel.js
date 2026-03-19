const cartCountEls = document.querySelectorAll(".cart-count")

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("bandido_cart")) || []
  } catch (error) {
    return []
  }
}

function updateCartCount() {
  const cart = getCart()
  const totalQuantity = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  cartCountEls.forEach(el => {
    el.textContent = totalQuantity
  })
}

updateCartCount()