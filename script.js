
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "hash-coffee-demo";
  const CAKE_PRICE = 45;
  const FLOWERS_PRICE = 30;

  let activities = readActivities();
  let activeProduct = null;

  function readActivities() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveActivities() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
      return true;
    } catch {
      return false;
    }
  }

  function makeId(prefix) {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function money(value) {
    return `${Number(value).toLocaleString("ar-SA-u-nu-latn")} ريال`;
  }

  function showMessage(element, message, success = false) {
    element.textContent = message;
    element.style.color = success ? "#65704A" : "#98462B";
  }

  // تهيئة السنة
  $("#year").textContent = new Date().getFullYear();

  // خيارات الحفلة والإضافات
  const bookingForm = $("#booking-form");
  const bookingType = $("#booking-type");
  const partyOptions = $("#party-options");
  const cakeCheckbox = $("#cake");
  const flowersCheckbox = $("#flowers");
  const plateCheckbox = $("#plate-writing");
  const cakeMessage = $("#cake-message");
  const plateMessage = $("#plate-message");
  const cakeMessageWrap = $("#cake-message-wrap");
  const plateMessageWrap = $("#plate-message-wrap");
  const extrasTotal = $("#extras-total");
  const bookingMessage = $("#booking-message");

  function isParty() {
    return bookingType.value === "party";
  }

  function calculateExtras() {
    return (cakeCheckbox.checked ? CAKE_PRICE : 0) +
      (flowersCheckbox.checked ? FLOWERS_PRICE : 0);
  }

  function updatePartyOptions() {
    const party = isParty();

    partyOptions.hidden = !party;
    cakeMessageWrap.hidden = !(party && cakeCheckbox.checked);
    plateMessageWrap.hidden = !(party && plateCheckbox.checked);

    extrasTotal.textContent = money(party ? calculateExtras() : 0);
  }

  bookingType.addEventListener("change", updatePartyOptions);
  cakeCheckbox.addEventListener("change", updatePartyOptions);
  flowersCheckbox.addEventListener("change", updatePartyOptions);
  plateCheckbox.addEventListener("change", updatePartyOptions);

  // المواعيد
  const dateInput = $("#booking-date");
  const timeSelect = $("#booking-time");

  function dateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = dateString(new Date());
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  dateInput.min = today;
  dateInput.max = dateString(maxDate);
  dateInput.value = today;

  function populateTimes() {
    const selectedDate = dateInput.value;
    const previous = timeSelect.value;
    const options = [];

    for (let hour = 7; hour <= 23; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 23 && minute === 30) continue;

        const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

        if (selectedDate === today) {
          const now = new Date();
          const minutesNow = now.getHours() * 60 + now.getMinutes() + 15;
          const slotMinutes = hour * 60 + minute;
          if (slotMinutes < minutesNow) continue;
        }

        options.push(time);
      }
    }

    timeSelect.replaceChildren();

    options.forEach(time => {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = time;
      timeSelect.appendChild(option);
    });

    if (options.includes(previous)) {
      timeSelect.value = previous;
    }

    if (!options.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "لا توجد مواعيد متاحة";
      timeSelect.appendChild(option);
    }
  }

  dateInput.addEventListener("change", populateTimes);
  populateTimes();

  // التحقق من الطاولات
  const tableSelect = $("#table-number");
  const guestSelect = $("#guest-count");

  const tableCapacity = {
    "1": 2,
    "2": 2,
    "3": 4,
    "4": 4,
    "5": 6,
    "6": 2
  };

  function tableIsTaken(table, date, time) {
    return activities.some(item =>
      item.type === "booking" &&
      item.status !== "cancelled" &&
      item.table === table &&
      item.date === date &&
      item.time === time
    );
  }

  function refreshTables() {
    const date = dateInput.value;
    const time = timeSelect.value;
    const guests = Number(guestSelect.value);
    const current = tableSelect.value;

    [...tableSelect.options].forEach(option => {
      if (!option.value) return;

      const capacity = tableCapacity[option.value];
      const taken = tableIsTaken(option.value, date, time);
      const tooSmall = capacity < guests;

      option.disabled = taken || tooSmall;

      if (taken) {
        option.textContent = `طاولة ${option.value} — محجوزة`;
      } else if (tooSmall) {
        option.textContent = `طاولة ${option.value} — سعتها ${capacity}`;
      } else {
        option.textContent = `طاولة ${option.value} — ${capacity} أشخاص`;
      }
    });

    const selectedOption = [...tableSelect.options].find(option => option.value === current);

    if (!selectedOption || selectedOption.disabled) {
      tableSelect.value = "";
    }
  }

  dateInput.addEventListener("change", refreshTables);
  timeSelect.addEventListener("change", refreshTables);
  guestSelect.addEventListener("change", refreshTables);

  // تسجيل حجز
  bookingForm.addEventListener("submit", event => {
    event.preventDefault();
    showMessage(bookingMessage, "");

    const name = $("#customer-name").value.trim();
    const phone = $("#customer-phone").value.trim();
    const date = dateInput.value;
    const time = timeSelect.value;
    const guests = Number(guestSelect.value);
    const table = tableSelect.value;
    const party = isParty();

    if (!name) {
      showMessage(bookingMessage, "يرجى كتابة الاسم.");
      $("#customer-name").focus();
      return;
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^(05\d{8}|5\d{8}|\+9665\d{8}|9665\d{8})$/.test(normalizedPhone)) {
      showMessage(bookingMessage, "يرجى إدخال رقم جوال صحيح، مثل 05xxxxxxxx.");
      $("#customer-phone").focus();
      return;
    }

    if (!date || !time) {
      showMessage(bookingMessage, "اختر تاريخًا ووقتًا للحجز.");
      return;
    }

    if (date < today || date > dateInput.max) {
      showMessage(bookingMessage, "اختر تاريخًا خلال الثلاثين يومًا القادمة.");
      return;
    }

    if (!table) {
      showMessage(bookingMessage, "اختر طاولة مناسبة لعدد الأشخاص.");
      return;
    }

    if (tableCapacity[table] < guests) {
      showMessage(bookingMessage, "سعة الطاولة لا تكفي عدد الأشخاص.");
      return;
    }

    if (tableIsTaken(table, date, time)) {
      refreshTables();
      showMessage(bookingMessage, "هذه الطاولة محجوزة لهذا الموعد. اختر طاولة أخرى.");
      return;
    }

    if (party && cakeCheckbox.checked && !cakeMessage.value.trim()) {
      showMessage(bookingMessage, "اكتب العبارة المطلوبة على الكيكة.");
      cakeMessage.focus();
      return;
    }

    if (party && plateCheckbox.checked && !plateMessage.value.trim()) {
      showMessage(bookingMessage, "اكتب العبارة المطلوبة على الصحن.");
      plateMessage.focus();
      return;
    }

    const extras = [];
    if (party && cakeCheckbox.checked) {
      extras.push(`كيكة (${CAKE_PRICE} ريال): ${cakeMessage.value.trim()}`);
    }
    if (party && flowersCheckbox.checked) {
      extras.push(`ورد (${FLOWERS_PRICE} ريال)`);
    }
    if (party && plateCheckbox.checked) {
      extras.push(`كتابة على الصحن مجانًا: ${plateMessage.value.trim()}`);
    }

    const total = party ? calculateExtras() : 0;
    const record = {
      id: makeId("HASH"),
      type: "booking",
      bookingType: party ? "party" : "visit",
      name,
      phone,
      date,
      time,
      guests,
      table,
      cake: party && cakeCheckbox.checked,
      cakeMessage: party && cakeCheckbox.checked ? cakeMessage.value.trim() : "",
      flowers: party && flowersCheckbox.checked,
      plateWriting: party && plateCheckbox.checked,
      plateMessage: party && plateCheckbox.checked ? plateMessage.value.trim() : "",
      extras,
      extrasTotal: total,
      status: "confirmed",
      createdAt: Date.now()
    };

    activities.unshift(record);
    saveActivities();
    renderActivities();

    showMessage(
      bookingMessage,
      `تم تسجيل الحجز التجريبي بنجاح. رقم الحجز ${record.id} — إجمالي الإضافات: ${money(total)}.`,
      true
    );

    bookingForm.reset();
    bookingType.value = "visit";
    dateInput.value = today;
    populateTimes();
    updatePartyOptions();
    refreshTables();
  });

  // الطلبات التجريبية
  const orderDialog = $("#order-dialog");
  const orderTitle = $("#order-title");
  const orderPrice = $("#order-price");
  const orderQuantity = $("#order-quantity");
  const orderCustomer = $("#order-customer");
  const orderTotal = $("#order-total");
  const orderMessage = $("#order-message");

  function updateOrderTotal() {
    if (!activeProduct) return;
    orderTotal.textContent = `الإجمالي: ${money(activeProduct.price * Number(orderQuantity.value))}`;
  }

  $$(".product").forEach(product => {
    $(".order-btn", product).addEventListener("click", () => {
      activeProduct = {
        name: product.dataset.name,
        price: Number(product.dataset.price)
      };

      orderTitle.textContent = activeProduct.name;
      orderPrice.textContent = `سعر القطعة: ${money(activeProduct.price)}`;
      orderQuantity.value = "1";
      orderCustomer.value = "";
      orderMessage.textContent = "";
      updateOrderTotal();

      if (!orderDialog.open) orderDialog.showModal();
    });
  });

  orderQuantity.addEventListener("change", updateOrderTotal);
  $("#close-dialog").addEventListener("click", () => orderDialog.close());

  $("#confirm-order").addEventListener("click", () => {
    if (!activeProduct) return;

    const name = orderCustomer.value.trim();
    if (!name) {
      showMessage(orderMessage, "يرجى كتابة الاسم.");
      orderCustomer.focus();
      return;
    }

    const quantity = Number(orderQuantity.value);
    const total = activeProduct.price * quantity;

    const record = {
      id: makeId("ORDER"),
      type: "order",
      name,
      product: activeProduct.name,
      quantity,
      total,
      text: `${quantity} × ${activeProduct.name}`,
      createdAt: Date.now()
    };

    activities.unshift(record);
    saveActivities();
    renderActivities();

    showMessage(orderMessage, `تم تسجيل الطلب التجريبي ${record.id} بإجمالي ${money(total)}.`, true);
  });

  // سجل الحجوزات والطلبات
  function renderActivities() {
    const list = $("#activity-list");
    list.replaceChildren();

    if (!activities.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "لا توجد حجوزات أو طلبات حتى الآن.";
      list.appendChild(empty);
      refreshTables();
      return;
    }

    activities.forEach(record => {
      const card = document.createElement("article");
      card.className = "activity-entry";

      const head = document.createElement("div");
      head.className = "activity-entry-head";

      const title = document.createElement("strong");
      title.textContent = record.type === "booking"
        ? (record.bookingType === "party" ? "حجز حفلة" : "حجز زيارة")
        : "طلب قهوة";

      const id = document.createElement("span");
      id.textContent = record.id;

      head.append(title, id);
      card.appendChild(head);

      const detail = document.createElement("p");

      if (record.type === "booking") {
        detail.textContent =
          `${record.name} — طاولة ${record.table} — ${record.guests} أشخاص — ${record.date}، ${record.time}`;
        card.appendChild(detail);

        if (record.bookingType === "party") {
          const extras = document.createElement("p");
          extras.textContent = record.extras.length
            ? `الإضافات: ${record.extras.join("، ")}`
            : "لم تُضف أي إضافات للحفلة.";
          card.appendChild(extras);

          const total = document.createElement("p");
          total.textContent = `إجمالي إضافات الحفلة: ${money(record.extrasTotal)}`;
          card.appendChild(total);
        }
      } else {
        detail.textContent = `${record.name} — ${record.text} — الإجمالي ${money(record.total)}`;
        card.appendChild(detail);
      }

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = record.type === "booking" ? "إلغاء الحجز" : "حذف من السجل";
      cancel.addEventListener("click", () => {
        activities = activities.filter(item => item.id !== record.id);
        saveActivities();
        renderActivities();
      });

      card.appendChild(cancel);
      list.appendChild(card);
    });

    refreshTables();
  }

  updatePartyOptions();
  refreshTables();
  renderActivities();
})();
