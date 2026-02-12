document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-pay-toggle]");
  if (toggle) {
    const id = toggle.getAttribute("data-pay-toggle");
    const row = document.getElementById(`pay-row-${id}`);
    if (row) {
      row.style.display = (row.style.display === "none" || row.style.display === "") ? "table-row" : "none";
    }
  }

  const cancel = e.target.closest("[data-pay-cancel]");
  if (cancel) {
    const id = cancel.getAttribute("data-pay-cancel");
    const row = document.getElementById(`pay-row-${id}`);
    if (row) row.style.display = "none";
  }
});
