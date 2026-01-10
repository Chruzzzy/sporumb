/* =======================
   GLOBAL STATE
======================= */
const page = window.location.pathname.split("/").pop();
const urlParams = new URLSearchParams(window.location.search);
const field = urlParams.get("field");

let invoices = JSON.parse(localStorage.getItem("invoices")) || [];
let bookings = JSON.parse(localStorage.getItem("bookings")) || [];

let bookingType = "internal";
let selectedSlot = null;

const slotsData = [
    "06:00-08:00", "08:00-10:00", "10:00-12:00",
    "12:00-14:00", "14:00-16:00", "16:00-18:00"
];

/* =======================
   DOM READY
======================= */
document.addEventListener("DOMContentLoaded", () => {
    initNavbarActive();
    updateNotifBadge();
    renderSidebarInvoice();

    // halaman booking
    if (page === "optionBooking.html") {
        initBookingPage();
    }

    // halaman home
    if (page === "home.html" || page === "index.html") {
        initCarousel();
    }

    // field name
    const fieldNameEl = document.getElementById("fieldName");
    if (fieldNameEl && field) {
        fieldNameEl.innerText = field;
    }
});

/* =======================
   NAVBAR ACTIVE
======================= */
function initNavbarActive() {
    const navLinks = document.querySelectorAll(".nav-link");
    if (!navLinks.length) return;

    navLinks.forEach(link => {
        const href = link.getAttribute("href");

        if (!href.startsWith("#") && href === page) {
            link.classList.add("active");
        }

        link.addEventListener("click", () => {
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

/* =======================
   BOOKING PAGE
======================= */
function initBookingPage() {
    setType("internal");

    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.addEventListener("change", renderSlots);
    }
}

function setType(type) {
    bookingType = type;

    document.querySelectorAll(".toggle button").forEach(btn =>
        btn.classList.remove("active")
    );

    document.querySelector(`.toggle .${type}`)?.classList.add("active");

    const formArea = document.getElementById("formArea");
    if (!formArea) return;

    formArea.innerHTML =
        type === "internal"
            ? `
                <input id="name" placeholder="Nama Mahasiswa">
                <input id="nim" placeholder="NIM">
                <input id="phone" placeholder="No Telp">
              `
            : `
                <input id="name" placeholder="Nama Pemesan">
                <input id="phone" placeholder="No Telp">
                <select id="payment">
                    <option value="">Metode Pembayaran</option>
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="Gopay">Gopay</option>
                </select>
              `;
}

function renderSlots() {
    const date = document.getElementById("date")?.value;
    const container = document.getElementById("slots");
    if (!date || !container) return;

    container.innerHTML = "";

    slotsData.forEach(time => {
        const booked = bookings.some(
            b => b.date === date && b.time === time && b.field === field
        );

        const div = document.createElement("div");
        div.className = "slot";

        if (booked) {
            div.classList.add("booked");
            div.innerHTML = `<strong>${time}</strong><div>Booked</div>`;
        } else {
            div.classList.add("available");
            div.innerHTML = `<strong>${time}</strong><div>Available</div>`;
            div.onclick = () => {
                document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
                div.classList.add("selected");
                selectedSlot = time;
            };
        }

        container.appendChild(div);
    });
}

/* =======================
   CONFIRM BOOKING
======================= */
function confirmBooking() {
    if (!selectedSlot) {
        showModal(
            "error",
            "Form Belum Lengkap",
            "Pastikan semua data telah diisi dengan benar."
        );


        return;
    }

    const name = document.getElementById("name")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const nim = document.getElementById("nim")?.value.trim();
    const payment = document.getElementById("payment")?.value || "";

    if (!name || !phone || (bookingType === "internal" && !nim)) {
        alert("Harap lengkapi semua data!");
        return;
    }

    if (bookingType === "external" && !payment) {
        showModal(
            "warning",
            "Metode Pembayaran",
            "Silakan pilih metode pembayaran sebelum melanjutkan."
        );
        return;
    }


    const bookingData = {
        id: Date.now(),
        field,
        date: document.getElementById("date").value,
        time: selectedSlot,
        type: bookingType,
        name,
        nim: bookingType === "internal" ? nim : "-",
        phone,
        price: bookingType === "internal" ? "Peminjaman" : "Sewa",
        payment: bookingType === "external" ? payment : "-"
    };



    // simpan booking
    bookings.push({
        field: bookingData.field,
        date: bookingData.date,
        time: bookingData.time
    });
    localStorage.setItem("bookings", JSON.stringify(bookings));

    // simpan invoice
    invoices.push(bookingData);
    localStorage.setItem("invoices", JSON.stringify(invoices));

    selectedSlot = null;
    renderSlots();
    updateNotifBadge();
    renderSidebarInvoice();

    // ===== RESET FORM =====
    document.getElementById("date").value = "";
    document.getElementById("slots").innerHTML = "";
    document.getElementById("formArea").innerHTML = "";
    selectedSlot = null;

    // balikin ke internal default 
    setType("internal");

    // ===== POPUP =====
    showModal(
        "success",
        "Booking Berhasil",
        "Pesanan kamu berhasil disimpan dan kwitansi sudah tersedia."
    );
    updateNotifBadge();
}




/* =======================
   SIDEBAR & NOTIF
======================= */
function renderSidebarInvoice() {
    const list = document.getElementById("invoiceList");
    if (!list) return;

    list.innerHTML = "";

    invoices.forEach(inv => {
        const div = document.createElement("div");
        div.className = "invoice-item";

        div.innerHTML = `
        <div class="kurung-sidebar">
            <p><strong>${inv.field}</strong></p>
            <p>${inv.date} | ${inv.time}</p>
            <p>${inv.name} || ${inv.nim}</p>
            <p>No Telp || ${inv.phone}</p>
            <p>Pembayaran || ${inv.payment}</p>
            <p>${inv.price}</p>
            <button class="download" onclick="downloadPDFById(${inv.id})">
                Download PDF
            </button>
            <hr>
            </div>
        `;

        list.appendChild(div);
    });
}

function getPaymentInfo(payment) {
    return payment && payment !== "-" ? payment : "—";
}

function drawLabelValue(doc, label, value, x, y) {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    doc.text(": " + value, x + 40, y);
}

function downloadPDFById(id) {
    const invoices = JSON.parse(localStorage.getItem("invoices")) || [];
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;

    /* ================= HEADER ================= */
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 30, "F");

    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("KWITANSI BOOKING LAPANGAN", 105, 18, { align: "center" });

    doc.setTextColor(0, 0, 0);
    y = 50;

    /* ================= INFO LAPANGAN (CARD) ================= */
    doc.setDrawColor(200);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.roundedRect(15, y - 10, 180, 48, 4, 4);

    drawLabelValue(doc, "Lapangan", inv.field, 20, y);
    y += 8;
    drawLabelValue(doc, "Tanggal", inv.date, 20, y);
    y += 8;
    drawLabelValue(doc, "Jam", inv.time, 20, y);
    y += 8;
    drawLabelValue(doc, "Jenis", inv.price, 20, y);

    if (inv.type === "external") {
        y += 8;
        drawLabelValue(doc, "Pembayaran", getPaymentInfo(inv.payment), 20, y);
    }

    y += 25;

    /* ================= DATA PEMINJAM / CUSTOMER ================= */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(
        inv.type === "external" ? "DATA CUSTOMER" : "DATA PEMINJAM",
        20,
        y
    );

    y += 6;
    doc.setLineWidth(0.7);
    doc.line(20, y, 190, y);

    y += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    drawLabelValue(doc, "Nama", inv.name, 20, y);

    if (inv.type === "internal") {
        y += 8;
        drawLabelValue(doc, "NIM", inv.nim, 20, y);
    }

    y += 8;
    drawLabelValue(doc, "No Telp", inv.phone, 20, y);

    y += 20;

    /* ================= INFO KONFIRMASI ================= */
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80);

    doc.text(
        inv.type === "external"
            ? "Silahkan hubungi admin (089531042727) untuk konfirmasi pembayaran."
            : "Silahkan hubungi admin (089531042727) untuk konfirmasi peminjaman.",
        105,
        y,
        { align: "center" }
    );

    // /* ================= WATERMARK ================= */
    // doc.setFontSize(40);
    // doc.setTextColor(230);
    // doc.text("SPORUMB", 105, 160, {
    //     align: "center",
    //     angle: 30
    // });

    /* ================= FOOTER ================= */
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
        "Dokumen ini sah dan diterbitkan oleh SPORUMB",
        105,
        290,
        { align: "center" }
    );

    /* ================= SAVE ================= */
    doc.save(`kwitansi-${inv.field}-${inv.date}.pdf`);
}


function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    const lastSeen = localStorage.getItem("lastSeenInvoice") || 0;
    const count = invoices.filter(i => i.id > lastSeen).length;

    badge.style.display = count ? "flex" : "none";
    badge.innerText = count;
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");

    // 🔥 JIKA SIDEBAR DIBUKA, BARU TANDAI SUDAH DILIHAT
    if (sidebar.classList.contains("active")) {
        const invoices = JSON.parse(localStorage.getItem("invoices")) || [];
        if (invoices.length > 0) {
            const lastId = invoices[invoices.length - 1].id;
            localStorage.setItem("lastSeenInvoice", lastId);
        }
    }

    updateNotifBadge();
    renderSidebarInvoice();
}

