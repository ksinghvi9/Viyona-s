const API_URL = "https://script.google.com/macros/s/AKfycbwhWlQ7efv9v-oQWZJaXymH_2pAVHaM7OoNoRQbpFU_XN-ceDQRkVe_t15VnATRFo-w/exec";

let allData = [];
let categoriesObj = {};
let currentCategory = "Soup"; // default category
let cart = {}; // { "Item Name": { price: 120, qty: 1 } }

const placeholderImg = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg";

async function fetchMenu() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allData = data;

    renderBestSelling(data);
    processCategories(data);
    renderCategoryPills();
    renderMenuItems(currentCategory); // Render 'Soup' initially

  } catch (err) {
    console.error("Error fetching menu:", err);
  }
}

function getValidImg(imgField) {
  if (imgField && typeof imgField === 'string' && imgField.trim() !== '') {
    return imgField;
  }
  return placeholderImg;
}

function processCategories(data) {
  categoriesObj = {};
  data.forEach(item => {
    const cat = item.category || "Other";
    if (!categoriesObj[cat]) {
      categoriesObj[cat] = {
        name: cat,
        items: [],
        firstImage: null
      };
    }
    categoriesObj[cat].items.push(item);
    
    if (!categoriesObj[cat].firstImage && item.image && typeof item.image === 'string' && item.image.trim() !== '') {
      categoriesObj[cat].firstImage = item.image;
    }
  });
}

