/* =========================
   CONFIG (IMPORTANT)
========================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyB8PsogVDbF6IBL5xMCC--P4U_49FtqDG1nGoF9WENnOxupI3b645PApBXGGo7PB_k/exec";

const EVENT_INFO = {
  title: "এইচএসসি উত্তীর্ণ শিক্ষার্থী উৎসব ২০২৫",
  date: "Date: 22 January 2026 ",
  time: "Time: 10:00am",
  venue: "Vanue: SUB Campus",
  organizer: "State University of Bangladesh"
};

function $(id){ return document.getElementById(id); }

function showToast(type, msg){
  const t = $("toast");
  if(!t) return;
  t.className = "toast show " + (type === "ok" ? "ok" : "err");
  t.textContent = msg;
}

/* =========================
   Local Storage Helpers
========================= */
function saveRSVP(data){
  localStorage.setItem("rsvp_data", JSON.stringify(data));
}
function loadRSVP(){
  const raw = localStorage.getItem("rsvp_data");
  return raw ? JSON.parse(raw) : null;
}

/* =========================
   JSONP Sender (SERVER SIDE)
   - avoids CORS issues
========================= */
function sendToServerJSONP(paramsObj){
  return new Promise((resolve, reject) => {
    const callbackName = "cb_" + Date.now() + "_" + Math.floor(Math.random()*1000);

    window[callbackName] = (data) => {
      try { resolve(data); }
      finally {
        try { delete window[callbackName]; } catch(e){}
        if(script && script.parentNode) script.parentNode.removeChild(script);
      }
    };

    const qs = new URLSearchParams({ ...paramsObj, callback: callbackName }).toString();
    const script = document.createElement("script");
    script.src = SCRIPT_URL + "?" + qs;

    script.onerror = () => {
      try { delete window[callbackName]; } catch(e){}
      if(script && script.parentNode) script.parentNode.removeChild(script);
      reject(new Error("Network / Apps Script error"));
    };

    document.body.appendChild(script);
  });
}

/* =========================
   Validation Helpers
========================= */
function onlyDigits(str){
  return /^[0-9]+$/.test(str);
}
function validBDPhone(str){
  return /^01\d{9}$/.test(str); // 01XXXXXXXXX
}
function safeFileName(name){
  return String(name || "Guest")
    .replace(/[^\w\s-]/g,"")
    .trim()
    .replace(/\s+/g,"-");
}

/* =========================
   IMPORTANT: Capture helper
   ✅ Makes hidden card capturable on mobile
========================= */
async function captureElementAsCanvas(el, opts = {}){
  if(!el || typeof html2canvas === "undefined") throw new Error("html2canvas missing");

  // Save previous inline styles
  const prev = {
    visibility: el.style.visibility,
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    right: el.style.right,
    bottom: el.style.bottom,
    zIndex: el.style.zIndex,
    transform: el.style.transform,
    opacity: el.style.opacity,
    pointerEvents: el.style.pointerEvents,
    width: el.style.width
  };

  // ✅ TEMP: bring card into viewport (works on mobile)
  el.style.visibility = "visible";
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.right = "auto";
  el.style.bottom = "auto";
  el.style.zIndex = "999999";
  el.style.transform = "none";
  el.style.opacity = "1";
  el.style.pointerEvents = "none";

  // A small wait helps mobile paint the element before capture
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Use safe scale for mobile memory (2 is good)
  const scale = opts.scale ?? 2;

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    imageTimeout: 15000
  });

  // Restore previous inline styles
  el.style.visibility = prev.visibility;
  el.style.position = prev.position;
  el.style.left = prev.left;
  el.style.top = prev.top;
  el.style.right = prev.right;
  el.style.bottom = prev.bottom;
  el.style.zIndex = prev.zIndex;
  el.style.transform = prev.transform;
  el.style.opacity = prev.opacity;
  el.style.pointerEvents = prev.pointerEvents;
  el.style.width = prev.width;

  return canvas;
}

/* =========================
   Page: index.html
========================= */
function setupIndex(){
  const yesBtn = $("yesBtn");
  const noBtn  = $("noBtn");

  if(yesBtn) yesBtn.addEventListener("click", () => window.location.href = "form.html");
  if(noBtn)  noBtn.addEventListener("click", () => window.location.href = "thankyou.html");
}

