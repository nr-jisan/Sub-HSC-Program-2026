/* =========================
   CONFIG (IMPORTANT)
========================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyB8PsogVDbF6IBL5xMCC--P4U_49FtqDG1nGoF9WENnOxupI3b645PApBXGGo7PB_k/exec";

const EVENT_INFO = {
  title: "এইচএসসি উত্তীর্ণ শিক্ষার্থী উৎসব ২০২৫",
  date: "Date: 29 January 2026 ",
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
  // 01XXXXXXXXX (11 digits)
  return /^01\d{9}$/.test(str);
}
function safeFileName(name){
  return String(name || "Guest")
    .replace(/[^\w\s-]/g,"")
    .trim()
    .replace(/\s+/g,"-");
}

/* =========================
   Page: index.html
========================= */
function setupIndex(){
  const yesBtn = $("yesBtn");
  const noBtn  = $("noBtn");

  if(yesBtn){
    yesBtn.addEventListener("click", () => {
      window.location.href = "form.html";
    });
  }

  if(noBtn){
    noBtn.addEventListener("click", () => {
      window.location.href = "thankyou.html";
    });
  }
}

/* =========================
   Page: form.html
   ✅ Serial + Duplicate handled SERVER-SIDE
========================= */
function setupForm(){
  const form = $("rsvpForm");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      serial: "", // ✅ server will return this
      coming: "Yes",
      name: $("name")?.value.trim() || "",
      board: $("board")?.value.trim() || "",
      reg: $("reg")?.value.trim() || "",
      roll: $("roll")?.value.trim() || "",
      phone: $("phone")?.value.trim() || "",
      submittedAt: new Date().toISOString()
    };

    // ✅ Strict empty validation
    if(!data.name || !data.board || !data.reg || !data.roll || !data.phone){
      showToast("err", "সবগুলো ঘর পূরণ করো। কোনো ঘর খালি রাখা যাবে না।");
      return;
    }

    // ✅ Format validations
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
      showToast("err", "Server Error. Please Try Again Letter.");
      return;
    }

    const submitBtn = $("submitBtn");
    if(submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try{
      // ✅ Send to Apps Script (JSONP)
      const result = await sendToServerJSONP({
        serial: "", // not needed; server generates
        coming: data.coming,
        name: data.name,
        board: data.board,
        reg: data.reg,
        roll: data.roll,
        phone: data.phone,
        submittedAt: data.submittedAt
      });

      // ✅ Duplicate from server
      if(result && result.status === "duplicate"){
        showToast("err", "এই রেজিস্ট্রেশন ও রোল দিয়ে ইতিমধ্যে সাবমিট করা হয়েছে। আবার করা যাবে না।");
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
        return;
      }

      // ✅ Any server error
      if(!result || result.status !== "ok"){
        showToast("err", (result && result.message) ? result.message : "সাবমিট হয়নি। কিছুক্ষন পর পুনরায় চেষ্টা করুন");
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
        return;
      }

      // ✅ Server serial
      data.serial = String(result.serial || "");

      // Save locally for invite page
      saveRSVP(data);

      showToast("ok", "সাবমিট সফল হয়েছে! ইনভাইটেশন কার্ড তৈরি হচ্ছে...");
      setTimeout(() => window.location.href = "invite.html", 700);

    }catch(err){
      console.error(err);
      showToast("err", "সাবমিট হয়নি। কিছুক্ষন পর আবার চেষ্টা করুন।");
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

  // Fill user info
  if($("cardName")) $("cardName").textContent = data.name || "Guest";
  if($("mBoard")) $("mBoard").textContent = data.board || "—";
  if($("mReg")) $("mReg").textContent = data.reg || "—";
  if($("mRoll")) $("mRoll").textContent = data.roll || "—";
  if($("mPhone")) $("mPhone").textContent = data.phone || "—";

  // Fill event info
  if($("eventTitle")) $("eventTitle").textContent = EVENT_INFO.title;
  if($("eventDate")) $("eventDate").textContent = EVENT_INFO.date;
  if($("eventTime")) $("eventTime").textContent = EVENT_INFO.time;
  if($("eventVenue")) $("eventVenue").textContent = EVENT_INFO.venue;
  if($("eventOrg")) $("eventOrg").textContent = EVENT_INFO.organizer;

    // ✅ Fill Visible Details (NOT the card)
  if ($("dSlNo")) $("dSlNo").textContent = data.serial || "—";
  if ($("dName")) $("dName").textContent = data.name || "Guest";
  if ($("dBoard")) $("dBoard").textContent = data.board || "—";
  if ($("dReg")) $("dReg").textContent = data.reg || "—";
  if ($("dRoll")) $("dRoll").textContent = data.roll || "—";
  if ($("dPhone")) $("dPhone").textContent = data.phone || "—";

  if ($("dDate")) $("dDate").textContent = EVENT_INFO.date;
  if ($("dTime")) $("dTime").textContent = EVENT_INFO.time;
  if ($("dVenue")) $("dVenue").textContent = EVENT_INFO.venue;


  // Download PNG
  const pngBtn = $("downloadPng");
  if(pngBtn){
    pngBtn.addEventListener("click", async () => {
      const card = $("inviteCard");
      if(!card || typeof html2canvas === "undefined") return;

      const canvas = await html2canvas(card, {
        scale: 4,                 // ✅ sharper PNG
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff"
      });

      const url = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = url;
      a.download = `Invitation-${safeFileName(data.name)}-SL${data.serial}.png`;
      a.click();
    });
  }

  // Download PDF
  const pdfBtn = $("downloadPdf");
  if(pdfBtn){
    pdfBtn.addEventListener("click", async () => {
      const card = $("inviteCard");
      if(!card || typeof html2canvas === "undefined" || !window.jspdf) return;

      const canvas = await html2canvas(card, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        imageTimeout: 15000
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0); // ✅ max quality


      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageW = 210, pageH = 297;
      const imgW = pageW - 20;
      const imgH = (canvas.height / canvas.width) * imgW;

      const x = 10;
      const y = Math.max(10, (pageH - imgH) / 2);

      pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
      pdf.save(`Invitation-${safeFileName(data.name)}-SL${data.serial}.pdf`);
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
