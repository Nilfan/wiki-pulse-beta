const ORG_ID = document.currentScript.getAttribute("data-org");
let isInited = true;

function checkScriptInited() {
  if (!ORG_ID) {
    console.log("Wikipulse script initialized incorrectly");
  }

  if (isInited) {
    isInited = false;
  }
}

async function wikipulse(type, name, properties) {
  checkScriptInited();

  const url = location.href;

  const body = JSON.stringify({
    type,
    host: location.host,
    path: location.pathname,
    properties,
    org_id: ORG_ID,
    url,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("http://localhost:3000/api/track", body);
  } else {
    await fetch("http://localhost:3000/api/track", {
      body,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

checkScriptInited();

const onloadCallback = () => {
  wikipulse("pageview", "window");
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onloadCallback, { once: true });
} else {
  onloadCallback();
}

window.wikipulse = wikipulse;