/* =========================
   Page: form.html
========================= */
function setupForm(){
  const form = $("rsvpForm");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      serial: "",
      coming: "Yes",
      name: $("name")?.value.trim() || "",
      board: $("board")?.value.trim() || "",
      reg: $("reg")?.value.trim() || "",
      roll: $("roll")?.value.trim() || "",
      phone: $("phone")?.value.trim() || "",
      submittedAt: new Date().toISOString()
    };

    if(!data.name || !data.board || !data.reg || !data.roll || !data.phone){
      showToast("err", "সবগুলো ঘর পূরণ করো। কোনো ঘর খালি রাখা যাবে না।");
      return;
    }
    if(!onlyDigits(data.reg)){
      showToast("err", "রেজিস্ট্রেশন নম্বর শুধুমাত্র সংখ্যা হতে হবে।");
      return;
    }
    if(!onlyDigits(data.roll)){
      showToast("err", "রোল নম্বর শুধুমাত্র সংখ্যা হতে হবে।");
      return;
    }
    if(!validBDPhone(data.phone)){
      showToast("err", "মোবাইল নম্বর 01XXXXXXXXX ফরম্যাটে দিন (১১ ডিজিট)।");
      return;
    }

    if(!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR")){
      showToast("err", "SCRIPT_URL সেট করা হয়নি। app.js এ Apps Script Web App URL বসাও।");
      return;
    }

    const submitBtn = $("submitBtn");
    if(submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try{
      const result = await sendToServerJSONP({
        serial: "",
        coming: data.coming,
        name: data.name,
        board: data.board,
        reg: data.reg,
        roll: data.roll,
        phone: data.phone,
        submittedAt: data.submittedAt
      });

      if(result && result.status === "duplicate"){
        showToast("err", "এই রেজিস্ট্রেশন ও রোল দিয়ে ইতিমধ্যে সাবমিট করা হয়েছে। আবার করা যাবে না।");
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
        return;
      }

      if(!result || result.status !== "ok"){
        showToast("err", (result && result.message) ? result.message : "সাবমিট হয়নি। Deploy/URL/Sheet নাম চেক করো।");
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
        return;
      }

      data.serial = String(result.serial || "");
      saveRSVP(data);

      showToast("ok", "সাবমিট সফল হয়েছে! ইনভাইটেশন কার্ড তৈরি হচ্ছে...");
      setTimeout(() => window.location.href = "invite.html", 700);

    }catch(err){
      console.error(err);
      showToast("err", "সাবমিট হয়নি। ইন্টারনেট/Apps Script Deploy/URL চেক করো।");
      if(submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      }
    }
  });
}

/* =========================
   Page: invite.html
========================= */
function setupInvite(){
  const data = loadRSVP();
  if(!data){
    window.location.href = "index.html";
    return;
  }

  // Fill Serial
  if($("slNo")) $("slNo").textContent = data.serial || "—";

  // Fill user info (Card)
  if($("cardName")) $("cardName").textContent = data.name || "Guest";
  if($("mBoard")) $("mBoard").textContent = data.board || "—";
  if($("mReg")) $("mReg").textContent = data.reg || "—";
  if($("mRoll")) $("mRoll").textContent = data.roll || "—";
  if($("mPhone")) $("mPhone").textContent = data.phone || "—";

  // Fill event info (Card)
  if($("eventDate")) $("eventDate").textContent = EVENT_INFO.date;
  if($("eventTime")) $("eventTime").textContent = EVENT_INFO.time;
  if($("eventVenue")) $("eventVenue").textContent = EVENT_INFO.venue;

  // Fill details view (shown on ALL devices in your new requirement)
  if($("dSl")) $("dSl").textContent = data.serial || "—";
  if($("dName")) $("dName").textContent = data.name || "Guest";
  if($("dBoard")) $("dBoard").textContent = data.board || "—";
  if($("dReg")) $("dReg").textContent = data.reg || "—";
  if($("dRoll")) $("dRoll").textContent = data.roll || "—";
  if($("dPhone")) $("dPhone").textContent = data.phone || "—";
  if($("dDate")) $("dDate").textContent = EVENT_INFO.date;
  if($("dTime")) $("dTime").textContent = EVENT_INFO.time;
  if($("dVenue")) $("dVenue").textContent = EVENT_INFO.venue;

  const card = $("inviteCard");

  // Download PNG
  const pngBtn = $("downloadPng");
  if(pngBtn){
    pngBtn.addEventListener("click", async () => {
      try{
        const canvas = await captureElementAsCanvas(card, { scale: 2 });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invitation-${safeFileName(data.name)}-SL${data.serial}.png`;
        a.click();
      }catch(e){
        console.error(e);
        alert("Download failed. Please try again.");
      }
    });
  }

  // Download PDF
  const pdfBtn = $("downloadPdf");
  if(pdfBtn){
    pdfBtn.addEventListener("click", async () => {
      try{
        if(!window.jspdf) return;

        const canvas = await captureElementAsCanvas(card, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");

        const pageW = 210, pageH = 297;
        const imgW = pageW - 20;
        const imgH = (canvas.height / canvas.width) * imgW;

        const x = 10;
        const y = Math.max(10, (pageH - imgH) / 2);

        pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
        pdf.save(`Invitation-${safeFileName(data.name)}-SL${data.serial}.pdf`);
      }catch(e){
        console.error(e);
        alert("Download failed. Please try again.");
      }
    });
  }

  // New response
  const newBtn = $("newEntry");
  if(newBtn){
    newBtn.addEventListener("click", () => {
      localStorage.removeItem("rsvp_data");
      window.location.href = "index.html";
    });
  }

  // Mobile buttons trigger same
  $("downloadPngMobile")?.addEventListener("click", () => $("downloadPng")?.click());
  $("downloadPdfMobile")?.addEventListener("click", () => $("downloadPdf")?.click());
  $("newEntryMobile")?.addEventListener("click", () => $("newEntry")?.click());
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if(page === "index") setupIndex();
  if(page === "form") setupForm();
  if(page === "invite") setupInvite();
});
