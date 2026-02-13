indiaMap.addEventListener("load", () => {
  const svgDoc = indiaMap.contentDocument;
  const states = svgDoc.querySelectorAll("path");

  states.forEach(st => {
    const id = st.getAttribute("id");
    let baseColor = "#d3d3d3"; // Default grey

    if (stateData[id]) {
      // Parse DBT %
      let dbtPercent = parseInt(stateData[id].dbt.replace("%", ""));

      // Determine base color based on DBT %
      if (dbtPercent <= 40) baseColor = "#ff4d4d";       // red
      else if (dbtPercent <= 70) baseColor = "#ffd966";  // yellow
      else baseColor = "#4caf50";                        // green

      // Set initial color
      st.style.fill = baseColor;
    }

    // Hover effect (slightly brighter)
    st.addEventListener("mouseover", () => {
      st.style.fill = lightenColor(baseColor, 20); // 20% lighter
    });
    st.addEventListener("mouseout", () => {
      st.style.fill = baseColor;
    });

    // Click info
    st.addEventListener("click", () => {
      if (stateData[id]) {
        const data = stateData[id];
        infoBox.innerHTML = `
          <h3>${data.name}</h3>
          🎓 Students: ${data.students}<br>
          📢 Awareness Drives: ${data.drives}<br>
          💳 DBT Adoption: ${data.dbt}
        `;
      } else {
        infoBox.innerHTML = `<h3>${id}</h3>No data available.`;
      }
    });
  });
});

// Helper: lighten a hex color by percent
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#",""),16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 + 
    (R<255?R<1?0:R:255)*0x10000 + 
    (G<255?G<1?0:G:255)*0x100 + 
    (B<255?B<1?0:B:255)
  ).toString(16).slice(1);
}