/* =======================
   CAROUSEL (HOME ONLY)
======================= */
function initCarousel() {
    const track = document.querySelector(".carousel-track");
    const slides = document.querySelectorAll(".slide");
    const dotsWrap = document.querySelector(".carousel-dots");
    const prevBtn = document.querySelector(".carousel-btn.prev");
    const nextBtn = document.querySelector(".carousel-btn.next");

    if (!track || !slides.length || !dotsWrap) return;

    let index = 0;
    dotsWrap.innerHTML = "";

    /* ===== DOT ===== */
    slides.forEach((_, i) => {
        const dot = document.createElement("span");
        if (i === 0) dot.classList.add("active");
        dot.onclick = () => move(i);
        dotsWrap.appendChild(dot);
    });

    const dots = dotsWrap.querySelectorAll("span");

    /* ===== MOVE SLIDE ===== */
    function move(i) {
        index = i;
        track.style.transform = `translateX(-${i * 100}%)`;
        dots.forEach(d => d.classList.remove("active"));
        dots[i].classList.add("active");
    }

    /* ===== PREV / NEXT ===== */
    prevBtn?.addEventListener("click", () => {
        move((index - 1 + slides.length) % slides.length);
    });

    nextBtn?.addEventListener("click", () => {
        move((index + 1) % slides.length);
    });

    /* ===== AUTO SLIDE ===== */
    setInterval(() => {
        move((index + 1) % slides.length);
    }, 5000);
}


/* =======================
   MODAL
======================= */
function showModal(type, title, message) {
    const modal = document.getElementById("appModal");
    const icon = document.getElementById("modalIcon");

    modal.style.display = "flex";

    icon.className = "modal-icon " + type;

    icon.innerText =
        type === "success" ? "✔" :
            type === "warning" ? "!" : "✖";

    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalMessage").innerText = message;
}

function closeModal() {
    document.getElementById("appModal").style.display = "none";
}