function renderBestSelling(data) {
  const container = document.getElementById("bestSelling");
  const specialBlock = document.getElementById("todaysSpecialBlock");

  const bestItems = data.filter(item => item["most selling"] === true);

  if (bestItems.length === 0) {
    specialBlock.style.display = 'none';
    return;
  }
  container.innerHTML = bestItems.map(item => {
    const imgSrc = getValidImg(item.image);
    const itemQty = cart[item.name] ? cart[item.name].qty : 0;
    
    let btnHtml = '';
    if (itemQty > 0) {
      btnHtml = `
        <div class="inline-qty-control" id="ctrl-special-${sanitizeId(item.name)}">
          <button class="qty-btn" onclick="updateItemQty('${encodeURIComponent(item.name)}', -1)">-</button>
          <div class="qty-display">${itemQty}</div>
          <button class="qty-btn" onclick="updateItemQty('${encodeURIComponent(item.name)}', 1)">+</button>
        </div>
      `;
    } else {
      btnHtml = `<button class="add-btn" id="btn-special-${sanitizeId(item.name)}" onclick="addToCart('${encodeURIComponent(item.name)}', ${item.price})">+ ADD</button>`;
    }

    return `
      <div class="special-item">
        <img src="${imgSrc}" onerror="this.src='${placeholderImg}'" alt="${item.name}" />
        <p class="special-name">${capitalize(item.name)}</p>
        <div class="special-item-bottom">
          <p class="special-price">₹${item.price}</p>
          <div class="item-btn-container" id="container-special-${sanitizeId(item.name)}">
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCategoryPills() {
  const catContainer = document.getElementById("categoryContainer");
  const catArray = Object.values(categoriesObj);

  // Determine if a category matching currentCategory exists, fallback to first
  if (!categoriesObj[currentCategory] && catArray.length > 0) {
    currentCategory = catArray[0].name;
  }

  catContainer.innerHTML = catArray.map(cat => {
    const imgSrc = cat.firstImage || placeholderImg;
    const activeClass = cat.name === currentCategory ? "active" : "";
    return `
      <div class="category-pill ${activeClass}" id="pill-${sanitizeId(cat.name)}" onclick="selectCategory('${cat.name}')">
        <img src="${imgSrc}" />
        <span>${cat.name}</span>
      </div>
    `;
  }).join("");
}

function renderMenuItems(catName) {
  const menuContainer = document.getElementById("menuContent");
  const catData = categoriesObj[catName];

  if (!catData) {
    menuContainer.innerHTML = "<p>No items found.</p>";
    return;
  }

  // We only show items for the selected category
  menuContainer.innerHTML = `
    <div class="menu-group">
      ${catData.items.map(item => {
        const imgSrc = getValidImg(item.image);
        const itemQty = cart[item.name] ? cart[item.name].qty : 0;
        
        let btnHtml = '';
        if (itemQty > 0) {
          btnHtml = `
            <div class="inline-qty-control" id="ctrl-menu-${sanitizeId(item.name)}">
              <button class="qty-btn" onclick="updateItemQty('${encodeURIComponent(item.name)}', -1)">-</button>
              <div class="qty-display">${itemQty}</div>
              <button class="qty-btn" onclick="updateItemQty('${encodeURIComponent(item.name)}', 1)">+</button>
            </div>
          `;
        } else {
          btnHtml = `<button class="add-btn" id="btn-menu-${sanitizeId(item.name)}" onclick="addToCart('${encodeURIComponent(item.name)}', ${item.price || 0})">+ ADD</button>`;
        }

        return `
          <div class="menu-item">
            <img class="item-img" src="${imgSrc}" onerror="this.src='${placeholderImg}'" alt="${item.name}" />
            <div class="item-details">
              <h4 class="item-name">${capitalize(item.name)}</h4>
              <div class="item-price-row">
                <span class="item-price">₹${(item.price || 0).toFixed(2)}</span>
                <div class="item-btn-container" id="container-menu-${sanitizeId(item.name)}">
                  ${btnHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function selectCategory(catName) {
  currentCategory = catName;
  
  // Update Pills UI
  document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
  const activePill = document.getElementById(`pill-${sanitizeId(catName)}`);
  if (activePill) activePill.classList.add('active');

  // Render items
  renderMenuItems(catName);
}

// ------ Cart Logic ------

function addToCart(encodedName, price) {
  const name = decodeURIComponent(encodedName);
  if (!cart[name]) {
    cart[name] = { price: price, qty: 1 };
  } else {
    cart[name].qty += 1;
  }
  updateCartUI();
}

function updateItemQty(encodedName, delta) {
  const name = decodeURIComponent(encodedName);
  if (cart[name]) {
    cart[name].qty += delta;
    if (cart[name].qty <= 0) {
      delete cart[name];
    }
  }
  updateCartUI();
}

function updateCartUI() {
  const cartFloater = document.getElementById("cartFloater");
  const cartCountBadge = document.getElementById("cartCountBadge");
  const cartTotalAmt = document.getElementById("cartTotalAmt");
  const cartModalTotal = document.getElementById("cartModalTotal");
  const cartItemsList = document.getElementById("cartItemsList");

  let totalQty = 0;
  let totalPrice = 0;

  let modalHtml = "";

  Object.keys(cart).forEach(name => {
    const item = cart[name];
    totalQty += item.qty;
    totalPrice += item.qty * item.price;
    const encodedName = encodeURIComponent(name);

    modalHtml += `
      <div class="cart-list-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${capitalize(name)}</div>
          <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn" onclick="updateItemQty('${encodedName}', -1)">-</button>
          <div class="qty-display">${item.qty}</div>
          <button class="qty-btn" onclick="updateItemQty('${encodedName}', 1)">+</button>
        </div>
      </div>
    `;
  });

  if (totalQty > 0) {
    cartFloater.style.display = "flex";
  } else {
    cartFloater.style.display = "none";
    if (document.getElementById("cartModal").classList.contains("open")) {
      toggleCart(); // close if empty
    }
  }

  cartCountBadge.innerText = totalQty;
  if (cartTotalAmt) cartTotalAmt.innerText = "₹" + totalPrice.toFixed(2);
  cartModalTotal.innerText = "₹" + totalPrice.toFixed(2);
  
  if (totalQty === 0) {
    cartItemsList.innerHTML = "<p style='text-align:center; color:#999; margin-top: 40px;'>Your cart is empty.</p>";
  } else {
    cartItemsList.innerHTML = modalHtml;
  }

  // Refresh inline buttons in UI without losing scroll state
  renderBestSelling(allData);
  if(currentCategory) {
    renderMenuItems(currentCategory);
  }
}

function toggleCart() {
  const modal = document.getElementById("cartModal");
  const overlay = document.getElementById("cartModalOverlay");
  
  if (modal.classList.contains("open")) {
    modal.classList.remove("open");
    overlay.style.display = "none";
  } else {
    modal.classList.add("open");
    overlay.style.display = "block";
  }
}

function showCartToWaiter() {
  const orderDetails = Object.keys(cart).map(name => {
    return `${cart[name].qty}x ${capitalize(name)} (₹${cart[name].price * cart[name].qty})`;
  }).join("\n");
  
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  alert("Order Details for Waiter:\n\n" + orderDetails + "\n\nTotal Amount: ₹" + totalPrice);
  toggleCart(); // close cart
}

function homeDelivery() {
  if (Object.keys(cart).length === 0) {
    alert("Your cart is empty.");
    return;
  }
  
  const orderDetails = Object.keys(cart).map(name => {
    return `${cart[name].qty}x ${capitalize(name)} (₹${cart[name].price * cart[name].qty})`;
  }).join("%0A");
  
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  const message = `*New Home Delivery Order*%0A%0A*Order Details:*%0A${orderDetails}%0A%0A*Total Amount:* ₹${totalPrice}%0A%0A*Please provide your delivery address below:*%0A`;
  
  const whatsappUrl = `https://wa.me/917620381329?text=${message}`;
  
  window.open(whatsappUrl, '_blank');
  toggleCart();
}

// ------ Gallery Logic ------

const galleryData = [
  { type: 'image', src: 'restaurant gallery/pic.jpeg' },
  { type: 'image', src: 'restaurant gallery/pic1.jpeg' },
  { type: 'image', src: 'restaurant gallery/pic2.jpeg' },
  { type: 'image', src: 'restaurant gallery/pic3.jpeg' },
  { type: 'image', src: 'restaurant gallery/image.png' }
  // { type: 'video', src: 'restaurant gallery/x.mp4' }
  // You can add more images or videos here:
  // { type: 'video', src: 'restaurant gallery/sample.mp4' }
];

function renderGallery() {
  const container = document.getElementById("galleryContainer");
  if (!container) return;

  container.innerHTML = galleryData.map((item, index) => {
    if (item.type === 'video') {
      return `
        <div class="gallery-item" onclick="openLightbox(${index})">
          <video src="${item.src}" muted loop playsinline></video>
          <div class="play-icon-overlay"><i class="fa-solid fa-play"></i></div>
        </div>
      `;
    } else {
      return `
        <div class="gallery-item" onclick="openLightbox(${index})">
          <img src="${item.src}" onerror="this.src='${placeholderImg}'" alt="Gallery Item ${index + 1}" />
        </div>
      `;
    }
  }).join("");
}

function openLightbox(index) {
  const item = galleryData[index];
  const overlay = document.getElementById("lightboxOverlay");
  const modal = document.getElementById("lightboxModal");
  const content = document.getElementById("lightboxContent");

  if (item.type === 'video') {
    content.innerHTML = `<video src="${item.src}" controls autoplay playsinline></video>`;
  } else {
    content.innerHTML = `<img src="${item.src}" onerror="this.src='${placeholderImg}'" alt="Gallery Item" />`;
  }

  overlay.style.display = "block";
  modal.style.display = "flex";
  // Slight delay to allow CSS display to take effect before opacity transition
  setTimeout(() => modal.classList.add("open"), 10);
}

function closeLightbox() {
  const overlay = document.getElementById("lightboxOverlay");
  const modal = document.getElementById("lightboxModal");
  const content = document.getElementById("lightboxContent");

  modal.classList.remove("open");
  setTimeout(() => {
    overlay.style.display = "none";
    modal.style.display = "none";
    content.innerHTML = ""; // Clear content to stop video playback
  }, 300);
}

// ------ Utils ------

function capitalize(str) {
  if (!str) return "";
  return str.split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

// Initialize
renderGallery();
fetchMenu();